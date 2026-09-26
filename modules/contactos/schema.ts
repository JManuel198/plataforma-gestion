import { z } from "zod";

// Nada que venga del formulario toca la base sin pasar por aquí (regla 1 de
// AGENTS.md: la validación vive en el backend).
//
// `activo` NO está y no debe estar: se da de alta activo por el `DEFAULT true`
// de la columna y se cambia con su propia acción (`alternarActivoContacto`),
// nunca editando el formulario entero. Mismo criterio que Clientes.
//
// Tampoco hay UNIQUE ni formato estricto en ningún campo, por decisión
// confirmada (2026-09-25, ver la ficha de Contactos en docs/spec/entidades.md):
// - `correo` puede repetirse entre contactos (un buzón genérico compartido).
// - `celular` no se valida contra `+51 000 000 000`: eso es solo la sugerencia
//   visual del formulario.

/**
 * Convierte "" (campo dejado en blanco) en `null` antes de validar. Mismo
 * ayudante que modules/clientes/schema.ts, copiado y no importado (un módulo
 * no depende de otro).
 */
const vacioANull = (valor: unknown) =>
  typeof valor === "string" && valor.trim() === "" ? null : valor;

/**
 * Texto opcional: en blanco (o ausente del FormData) se guarda como `null`.
 * Los topes son de cordura, no reglas de negocio — las columnas son `text` sin
 * longitud.
 */
const textoOpcional = (etiqueta: string, max = 200) =>
  z.preprocess(
    vacioANull,
    z
      .string()
      .trim()
      .max(max, `${etiqueta} no puede pasar de ${max} caracteres.`)
      .nullable()
      .default(null),
  );

/**
 * La empresa elegida en el selector.
 *
 * Solo se comprueba que venga algo: que ese id exista de verdad lo garantiza la
 * FK `contactos_empresa_id_empresas_id_fk`, no un SELECT previo — preguntar
 * antes dejaría una ventana entre la comprobación y el INSERT. Mismo
 * razonamiento que `materialIdSchema` en Lista de precios. Si la FK salta, la
 * acción lo traduce a un mensaje legible (ver actions.ts).
 *
 * NO se exige que la empresa esté activa: un contacto puede estar asociado a
 * una empresa dada de baja (decisión confirmada, ver entidades.md).
 */
const empresaIdSchema = z
  .string({ error: "Elige una empresa." })
  .trim()
  .min(1, "Elige una empresa.");

/** Campos que el formulario de contacto manda al crear o editar. */
export const contactoDatosSchema = z.object({
  empresa_id: empresaIdSchema,
  nombre: z
    .string({ error: "El nombre es obligatorio." })
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(200, "El nombre no puede pasar de 200 caracteres."),
  cargo: textoOpcional("El cargo", 200),
  correo: textoOpcional("El correo", 254),
  celular: textoOpcional("El celular", 50),
});

/**
 * El identificador que llega como argumento suelto (`actualizarContacto`,
 * `alternarActivoContacto`). Los tipos de TypeScript no protegen nada en
 * runtime: una Server Action es un endpoint y puede llegar cualquier cosa.
 */
export const contactoIdSchema = z
  .string()
  .trim()
  .min(1, "Falta el identificador del contacto.");

/**
 * Alta o baja desde el listado. Esquema aparte y mínimo, igual que
 * `empresaCambioActivoSchema`: la acción escribe una sola columna.
 */
export const contactoCambioActivoSchema = z.object({
  id: contactoIdSchema,
  activo: z.boolean(),
});

// --- Filtros del listado ---------------------------------------------------
//
// Vienen de `searchParams`, o sea que son input del usuario. Mismo patrón que
// en los demás módulos: `.optional().catch(undefined)` para que un parámetro
// inventado o repetido no reviente la pantalla, solo se ignore.

/** Mismo criterio y mismo tope que `filtroBusquedaSchema` en los otros módulos. */
export const filtroBusquedaSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .catch(undefined);

/**
 * `?inactivos=1` muestra SOLO los contactos dados de baja (vistas excluyentes,
 * ver `condicionesListado` en queries.ts). Cualquier otro valor se ignora.
 */
export const filtroInactivosSchema = z
  .literal("1")
  .optional()
  .catch(undefined);

export type ContactoDatosInput = z.infer<typeof contactoDatosSchema>;
