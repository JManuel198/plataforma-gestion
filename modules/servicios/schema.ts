import { z } from "zod";
import type { Servicio } from "@/db/schema/servicio";
import { AVISOS, ESTADOS_SERVICIO, MONEDAS } from "./constantes";
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
 * `bigint` con `mode: "number"` (ver db/schema/servicio.ts), así que el
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
 * Decisión (supuesto 3 de docs/spec/preguntas-abiertas.md, resuelta
 * 2026-09-18): sí hace falta cotizar por encima del viejo techo de
 * `integer` (S/ 21 474 836.47), así que `precio` pasó a `bigint`.
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

export const estadoServicioSchema = z.enum(ESTADOS_SERVICIO, {
  error: "Selecciona uno de los estados válidos.",
});

// Chequeo en tiempo de compilación, con un alcance concreto — cubre una sola
// dirección, aunque a primera vista parezcan dos:
//
// - SÍ detecta un estado o una moneda de más aquí: si constantes.ts inventa un
//   valor que el enum de PostgreSQL no tiene, el build falla.
// - NO detecta lo contrario: si un enum de PostgreSQL gana un valor y
//   constantes.ts no, esto compila en silencio, y ese valor queda
//   inseleccionable en el formulario e inválido al validar.
//
// O sea: protege contra inventar valores en el código, no contra olvidarse de
// uno que ya existe en la base. Al agregar un valor a un enum, agrégalo aquí a
// mano — el compilador no te va a avisar.
const _monedaCoincide: z.ZodType<Servicio["moneda"]> = monedaSchema;
const _estadoCoincide: z.ZodType<Servicio["estado"]> = estadoServicioSchema;
void _monedaCoincide;
void _estadoCoincide;

/**
 * Campos que el usuario llena a mano. `fecha` no aparece a propósito: es
 * automática, la pone la base de datos al insertar la fila.
 */
export const servicioCrearSchema = z.object({
  codigo_cotizacion: textoObligatorio("El código de cotización", 50),
  codigo_revision: textoObligatorio("El código de revisión", 50),
  codigo_oc: textoOpcional(100),
  servicio: textoObligatorio("La descripción del servicio", 1000),
  cliente: textoObligatorio("El cliente", 200),
  precio: montoSchema,
  moneda: monedaSchema,
  estado: estadoServicioSchema,
  comentarios: textoOpcional(2000),
});

export const servicioEditarSchema = servicioCrearSchema.extend({
  id: z.string().trim().min(1, "Falta el identificador del servicio."),
});

export const filtroEstadoSchema = estadoServicioSchema.optional().catch(undefined);

// `?aviso=` es input del cliente como cualquier otro: si viene inventado o
// repetido se ignora, no se muestra un toast con lo que diga la URL.
export const avisoSchema = z.enum(AVISOS).optional().catch(undefined);

export type ServicioCrearInput = z.infer<typeof servicioCrearSchema>;
export type ServicioEditarInput = z.infer<typeof servicioEditarSchema>;
