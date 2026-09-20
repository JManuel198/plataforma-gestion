/**
 * Lo que devuelve una Server Action que NO nace de un `<form>`:
 * `actualizarEstadoOrdenTrabajo`, que se invoca desde el Select de una fila
 * del listado de OT, y `darDeBajaPersona`, desde el botón de baja de
 * Personal.
 *
 * Vive en core/ por lo mismo que `estado-formulario.ts`: lo usan dos módulos
 * de negocio y ninguno debe importar del otro.
 *
 * No reutiliza `EstadoFormulario` porque no es un estado de formulario: no
 * hay `useActionState` detrás ni errores por campo que pintar debajo de un
 * input. El resultado es binario y quien lo recibe decide entre un toast de
 * éxito y uno de error.
 *
 * Vive fuera de actions.ts por la misma razón que `EstadoFormulario`: un
 * archivo con `"use server"` solo puede exportar funciones asíncronas.
 */
export type ResultadoAccion = { ok: true } | { ok: false; mensaje: string };
