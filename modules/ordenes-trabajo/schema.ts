import { z } from "zod";
import { AVISOS, ESTADOS_OT, MONEDAS } from "./constantes";
import { aCentimos, aMontoDecimal } from "./dinero";

// Nada que venga de un formulario toca la base de datos sin pasar por aquí
// (regla 1 de AGENTS.md: la validación y el cálculo viven en el backend).

const textoObligatorio = (etiqueta: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${etiqueta} es obligatorio.`)
    .max(max, `${etiqueta} no puede pasar de ${max} caracteres.`);

// Un campo de texto vacío llega como "" desde FormData, no como undefined:
// se normaliza a null para que la columna quede nula y no con cadena vacía.
const textoOpcional = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `No puede pasar de ${max} caracteres.`)
    .transform((valor) => (valor === "" ? null : valor));

/**
 * Techo de negocio para `precio`, expresado en céntimos. La columna es
 * `bigint` con `mode: "number"` (ver db/schema/orden-trabajo.ts), así que el
 * techo técnico real es `Number.MAX_SAFE_INTEGER` (2^53 - 1) — por encima de
 * eso `aCentimos` puede perder precisión en la conversión. Este valor NO es
 * ese techo técnico: es el máximo que `montoSchema` deja escribir en el
 * formulario, `999 999 999 999.99`, que es exactamente lo mayor que puede
 * producir la regex de abajo (12 dígitos enteros + 2 decimales). Se fija así
 * a propósito — no en `Number.MAX_SAFE_INTEGER` directamente — para que el
 * techo que se valida aquí y el que de verdad se puede escribir en el
 * formulario sean el mismo número; si uno se toca sin el otro, un monto
 * queda rechazado por el formato (regex) en vez de por este mensaje, o
 * viceversa, y el error deja de decir la verdad.
 *
 * Se valida aquí para que un monto mayor devuelva un mensaje al usuario en
 * vez de un error crudo de la base de datos.
 *
 * Viene de Servicio sin cambios en la fusión: es el mismo techo que ya estaba
 * acordado (supuesto 3 de docs/spec/preguntas-abiertas.md, resuelto
 * 2026-09-18 — sí hace falta cotizar por encima del viejo techo de `integer`,
 * S/ 21 474 836.47, y por eso `precio` es `bigint`).
 */
export const PRECIO_MAXIMO_CENTIMOS = 99_999_999_999_999;

/**
 * El formulario acepta un monto normal ("150.50"); aquí se convierte al entero
 * en céntimos que exige la regla 2 de AGENTS.md. Como máximo dos decimales:
 * un tercer decimal sería un céntimo que la base de datos no puede guardar, y
 * redondearlo en silencio es peor que rechazarlo.
 */
export const montoSchema = z
  .string()
  .trim()
  .min(1, "El precio es obligatorio.")
  // 12 dígitos enteros + 2 decimales: el máximo que produce este formato en
  // céntimos es exactamente PRECIO_MAXIMO_CENTIMOS (ver el comentario de esa
  // constante). No son dos límites independientes — son el mismo, escrito en
  // dos sitios porque uno es un patrón de texto y el otro un número.
  .regex(
    /^\d{1,12}([.,]\d{1,2})?$/,
    // El máximo sale de la constante, no escrito a mano: si el techo cambia,
    // el mensaje cambia con él en vez de quedarse mintiendo.
    `Escribe un monto positivo con hasta dos decimales (ej. 150.50), como máximo ${aMontoDecimal(PRECIO_MAXIMO_CENTIMOS)}.`,
  )
  .transform(aCentimos)
  .refine((centimos) => centimos > 0, "El precio debe ser mayor que cero.")
  .refine(
    (centimos) => centimos <= PRECIO_MAXIMO_CENTIMOS,
    `El precio no puede pasar de ${aMontoDecimal(PRECIO_MAXIMO_CENTIMOS)}.`,
  );

export const monedaSchema = z.enum(MONEDAS, {
  error: "La moneda debe ser PEN o USD.",
});

export const estadoOtSchema = z.enum(ESTADOS_OT, {
  error: "Selecciona uno de los estados válidos.",
});

// Aquí hubo dos chequeos en tiempo de compilación, `_monedaCoincide` y
// `_estadoCoincide`, que ataban estos enums de Zod a los de PostgreSQL. Los
// dos se eliminaron, y por el mismo motivo: ya no hay nada que atar.
//
// Existían porque `MONEDAS` y `ESTADOS_OT` estaban escritos como array literal
// en dos archivos a la vez (aquí vía constantes.ts, y otra vez en
// db/schema/orden-trabajo.ts), así que podían desincronizarse. Y ni siquiera
// cubrían el caso peligroso: detectaban un valor inventado de más en
// constantes.ts, pero no uno que faltara respecto al enum de la base.
//
// Desde que db/schema/orden-trabajo.ts importa las DOS listas de
// constantes.ts en vez de declararlas, hay una sola fuente de cada una: si el
// array cambia, el `pgEnum` cambia con él automáticamente y no existe forma de
// que diverjan. Un chequeo de tipos sería redundante con el propio import.
//
// Si algún día alguien vuelve a escribir un array literal de monedas o de
// estados en db/schema/, ese chequeo hace falta de nuevo — pero lo correcto
// entonces es borrar el literal, no reponer el chequeo.

/**
 * Campos que el usuario llena a mano.
 *
 * No aparecen a propósito, y no deben aparecer nunca:
 * - `codigo_ot` — lo genera el servidor (OT.CCM.AAAA.NNNN).
 * - `fecha_creacion` — la pone la base de datos al insertar.
 *
 * Tras la fusión con Servicio ya no hay `servicio_id`: la OT es autónoma y no
 * nace de ninguna otra fila, así que no hay nada que atar a la acción con
 * `.bind()` ni que verificar antes de insertar.
 */
export const otCrearSchema = z.object({
  codigo_cotizacion: textoObligatorio("El código de cotización", 50),
  // Nullable en la base, y por tanto opcional aquí: a diferencia de Servicio,
  // donde era obligatorio, la revisión puede llegar después del registro —
  // mismo criterio que `codigo_oc` (ver db/schema/orden-trabajo.ts).
  codigo_revision: textoOpcional(50),
  servicio: textoObligatorio("El servicio", 300),
  codigo_oc: textoOpcional(100),
  cliente: textoObligatorio("El cliente", 200),
  precio: montoSchema,
  moneda: monedaSchema,
  estado: estadoOtSchema,
  responsable: textoOpcional(200),
  comentarios: textoOpcional(2000),
});

/**
 * Al editar tampoco viaja `codigo_ot`: el número de una OT no cambia una vez
 * emitida.
 */
export const otEditarSchema = otCrearSchema.extend({
  id: z.string().trim().min(1, "Falta el identificador de la orden de trabajo."),
});

/**
 * Cambio de estado desde el listado. Es un esquema aparte del de edición y
 * más pequeño a propósito: la acción que lo usa escribe una sola columna, así
 * que nada más puede viajar con él aunque alguien invoque la acción por POST
 * directo. `estado` sale del mismo `estadoOtSchema` que el formulario, y no
 * hay ninguna otra lista de estados en el proyecto que mantener sincronizada:
 * `ESTADOS_OT` vive solo en constantes.ts (que sigue sin importar nada, para
 * poder viajar al cliente sin arrastrar Drizzle) y db/schema/orden-trabajo.ts
 * importa ese mismo array para construir el `pgEnum`.
 */
export const otCambioEstadoSchema = z.object({
  id: z.string().trim().min(1, "Falta el identificador de la orden de trabajo."),
  estado: estadoOtSchema,
});

// --- Filtros del listado -------------------------------------------------
//
// Los tres se leen de `searchParams`, o sea que son input del usuario como
// cualquier otro. Todos siguen el mismo patrón `.optional().catch(undefined)`:
// un parámetro inventado, repetido (llega como arreglo) o vacío no revienta la
// pantalla, simplemente se ignora y ese filtro no se aplica.

export const filtroEstadoSchema = estadoOtSchema.optional().catch(undefined);

/**
 * Texto de búsqueda. El tope de 200 no es una regla de negocio: evita mandar a
 * la base de datos un `ILIKE '%...%'` con una cadena enorme desde la URL.
 */
export const filtroBusquedaSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .catch(undefined);

/**
 * `desde` / `hasta` del filtro por fecha, en el `YYYY-MM-DD` que produce un
 * `<input type="date">`. `z.iso.date()` comprueba que sea una fecha real, no
 * solo que tenga la forma: `inicioDelDia()` (lib/fecha.ts) da por hecho que lo
 * que recibe ya pasó por aquí.
 */
export const filtroFechaSchema = z.iso.date().optional().catch(undefined);

// `?aviso=` es input del cliente como cualquier otro: si viene inventado o
// repetido se ignora, no se muestra un toast con lo que diga la URL.
export const avisoSchema = z.enum(AVISOS).optional().catch(undefined);

export type OtCrearInput = z.infer<typeof otCrearSchema>;
export type OtEditarInput = z.infer<typeof otEditarSchema>;
