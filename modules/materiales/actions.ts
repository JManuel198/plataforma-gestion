"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { materiales } from "@/db/schema/materiales";
import { materialCaracteristicas } from "@/db/schema/material-caracteristicas";
import type { EstadoFormulario } from "@/core/estado-formulario";
import { esUniqueViolado } from "@/core/errores-postgres";
import type { ResultadoAccion } from "@/core/resultado-accion";
import { reservarCorrelativo, type Transaccion } from "@/core/correlativo";
import { formatearCodigoMaterial } from "./codigo";
import { CLAVE_CORRELATIVO, CORRELATIVO_INICIAL } from "./constantes";
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
 * El UNIQUE de `codigo_interno`, que CAMBIÓ DE PAPEL cuando el código pasó a
 * generarse solo.
 *
 * Antes era una interacción esperada: el usuario escribía el código, repetía
 * uno y se le pedía corregirlo. Desde que lo emite `reservarCorrelativo`
 * (core/correlativo.ts) dentro de la transacción del INSERT, el usuario no
 * escribe ningún código y un choque aquí ya no es culpa suya — es que el
 * contador y la tabla se descuadraron. Es exactamente el mismo papel que tiene
 * el UNIQUE de `orden_trabajo.codigo_ot`: red de seguridad del generador.
 *
 * La restricción se queda justamente por eso. Que no deba dispararse nunca en
 * uso normal no es motivo para quitarla: es lo que convierte un descuadre
 * silencioso (dos materiales con el mismo código) en un fallo ruidoso.
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
 * Lo que se enseña cuando el código generado choca contra el UNIQUE.
 *
 * Va como `mensaje` general y NO bajo la clave `codigo_interno`: ese campo ya
 * no existe en el formulario, así que un error colgado de él no se pintaría en
 * ninguna parte. El texto tampoco puede seguir siendo "ya existe un material
 * con ese código interno" — eso presupone que el usuario lo escribió, y ya no
 * lo escribe.
 *
 * NO OFRECE REINTENTAR, y esa omisión es deliberada. Es la misma trampa que
 * documenta `crearOrdenTrabajoEnModal`: la transacción revierte también la
 * reserva del correlativo, así que un segundo intento pide EXACTAMENTE el mismo
 * número y choca contra el mismo código. El fallo es determinista, no
 * transitorio, y un "intenta de nuevo" mandaría al usuario a repetirlo en
 * bucle. Lo que hay que arreglar es el descuadre entre la fila de
 * `correlativo` y los materiales ya emitidos — resincronizar el contador al
 * mayor correlativo existente.
 */
const ERROR_CODIGO_GENERADO = {
  mensaje:
    "No se pudo generar el código del material. Si el problema persiste, contacta soporte.",
} satisfies EstadoFormulario;

/**
 * Lee las características técnicas del formulario.
 *
 * `Object.fromEntries(formData)` NO sirve para esto y ese es todo el motivo de
 * que exista esta función: cuando un nombre se repite —y aquí se repite, un
 * `caracteristicas` por línea escrita— se queda solo con el último valor y las
 * demás desaparecen en silencio. `getAll` es lo que devuelve las tres.
 *
 * Los campos vacíos y el fantasma no llegan hasta aquí: el editor solo pone el
 * atributo `name` cuando la línea tiene texto (ver
 * `caracteristicas-material.tsx`). El Zod lo vuelve a comprobar igualmente,
 * porque una Server Action es un endpoint y puede llegarle cualquier cosa.
 */
function leerFormulario(formData: FormData) {
  return {
    ...Object.fromEntries(formData),
    caracteristicas: formData.getAll("caracteristicas"),
  };
}

/**
 * Escribe la lista de características de un material, reemplazando la anterior.
 *
 * BORRA Y VUELVE A INSERTAR, dentro de la transacción que le pasen. Es un
 * DELETE real, y aquí sí corresponde: `material_caracteristicas` es la
 * excepción razonada a la regla invariable 9 (ver el comentario de su esquema)
 * — no es una entidad de negocio, es metadata que solo existe colgando de su
 * material, y nada más la referencia.
 *
 * Reemplazar entero en vez de calcular un diff (qué se quitó, qué cambió, qué
 * se añadió) es deliberado: son como mucho tres filas de texto, el formulario
 * envía la lista completa tal como debe quedar, y un diff exigiría que
 * viajaran los `id` de cada fila solo para ahorrar dos sentencias sobre tres
 * registros. A cambio hay que saber una cosa: **`created_at` refleja el último
 * guardado de la ficha, no la primera vez que se escribió esa característica**.
 * Hoy no se muestra en ninguna parte; si algún día hiciera falta esa fecha de
 * verdad, este es el sitio que habría que cambiar por un diff.
 *
 * El `orden` es la posición en el arreglo, que es el orden en que el usuario
 * las escribió: eso es lo que hace que al reabrir el modal salgan igual.
 */
async function reemplazarCaracteristicas(
  tx: Transaccion,
  materialId: string,
  textos: string[],
) {
  await tx
    .delete(materialCaracteristicas)
    .where(eq(materialCaracteristicas.material_id, materialId));

  if (textos.length === 0) return;

  await tx.insert(materialCaracteristicas).values(
    textos.map((texto, indice) => ({
      material_id: materialId,
      texto,
      orden: indice,
    })),
  );
}

/**
 * Alta de un material.
 *
 * `activo` no se escribe: la columna tiene `DEFAULT true`. Se da de alta
 * activo siempre, y la baja es una acción aparte y confirmada del listado.
 *
 * `codigo_interno` TAMPOCO viene del formulario: lo emite aquí el correlativo
 * global (`MAT.0000001`). Y `created_at` la pone la base con su `DEFAULT
 * now()` — es la fecha que luego muestran la tabla y la vista, en lugar de la
 * antigua `fecha_activacion`, que ya no existe.
 */
export async function crearMaterialEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = materialCrearSchema.safeParse(leerFormulario(formData));

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
    // La reserva del correlativo y el INSERT van en la MISMA transacción: si
    // el material falla, el número se revierte con él y no quedan huecos en la
    // numeración. El porqué completo está en core/correlativo.ts.
    await db.transaction(async (tx) => {
      const numero = await reservarCorrelativo(
        tx,
        CLAVE_CORRELATIVO,
        CORRELATIVO_INICIAL,
      );

      // `caracteristicas` no es una columna de `materiales`: se separa aquí y
      // se escribe en su tabla hija, en esta misma transacción. Si cualquiera
      // de las dos partes falla, no queda un material a medio guardar.
      const { caracteristicas, ...columnas } = resultado.data;

      const [creado] = await tx
        .insert(materiales)
        .values({
          ...columnas,
          codigo_interno: formatearCodigoMaterial(numero),
        })
        .returning({ id: materiales.id });

      await reemplazarCaracteristicas(tx, creado.id, caracteristicas);
    });
  } catch (error) {
    // Ya no es un error corregible por el usuario: el código lo emite el
    // contador, así que un choque significa que el contador y la tabla se
    // descuadraron. Ver ERROR_CODIGO_GENERADO, incluido el porqué de no
    // ofrecer un reintento.
    if (esUniqueViolado(error, CONSTRAINT_CODIGO_INTERNO)) {
      console.error(
        "[Materiales] el código generado chocó con el UNIQUE: el contador y la tabla están descuadrados",
        error,
      );
      return ERROR_CODIGO_GENERADO;
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

  const resultado = materialEditarSchema.safeParse(leerFormulario(formData));

  if (!resultado.success) {
    return {
      mensaje: "Revisa los campos marcados.",
      errores: z.flattenError(resultado.error).fieldErrors,
    };
  }

  const { id, caracteristicas, ...campos } = resultado.data;

  try {
    // Las dos escrituras van en la MISMA transacción: si el reemplazo de
    // características falla, el resto de los cambios del material se revierte
    // con él. Es también lo que hace cierta la promesa del modal — que quitar
    // una característica guardada no toca la base hasta que se guarda todo.
    const actualizados = await db.transaction(async (tx) => {
      // `activo` no está en `campos` y no debe estarlo: editar los datos de un
      // material nunca lo da de alta ni de baja por efecto secundario.
      const filas = await tx
        .update(materiales)
        .set(campos)
        .where(eq(materiales.id, id))
        .returning({ id: materiales.id });

      if (filas.length === 0) return filas;

      await reemplazarCaracteristicas(tx, id, caracteristicas);

      return filas;
    });

    if (actualizados.length === 0) {
      return { mensaje: "Ese material ya no existe." };
    }
  } catch (error) {
    // La edición ya no escribe `codigo_interno` —no está en
    // `materialEditarSchema`—, así que esto no debería dispararse nunca. Se
    // queda por lo mismo que la restricción: si alguna vez vuelve a tocarse esa
    // columna desde aquí, el fallo tiene que verse.
    if (esUniqueViolado(error, CONSTRAINT_CODIGO_INTERNO)) {
      console.error(
        "[Materiales] choque de codigo_interno al editar, que no debería ocurrir",
        error,
      );
      return ERROR_CODIGO_GENERADO;
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
