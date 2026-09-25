"use client";

import { FiltroSoloInactivos } from "@/core/components/filtro-solo-inactivos";
import { urlListado, type FiltrosContactos } from "../filtros";

/**
 * «Ver solo inactivos». La mecánica —y por qué alterna entre dos vistas en vez
 * de sumarlas— está en `core/components/filtro-solo-inactivos.tsx`. Filtra por
 * el `activo` del contacto, nunca por el de su empresa.
 */
export function FiltroInactivos({ filtros }: { filtros: FiltrosContactos }) {
  return (
    <FiltroSoloInactivos
      filtros={filtros}
      urlListado={urlListado}
      etiqueta="Ver solo inactivos"
    />
  );
}
