"use client";

import { FiltroSoloInactivos } from "@/core/components/filtro-solo-inactivos";
import { urlListado, type FiltrosTarifario } from "../filtros";

/**
 * «Ver solo inactivos» de Tarifario de personal. La mecánica —y por qué alterna entre dos
 * vistas en vez de sumarlas— está en `core/components/filtro-solo-inactivos.tsx`;
 * aquí solo se le pasa la `urlListado` del módulo.
 */
export function FiltroInactivos({ filtros }: { filtros: FiltrosTarifario }) {
  return (
    <FiltroSoloInactivos
      filtros={filtros}
      urlListado={urlListado}
      etiqueta="Ver solo inactivos"
    />
  );
}
