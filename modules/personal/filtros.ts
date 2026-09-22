/**
 * Los filtros del listado de Personal y cómo se escriben en la URL.
 *
 * Fuera de queries.ts a propósito: este archivo no importa Drizzle ni la
 * conexión, así que lo pueden usar tanto la consulta del servidor como los
 * controles de filtro, que son Client Components. Mismo criterio que
 * modules/ordenes-trabajo/filtros.ts.
 */

export const RUTA_LISTADO = "/personal";

export type FiltrosPersonal = {
  /** Texto libre: casa parcialmente con nombre, apellido, dni o cargo. */
  busqueda?: string;
  /**
   * Ver SOLO a quien está de baja. Las dos vistas son excluyentes: sin esta
   * bandera se ve al personal activo, con ella únicamente a los dados de baja
   * — nunca las dos cosas mezcladas. Ausente es el comportamiento por
   * defecto: de cara al usuario, dar de baja se ve como borrar, y lo borrado
   * no aparece salvo que se pida verlo.
   *
   * No es "incluir además a los dados de baja", que es lo que hacía antes y
   * era un bug: al reactivar a alguien desde esa vista, seguía apareciendo.
   */
  inactivos?: boolean;
};

export function urlListado(filtros: FiltrosPersonal = {}): string {
  const params = new URLSearchParams();

  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  // Solo el caso verdadero viaja en la URL: "sin filtro" es la ausencia del
  // parámetro, no un `inactivos=0` que luego haya que distinguir.
  if (filtros.inactivos) params.set("inactivos", "1");

  const cadena = params.toString();

  return cadena ? `${RUTA_LISTADO}?${cadena}` : RUTA_LISTADO;
}

/** Si hay al menos un filtro puesto — para el mensaje de lista vacía. */
export function hayFiltros(filtros: FiltrosPersonal): boolean {
  return Boolean(filtros.busqueda || filtros.inactivos);
}
