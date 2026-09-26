import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import {
  COLOR_ETAPA,
  ETAPAS_OPORTUNIDAD,
  ETIQUETAS_ETAPA,
  type EtapaOportunidad,
} from "../constantes";

/**
 * La línea de las seis etapas del detalle (sección 7): las pasadas en gris y
 * con una marca, la actual en su color y las futuras solo con contorno.
 *
 * SOLO VISUAL (Parte 9 del plan): son elementos de una lista, no botones. El
 * clic para cambiar de etapa, con su confirmación, llega en la Parte 10; al
 * hacerlos pulsables pasarán a `<button>` y la cerrada, a desactivada.
 *
 * "En su color" es contorno y fondo tenue del token de la etapa, con el texto
 * en el color normal, y no el relleno sólido con texto blanco del mockup: los
 * tokens de etapa no dan contraste de texto (globals.css; naranja y verde no
 * llegan a 4.5:1 con blanco encima). La actual se distingue además por el
 * peso, el punto y `aria-current`, no solo por el color.
 *
 * `cerrada`: una oportunidad perdida o anulada muestra la línea atenuada
 * (sección 7: "línea de etapas desactivada"); su etapa sigue marcada como la
 * actual, porque la conserva.
 */
export function LineaEtapas({
  etapa,
  cerrada,
}: {
  etapa: EtapaOportunidad;
  cerrada: boolean;
}) {
  const indiceActual = ETAPAS_OPORTUNIDAD.indexOf(etapa);

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

          return (
            <li key={clave} className="flex items-center gap-1.5">
              {indice > 0 ? (
                <ChevronRightIcon
                  aria-hidden
                  className="size-3.5 text-muted-foreground/60"
                />
              ) : null}
              <span
                aria-current={actual ? "step" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-full border-[1.5px] px-3 text-sm",
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
                )}
              >
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
                {pasada ? (
                  <span className="sr-only"> (etapa pasada)</span>
                ) : null}
                {actual ? (
                  <span className="sr-only"> (etapa actual)</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
