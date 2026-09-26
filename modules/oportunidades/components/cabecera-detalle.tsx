import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { DetalleOportunidad } from "../queries";
import { AccionesDetalle } from "./acciones-detalle";
import { EditarTitulo } from "./ediciones-oportunidad";
import { EtiquetaEstadoOportunidad } from "./etiquetas-oportunidad";

/**
 * La cabecera del detalle (sección 7). Izquierda: "< Pipeline", código, título
 * grande con su lápiz y la única etiqueta de estado. Derecha: las acciones
 * (`AccionesDetalle`, Parte 10).
 *
 * "< Pipeline" es un enlace (`<Link>` con aspecto de botón, nunca un `Button`
 * con `render`: skill de convenciones) a `urlVolver`, que la página
 * reconstruye desde los filtros con los que se llegó.
 *
 * El lápiz del título solo aparece con la oportunidad abierta: perdida o
 * anulada, los lápices se ocultan (sección 7).
 */
export function CabeceraDetalle({
  oportunidad,
  urlVolver,
  zonaHoraria,
}: {
  oportunidad: DetalleOportunidad;
  urlVolver: string;
  /** Para el "ahora" por defecto de "+ Actividad". */
  zonaHoraria: string;
}) {
  const { id, codigo, titulo, etapa, situacion } = oportunidad;
  const abierta = situacion === "abierta";

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={urlVolver}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "-ml-2.5",
            })}
          >
            <ChevronLeftIcon aria-hidden />
            Pipeline
          </Link>
          <span className="font-mono text-sm text-muted-foreground">
            {codigo}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            {titulo}
          </h1>
          {abierta ? <EditarTitulo id={id} titulo={titulo} /> : null}
          <EtiquetaEstadoOportunidad etapa={etapa} situacion={situacion} />
        </div>
      </div>

      <AccionesDetalle
        id={id}
        etapa={etapa}
        situacion={situacion}
        zonaHoraria={zonaHoraria}
      />
    </div>
  );
}
