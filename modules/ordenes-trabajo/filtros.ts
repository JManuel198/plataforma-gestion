import type { EstadoOt } from "./constantes";

/**
 * Los filtros del listado de OT y cómo se escriben en la URL.
 *
 * Vive fuera de queries.ts a propósito: este archivo no importa Drizzle ni la
 * conexión a la base de datos, así que lo pueden usar tanto la consulta del
 * servidor como los componentes de filtro, que son Client Components. Mismo
 * criterio que constantes.ts.
 */

export const RUTA_LISTADO = "/ordenes-trabajo";

export type FiltrosOt = {
  estado?: EstadoOt;
  /** Texto libre: casa parcialmente con codigo_ot, cliente o servicio. */
  busqueda?: string;
  /** `YYYY-MM-DD`, ya validada (ver `filtroFechaSchema` en schema.ts). */
  desde?: string;
  /** `YYYY-MM-DD`, ya validada. Inclusiva: incluye todo ese día. */
  hasta?: string;
  /**
   * La página del listado (1-based). No es un filtro: no cuenta en «Limpiar
   * filtros» y se pierde al cambiar cualquier filtro (lo quita
   * `useFiltrosListado`). Ausente es la primera página.
   */
  pagina?: number;
};

/**
 * La URL del listado con los filtros puestos. Existe para que los tres
 * filtros (estado, búsqueda, fechas) se combinen en vez de pisarse: cada
 * control navega con `{ ...filtrosActuales, loQueCambió }`, nunca escribiendo
 * a mano una URL con un solo parámetro.
 *
 * Un filtro vacío no aparece en la URL — así "sin filtro" es la ausencia del
 * parámetro y no una cadena vacía que luego haya que distinguir de `undefined`.
 */
export function urlListado(filtros: FiltrosOt = {}): string {
  const params = new URLSearchParams();

  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);

  // Mismo criterio: la primera página es la ausencia del parámetro.
  if (filtros.pagina && filtros.pagina > 1) {
    params.set("pagina", String(filtros.pagina));
  }

  const cadena = params.toString();

  return cadena ? `${RUTA_LISTADO}?${cadena}` : RUTA_LISTADO;
}

/**
 * Cuántos filtros hay puestos: el número de «Limpiar filtros», y el que decide
 * qué estado vacío se enseña. El RANGO DE FECHAS CUENTA COMO UNO aunque viaje en
 * dos parámetros (`desde`, `hasta`): para quien lo usa es un solo filtro, y un
 * «2» por haber puesto las dos puntas del mismo rango confundiría. `pagina` no
 * cuenta: no es un filtro.
 */
export function contarFiltros(filtros: FiltrosOt): number {
  return [
    filtros.estado,
    filtros.busqueda,
    filtros.desde || filtros.hasta,
  ].filter(Boolean).length;
}
