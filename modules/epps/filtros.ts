/**
 * Los filtros del listado de EPPs y cómo se escriben en la URL.
 *
 * Fuera de queries.ts a propósito: este archivo no importa Drizzle ni la
 * conexión, así que lo pueden usar tanto la consulta del servidor como los
 * controles de filtro, que son Client Components. Mismo criterio que
 * `modules/servicios/filtros.ts`, `modules/tarifario-personal/filtros.ts`,
 * `modules/materiales/filtros.ts`, `modules/lista-precios/filtros.ts` y
 * `modules/ordenes-trabajo/filtros.ts`.
 *
 * UN SOLO FILTRO, Y ES EL LISTADO MÁS SIMPLE DEL PROYECTO. Los demás combinan
 * dos o más: Materiales, Lista de precios y Tarifario llevan buscador e
 * «inactivos»; Servicios, buscador y categoría; OT, estado, rango de fechas y
 * buscador. Aquí solo hay buscador, y las dos ausencias son deliberadas:
 *
 * - **Sin `inactivos`**: esta tabla no tiene columna `activo` y no la tendrá —
 *   el encargo dice que la baja lógica no aplica a este catálogo (ver la ficha
 *   de EPPs en docs/spec/entidades.md y la decisión 6 de "Catálogos maestros"
 *   en preguntas-abiertas.md). No hay nada que alternar. Ojo con la diferencia
 *   frente a Servicios, que tampoco lo tiene pero por estar sin confirmar.
 * - **Sin filtro de categoría**: esta tabla no tiene ninguna columna de lista
 *   cerrada que valga la pena filtrar aparte, al contrario que
 *   `servicios.categoria`.
 *
 * Que haya un solo filtro NO justifica escribir la URL a mano en el buscador:
 * `urlListado` se queda igual porque es la pieza que `useFiltrosListado`
 * (core/use-filtros-listado.ts) recibe como segundo argumento, y porque el día
 * que aparezca un segundo filtro los dos tienen que combinarse en vez de
 * pisarse sin reescribir el control.
 */

import { RUTA_LISTADO } from "./constantes";

export type FiltrosEpps = {
  /**
   * Texto libre: casa parcialmente con `codigo`, `descripcion` y `unidad`.
   *
   * LAS TRES COLUMNAS DE TEXTO DE LA TABLA, sin dejar ninguna fuera. Es la
   * misma decisión que ya tomaron Servicios y Tarifario de personal, y por el
   * mismo motivo — no un descuido frente a Materiales y Lista de precios, que
   * sí excluyen su `unidad` porque "un puñado de valores repetidos… traería
   * medio catálogo". Ese argumento pesa menos aquí: esta tabla tiene TRES
   * columnas de texto en total, así que dejar `unidad` fuera habría dejado el
   * buscador cubriendo dos tercios del vocabulario en vez de todo.
   *
   * Dicho esto, conviene no copiar el argumento de Tarifario tal cual: allí
   * `unidad` son periodos de tiempo y discrimina de verdad («¿qué cargos tengo
   * tarifados por mes?»). Aquí `unidad` es la lista física (und, par, cja…) y
   * se parece más al caso de Materiales, donde un "und" repetido trae media
   * tabla. Entra igualmente porque con solo tres columnas de texto el coste de
   * incluirla es un resultado ancho de vez en cuando, y el de excluirla es que
   * el usuario no encuentre lo que sí escribió. Si el catálogo crece y "und"
   * se vuelve ruido, sacarla es quitar un `ilike` de `queries.ts` y una palabra
   * del `placeholder`.
   *
   * Los NÚMEROS quedan fuera (`precio`), igual que en los otros catálogos: una
   * coincidencia parcial donde "150" casa con 1.50, 150 y 2150 no ayuda a
   * nadie. Y `moneda` tampoco: son dos valores, así que buscar "PEN" partiría
   * la tabla por la mitad sin responder nada.
   */
  busqueda?: string;
  /**
   * La página del listado (1-based). No es un filtro: no cuenta en «Limpiar
   * filtros» y se pierde al cambiar cualquier filtro (lo quita
   * `useFiltrosListado`). Ausente es la primera página.
   */
  pagina?: number;
};

/**
 * La URL del listado con los filtros puestos.
 *
 * Con un solo filtro esto parece de más, y a propósito no lo es: es el segundo
 * argumento de `useFiltrosListado`, que es quien mezcla los cambios con los
 * filtros ya puestos. Escribir la URL a mano en el buscador ahorraría este
 * archivo hoy y obligaría a reescribir el control el día que entre un segundo
 * filtro — que es justo el error que `urlListado` existe para evitar en los
 * otros seis listados.
 *
 * Un filtro vacío no aparece en la URL — así "sin filtro" es la ausencia del
 * parámetro y no una cadena vacía que luego haya que distinguir de
 * `undefined`.
 */
export function urlListado(filtros: FiltrosEpps = {}): string {
  const params = new URLSearchParams();

  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);

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
export function contarFiltros(filtros: FiltrosEpps): number {
  return [filtros.busqueda].filter(Boolean).length;
}
