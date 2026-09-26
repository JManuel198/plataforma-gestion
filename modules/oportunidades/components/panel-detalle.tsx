import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Un bloque del detalle de una oportunidad, con su título pequeño en
 * mayúsculas (sección 7: "con títulos pequeños"). `extra` va a la derecha del
 * título: el contador "N registros" de la línea de tiempo.
 */
export function PanelDetalle({
  titulo,
  Icono,
  extra,
  children,
}: {
  titulo: string;
  Icono?: LucideIcon;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card px-5 py-4">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {Icono ? <Icono aria-hidden className="size-3.5" /> : null}
        {titulo}
        {extra ? (
          <span className="ml-auto font-medium tracking-normal normal-case">
            {extra}
          </span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

/**
 * El marcador de una sección que todavía no existe (Cotizaciones vinculadas,
 * Órdenes de trabajo, Restricciones): borde discontinuo, como en el mockup.
 */
export function Proximamente({
  Icono,
  children,
}: {
  Icono: LucideIcon;
  children: ReactNode;
}) {
  return (
    <p className="flex items-center gap-2.5 rounded-md border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      <Icono aria-hidden className="size-4 shrink-0" />
      {children}
    </p>
  );
}
