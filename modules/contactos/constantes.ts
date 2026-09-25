export const RUTA_LISTADO = "/contactos";

/**
 * Tope de resultados del selector de empresa del formulario de contacto
 * (`listarEmpresasParaSelector`). Es un combobox de búsqueda, no un listado:
 * si la empresa no está entre las 50 primeras, lo que toca es afinar el texto.
 * Más alto que el 10 del selector de Materiales porque este también se abre
 * sin texto (ver queries.ts) y conviene que muestre algo más que una pantalla.
 */
export const MAXIMO_EMPRESAS_SELECTOR = 50;
