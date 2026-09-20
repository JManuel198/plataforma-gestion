/**
 * Estado que devuelven las Server Actions al formulario y que consume
 * `useActionState`.
 *
 * Vive fuera de actions.ts porque un archivo con `"use server"` solo puede
 * exportar funciones asíncronas — un objeto exportado ahí rompe el build.
 *
 * VIVE EN core/ DESDE 2026-09-20. Estuvo en modules/ordenes-trabajo/ mientras
 * fue el único módulo que lo usaba, con la nota de que si otro lo necesitaba
 * el sitio era core/ y nunca un import cruzado entre módulos (AGENTS.md,
 * Arquitectura). Ese momento llegó con modules/personal/: los dos módulos lo
 * importan de aquí, que es terreno neutral, y ninguno depende del otro.
 */
export type EstadoFormulario = {
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
  /**
   * Solo lo ponen las variantes de las acciones que NO redirigen, las que usa
   * el modal del listado: marcan "guardado sin problemas" para que el
   * componente pueda cerrar la ventana, avisar y refrescar la tabla.
   *
   * Las variantes que terminan en `redirect()` nunca llegan a devolverlo —
   * `redirect()` corta la ejecución— así que en el formulario de pantalla
   * completa este campo es siempre `undefined`, y eso está bien: allí el
   * éxito se manifiesta como la navegación, no como un valor.
   */
  ok?: true;
};

export const estadoFormularioInicial: EstadoFormulario = {};
