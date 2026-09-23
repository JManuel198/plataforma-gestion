/**
 * Los filtros del listado del Tarifario de personal y cómo se escriben en la
 * URL.
 *
 * Fuera de queries.ts a propósito: este archivo no importa Drizzle ni la
 * conexión, así que lo pueden usar tanto la consulta del servidor como los
 * controles de filtro, que son Client Components. Mismo criterio que
 * `modules/materiales/filtros.ts`, `modules/servicios/filtros.ts`,
 * `modules/lista-precios/filtros.ts` y `modules/ordenes-trabajo/filtros.ts`.
 *
 * DOS FILTROS: buscador de texto y "Ver solo inactivos". La pareja es la misma
 * que en Materiales y Lista de precios —los dos catálogos que sí tienen columna
 * `activo`— y no la de Servicios, que solo tiene buscador porque allí no hay
 * nada que inactivar.
 */

import { RUTA_LISTADO } from "./constantes";

export type FiltrosTarifario = {
  /**
   * Texto libre: casa parcialmente con `codigo`, `cargo` y `unidad`.
   *
   * LAS TRES COLUMNAS DE TEXTO DE LA TABLA, sin dejar ninguna fuera. Es la
   * misma decisión que se tomó en Servicios y por el mismo motivo, no un
   * descuido frente a Materiales y Lista de precios (que sí excluyen `unidad`
   * porque "un puñado de valores repetidos… traería medio catálogo"). Ese
   * argumento pesa menos aquí: esta tabla tiene TRES columnas de texto en
   * total, así que dejar `unidad` fuera habría dejado el buscador cubriendo dos
   * tercios del vocabulario en vez de todo.
   *
   * Además, aquí `unidad` discrimina de verdad: son periodos de tiempo (hora,
   * día, mes, año), así que buscar "mes" es una pregunta con sentido —«¿qué
   * cargos tengo tarifados por mes?»— y no el "UND" que traería el catálogo
   * entero de Materiales.
   *
   * Los NÚMEROS quedan fuera (`costo`), igual que en los otros catálogos: una
   * coincidencia parcial donde "150" casa con 1.50, 150 y 2150 no ayuda a
   * nadie. Y `moneda` tampoco: son dos valores, así que buscar "PEN" partiría
   * la tabla por la mitad sin responder nada.
   */
  busqueda?: string;
  /**
   * Ver SOLO las tarifas inactivas. Las dos vistas son excluyentes: sin esta
   * bandera se ven las activas, con ella únicamente las inactivas — nunca las
   * dos cosas mezcladas. Ausente es el comportamiento por defecto: de cara al
   * usuario, inactivar se ve como borrar, y lo borrado no aparece salvo que se
   * pida verlo.
   *
   * No es "incluir además las inactivas", que es lo que hacía Materiales antes
   * y era un bug: al reactivar una fila desde esa vista, seguía apareciendo
   * ahí (deuda técnica de AGENTS.md, 2026-09-21).
   */
  inactivos?: boolean;
};

/**
 * La URL del listado con los filtros puestos. Existe para que los dos filtros
 * se combinen en vez de pisarse: cada control navega con
 * `{ ...filtrosActuales, loQueCambió }`, nunca escribiendo a mano una URL con
 * un solo parámetro.
 *
 * Un filtro vacío no aparece en la URL — así "sin filtro" es la ausencia del
 * parámetro y no una cadena vacía (o un `inactivos=0`) que luego haya que
 * distinguir de `undefined`.
 */
export function urlListado(filtros: FiltrosTarifario = {}): string {
  const params = new URLSearchParams();

  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.inactivos) params.set("inactivos", "1");

  const cadena = params.toString();

  return cadena ? `${RUTA_LISTADO}?${cadena}` : RUTA_LISTADO;
}

/** Si hay al menos un filtro puesto — para el mensaje de lista vacía. */
export function hayFiltros(filtros: FiltrosTarifario): boolean {
  return Boolean(filtros.busqueda || filtros.inactivos);
}
