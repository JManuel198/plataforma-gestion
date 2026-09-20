import { z } from "zod";

// Nada que venga del formulario toca la base sin pasar por aquí (regla 1 de
// AGENTS.md: la validación vive en el backend).
//
// Estos dos ayudantes son gemelos de los de modules/ordenes-trabajo/schema.ts.
// Están duplicados a propósito y no unificados en core/: son tres líneas de
// Zod cuyo valor está en el texto del mensaje, que es por entidad. Si algún
// día divergen en comportamiento (y no solo en la etiqueta), ese es el momento
// de moverlos a core/ — nunca de importarlos del otro módulo.

const textoObligatorio = (etiqueta: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${etiqueta} es obligatorio.`)
    .max(max, `${etiqueta} no puede pasar de ${max} caracteres.`);

/**
 * DNI peruano: ocho dígitos exactos.
 *
 * SUPUESTO, no confirmado por el cliente — no hay nada sobre Personal en
 * docs/spec/ (está diferido, sección 5 del alcance), así que la duda queda
 * registrada en docs/spec/preguntas-abiertas.md en vez de darse por buena.
 * Si el negocio da de alta a extranjeros con carné de extranjería (9 dígitos)
 * o pasaporte (alfanumérico), esta regex es lo único que hay que cambiar.
 *
 * Se guarda como texto, no como número: los ceros a la izquierda son parte
 * del documento.
 */
export const dniSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, "El DNI debe tener exactamente 8 dígitos.");

/**
 * Fecha de nacimiento en `YYYY-MM-DD`, el formato que produce un
 * `<input type="date">` y el que guarda la columna `date` (ver
 * db/schema/personal.ts: es `date` y no `timestamp` justamente para que este
 * texto entre y salga sin pasar por ninguna conversión de zona).
 *
 * Los dos topes son de cordura, no reglas de negocio: una fecha futura es
 * siempre un error de tecleo, y 120 años atrás descarta el "1900" que sale de
 * teclear mal el año. La edad mínima para trabajar NO se valida aquí — es una
 * regla laboral real que el cliente no ha confirmado (ver preguntas-abiertas).
 */
export const fechaNacimientoSchema = z.iso
  .date("Escribe una fecha válida.")
  .refine(
    (fecha) => fecha <= new Date().toISOString().slice(0, 10),
    "La fecha de nacimiento no puede estar en el futuro.",
  )
  .refine((fecha) => {
    const hace120 = new Date();
    hace120.setFullYear(hace120.getFullYear() - 120);
    return fecha >= hace120.toISOString().slice(0, 10);
  }, "Revisa la fecha: esa persona tendría más de 120 años.");

/**
 * Campos que el usuario llena a mano.
 *
 * `activo` no está, y no debe estarlo: se da de alta activa por el `DEFAULT
 * true` de la columna, y se cambia con su propia acción —con confirmación—
 * desde el listado, nunca editando el formulario entero.
 */
export const personaCrearSchema = z.object({
  nombre: textoObligatorio("El nombre", 100),
  apellido: textoObligatorio("El apellido", 100),
  cargo: textoObligatorio("El cargo", 100),
  dni: dniSchema,
  fecha_nacimiento: fechaNacimientoSchema,
});

export const personaEditarSchema = personaCrearSchema.extend({
  id: z.string().trim().min(1, "Falta el identificador de la persona."),
});

/**
 * Alta o baja desde el listado. Esquema aparte y mínimo a propósito, igual
 * que `otCambioEstadoSchema`: la acción que lo usa escribe una sola columna,
 * así que nada más puede viajar con él aunque alguien invoque la acción con
 * un POST directo.
 */
export const personaCambioActivoSchema = z.object({
  id: z.string().trim().min(1, "Falta el identificador de la persona."),
  activo: z.boolean(),
});

// --- Filtros del listado ---------------------------------------------------
//
// Vienen de `searchParams`, o sea que son input del usuario. Mismo patrón que
// en OT: `.optional().catch(undefined)` para que un parámetro inventado o
// repetido no reviente la pantalla, solo se ignore.

export const filtroBusquedaSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .catch(undefined);

/**
 * `?inactivos=1` muestra también a quien está de baja. Cualquier otro valor
 * —o ninguno— deja el listado en su comportamiento por defecto: solo activos.
 */
export const filtroInactivosSchema = z
  .literal("1")
  .optional()
  .catch(undefined);

export type PersonaCrearInput = z.infer<typeof personaCrearSchema>;
export type PersonaEditarInput = z.infer<typeof personaEditarSchema>;
