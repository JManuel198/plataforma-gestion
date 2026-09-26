"use client";

import { useState } from "react";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "cn";
import { cambiarEtapa } from "../actions";
import {
  COLOR_ETAPA,
  ETAPAS_OPORTUNIDAD,
  ETIQUETAS_ETAPA,
  type EtapaOportunidad,
} from "../constantes";
import { useAccionOportunidad } from "./use-accion-oportunidad";

/**
 * La línea de las seis etapas del detalle (sección 7): las pasadas en gris y
 * con una marca, la actual en su color y las futuras solo con contorno.
 *
 * PULSABLE (Parte 10): con la oportunidad abierta, cada etapa distinta de la
 * actual es un `<button>` que pide confirmación —"¿Mover de X a Y?", la misma
 * que tendrá el arrastre del kanban (sección 6)— y al aceptar llama a
 * `cambiarEtapa`, la única puerta para cambiar de etapa. Se puede ir adelante,
 * atrás o saltándose etapas.
 *
 * - La etapa ACTUAL no es un botón: pulsarla no haría nada (ya estás ahí), y
 *   un botón que no hace nada es peor que no tenerlo. Lleva `aria-current`.
 *   Si aun así llegara la petición (doble clic, otra pestaña), `cambiarEtapa`
 *   responde bien sin escribir nada.
 * - PERDIDA O ANULADA, la línea entera queda desactivada: ninguna etapa es
 *   botón y se ve atenuada (sección 7). Su etapa sigue marcada como la actual,
 *   porque la conserva para reabrir. La acción la rechaza igual si llega de
 *   una pestaña que todavía la veía abierta.
 *
 * "En su color" es contorno y fondo tenue del token de la etapa, con el texto
 * en el color normal, y no el relleno sólido con texto blanco del mockup: los
 * tokens de etapa no dan contraste de texto (globals.css).
 */
export function LineaEtapas({
  id,
  etapa,
  cerrada,
}: {
  id: string;
  etapa: EtapaOportunidad;
  cerrada: boolean;
}) {
  const [destino, setDestino] = useState<EtapaOportunidad | null>(null);
  const { ejecutar, pendiente } = useAccionOportunidad();
  const indiceActual = ETAPAS_OPORTUNIDAD.indexOf(etapa);

  function confirmar(elegida: EtapaOportunidad) {
    setDestino(null);
    ejecutar(() => cambiarEtapa(id, elegida), {
      exito: `Movida a ${ETIQUETAS_ETAPA[elegida]}.`,
    });
  }

  return (
    <nav aria-label="Etapas del embudo">
      <ol
        className={cn(
          "flex flex-wrap items-center gap-1.5",
          cerrada && "opacity-60",
        )}
      >
        {ETAPAS_OPORTUNIDAD.map((clave, indice) => {
          const pasada = indice < indiceActual;
          const actual = indice === indiceActual;
          const pulsable = !cerrada && !actual;

          const clases = cn(
            "inline-flex h-8 items-center gap-2 rounded-full border-[1.5px] px-3 text-sm outline-none",
            pasada && "border-border bg-muted text-muted-foreground",
            actual && [
              "font-semibold text-foreground",
              COLOR_ETAPA[clave].contorno,
              COLOR_ETAPA[clave].tinte,
            ],
            !pasada &&
              !actual && [
                "bg-background text-foreground",
                COLOR_ETAPA[clave].contorno,
              ],
            pulsable &&
              "cursor-pointer transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60",
            pulsable && pasada && "hover:text-foreground",
          );

          const contenido = (
            <>
              {pasada ? (
                <CheckIcon aria-hidden className="size-3.5" />
              ) : actual ? (
                <span
                  aria-hidden
                  className={cn(
                    "size-2 rounded-full",
                    COLOR_ETAPA[clave].punto,
                  )}
                />
              ) : (
                <span aria-hidden className="font-mono text-xs opacity-80">
                  {String(indice + 1).padStart(2, "0")}
                </span>
              )}
              {ETIQUETAS_ETAPA[clave]}
              {pasada ? <span className="sr-only"> (etapa pasada)</span> : null}
              {actual ? <span className="sr-only"> (etapa actual)</span> : null}
            </>
          );

          return (
            <li key={clave} className="flex items-center gap-1.5">
              {indice > 0 ? (
                <ChevronRightIcon
                  aria-hidden
                  className="size-3.5 text-muted-foreground/60"
                />
              ) : null}
              {pulsable ? (
                <button
                  type="button"
                  className={clases}
                  disabled={pendiente}
                  onClick={() => setDestino(clave)}
                  title={`Mover a ${ETIQUETAS_ETAPA[clave]}`}
                >
                  {contenido}
                </button>
              ) : (
                <span
                  aria-current={actual ? "step" : undefined}
                  className={clases}
                >
                  {contenido}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Cerrar por cualquier vía es desistir: nada se envió todavía. */}
      <AlertDialog
        open={destino !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setDestino(null);
        }}
      >
        {destino ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                ¿Mover de {ETIQUETAS_ETAPA[etapa]} a {ETIQUETAS_ETAPA[destino]}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                El cambio queda registrado en el historial.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => confirmar(destino)}>
                Mover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </nav>
  );
}
