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
import type { ResultadoAccion } from "@/core/resultado-accion";
import { esUniqueViolado } from "@/core/errores-postgres";
import { formatearCodigoOferta } from "./codigo";
import {
  CLAVE_CORRELATIVO_OFERTA,
  CORRELATIVO_OFERTA_INICIAL,
  RUTA_LISTADO,
} from "./constantes";
import { buscarProveedores } from "./queries";
import {
  busquedaProveedorSchema,
  precioCambioActivoSchema,
  precioCrearSchema,
  precioEditarSchema,
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

/**
 * Busca proveedores ya usados, para que el modal los sugiera.
 *
 * ES UNA LECTURA, y aun así vive aquí y no en queries.ts: la invoca un Client
 * Component (`CampoConSugerencias` de core/) mientras el usuario teclea, así
 * que tiene que ser una Server Action. La consulta en sí sigue en queries.ts,
 * donde viven todas las lecturas del módulo; esto es solo el envoltorio que la
 * expone, con la sesión y la validación que exige cualquier otra action. Mismo
 * reparto que `buscarMaterialesParaSeleccionAction` en Materiales.
 *
 * LO QUE AQUÍ NO HACE FALTA, Y ALLÍ SÍ: esta acción NO viaja como prop desde la
 * página. Aquel rodeo existe porque el material lo busca OTRO módulo y
 * `modules/lista-precios/` no puede importar de `modules/materiales/`
 * (AGENTS.md, Arquitectura). El proveedor sale de `lista_precios`, que es la
 * tabla de este módulo, así que el componente de campos la importa directo —
 * igual que la fila importa `editarPrecioEnModal`.
 *
 * Devuelve `[]` ante un texto vacío o absurdo en vez de fallar: un campo que
 * lanza excepciones mientras se teclea es peor que uno que no sugiere nada, y
 * aquí todavía menos grave — sin sugerencias el usuario escribe el nombre y
 * sigue.
 */
export async function buscarProveedoresAction(
  texto: string,
): Promise<string[]> {
  await exigirSesion();

  const resultado = busquedaProveedorSchema.safeParse(texto);

  if (!resultado.success) return [];

  return buscarProveedores(resultado.data);
}

/**
 * Inactiva una oferta o vuelve a activarla. Escribe SOLO la columna `activo`.
 *
 * NO ES UN BORRADO (regla invariable 9): la fila se queda entera y se puede
 * volver a activar desde «Ver solo inactivos». Que no lo sea importa aquí más
 * que en Materiales por una razón concreta: `codigo_oferta` sale de un
 * correlativo que no reinicia nunca, así que borrar una oferta dejaría un hueco
 * permanente en la numeración que nadie podría explicar después.
 *
 * ACCIÓN PROPIA Y MÍNIMA, nunca la de guardar el formulario entero: aquella
 * reescribe las siete columnas de negocio y aquí solo hay que tocar una. El
 * esquema (`precioCambioActivoSchema`) no admite nada más, así que un POST
 * directo con campos de propina no puede colar una edición disfrazada de baja.
 *
 * Recibe argumentos sueltos y devuelve `ResultadoAccion` —no `FormData` ni
 * `EstadoFormulario`—: no hay formulario detrás, solo un botón. Mismo patrón
 * que `cambiarActivoMaterial` y `SelectorEstadoFila`.
 */
export async function cambiarActivoPrecio(
  id: string,
  activo: boolean,
): Promise<ResultadoAccion> {
  await exigirSesion();

  // Los tipos de los parámetros no protegen nada en runtime: una Server Action
  // es un endpoint y puede llegar cualquier cosa.
  const resultado = precioCambioActivoSchema.safeParse({ id, activo });

  if (!resultado.success) {
    return { ok: false, mensaje: "Esa petición no es válida." };
  }

  try {
    const actualizadas = await db
      .update(listaPrecios)
      .set({ activo: resultado.data.activo })
      .where(eq(listaPrecios.id, resultado.data.id))
      .returning({ id: listaPrecios.id });

    if (actualizadas.length === 0) {
      return { ok: false, mensaje: "Esa oferta ya no existe." };
    }
  } catch (error) {
    console.error("[Lista de precios] fallo inesperado al cambiar el activo", error);
    return { ok: false, mensaje: "No se pudo completar. Intenta de nuevo." };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}
