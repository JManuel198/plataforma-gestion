"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { listaPrecios } from "@/db/schema/lista-precios";
import { reservarCorrelativo } from "@/core/correlativo";
import type { EstadoFormulario } from "@/core/estado-formulario";
import { esUniqueViolado } from "@/core/errores-postgres";
import { formatearCodigoOferta } from "./codigo";
import {
  CLAVE_CORRELATIVO_OFERTA,
  CORRELATIVO_OFERTA_INICIAL,
  RUTA_LISTADO,
} from "./constantes";
import { precioCrearSchema, precioEditarSchema } from "./schema";

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
 * El UNIQUE de `codigo_oferta`.
 *
 * Su papel aquí NO es el mismo que el del `codigo_interno` de Materiales, y la
 * diferencia importa para el mensaje: allí el código lo escribe el usuario, así
 * que un choque es un error suyo que puede corregir. Aquí lo genera el
 * correlativo atómico, así que un choque solo puede significar que algo se
 * saltó ese camino — es un fallo interno, no algo que el usuario pueda
 * arreglar escribiendo otra cosa. Mismo caso que el 23505 de `codigo_ot` en
 * Órdenes de Trabajo.
 */
const CONSTRAINT_CODIGO_OFERTA = "lista_precios_codigo_oferta_unique";

const MENSAJE_FALLO_GUARDADO = "No se pudo guardar. Intenta de nuevo.";

/**
 * Alta de una oferta.
 *
 * `codigo_oferta` no viene del formulario: se reserva aquí. La reserva del
 * correlativo y el INSERT van en la MISMA transacción a propósito — si el
 * INSERT falla, el número se revierte con él y no quedan huecos en la
 * numeración. El porqué completo está en core/correlativo.ts.
 *
 * `activo` tampoco se escribe: la columna tiene `DEFAULT true`.
 */
export async function crearPrecioEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = precioCrearSchema.safeParse(Object.fromEntries(formData));

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
    await db.transaction(async (tx) => {
      const correlativo = await reservarCorrelativo(
        tx,
        CLAVE_CORRELATIVO_OFERTA,
        CORRELATIVO_OFERTA_INICIAL,
      );

      await tx.insert(listaPrecios).values({
        ...resultado.data,
        codigo_oferta: formatearCodigoOferta(correlativo),
      });
    });
  } catch (error) {
    if (esUniqueViolado(error, CONSTRAINT_CODIGO_OFERTA)) {
      // No se le pide al usuario que corrija nada: no escribió ese código. Se
      // deja rastro en el log porque significa que el correlativo y la tabla
      // dejaron de estar de acuerdo, que es un problema nuestro.
      console.error(
        "[Lista de precios] el correlativo generó un codigo_oferta ya existente",
        error,
      );
      return { mensaje: MENSAJE_FALLO_GUARDADO };
    }

    console.error("[Lista de precios] fallo inesperado al crear la oferta", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}

/**
 * Edición de una oferta.
 *
 * `codigo_oferta` NO se toca: es la identidad visible de la fila y ya se
 * entregó. Reasignarlo al editar rompería cualquier referencia externa a ese
 * número y consumiría un correlativo sin motivo. Mismo criterio que `codigo_ot`.
 *
 * `activo` tampoco: editar los datos de una oferta nunca la da de alta ni de
 * baja por efecto secundario (esa es su propia acción, en la Parte 2).
 */
export async function editarPrecioEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = precioEditarSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return {
      mensaje: "Revisa los campos marcados.",
      errores: z.flattenError(resultado.error).fieldErrors,
    };
  }

  const { id, ...campos } = resultado.data;

  try {
    const actualizadas = await db
      .update(listaPrecios)
      .set(campos)
      .where(eq(listaPrecios.id, id))
      .returning({ id: listaPrecios.id });

    if (actualizadas.length === 0) {
      return { mensaje: "Esa oferta ya no existe." };
    }
  } catch (error) {
    console.error("[Lista de precios] fallo inesperado al editar la oferta", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}
