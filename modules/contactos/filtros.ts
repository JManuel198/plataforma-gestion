/**
 * Los filtros del listado de contactos y cómo se escriben en la URL.
 *
 * Fuera de queries.ts a propósito: este archivo no importa Drizzle ni la
 * conexión, así que lo pueden usar tanto la consulta del servidor como los
 * controles de filtro, que son Client Components. Mismo criterio que
 * `modules/clientes/filtros.ts`.
 */

import { RUTA_LISTADO } from "./constantes";

export type FiltrosContactos = {
  /**
   * Texto libre: casa parcialmente con el nombre, el cargo o el correo del
   * contacto, o con la razón social / nombre comercial de su empresa.
   */
  busqueda?: string;
  /**
   * Ver SOLO los dados de baja. Las dos vistas son excluyentes — nunca activos
   * e inactivos mezclados (ver la convención de AGENTS.md sobre «ver
   * inactivos»).
   */
  inactivos?: boolean;
  /** La página del listado (1-based). No es un filtro. */
  pagina?: number;
};

export function urlListado(filtros: FiltrosContactos = {}): string {
  const params = new URLSearchParams();

  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
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
export function contarFiltros(filtros: FiltrosContactos): number {
  return [filtros.busqueda, filtros.inactivos].filter(Boolean).length;
}
