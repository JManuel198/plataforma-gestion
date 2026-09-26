import { formatearMonto } from "@/core/dinero";
import { cn } from "cn";
import {
  COLOR_ETAPA,
  DIAS_VENTANA_FINALIZADO,
  ETIQUETAS_ETAPA,
} from "../constantes";
import type { FiltrosOportunidades } from "../filtros";
import type { ColumnaKanban } from "../queries";
import { TarjetaOportunidad } from "./tarjeta-oportunidad";

/**
 * El kanban de SOLO LECTURA (Parte 8 del plan): una columna por etapa, en el
 * orden del embudo, con las tarjetas que devuelve `listarOportunidadesKanban`
 * tal cual —agrupadas, con la ventana de 30 días de Finalizado y ordenadas
 * por fecha de cierre—. Aquí no se filtra, ni se ordena, ni se suma nada.
 *
 * Sin paginación ni scroll propio por columna: la página crece hacia abajo
 * (sección 5, "scroll general"). En horizontal el tablero sí se desplaza
 * cuando las seis columnas no caben.
 *
 * Sin arrastrar y soltar: llega aislado en la Parte 11.
 */
export function TableroKanban({
  columnas,
  filtros,
  hayFiltros,
}: {
  columnas: ColumnaKanban[];
  /** Viajan en el enlace de cada tarjeta, para volver a ellos desde el detalle. */
  filtros: FiltrosOportunidades;
  /** Cambia el texto de una columna vacía: "Sin coincidencias". */
  hayFiltros: boolean;
}) {
  return (
    <div className="grid auto-cols-[minmax(13.5rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
      {columnas.map((columna, indice) => (
        <Columna
          key={columna.etapa}
          columna={columna}
          numero={indice + 1}
          filtros={filtros}
          hayFiltros={hayFiltros}
        />
      ))}
    </div>
  );
}

function Columna({
  columna,
  numero,
  filtros,
  hayFiltros,
}: {
  columna: ColumnaKanban;
  numero: number;
  filtros: FiltrosOportunidades;
  hayFiltros: boolean;
}) {
  const { etapa, cantidad, total_usd, total_pen, tarjetas } = columna;
  const nombre = ETIQUETAS_ETAPA[etapa];

  return (
    <section
      aria-label={`${nombre}, ${cantidad} ${cantidad === 1 ? "oportunidad" : "oportunidades"}`}
      className="flex min-h-96 flex-col rounded-lg border bg-muted/60"
    >
      <header className="flex flex-col gap-2 border-b px-3 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn("size-2 shrink-0 rounded-full", COLOR_ETAPA[etapa].punto)}
          />
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            {String(numero).padStart(2, "0")}
          </span>
          <h2 className="text-sm font-semibold">{nombre}</h2>
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full border bg-background px-1.5 text-xs font-semibold tabular-nums">
            {cantidad}
          </span>
        </div>

        {etapa === "finalizado" ? (
          <p className="-mt-1 text-xs text-muted-foreground">
            Finalizadas en los últimos {DIAS_VENTANA_FINALIZADO} días
          </p>
        ) : null}

        {/* Dólares y soles, cada uno con su suma: nunca se convierten ni se
            mezclan (sección 5). La línea de soles solo si hay alguna. */}
        <div className="flex items-start justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Valor estimado</span>
          <span className="flex flex-col items-end font-mono tabular-nums">
            <span className="font-semibold">
              {formatearMonto(total_usd, "USD")}
            </span>
            {total_pen === null ? null : (
              <span className="text-muted-foreground">
                {formatearMonto(total_pen, "PEN")}
              </span>
            )}
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2 p-2">
        {tarjetas.length > 0 ? (
          tarjetas.map((oportunidad) => (
            <TarjetaOportunidad
              key={oportunidad.id}
              oportunidad={oportunidad}
              filtros={filtros}
            />
          ))
        ) : (
          <p className="rounded-md border border-dashed px-2 py-4 text-center text-xs text-muted-foreground">
            {hayFiltros ? "Sin coincidencias" : "Sin oportunidades"}
          </p>
        )}
      </div>
    </section>
  );
}
