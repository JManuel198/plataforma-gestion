import { z } from "zod";

// Nada que venga del formulario toca la base sin pasar por aquí (regla 1 de
// AGENTS.md: la validación vive en el backend).
//
// AVISO IMPORTANTE SOBRE EL ALCANCE DE ESTAS VALIDACIONES: los campos de este
// catálogo son un BORRADOR sin confirmar con el cliente (ver
// docs/spec/entidades.md y la sección "Catálogos maestros" de
// docs/spec/preguntas-abiertas.md). Por eso aquí NO hay ninguna regla de
// negocio inventada: ni formato impuesto al código interno, ni lista cerrada
// de unidades. Solo "obligatorio" donde el propio campo lo hace evidente, y
// topes de longitud de cordura. Cuando el cliente confirme, este es el archivo
// donde se endurece — como ya pasó con la unicidad de `codigo_interno` y con
// el significado de `fecha_activacion`, confirmados los dos y aplicados.
//
// La unicidad de `codigo_interno` NO se comprueba aquí y no debe hacerse:
// preguntar antes con un SELECT dejaría una ventana entre la comprobación y
// el INSERT en la que otra alta simultánea mete el mismo código. La garantía
// real es el UNIQUE de la tabla, y el choque se traduce en actions.ts. Mismo
// criterio que `personal.dni`.
//
// ESTE ARCHIVO ES MÁS ESTRICTO QUE LA TABLA, Y ES DELIBERADO. En
// db/schema/materiales.ts los SIETE campos de negocio admiten NULL: sin nada
// confirmado, el esquema no impone obligaciones que nadie pidió, porque
// relajar una columna después es una migración y endurecerla también. El
// formulario, en cambio, sí puede exigir lo evidente desde ya — pedir un
// material sin código ni descripción no tiene sentido para el usuario.
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
 * La fecha de ACTIVACIÓN del material, en `YYYY-MM-DD`: el formato que produce
 * un `<input type="date">` y el que guarda la columna `date` (es `date` y no
 * `timestamp` por la regla invariable 10 de AGENTS.md, justamente para que
 * este texto entre y salga sin pasar por ninguna conversión de zona).
 *
 * Qué significa ya está confirmado: el material pasa por una validación previa
 * antes de activarse, y esta es la fecha de esa activación. **Ese proceso de
 * validación no está construido** y queda fuera de alcance por ahora — aquí no
 * hay nada que lo represente, ni un estado ni una comprobación; la fecha se
 * escribe a mano. Registrado en preguntas-abiertas.md para que no se pierda.
 *
 * SIN VALIDACIÓN DE RANGO, a propósito, y esto sigue abierto: NO está
 * confirmado si puede ser futura. Es plausible que sí —un material podría
 * registrarse antes de terminar su validación, con la activación prevista— y
 * es plausible que no. Rechazar futuros aquí asumiría una de las dos
 * respuestas, y permitirlos no asume ninguna: deja pasar el dato y no impide
 * endurecerlo después. Lo único que se comprueba es que sea una fecha real.
 */
export const fechaActivacionSchema = z.iso.date("Escribe una fecha válida.");

/**
 * Campos que el usuario llena a mano.
 *
 * `activo` no está, y no debe estarlo: se da de alta activo por el `DEFAULT
 * true` de la columna, y la baja será su propia acción confirmada desde el
 * listado (Parte 2), nunca una casilla que se marque sin querer mientras se
 * corrige una descripción.
 */
export const materialCrearSchema = z.object({
  codigo_interno: textoObligatorio("El código interno", 50),
  descripcion: textoObligatorio("La descripción", 300),
  marca: textoOpcional("La marca", 100),
  modelo: textoOpcional("El modelo", 100),
  codigo_fabrica: textoOpcional("El código de fábrica", 100),
  unidad: textoObligatorio("La unidad", 20),
  fecha_activacion: fechaActivacionSchema,
});

export const materialEditarSchema = materialCrearSchema.extend({
  id: z.string().trim().min(1, "Falta el identificador del material."),
});

export type MaterialCrearInput = z.infer<typeof materialCrearSchema>;
export type MaterialEditarInput = z.infer<typeof materialEditarSchema>;
