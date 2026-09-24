import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Lo que ocupa el sitio de la tabla cuando no hay filas: un icono, un título,
 * una explicación y, si tiene sentido, una acción.
 *
 * Cada listado distingue DOS casos, y el que decide cuál es el módulo:
 * - el catálogo está vacío de verdad → la acción es crear el primero;
 * - hay filtros y ninguna fila coincide → la acción es quitar los filtros.
 * Confundirlos le diría a alguien con un filtro puesto que no hay datos.
 */
export function EstadoVacio({
  Icono,
  titulo,
  descripcion,
  accion,
}: {
  Icono: LucideIcon;
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-md border bg-muted">
        <Icono aria-hidden className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-semibold">{titulo}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {accion ? <div className="pt-1">{accion}</div> : null}
    </div>
  );
}
