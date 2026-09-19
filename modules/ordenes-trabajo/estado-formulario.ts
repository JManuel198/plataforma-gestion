/**
 * Estado que devuelven las Server Actions al formulario y que consume
 * `useActionState`.
 *
 * Vive fuera de actions.ts porque un archivo con `"use server"` solo puede
 * exportar funciones asíncronas — un objeto exportado ahí rompe el build.
 *
 * Ya no tiene gemelo: modules/servicios/ desapareció al fusionarse Servicio y
 * OT en una sola entidad, así que este es el único. Si otro módulo lo vuelve
 * a necesitar, el sitio para unificarlo es core/, no un import cruzado entre
 * módulos (AGENTS.md, Arquitectura).
 */
export type EstadoFormulario = {
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
};

export const estadoFormularioInicial: EstadoFormulario = {};
