"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { exigirSesion } from "@/core/sesion";
import { db } from "@/db";
import { servicios } from "@/db/schema/servicios";
import type { EstadoFormulario } from "@/core/estado-formulario";
import { esUniqueViolado } from "@/core/errores-postgres";
import { reservarCorrelativo } from "@/core/correlativo";
import { formatearCodigoServicio } from "./codigo";
import {
  CLAVE_CORRELATIVO_SERVICIO,
  CORRELATIVO_SERVICIO_INICIAL,
  RUTA_LISTADO,
} from "./constantes";
import { servicioCrearSchema, servicioEditarSchema } from "./schema";

/**
 * El `UNIQUE` de `servicios.codigo`, que es RED DE SEGURIDAD DEL GENERADOR y
 * no una interacción del usuario.
 *
 * Nace ya con ese papel, a diferencia del de Materiales, que antes fue un campo
 * que el usuario escribía y lo cambió al autogenerarse. Aquí el código lo emite
 * `reservarCorrelativo` (core/correlativo.ts) dentro de la transacción del
 * INSERT desde el primer día, así que un choque nunca es culpa de quien llena
 * el formulario: es que el contador y la tabla se descuadraron.
 *
 * Que no deba dispararse nunca en uso normal no es motivo para quitar la
 * restricción: es lo que convierte un descuadre silencioso (dos servicios con
 * el mismo código) en un fallo ruidoso.
 *
 * La comprobación vive en core/ y no aquí porque el error de Drizzle llega
 * envuelto y hay que recorrer su `cause` — ver el comentario de
 * `esUniqueViolado`, donde está el porqué con el detalle verificado. Escribirlo
 * a mano con `error.code` es el bug que estuvo roto en silencio en los tres
 * módulos durante semanas (deuda técnica de AGENTS.md, 2026-09-21).
 */
const CONSTRAINT_CODIGO = "servicios_codigo_unique";

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
 * documentan `crearMaterialEnModal` y `crearOrdenTrabajoEnModal`: la
 * transacción revierte también la reserva del correlativo, así que un segundo
 * intento pide EXACTAMENTE el mismo número y choca contra el mismo código. El
 * fallo es determinista, no transitorio, y un "intenta de nuevo" mandaría al
 * usuario a repetirlo en bucle. Lo que hay que arreglar es el descuadre entre
 * la fila de `correlativo` y los servicios ya emitidos — resincronizar el
 * contador al mayor correlativo existente.
 */
const ERROR_CODIGO_GENERADO = {
  mensaje:
    "No se pudo generar el código del servicio. Si el problema persiste, contacta soporte.",
} satisfies EstadoFormulario;

/**
 * Alta de un servicio.
 *
 * `codigo` NO viene del formulario: lo emite aquí el correlativo global
 * (`SRV.0000001`). Y `created_at` la pone la base con su `DEFAULT now()`.
 *
 * `activo` no se escribe porque NO EXISTE en esta tabla — a diferencia de
 * Materiales y Lista de precios, donde tampoco se escribe pero sí hay columna
 * con `DEFAULT true`. Aquí no hay alta ni baja lógica que dar: todo servicio
 * registrado está en el catálogo. Ver la ficha en docs/spec/entidades.md.
 */
export async function crearServicioEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = servicioCrearSchema.safeParse(
    Object.fromEntries(formData),
  );

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
    // La reserva del correlativo y el INSERT van en la MISMA transacción: si el
    // servicio falla, el número se revierte con él y no quedan huecos en la
    // numeración. El porqué completo está en core/correlativo.ts.
    await db.transaction(async (tx) => {
      const numero = await reservarCorrelativo(
        tx,
        CLAVE_CORRELATIVO_SERVICIO,
        CORRELATIVO_SERVICIO_INICIAL,
      );

      await tx.insert(servicios).values({
        ...resultado.data,
        codigo: formatearCodigoServicio(numero),
      });
    });
  } catch (error) {
    // No es un error corregible por el usuario: el código lo emite el contador,
    // así que un choque significa que el contador y la tabla se descuadraron.
    // Ver ERROR_CODIGO_GENERADO, incluido el porqué de no ofrecer un reintento.
    if (esUniqueViolado(error, CONSTRAINT_CODIGO)) {
      console.error(
        "[Servicios] el código generado chocó con el UNIQUE: el contador y la tabla están descuadrados",
        error,
      );
      return ERROR_CODIGO_GENERADO;
    }

    console.error("[Servicios] fallo inesperado al crear el servicio", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}

export async function editarServicioEnModal(
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = servicioEditarSchema.safeParse(
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
    // `codigo` no está en `campos` y no debe estarlo: `servicioEditarSchema` no
    // lo declara, así que editar un servicio nunca puede reescribir su código
    // aunque alguien lo cuele en el FormData.
    const actualizados = await db
      .update(servicios)
      .set(campos)
      .where(eq(servicios.id, id))
      .returning({ id: servicios.id });

    if (actualizados.length === 0) {
      return { mensaje: "Ese servicio ya no existe." };
    }
  } catch (error) {
    // La edición no escribe `codigo`, así que esto no debería dispararse nunca.
    // Se queda por lo mismo que la restricción: si alguna vez vuelve a tocarse
    // esa columna desde aquí, el fallo tiene que verse.
    if (esUniqueViolado(error, CONSTRAINT_CODIGO)) {
      console.error(
        "[Servicios] choque de codigo al editar, que no debería ocurrir",
        error,
      );
      return ERROR_CODIGO_GENERADO;
    }

    console.error("[Servicios] fallo inesperado al editar el servicio", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}
