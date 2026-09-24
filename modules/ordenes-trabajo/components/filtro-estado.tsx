"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFiltrosListado } from "@/core/use-filtros-listado";
import { ESTADOS_OT } from "../constantes";
import { urlListado, type FiltrosOt } from "../filtros";

const TODOS = "todos";

/**
 * El estado elegido viaja en la URL (`/ordenes-trabajo?estado=Pausada`) y el
 * filtrado ocurre en la consulta del servidor — este componente solo navega.
 * Es el patrón de filtro por URL de referencia del proyecto (ver
 * .claude/skills/shadcn-conventions/SKILL.md).
 *
 * Recibe los filtros completos, no solo el suyo, porque la URL que construye
 * tiene que conservar la búsqueda y las fechas: los tres filtros se aplican
 * juntos.
 */
export function FiltroEstado({ filtros }: { filtros: FiltrosOt }) {
  const { navegar, navegando } = useFiltrosListado(filtros, urlListado);

  const opciones = [
    { label: "Todos los estados", value: TODOS },
    ...ESTADOS_OT.map((valor) => ({ label: valor, value: valor })),
  ];

  function filtrarPor(valor: string | null) {
    // `TODOS` no es un estado: es la ausencia de filtro, y por eso sale de la
    // URL en vez de escribirse en ella.
    navegar({
      estado:
        valor && valor !== TODOS
          ? ESTADOS_OT.find((estado) => estado === valor)
          : undefined,
    });
  }

  return (
    // La etiqueta es solo para lectores de pantalla, igual que la del
    // buscador: la opción «Todos los estados» ya dice qué filtra.
    <div className="flex items-center gap-2">
      <Label htmlFor="filtro-estado" className="sr-only">
        Estado
      </Label>
      <Select
        value={filtros.estado ?? TODOS}
        onValueChange={filtrarPor}
        items={opciones}
        disabled={navegando}
      >
        <SelectTrigger id="filtro-estado" className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((opcion) => (
            <SelectItem key={opcion.value} value={opcion.value}>
              {opcion.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
