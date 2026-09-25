"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { exigirSesion } from "@/core/sesion";
import { db } from "@/db";
import { contactos } from "@/db/schema/contactos";
import type { EstadoFormulario } from "@/core/estado-formulario";
import type { ResultadoAccion } from "@/core/resultado-accion";
import { esFkViolada } from "@/core/errores-postgres";
import { RUTA_LISTADO } from "./constantes";
import {
  listarEmpresasParaSelector,
  type EmpresaSeleccionable,
} from "./queries";
import {
  busquedaSelectorEmpresaSchema,
  contactoCambioActivoSchema,
  contactoDatosSchema,
  contactoIdSchema,
} from "./schema";

/**
 * La única restricción de la tabla que el usuario puede disparar: `empresa_id`
 * apunta a una empresa que no existe (un id manipulado, o una empresa que
 * desapareció entre abrir el formulario y guardar). No hay UNIQUE que traducir
 * — `correo` se repite a propósito.
 *
 * Se pasa el nombre del constraint a `esFkViolada` para no confundir este
 * choque con el de una FK futura de la misma tabla.
 */
const CONSTRAINT_EMPRESA = "contactos_empresa_id_empresas_id_fk";

/**
 * La FK de la base es la garantía; esto solo la hace legible, colgada del campo
 * que la causó, en vez del error crudo de Postgres.
 */
const ERROR_EMPRESA_INEXISTENTE = {
  errores: {
    empresa_id: ["La empresa elegida no existe. Elige otra de la lista."],
  },
} satisfies EstadoFormulario;

/**
 * Lo único que ve el usuario cuando algo falla de una forma que no sabemos
 * traducir. El error real, entero, va al log del servidor con `console.error`.
 */
const MENSAJE_FALLO_GUARDADO = "No se pudo guardar. Intenta de nuevo.";

function erroresDeValidacion(error: z.ZodError): EstadoFormulario {
  return {
    mensaje: "Revisa los campos marcados.",
    errores: z.flattenError(error).fieldErrors,
  };
}

/**
 * Alta de un contacto. `activo` no se escribe: la columna tiene
 * `DEFAULT true`. No hay código correlativo que reservar, así que tampoco hace
 * falta transacción: es un solo INSERT.
 *
 * No se comprueba que la empresa esté activa: un contacto puede asociarse a una
 * empresa dada de baja (decisión confirmada, ver entidades.md).
 */
export async function crearContacto(
  formData: FormData,
): Promise<EstadoFormulario> {
  // Fuera del `try`: `redirect()` funciona lanzando, y dentro el catch se
  // comería la navegación al login.
  await exigirSesion();

  const resultado = contactoDatosSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return erroresDeValidacion(resultado.error);
  }

  try {
    await db.insert(contactos).values(resultado.data);
  } catch (error) {
    if (esFkViolada(error, CONSTRAINT_EMPRESA)) {
      return ERROR_EMPRESA_INEXISTENTE;
    }

    console.error("[Contactos] fallo inesperado al crear el contacto", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}

/**
 * Edición de un contacto. El `id` va como primer argumento y no dentro del
 * FormData: la UI lo fija con `actualizarContacto.bind(null, id)`, de modo que
 * la firma que recibe `useActionState` sigue siendo `(formData) => …`. Se
 * valida igual, porque una Server Action es un endpoint y el argumento puede
 * llegar manipulado.
 *
 * `activo` no está en `contactoDatosSchema`, así que editar nunca da de alta o
 * de baja por efecto secundario, aunque alguien lo cuele en el FormData.
 */
export async function actualizarContacto(
  id: string,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const idValido = contactoIdSchema.safeParse(id);

  if (!idValido.success) {
    return { mensaje: "Esa petición no es válida." };
  }

  const resultado = contactoDatosSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return erroresDeValidacion(resultado.error);
  }

  try {
    const actualizados = await db
      .update(contactos)
      .set(resultado.data)
      .where(eq(contactos.id, idValido.data))
      .returning({ id: contactos.id });

    if (actualizados.length === 0) {
      return { mensaje: "Ese contacto ya no existe." };
    }
  } catch (error) {
    if (esFkViolada(error, CONSTRAINT_EMPRESA)) {
      return ERROR_EMPRESA_INEXISTENTE;
    }

    console.error("[Contactos] fallo inesperado al editar el contacto", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}

/**
 * Da de baja o reactiva un contacto. Escribe SOLO la columna `activo` (baja
 * lógica, regla invariable 9).
 *
 * Recibe el valor DESTINO, no "invierte lo que haya", igual que
 * `alternarActivoEmpresa`: así la acción es idempotente. Un doble clic, o una
 * pestaña con el listado desactualizado, deja el contacto en el estado que el
 * usuario vio y pidió.
 */
export async function alternarActivoContacto(
  id: string,
  activo: boolean,
): Promise<ResultadoAccion> {
  await exigirSesion();

  const resultado = contactoCambioActivoSchema.safeParse({ id, activo });

  if (!resultado.success) {
    return { ok: false, mensaje: "Esa petición no es válida." };
  }

  try {
    const actualizados = await db
      .update(contactos)
      .set({ activo: resultado.data.activo })
      .where(eq(contactos.id, resultado.data.id))
      .returning({ id: contactos.id });

    if (actualizados.length === 0) {
      return { ok: false, mensaje: "Ese contacto ya no existe." };
    }
  } catch (error) {
    console.error("[Contactos] fallo inesperado al cambiar el alta", error);
    return { ok: false, mensaje: "No se pudo completar. Intenta de nuevo." };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}

/**
 * Empresas para el selector del formulario de contacto.
 *
 * ES UNA LECTURA, y aun así vive aquí y no solo en queries.ts: la invoca un
 * Client Component (el combobox) mientras el usuario teclea, así que tiene que
 * ser una Server Action. La consulta sigue en queries.ts; esto es el envoltorio
 * con la sesión y la validación que exige cualquier otra action. Mismo reparto
 * que `buscarProveedoresAction` en Lista de precios.
 *
 * Devuelve `[]` ante un texto absurdo en vez de fallar: un combobox que lanza
 * excepciones mientras se teclea es peor que uno que no encuentra nada.
 */
export async function listarEmpresasParaSelectorAction(
  busqueda: string,
): Promise<EmpresaSeleccionable[]> {
  await exigirSesion();

  const resultado = busquedaSelectorEmpresaSchema.safeParse(busqueda);

  if (!resultado.success) return [];

  try {
    return await listarEmpresasParaSelector(resultado.data);
  } catch (error) {
    console.error("[Contactos] fallo inesperado al buscar empresas", error);
    return [];
  }
}
