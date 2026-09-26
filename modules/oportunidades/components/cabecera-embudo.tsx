import type { ReactNode } from "react";
import { formatearMonto } from "@/core/dinero";
import type { MetricasOportunidades } from "../queries";
import { EtiquetaSoloLoMio } from "./etiqueta-solo-lo-mio";

/**
 * La cabecera del Embudo (sección 5 de la spec): "CRM Comercial" con "Solo lo
 * mío", el subtítulo de activas y, a la derecha, el botón de alta y las
 * cuatro métricas.
 *
 * Todo número llega calculado de `calcularMetricasOportunidades` (regla
 * invariable 1): aquí solo se formatea. La cantidad y los dos totales siguen
 * los filtros; las activas del subtítulo y la tasa de cierre no.
 *
 * "CRM Comercial" es el título de ESTA página; el menú y las migas siguen
 * diciendo "Embudo de oportunidades" (sección 5, Nombres).
 */
export function CabeceraEmbudo({
  metricas,
  accion,
}: {
  metricas: MetricasOportunidades;
  /** El botón "Nueva oportunidad" con su modal. */
  accion: ReactNode;
}) {
  const { cantidad, total_usd, total_pen, activas, tasa_cierre } = metricas;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            CRM Comercial
          </h1>
          <EtiquetaSoloLoMio />
        </div>
        <p className="text-sm text-muted-foreground">
          Pipeline en tiempo real ·{" "}
          <span className="font-medium text-foreground tabular-nums">
            {activas}
          </span>{" "}
          {activas === 1 ? "oportunidad activa" : "oportunidades activas"}
        </p>
      </div>

      <div className="flex flex-col items-end gap-3">
        {accion}
        {/* `role="status"`: cambia al aplicar filtros, y así un lector de
            pantalla lo anuncia sin robar el foco. */}
        <dl
          role="status"
          className="flex flex-wrap justify-end gap-x-6 gap-y-2 text-right"
        >
          <Metrica
            valor={String(cantidad)}
            etiqueta={cantidad === 1 ? "oportunidad" : "oportunidades"}
          />
          <Metrica
            valor={formatearMonto(total_usd, "USD")}
            etiqueta="total en dólares"
          />
          <Metrica
            valor={formatearMonto(total_pen, "PEN")}
            etiqueta="total en soles"
          />
          {/* Sin ganadas ni perdidas no hay tasa que dar: "—", no "0 %". */}
          <Metrica
            valor={tasa_cierre === null ? "—" : `${tasa_cierre} %`}
            etiqueta="tasa de cierre"
          />
        </dl>
      </div>
    </div>
  );
}

function Metrica({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  // `flex-col-reverse`: en el DOM va primero la etiqueta (`<dt>`) y luego el
  // valor (`<dd>`), que es el orden correcto de un `<dl>`; en pantalla el
  // número queda arriba, como en el mockup.
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="font-mono text-base font-semibold tabular-nums">
        {valor}
      </dd>
    </div>
  );
}
