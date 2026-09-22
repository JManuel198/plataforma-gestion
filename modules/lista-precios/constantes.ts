// Listas y constantes compartidas entre el formulario (Client Component) y las
// validaciones del servidor. Este archivo no importa nada a propósito: así
// puede viajar al cliente sin arrastrar Drizzle ni la conexión a la base de
// datos con él. Mismo criterio que modules/ordenes-trabajo/constantes.ts.
//
// `MONEDAS` NO está aquí: vive en `core/monedas.ts`, compartida con Órdenes de
// Trabajo, porque las dos tablas usan el MISMO enum `moneda` de PostgreSQL.
// Duplicarla aquí sería crear una segunda lista que puede desincronizarse del
// enum — exactamente lo que el comentario de core/monedas.ts prohíbe.

export const RUTA_LISTADO = "/lista-precios";

/**
 * Las unidades de medida que admite una fila de la lista de precios.
 *
 * ES UNA LISTA FIJA, pero DELIBERADAMENTE NO ES UN `pgEnum`. La columna
 * `lista_precios.unidad` es `text` y la restricción vive solo aquí y en el Zod
 * del módulo. El motivo: a diferencia de `ESTADOS_OT`, esta lista es un
 * borrador sin confirmar con el cliente —no se sabe si los seis valores son
 * exhaustivos o solo los que aparecieron primero (ver "Lista de precios" en
 * docs/spec/preguntas-abiertas.md)— y añadir o quitar un valor de un `pgEnum`
 * exige una migración. Con `text` + esta constante, corregir la lista mientras
 * se confirma es editar este array.
 *
 * El día que el cliente la confirme, el sitio correcto SÍ es un `pgEnum`
 * construido desde este mismo array, igual que hace `ot_estado` — y entonces
 * este archivo sigue siendo la fuente de verdad única, no aparece una segunda
 * lista en db/schema/.
 *
 * Ojo con Materiales: `materiales.unidad` es texto libre sin lista cerrada, así
 * que hoy los dos catálogos tratan "unidad" de forma distinta. Esa
 * inconsistencia está registrada como pregunta abierta a propósito; no la
 * resuelvas unificándolas por tu cuenta.
 */
export const UNIDADES = ["m", "und", "pzs", "cja", "kg", "lt"] as const;

export type Unidad = (typeof UNIDADES)[number];

/**
 * Los formatos que admite cada campo numérico, como patrones sueltos.
 *
 * VIVEN AQUÍ Y NO DENTRO DEL ZOD porque los usan DOS sitios: `schema.ts`, que
 * valida en el servidor y es la única comprobación que vale, y `precio.ts`, que
 * necesita saber si el texto a medio escribir ya es un número utilizable para
 * decidir si enseña el precio calculado o un guion.
 *
 * Que sean el mismo patrón no es cosmético: si el formulario considerara válido
 * algo que el servidor rechaza, el usuario vería un precio calculado en pantalla
 * y un error al guardar, sin entender cuál de los dos miente.
 *
 * Cada uno está atado a la escala de su columna — `precio_lista` son céntimos
 * (2 decimales), `cantidad` es `numeric(14,3)` y `descuento` es `numeric(5,2)`
 * con rango 0–100. El rango en sí NO lo comprueba la regex (`999` casa con el
 * patrón del descuento): eso lo hace el Zod y, de verdad, el CHECK de la
 * columna.
 */
export const PATRON_PRECIO_LISTA = /^\d{1,12}([.,]\d{1,2})?$/;
export const PATRON_CANTIDAD = /^\d{1,11}([.,]\d{1,3})?$/;
export const PATRON_DESCUENTO = /^\d{1,3}([.,]\d{1,2})?$/;

/**
 * Las dos piezas fijas del código de oferta `OFFT.0000001`.
 *
 * SIN SEGMENTO DE AÑO, al revés que el `OT.CCM.AAAA.NNNN` de Órdenes de
 * Trabajo: el correlativo de una oferta es global y no reinicia nunca. Por eso
 * son siete dígitos y no cuatro — un contador que nunca vuelve a empezar tiene
 * que aguantar toda la vida del sistema, no un año.
 *
 * Tampoco lleva el código de empresa (`CCM`): ese vive en
 * modules/ordenes-trabajo/constantes.ts y forma parte del formato de la OT, no
 * de este. Si algún día ambos correlativos se mueven a config/clientes/*.json
 * (ver la deuda técnica de AGENTS.md), estas constantes viajan con ellas.
 */
export const PREFIJO_OFERTA = "OFFT";
export const DIGITOS_CORRELATIVO_OFERTA = 7;

/**
 * Primer número que entrega el contador. `1` → `OFFT.0000001`.
 *
 * Supuesto, igual que `CORRELATIVO_INICIAL` de la OT: nadie confirmó si la
 * primera oferta es la 1 o la 0. Existe como constante en vez de escrito dentro
 * del contador para que cambiarlo sea un solo sitio.
 */
export const CORRELATIVO_OFERTA_INICIAL = 1;

/**
 * La clave de este módulo en la tabla compartida `correlativo`.
 *
 * Es la `clave` del upsert atómico (ver `core/correlativo.ts`). Tocarlo
 * después de que existan ofertas reiniciaría la numeración desde
 * `CORRELATIVO_OFERTA_INICIAL` y chocaría contra el UNIQUE de `codigo_oferta`.
 */
export const CLAVE_CORRELATIVO_OFERTA = "lista_precios";
