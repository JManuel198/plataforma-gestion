import { z } from "zod";
import { aCentimos, aMontoDecimal } from "@/core/dinero";
import { MONEDAS } from "@/core/monedas";
import {
  PATRON_CANTIDAD,
  PATRON_DESCUENTO,
  PATRON_PRECIO_LISTA,
  UNIDADES,
} from "./constantes";

// Nada que venga del formulario toca la base sin pasar por aquí (regla 1 de
// AGENTS.md: la validación y el cálculo viven en el backend).
//
// ESTE ARCHIVO ES MÁS ESTRICTO QUE LA TABLA, Y ES DELIBERADO — mismo criterio
// que modules/materiales/schema.ts. En db/schema/lista-precios.ts, `proveedor`,
// `unidad`, `cantidad`, `precio_lista` y `moneda` admiten NULL, porque relajar
// una columna después es una migración y endurecerla también. El formulario sí
// puede exigir lo evidente desde ya: una fila de una lista de PRECIOS sin
// precio, sin cantidad o sin moneda no es un dato incompleto, es una fila que
// no significa nada. La dirección importa: el Zod puede ser más estricto que la
// columna, NUNCA al revés.
//
// DOS CAMPOS NO ESTÁN AQUÍ Y NO DEBEN ESTARLO:
//
// - `codigo_oferta`, porque lo genera el backend con el correlativo atómico
//   (ver codigo.ts y core/correlativo.ts). Es un campo automático: el usuario
//   no lo escribe ni puede proponerlo. Si viajara en el FormData, alguien
//   podría fijarlo con un POST directo y saltarse el contador.
// - `precio`, porque NO EXISTE como dato. Se deriva de `precio_lista` y
//   `descuento` cada vez que se muestra (ver precio.ts). El modal enseña el
//   valor calculado de solo lectura y sin `name`, así que ni siquiera llega
//   aquí — y aunque llegara, no hay columna donde escribirlo.
//
// `activo` tampoco está: se da de alta activo por el `DEFAULT true` de la
// columna, y la baja será su propia acción confirmada desde el listado
// (Parte 2), nunca una casilla que se marque sin querer al corregir un precio.

/**
 * El identificador del material elegido en el buscador.
 *
 * Solo se comprueba que venga algo: que ese id exista de verdad lo garantiza la
 * FK `lista_precios_material_id_materiales_id_fk` de la base, no un SELECT
 * previo. Preguntar antes dejaría una ventana entre la comprobación y el INSERT
 * — mismo razonamiento que la unicidad de `codigo_interno` en Materiales.
 */
export const materialIdSchema = z
  .string()
  .trim()
  .min(1, "Elige un material.");

const textoObligatorio = (etiqueta: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${etiqueta} es obligatorio.`)
    .max(max, `${etiqueta} no puede pasar de ${max} caracteres.`);

/**
 * Techo del precio de lista, en céntimos: `999 999 999 999.99`.
 *
 * Es el mismo número y el mismo criterio que `PRECIO_MAXIMO_CENTIMOS` de
 * Órdenes de Trabajo, pero escrito aquí y no importado de allí porque un módulo
 * de negocio no importa de otro (AGENTS.md, Arquitectura). Lo que SÍ se comparte
 * es la conversión (`aCentimos`/`aMontoDecimal` en core/dinero.ts), que es donde
 * estaba el riesgo real de divergencia — la aritmética, no la constante.
 *
 * El número tiene que seguir cuadrando con la regex de abajo: 12 dígitos
 * enteros + 2 decimales producen exactamente este máximo. No son dos límites
 * independientes, son el mismo escrito de dos formas; si se toca uno sin el
 * otro, el monto se rechaza por formato en vez de por este mensaje y el error
 * deja de decir la verdad.
 */
export const PRECIO_MAXIMO_CENTIMOS = 99_999_999_999_999;

/**
 * El precio de lista. El formulario acepta un monto normal ("150.50") y aquí se
 * convierte al entero en céntimos que exige la regla 2 de AGENTS.md.
 *
 * Como máximo dos decimales: un tercero sería una fracción de céntimo que la
 * base no puede guardar, y redondearlo en silencio es peor que rechazarlo.
 */
export const precioListaSchema = z
  .string()
  .trim()
  .min(1, "El precio de lista es obligatorio.")
  .regex(
    PATRON_PRECIO_LISTA,
    `Escribe un monto positivo con hasta dos decimales (ej. 150.50), como máximo ${aMontoDecimal(PRECIO_MAXIMO_CENTIMOS)}.`,
  )
  .transform(aCentimos)
  .refine((centimos) => centimos > 0, "El precio de lista debe ser mayor que cero.")
  .refine(
    (centimos) => centimos <= PRECIO_MAXIMO_CENTIMOS,
    `El precio de lista no puede pasar de ${aMontoDecimal(PRECIO_MAXIMO_CENTIMOS)}.`,
  );

/**
 * La cantidad de la oferta. Hasta tres decimales, que es la escala de la
 * columna `numeric(14,3)`.
 *
 * NO pasa por `aCentimos` ni se convierte a entero: no es dinero. La regla 2 es
 * sobre importes, y aplicarla aquí obligaría a inventar una unidad mínima para
 * algo que se mide en metros o kilos. Viaja como TEXTO de punta a punta —
 * Drizzle tipa esta columna con `mode: "string"` justamente para eso: un
 * `numeric` de PostgreSQL convertido a `number` de JS perdería precisión, que
 * es el mismo problema que la regla 2 evita con los montos, resuelto de la otra
 * forma posible.
 *
 * La coma se normaliza a punto porque un teclado en español la produce sola;
 * PostgreSQL solo entiende el punto.
 */
export const cantidadSchema = z
  .string()
  .trim()
  .min(1, "La cantidad es obligatoria.")
  .regex(
    PATRON_CANTIDAD,
    "Escribe una cantidad positiva con hasta tres decimales (ej. 2.5).",
  )
  .transform((valor) => valor.replace(",", "."))
  .refine((valor) => Number(valor) > 0, "La cantidad debe ser mayor que cero.");

/**
 * El descuento, en porcentaje. `0` significa "sin descuento" y es el valor por
 * defecto — nunca vacío: la columna es `NOT NULL` precisamente para que el
 * precio derivado esté siempre definido (ver precio.ts).
 *
 * El rango 0–100 se valida aquí Y con un CHECK en la columna. No es
 * redundancia por desconfianza: el CHECK es la garantía (una Server Action es
 * un endpoint y admite un POST directo), y esta validación es lo que convierte
 * ese choque en un mensaje debajo del campo en vez de un error crudo.
 *
 * Un descuento del 100 % da precio 0, y se admite: es una donación o una
 * muestra, no un error de tecleo que debamos adivinar.
 */
export const descuentoSchema = z
  .string()
  .trim()
  .regex(
    PATRON_DESCUENTO,
    "Escribe un porcentaje entre 0 y 100, con hasta dos decimales.",
  )
  .transform((valor) => valor.replace(",", "."))
  .refine(
    (valor) => Number(valor) >= 0 && Number(valor) <= 100,
    "El descuento tiene que estar entre 0 y 100.",
  );

export const unidadSchema = z.enum(UNIDADES, {
  error: "Elige una de las unidades de la lista.",
});

export const monedaSchema = z.enum(MONEDAS, {
  error: "La moneda debe ser PEN o USD.",
});

/** Campos que el usuario llena a mano al registrar una oferta. */
export const precioCrearSchema = z.object({
  material_id: materialIdSchema,
  proveedor: textoObligatorio("El proveedor"),
  unidad: unidadSchema,
  cantidad: cantidadSchema,
  precio_lista: precioListaSchema,
  // Sin `.default()`: el formulario siempre envía el campo (arranca en "0"), y
  // un default aquí escondería el caso de que dejara de enviarlo.
  descuento: descuentoSchema,
  moneda: monedaSchema,
});

export const precioEditarSchema = precioCrearSchema.extend({
  id: z.string().trim().min(1, "Falta el identificador de la oferta."),
});

export type PrecioCrearInput = z.infer<typeof precioCrearSchema>;
export type PrecioEditarInput = z.infer<typeof precioEditarSchema>;
