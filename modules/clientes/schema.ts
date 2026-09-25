import { z } from "zod";
import { PATRON_RUC, TIPOS_EMPRESA } from "./constantes";

// Nada que venga del formulario toca la base sin pasar por aquí (regla 1 de
// AGENTS.md: la validación vive en el backend).
//
// DOS CAMPOS NO ESTÁN Y NO DEBEN ESTAR:
// - `codigo`: lo genera el backend con el correlativo atómico (ver codigo.ts y
//   core/correlativo.ts). Si viajara en el FormData, un POST directo podría
//   fijarlo y saltarse el contador. Mismo criterio que `codigo` en EPPs.
// - `activo`: se da de alta activa por el `DEFAULT true` de la columna y se
//   cambia con su propia acción (`alternarActivoEmpresa`), nunca editando el
//   formulario entero. Mismo criterio que Personal y Materiales.
//
// `estado` y `condicion` SÍ están, aunque sean datos de SUNAT: la consulta de
// RUC (`consultarRuc`) solo los sugiere y es el formulario quien los manda al
// guardar. Son informativos (ver el encabezado de db/schema/empresas.ts), así
// que se validan como texto libre y nada más.

/**
 * Convierte "" (campo dejado en blanco) en `null` antes de validar. Mismo
 * ayudante que modules/ajustes-usuario/schema.ts, copiado y no importado (un
 * módulo no depende de otro).
 *
 * No es cosmético en `ruc`: es UNIQUE, y en PostgreSQL varios NULL conviven
 * pero dos cadenas vacías chocan — además de que "" no pasaría el CHECK de 11
 * dígitos. En el resto evita guardar cadenas vacías donde lo que hay es "sin
 * dato".
 */
const vacioANull = (valor: unknown) =>
  typeof valor === "string" && valor.trim() === "" ? null : valor;

/**
 * Texto opcional: en blanco (o ausente del FormData) se guarda como `null`.
 * Los topes son de cordura, no reglas de negocio — las columnas son `text` sin
 * longitud. Van holgados porque varios de estos campos se llenan con lo que
 * devuelve SUNAT, y rechazar una dirección real por un tope inventado sería
 * peor que no tenerlo.
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
 * RUC: opcional (una empresa extranjera no tiene), pero si viene, 11 dígitos
 * exactos. Que sea obligatorio para empresas peruanas es pregunta abierta
 * (supuesto 23 de docs/spec/preguntas-abiertas.md): no se exige aquí.
 */
export const rucSchema = z
  .string()
  .trim()
  .regex(PATRON_RUC, "El RUC debe tener exactamente 11 dígitos.");

const rucOpcionalSchema = z.preprocess(
  vacioANull,
  rucSchema.nullable().default(null),
);

export const tipoEmpresaSchema = z.enum(TIPOS_EMPRESA, {
  error: "Elige si la empresa es cliente, proveedor o ambas.",
});

/**
 * País como código ISO 3166-1 alfa-2. En blanco → `'PE'`, el mismo default que
 * la columna (decidido el 2026-09-25): se aplica aquí explícitamente porque la
 * acción SÍ menciona `pais` en el INSERT, y un `null` explícito saltaría el
 * `DEFAULT` de la base.
 *
 * Se pasa a mayúsculas antes de validar: "pe" es inequívocamente `PE`, y
 * rechazarlo solo por la caja sería un error sin utilidad.
 *
 * SOLO SE VALIDA LA FORMA (dos letras), igual que el CHECK
 * `empresas_pais_iso_check`. La ficha de entidades.md prevé que el Zod valide
 * además que el código exista en la lista del combobox; esa lista todavía no
 * existe (llega con la pantalla), así que cuando exista, el sitio es aquí.
 */
const paisSchema = z.preprocess(
  (valor) => {
    const limpio = vacioANull(valor);
    return typeof limpio === "string" ? limpio.trim().toUpperCase() : limpio;
  },
  z
    .string()
    .regex(/^[A-Z]{2}$/, "El país debe ser un código de 2 letras (ej. PE).")
    .nullable()
    .default(null)
    .transform((pais) => pais ?? "PE"),
);

/** Campos que el formulario de empresa manda al crear o editar. */
export const empresaDatosSchema = z.object({
  // Único campo de texto obligatorio, así que sin ayudante: el
  // `textoObligatorio` de otros módulos dice "es obligatorio", y "razón
  // social" es femenino.
  razon_social: z
    .string()
    .trim()
    .min(1, "La razón social es obligatoria.")
    .max(300, "La razón social no puede pasar de 300 caracteres."),
  ruc: rucOpcionalSchema,
  tipo: tipoEmpresaSchema,
  nombre_comercial: textoOpcional("El nombre comercial", 300),
  nombre_corto: textoOpcional("El nombre corto", 100),
  tipo_contribuyente: textoOpcional("El tipo de contribuyente", 200),
  descripcion_rubro: textoOpcional("La descripción del rubro", 300),
  estado: textoOpcional("El estado SUNAT", 100),
  condicion: textoOpcional("La condición SUNAT", 100),
  direccion: textoOpcional("La dirección", 500),
  distrito: textoOpcional("El distrito", 100),
  provincia: textoOpcional("La provincia", 100),
  departamento: textoOpcional("El departamento", 100),
  pais: paisSchema,
});

/**
 * El identificador que llega como argumento suelto (`actualizarEmpresa`,
 * `alternarActivoEmpresa`). Los tipos de TypeScript no protegen nada en
 * runtime: una Server Action es un endpoint y puede llegar cualquier cosa.
 */
export const empresaIdSchema = z
  .string()
  .trim()
  .min(1, "Falta el identificador de la empresa.");

/**
 * Alta o baja desde el listado. Esquema aparte y mínimo, igual que
 * `personaCambioActivoSchema`: la acción escribe una sola columna.
 */
export const empresaCambioActivoSchema = z.object({
  id: empresaIdSchema,
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
 * `?inactivos=1` muestra SOLO las empresas dadas de baja (vistas excluyentes,
 * ver `condicionesListado` en queries.ts). Cualquier otro valor se ignora.
 */
export const filtroInactivosSchema = z
  .literal("1")
  .optional()
  .catch(undefined);

/** `?tipo=cliente`. Un valor fuera del enum se ignora. */
export const filtroTipoSchema = z
  .enum(TIPOS_EMPRESA)
  .optional()
  .catch(undefined);

export type EmpresaDatosInput = z.infer<typeof empresaDatosSchema>;
