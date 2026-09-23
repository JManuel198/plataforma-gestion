import { z } from "zod";
import { aCentimos, aMontoDecimal } from "@/core/dinero";
import { MONEDAS } from "@/core/monedas";
import { CATEGORIAS_SERVICIO, PATRON_PRECIO } from "./constantes";

// Nada que venga del formulario toca la base sin pasar por aquí (regla 1 de
// AGENTS.md: la validación y el cálculo viven en el backend).
//
// ESTE ARCHIVO ES MÁS ESTRICTO QUE LA TABLA, Y ES DELIBERADO — mismo criterio
// que modules/materiales/schema.ts y modules/lista-precios/schema.ts. En
// db/schema/servicios.ts las columnas de negocio admiten NULL, porque relajar
// una columna después es una migración y endurecerla también. El formulario sí
// puede exigir lo evidente desde ya: un servicio sin nombre, sin precio o sin
// moneda no es un dato incompleto, es una fila que no significa nada. La
// dirección importa: el Zod puede ser más estricto que la columna, NUNCA al
// revés.
//
// UN CAMPO NO ESTÁ AQUÍ Y NO DEBE ESTARLO: `codigo`, porque lo genera el
// backend con el correlativo atómico (ver codigo.ts y core/correlativo.ts). Es
// un campo automático: el usuario no lo escribe ni puede proponerlo. Si viajara
// en el FormData, alguien podría fijarlo con un POST directo y saltarse el
// contador. Mismo criterio que `codigo_interno` en Materiales, `codigo_oferta`
// en Lista de precios y `codigo_ot` en OT.
//
// `activo` TAMPOCO está, pero por un motivo distinto que en los otros dos
// catálogos: allí existe la columna y la baja es su propia acción confirmada.
// Aquí NO HAY COLUMNA `activo` — inactivar no está confirmado para este
// catálogo y no se inventó (ver la ficha en docs/spec/entidades.md y la
// pregunta abierta correspondiente). Si algún día se confirma, esto es lo que
// hay que añadir: la columna, su acción propia y su esquema mínimo aparte,
// nunca una casilla dentro de este formulario.

const textoObligatorio = (etiqueta: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${etiqueta} es obligatorio.`)
    .max(max, `${etiqueta} no puede pasar de ${max} caracteres.`);

/**
 * Techo del precio, en céntimos: `999 999 999 999.99`.
 *
 * Es el mismo número y el mismo criterio que `PRECIO_MAXIMO_CENTIMOS` de
 * Órdenes de Trabajo y de Lista de precios, pero escrito aquí y no importado de
 * allí porque un módulo de negocio no importa de otro (AGENTS.md,
 * Arquitectura). Lo que SÍ se comparte es la conversión (`aCentimos` /
 * `aMontoDecimal` en core/dinero.ts), que es donde estaba el riesgo real de
 * divergencia — la aritmética, no la constante. Es exactamente la distinción
 * que dejó escrita la deuda técnica de AGENTS.md al mover `dinero.ts` a core/
 * sin llevarse esta constante con él.
 *
 * El número tiene que seguir cuadrando con `PATRON_PRECIO` (./constantes.ts):
 * 12 dígitos enteros + 2 decimales producen exactamente este máximo. No son dos
 * límites independientes, son el mismo escrito de dos formas; si se toca uno
 * sin el otro, el monto se rechaza por formato en vez de por este mensaje y el
 * error deja de decir la verdad.
 */
export const PRECIO_MAXIMO_CENTIMOS = 99_999_999_999_999;

/**
 * El precio del servicio. El formulario acepta un monto normal ("150.50") y
 * aquí se convierte al entero en céntimos que exige la regla 2 de AGENTS.md.
 *
 * ES UN DATO DIRECTO, NO DERIVADO, y esa es la diferencia de fondo con Lista de
 * precios: allí `precio` no existe como columna porque se calcula a partir de
 * `precio_lista` y `descuento`. Este catálogo no tiene ni lo uno ni lo otro —
 * es el precio de tarifa de un servicio, un solo número que alguien fija—, así
 * que aquí sí es una columna y sí viaja en el formulario.
 *
 * Como máximo dos decimales: un tercero sería una fracción de céntimo que la
 * base no puede guardar, y redondearlo en silencio es peor que rechazarlo.
 */
export const precioSchema = z
  .string()
  .trim()
  .min(1, "El precio es obligatorio.")
  .regex(
    PATRON_PRECIO,
    `Escribe un monto positivo con hasta dos decimales (ej. 150.50), como máximo ${aMontoDecimal(PRECIO_MAXIMO_CENTIMOS)}.`,
  )
  .transform(aCentimos)
  .refine((centimos) => centimos > 0, "El precio debe ser mayor que cero.")
  .refine(
    (centimos) => centimos <= PRECIO_MAXIMO_CENTIMOS,
    `El precio no puede pasar de ${aMontoDecimal(PRECIO_MAXIMO_CENTIMOS)}.`,
  );

/**
 * La categoría del servicio. LISTA CERRADA, al contrario que `unidad` aquí
 * debajo.
 *
 * Esta es la comprobación que de verdad restringe el campo: el `Select` del
 * modal es comodidad de interfaz, y una comprobación que solo viva en el
 * cliente no es una comprobación (regla 1 de AGENTS.md). La columna en
 * PostgreSQL es `text`, sin CHECK ni enum, así que este `z.enum` es lo único
 * que impide guardar "cualquier cosa" por un POST directo.
 *
 * Que la lista esté cerrada aquí y abierta en la base no es incoherencia: es la
 * misma estrategia en dos capas que ya usan `responsable` de OT y los campos de
 * Materiales — endurecer primero donde es barato, y migrar la columna solo
 * cuando el cliente confirme que la lista es exhaustiva. Ver
 * `CATEGORIAS_SERVICIO` en ./constantes.ts.
 */
export const categoriaSchema = z.enum(CATEGORIAS_SERVICIO, {
  error: "Elige una categoría de la lista.",
});

/**
 * La unidad de medida. TEXTO LIBRE, no una lista cerrada — igual que en
 * Materiales y en Lista de precios.
 *
 * No es un descuido que el campo de al lado (`categoria`) sí restrinja y este
 * no: es la decisión 12 de "Catálogos maestros" en
 * docs/spec/preguntas-abiertas.md, cerrada el 2026-09-22. `UNIDADES`
 * (core/unidades.ts) nunca se confirmó como exhaustiva, así que rechazar
 * "rollo" sería imponer un borrador y dejar al usuario sin poder registrar un
 * servicio real por una lista que nadie cerró. Esa lista solo alimenta el
 * desplegable de sugerencias del modal, y aquí se valida lo único que sí se
 * sabe cierto — que venga algo y que quepa en la columna.
 *
 * Con esto los TRES catálogos tratan `unidad` igual. El máximo de 20 es el
 * mismo que en Materiales y Lista de precios, y que sea el mismo importa: un
 * valor que una pantalla acepta y otra rechaza sería una diferencia invisible
 * hasta que alguien la sufre. Las tres columnas son `text` sin longitud, así
 * que el límite es solo cordura — una unidad de medida no ocupa veinte
 * caracteres.
 */
export const unidadSchema = textoObligatorio("La unidad", 20);

export const monedaSchema = z.enum(MONEDAS, {
  error: "La moneda debe ser PEN o USD.",
});

/** Campos que el usuario llena a mano al registrar un servicio. */
export const servicioCrearSchema = z.object({
  // El nombre o descripción del servicio. 300, el mismo tope que la
  // `descripcion` de Materiales, porque cumple el mismo papel: es el texto que
  // identifica la fila para quien la lee.
  servicio: textoObligatorio("El servicio", 300),
  categoria: categoriaSchema,
  unidad: unidadSchema,
  precio: precioSchema,
  moneda: monedaSchema,
});

export const servicioEditarSchema = servicioCrearSchema.extend({
  id: z.string().trim().min(1, "Falta el identificador del servicio."),
});

// --- Filtros del listado ---------------------------------------------------
//
// Vienen de `searchParams`, o sea que son input del usuario. Mismo patrón que
// en Materiales, Lista de precios, Personal y OT: `.optional().catch(undefined)`
// para que un parámetro inventado o repetido no reviente la pantalla, solo se
// ignore.
//
// SOLO DOS, NO TRES: no hay `filtroInactivosSchema` como en Materiales y Lista
// de precios — esta tabla no tiene columna `activo`, así que no hay nada que
// alternar. Ver la decisión 16 de "Catálogos maestros" en
// docs/spec/preguntas-abiertas.md.

/**
 * Texto de búsqueda. El tope de 200 no es una regla de negocio: evita mandar a
 * la base de datos un `ILIKE '%...%'` con una cadena enorme desde la URL.
 * Mismo criterio y mismo número que `filtroBusquedaSchema` en los otros tres
 * módulos.
 */
export const filtroBusquedaSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .catch(undefined);

/**
 * `?categoria=alquiler` filtra el listado a esa categoría. Reusa
 * `categoriaSchema` — la lista cerrada es la MISMA que valida el formulario,
 * así que un valor inventado en la URL no cuela aquí tampoco: `.catch(undefined)`
 * lo descarta como "sin filtro" en vez de reventar la pantalla, que es la
 * postura de siempre ante un parámetro de `searchParams` que no viene de un
 * control propio.
 */
export const filtroCategoriaSchema = categoriaSchema
  .optional()
  .catch(undefined);

export type ServicioCrearInput = z.infer<typeof servicioCrearSchema>;
export type ServicioEditarInput = z.infer<typeof servicioEditarSchema>;
