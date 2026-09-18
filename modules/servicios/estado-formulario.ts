/**
 * Estado que devuelven las Server Actions al formulario y que consume
 * `useActionState`.
 *
 * Vive fuera de actions.ts porque un archivo con `"use server"` solo puede
 * exportar funciones asíncronas — un objeto exportado ahí rompe el build.
 */
export type EstadoFormulario = {
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
};

export const estadoFormularioInicial: EstadoFormulario = {};
