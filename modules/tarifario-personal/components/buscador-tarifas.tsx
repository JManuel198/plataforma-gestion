"use client";

import { BuscadorListado } from "@/core/components/buscador-listado";
import { urlListado, type FiltrosTarifario } from "../filtros";

/**
 * Buscador del listado. El texto viaja en la URL
 * (`/tarifario-personal?busqueda=operario`) y la coincidencia la resuelve el
 * `ILIKE` de queries.ts sobre `codigo`, `cargo` y `unidad` — aquí no se filtra
 * nada: la pantalla nunca llega a tener en memoria las filas que no coinciden
 * (regla 1 de AGENTS.md).
 *
 * El texto del usuario pasa por `patronParcial` de `core/busqueda.ts` antes de
 * llegar al `ILIKE`, importado y nunca copiado — sin ese escape, un `%` escrito
 * en esta caja actuaría como comodín.
 *
 * Una sola caja para las tres columnas, no tres cajas: quien busca una tarifa
 * escribe lo que recuerda —el código, el cargo o el periodo— sin saber de
 * antemano en qué columna cae.
 *
 * NO ES EL BUSCADOR DEL MODAL, aunque los dos busquen sobre esta misma tabla.
 * Aquel (`CampoConSugerencias` sobre `buscarCargosAction`) elige un valor para
 * rellenar un campo y NO toca la URL; este filtra la tabla y vive entero en
 * `searchParams`. La distinción está en la skill de convenciones, sección
 * "Elegir un registro dentro de un formulario".
 *
 * La mecánica (pausa de tecleo, `replace`, vaciarse al limpiar filtros) vive
 * en `core/components/buscador-listado.tsx`, común a todos los listados; este
 * archivo solo le pasa la `urlListado` del módulo y el texto de ejemplo.
 */
export function BuscadorTarifas({ filtros }: { filtros: FiltrosTarifario }) {
  return (
    <BuscadorListado
      filtros={filtros}
      urlListado={urlListado}
      placeholder="Buscar por código, cargo o unidad"
    />
  );
}
