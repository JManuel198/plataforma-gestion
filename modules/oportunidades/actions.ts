"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { exigirSesion } from "@/core/sesion";
import { db } from "@/db";
import { contactos } from "@/db/schema/contactos";
import { empresas } from "@/db/schema/empresas";
import {
  oportunidadActividades,
  oportunidadHistorial,
  oportunidades,
  type OportunidadHistorialNueva,
} from "@/db/schema/oportunidades";
import type { EstadoFormulario } from "@/core/estado-formulario";
import type { ResultadoAccion } from "@/core/resultado-accion";
import { esUniqueViolado } from "@/core/errores-postgres";
import {
  anioVigente,
  reservarCorrelativoAnual,
  type Transaccion,
} from "@/core/correlativo";
import {
  buscarEmpresasParaSelector,
  busquedaSelectorEmpresaSchema,
  type EmpresaSeleccionable,
} from "@/core/selector-empresas";
import { formatearCodigoOportunidad } from "./codigo";
import {
  CLAVE_CORRELATIVO_OPORTUNIDAD,
  CORRELATIVO_INICIAL,
  RUTA_LISTADO,
} from "./constantes";
import {
  listarContactosParaSelector,
  type ContactoSeleccionable,
} from "./queries";
import {
  actividadSchema,
  anularSchema,
  cambioEtapaSchema,
  empresaDelSelectorSchema,
  marcarPerdidaSchema,
  oportunidadCrearSchema,
  oportunidadEditarSchema,
  oportunidadIdSchema,
} from "./schema";

// Reglas de negocio: docs/spec/oportunidades.md (secciones 2 a 4). Forma de
// cada entrada del historial: docs/spec/entidades.md, `oportunidad_historial`
// — y la garantizan los CHECK de esa tabla, así que una entrada mal armada
// aquí no se guarda: revienta.
//
// DOS PATRONES QUE COMPARTEN TODAS LAS ACCIONES QUE ESCRIBEN, y conviene no
// romper al tocar una:
//
// 1. LA OPORTUNIDAD SE LEE CON `FOR UPDATE` dentro de la misma transacción que
//    la escribe (`bloquearOportunidad`). Cada acción decide mirando el estado
//    actual —¿ya está perdida?, ¿el contacto cambió de verdad?, ¿de qué etapa
//    viene?— y lo copia al historial. Sin el bloqueo, dos pestañas podrían
//    leer lo mismo a la vez y dejar un historial que miente: dos "Movió de
//    Prospecto a …" seguidos, o una oportunidad marcada perdida dos veces. Con
//    él, la segunda espera a que la primera confirme y lee ya el estado nuevo.
//    Es el mismo razonamiento que el upsert de core/correlativo.ts: leer y
//    luego escribir, sin bloqueo, no es atómico.
//
// 2. TODA VALIDACIÓN VA ANTES DE LA PRIMERA ESCRITURA. Un rechazo se devuelve
//    como VALOR desde el callback de la transacción, y devolver un valor
//    CONFIRMA la transacción (solo un `throw` la revierte). Mientras no se haya
//    escrito nada, confirmar no deja rastro; si se validara después de
//    reservar el correlativo, el número quedaría gastado y habría un hueco.

/**
 * `codigo` lo emite `reservarCorrelativoAnual`: un choque aquí es que el
 * contador del año y la tabla se descuadraron. RED DE SEGURIDAD DEL GENERADOR,
 * mismo papel que `codigo_ot` en las OT.
 */
const CONSTRAINT_CODIGO = "oportunidades_codigo_unique";

/**
 * NO OFRECE REINTENTAR, igual que en las OT: la transacción revierte también
 * la reserva, así que un segundo intento pide el mismo número y vuelve a
 * chocar. Lo que hay que arreglar es el contador (fila `oportunidades:<año>`
 * de `correlativo`): resincronizarlo al mayor correlativo emitido ese año.
 */
const ERROR_CODIGO_GENERADO = {
  mensaje:
    "No se pudo generar el código de la oportunidad. Si el problema persiste, contacta soporte.",
} satisfies EstadoFormulario;

/**
 * Lo único que ve el usuario cuando algo falla de una forma que no sabemos
 * traducir. El error real, entero, va al log del servidor con `console.error`.
 */
const MENSAJE_FALLO_GUARDADO = "No se pudo guardar. Intenta de nuevo.";
const MENSAJE_FALLO_ACCION = "No se pudo completar. Intenta de nuevo.";
const MENSAJE_PETICION_INVALIDA = "Esa petición no es válida.";
const MENSAJE_INEXISTENTE = "Esa oportunidad ya no existe.";

/**
 * Una oportunidad perdida o anulada es de solo lectura hasta reabrirla
 * (sección 7 de la spec: "Único botón disponible: Reabrir"). La interfaz
 * oculta los lápices, la línea de etapas y "+ Actividad"; esto es lo que lo
 * garantiza cuando la pestaña está desactualizada o la petición llega sin
 * pasar por la pantalla.
 */
const MENSAJE_CERRADA =
  "Esta oportunidad está cerrada (perdida o anulada). Reábrela para hacer cambios.";

function erroresDeValidacion(error: z.ZodError): EstadoFormulario {
  return {
    mensaje: "Revisa los campos marcados.",
    errores: z.flattenError(error).fieldErrors,
  };
}

/** Un error colgado de un solo campo del formulario. */
function errorEnCampo(campo: string, mensaje: string): EstadoFormulario {
  return { mensaje: "Revisa los campos marcados.", errores: { [campo]: [mensaje] } };
}

function revalidarOportunidad(id?: string) {
  revalidatePath(RUTA_LISTADO);
  if (id) revalidatePath(`${RUTA_LISTADO}/${id}`);
}

/**
 * Lee la oportunidad y BLOQUEA su fila hasta el final de la transacción (ver
 * el patrón 1 de la cabecera). Solo las columnas que las acciones necesitan
 * para decidir. `null` si no existe.
 */
async function bloquearOportunidad(tx: Transaccion, id: string) {
  const [fila] = await tx
    .select({
      empresa_id: oportunidades.empresa_id,
      titulo: oportunidades.titulo,
      contacto_id: oportunidades.contacto_id,
      fecha_cierre_estimada: oportunidades.fecha_cierre_estimada,
      etapa: oportunidades.etapa,
      situacion: oportunidades.situacion,
    })
    .from(oportunidades)
    .where(eq(oportunidades.id, id))
    .for("update");

  return fila ?? null;
}

/**
 * Comprueba contra la base que la empresa exista y esté ACTIVA (sección 3:
 * "Solo empresas activas"). Devuelve el mensaje de error, o `null` si vale.
 *
 * `FOR SHARE` impide que otra transacción la dé de baja entre esta
 * comprobación y el INSERT: esa baja espera a que esta confirme. La FK de la
 * base no ayuda aquí, porque no mira `activo` (a propósito, ver
 * db/schema/oportunidades.ts).
 */
async function validarEmpresa(
  tx: Transaccion,
  empresaId: string,
): Promise<string | null> {
  const [empresa] = await tx
    .select({ activo: empresas.activo })
    .from(empresas)
    .where(eq(empresas.id, empresaId))
    .for("share");

  if (!empresa) return "La empresa elegida no existe. Elige otra de la lista.";
  if (!empresa.activo) {
    return "Esa empresa está dada de baja. Elige una empresa activa.";
  }

  return null;
}

/**
 * Comprueba contra la base que el contacto exista, esté ACTIVO y sea DE ESA
 * EMPRESA (sección 3: "Solo contactos activos de la empresa elegida").
 * Devuelve el mensaje de error, o `null` si vale.
 *
 * La base NO lo garantiza: la FK `contacto_id` solo comprueba que el contacto
 * exista, no de qué empresa es (una FK compuesta exigía tocar `contactos`, ver
 * db/schema/oportunidades.ts). Esto es, por tanto, la única defensa, y por eso
 * se comprueba aunque el selector ya solo ofrezca los de la empresa: un
 * formulario desactualizado o manipulado puede mandar cualquier id.
 *
 * `FOR SHARE` bloquea el contacto hasta que la transacción confirme: si otra
 * pestaña lo cambia de empresa o lo da de baja a la vez, espera, y la regla
 * que se comprobó sigue siendo cierta cuando se escribe.
 */
async function validarContacto(
  tx: Transaccion,
  contactoId: string,
  empresaId: string,
): Promise<string | null> {
  const [contacto] = await tx
    .select({ empresa_id: contactos.empresa_id, activo: contactos.activo })
    .from(contactos)
    .where(eq(contactos.id, contactoId))
    .for("share");

  if (!contacto) return "El contacto elegido no existe. Elige otro de la lista.";
  if (contacto.empresa_id !== empresaId) {
    return "Ese contacto no pertenece a la empresa de la oportunidad. Elige uno de esa empresa.";
  }
  if (!contacto.activo) {
    return "Ese contacto está dado de baja. Elige un contacto activo.";
  }

  return null;
}

/**
 * Alta de una oportunidad (modal "Nueva oportunidad", sección 8).
 *
 * Lo que NO viene del formulario: `codigo` (correlativo anual, aquí),
 * `asesor_id` (el usuario en sesión, siempre), `situacion` (`'abierta'` por
 * default) y las tres marcas de tiempo.
 *
 * `etapa_cambiada_en` NACE IGUAL A `created_at` sin copiarlo: el INSERT no
 * manda ninguna de las dos, y las dos son `DEFAULT now()`, que en PostgreSQL
 * es la hora de INICIO de la transacción — el mismo valor exacto. Por eso no
 * se pasa `new Date()` a ninguna: el reloj de Node y el de la base no son el
 * mismo, y dos lecturas no darían el mismo instante. La entrada `creacion` del
 * historial va en la misma transacción, así que también lleva esa hora.
 */
export async function crearOportunidad(
  formData: FormData,
): Promise<EstadoFormulario> {
  // Fuera del `try`: `redirect()` funciona lanzando, y dentro el catch se
  // comería la navegación al login.
  const sesion = await exigirSesion();

  const resultado = oportunidadCrearSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!resultado.success) {
    return erroresDeValidacion(resultado.error);
  }

  const datos = resultado.data;

  // Un solo año para el contador y para el código visible (ver
  // `anioVigente`): calcularlo dos veces puede numerar en un año y escribir
  // otro en el borde de fin de año.
  const anio = anioVigente();

  let rechazo: EstadoFormulario | null;

  try {
    rechazo = await db.transaction(async (tx) => {
      // Validaciones PRIMERO, antes de reservar el número (patrón 2 de la
      // cabecera): un rechazo confirma la transacción.
      const errorEmpresa = await validarEmpresa(tx, datos.empresa_id);
      if (errorEmpresa) return errorEnCampo("empresa_id", errorEmpresa);

      if (datos.contacto_id) {
        const errorContacto = await validarContacto(
          tx,
          datos.contacto_id,
          datos.empresa_id,
        );
        if (errorContacto) return errorEnCampo("contacto_id", errorContacto);
      }

      // Reserva e INSERT en la MISMA transacción: si el INSERT falla, el
      // número se revierte con él y no quedan huecos (core/correlativo.ts).
      const numero = await reservarCorrelativoAnual(
        tx,
        CLAVE_CORRELATIVO_OPORTUNIDAD,
        anio,
        CORRELATIVO_INICIAL,
      );

      const [creada] = await tx
        .insert(oportunidades)
        .values({
          ...datos,
          codigo: formatearCodigoOportunidad(anio, numero),
          asesor_id: sesion.user.id,
        })
        .returning({ id: oportunidades.id });

      await tx.insert(oportunidadHistorial).values({
        oportunidad_id: creada.id,
        tipo: "creacion",
        etapa_nueva: datos.etapa,
        usuario_id: sesion.user.id,
      });

      return null;
    });
  } catch (error) {
    if (esUniqueViolado(error, CONSTRAINT_CODIGO)) {
      console.error(
        "[Oportunidades] el código generado chocó con el UNIQUE: el contador y la tabla están descuadrados",
        error,
      );
      return ERROR_CODIGO_GENERADO;
    }

    console.error("[Oportunidades] fallo inesperado al crear", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  if (rechazo) return rechazo;

  revalidarOportunidad();

  return { ok: true };
}

/**
 * Edición desde el detalle: título, contacto y fecha estimada de cierre, y
 * nada más (ver `oportunidadEditarSchema`: empresa, moneda, valor y
 * probabilidad ni siquiera se aceptan).
 *
 * Solo se toca lo que llega: una clave ausente es "no se edita", una vacía es
 * "quitar". Cada campo que CAMBIA DE VALOR de verdad genera su propia entrada
 * `edicion` en el historial, con el valor anterior y el nuevo; uno que llega
 * con el mismo valor no escribe nada, y si no cambió nada no se escribe ni el
 * UPDATE ni ninguna entrada (sección 4 de la spec; los CHECK del historial
 * rechazarían además una entrada con anterior = nuevo).
 *
 * El `id` va como primer argumento y no dentro del FormData: la UI lo fija con
 * `actualizarOportunidad.bind(null, id)`. Se valida igual, porque una Server
 * Action es un endpoint.
 */
export async function actualizarOportunidad(
  id: string,
  formData: FormData,
): Promise<EstadoFormulario> {
  const sesion = await exigirSesion();

  const idValido = oportunidadIdSchema.safeParse(id);

  if (!idValido.success) {
    return { mensaje: MENSAJE_PETICION_INVALIDA };
  }

  const resultado = oportunidadEditarSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!resultado.success) {
    return erroresDeValidacion(resultado.error);
  }

  const datos = resultado.data;
  const usuarioId = sesion.user.id;

  let rechazo: EstadoFormulario | null;

  try {
    rechazo = await db.transaction(async (tx) => {
      const actual = await bloquearOportunidad(tx, idValido.data);

      if (!actual) return { mensaje: MENSAJE_INEXISTENTE };
      if (actual.situacion !== "abierta") return { mensaje: MENSAJE_CERRADA };

      const cambios: {
        titulo?: string;
        contacto_id?: string | null;
        fecha_cierre_estimada?: string | null;
      } = {};
      const entradas: OportunidadHistorialNueva[] = [];
      const base = {
        oportunidad_id: idValido.data,
        tipo: "edicion" as const,
        usuario_id: usuarioId,
      };

      if (datos.titulo !== undefined && datos.titulo !== actual.titulo) {
        cambios.titulo = datos.titulo;
        entradas.push({
          ...base,
          campo: "titulo",
          titulo_anterior: actual.titulo,
          titulo_nuevo: datos.titulo,
        });
      }

      if (
        datos.contacto_id !== undefined &&
        datos.contacto_id !== actual.contacto_id
      ) {
        // Solo se valida el contacto NUEVO, y solo si hay uno (quitarlo es
        // válido). Contra la empresa de la oportunidad, que no cambia nunca.
        // El contacto que ya tenía no se revalida: si se dio de baja después,
        // eso no debe impedir editar el título o la fecha.
        if (datos.contacto_id !== null) {
          const errorContacto = await validarContacto(
            tx,
            datos.contacto_id,
            actual.empresa_id,
          );
          if (errorContacto) return errorEnCampo("contacto_id", errorContacto);
        }

        cambios.contacto_id = datos.contacto_id;
        entradas.push({
          ...base,
          campo: "contacto",
          contacto_anterior_id: actual.contacto_id,
          contacto_nuevo_id: datos.contacto_id,
        });
      }

      if (
        datos.fecha_cierre_estimada !== undefined &&
        datos.fecha_cierre_estimada !== actual.fecha_cierre_estimada
      ) {
        cambios.fecha_cierre_estimada = datos.fecha_cierre_estimada;
        entradas.push({
          ...base,
          campo: "fecha_cierre_estimada",
          fecha_cierre_anterior: actual.fecha_cierre_estimada,
          fecha_cierre_nueva: datos.fecha_cierre_estimada,
        });
      }

      // Nada cambió de verdad: ni UPDATE (que movería `updated_at` sin
      // motivo) ni entradas vacías en el historial.
      if (entradas.length === 0) return null;

      await tx
        .update(oportunidades)
        .set(cambios)
        .where(eq(oportunidades.id, idValido.data));

      await tx.insert(oportunidadHistorial).values(entradas);

      return null;
    });
  } catch (error) {
    console.error("[Oportunidades] fallo inesperado al editar", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  if (rechazo) return rechazo;

  revalidarOportunidad(idValido.data);

  return { ok: true };
}

/**
 * Cambia la etapa de una oportunidad. ES LA ÚNICA PUERTA para hacerlo: la usan
 * el arrastre del kanban y la línea de etapas del detalle (secciones 6 y 7), y
 * ninguna otra acción escribe `etapa` después de crear.
 *
 * Permite cualquier movimiento —adelante, atrás o saltándose etapas— y NO
 * TIENE EFECTOS SECUNDARIOS: escribe la etapa, `etapa_cambiada_en` y la
 * entrada del historial, y nada más. No toca `situacion`: cerrar y reabrir son
 * `marcarPerdida`, `anular` y `reabrir`.
 *
 * Mover a la etapa en la que ya está no escribe nada y responde bien: es lo que
 * llega de un doble clic o de una pestaña desactualizada, y el resultado que
 * pidió el usuario ya es el real (la spec: "soltarla en su misma columna no
 * hace nada"). Los CHECK del historial rechazarían además un cambio de una
 * etapa a la misma.
 */
export async function cambiarEtapa(
  id: string,
  etapaNueva: string,
): Promise<ResultadoAccion> {
  const sesion = await exigirSesion();

  const resultado = cambioEtapaSchema.safeParse({ id, etapa: etapaNueva });

  if (!resultado.success) {
    return { ok: false, mensaje: MENSAJE_PETICION_INVALIDA };
  }

  const { data } = resultado;

  let rechazo: string | null;

  try {
    rechazo = await db.transaction(async (tx) => {
      const actual = await bloquearOportunidad(tx, data.id);

      if (!actual) return MENSAJE_INEXISTENTE;
      // El kanban solo muestra abiertas y la línea de etapas se desactiva al
      // cerrar (secciones 5 y 7). Una cerrada conserva su etapa para volver a
      // ella al reabrir: moverla ahora cambiaría a dónde vuelve sin dejarlo a
      // la vista.
      if (actual.situacion !== "abierta") return MENSAJE_CERRADA;
      if (actual.etapa === data.etapa) return null;

      // PUNTO DE ENGANCHE DE LOS FLUJOS AUTOMÁTICOS POR ETAPA (preguntas
      // abiertas 27 y 28; fuera de alcance hasta que exista el módulo de
      // Cotizaciones). Aquí, con la fila ya bloqueada y ANTES de escribir, es
      // donde se comprobará lo que exija la etapa destino — el primero
      // definido: mover a `cotizacion` sin ninguna cotización vinculada no se
      // permite, y la interfaz muestra la alerta con "Vincular existente" /
      // "Crear". Un flujo que rechace el cambio devuelve su mensaje desde aquí,
      // sin haber escrito nada (patrón 2 de la cabecera). Hoy no hay ninguno:
      // no añadir efectos aquí sin que la spec los defina.

      await tx
        .update(oportunidades)
        .set({
          etapa: data.etapa,
          // `now()` de la base, no `new Date()` de Node: la hora de la
          // transacción, la misma que llevará `created_at` de la entrada del
          // historial de abajo. El reloj de días cuenta desde aquí.
          etapa_cambiada_en: sql`now()`,
        })
        .where(eq(oportunidades.id, data.id));

      await tx.insert(oportunidadHistorial).values({
        oportunidad_id: data.id,
        tipo: "cambio_etapa",
        etapa_anterior: actual.etapa,
        etapa_nueva: data.etapa,
        usuario_id: sesion.user.id,
      });

      return null;
    });
  } catch (error) {
    console.error("[Oportunidades] fallo inesperado al cambiar de etapa", error);
    return { ok: false, mensaje: MENSAJE_FALLO_ACCION };
  }

  if (rechazo) return { ok: false, mensaje: rechazo };

  revalidarOportunidad(data.id);

  return { ok: true };
}

/**
 * Marca una oportunidad como perdida: el negocio no se dio (sección 2).
 *
 * - Motivo OBLIGATORIO.
 * - Solo sobre una oportunidad abierta: una ya perdida se rechaza (no se
 *   registra dos veces), y una anulada también — cerrada, lo único posible es
 *   reabrirla (sección 7).
 * - NUNCA en Finalizado: convertiría un negocio ganado en perdido y alteraría
 *   la tasa de cierre. Sí se puede anular.
 * - Cambia `situacion` y guarda el motivo; NO toca `etapa` (la conserva para
 *   reabrir) ni `etapa_cambiada_en` (el reloj de días solo lo reinicia un
 *   cambio de etapa).
 */
export async function marcarPerdida(
  id: string,
  motivo: string,
): Promise<ResultadoAccion> {
  const sesion = await exigirSesion();

  const resultado = marcarPerdidaSchema.safeParse({ id, motivo });

  if (!resultado.success) {
    const errores = z.flattenError(resultado.error).fieldErrors;
    return {
      ok: false,
      mensaje: errores.motivo?.[0] ?? MENSAJE_PETICION_INVALIDA,
    };
  }

  const { data } = resultado;

  let rechazo: string | null;

  try {
    rechazo = await db.transaction(async (tx) => {
      const actual = await bloquearOportunidad(tx, data.id);

      if (!actual) return MENSAJE_INEXISTENTE;
      if (actual.situacion === "perdida") {
        return "Esta oportunidad ya está marcada como perdida.";
      }
      if (actual.situacion === "anulada") {
        return "Esta oportunidad está anulada. Reábrela antes de marcarla como perdida.";
      }
      if (actual.etapa === "finalizado") {
        return "Una oportunidad en Finalizado es un negocio ganado y no se puede marcar como perdida. Si se creó por error, anúlala.";
      }

      await tx
        .update(oportunidades)
        .set({ situacion: "perdida", motivo: data.motivo })
        .where(eq(oportunidades.id, data.id));

      await tx.insert(oportunidadHistorial).values({
        oportunidad_id: data.id,
        tipo: "perdida",
        motivo: data.motivo,
        usuario_id: sesion.user.id,
      });

      return null;
    });
  } catch (error) {
    console.error("[Oportunidades] fallo inesperado al marcar perdida", error);
    return { ok: false, mensaje: MENSAJE_FALLO_ACCION };
  }

  if (rechazo) return { ok: false, mensaje: rechazo };

  revalidarOportunidad(data.id);

  return { ok: true };
}

/**
 * Anula una oportunidad: se creó por error o está duplicada (sección 2). Es la
 * baja lógica de este módulo (no hay columna `activo`).
 *
 * - Motivo OPCIONAL: en blanco se guarda `null`, en la oportunidad y en el
 *   historial.
 * - En CUALQUIER etapa, Finalizado incluida.
 * - Solo sobre una oportunidad abierta: una ya anulada se rechaza, y una
 *   perdida también (cerrada, lo único posible es reabrirla).
 * - Cambia `situacion` y el motivo; NO toca `etapa` ni `etapa_cambiada_en`.
 */
export async function anular(
  id: string,
  motivo?: string,
): Promise<ResultadoAccion> {
  const sesion = await exigirSesion();

  const resultado = anularSchema.safeParse({ id, motivo });

  if (!resultado.success) {
    const errores = z.flattenError(resultado.error).fieldErrors;
    return {
      ok: false,
      mensaje: errores.motivo?.[0] ?? MENSAJE_PETICION_INVALIDA,
    };
  }

  const { data } = resultado;

  let rechazo: string | null;

  try {
    rechazo = await db.transaction(async (tx) => {
      const actual = await bloquearOportunidad(tx, data.id);

      if (!actual) return MENSAJE_INEXISTENTE;
      if (actual.situacion === "anulada") {
        return "Esta oportunidad ya está anulada.";
      }
      if (actual.situacion === "perdida") {
        return "Esta oportunidad está marcada como perdida. Reábrela antes de anularla.";
      }

      await tx
        .update(oportunidades)
        .set({ situacion: "anulada", motivo: data.motivo })
        .where(eq(oportunidades.id, data.id));

      await tx.insert(oportunidadHistorial).values({
        oportunidad_id: data.id,
        tipo: "anulacion",
        motivo: data.motivo,
        usuario_id: sesion.user.id,
      });

      return null;
    });
  } catch (error) {
    console.error("[Oportunidades] fallo inesperado al anular", error);
    return { ok: false, mensaje: MENSAJE_FALLO_ACCION };
  }

  if (rechazo) return { ok: false, mensaje: rechazo };

  revalidarOportunidad(data.id);

  return { ok: true };
}

/**
 * Reabre una oportunidad perdida o anulada (sección 2). Solo tiene sentido
 * sobre una cerrada: una abierta se rechaza.
 *
 * No hay etapa que restaurar: cerrar nunca la tocó, así que la oportunidad
 * "vuelve a donde estaba" sin hacer nada. La entrada `reapertura` del
 * historial guarda esa etapa en `etapa_nueva` (la etapa a la que vuelve).
 *
 * Vacía `motivo`, que es el del último cierre: una oportunidad abierta no
 * tiene cierre vigente, y dejarlo haría que la fila mostrara un motivo viejo
 * como si siguiera valiendo. No se pierde: queda en la entrada
 * `perdida`/`anulacion` del historial. `etapa_cambiada_en` no se toca (el
 * reloj de días solo lo reinicia un cambio de etapa).
 */
export async function reabrir(id: string): Promise<ResultadoAccion> {
  const sesion = await exigirSesion();

  const idValido = oportunidadIdSchema.safeParse(id);

  if (!idValido.success) {
    return { ok: false, mensaje: MENSAJE_PETICION_INVALIDA };
  }

  let rechazo: string | null;

  try {
    rechazo = await db.transaction(async (tx) => {
      const actual = await bloquearOportunidad(tx, idValido.data);

      if (!actual) return MENSAJE_INEXISTENTE;
      if (actual.situacion === "abierta") {
        return "Esta oportunidad ya está abierta.";
      }

      await tx
        .update(oportunidades)
        .set({ situacion: "abierta", motivo: null })
        .where(eq(oportunidades.id, idValido.data));

      await tx.insert(oportunidadHistorial).values({
        oportunidad_id: idValido.data,
        tipo: "reapertura",
        etapa_nueva: actual.etapa,
        usuario_id: sesion.user.id,
      });

      return null;
    });
  } catch (error) {
    console.error("[Oportunidades] fallo inesperado al reabrir", error);
    return { ok: false, mensaje: MENSAJE_FALLO_ACCION };
  }

  if (rechazo) return { ok: false, mensaje: rechazo };

  revalidarOportunidad(idValido.data);

  return { ok: true };
}

/**
 * Registra una actividad (Nota, Llamada, Reunión, Correo o Visita — sección
 * 4). Va a `oportunidad_actividades`, NO al historial: son tablas separadas
 * por diseño, y solo la línea de tiempo del detalle las junta al leer.
 *
 * - `autor_id`: el usuario en sesión, siempre.
 * - `fecha_hora`: la que escribió el usuario (la actividad pudo ocurrir
 *   antes), o, si la dejó en blanco, no se manda y la pone el `DEFAULT now()`.
 * - Solo sobre una oportunidad abierta: cerrada, lo único disponible es
 *   reabrirla (sección 7).
 *
 * La oportunidad se lee con `FOR SHARE`, no `FOR UPDATE`: no se escribe en
 * ella, solo hace falta que nadie la cierre entre la comprobación y el INSERT.
 */
export async function agregarActividad(
  oportunidadId: string,
  formData: FormData,
): Promise<EstadoFormulario> {
  const sesion = await exigirSesion();

  const idValido = oportunidadIdSchema.safeParse(oportunidadId);

  if (!idValido.success) {
    return { mensaje: MENSAJE_PETICION_INVALIDA };
  }

  const resultado = actividadSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return erroresDeValidacion(resultado.error);
  }

  const { fecha_hora, ...datos } = resultado.data;

  let rechazo: EstadoFormulario | null;

  try {
    rechazo = await db.transaction(async (tx) => {
      const [actual] = await tx
        .select({ situacion: oportunidades.situacion })
        .from(oportunidades)
        .where(eq(oportunidades.id, idValido.data))
        .for("share");

      if (!actual) return { mensaje: MENSAJE_INEXISTENTE };
      if (actual.situacion !== "abierta") return { mensaje: MENSAJE_CERRADA };

      await tx.insert(oportunidadActividades).values({
        ...datos,
        // `undefined` si vino en blanco: Drizzle manda entonces DEFAULT, y la
        // base pone `now()`.
        fecha_hora,
        oportunidad_id: idValido.data,
        autor_id: sesion.user.id,
      });

      return null;
    });
  } catch (error) {
    console.error("[Oportunidades] fallo inesperado al agregar actividad", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  if (rechazo) return rechazo;

  revalidarOportunidad(idValido.data);

  return { ok: true };
}

/**
 * Empresas para el selector del modal "Nueva oportunidad": SOLO las activas
 * (sección 3). La consulta vive en core/selector-empresas.ts, compartida con
 * Contactos, que pide también las inactivas.
 *
 * ES UNA LECTURA, y aun así es una Server Action: la invoca el combobox (un
 * Client Component) mientras el usuario teclea. Devuelve `[]` ante un texto
 * absurdo o un fallo en vez de lanzar: un combobox que revienta mientras se
 * teclea es peor que uno que no encuentra nada. Mismo reparto que
 * `listarEmpresasParaSelectorAction` de Contactos.
 */
export async function listarEmpresasParaSelectorAction(
  busqueda: string,
): Promise<EmpresaSeleccionable[]> {
  await exigirSesion();

  const resultado = busquedaSelectorEmpresaSchema.safeParse(busqueda);

  if (!resultado.success) return [];

  try {
    return await buscarEmpresasParaSelector(resultado.data, {
      incluirInactivas: false,
    });
  } catch (error) {
    console.error("[Oportunidades] fallo inesperado al buscar empresas", error);
    return [];
  }
}

/**
 * Contactos activos de una empresa, para el selector de contacto (se habilita
 * al elegir empresa, sección 8). Mismo criterio que el de empresas: `[]` ante
 * una petición inválida o un fallo.
 */
export async function listarContactosParaSelectorAction(
  empresaId: string,
): Promise<ContactoSeleccionable[]> {
  await exigirSesion();

  const resultado = empresaDelSelectorSchema.safeParse(empresaId);

  if (!resultado.success) return [];

  try {
    return await listarContactosParaSelector(resultado.data);
  } catch (error) {
    console.error("[Oportunidades] fallo inesperado al buscar contactos", error);
    return [];
  }
}
