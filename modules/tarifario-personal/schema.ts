import { z } from "zod";
import { aCentimos, aMontoDecimal } from "@/core/dinero";
import { MONEDAS } from "@/core/monedas";
import { PATRON_COSTO } from "./constantes";

// Nada que venga del formulario toca la base sin pasar por aquí (regla 1 de
// AGENTS.md: la validación y el cálculo viven en el backend).
//
// ESTE ARCHIVO ES MÁS ESTRICTO QUE LA TABLA, Y ES DELIBERADO — mismo criterio
// que los tres catálogos anteriores. En db/schema/tarifario-personal.ts las
// columnas de negocio admiten NULL, porque relajar una columna después es una
// migración y endurecerla también. El formulario sí puede exigir lo evidente
// desde ya: una tarifa sin cargo, sin periodo, sin costo o sin moneda no es un
// dato incompleto, es una fila que no significa nada. La dirección importa: el
// Zod puede ser más estricto que la columna, NUNCA al revés. Es la decisión 8
// de "Catálogos maestros" en docs/spec/preguntas-abiertas.md, no una excepción
// nueva de este módulo.
//
// UN CAMPO NO ESTÁ AQUÍ Y NO DEBE ESTARLO: `codigo`, porque lo genera el
// backend con el correlativo atómico (ver codigo.ts y core/correlativo.ts). Es
// un campo automático: el usuario no lo escribe ni puede proponerlo. Si viajara
// en el FormData, alguien podría fijarlo con un POST directo y saltarse el
// contador. Mismo criterio que `codigo_interno` en Materiales, `codigo_oferta`
// en Lista de precios, `codigo` en Servicios y `codigo_ot` en OT.
//
// `activo` TAMPOCO está, y aquí sí existe la columna (a diferencia de
// Servicios). No está porque la baja lógica es SU PROPIA ACCIÓN confirmada
// desde el listado, nunca una casilla dentro de este formulario — mismo
// reparto que en Materiales y Lista de precios. Esa acción llega en la Parte 2;
// la columna entró ya para no exigir una segunda migración solo por eso.

const textoObligatorio = (etiqueta: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${etiqueta} es obligatorio.`)
    .max(max, `${etiqueta} no puede pasar de ${max} caracteres.`);

/**
 * Techo del costo, en céntimos: `999 999 999 999.99`.
 *
 * Es el mismo número y el mismo criterio que `PRECIO_MAXIMO_CENTIMOS` de
 * Órdenes de Trabajo, Lista de precios y Servicios, pero escrito aquí y no
 * importado de allí porque un módulo de negocio no importa de otro (AGENTS.md,
 * Arquitectura). Lo que SÍ se comparte es la conversión (`aCentimos` /
 * `aMontoDecimal` en core/dinero.ts), que es donde estaba el riesgo real de
 * divergencia — la aritmética, no la constante. Es exactamente la distinción
 * que dejó escrita la deuda técnica de AGENTS.md al mover `dinero.ts` a core/
 * sin llevarse esta constante con él.
 *
 * El número tiene que seguir cuadrando con `PATRON_COSTO` (./constantes.ts):
 * 12 dígitos enteros + 2 decimales producen exactamente este máximo. No son dos
 * límites independientes, son el mismo escrito de dos formas; si se toca uno
 * sin el otro, el monto se rechaza por formato en vez de por este mensaje y el
 * error deja de decir la verdad.
 */
export const COSTO_MAXIMO_CENTIMOS = 99_999_999_999_999;

/**
 * El cargo que se tarifa ("Operario", "Supervisor SSOMA", "Soldador 3G"…).
 *
 * TEXTO LIBRE, y no hay catálogo de cargos contra el que validarlo — no existe
 * tal tabla. El campo se ayuda con sugerencias sacadas de los cargos YA
 * escritos en este mismo tarifario (`buscarCargos` en ./queries.ts), que es
 * exactamente el mismo planteamiento que `proveedor` en Lista de precios: el
 * "catálogo" es lo que uno mismo ha ido escribiendo.
 *
 * NO SE VALIDA CONTRA `personal.cargo`, ni al revés. El cliente descartó
 * explícitamente (2026-09-23) cualquier relación entre Personal y este
 * tarifario; los dos campos se llaman igual y son independientes a propósito.
 * Ver la nota en docs/spec/entidades.md (sección Personal) y la decisión 1 de
 * "Catálogos maestros" en preguntas-abiertas.md.
 *
 * 200 caracteres, el mismo tope que cualquier texto corto del proyecto: es
 * cordura, no regla de negocio — un cargo no ocupa un párrafo.
 */
export const cargoSchema = textoObligatorio("El cargo", 200);

/**
 * El periodo al que corresponde el costo: hora, día, mes o año.
 *
 * TEXTO LIBRE con sugerencias (`PERIODOS_TARIFARIO` en core/periodos.ts), NO un
 * `z.enum` — mismo trato que `unidad` en los otros tres catálogos, por la misma
 * razón: nadie ha confirmado que esos cuatro periodos sean todos los que el
 * negocio usa (¿y una tarifa por turno, por jornada, por semana?), y cerrarlos
 * aquí dejaría al usuario sin poder registrar una tarifa real por una lista que
 * nadie cerró.
 *
 * OJO CON EL NOMBRE: la columna se llama `unidad` y el campo del formulario
 * también, igual que en Materiales, Lista de precios y Servicios — pero lo que
 * admite NO es la misma lista. Allí son unidades físicas (m, und, kg…), aquí
 * son periodos de tiempo. Las dos listas viven en archivos distintos y
 * separados a propósito (core/unidades.ts y core/periodos.ts); la cabecera de
 * `core/periodos.ts` explica por qué no se fusionan.
 *
 * El máximo de 20 es el mismo que usan los otros tres para su `unidad`, y que
 * sea el mismo importa: un valor que una pantalla acepta y otra rechaza sería
 * una diferencia invisible hasta que alguien la sufre.
 */
export const unidadSchema = textoObligatorio("La unidad", 20);

/**
 * El costo de la tarifa. El formulario acepta un monto normal ("150.50") y aquí
 * se convierte al entero en céntimos que exige la regla 2 de AGENTS.md.
 *
 * ES UN DATO DIRECTO, NO DERIVADO — igual que `precio` en Servicios y al revés
 * que Lista de precios, donde el precio se calcula a partir de `precio_lista` y
 * `descuento`. Este catálogo no tiene ni lo uno ni lo otro: es el costo que
 * alguien fija para ese cargo en ese periodo.
 *
 * **No significa nada sin su `unidad`**, y conviene tenerlo presente al leer
 * cualquier consulta sobre esta tabla: 500.00 por hora y 500.00 por mes son la
 * misma columna y no son comparables. La tabla y la vista siempre los enseñan
 * juntos por eso.
 *
 * Como máximo dos decimales: un tercero sería una fracción de céntimo que la
 * base no puede guardar, y redondearlo en silencio es peor que rechazarlo.
 */
export const costoSchema = z
  .string()
  .trim()
  .min(1, "El costo es obligatorio.")
  .regex(
    PATRON_COSTO,
    `Escribe un monto positivo con hasta dos decimales (ej. 150.50), como máximo ${aMontoDecimal(COSTO_MAXIMO_CENTIMOS)}.`,
  )
  .transform(aCentimos)
  .refine((centimos) => centimos > 0, "El costo debe ser mayor que cero.")
  .refine(
    (centimos) => centimos <= COSTO_MAXIMO_CENTIMOS,
    `El costo no puede pasar de ${aMontoDecimal(COSTO_MAXIMO_CENTIMOS)}.`,
  );

export const monedaSchema = z.enum(MONEDAS, {
  error: "La moneda debe ser PEN o USD.",
});

/** Campos que el usuario llena a mano al registrar una tarifa. */
export const tarifaCrearSchema = z.object({
  cargo: cargoSchema,
  unidad: unidadSchema,
  costo: costoSchema,
  moneda: monedaSchema,
});

export const tarifaEditarSchema = tarifaCrearSchema.extend({
  id: z.string().trim().min(1, "Falta el identificador de la tarifa."),
});

/**
 * El texto que llega a la búsqueda de cargos (las sugerencias del campo del
 * modal, NO el buscador de este listado).
 *
 * Aparte de `filtroBusquedaSchema` porque no es el mismo input, por la misma
 * razón que `busquedaProveedorSchema` en Lista de precios: aquel viene de
 * `searchParams` y usa `.catch(undefined)` para ignorar basura; este viene como
 * argumento de una Server Action, así que se valida y se rechaza. El mínimo de
 * un carácter evita una consulta con patrón `%%` que devolvería diez cargos al
 * azar como si fueran sugerencias.
 */
export const busquedaCargoSchema = z.string().trim().min(1).max(200);

/**
 * Lo que recibe `cambiarActivoTarifa`.
 *
 * Los tipos de los parámetros de una Server Action no protegen nada en runtime
 * —es un endpoint y puede llegar cualquier cosa—, así que el par se valida
 * igual que si viniera de un formulario. Mismo criterio y misma forma que
 * `materialCambioActivoSchema` en Materiales.
 */
export const tarifaCambioActivoSchema = z.object({
  id: z.string().trim().min(1, "Falta el identificador de la tarifa."),
  activo: z.boolean(),
});

// --- Filtros del listado ---------------------------------------------------
//
// Vienen de `searchParams`, o sea que son input del usuario. Mismo patrón que
// en Materiales, Lista de precios, Servicios, Personal y OT:
// `.optional().catch(undefined)` para que un parámetro inventado o repetido no
// reviente la pantalla, solo se ignore.

/**
 * Texto de búsqueda. El tope de 200 no es una regla de negocio: evita mandar a
 * la base de datos un `ILIKE '%...%'` con una cadena enorme desde la URL. Mismo
 * criterio y mismo número que `filtroBusquedaSchema` en los otros módulos.
 */
export const filtroBusquedaSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .catch(undefined);

/**
 * `?inactivos=1` cambia el listado a la vista de tarifas inactivas. Cualquier
 * otro valor —o ninguno— lo deja en su comportamiento por defecto: solo las
 * activas.
 *
 * Es un `z.literal("1")` y no un booleano permisivo a propósito: un solo valor
 * válido significa que `?inactivos=true` o `?inactivos=si` se ignoran en vez de
 * interpretarse a medias.
 */
export const filtroInactivosSchema = z
  .literal("1")
  .optional()
  .catch(undefined);

export type TarifaCrearInput = z.infer<typeof tarifaCrearSchema>;
export type TarifaEditarInput = z.infer<typeof tarifaEditarSchema>;
