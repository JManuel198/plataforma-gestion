"use client";

import { Label } from "@/components/ui/label";
import { useFiltrosListado } from "@/core/use-filtros-listado";
import { urlListado, type FiltrosMateriales } from "../filtros";

/**
 * Cambia el listado a la vista de materiales inactivos.
 *
 * La etiqueta dice "Ver SOLO inactivos" y no "Mostrar inactivos" porque las
 * dos vistas son excluyentes: al marcarlo desaparecen los activos. Decirlo
 * mal fue el bug — con "Mostrar" el usuario espera que se sumen, y la
 * consulta efectivamente los sumaba, así que al reactivar algo seguía a la
 * vista.
 *
 * Existe porque la baja es lógica: la fila sigue ahí y tiene que haber una
 * forma de volver a verla, o "inactivar" sería un borrado irreversible de cara
 * al usuario aunque no lo sea en la base. Sin este control, el botón de
 * reactivar de `AccionesMaterial` no tendría cómo mostrarse nunca.
 *
 * Por defecto está apagado — quien no lo toca ve solo el catálogo vigente, que
 * es lo que se espera al abrir una lista de materiales.
 *
 * Es un `<input type="checkbox">` nativo y no un primitivo de shadcn porque
 * `checkbox` no está instalado; cuando lo esté, este es el sitio a cambiar (y
 * hay que instalarlo con el CLI, nunca a mano — regla 5 de AGENTS.md).
 */
export function FiltroInactivos({ filtros }: { filtros: FiltrosMateriales }) {
  const { navegar } = useFiltrosListado(filtros, urlListado);

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
        Ver solo inactivos
      </Label>
    </div>
  );
}
