import { z } from "zod";

// Nada que venga del formulario de perfil toca la base sin pasar por aquí
// (regla 1 de AGENTS.md: la validación vive en el backend).

/**
 * Convierte "" (campo dejado en blanco) en `null` antes de validar.
 *
 * No es cosmético: `user.dni` es UNIQUE, y en PostgreSQL varios NULL conviven
 * pero dos cadenas vacías chocan. Sin esto, el segundo usuario que deje el
 * DNI en blanco recibiría "ese DNI ya está registrado". Ver
 * docs/spec/entidades.md, sección Usuario.
 */
const vacioANull = (valor: unknown) =>
  typeof valor === "string" && valor.trim() === "" ? null : valor;

/**
 * DNI peruano: ocho dígitos exactos. Mismo SUPUESTO que `dniSchema` de
 * modules/personal/schema.ts (preguntas-abiertas.md, Personal, supuesto 1),
 * copiado y no importado: un módulo no depende de otro (AGENTS.md,
 * Arquitectura). Si el cliente confirma otro formato, cambia en los dos.
 *
 * A diferencia de Personal, aquí es opcional: las cuentas existentes no lo
 * tienen cargado.
 */
const dniPerfilSchema = z.preprocess(
  vacioANull,
  z
    .string()
    .trim()
    .regex(/^\d{8}$/, "El DNI debe tener exactamente 8 dígitos.")
    .nullable(),
);

/**
 * Teléfono: dígitos con los separadores habituales (espacio, guion,
 * paréntesis) y un `+` inicial opcional, entre 6 y 15 dígitos reales.
 *
 * SUPUESTO, no confirmado — registrado en preguntas-abiertas.md (Ajustes de
 * usuario). Es deliberadamente permisivo: fijo con código de ciudad, celular
 * de 9 dígitos y formato internacional pasan. Se guarda tal como se escribió
 * (recortado); no se normaliza.
 */
const telefonoPerfilSchema = z.preprocess(
  vacioANull,
  z
    .string()
    .trim()
    .max(25, "El teléfono no puede pasar de 25 caracteres.")
    .regex(
      /^\+?[\d\s()-]+$/,
      "El teléfono solo puede llevar dígitos, espacios, guiones, paréntesis y un + inicial.",
    )
    .refine((valor) => {
      const digitos = valor.replace(/\D/g, "").length;
      return digitos >= 6 && digitos <= 15;
    }, "El teléfono debe tener entre 6 y 15 dígitos.")
    .nullable(),
);

/**
 * Lo único que el usuario puede cambiar de su propia cuenta.
 *
 * `email` NO está, y no debe estarlo: `z.object` descarta cualquier clave que
 * no declare, así que aunque alguien añada `email` al POST, nunca llega a
 * `resultado.data`. La acción además escribe columnas nombradas una a una,
 * no un spread. Tampoco están `role` ni `activo` (fuera de alcance: ver
 * AGENTS.md, Módulo de ajustes de usuario), ni ningún `id`: el usuario se
 * toma de la sesión, nunca del formulario.
 */
export const perfilEditarSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(200, "El nombre no puede pasar de 200 caracteres."),
  dni: dniPerfilSchema,
  telefono: telefonoPerfilSchema,
});

export type PerfilEditarInput = z.infer<typeof perfilEditarSchema>;
