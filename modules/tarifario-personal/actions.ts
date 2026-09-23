"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tarifarioPersonal } from "@/db/schema/tarifario-personal";
import type { EstadoFormulario } from "@/core/estado-formulario";
import type { ResultadoAccion } from "@/core/resultado-accion";
import { esUniqueViolado } from "@/core/errores-postgres";
import { reservarCorrelativo } from "@/core/correlativo";
import { formatearCodigoTarifa } from "./codigo";
import {
  CLAVE_CORRELATIVO_TARIFA,
  CORRELATIVO_TARIFA_INICIAL,
  RUTA_LISTADO,
} from "./constantes";
import { buscarCargos } from "./queries";
import {
  busquedaCargoSchema,
  tarifaCambioActivoSchema,
  tarifaCrearSchema,
  tarifaEditarSchema,
} from "./schema";

/**
 * Una Server Action se puede invocar con un POST directo, sin pasar por la
 * pantalla — así que la sesión se verifica aquí dentro, no solo en el layout.
 */
async function exigirSesion() {
  const sesion = await auth.api.getSession({ headers: await headers() });

  if (!sesion) {
    redirect("/login");
  }

  return sesion;
}

/**
 * El `UNIQUE` de `tarifario_personal.codigo`, que es RED DE SEGURIDAD DEL
 * GENERADOR y no una interacción del usuario.
 *
 * El código lo emite `reservarCorrelativo` (core/correlativo.ts) dentro de la
 * transacción del INSERT desde el primer día, así que un choque nunca es culpa
 * de quien llena el formulario: es que el contador y la tabla se descuadraron.
 *
 * Que no deba dispararse nunca en uso normal no es motivo para quitar la
 * restricción: es lo que convierte un descuadre silencioso (dos tarifas con el
 * mismo código) en un fallo ruidoso.
 *
 * La comprobación vive en core/ y no aquí porque el error de Drizzle llega
 * envuelto y hay que recorrer su `cause` — ver el comentario de
 * `esUniqueViolado`, donde está el porqué con el detalle verificado. Escribirlo
 * a mano con `error.code` es el bug que estuvo roto en silencio en tres módulos
 * durante semanas (deuda técnica de AGENTS.md, 2026-09-21).
 */
const CONSTRAINT_CODIGO = "tarifario_personal_codigo_unique";

/**
 * Lo único que ve el usuario cuando algo falla de una forma que no sabemos
 * traducir. El error real, entero, va al log del servidor con `console.error`.
 * Mismo criterio que en los otros módulos: la pantalla no adivina causas
 * técnicas.
 */
const MENSAJE_FALLO_GUARDADO = "No se pudo guardar. Intenta de nuevo.";

/**
 * Lo que se enseña cuando el código generado choca contra el UNIQUE.
 *
 * Va como `mensaje` general y NO bajo la clave `codigo`: ese campo no existe en
 * el formulario (se pinta deshabilitado y sin `name`), así que un error colgado
 * de él no se pintaría en ninguna parte.
 *
 * NO OFRECE REINTENTAR, y esa omisión es deliberada. Es la misma trampa que ya
 * documentan `crearServicioEnModal`, `crearMaterialEnModal` y
 * `crearOrdenTrabajoEnModal`: la transacción revierte también la reserva del
 * correlativo, así que un segundo intento pide EXACTAMENTE el mismo número y
 * choca contra el mismo código. El fallo es determinista, no transitorio, y un
 * "intenta de nuevo" mandaría al usuario a repetirlo en bucle. Lo que hay que
 * arreglar es el descuadre entre la fila de `correlativo` y las tarifas ya
 * emitidas — resincronizar el contador al mayor correlativo existente.
 */
const ERROR_CODIGO_GENERADO = {
  mensaje:
    "No se pudo generar el código de la tarifa. Si el problema persiste, contacta soporte.",
} satisfies EstadoFormulario;

/**
 * Alta de una tarifa.
 *
 * `codigo` NO viene del formulario: lo emite aquí el correlativo global
 * (`PRS.0001`). `created_at` la pone la base con su `DEFAULT now()`, y `activo`
 * tampoco se escribe — la columna tiene `DEFAULT true`, y darla de baja es una
 * acción propia y confirmada desde el listado (Parte 2), nunca una casilla de
 * este formulario.
 */
export async function crearTarifaEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = tarifaCrearSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return {
      mensaje: "Revisa los campos marcados.",
      errores: z.flattenError(resultado.error).fieldErrors,
    };
  }

  // El `try` empieza después de `exigirSesion()` a propósito: `redirect()`
  // funciona lanzando, y Next documenta que va fuera del `try`
  // (dist/docs/01-app/03-api-reference/04-functions/redirect.md:51). Dentro,
  // este catch se comería la navegación al login.
  try {
    // La reserva del correlativo y el INSERT van en la MISMA transacción: si la
    // tarifa falla, el número se revierte con ella y no quedan huecos en la
    // numeración. El porqué completo está en core/correlativo.ts.
    await db.transaction(async (tx) => {
      const numero = await reservarCorrelativo(
        tx,
        CLAVE_CORRELATIVO_TARIFA,
        CORRELATIVO_TARIFA_INICIAL,
      );

      await tx.insert(tarifarioPersonal).values({
        ...resultado.data,
        codigo: formatearCodigoTarifa(numero),
      });
    });
  } catch (error) {
    // No es un error corregible por el usuario: el código lo emite el contador,
    // así que un choque significa que el contador y la tabla se descuadraron.
    // Ver ERROR_CODIGO_GENERADO, incluido el porqué de no ofrecer un reintento.
    if (esUniqueViolado(error, CONSTRAINT_CODIGO)) {
      console.error(
        "[Tarifario] el código generado chocó con el UNIQUE: el contador y la tabla están descuadrados",
        error,
      );
      return ERROR_CODIGO_GENERADO;
    }

    console.error("[Tarifario] fallo inesperado al crear la tarifa", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}

export async function editarTarifaEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = tarifaEditarSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return {
      mensaje: "Revisa los campos marcados.",
      errores: z.flattenError(resultado.error).fieldErrors,
    };
  }

  const { id, ...campos } = resultado.data;

  try {
    // `codigo` no está en `campos` y no debe estarlo: `tarifaEditarSchema` no
    // lo declara, así que editar una tarifa nunca puede reescribir su código
    // aunque alguien lo cuele en el FormData. `activo` tampoco, por lo mismo.
    const actualizadas = await db
      .update(tarifarioPersonal)
      .set(campos)
      .where(eq(tarifarioPersonal.id, id))
      .returning({ id: tarifarioPersonal.id });

    if (actualizadas.length === 0) {
      return { mensaje: "Esa tarifa ya no existe." };
    }
  } catch (error) {
    // La edición no escribe `codigo`, así que esto no debería dispararse nunca.
    // Se queda por lo mismo que la restricción: si alguna vez vuelve a tocarse
    // esa columna desde aquí, el fallo tiene que verse.
    if (esUniqueViolado(error, CONSTRAINT_CODIGO)) {
      console.error(
        "[Tarifario] choque de codigo al editar, que no debería ocurrir",
        error,
      );
      return ERROR_CODIGO_GENERADO;
    }

    console.error("[Tarifario] fallo inesperado al editar la tarifa", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}

/**
 * Inactiva o reactiva una tarifa. NUNCA la borra.
 *
 * Regla invariable 9 de AGENTS.md: ningún registro se elimina en operación
 * normal, se desactiva. Esta acción solo escribe la columna `activo`; los datos
 * de la tarifa se conservan intactos y volver a activarla los devuelve tal
 * cual.
 *
 * ES SU PROPIA ACCIÓN, MÍNIMA, y no `editarTarifaEnModal` — la distinción
 * importa y es la misma que ya aplican `cambiarActivoMaterial` y
 * `cambiarActivoPrecio`: reutilizar la acción del formulario escribiría también
 * `cargo`, `unidad`, `costo` y `moneda`, así que un cambio de estado desde el
 * listado podría sobrescribir campos que esa pantalla ni siquiera muestra.
 *
 * Recibe ARGUMENTOS SUELTOS en vez de `FormData` y devuelve un
 * `ResultadoAccion` en vez de un `EstadoFormulario`: no nace de un `<form>` ni
 * tiene errores por campo que pintar debajo de un input — el resultado es
 * binario y quien lo recibe elige entre un toast de éxito y uno de error. Ver
 * `core/resultado-accion.ts`.
 *
 * `revalidatePath` es lo que hace que la fila DESAPAREZCA de la vista en la que
 * está: inactivar una tarifa desde la lista de activas la saca de esa consulta,
 * y reactivarla desde «Ver solo inactivos» la saca de esa otra. Las dos vistas
 * son excluyentes (ver `listarTarifas`), así que en ambos sentidos el efecto
 * visible es el mismo: la fila se va a donde corresponde.
 */
export async function cambiarActivoTarifa(
  id: string,
  activo: boolean,
): Promise<ResultadoAccion> {
  await exigirSesion();

  // Los tipos de los parámetros no protegen nada en runtime: una Server Action
  // es un endpoint y puede llegar cualquier cosa.
  const resultado = tarifaCambioActivoSchema.safeParse({ id, activo });

  if (!resultado.success) {
    return { ok: false, mensaje: "Esa petición no es válida." };
  }

  try {
    const actualizadas = await db
      .update(tarifarioPersonal)
      .set({ activo: resultado.data.activo })
      .where(eq(tarifarioPersonal.id, resultado.data.id))
      .returning({ id: tarifarioPersonal.id });

    if (actualizadas.length === 0) {
      return { ok: false, mensaje: "Esa tarifa ya no existe." };
    }
  } catch (error) {
    console.error("[Tarifario] fallo inesperado al cambiar el activo", error);
    return { ok: false, mensaje: "No se pudo completar. Intenta de nuevo." };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}

/**
 * Busca cargos ya usados, para que el modal los sugiera.
 *
 * ES UNA LECTURA, y aun así vive aquí y no en queries.ts: la invoca un Client
 * Component (`CampoConSugerencias` de core/) mientras el usuario teclea, así que
 * tiene que ser una Server Action. La consulta en sí sigue en queries.ts, donde
 * viven todas las lecturas del módulo; esto es solo el envoltorio que la expone,
 * con la sesión y la validación que exige cualquier otra action. Mismo reparto
 * que `buscarProveedoresAction` en Lista de precios.
 *
 * NO VIAJA COMO PROP DESDE LA PÁGINA, y eso es lo correcto aquí: ese rodeo solo
 * hace falta cuando los datos son de OTRO módulo (el material que busca Lista
 * de precios, que no puede importar de `modules/materiales/`). Los cargos salen
 * de `tarifario_personal`, que es la tabla de este módulo, así que el
 * componente de campos la importa directo — igual que la fila importa
 * `editarTarifaEnModal`.
 *
 * Devuelve `[]` ante un texto vacío o absurdo en vez de fallar: un campo que
 * lanza excepciones mientras se teclea es peor que uno que no sugiere nada, y
 * aquí todavía menos grave — sin sugerencias el usuario escribe el cargo y
 * sigue.
 */
export async function buscarCargosAction(texto: string): Promise<string[]> {
  await exigirSesion();

  const resultado = busquedaCargoSchema.safeParse(texto);

  if (!resultado.success) return [];

  return buscarCargos(resultado.data);
}
