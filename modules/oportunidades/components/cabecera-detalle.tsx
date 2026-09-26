import Link from "next/link";
import { ChevronLeftIcon, PlusIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { DetalleOportunidad } from "../queries";
import { EtiquetaEstadoOportunidad } from "./etiquetas-oportunidad";

/**
 * La cabecera del detalle (sección 7). Izquierda: "< Pipeline", código, título
 * grande y la única etiqueta de estado. Derecha: las acciones.
 *
 * "< Pipeline" es un enlace (`<Link>` con aspecto de botón, nunca un `Button`
 * con `render`: skill de convenciones) a `urlVolver`, que la página
 * reconstruye desde los filtros con los que se llegó.
 *
 * LAS ACCIONES ESTÁN, PERO DESHABILITADAS (Parte 9 del plan): "+ Actividad",
 * "Marcar perdida", "Anular" y, en una cerrada, "Reabrir" llegan con la Parte
 * 10, igual que el lápiz del título. Se pintan ya para que la cabecera tenga
 * su forma final, y deshabilitadas —no activas sin hacer nada— para que un
 * clic no parezca un fallo. Ya siguen las reglas de visibilidad de la spec:
 * abierta → las tres, sin "Marcar perdida" en Finalizado (sección 2); cerrada
 * → solo "Reabrir".
 */
export function CabeceraDetalle({
  oportunidad,
  urlVolver,
}: {
  oportunidad: DetalleOportunidad;
  urlVolver: string;
}) {
  const { codigo, titulo, etapa, situacion } = oportunidad;
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
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            {titulo}
          </h1>
          <EtiquetaEstadoOportunidad etapa={etapa} situacion={situacion} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {abierta ? (
          <>
            <Button variant="outline" disabled>
              <PlusIcon aria-hidden />
              Actividad
            </Button>
            {etapa === "finalizado" ? null : (
              <Button variant="outline" disabled className="text-destructive">
                <XIcon aria-hidden />
                Marcar perdida
              </Button>
            )}
            <Button variant="ghost" disabled>
              Anular
            </Button>
          </>
        ) : (
          <Button variant="outline" disabled>
            <RotateCcwIcon aria-hidden />
            Reabrir
          </Button>
        )}
      </div>
    </div>
  );
}
