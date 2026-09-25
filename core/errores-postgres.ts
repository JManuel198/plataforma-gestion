/**
 * Reconocer errores de PostgreSQL que llegan a través de Drizzle.
 *
 * VIVE EN core/ PORQUE LO NECESITAN TRES MÓDULOS (ordenes-trabajo, personal y
 * materiales) y ninguno debe importar del otro — misma regla que ya movió aquí
 * `estado-formulario.ts` y `resultado-accion.ts` (AGENTS.md, Arquitectura).
 *
 * POR QUÉ EXISTE, que es lo importante: los tres módulos tenían cada uno su
 * propia copia de esta comprobación, y las tres estaban MAL. Todas miraban
 * `error.code` directamente:
 *
 *     (error as { code?: unknown }).code === "23505"   // nunca se cumple
 *
 * Pero drizzle-orm no deja escapar el error de `pg` tal cual: lo envuelve en un
 * `DrizzleQueryError` que lleva el mensaje "Failed query: …" y guarda el error
 * original en `cause`. El `code` vive ahí dentro, no arriba. Verificado contra
 * la base real el 2026-09-21 con drizzle-orm 0.45.2: al violar el UNIQUE de
 * `materiales.codigo_interno`, el error tiene `constructor.name`
 * "DrizzleQueryError", `code` `undefined`, y `cause` es un `DatabaseError` de
 * `pg` con `code: "23505"` y `constraint: "materiales_codigo_interno_unique"`.
 *
 * La consecuencia era silenciosa y por eso duró: el UNIQUE de la base sí
 * rechazaba el duplicado —el dato nunca se corrompió— pero la traducción no
 * saltaba nunca, así que el usuario veía un "No se pudo guardar. Intenta de
 * nuevo." genérico en vez de "ese DNI ya existe". Nada fallaba en compilación
 * ni en lint; solo el mensaje era inútil.
 *
 * Se recorre la cadena de `cause` en vez de mirar solo un nivel: así funciona
 * tanto si una versión futura de Drizzle deja de envolver como si añade otra
 * capa.
 */

/** Violación de restricción UNIQUE. */
export const CODIGO_UNIQUE_VIOLADO = "23505";

/** Violación de clave foránea. La usa `esFkViolada`. */
export const CODIGO_FK_VIOLADA = "23503";

type ErrorPostgres = { code?: unknown; constraint?: unknown };

/**
 * Busca en el error y en su cadena de `cause` el primero que tenga un `code`
 * de PostgreSQL (una cadena de cinco caracteres, el SQLSTATE).
 */
function errorPostgresDe(error: unknown): ErrorPostgres | null {
  let actual = error;

  // Tope de profundidad por si alguna vez llega una cadena de causas cíclica:
  // vale más devolver null que colgar una Server Action.
  for (let salto = 0; salto < 10; salto += 1) {
    if (typeof actual !== "object" || actual === null) return null;

    if (typeof (actual as ErrorPostgres).code === "string") {
      return actual as ErrorPostgres;
    }

    if (!("cause" in actual)) return null;
    actual = (actual as { cause?: unknown }).cause;
  }

  return null;
}

/**
 * ¿Este error es la violación de un UNIQUE?
 *
 * `constraint` es opcional pero conviene pasarlo: una tabla puede acabar
 * teniendo más de una restricción única, y sin el nombre la traducción diría
 * "ese DNI ya existe" ante el choque de cualquier otra columna. Es el nombre
 * que genera Drizzle, con la forma `<tabla>_<columna>_unique` — aparece en el
 * SQL de la migración y en `error.cause.constraint`.
 */
export function esUniqueViolado(error: unknown, constraint?: string): boolean {
  const postgres = errorPostgresDe(error);

  if (postgres?.code !== CODIGO_UNIQUE_VIOLADO) return false;

  return constraint === undefined || postgres.constraint === constraint;
}

/**
 * ¿Este error es la violación de una clave foránea?
 *
 * Mismo criterio que `esUniqueViolado`: se pasa el nombre del constraint
 * (`<tabla>_<columna>_<tabla-referida>_<columna-referida>_fk`, el que genera
 * Drizzle) para no traducir como "esa empresa no existe" el choque de otra FK
 * de la misma tabla. La estrenó Contactos (`contactos_empresa_id_empresas_id_fk`).
 */
export function esFkViolada(error: unknown, constraint?: string): boolean {
  const postgres = errorPostgresDe(error);

  if (postgres?.code !== CODIGO_FK_VIOLADA) return false;

  return constraint === undefined || postgres.constraint === constraint;
}
