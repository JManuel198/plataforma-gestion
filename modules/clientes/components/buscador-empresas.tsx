"use client";

import { BuscadorListado } from "@/core/components/buscador-listado";
import { urlListado, type FiltrosEmpresas } from "../filtros";

/**
 * Buscador del listado. El texto viaja en la URL (`/clientes?busqueda=acme`) y
 * la coincidencia la resuelve el `ILIKE` de queries.ts sobre `razon_social` y
 * `ruc`. La mecánica vive en `core/components/buscador-listado.tsx`; aquí solo
 * se le pasa la `urlListado` del módulo y el texto de ejemplo.
 */
export function BuscadorEmpresas({ filtros }: { filtros: FiltrosEmpresas }) {
  return (
    <BuscadorListado
      filtros={filtros}
      urlListado={urlListado}
      placeholder="Buscar por razón social o RUC"
    />
  );
}
