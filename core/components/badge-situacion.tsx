import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

/**
 * La «Situación» de un registro con baja lógica: Activo o Inactivo.
 *
 * Se pinta SIEMPRE, también cuando está activo, en la tabla y en la vista:
 * con la columna vacía para los activos, la diferencia entre "activo" y "no
 * se cargó el dato" no se veía. Activo va en contorno con el punto verde de
 * marca; inactivo, en gris con el punto apagado — el mismo par de colores que
 * el contador de la barra de filtros.
 *
 * Solo para los catálogos que tienen columna `activo`. Servicios y EPPs no la
 * tienen (por motivos distintos, ver docs/spec/entidades.md) y no llevan este
 * badge; OT tiene su propio estado.
 */
export function BadgeSituacion({
  activo,
  etiquetaInactivo = "Inactivo",
}: {
  activo: boolean;
  /** Para los módulos que lo llaman distinto, p. ej. Personal: "Dado de baja". */
  etiquetaInactivo?: string;
}) {
  return (
    <Badge variant={activo ? "outline" : "secondary"} className="gap-1.5">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          activo ? "bg-primary" : "bg-muted-foreground",
        )}
      />
      {activo ? "Activo" : etiquetaInactivo}
    </Badge>
  );
}
