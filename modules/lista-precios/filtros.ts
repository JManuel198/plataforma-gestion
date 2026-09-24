/**
 * Los filtros del listado de Lista de precios y cómo se escriben en la URL.
 *
 * Fuera de queries.ts a propósito: este archivo no importa Drizzle ni la
 * conexión, así que lo pueden usar tanto la consulta del servidor como los
 * controles de filtro, que son Client Components. Mismo criterio que
 * modules/materiales/filtros.ts, modules/personal/filtros.ts y
 * modules/ordenes-trabajo/filtros.ts.
 *
 * `RUTA_LISTADO` NO se redeclara aquí: ya vive en ./constantes.ts, que es de
 * donde la toma también actions.ts para el `revalidatePath`. Dos constantes con
 * la misma ruta serían dos sitios donde equivocarse el día que cambie.
 */

import { RUTA_LISTADO } from "./constantes";

export type FiltrosListaPrecios = {
  /**
   * Texto libre: casa parcialmente con `codigo_oferta`, `proveedor` y la
   * `descripcion` del material relacionado (vía el JOIN que ya hace la
   * consulta).
   *
   * LAS TRES COLUMNAS SON LAS QUE ALGUIEN RECUERDA DE UNA OFERTA: el número
   * que le dieron, quién la ofreció, o qué se estaba cotizando. Quedan fuera
   * `unidad` —un puñado de valores repetidos, "und" traería medio catálogo,
   * mismo criterio que la `unidad` de Materiales— y los números (`cantidad`,
   * `precio_lista`, `descuento`), que no se buscan por coincidencia parcial:
   * "150" casando con 1.50, 150 y 2150 no ayuda a nadie.
   *
   * La descripción del material se busca en `materiales`, no en una copia:
   * esta tabla no guarda el texto del material, solo su FK.
   */
  busqueda?: string;
  /**
   * Ver SOLO las ofertas inactivas. Las dos vistas son excluyentes: sin esta
   * bandera se ven las activas, con ella únicamente las inactivas — nunca las
   * dos cosas mezcladas. Ausente es el comportamiento por defecto: de cara al
   * usuario, inactivar se ve como borrar, y lo borrado no aparece salvo que se
   * pida verlo.
   *
   * No es "incluir además las inactivas", que es lo que hacían Materiales y
   * Personal y era un bug: al reactivar una fila desde esa vista, seguía
   * apareciendo ahí (ver la deuda técnica del 2026-09-21 en AGENTS.md).
   */
  inactivos?: boolean;
  /**
   * La página del listado (1-based). No es un filtro: no cuenta en «Limpiar
   * filtros» y se pierde al cambiar cualquier filtro (lo quita
   * `useFiltrosListado`). Ausente es la primera página.
   */
  pagina?: number;
};

export function urlListado(filtros: FiltrosListaPrecios = {}): string {
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
 * Cuántos filtros hay puestos: el número de «Limpiar filtros», y el que decide
 * qué estado vacío se enseña (catálogo vacío o búsqueda sin resultados).
 * «Ver solo inactivos» cuenta como filtro: «Limpiar filtros» también lo apaga.
 */
export function contarFiltros(filtros: FiltrosListaPrecios): number {
  return [filtros.busqueda, filtros.inactivos].filter(Boolean).length;
}
