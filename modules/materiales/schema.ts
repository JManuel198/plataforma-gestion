import { z } from "zod";

// Nada que venga del formulario toca la base sin pasar por aquí (regla 1 de
// AGENTS.md: la validación vive en el backend).
//
// AVISO IMPORTANTE SOBRE EL ALCANCE DE ESTAS VALIDACIONES: los campos de este
// catálogo son un BORRADOR sin confirmar con el cliente (ver
// docs/spec/entidades.md y la sección "Catálogos maestros" de
// docs/spec/preguntas-abiertas.md). Por eso aquí NO hay ninguna regla de
// negocio inventada: ni lista cerrada de unidades, ni obligatoriedad que
// nadie pidió. Solo "obligatorio" donde el propio campo lo hace evidente, y
// topes de longitud de cordura. Cuando el cliente confirme, este es el archivo
// donde se endurece — como ya pasó con la unicidad de `codigo_interno`, y como
// pasó después con su generación automática, que lo sacó del formulario.
//
// El `UNIQUE` de `codigo_interno` NO se comprueba aquí y no debe hacerse:
// preguntar antes con un SELECT dejaría una ventana entre la comprobación y el
// INSERT en la que otra alta simultánea mete el mismo código. Desde que el
// código lo genera el correlativo atómico, además, ese choque dejó de ser algo
// que el usuario pueda provocar: es red de seguridad del generador, y se
// traduce como fallo interno en actions.ts.
//
// ESTE ARCHIVO ES MÁS ESTRICTO QUE LA TABLA, Y ES DELIBERADO. En
// db/schema/materiales.ts los campos de negocio admiten NULL: sin nada
// confirmado, el esquema no impone obligaciones que nadie pidió, porque
// relajar una columna después es una migración y endurecerla también. El
// formulario, en cambio, sí puede exigir lo evidente desde ya — pedir un
// material sin descripción ni unidad no tiene sentido para el usuario.
// La dirección importa: el Zod puede ser más estricto que la columna, NUNCA
// al revés. Si mañana se confirma que algo es obligatorio de verdad, el orden
// es endurecer aquí primero, comprobar que no hay filas vacías, y recién
// entonces migrar la columna a NOT NULL.

const textoObligatorio = (etiqueta: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${etiqueta} es obligatorio.`)
    .max(max, `${etiqueta} no puede pasar de ${max} caracteres.`);

/**
 * Campo descriptivo que puede no aplicar a una fila concreta.
 *
 * Un consumible (cinta aislante, trapo industrial) no siempre tiene marca,
 * modelo ni código de fábrica; una herramienta sí. Exigirlos obligaría a
 * inventar un "N/A" y ensuciaría el catálogo, así que se admiten vacíos.
 *
 * Se normaliza a cadena vacía, nunca a `null`, y eso es deliberado: la
 * columna admite NULL, así que sin esto habría DOS representaciones de "sin
 * dato" (`NULL` para las filas que cargue otra vía, `''` para las del
 * formulario) y cualquier filtro o agrupado futuro tendría que acordarse de
 * cubrir las dos. Todo lo que escriba esta aplicación usa una sola forma.
 *
 * Ojo al leer el listado: como la columna sí admite NULL, el código que pinta
 * la tabla no puede dar por hecho que siempre llega una cadena — por eso
 * `oVacio()` en components/tabla-materiales.tsx cubre los dos casos.
 */
const textoOpcional = (etiqueta: string, max = 200) =>
  z
    .string()
    .trim()
    .max(max, `${etiqueta} no puede pasar de ${max} caracteres.`)
    .optional()
    .transform((valor) => valor ?? "");

/**
 * Las características técnicas del material: de 0 a 3 líneas de texto libre.
 *
 * SOLO CADENAS CON CONTENIDO. El formulario nunca envía un slot vacío ni el
 * "fantasma" deshabilitado (ver `caracteristicas-material.tsx`: el `name` solo
 * se pone cuando hay texto), así que el servidor únicamente ve características
 * reales. El `.min(1)` de cada elemento no es redundante con eso: es la
 * garantía de este lado, porque una Server Action es un endpoint y puede
 * llegarle cualquier cosa por un POST directo.
 *
 * El tope de 3 se valida aquí ADEMÁS de en la interfaz, por lo mismo. En la
 * pantalla se nota como "al llegar a 3 no aparece ningún slot más"; aquí es lo
 * que impide que alguien se salte esa cuenta.
 *
 * `.default([])` porque un material sin ninguna característica es lo normal:
 * `formData.getAll("caracteristicas")` devuelve un arreglo vacío y eso tiene
 * que ser válido, no un error de "falta el campo".
 */
export const caracteristicasSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Una característica no puede quedar vacía.")
      .max(200, "Una característica no puede pasar de 200 caracteres."),
  )
  .max(3, "Como máximo 3 características técnicas.")
  .default([]);

/**
 * Campos que el usuario llena a mano.
 *
 * `activo` no está, y no debe estarlo: se da de alta activo por el `DEFAULT
 * true` de la columna, y la baja es su propia acción confirmada desde el
 * listado, nunca una casilla que se marque sin querer mientras se corrige una
 * descripción.
 *
 * `codigo_interno` TAMPOCO ESTÁ, y este es el cambio importante: lo genera el
 * servidor con el correlativo atómico (`MAT.0000001`, ver ./codigo.ts y
 * core/correlativo.ts), así que no viaja en el formulario ni siquiera como
 * campo deshabilitado. Que no esté aquí es lo que impide que alguien lo
 * imponga con un POST directo: aunque llegue en el `FormData`, este esquema lo
 * descarta y la acción escribe el suyo. Mismo criterio que `codigo_ot` de OT,
 * que `otCrearSchema` tampoco declara.
 *
 * `fecha_activacion` ya no existe: la columna se eliminó del esquema. La fecha
 * que muestran la tabla y la vista es `created_at`, que la pone la base con su
 * `DEFAULT now()` y nadie escribe a mano.
 */
export const materialCrearSchema = z.object({
  descripcion: textoObligatorio("La descripción", 300),
  marca: textoOpcional("La marca", 100),
  modelo: textoOpcional("El modelo", 100),
  codigo_fabrica: textoOpcional("El código de fábrica", 100),
  unidad: textoObligatorio("La unidad", 20),
  // No es una columna de `materiales`: vive en su propia tabla hija
  // (`material_caracteristicas`) y la acción la escribe aparte, dentro de la
  // misma transacción. Viaja en el mismo formulario porque para el usuario es
  // parte de la misma ficha.
  caracteristicas: caracteristicasSchema,
});

export const materialEditarSchema = materialCrearSchema.extend({
  id: z.string().trim().min(1, "Falta el identificador del material."),
});

/**
 * Inactivar o reactivar desde el listado. Esquema aparte y mínimo a propósito,
 * igual que `personaCambioActivoSchema`: la acción que lo usa escribe una sola
 * columna, así que nada más puede viajar con él aunque alguien invoque la
 * acción con un POST directo.
 */
export const materialCambioActivoSchema = z.object({
  id: z.string().trim().min(1, "Falta el identificador del material."),
  activo: z.boolean(),
});

// --- Filtros del listado ---------------------------------------------------
//
// Vienen de `searchParams`, o sea que son input del usuario. Mismo patrón que
// en Personal y OT: `.optional().catch(undefined)` para que un parámetro
// inventado o repetido no reviente la pantalla, solo se ignore.

export const filtroBusquedaSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .catch(undefined);

/**
 * `?inactivos=1` muestra también los materiales inactivos. Cualquier otro
 * valor —o ninguno— deja el listado en su comportamiento por defecto: solo
 * activos.
 */
export const filtroInactivosSchema = z
  .literal("1")
  .optional()
  .catch(undefined);

export type MaterialCrearInput = z.infer<typeof materialCrearSchema>;
export type MaterialEditarInput = z.infer<typeof materialEditarSchema>;
