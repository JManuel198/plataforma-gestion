// Constantes compartidas del Tarifario de personal. Este archivo no importa
// nada a propósito: así puede viajar al cliente (el modal las usa para el
// marcador de posición del código) sin arrastrar Drizzle ni la conexión a la
// base con él. Mismo criterio que `modules/servicios/constantes.ts`,
// `modules/materiales/constantes.ts` y `modules/lista-precios/constantes.ts`.
//
// `MONEDAS` NO está aquí: vive en `core/monedas.ts`, compartida con Órdenes de
// Trabajo, Lista de precios y Servicios, porque las cuatro tablas usan el MISMO
// enum `moneda` de PostgreSQL. Duplicarla sería crear una segunda lista que
// puede desincronizarse del enum.
//
// `PERIODOS_TARIFARIO` TAMPOCO: vive en `core/periodos.ts`, al lado de
// `core/unidades.ts` y deliberadamente separada de ella — ver la cabecera de
// ese archivo para el porqué. Aquí el campo "Unidad" es un periodo de tiempo
// (hora, día, mes, año), NO una unidad física (m, und, kg…).

export const RUTA_LISTADO = "/tarifario-personal";

/**
 * El formato que admite el campo de costo.
 *
 * Vive aquí y no dentro del Zod por el mismo motivo que `PATRON_PRECIO` en
 * Servicios y Lista de precios: lo usan el esquema del servidor y,
 * potencialmente, cualquier vista previa del cliente. Está atado a la escala de
 * la columna —`costo` son céntimos, o sea 2 decimales— y tiene que seguir
 * cuadrando con `COSTO_MAXIMO_CENTIMOS` de ./schema.ts: 12 dígitos enteros más
 * 2 decimales producen exactamente ese máximo. No son dos límites
 * independientes.
 */
export const PATRON_COSTO = /^\d{1,12}([.,]\d{1,2})?$/;

/**
 * Las dos piezas fijas del código de tarifa `PRS.0001`.
 *
 * SIN SEGMENTO DE AÑO, igual que `MAT.`, `OFFT.` y `SRV.` y al revés que el
 * `OT.CCM.AAAA.NNNN` de Órdenes de Trabajo: este correlativo es global y no
 * reinicia nunca.
 *
 * ── CUATRO DÍGITOS, NO SIETE — ESTA ES LA DIFERENCIA CON SUS HERMANOS ───────
 *
 * `MAT.`, `OFFT.` y `SRV.` usan siete (`MAT.0000001`); este usa cuatro
 * (`PRS.0001`). Es el formato que pidió el encargo y tiene sentido por el
 * tamaño real del catálogo —los cargos de una empresa son decenas, no
 * millones—, pero conviene saber qué se asume al elegirlo:
 *
 * El listado ordena por `codigo` (texto), y eso equivale al orden numérico
 * SOLO mientras todos los códigos tengan el mismo ancho. Con ceros a la
 * izquierda eso se cumple hasta `PRS.9999`; el siguiente sería `PRS.10000`, con
 * cinco dígitos, y ahí el orden alfabético lo colocaría entre `PRS.0999` y
 * `PRS.1000` en vez de al final. Es un límite asumido, no un descuido: llegar
 * ahí exigiría diez mil cargos distintos. Si alguna vez se acerca, lo que hay
 * que cambiar es esta constante (y migrar los códigos ya emitidos para
 * repadearlos), no el ORDER BY.
 */
export const PREFIJO_TARIFA = "PRS";
export const DIGITOS_CORRELATIVO_TARIFA = 4;

/**
 * Primer número que entrega el contador. `1` → `PRS.0001`.
 *
 * Supuesto, igual que en OT, Materiales, Lista de precios y Servicios: nadie
 * confirmó si la primera tarifa es la 1 o la 0. Existe como constante en vez de
 * escrito dentro del contador para que cambiarlo sea un solo sitio.
 */
export const CORRELATIVO_TARIFA_INICIAL = 1;

/**
 * La clave de este módulo en la tabla compartida `correlativo`.
 *
 * Es la `clave` del upsert atómico (ver `core/correlativo.ts`). Es su propio
 * ámbito: no comparte contador con Materiales, Lista de precios ni Servicios,
 * así que `PRS.0001`, `SRV.0000001` y `MAT.0000001` conviven sin estorbarse.
 *
 * NO SE CAMBIA NUNCA una vez que hay tarifas creadas: cambiarlo haría empezar
 * un contador nuevo desde `CORRELATIVO_TARIFA_INICIAL` y el `UNIQUE` de
 * `codigo` rechazaría los códigos repetidos — que es exactamente el fallo que
 * esa red de seguridad está ahí para atajar.
 */
export const CLAVE_CORRELATIVO_TARIFA = "tarifario_personal";
