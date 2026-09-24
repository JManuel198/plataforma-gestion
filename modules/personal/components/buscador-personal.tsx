"use client";

import { BuscadorListado } from "@/core/components/buscador-listado";
import { urlListado, type FiltrosPersonal } from "../filtros";

/**
 * Buscador del listado. El texto viaja en la URL (`/personal?busqueda=perez`)
 * y la coincidencia la resuelve el `ILIKE` de queries.ts sobre `nombre`,
 * `apellido`, `dni` y `cargo` — aquí no se filtra nada: la pantalla nunca
 * llega a tener en memoria las filas que no coinciden.
 *
 * La mecánica (pausa de tecleo, `replace`, vaciarse al limpiar filtros) vive
 * en `core/components/buscador-listado.tsx`, común a todos los listados; este
 * archivo solo le pasa la `urlListado` del módulo y el texto de ejemplo.
 */
export function BuscadorPersonal({ filtros }: { filtros: FiltrosPersonal }) {
  return (
    <BuscadorListado
      filtros={filtros}
      urlListado={urlListado}
      placeholder="Buscar por nombre, apellido, DNI o cargo"
    />
  );
}
