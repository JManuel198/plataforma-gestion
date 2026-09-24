"use client";

import { BuscadorListado } from "@/core/components/buscador-listado";
import { urlListado, type FiltrosListaPrecios } from "../filtros";

/**
 * Buscador del listado. El texto viaja en la URL
 * (`/lista-precios?busqueda=ferreteria`) y la coincidencia la resuelve el
 * `ILIKE` de queries.ts sobre `codigo_oferta`, `proveedor` y la `descripcion`
 * del material — aquí no se filtra nada: la pantalla nunca llega a tener en
 * memoria las filas que no coinciden.
 *
 * Una sola caja para los tres campos, no tres cajas: quien busca una oferta
 * recuerda el número que le dieron, quién la ofreció o qué se estaba
 * cotizando, sin saber de antemano en qué columna cae.
 *
 * OJO CON EL TERCERO, que es el que distingue a este buscador del de
 * Materiales: la descripción del material NO está en `lista_precios`. Sale del
 * JOIN contra `materiales` que la consulta ya hacía para pintar la columna —
 * ver el `or(...)` de queries.ts. Es la razón de que esto se resuelva en el
 * servidor y no filtrando en memoria un arreglo ya traído: media búsqueda vive
 * en otra tabla.
 *
 * NO CONFUNDIR CON EL BUSCADOR DEL MODAL: aquel elige un material o sugiere un
 * proveedor y nunca toca la URL (ver `core/components/buscador-seleccion.tsx`).
 * Este filtra la tabla y por eso vive en `searchParams`, donde es compartible
 * por enlace y sobrevive a un refresh.
 *
 * La mecánica (pausa de tecleo, `replace`, vaciarse al limpiar filtros) vive
 * en `core/components/buscador-listado.tsx`, común a todos los listados; este
 * archivo solo le pasa la `urlListado` del módulo y el texto de ejemplo.
 */
export function BuscadorListaPrecios({
  filtros,
}: {
  filtros: FiltrosListaPrecios;
}) {
  return (
    <BuscadorListado
      filtros={filtros}
      urlListado={urlListado}
      placeholder="Buscar por código, material o proveedor"
    />
  );
}
