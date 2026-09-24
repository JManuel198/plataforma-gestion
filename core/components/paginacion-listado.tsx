import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { paginasVisibles, type Paginacion } from "@/core/paginacion";
import { cn } from "cn";

/**
 * El pie de la tabla: «11–14 de 14 · ‹ Anterior 1 2 Siguiente ›».
 *
 * Son ENLACES, no botones con estado: cambiar de página es navegar a otra URL
 * (`?pagina=2`), igual que los filtros. Así una página concreta se puede
 * compartir o recargar, y el botón Atrás del navegador vuelve a la anterior.
 *
 * Server Component: `hrefPagina` es una función, y eso solo puede pasar entre
 * componentes de servidor. La recibe de la página de cada módulo, que la arma
 * con su `urlListado` y los filtros actuales — este componente no sabe nada de
 * los parámetros de ningún listado.
 *
 * Con una sola página se queda solo el texto («1–4 de 4»): los botones no
 * llevarían a ninguna parte.
 */
export function PaginacionListado({
  paginacion,
  hrefPagina,
}: {
  paginacion: Paginacion;
  hrefPagina: (pagina: number) => string;
}) {
  const { pagina, totalPaginas, total, desde, hasta } = paginacion;
  const claseEnlace = buttonVariants({ variant: "ghost", size: "sm" });

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm"
    >
      <p className="text-muted-foreground tabular-nums">
        {desde}–{hasta} de {total}
      </p>

      {totalPaginas > 1 ? (
        <div className="flex items-center gap-1">
          {pagina > 1 ? (
            <Link href={hrefPagina(pagina - 1)} className={claseEnlace}>
              <ChevronLeftIcon aria-hidden />
              Anterior
            </Link>
          ) : (
            // Deshabilitado como texto apagado y no como enlace: un `<a>` no
            // admite `disabled`, y uno que no lleva a ninguna parte confunde
            // a un lector de pantalla.
            <span
              aria-disabled
              className={cn(claseEnlace, "pointer-events-none opacity-50")}
            >
              <ChevronLeftIcon aria-hidden />
              Anterior
            </span>
          )}

          {paginasVisibles(pagina, totalPaginas).map((numero, i) =>
            numero === null ? (
              <span
                key={`hueco-${i}`}
                aria-hidden
                className="px-1 text-muted-foreground"
              >
                …
              </span>
            ) : numero === pagina ? (
              <span
                key={numero}
                aria-current="page"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "min-w-8 tabular-nums",
                )}
              >
                {numero}
              </span>
            ) : (
              <Link
                key={numero}
                href={hrefPagina(numero)}
                aria-label={`Página ${numero}`}
                className={cn(claseEnlace, "min-w-8 tabular-nums")}
              >
                {numero}
              </Link>
            ),
          )}

          {pagina < totalPaginas ? (
            <Link href={hrefPagina(pagina + 1)} className={claseEnlace}>
              Siguiente
              <ChevronRightIcon aria-hidden />
            </Link>
          ) : (
            <span
              aria-disabled
              className={cn(claseEnlace, "pointer-events-none opacity-50")}
            >
              Siguiente
              <ChevronRightIcon aria-hidden />
            </span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
