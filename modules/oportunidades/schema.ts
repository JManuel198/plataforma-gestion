import { z } from "zod";
import { aCentimos, aMontoDecimal } from "@/core/dinero";
import { MONEDAS } from "@/core/monedas";
import { instanteDeFechaHoraLocal } from "@/lib/fecha";
import {
  CLAVES_RANGO_VALOR,
  ESTADOS_TABLA,
  ETAPAS_OPORTUNIDAD,
  OPCIONES_RAPIDAS,
  TIPOS_ACTIVIDAD,
  VISTAS,
} from "./constantes";

// Nada que venga de un formulario o de un argumento de Server Action toca la
// base sin pasar por aquí (regla 1 de AGENTS.md: la validación vive en el
// backend). Reglas de cada campo: docs/spec/oportunidades.md, sección 3.
//
// NUNCA aparecen en ningún esquema, y no deben aparecer:
// - `codigo`: lo emite `reservarCorrelativoAnual` al crear.
// - `asesor_id`, y `autor_id` en las actividades: siempre el usuario en
//   sesión, que la acción toma de `exigirSesion()`. Si viniera del formulario,
//   cualquiera podría crear a nombre de otro.
// - `situacion` y `motivo` de la oportunidad: solo los cambian marcarPerdida,
//   anular y reabrir.
// - `etapa_cambiada_en`, `created_at`, `updated_at`: los pone la base.

/**
 * Convierte "" (campo dejado en blanco) en `null` antes de validar. Mismo
 * ayudante que modules/contactos/schema.ts, copiado y no importado (un módulo
 * no depende de otro).
 */
const vacioANull = (valor: unknown) =>
  typeof valor === "string" && valor.trim() === "" ? null : valor;

/** Como `vacioANull`, pero para campos que tienen valor por defecto. */
const vacioAUndefined = (valor: unknown) =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

/**
 * Un identificador que llega como argumento suelto o en un campo oculto. Los
 * tipos de TypeScript no protegen nada en runtime: una Server Action es un
 * endpoint y puede llegar cualquier cosa.
 */
const idSchema = (mensaje: string) =>
  z.string({ error: mensaje }).trim().min(1, mensaje);

export const oportunidadIdSchema = idSchema(
  "Falta el identificador de la oportunidad.",
);

const tituloSchema = z
  .string({ error: "El título es obligatorio." })
  .trim()
  .min(1, "El título es obligatorio.")
  .max(200, "El título no puede pasar de 200 caracteres.");

/**
 * El contacto elegido, o `null` si se deja sin contacto (es opcional y se
 * puede quitar, sección 3). Aquí solo se comprueba la forma: que exista, que
 * esté activo y que sea de la empresa de la oportunidad lo comprueba la acción
 * contra la base (`validarContacto` en actions.ts).
 */
const contactoIdSchema = z.preprocess(
  vacioANull,
  z.string().trim().min(1).nullable().default(null),
);

/**
 * Fecha estimada de cierre: `date` sin hora (regla invariable 10), opcional
 * [por defecto en la spec]. `z.iso.date()` rechaza también fechas imposibles
 * como el 30 de febrero.
 */
const fechaCierreSchema = z.preprocess(
  vacioANull,
  z.iso
    .date({ error: "Escribe una fecha válida." })
    .nullable()
    .default(null),
);

/**
 * Techo de negocio para `valor_estimado`, en céntimos. Mismo número y mismo
 * criterio que `PRECIO_MAXIMO_CENTIMOS` de las OT (ver su comentario): es el
 * mayor valor que deja escribir el formato de abajo (12 dígitos enteros + 2
 * decimales), para que el límite del formato y el de este número sean el
 * mismo. Cada módulo declara el suyo (AGENTS.md, deuda técnica de MONEDAS).
 */
export const VALOR_MAXIMO_CENTIMOS = 99_999_999_999_999;

/**
 * Valor estimado: por defecto 0, mayor o igual a 0, hasta dos decimales, y se
 * guarda en céntimos (regla invariable 2). A diferencia del precio de una OT,
 * el 0 es válido: es el valor por defecto de la spec.
 */
const valorEstimadoSchema = z.preprocess(
  (valor) => vacioAUndefined(valor) ?? "0",
  z
    .string()
    .trim()
    .regex(
      /^\d{1,12}([.,]\d{1,2})?$/,
      `Escribe un monto de 0 o más con hasta dos decimales (ej. 150.50), como máximo ${aMontoDecimal(VALOR_MAXIMO_CENTIMOS)}.`,
    )
    .transform(aCentimos)
    .refine(
      (centimos) => centimos <= VALOR_MAXIMO_CENTIMOS,
      `El valor no puede pasar de ${aMontoDecimal(VALOR_MAXIMO_CENTIMOS)}.`,
    ),
);

/**
 * Probabilidad: entero de 0 a 100; vacía se guarda como 0 (sección 3). Sin
 * decimales: "50.5" se rechaza, no se redondea en silencio.
 */
const probabilidadSchema = z.preprocess(
  (valor) => vacioAUndefined(valor) ?? "0",
  z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, "La probabilidad es un número entero de 0 a 100.")
    .transform(Number)
    .refine(
      (numero) => numero <= 100,
      "La probabilidad es un número entero de 0 a 100.",
    ),
);

const monedaSchema = z.preprocess(
  vacioAUndefined,
  z.enum(MONEDAS, { error: "La moneda debe ser USD o PEN." }).default("USD"),
);

export const etapaSchema = z.enum(ETAPAS_OPORTUNIDAD, {
  error: "Elige una de las etapas del embudo.",
});

/** Campos del modal "Nueva oportunidad" (sección 8 de la spec). */
export const oportunidadCrearSchema = z.object({
  titulo: tituloSchema,
  // Que exista y esté activa lo comprueba la acción contra la base.
  empresa_id: idSchema("Elige una empresa."),
  contacto_id: contactoIdSchema,
  moneda: monedaSchema,
  valor_estimado: valorEstimadoSchema,
  probabilidad: probabilidadSchema,
  etapa: z.preprocess(vacioAUndefined, etapaSchema.default("prospecto")),
  fecha_cierre_estimada: fechaCierreSchema,
});

/**
 * Edición desde el detalle: SOLO título, contacto y fecha estimada de cierre.
 *
 * Empresa, moneda, valor y probabilidad no están, y no deben estar: son fijos
 * después de crear (sección 3). `z.object` descarta las claves que no declara,
 * así que aunque alguien las cuele en el POST no llegan a `resultado.data` ni,
 * por tanto, al UPDATE — el tipo de salida ni siquiera las tiene.
 *
 * No es `z.strictObject` a propósito: rechazar claves de más haría fallar
 * cualquier envío de formulario, porque Next añade al FormData sus propias
 * claves internas (`$ACTION_…`). Descartar es lo que protege; rechazar solo
 * rompería.
 *
 * LOS TRES CAMPOS SON OPCIONALES COMO CLAVE, y eso es distinto de que el
 * valor sea opcional: cada lápiz del detalle edita un solo campo, así que una
 * clave AUSENTE significa "este campo no se toca", mientras que una clave
 * presente y vacía significa "quitar" (contacto o fecha). Si ausente valiera
 * como vacío, editar el título borraría el contacto. El título, si viene,
 * sigue siendo obligatorio.
 */
export const oportunidadEditarSchema = z.object({
  titulo: tituloSchema.optional(),
  contacto_id: contactoIdSchema.optional(),
  fecha_cierre_estimada: fechaCierreSchema.optional(),
});

export const cambioEtapaSchema = z.object({
  id: oportunidadIdSchema,
  etapa: etapaSchema,
});

/** Tope de cordura para los textos largos; las columnas son `text`. */
const MAXIMO_TEXTO_LARGO = 2000;

/** Marcar perdida: motivo OBLIGATORIO (sección 2). */
export const marcarPerdidaSchema = z.object({
  id: oportunidadIdSchema,
  motivo: z
    .string({ error: "El motivo es obligatorio." })
    .trim()
    .min(1, "El motivo es obligatorio.")
    .max(
      MAXIMO_TEXTO_LARGO,
      `El motivo no puede pasar de ${MAXIMO_TEXTO_LARGO} caracteres.`,
    ),
});

/** Anular: motivo OPCIONAL (sección 2); en blanco se guarda como `null`. */
export const anularSchema = z.object({
  id: oportunidadIdSchema,
  motivo: z.preprocess(
    vacioANull,
    z
      .string()
      .trim()
      .max(
        MAXIMO_TEXTO_LARGO,
        `El motivo no puede pasar de ${MAXIMO_TEXTO_LARGO} caracteres.`,
      )
      .nullable()
      .default(null),
  ),
});

/**
 * Fecha y hora de una actividad, como la manda un `<input
 * type="datetime-local">` (`2026-09-25T10:30`, sin zona). Se interpreta en la
 * zona del negocio, no en la del servidor (en Vercel, UTC): quien escribe
 * "10:30" quiere decir las 10:30 de Lima.
 *
 * En blanco o ausente → `undefined`, y la acción NO manda la columna: la pone
 * el `DEFAULT now()` de la base, que es "el momento actual" de la spec.
 * `z.iso.datetime({ local: true })` rechaza fechas y horas imposibles y
 * cualquier texto con zona explícita.
 */
const fechaHoraActividadSchema = z.preprocess(
  vacioAUndefined,
  z.iso
    .datetime({ local: true, error: "Escribe una fecha y hora válidas." })
    .transform(instanteDeFechaHoraLocal)
    .optional(),
);

/** Una actividad nueva (sección 4 de la spec). */
export const actividadSchema = z.object({
  tipo: z.enum(TIPOS_ACTIVIDAD, { error: "Elige el tipo de actividad." }),
  descripcion: z
    .string({ error: "La descripción es obligatoria." })
    .trim()
    .min(1, "La descripción es obligatoria.")
    .max(
      MAXIMO_TEXTO_LARGO,
      `La descripción no puede pasar de ${MAXIMO_TEXTO_LARGO} caracteres.`,
    ),
  fecha_hora: fechaHoraActividadSchema,
});

/** La empresa cuyos contactos pide el selector de contacto. */
export const empresaDelSelectorSchema = idSchema("Falta la empresa.");

// --- Filtros del embudo y de la tabla ---------------------------------------
//
// Vienen de `searchParams`, o sea que son input del usuario. Mismo patrón que
// los demás módulos: `.optional().catch(undefined)` para que un parámetro
// inventado o repetido no reviente la pantalla, solo se ignore.

/** Mismo criterio y mismo tope que `filtroBusquedaSchema` en los otros módulos. */
export const filtroBusquedaSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .optional()
  .catch(undefined);

export const filtroRapidoSchema = z
  .enum(OPCIONES_RAPIDAS)
  .optional()
  .catch(undefined);

/**
 * El `empresa_id` del desplegable Cliente. Solo se comprueba la forma: un id
 * que no existe simplemente no casa con ninguna oportunidad.
 */
export const filtroClienteSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .optional()
  .catch(undefined);

export const filtroValorSchema = z
  .enum(CLAVES_RANGO_VALOR)
  .optional()
  .catch(undefined);

export const filtroEstadoSchema = z
  .enum(ESTADOS_TABLA)
  .optional()
  .catch(undefined);

export const filtroVistaSchema = z.enum(VISTAS).catch("embudo");

export type OportunidadCrearInput = z.infer<typeof oportunidadCrearSchema>;
export type OportunidadEditarInput = z.infer<typeof oportunidadEditarSchema>;
