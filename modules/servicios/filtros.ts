/**
 * Los filtros del listado de Servicios y cómo se escriben en la URL.
 *
 * Fuera de queries.ts a propósito: este archivo no importa Drizzle ni la
 * conexión, así que lo pueden usar tanto la consulta del servidor como los
 * controles de filtro, que son Client Components. Mismo criterio que
 * `modules/materiales/filtros.ts`, `modules/lista-precios/filtros.ts` y
 * `modules/ordenes-trabajo/filtros.ts`.
 *
 * DOS FILTROS, NO TRES: a diferencia de Materiales y Lista de precios, no hay
 * `inactivos` — esta tabla no tiene columna `activo` (ver la ficha de
 * Servicios en docs/spec/entidades.md), así que no hay nada que alternar.
 */

import type { CategoriaServicio } from "./constantes";
import { RUTA_LISTADO } from "./constantes";

export type FiltrosServicios = {
  /**
   * Texto libre: casa parcialmente con `codigo`, `servicio` y `unidad`.
   *
   * `unidad` SÍ entra aquí, y eso es una diferencia deliberada frente a
   * Materiales y Lista de precios, donde queda fuera del buscador porque "un
   * puñado de valores repetidos… traería medio catálogo" (ver
   * `.claude/skills/shadcn-conventions/SKILL.md`, sección "Catálogos
   * maestros"). Ese argumento pesa menos aquí: Servicios solo tiene TRES
   * columnas de texto en total (`codigo`, `servicio`, `unidad` — `categoria`
   * ya tiene su propio filtro de lista cerrada y no necesita buscador), así
   * que dejar `unidad` fuera habría dejado el buscador cubriendo dos tercios
   * del vocabulario en vez de todo. Encargo explícito de la Parte 2: incluir
   * las tres.
   */
  busqueda?: string;
  /**
   * La categoría elegida, o ausente para "todas". Se combina con `busqueda`
   * mediante AND en la consulta — igual que `estado` se combina con `busqueda`
   * y las fechas en Órdenes de Trabajo (`FiltrosOt`, mismo criterio).
   */
  categoria?: CategoriaServicio;
  /**
   * La página del listado (1-based). No es un filtro: no cuenta en «Limpiar
   * filtros» y se pierde al cambiar cualquier filtro (lo quita
   * `useFiltrosListado`). Ausente es la primera página.
   */
  pagina?: number;
};

/**
 * La URL del listado con los filtros puestos. Existe para que los dos filtros
 * se combinen en vez de pisarse: cada control navega con
 * `{ ...filtrosActuales, loQueCambió }`, nunca escribiendo a mano una URL con
 * un solo parámetro.
 *
 * Un filtro vacío no aparece en la URL — así "sin filtro" es la ausencia del
 * parámetro y no una cadena vacía que luego haya que distinguir de
 * `undefined`.
 */
export function urlListado(filtros: FiltrosServicios = {}): string {
  const params = new URLSearchParams();

  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.categoria) params.set("categoria", filtros.categoria);

  // Mismo criterio: la primera página es la ausencia del parámetro.
  if (filtros.pagina && filtros.pagina > 1) {
    params.set("pagina", String(filtros.pagina));
  }

  const cadena = params.toString();

  return cadena ? `${RUTA_LISTADO}?${cadena}` : RUTA_LISTADO;
}

/**
 * Cuántos filtros hay puestos: el número de «Limpiar filtros», y el que decide
 * qué estado vacío se enseña (catálogo vacío o búsqueda sin resultados).
 * `pagina` no cuenta: no es un filtro.
 */
export function contarFiltros(filtros: FiltrosServicios): number {
  return [filtros.busqueda, filtros.categoria].filter(Boolean).length;
}
