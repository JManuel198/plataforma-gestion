import Link from "next/link";
import { XIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

/**
 * «Limpiar filtros», con el número de filtros aplicados. No se pinta si no hay
 * ninguno: un botón que no hace nada es ruido.
 *
 * Es un `<Link>` al listado sin parámetros, no un botón con lógica: quitar los
 * filtros es exactamente navegar a la URL limpia. Lleva el aspecto de botón por
 * `buttonVariants` y no con `<Button render={<Link/>}>`, que haría del `<a>` un
 * `role="button"` (el aviso de `nativeButton` que documenta AGENTS.md).
 *
 * El buscador se vacía solo al ver desaparecer `?busqueda=` de la URL (ver
 * `BuscadorListado`), así que no hace falta avisarle.
 */
export function LimpiarFiltros({
  href,
  cantidad,
}: {
  /** El listado sin filtros: `urlListado()` del módulo. */
  href: string;
  cantidad: number;
}) {
  if (cantidad === 0) return null;

  return (
    <Link
      href={href}
      scroll={false}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
    >
      <XIcon aria-hidden />
      Limpiar filtros
      <span
        className="flex size-5 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background tabular-nums"
        aria-label={`${cantidad} ${cantidad === 1 ? "filtro aplicado" : "filtros aplicados"}`}
      >
        {cantidad}
      </span>
    </Link>
  );
}
