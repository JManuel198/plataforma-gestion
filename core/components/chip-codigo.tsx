import { cn } from "cn";

/**
 * Un código autogenerado mostrado como etiqueta (OFFT.0000318, MAT.0000124):
 * monoespaciado, sobre fondo gris, con borde. Es como aparece el código en la
 * cabecera del modal y junto a una referencia a otra entidad, según el mockup
 * de docs/diseno/. En la tabla el código va sin etiqueta (`CLASE_CODIGO`).
 */
export function ChipCodigo({
  codigo,
  className,
}: {
  codigo: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium",
        className,
      )}
    >
      {codigo}
    </span>
  );
}
