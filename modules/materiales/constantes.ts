// Constantes compartidas del catálogo de Materiales. Este archivo no importa
// nada a propósito: así puede viajar al cliente (el modal las usa para el
// marcador de posición del código) sin arrastrar Drizzle ni la conexión a la
// base con él. Mismo criterio que `modules/ordenes-trabajo/constantes.ts`.

/**
 * Las tres piezas del código `MAT.0000001`.
 *
 * Formato confirmado: prefijo `MAT.` y un correlativo de 7 dígitos con ceros
 * a la izquierda. **Sin segmento de año, a diferencia de la OT**: este
 * correlativo es GLOBAL y no reinicia nunca, así que no hay nada que aislar
 * por periodo. Siete dígitos dan hasta 9 999 999 materiales — con el
 * correlativo global, ese techo es para toda la vida del catálogo, no por año.
 *
 * Viven aquí y no escritas a mano dentro de la lógica, por la misma razón que
 * las de OT: "fija" no es lo mismo que "repetida en cinco archivos". Y por la
 * convención de Correlativos de AGENTS.md, el día que exista un
 * `config/clientes/*.json` estas dos viajan juntas, igual que las cinco de OT
 * — un archivo de cliente que defina el prefijo pero no los dígitos deja el
 * formato a medias.
 */
export const PREFIJO_MATERIAL = "MAT";
export const DIGITOS_CORRELATIVO = 7;

/**
 * Primer número del catálogo: `MAT.0000001`.
 *
 * Existe como constante y no escrito dentro del contador por lo mismo que
 * `CORRELATIVO_INICIAL` en OT — si alguna vez se confirma que debe arrancar
 * en otro número, este es el único sitio que cambia.
 */
export const CORRELATIVO_INICIAL = 1;

/**
 * El ámbito de este contador dentro de la tabla `correlativo`, que es
 * compartida: su PK es un texto, no un año, justamente para que cada catálogo
 * tenga su propia fila sin necesitar una tabla nueva cada vez.
 *
 * NO SE CAMBIA NUNCA una vez que hay materiales creados: cambiarlo haría
 * empezar un contador nuevo desde 1 y el `UNIQUE` de `codigo_interno`
 * rechazaría los códigos repetidos, que es exactamente el fallo que la red de
 * seguridad está ahí para atajar.
 */
export const CLAVE_CORRELATIVO = "materiales";
