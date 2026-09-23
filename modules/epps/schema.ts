import { z } from "zod";
import { aCentimos, aMontoDecimal } from "@/core/dinero";
import { MONEDAS } from "@/core/monedas";
import { PATRON_PRECIO } from "./constantes";

// Nada que venga del formulario toca la base sin pasar por aquí (regla 1 de
// AGENTS.md: la validación y el cálculo viven en el backend).
//
// ESTE ARCHIVO ES MÁS ESTRICTO QUE LA TABLA, Y ES DELIBERADO — mismo criterio
// que modules/materiales/schema.ts, modules/lista-precios/schema.ts y
// modules/servicios/schema.ts. En db/schema/epps.ts las columnas de negocio
// admiten NULL, porque relajar una columna después es una migración y
// endurecerla también. El formulario sí puede exigir lo evidente desde ya: un
// EPP sin descripción, sin precio o sin moneda no es un dato incompleto, es
// una fila que no significa nada. La dirección importa: el Zod puede ser más
// estricto que la columna, NUNCA al revés.
//
// UN CAMPO NO ESTÁ AQUÍ Y NO DEBE ESTARLO: `codigo`, porque lo genera el
// backend con el correlativo atómico (ver codigo.ts y core/correlativo.ts). Es
// un campo automático: el usuario no lo escribe ni puede proponerlo. Si viajara
// en el FormData, alguien podría fijarlo con un POST directo y saltarse el
// contador. Mismo criterio que `codigo_interno` en Materiales, `codigo_oferta`
// en Lista de precios, `codigo` en Servicios y en Tarifario, y `codigo_ot` en
// OT.
//
// `activo` TAMPOCO está, y aquí el motivo es más simple que en Servicios: allí
// la columna falta porque inactivar está sin confirmar con el cliente
// (pregunta abierta), así que podría llegar. Aquí el encargo dice que la baja
// lógica NO APLICA a este catálogo. Ver la ficha en docs/spec/entidades.md.

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
 * Órdenes de Trabajo, Lista de precios, Servicios y Tarifario de personal,
 * pero escrito aquí y no importado de allí porque un módulo de negocio no
 * importa de otro (AGENTS.md, Arquitectura). Lo que SÍ se comparte es la
 * conversión (`aCentimos` / `aMontoDecimal` en core/dinero.ts), que es donde
 * estaba el riesgo real de divergencia — la aritmética, no la constante. Es
 * exactamente la distinción que dejó escrita la deuda técnica de AGENTS.md al
 * mover `dinero.ts` a core/ sin llevarse esta constante con él.
 *
 * El número tiene que seguir cuadrando con `PATRON_PRECIO` (./constantes.ts):
 * 12 dígitos enteros + 2 decimales producen exactamente este máximo. No son dos
 * límites independientes, son el mismo escrito de dos formas; si se toca uno
 * sin el otro, el monto se rechaza por formato en vez de por este mensaje y el
 * error deja de decir la verdad.
 */
export const PRECIO_MAXIMO_CENTIMOS = 99_999_999_999_999;

/**
 * El precio del EPP. El formulario acepta un monto normal ("150.50") y aquí se
 * convierte al entero en céntimos que exige la regla 2 de AGENTS.md.
 *
 * ES UN DATO DIRECTO, NO DERIVADO, igual que `servicios.precio` y a diferencia
 * de Lista de precios, donde `precio` no existe como columna porque se calcula
 * a partir de `precio_lista` y `descuento`. Este catálogo no tiene ni lo uno ni
 * lo otro — es el precio del equipo, un solo número que alguien fija—, así que
 * aquí sí es una columna y sí viaja en el formulario.
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
 * La unidad de medida. TEXTO LIBRE, no una lista cerrada — igual que en
 * Materiales, Lista de precios y Servicios.
 *
 * Es la decisión 12 de "Catálogos maestros" en
 * docs/spec/preguntas-abiertas.md, cerrada el 2026-09-22. `UNIDADES`
 * (core/unidades.ts) nunca se confirmó como exhaustiva, así que rechazar
 * "par" sería imponer un borrador y dejar al usuario sin poder registrar un
 * EPP real por una lista que nadie cerró. Esa lista solo alimenta el
 * desplegable de sugerencias del modal, y aquí se valida lo único que sí se
 * sabe cierto — que venga algo y que quepa en la columna.
 *
 * OJO, ES LA LISTA FÍSICA (`core/unidades.ts`: m, und, pzs, cja, kg, lt, gal),
 * NO LA DE PERIODOS DE TARIFARIO (`core/periodos.ts`: hora, día, mes, año).
 * Las dos columnas se llaman `unidad` y son `text`, así que nada en el tipo
 * avisa de la confusión: un EPP se mide en unidades o pares, no en periodos de
 * cobro. Es el error fácil al copiar del catálogo de al lado.
 *
 * Con esto los CUATRO catálogos de unidad física la tratan igual. El máximo de
 * 20 es el mismo que en Materiales, Lista de precios y Servicios, y que sea el
 * mismo importa: un valor que una pantalla acepta y otra rechaza sería una
 * diferencia invisible hasta que alguien la sufre. Las cuatro columnas son
 * `text` sin longitud, así que el límite es solo cordura — una unidad de
 * medida no ocupa veinte caracteres.
 */
export const unidadSchema = textoObligatorio("La unidad", 20);

export const monedaSchema = z.enum(MONEDAS, {
  error: "La moneda debe ser PEN o USD.",
});

/** Campos que el usuario llena a mano al registrar un EPP. */
export const eppCrearSchema = z.object({
  // El nombre o descripción del equipo. 300, el mismo tope que la
  // `descripcion` de Materiales y que el `servicio` de Servicios, porque
  // cumple el mismo papel: es el texto que identifica la fila para quien la
  // lee.
  descripcion: textoObligatorio("La descripción", 300),
  unidad: unidadSchema,
  precio: precioSchema,
  moneda: monedaSchema,
});

export const eppEditarSchema = eppCrearSchema.extend({
  id: z.string().trim().min(1, "Falta el identificador del EPP."),
});

// --- Filtros del listado ---------------------------------------------------
//
// Vienen de `searchParams`, o sea que son input del usuario. Mismo patrón que
// en Servicios, Tarifario, Materiales, Lista de precios, Personal y OT:
// `.optional().catch(undefined)` para que un parámetro inventado o repetido no
// reviente la pantalla, solo se ignore.
//
// SOLO UNO, y es el listado más simple del proyecto: no hay
// `filtroInactivosSchema` como en Materiales, Lista de precios y Tarifario
// —esta tabla no tiene columna `activo`, así que no hay nada que alternar— ni
// un filtro de lista cerrada como el `filtroCategoriaSchema` de Servicios. Ver
// la cabecera de ./filtros.ts para el porqué de las dos ausencias.

/**
 * Texto de búsqueda. El tope de 200 no es una regla de negocio: evita mandar a
 * la base de datos un `ILIKE '%...%'` con una cadena enorme desde la URL.
 * Mismo criterio y mismo número que `filtroBusquedaSchema` en los otros seis
 * módulos.
 *
 * NO escapa los comodines: de eso se encarga `patronParcial`
 * (core/busqueda.ts) justo antes del `ILIKE`, en queries.ts. Son dos cosas
 * distintas y las dos hacen falta — esto acota el tamaño de lo que entra,
 * aquello neutraliza el `%` y el `_` para que el usuario no escriba una
 * expresión sin saberlo.
 */
export const filtroBusquedaSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .catch(undefined);

export type EppCrearInput = z.infer<typeof eppCrearSchema>;
export type EppEditarInput = z.infer<typeof eppEditarSchema>;
