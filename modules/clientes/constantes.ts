// Constantes compartidas del módulo Clientes (CRM, Bloque 2). Este archivo no
// importa nada a propósito: así puede viajar al cliente (el formulario usará
// `TIPOS_EMPRESA` para el selector) sin arrastrar Drizzle ni la conexión a la
// base con él. Mismo criterio que `modules/ordenes-trabajo/constantes.ts`,
// cuyo `ESTADOS_OT` también construye un `pgEnum` desde el esquema.

/**
 * Qué relación comercial tiene la empresa con nosotros.
 *
 * Fuente de verdad única: `db/schema/empresas.ts` construye el `pgEnum`
 * `empresa_tipo` DESDE este array. Nunca declares un segundo array literal con
 * estos valores — añadir o quitar uno exige una migración, y la migración sale
 * de aquí.
 */
export const TIPOS_EMPRESA = [
  "cliente",
  "proveedor",
  "cliente_y_proveedor",
] as const;

export type TipoEmpresa = (typeof TIPOS_EMPRESA)[number];

/**
 * Las piezas del código `CLT-0001`.
 *
 * Mismo mecanismo que los cinco catálogos: correlativo GLOBAL, sin segmento de
 * año, reservado atómicamente por `reservarCorrelativo` (core/correlativo.ts)
 * en la tabla compartida `correlativo`. Lo que cambia es el formato: separador
 * `-` en vez de `.`, y 4 dígitos (como `PRS.0001` de Tarifario de personal).
 *
 * Límite asumido de los 4 dígitos: el orden alfabético de `codigo` coincide
 * con el numérico solo hasta `CLT-9999`. Pasado eso, `padStart` no recorta y
 * el código sigue siendo único, pero un listado ordenado por texto daría
 * saltos. Mismo fenómeno ya aceptado en `PRS.`.
 *
 * Si algún día los correlativos se mueven a `config/clientes/*.json` (ver la
 * convención de Correlativos en AGENTS.md), estas constantes viajan juntas.
 */
export const PREFIJO_EMPRESA = "CLT";
export const SEPARADOR_CODIGO_EMPRESA = "-";
export const DIGITOS_CORRELATIVO_EMPRESA = 4;

/**
 * Primer número del contador: `CLT-0001`. Supuesto, igual que en el resto de
 * correlativos: nadie confirmó si arranca en 0 o en 1.
 */
export const CORRELATIVO_EMPRESA_INICIAL = 1;

/**
 * La clave de este módulo en la tabla compartida `correlativo`.
 *
 * NO SE CAMBIA NUNCA una vez que hay empresas creadas: cambiarla haría empezar
 * un contador nuevo desde el inicial y el `UNIQUE` de `empresas.codigo`
 * rechazaría los códigos repetidos.
 */
export const CLAVE_CORRELATIVO_EMPRESA = "empresas";
