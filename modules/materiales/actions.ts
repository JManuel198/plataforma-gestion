"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { materiales } from "@/db/schema/materiales";
import type { EstadoFormulario } from "@/core/estado-formulario";
import { esUniqueViolado } from "@/core/errores-postgres";
import type { ResultadoAccion } from "@/core/resultado-accion";
import {
  materialCambioActivoSchema,
  materialCrearSchema,
  materialEditarSchema,
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
 * Alguien intentó registrar un material con un `codigo_interno` que ya existe.
 * Es un error del usuario perfectamente normal, no un fallo interno, y por eso
 * el mensaje dice qué pasó.
 *
 * Esta traducción llegó junto con el UNIQUE y su migración, en el mismo
 * cambio: son las tres piezas que tienen que viajar juntas. Con la
 * restricción pero sin esto, un código repetido saldría como un genérico "no
 * se pudo guardar" sin decir por qué; con esto pero sin la restricción, sería
 * código muerto que nunca se dispara.
 *
 * La comprobación vive en core/ y no aquí porque el error de Drizzle llega
 * envuelto y hay que recorrer su `cause` — ver el comentario de
 * `esUniqueViolado`, donde está el porqué con el detalle verificado.
 */
const CONSTRAINT_CODIGO_INTERNO = "materiales_codigo_interno_unique";

/**
 * Lo único que ve el usuario cuando algo falla de una forma que no sabemos
 * traducir. El error real, entero, va al log del servidor con `console.error`.
 * Mismo criterio que en los otros módulos: la pantalla no adivina causas
 * técnicas.
 */
const MENSAJE_FALLO_GUARDADO = "No se pudo guardar. Intenta de nuevo.";

/**
 * El error se devuelve bajo la clave `codigo_interno` para que salga debajo
 * de ese campo en el formulario, no como un aviso suelto arriba.
 */
const ERROR_CODIGO_DUPLICADO = {
  errores: {
    codigo_interno: ["Ya existe un material con ese código interno."],
  },
} satisfies EstadoFormulario;

/**
 * Alta de un material.
 *
 * `activo` no se escribe: la columna tiene `DEFAULT true`. Se da de alta
 * activo siempre, y la baja será una acción aparte y confirmada (Parte 2).
 */
export async function crearMaterialEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = materialCrearSchema.safeParse(Object.fromEntries(formData));

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
    await db.insert(materiales).values(resultado.data);
  } catch (error) {
    // El UNIQUE de la base es la garantía de verdad: comprobar antes con un
    // SELECT dejaría una ventana entre la comprobación y el INSERT en la que
    // otra alta simultánea mete el mismo código. Se intenta y se traduce el
    // choque, que es lo único libre de carreras.
    if (esUniqueViolado(error, CONSTRAINT_CODIGO_INTERNO)) {
      return ERROR_CODIGO_DUPLICADO;
    }

    console.error("[Materiales] fallo inesperado al crear el material", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath("/materiales");

  return { ok: true };
}

export async function editarMaterialEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = materialEditarSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!resultado.success) {
    return {
      mensaje: "Revisa los campos marcados.",
      errores: z.flattenError(resultado.error).fieldErrors,
    };
  }

  const { id, ...campos } = resultado.data;

  try {
    // `activo` no está en `campos` y no debe estarlo: editar los datos de un
    // material nunca lo da de alta ni de baja por efecto secundario.
    const actualizados = await db
      .update(materiales)
      .set(campos)
      .where(eq(materiales.id, id))
      .returning({ id: materiales.id });

    if (actualizados.length === 0) {
      return { mensaje: "Ese material ya no existe." };
    }
  } catch (error) {
    if (esUniqueViolado(error, CONSTRAINT_CODIGO_INTERNO)) {
      return ERROR_CODIGO_DUPLICADO;
    }

    console.error("[Materiales] fallo inesperado al editar el material", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath("/materiales");

  return { ok: true };
}

/**
 * Inactiva un material o vuelve a activarlo. Escribe SOLO la columna `activo`.
 *
 * NO ES UN BORRADO, y no debe convertirse en uno. La fila se queda: el día que
 * `lista_precios.material` apunte de verdad a esta tabla (decisión todavía
 * abierta, ver preguntas-abiertas.md), un DELETE dejaría filas de precios
 * señalando a un material que ya no existe. Inactivar conserva el dato y solo
 * lo saca del catálogo vigente.
 *
 * Deliberadamente no reutiliza `editarMaterialEnModal`: esa recibe el
 * formulario entero y escribe siete columnas más, así que invocarla desde el
 * listado significaría reescribir valores que esa pantalla ni muestra. Mismo
 * criterio que `cambiarActivoPersona` y `actualizarEstadoOrdenTrabajo`.
 *
 * Recibe argumentos sueltos, no un `FormData`: no nace de un `<form>`.
 */
export async function cambiarActivoMaterial(
  id: string,
  activo: boolean,
): Promise<ResultadoAccion> {
  await exigirSesion();

  // Los tipos de los parámetros no protegen nada en runtime: una Server Action
  // es un endpoint y puede llegar cualquier cosa.
  const resultado = materialCambioActivoSchema.safeParse({ id, activo });

  if (!resultado.success) {
    return { ok: false, mensaje: "Esa petición no es válida." };
  }

  try {
    const actualizados = await db
      .update(materiales)
      .set({ activo: resultado.data.activo })
      .where(eq(materiales.id, resultado.data.id))
      .returning({ id: materiales.id });

    if (actualizados.length === 0) {
      return { ok: false, mensaje: "Ese material ya no existe." };
    }
  } catch (error) {
    console.error("[Materiales] fallo inesperado al cambiar el activo", error);
    return { ok: false, mensaje: "No se pudo completar. Intenta de nuevo." };
  }

  revalidatePath("/materiales");

  return { ok: true };
}
