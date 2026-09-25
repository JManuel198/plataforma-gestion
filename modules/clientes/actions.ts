"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { exigirSesion } from "@/core/sesion";
import { db } from "@/db";
import { empresas } from "@/db/schema/empresas";
import type { EstadoFormulario } from "@/core/estado-formulario";
import type { ResultadoAccion } from "@/core/resultado-accion";
import { esUniqueViolado } from "@/core/errores-postgres";
import { reservarCorrelativo } from "@/core/correlativo";
import { formatearCodigoEmpresa } from "./codigo";
import {
  CLAVE_CORRELATIVO_EMPRESA,
  CORRELATIVO_EMPRESA_INICIAL,
  RUTA_LISTADO,
} from "./constantes";
import {
  consultarRucEnDecolecta,
  MENSAJE_RUC_FORMATO,
  type ResultadoConsultaRuc,
} from "./decolecta";
import {
  empresaCambioActivoSchema,
  empresaDatosSchema,
  empresaIdSchema,
  rucSchema,
} from "./schema";

/**
 * Este módulo tiene DOS UNIQUE y juegan papeles opuestos — conviene no
 * tratarlos igual:
 *
 * - `empresas_ruc_unique` es una interacción NORMAL del usuario: alguien
 *   registra una empresa que ya existe. El mensaje dice qué pasó, colgado del
 *   campo `ruc`. Mismo papel que el UNIQUE de DNI en Personal y en Ajustes de
 *   usuario.
 * - `empresas_codigo_unique` es RED DE SEGURIDAD DEL GENERADOR: el código lo
 *   emite `reservarCorrelativo`, así que un choque es que el contador y la
 *   tabla se descuadraron. Mismo papel que en EPPs.
 *
 * Se pasa siempre el nombre del constraint a `esUniqueViolado`: sin él, un
 * choque del código se mostraría como "ese RUC ya existe".
 */
const CONSTRAINT_RUC = "empresas_ruc_unique";
const CONSTRAINT_CODIGO = "empresas_codigo_unique";

/**
 * Lo único que ve el usuario cuando algo falla de una forma que no sabemos
 * traducir. El error real, entero, va al log del servidor con `console.error`.
 */
const MENSAJE_FALLO_GUARDADO = "No se pudo guardar. Intenta de nuevo.";

/**
 * El RUC ya pertenece a otra empresa. El UNIQUE de la base es la garantía:
 * comprobar antes con un SELECT dejaría una ventana en la que otra alta
 * simultánea mete el mismo RUC. Se intenta y se traduce el choque.
 *
 * Al editar, "otra" es literal: guardar una empresa con su propio RUC no choca,
 * porque el UPDATE no cambia el valor de esa fila contra sí misma.
 */
const ERROR_RUC_DUPLICADO = {
  errores: { ruc: ["Ya hay otra empresa registrada con ese RUC."] },
} satisfies EstadoFormulario;

/**
 * NO OFRECE REINTENTAR, por lo mismo que `ERROR_CODIGO_GENERADO` de EPPs: la
 * transacción revierte también la reserva, así que un segundo intento pide el
 * mismo número y vuelve a chocar. Lo que hay que arreglar es el contador.
 */
const ERROR_CODIGO_GENERADO = {
  mensaje:
    "No se pudo generar el código de la empresa. Si el problema persiste, contacta soporte.",
} satisfies EstadoFormulario;

function erroresDeValidacion(error: z.ZodError): EstadoFormulario {
  return {
    mensaje: "Revisa los campos marcados.",
    errores: z.flattenError(error).fieldErrors,
  };
}

/**
 * Alta de una empresa.
 *
 * `codigo` no viene del formulario: lo emite aquí el correlativo global
 * (`CLT.0001`). `activo` no se escribe: la columna tiene `DEFAULT true`. `pais`
 * en blanco ya llega como `'PE'` desde `empresaDatosSchema`.
 */
export async function crearEmpresa(
  formData: FormData,
): Promise<EstadoFormulario> {
  // Fuera del `try`: `redirect()` funciona lanzando, y dentro el catch se
  // comería la navegación al login.
  await exigirSesion();

  const resultado = empresaDatosSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return erroresDeValidacion(resultado.error);
  }

  try {
    // Reserva del correlativo e INSERT en la MISMA transacción: si el INSERT
    // falla (p. ej. RUC duplicado), el número se revierte con él y no quedan
    // huecos. El porqué completo está en core/correlativo.ts.
    await db.transaction(async (tx) => {
      const numero = await reservarCorrelativo(
        tx,
        CLAVE_CORRELATIVO_EMPRESA,
        CORRELATIVO_EMPRESA_INICIAL,
      );

      await tx.insert(empresas).values({
        ...resultado.data,
        codigo: formatearCodigoEmpresa(numero),
      });
    });
  } catch (error) {
    if (esUniqueViolado(error, CONSTRAINT_RUC)) {
      return ERROR_RUC_DUPLICADO;
    }

    if (esUniqueViolado(error, CONSTRAINT_CODIGO)) {
      console.error(
        "[Clientes] el código generado chocó con el UNIQUE: el contador y la tabla están descuadrados",
        error,
      );
      return ERROR_CODIGO_GENERADO;
    }

    console.error("[Clientes] fallo inesperado al crear la empresa", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}

/**
 * Edición de una empresa. El `id` va como primer argumento y no dentro del
 * FormData: la UI lo fija con `actualizarEmpresa.bind(null, id)`, de modo que
 * la firma que recibe `useActionState` sigue siendo `(formData) => …`. Se
 * valida igual, porque una Server Action es un endpoint y el argumento puede
 * llegar manipulado.
 *
 * `codigo` y `activo` no están en `empresaDatosSchema`, así que editar nunca
 * reescribe el código ni da de alta o de baja por efecto secundario, aunque
 * alguien los cuele en el FormData.
 */
export async function actualizarEmpresa(
  id: string,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const idValido = empresaIdSchema.safeParse(id);

  if (!idValido.success) {
    return { mensaje: "Esa petición no es válida." };
  }

  const resultado = empresaDatosSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return erroresDeValidacion(resultado.error);
  }

  try {
    const actualizadas = await db
      .update(empresas)
      .set(resultado.data)
      .where(eq(empresas.id, idValido.data))
      .returning({ id: empresas.id });

    if (actualizadas.length === 0) {
      return { mensaje: "Esa empresa ya no existe." };
    }
  } catch (error) {
    if (esUniqueViolado(error, CONSTRAINT_RUC)) {
      return ERROR_RUC_DUPLICADO;
    }

    console.error("[Clientes] fallo inesperado al editar la empresa", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}

/**
 * Da de baja o reactiva una empresa. Escribe SOLO la columna `activo` (baja
 * lógica, regla invariable 9) — nunca `estado`/`condicion`, que son de SUNAT.
 *
 * Recibe el valor DESTINO, no "invierte lo que haya", igual que
 * `cambiarActivoPersona`: así la acción es idempotente. Un doble clic, o una
 * pestaña con el listado desactualizado, deja la empresa en el estado que el
 * usuario vio y pidió, en vez de darla de baja y reactivarla sin querer.
 */
export async function alternarActivoEmpresa(
  id: string,
  activo: boolean,
): Promise<ResultadoAccion> {
  await exigirSesion();

  const resultado = empresaCambioActivoSchema.safeParse({ id, activo });

  if (!resultado.success) {
    return { ok: false, mensaje: "Esa petición no es válida." };
  }

  try {
    const actualizadas = await db
      .update(empresas)
      .set({ activo: resultado.data.activo })
      .where(eq(empresas.id, resultado.data.id))
      .returning({ id: empresas.id });

    if (actualizadas.length === 0) {
      return { ok: false, mensaje: "Esa empresa ya no existe." };
    }
  } catch (error) {
    console.error("[Clientes] fallo inesperado al cambiar el alta", error);
    return { ok: false, mensaje: "No se pudo completar. Intenta de nuevo." };
  }

  revalidatePath(RUTA_LISTADO);

  return { ok: true };
}

/**
 * Consulta un RUC en SUNAT (vía Decolecta) y devuelve los datos como
 * SUGERENCIA para el formulario. No escribe en la base, no guarda nada y no
 * decide qué campos se sobreescriben: eso es de la UI.
 *
 * Exige sesión aunque no escriba: cada llamada consume cuota de un servicio de
 * pago, y sin esta comprobación cualquiera podría gastarla con POST directos.
 *
 * Nunca lanza (salvo el `redirect` de `exigirSesion`, que es navegación): todo
 * fallo vuelve como `{ ok: false, motivo, mensaje }`.
 */
export async function consultarRuc(
  ruc: string,
): Promise<ResultadoConsultaRuc> {
  await exigirSesion();

  // Formato ANTES de llamar: un RUC mal escrito no gasta una consulta.
  const rucValido = rucSchema.safeParse(ruc);

  if (!rucValido.success) {
    return {
      ok: false,
      motivo: "formato_invalido",
      mensaje: MENSAJE_RUC_FORMATO,
    };
  }

  try {
    return await consultarRucEnDecolecta(rucValido.data);
  } catch (error) {
    // `consultarRucEnDecolecta` ya convierte todos sus fallos en dato; esto es
    // la última red para que un error no previsto no llegue como excepción a
    // la pantalla.
    console.error("[Clientes] fallo inesperado al consultar el RUC", error);
    return {
      ok: false,
      motivo: "falla_api",
      mensaje:
        "No se pudo consultar SUNAT en este momento. Intenta de nuevo en unos minutos o llena los datos a mano.",
    };
  }
}
