"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { anioVigente, reservarCorrelativoAnual } from "@/core/correlativo";
import { exigirSesion } from "@/core/sesion";
import { db } from "@/db";
import { ordenTrabajo } from "@/db/schema/orden-trabajo";
import { formatearCodigoOt } from "./codigo";
import {
  CLAVE_CORRELATIVO_OT,
  CORRELATIVO_INICIAL,
  type EstadoOt,
} from "./constantes";
import type { EstadoFormulario } from "@/core/estado-formulario";
import { esUniqueViolado } from "@/core/errores-postgres";
import type { ResultadoAccion } from "@/core/resultado-accion";
import { otCambioEstadoSchema, otCrearSchema, otEditarSchema } from "./schema";

/**
 * El UNIQUE de `codigo_ot`: solo debería poder saltar si algo se saltó el
 * contador de correlativo.ts — es la red de seguridad de la base de datos
 * haciendo su trabajo. Se traduce a un mensaje en vez de dejar que reviente en
 * un 500.
 *
 * CORREGIDO EL 2026-09-21: esto comprobaba `error.code === "23505"` a mano y
 * NUNCA se cumplía, porque Drizzle envuelve el error de `pg` y el `code` queda
 * en `cause`. Aquí el efecto era menos visible que en Personal —este choque no
 * debería ocurrir nunca— pero el día que ocurriera, el aviso habría salido
 * como un fallo genérico y habría costado mucho más diagnosticarlo. El porqué,
 * con la verificación contra la base real, está en `esUniqueViolado`
 * (core/errores-postgres.ts).
 */
const CONSTRAINT_CODIGO_OT = "orden_trabajo_codigo_ot_unique";

/**
 * Lo único que ve el usuario cuando algo falla de una forma que no sabemos
 * traducir. No intenta explicar la causa —no la conocemos en ese punto, y
 * adivinarla en pantalla sería mentir—: el error real, entero, va al log del
 * servidor con `console.error`, que es donde se diagnostica.
 */
const MENSAJE_FALLO_GUARDADO = "No se pudo guardar. Intenta de nuevo.";

/**
 * Crea una OT. Desde la fusión con Servicio es una creación autónoma: no nace
 * de ninguna otra fila, así que no hay id externo que atar con `.bind()` ni
 * clave foránea que verificar antes de insertar.
 *
 * Este es el NÚCLEO: valida, escribe e invalida el cache, y devuelve el
 * resultado en vez de decidir a dónde va el usuario. Los dos remates de abajo
 * —`crearOrdenTrabajo`, que redirige, y `crearOrdenTrabajoEnModal`, que no—
 * se diferencian solo en eso. Toda la lógica vive aquí y no se duplica.
 *
 * No lleva `export`: no es una Server Action invocable desde el cliente, sino
 * la parte común de las dos que sí lo son.
 */
async function guardarOtNueva(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = otCrearSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return {
      mensaje: "Revisa los campos marcados.",
      errores: z.flattenError(resultado.error).fieldErrors,
    };
  }

  // Un solo año para todo: el que numera el correlativo y el que se escribe
  // en el código. Calcularlo dos veces es cómo se consigue una OT
  // `OT.CCM.2027.0001` contando sobre el correlativo de 2026.
  const anio = anioVigente();

  try {
    // La reserva del correlativo y el INSERT van en la misma transacción: si
    // la OT falla, el número se revierte con ella y no quedan huecos.
    // El porqué completo está en core/correlativo.ts.
    await db.transaction(async (tx) => {
      const correlativo = await reservarCorrelativoAnual(
        tx,
        CLAVE_CORRELATIVO_OT,
        anio,
        CORRELATIVO_INICIAL,
      );

      // `fecha_creacion` no se envía: la pone la base de datos
      // (DEFAULT now()) al insertar.
      await tx.insert(ordenTrabajo).values({
        ...resultado.data,
        codigo_ot: formatearCodigoOt(anio, correlativo),
      });
    });
  } catch (error) {
    if (esUniqueViolado(error, CONSTRAINT_CODIGO_OT)) {
      // Reintentar NO sirve, y por eso este mensaje no lo ofrece: la
      // transacción revierte también la reserva del correlativo, así que un
      // segundo intento pide exactamente el mismo número y choca contra el
      // mismo `codigo_ot`. El fallo es determinista, no transitorio.
      //
      // Si alguien piensa en agregar aquí un botón de "reintentar" o un
      // reintento automático: no lo hagas, solo repetirá el error. Lo que hay
      // que arreglar es el descuadre entre el contador del año (fila
      // `ordenes-trabajo:<año>` de `correlativo`) y las OT ya emitidas —
      // resincronizarlo al mayor correlativo del año.
      return {
        mensaje:
          "No se pudo generar el número de OT. Si el problema persiste, contacta soporte.",
      };
    }

    // Antes esto era `throw error`, y ahí empezaba el problema: el error subía
    // sin traducir hasta el cliente, que no lo recogía — ni mensaje ni aviso,
    // la pantalla quieta. Un ETIMEDOUT de Neon entra justo por aquí.
    console.error("[OT] fallo inesperado al crear la orden de trabajo", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath("/ordenes-trabajo");

  return { ok: true };
}

/**
 * Crear desde las pantallas /ordenes-trabajo/nueva: al terminar se abandona
 * la pantalla, y el aviso viaja en la URL porque el toast tiene que
 * sobrevivir a la navegación (ver components/aviso-toast.tsx).
 */
export async function crearOrdenTrabajo(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const resultado = await guardarOtNueva(formData);

  if (!resultado.ok) {
    return resultado;
  }

  redirect("/ordenes-trabajo?aviso=creada");
}

/**
 * Crear desde el modal del listado: no se navega a ninguna parte, así que el
 * resultado vuelve al componente, que cierra la ventana, lanza el toast y
 * pide un `router.refresh()`. Mismo trato que
 * `actualizarEstadoOrdenTrabajo`, y por el mismo motivo.
 *
 * Recibe solo el `FormData` —sin el `estadoPrevio` que exige
 * `useActionState`— porque el modal no usa ese hook: necesita reaccionar al
 * resultado, no solo mostrarlo.
 */
export async function crearOrdenTrabajoEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  return guardarOtNueva(formData);
}

/**
 * Núcleo de la edición, con el mismo reparto que `guardarOtNueva`: aquí la
 * lógica, en los remates de abajo a dónde va el usuario después.
 */
async function guardarOtExistente(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = otEditarSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return {
      mensaje: "Revisa los campos marcados.",
      errores: z.flattenError(resultado.error).fieldErrors,
    };
  }

  const { id, ...campos } = resultado.data;

  // El `try` empieza AQUÍ y no antes a propósito: `exigirSesion()` termina en
  // `redirect()` si no hay sesión, y Next documenta que `redirect()` se llama
  // fuera del `try` porque funciona lanzando
  // (dist/docs/01-app/03-api-reference/04-functions/redirect.md:51). Metido
  // dentro, este catch se comería la navegación al login.
  try {
    // `codigo_ot` y `fecha_creacion` no están en `campos` y no deben estarlo:
    // el número de una OT no cambia una vez emitida. `updatedAt` sí se
    // actualiza sola ($onUpdate en el esquema).
    const actualizadas = await db
      .update(ordenTrabajo)
      .set(campos)
      .where(eq(ordenTrabajo.id, id))
      .returning({ id: ordenTrabajo.id });

    if (actualizadas.length === 0) {
      return { mensaje: "Esa orden de trabajo ya no existe." };
    }
  } catch (error) {
    console.error("[OT] fallo inesperado al editar la orden de trabajo", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath("/ordenes-trabajo");
  revalidatePath(`/ordenes-trabajo/${id}/editar`);

  return { ok: true };
}

/** Editar desde /ordenes-trabajo/[id]/editar: se abandona la pantalla. */
export async function editarOrdenTrabajo(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const resultado = await guardarOtExistente(formData);

  if (!resultado.ok) {
    return resultado;
  }

  redirect("/ordenes-trabajo?aviso=editada");
}

/** Editar desde el modal del listado: el usuario se queda donde estaba. */
export async function editarOrdenTrabajoEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  return guardarOtExistente(formData);
}

/**
 * Cambia SOLO el estado de una OT. Es la acción que dispara el Select de la
 * celda de estado del listado.
 *
 * Deliberadamente no reutiliza `editarOrdenTrabajo`: esa recibe el formulario
 * entero y escribe las diez columnas, así que invocarla desde el listado
 * significaría mandar de vuelta valores que esa pantalla no muestra ni tiene
 * — precio, cliente, comentarios — y cualquier desajuste los sobrescribiría.
 * Aquí el UPDATE toca `estado` y nada más (`updated_at` se actualiza sola por
 * el `$onUpdate` del esquema).
 *
 * No hay control de transiciones válidas a propósito: el supuesto 11 de
 * docs/spec/preguntas-abiertas.md dice que hoy se permite cualquier cambio de
 * estado, en cualquier dirección. Si el negocio confirma lo contrario, la
 * comprobación va aquí dentro — no solo limitando las opciones del Select,
 * que es cliente y se puede saltar con un POST directo.
 *
 * Recibe argumentos sueltos, no un `FormData`: no nace de un `<form>`.
 */
export async function actualizarEstadoOrdenTrabajo(
  id: string,
  nuevoEstado: EstadoOt,
): Promise<ResultadoAccion> {
  await exigirSesion();

  // El tipo `EstadoOt` del parámetro no protege nada en runtime — una Server
  // Action es un endpoint y puede llegar cualquier cosa. La garantía es este
  // parse, contra el mismo enum de Zod que usa el formulario.
  const resultado = otCambioEstadoSchema.safeParse({ id, estado: nuevoEstado });

  if (!resultado.success) {
    return { ok: false, mensaje: "Ese estado no es válido." };
  }

  // Mismo reparto que en `guardarOtExistente`: `exigirSesion()` y su
  // `redirect()` quedan fuera del `try`; aquí dentro solo la escritura.
  try {
    const actualizadas = await db
      .update(ordenTrabajo)
      .set({ estado: resultado.data.estado })
      .where(eq(ordenTrabajo.id, resultado.data.id))
      .returning({ id: ordenTrabajo.id });

    if (actualizadas.length === 0) {
      return { ok: false, mensaje: "Esa orden de trabajo ya no existe." };
    }
  } catch (error) {
    console.error("[OT] fallo inesperado al cambiar el estado", error);
    return { ok: false, mensaje: "No se pudo cambiar el estado. Intenta de nuevo." };
  }

  // Sin `redirect()`: el usuario se queda en el listado. Se invalida el cache
  // del servidor y el componente pide un `router.refresh()` para traer la fila
  // ya actualizada sin recargar la página.
  revalidatePath("/ordenes-trabajo");
  revalidatePath(`/ordenes-trabajo/${resultado.data.id}/editar`);

  return { ok: true };
}
