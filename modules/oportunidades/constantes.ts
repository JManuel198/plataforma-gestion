// Listas compartidas entre los formularios (Client Components) y las
// validaciones del servidor. Este archivo no importa nada a propósito: así
// puede viajar al cliente sin arrastrar Drizzle ni la conexión a la base de
// datos — mismo patrón que modules/ordenes-trabajo/constantes.ts.
//
// Cada array es la FUENTE DE VERDAD ÚNICA de su `pgEnum`:
// db/schema/oportunidades.ts los importa de aquí para construirlos. Tocar una
// lista es cambiar un enum de PostgreSQL: hace falta una migración
// (npx drizzle-kit generate), y quitar un valor que alguna fila ya use exige
// reasignar esas filas primero.
//
// Los valores son claves en minúsculas y sin tildes, no la grafía que ve el
// usuario (a diferencia de `ESTADOS_OT`): las etiquetas y los colores de las
// etapas se definirán en un solo lugar del código de interfaz
// (docs/spec/oportunidades.md, sección 1), y renombrar una etiqueta no debe
// exigir una migración.
//
// La moneda NO está aquí: `valor_estimado` usa el enum compartido `moneda`
// (`MONEDAS` de core/monedas.ts), el mismo de `orden_trabajo` y
// `lista_precios`.

/**
 * Las seis etapas del embudo (docs/spec/oportunidades.md, sección 1). El
 * orden del array es el orden del enum en PostgreSQL y el del embudo: una
 * etapa nueva se inserta donde le toca, no al final. "Calificado" se eliminó
 * a propósito por decisión del cliente; no se restaura.
 */
export const ETAPAS_OPORTUNIDAD = [
  "prospecto",
  "cotizacion",
  "negociacion",
  "adjudicado",
  "ejecucion",
  "finalizado",
] as const;

export type EtapaOportunidad = (typeof ETAPAS_OPORTUNIDAD)[number];

/**
 * La situación, independiente de la etapa (sección 2). Una oportunidad
 * perdida o anulada conserva su última etapa; reabrir la devuelve a ella. No
 * hay columna `activo`: `anulada` cumple ese papel.
 */
export const SITUACIONES_OPORTUNIDAD = ["abierta", "perdida", "anulada"] as const;

export type SituacionOportunidad = (typeof SITUACIONES_OPORTUNIDAD)[number];

/** Tipos de actividad (sección 4). */
export const TIPOS_ACTIVIDAD = [
  "nota",
  "llamada",
  "reunion",
  "correo",
  "visita",
] as const;

export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

/**
 * Qué registra cada entrada del historial (sección 4). Qué columnas lleva
 * cada tipo lo documenta docs/spec/entidades.md y lo garantizan los CHECK de
 * `oportunidad_historial`.
 */
export const TIPOS_HISTORIAL = [
  "creacion",
  "cambio_etapa",
  "edicion",
  "perdida",
  "anulacion",
  "reapertura",
] as const;

export type TipoHistorial = (typeof TIPOS_HISTORIAL)[number];

/**
 * Los únicos campos editables después de crear (sección 3), y por tanto los
 * únicos que puede nombrar una entrada `edicion` del historial. Empresa,
 * moneda, valor y probabilidad no se editan; si algún día se editan, se añade
 * aquí su valor y sus columnas en el historial.
 */
export const CAMPOS_HISTORIAL = [
  "titulo",
  "contacto",
  "fecha_cierre_estimada",
] as const;

export type CampoHistorial = (typeof CAMPOS_HISTORIAL)[number];

export const RUTA_LISTADO = "/oportunidades";

/**
 * Las piezas fijas del código `OPT.CCM.AAAA.NNNNN` (sección 3 de la spec).
 * "CCM" es la empresa, fija como en las OT y no configurable hasta que se pida
 * explícitamente; se declara aquí y no dentro de la lógica por lo mismo que
 * `CODIGO_EMPRESA` de las OT. No se importa de allí: un módulo no depende de
 * otro, y el día que el correlativo se mueva a config/clientes/ (ver la deuda
 * técnica de AGENTS.md) se moverán juntas las de los dos.
 */
export const PREFIJO_OPORTUNIDAD = "OPT";
export const CODIGO_EMPRESA = "CCM";
export const DIGITOS_CORRELATIVO = 5;

/** Primer correlativo de cada año: `OPT.CCM.2026.00001`. */
export const CORRELATIVO_INICIAL = 1;

/**
 * Ámbito del correlativo anual en la tabla compartida `correlativo`
 * (`reservarCorrelativoAnual`, core/correlativo.ts): la fila de cada año es
 * `"oportunidades:<año>"`. NO SE RENOMBRA una vez emitida la primera
 * oportunidad real: el año en curso arrancaría de nuevo en
 * `CORRELATIVO_INICIAL` y chocaría con el UNIQUE de `codigo`.
 */
export const CLAVE_CORRELATIVO_OPORTUNIDAD = "oportunidades";
