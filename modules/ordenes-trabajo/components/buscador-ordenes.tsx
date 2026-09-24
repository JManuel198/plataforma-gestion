"use client";

import { BuscadorListado } from "@/core/components/buscador-listado";
import { urlListado, type FiltrosOt } from "../filtros";

/**
 * Buscador del listado. El texto viaja en la URL
 * (`/ordenes-trabajo?busqueda=acme`) y la coincidencia la resuelve el `ILIKE`
 * de queries.ts sobre `codigo_ot`, `cliente` y `servicio` — aquí no se filtra
 * nada: la pantalla nunca llega a tener en memoria las filas que no coinciden.
 *
 * La mecánica (pausa de tecleo, `replace`, vaciarse al limpiar filtros) vive
 * en `core/components/buscador-listado.tsx`, común a todos los listados; este
 * archivo solo le pasa la `urlListado` del módulo y el texto de ejemplo.
 */
export function BuscadorOrdenes({ filtros }: { filtros: FiltrosOt }) {
  return (
    <BuscadorListado
      filtros={filtros}
      urlListado={urlListado}
      placeholder="Buscar por OT, cliente o servicio"
    />
  );
}
