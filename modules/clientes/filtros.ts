/**
 * Los filtros del listado de empresas (Clientes) y cómo se escriben en la URL.
 *
 * Fuera de queries.ts a propósito: este archivo no importa Drizzle ni la
 * conexión, así que lo pueden usar tanto la consulta del servidor como los
 * controles de filtro, que son Client Components. Mismo criterio que
 * `modules/personal/filtros.ts` y `modules/materiales/filtros.ts`.
 */

import { RUTA_LISTADO, type TipoEmpresa } from "./constantes";

export type FiltrosEmpresas = {
  /** Texto libre: casa parcialmente con la razón social o el RUC. */
  busqueda?: string;
  /**
   * INCLUSIVO: `cliente` trae también las `cliente_y_proveedor`, y
   * `proveedor` igual; `cliente_y_proveedor` es exacto. La tabla de
   * equivalencias es `TIPOS_POR_FILTRO` en queries.ts.
   */
  tipo?: TipoEmpresa;
  /**
   * Ver SOLO las dadas de baja. Las dos vistas son excluyentes — nunca activas
   * e inactivas mezcladas (ver la convención de AGENTS.md sobre «ver
   * inactivos»).
   */
  inactivos?: boolean;
  /** La página del listado (1-based). No es un filtro. */
  pagina?: number;
};

export function urlListado(filtros: FiltrosEmpresas = {}): string {
  const params = new URLSearchParams();

  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  // Solo el caso verdadero viaja en la URL: "sin filtro" es la ausencia del
  // parámetro, no un `inactivos=0` que luego haya que distinguir.
  if (filtros.inactivos) params.set("inactivos", "1");

  // Mismo criterio: la primera página es la ausencia del parámetro.
  if (filtros.pagina && filtros.pagina > 1) {
    params.set("pagina", String(filtros.pagina));
  }

  const cadena = params.toString();

  return cadena ? `${RUTA_LISTADO}?${cadena}` : RUTA_LISTADO;
}

/**
 * Cuántos filtros hay puestos: el número de «Limpiar filtros». `pagina` no
 * cuenta: no es un filtro.
 */
export function contarFiltros(filtros: FiltrosEmpresas): number {
  return [filtros.busqueda, filtros.tipo, filtros.inactivos].filter(Boolean)
    .length;
}
