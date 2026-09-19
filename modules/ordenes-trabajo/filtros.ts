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
  /** Texto libre: casa parcialmente con codigo_ot, cliente o asunto. */
  busqueda?: string;
  /** `YYYY-MM-DD`, ya validada (ver `filtroFechaSchema` en schema.ts). */
  desde?: string;
  /** `YYYY-MM-DD`, ya validada. Inclusiva: incluye todo ese día. */
  hasta?: string;
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

  const cadena = params.toString();

  return cadena ? `${RUTA_LISTADO}?${cadena}` : RUTA_LISTADO;
}

/** Si hay al menos un filtro puesto — para el mensaje de lista vacía. */
export function hayFiltros(filtros: FiltrosOt): boolean {
  return Boolean(
    filtros.estado || filtros.busqueda || filtros.desde || filtros.hasta,
  );
}
