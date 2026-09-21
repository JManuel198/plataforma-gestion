/**
 * Los filtros del listado de Materiales y cómo se escriben en la URL.
 *
 * Fuera de queries.ts a propósito: este archivo no importa Drizzle ni la
 * conexión, así que lo pueden usar tanto la consulta del servidor como los
 * controles de filtro, que son Client Components. Mismo criterio que
 * modules/personal/filtros.ts y modules/ordenes-trabajo/filtros.ts.
 */

export const RUTA_LISTADO = "/materiales";

export type FiltrosMateriales = {
  /**
   * Texto libre: casa parcialmente con `codigo_interno`, `descripcion`,
   * `marca` o `modelo`. NO busca en `unidad` ni en `codigo_fabrica` — la
   * unidad es un puñado de valores repetidos ("UND" traería medio catálogo) y
   * el código de fábrica todavía no se sabe si el usuario lo conoce de
   * memoria. Si hace falta, se añaden al `or(...)` de queries.ts.
   */
  busqueda?: string;
  /**
   * Incluir los materiales inactivos. Ausente = solo activos, que es el
   * comportamiento por defecto: de cara al usuario, inactivar se ve como
   * borrar, y lo borrado no aparece salvo que se pida verlo.
   */
  inactivos?: boolean;
};

export function urlListado(filtros: FiltrosMateriales = {}): string {
  const params = new URLSearchParams();

  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  // Solo el caso verdadero viaja en la URL: "sin filtro" es la ausencia del
  // parámetro, no un `inactivos=0` que luego haya que distinguir.
  if (filtros.inactivos) params.set("inactivos", "1");

  const cadena = params.toString();

  return cadena ? `${RUTA_LISTADO}?${cadena}` : RUTA_LISTADO;
}

/** Si hay al menos un filtro puesto — para el mensaje de lista vacía. */
export function hayFiltros(filtros: FiltrosMateriales): boolean {
  return Boolean(filtros.busqueda || filtros.inactivos);
}
