"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ordenTrabajo } from "@/db/schema/orden-trabajo";
import { anioVigente, formatearCodigoOt } from "./codigo";
import { reservarCorrelativo } from "./correlativo";
import type { EstadoFormulario } from "./estado-formulario";
import { otCrearSchema, otEditarSchema } from "./schema";

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
 * `23505` es la violación de UNIQUE en PostgreSQL. Solo debería poder saltar
 * sobre `codigo_ot`, y solo si algo se saltó el contador de
 * correlativo.ts — es la red de seguridad de la base de datos haciendo su
 * trabajo. Se traduce a un mensaje en vez de dejar que reviente en un 500.
 */
function esCodigoDuplicado(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

/**
 * Crea una OT. Desde la fusión con Servicio es una creación autónoma: no nace
 * de ninguna otra fila, así que no hay id externo que atar con `.bind()` ni
 * clave foránea que verificar antes de insertar.
 */
export async function crearOrdenTrabajo(
  _estadoPrevio: EstadoFormulario,
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
    // El porqué completo está en correlativo.ts.
    await db.transaction(async (tx) => {
      const correlativo = await reservarCorrelativo(tx, anio);

      // `fecha_creacion` no se envía: la pone la base de datos
      // (DEFAULT now()) al insertar.
      await tx.insert(ordenTrabajo).values({
        ...resultado.data,
        codigo_ot: formatearCodigoOt(anio, correlativo),
      });
    });
  } catch (error) {
    if (esCodigoDuplicado(error)) {
      // Reintentar NO sirve, y por eso este mensaje no lo ofrece: la
      // transacción revierte también la reserva del correlativo, así que un
      // segundo intento pide exactamente el mismo número y choca contra el
      // mismo `codigo_ot`. El fallo es determinista, no transitorio.
      //
      // Si alguien piensa en agregar aquí un botón de "reintentar" o un
      // reintento automático: no lo hagas, solo repetirá el error. Lo que hay
      // que arreglar es el descuadre entre `ot_correlativo` y las OT ya
      // emitidas — resincronizar el contador al mayor correlativo del año.
      return {
        mensaje:
          "No se pudo generar el número de OT. Si el problema persiste, contacta soporte.",
      };
    }

    throw error;
  }

  revalidatePath("/ordenes-trabajo");
  // El aviso viaja en la URL: el toast se muestra ya en el listado, después
  // de la navegación (ver components/aviso-toast.tsx).
  redirect("/ordenes-trabajo?aviso=creada");
}

export async function editarOrdenTrabajo(
  _estadoPrevio: EstadoFormulario,
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

  revalidatePath("/ordenes-trabajo");
  revalidatePath(`/ordenes-trabajo/${id}/editar`);
  redirect("/ordenes-trabajo?aviso=editada");
}
