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
 * Techo del tipo `integer` de PostgreSQL (2^31 - 1) expresado en céntimos:
 * 21 474 836.47 como monto. Se valida aquí para que un monto mayor devuelva
 * un mensaje al usuario en vez de un error crudo de la base de datos.
 *
 * Si algún día hace falta cotizar por encima de eso, la columna `precio`
 * tiene que pasar a `bigint` — y esta constante con ella.
 */
export const PRECIO_MAXIMO_CENTIMOS = 2_147_483_647;

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
  .regex(
    /^\d{1,12}([.,]\d{1,2})?$/,
    "Escribe un monto positivo con hasta dos decimales (ej. 150.50).",
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

// Chequeo en tiempo de compilación: si algún día se agrega un estado o una
// moneda al enum de PostgreSQL y no a modules/servicios/constantes.ts (o al
// revés), esto deja de compilar en vez de fallar en producción.
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
