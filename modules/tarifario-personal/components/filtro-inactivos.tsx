"use client";

import { Label } from "@/components/ui/label";
import type { FiltrosTarifario } from "../filtros";
import { useFiltros } from "./use-filtros";

/**
 * Cambia el listado a la vista de tarifas inactivas.
 *
 * La etiqueta dice "Ver solo inactivos" y NO "Mostrar inactivos" porque las dos
 * vistas son excluyentes: al marcarlo desaparecen las activas. Decirlo mal fue
 * el bug de Materiales y Personal (deuda técnica de AGENTS.md, 2026-09-21) —
 * con "Mostrar" el usuario espera que se sumen a lo que ya ve, y allí la
 * consulta efectivamente los sumaba, así que al reactivar algo seguía a la
 * vista y el código era coherente consigo mismo mientras contradecía lo que el
 * usuario esperaba. Aquí la consulta alterna
 * (`eq(activo, inactivos ? false : true)`) y la etiqueta lo dice.
 *
 * Existe porque la baja es lógica: la fila sigue ahí y tiene que haber una
 * forma de volver a verla, o "inactivar" sería un borrado irreversible de cara
 * al usuario aunque no lo sea en la base. Sin este control, el botón de
 * reactivar de `AccionesTarifa` no tendría cómo mostrarse nunca. Es la
 * obligación que impone el botón de inactivar, no el catálogo: Servicios no
 * tiene ni lo uno ni lo otro y no echa en falta nada.
 *
 * Por defecto está apagado — quien no lo toca ve solo el tarifario vigente, que
 * es lo que se espera al abrir la pantalla.
 *
 * Es un `<input type="checkbox">` nativo y no un primitivo de shadcn porque
 * `checkbox` no está instalado; cuando lo esté, este es uno de los sitios a
 * cambiar (y hay que instalarlo con el CLI, nunca a mano — regla 5 de
 * AGENTS.md). Mismo componente y mismo texto que en Materiales y Lista de
 * precios: es el mismo control, no debe verse ni llamarse de dos maneras.
 */
export function FiltroInactivos({ filtros }: { filtros: FiltrosTarifario }) {
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
        Ver solo inactivos
      </Label>
    </div>
  );
}
