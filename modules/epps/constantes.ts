// Constantes compartidas del catálogo de EPPs. Este archivo no importa nada a
// propósito: así puede viajar al cliente (el modal las usa para el marcador de
// posición del código) sin arrastrar Drizzle ni la conexión a la base con él.
// Mismo criterio que `modules/servicios/constantes.ts` y
// `modules/tarifario-personal/constantes.ts`.
//
// `MONEDAS` NO está aquí: vive en `core/monedas.ts`, compartida con Órdenes de
// Trabajo, Lista de precios, Servicios y Tarifario de personal, porque las
// cinco tablas usan el MISMO enum `moneda` de PostgreSQL. Duplicarla sería
// crear una segunda lista que puede desincronizarse del enum.
//
// `UNIDADES` TAMPOCO: vive en `core/unidades.ts`, y este catálogo la trata
// igual que Materiales, Lista de precios y Servicios — como SUGERENCIA, no
// como restricción (ver el comentario de `unidadSchema` en ./schema.ts).

export const RUTA_LISTADO = "/epps";

/**
 * El formato que admite el campo de precio.
 *
 * Vive aquí y no dentro del Zod por el mismo motivo que en Servicios: lo usan
 * el esquema del servidor y, potencialmente, cualquier vista previa del
 * cliente. Está atado a la escala de la columna — `precio` son céntimos, o sea
 * 2 decimales — y tiene que seguir cuadrando con `PRECIO_MAXIMO_CENTIMOS` de
 * ./schema.ts: 12 dígitos enteros más 2 decimales producen exactamente ese
 * máximo. No son dos límites independientes.
 */
export const PATRON_PRECIO = /^\d{1,12}([.,]\d{1,2})?$/;

/**
 * Las dos piezas fijas del código de EPP `EPP.000001`.
 *
 * SIN SEGMENTO DE AÑO, igual que `MAT.`, `OFFT.`, `SRV.` y `PRS.`, y al revés
 * que el `OT.CCM.AAAA.NNNN` de Órdenes de Trabajo: este correlativo es global
 * y no reinicia nunca.
 *
 * SEIS DÍGITOS, que es un número propio de este catálogo y no un descuido al
 * copiar: `MAT.`, `OFFT.` y `SRV.` usan 7 y `PRS.` usa 4. La tabla
 * `correlativo` no impone ninguno — el ancho es una constante por ámbito (ver
 * la ficha "Correlativo genérico" en docs/spec/entidades.md). Con
 * `padStart(6, "0")` el orden alfabético del código coincide con el numérico
 * hasta `EPP.999999`; pasado ese techo divergirían, igual que le pasa a `PRS.`
 * a partir de `PRS.9999`. Se acepta a propósito: un catálogo de equipos de
 * protección no llega a un millón de filas.
 *
 * Tampoco lleva el código de empresa (`CCM`): ese vive en
 * `modules/ordenes-trabajo/constantes.ts` y forma parte del formato de la OT,
 * no de este. Si algún día los correlativos se mueven a `config/clientes/*.json`
 * (ver la deuda técnica de AGENTS.md), estas constantes viajan con ellas.
 */
export const PREFIJO_EPP = "EPP";
export const DIGITOS_CORRELATIVO_EPP = 6;

/**
 * Primer número que entrega el contador. `1` → `EPP.000001`.
 *
 * Supuesto, igual que en OT, Materiales, Lista de precios, Servicios y
 * Tarifario: nadie confirmó si el primer EPP es el 1 o el 0. Existe como
 * constante en vez de escrito dentro del contador para que cambiarlo sea un
 * solo sitio.
 */
export const CORRELATIVO_EPP_INICIAL = 1;

/**
 * La clave de este módulo en la tabla compartida `correlativo`.
 *
 * Es la `clave` del upsert atómico (ver `core/correlativo.ts`), y la QUINTA de
 * esa tabla. Es su propio ámbito: no comparte contador con ningún otro
 * catálogo, así que `EPP.000001` y `SRV.0000001` conviven sin estorbarse.
 *
 * NO SE CAMBIA NUNCA una vez que hay EPPs creados: cambiarlo haría empezar un
 * contador nuevo desde `CORRELATIVO_EPP_INICIAL` y el `UNIQUE` de `codigo`
 * rechazaría los códigos repetidos — que es exactamente el fallo que esa red
 * de seguridad está ahí para atajar.
 */
export const CLAVE_CORRELATIVO_EPP = "epps";
