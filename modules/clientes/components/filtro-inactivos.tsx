"use client";

import { FiltroSoloInactivos } from "@/core/components/filtro-solo-inactivos";
import { urlListado, type FiltrosEmpresas } from "../filtros";

/**
 * «Ver solo inactivas». La mecánica —y por qué alterna entre dos vistas en vez
 * de sumarlas— está en `core/components/filtro-solo-inactivos.tsx`. Filtra por
 * `activo` (baja lógica propia), nunca por el `estado` de SUNAT.
 */
export function FiltroInactivos({ filtros }: { filtros: FiltrosEmpresas }) {
  return (
    <FiltroSoloInactivos
      filtros={filtros}
      urlListado={urlListado}
      etiqueta="Ver solo inactivas"
    />
  );
}
