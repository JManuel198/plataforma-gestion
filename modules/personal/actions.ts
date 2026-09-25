"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { exigirSesion } from "@/core/sesion";
import { db } from "@/db";
import { personal } from "@/db/schema/personal";
import type { EstadoFormulario } from "@/core/estado-formulario";
import type { ResultadoAccion } from "@/core/resultado-accion";
import { esUniqueViolado } from "@/core/errores-postgres";
import {
  personaCambioActivoSchema,
  personaCrearSchema,
  personaEditarSchema,
} from "./schema";

/**
 * Alguien intentó dar de alta a una persona con un DNI que ya existe. A
 * diferencia del choque de OT —que era un fallo interno del correlativo— este
 * es un error del usuario perfectamente normal, y por eso el mensaje dice qué
 * hacer.
 *
 * CORREGIDO EL 2026-09-21: esto comprobaba `error.code === "23505"` a mano y
 * NUNCA se cumplía, porque Drizzle envuelve el error de `pg` y el `code` queda
 * en `cause`. El UNIQUE de la base sí rechazaba el duplicado —ningún dato se
 * corrompió— pero el usuario veía el mensaje genérico en vez de este. El
 * porqué, con la verificación contra la base real, está en
 * `esUniqueViolado` (core/errores-postgres.ts).
 */
const CONSTRAINT_DNI = "personal_dni_unique";

/**
 * Lo único que ve el usuario cuando algo falla de una forma que no sabemos
 * traducir. El error real, entero, va al log del servidor con `console.error`.
 * Mismo criterio que en modules/ordenes-trabajo/actions.ts: la pantalla no
 * adivina causas técnicas.
 */
const MENSAJE_FALLO_GUARDADO = "No se pudo guardar. Intenta de nuevo.";

const ERROR_DNI_DUPLICADO = {
  errores: { dni: ["Ya hay una persona registrada con ese DNI."] },
} satisfies EstadoFormulario;

/**
 * Alta de una persona.
 *
 * `activo` no se escribe: la columna tiene `DEFAULT true`. Se da de alta
 * activa siempre, y la baja es una acción aparte y confirmada.
 */
export async function crearPersonaEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = personaCrearSchema.safeParse(Object.fromEntries(formData));

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
    await db.insert(personal).values(resultado.data);
  } catch (error) {
    // El UNIQUE de la base es la garantía de verdad: comprobar antes con un
    // SELECT dejaría una ventana entre la comprobación y el INSERT en la que
    // otra alta simultánea mete el mismo DNI. Se intenta y se traduce el
    // choque, que es lo único libre de carreras.
    if (esUniqueViolado(error, CONSTRAINT_DNI)) {
      return ERROR_DNI_DUPLICADO;
    }

    console.error("[Personal] fallo inesperado al crear la persona", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath("/personal");

  return { ok: true };
}

export async function editarPersonaEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = personaEditarSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return {
      mensaje: "Revisa los campos marcados.",
      errores: z.flattenError(resultado.error).fieldErrors,
    };
  }

  const { id, ...campos } = resultado.data;

  try {
    // `activo` no está en `campos` y no debe estarlo: editar los datos de
    // alguien nunca lo da de alta ni de baja por efecto secundario.
    const actualizadas = await db
      .update(personal)
      .set(campos)
      .where(eq(personal.id, id))
      .returning({ id: personal.id });

    if (actualizadas.length === 0) {
      return { mensaje: "Esa persona ya no existe." };
    }
  } catch (error) {
    if (esUniqueViolado(error, CONSTRAINT_DNI)) {
      return ERROR_DNI_DUPLICADO;
    }

    console.error("[Personal] fallo inesperado al editar la persona", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath("/personal");

  return { ok: true };
}

/**
 * Da de baja o vuelve a dar de alta a una persona. Escribe SOLO la columna
 * `activo`.
 *
 * NO ES UN BORRADO, y no debe convertirse en uno. Si algún día
 * `orden_trabajo.responsable` —hoy texto libre— pasa a apuntar de verdad a
 * esta tabla, un DELETE dejaría OT históricas señalando a una fila que ya no
 * existe. La baja lógica conserva el dato y solo lo saca de la vista.
 *
 * Deliberadamente no reutiliza `editarPersonaEnModal`: esa recibe el
 * formulario entero y escribe cuatro columnas más, así que invocarla desde el
 * listado significaría devolver valores que esa pantalla no muestra. Mismo
 * criterio que `actualizarEstadoOrdenTrabajo`.
 *
 * Recibe argumentos sueltos, no un `FormData`: no nace de un `<form>`.
 */
export async function cambiarActivoPersona(
  id: string,
  activo: boolean,
): Promise<ResultadoAccion> {
  await exigirSesion();

  // Los tipos de los parámetros no protegen nada en runtime: una Server
  // Action es un endpoint y puede llegar cualquier cosa.
  const resultado = personaCambioActivoSchema.safeParse({ id, activo });

  if (!resultado.success) {
    return { ok: false, mensaje: "Esa petición no es válida." };
  }

  try {
    const actualizadas = await db
      .update(personal)
      .set({ activo: resultado.data.activo })
      .where(eq(personal.id, resultado.data.id))
      .returning({ id: personal.id });

    if (actualizadas.length === 0) {
      return { ok: false, mensaje: "Esa persona ya no existe." };
    }
  } catch (error) {
    console.error("[Personal] fallo inesperado al cambiar el alta", error);
    return { ok: false, mensaje: "No se pudo completar. Intenta de nuevo." };
  }

  revalidatePath("/personal");

  return { ok: true };
}
