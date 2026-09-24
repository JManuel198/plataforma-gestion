"use client";

import { Switch } from "@/components/ui/switch";
import { useFiltrosListado } from "@/core/use-filtros-listado";

/**
 * El interruptor «Ver solo inactivos» de los listados con baja lógica.
 *
 * ALTERNA ENTRE DOS VISTAS EXCLUYENTES — activos o inactivos, nunca los dos
 * mezclados —, y por eso la etiqueta dice "Ver solo…" y no "Mostrar…" (ver la
 * convención en AGENTS.md). La consulta de cada módulo es la que tiene que
 * cumplirlo: `eq(tabla.activo, inactivos ? false : true)`.
 *
 * Solo el caso verdadero viaja en la URL (`?inactivos=1`); apagarlo quita el
 * parámetro en vez de dejar un `inactivos=0` que luego haya que distinguir.
 * `push` y no `replace`: es un cambio de una sola vez, y el usuario espera poder
 * volver atrás de él.
 *
 * Mismo reparto que `BuscadorListado`: cada módulo lo envuelve y le pasa su
 * `urlListado` y su etiqueta ("Ver solo inactivos", "Ver solo dados de baja").
 */
export function FiltroSoloInactivos<F extends { inactivos?: boolean }>({
  filtros,
  urlListado,
  etiqueta,
}: {
  filtros: F;
  urlListado: (filtros: F) => string;
  etiqueta: string;
}) {
  const { navegar, navegando } = useFiltrosListado(filtros, urlListado);

  return (
    // El `<label>` envuelve al interruptor: es lo que le da nombre accesible
    // (ver components/ui/switch.tsx) y hace clicable también el texto.
    <label className="flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap">
      <Switch
        checked={Boolean(filtros.inactivos)}
        disabled={navegando}
        onCheckedChange={(activado) =>
          navegar({ inactivos: activado || undefined } as Partial<F>)
        }
      />
      {etiqueta}
    </label>
  );
}
