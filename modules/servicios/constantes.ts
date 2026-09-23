// Constantes compartidas del catálogo de Servicios. Este archivo no importa
// nada a propósito: así puede viajar al cliente (el modal las usa para el
// marcador de posición del código y para pintar el desplegable de categoría)
// sin arrastrar Drizzle ni la conexión a la base con él. Mismo criterio que
// `modules/materiales/constantes.ts` y `modules/lista-precios/constantes.ts`.
//
// `MONEDAS` NO está aquí: vive en `core/monedas.ts`, compartida con Órdenes de
// Trabajo y Lista de precios, porque las tres tablas usan el MISMO enum
// `moneda` de PostgreSQL. Duplicarla sería crear una segunda lista que puede
// desincronizarse del enum.
//
// `UNIDADES` TAMPOCO: vive en `core/unidades.ts`, y este catálogo la trata
// igual que los otros dos — como SUGERENCIA, no como restricción (ver el
// comentario de `unidadSchema` en ./schema.ts).

export const RUTA_LISTADO = "/servicios";

/**
 * Las categorías de servicio que ofrece el desplegable del modal.
 *
 * ── ESTA SÍ RESTRINGE, A DIFERENCIA DE `UNIDADES` ───────────────────────────
 *
 * Y la diferencia conviene tenerla clara, porque los dos campos se llenan en el
 * mismo formulario y se parecen desde fuera:
 *
 * - `unidad` es TEXTO LIBRE con sugerencias. Lo que no esté en `UNIDADES` se
 *   guarda igual — decisión 12 de "Catálogos maestros" en
 *   `docs/spec/preguntas-abiertas.md`, cerrada el 2026-09-22 a favor del texto
 *   libre en los tres catálogos.
 * - `categoria` es una LISTA CERRADA. El modal la pinta con un `Select` y el
 *   Zod la valida con `z.enum`, así que un valor de fuera se rechaza.
 *
 * ── PERO LA COLUMNA ES `text`, NO UN `pgEnum` ───────────────────────────────
 *
 * Y eso también es deliberado. Nadie ha confirmado que estos cinco valores sean
 * exhaustivos: pueden ser el catálogo completo o los cinco que aparecieron
 * primero (queda registrado como pregunta abierta). Mientras no se sepa, la
 * restricción vive del lado de la aplicación, donde ampliarla es editar este
 * array; un `pgEnum` exigiría una migración por cada valor nuevo.
 *
 * Es el mismo criterio que ya aplicaba `lista_precios.unidad` frente a
 * `ot_estado` y `moneda`, que sí son `pgEnum` porque su lista está confirmada.
 * El día que el cliente cierre esta, el sitio correcto es un `pgEnum`
 * construido DESDE este array — nunca un segundo array literal.
 *
 * `otros` va al final a propósito: es el cajón de sastre, y ponerlo en medio
 * invitaría a elegirlo por estar a mano en vez de por descarte.
 */
export const CATEGORIAS_SERVICIO = [
  "alquiler",
  "fabricación",
  "consultoría",
  "alimentación",
  "otros",
] as const;

export type CategoriaServicio = (typeof CATEGORIAS_SERVICIO)[number];

/**
 * `"alquiler"` → `"Alquiler"`, para mostrar la categoría con mayúscula inicial
 * sin cambiar lo que se guarda ni lo que viaja en la URL del filtro.
 *
 * NO ES `className="capitalize"` DE TAILWIND, Y ESO ES DELIBERADO —esto
 * arregla un error real de la Parte 1 (2026-09-23), donde sí se usó esa clase
 * en `SelectTrigger`. `text-transform: capitalize` de CSS pone mayúscula en
 * CADA palabra del texto que envuelve, no solo en la primera: sirve para un
 * valor de una sola palabra como "alquiler", pero el mismo `SelectTrigger`
 * también enseña el `placeholder` ("Elige una categoría") cuando no hay nada
 * elegido, y ese placeholder heredaba la misma transformación — se veía
 * "Elige Una Categoría". El filtro de esta Parte 2 tiene el mismo problema con
 * su opción "Todas las categorías". Una función que solo toca la primera letra
 * del valor real —nunca el texto que la envuelve— no puede arrastrar ese
 * error.
 *
 * Recibe `string`, no `CategoriaServicio`: la columna en Postgres es `text`
 * sin restricción (ver ../schema.ts), así que una fila cargada fuera del
 * formulario podría traer cualquier cosa. Tipar el parámetro como el enum
 * estricto sería fingir una garantía que la base no da.
 */
export function capitalizarCategoria(categoria: string): string {
  return categoria.length > 0
    ? categoria.charAt(0).toUpperCase() + categoria.slice(1)
    : categoria;
}

/**
 * El formato que admite el campo de precio.
 *
 * Vive aquí y no dentro del Zod por el mismo motivo que los patrones de Lista
 * de precios: lo usan el esquema del servidor y, potencialmente, cualquier
 * vista previa del cliente. Está atado a la escala de la columna — `precio` son
 * céntimos, o sea 2 decimales — y tiene que seguir cuadrando con
 * `PRECIO_MAXIMO_CENTIMOS` de ./schema.ts: 12 dígitos enteros más 2 decimales
 * producen exactamente ese máximo. No son dos límites independientes.
 */
export const PATRON_PRECIO = /^\d{1,12}([.,]\d{1,2})?$/;

/**
 * Las dos piezas fijas del código de servicio `SRV.0000001`.
 *
 * SIN SEGMENTO DE AÑO, igual que `MAT.` y `OFFT.` y al revés que el
 * `OT.CCM.AAAA.NNNN` de Órdenes de Trabajo: este correlativo es global y no
 * reinicia nunca. Por eso son siete dígitos y no cuatro — un contador que nunca
 * vuelve a empezar tiene que aguantar toda la vida del sistema, no un año.
 *
 * Tampoco lleva el código de empresa (`CCM`): ese vive en
 * `modules/ordenes-trabajo/constantes.ts` y forma parte del formato de la OT,
 * no de este. Si algún día los correlativos se mueven a `config/clientes/*.json`
 * (ver la deuda técnica de AGENTS.md), estas constantes viajan con ellas.
 */
export const PREFIJO_SERVICIO = "SRV";
export const DIGITOS_CORRELATIVO_SERVICIO = 7;

/**
 * Primer número que entrega el contador. `1` → `SRV.0000001`.
 *
 * Supuesto, igual que en OT, Materiales y Lista de precios: nadie confirmó si
 * el primer servicio es el 1 o el 0. Existe como constante en vez de escrito
 * dentro del contador para que cambiarlo sea un solo sitio.
 */
export const CORRELATIVO_SERVICIO_INICIAL = 1;

/**
 * La clave de este módulo en la tabla compartida `correlativo`.
 *
 * Es la `clave` del upsert atómico (ver `core/correlativo.ts`). Es su propio
 * ámbito: no comparte contador con Materiales ni con Lista de precios, así que
 * `SRV.0000001` y `MAT.0000001` conviven sin estorbarse.
 *
 * NO SE CAMBIA NUNCA una vez que hay servicios creados: cambiarlo haría empezar
 * un contador nuevo desde `CORRELATIVO_SERVICIO_INICIAL` y el `UNIQUE` de
 * `codigo` rechazaría los códigos repetidos — que es exactamente el fallo que
 * esa red de seguridad está ahí para atajar.
 */
export const CLAVE_CORRELATIVO_SERVICIO = "servicios";
