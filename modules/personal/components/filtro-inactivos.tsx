"use client";

import { Label } from "@/components/ui/label";
import type { FiltrosPersonal } from "../filtros";
import { useFiltros } from "./use-filtros";

/**
 * Enseña también a quien está de baja.
 *
 * Existe porque la baja es lógica: la fila sigue ahí y tiene que haber una
 * forma de volver a verla, o "dar de baja" sería un borrado irreversible de
 * cara al usuario aunque no lo sea en la base. Por defecto está apagado —
 * quien no lo toca ve solo a la gente activa, que es lo que se espera de una
 * lista de personal.
 *
 * Es un `<input type="checkbox">` nativo y no un primitivo de shadcn porque
 * `checkbox` no está instalado; cuando lo esté, este es el sitio a cambiar
 * (y hay que instalarlo con el CLI, nunca a mano — regla 5 de AGENTS.md).
 */
export function FiltroInactivos({ filtros }: { filtros: FiltrosPersonal }) {
  const { navegar } = useFiltros(filtros);

  return (
    <div className="flex items-center gap-2">
      <input
        id="inactivos"
        type="checkbox"
        className="size-4 accent-primary"
        checked={Boolean(filtros.inactivos)}
        onChange={(evento) =>
          navegar({ inactivos: evento.target.checked || undefined })
        }
      />
      <Label htmlFor="inactivos" className="font-normal">
        Mostrar dados de baja
      </Label>
    </div>
  );
}
