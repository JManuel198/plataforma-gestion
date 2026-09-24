"use client";

import { FiltroSoloInactivos } from "@/core/components/filtro-solo-inactivos";
import { urlListado, type FiltrosListaPrecios } from "../filtros";

/**
 * «Ver solo inactivos» de Lista de precios. La mecánica —y por qué alterna
 * entre dos vistas en vez de sumarlas— está en
 * `core/components/filtro-solo-inactivos.tsx`; aquí solo se le pasa la
 * `urlListado` del módulo.
 */
export function FiltroInactivos({ filtros }: { filtros: FiltrosListaPrecios }) {
  return (
    <FiltroSoloInactivos
      filtros={filtros}
      urlListado={urlListado}
      etiqueta="Ver solo inactivos"
    />
  );
}
