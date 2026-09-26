import { BanIcon, CircleXIcon } from "lucide-react";
import { formatearFecha } from "@/lib/fecha";
import { cn } from "cn";
import { ETIQUETAS_ETAPA, type EtapaOportunidad } from "../constantes";

/**
 * El aviso de una oportunidad perdida o anulada (sección 7): fecha y hora del
 * cierre, la etapa en la que estaba y el motivo —o que no se registró, que
 * solo puede pasar al anular—.
 *
 * El botón "Reabrir" que la spec pone como única acción de una cerrada está
 * en la cabecera (`AccionesDetalle`); este aviso solo informa.
 */
export function AvisoCierre({
  situacion,
  etapa,
  fecha,
  motivo,
}: {
  situacion: "perdida" | "anulada";
  etapa: EtapaOportunidad;
  fecha: Date;
  motivo: string | null;
}) {
  const perdida = situacion === "perdida";
  const Icono = perdida ? CircleXIcon : BanIcon;

  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-sm",
        perdida ? "border-destructive/30 bg-destructive/5" : "bg-muted/60",
      )}
    >
      <Icono
        aria-hidden
        className={cn(
          "mt-0.5 size-4.5 shrink-0",
          perdida ? "text-destructive" : "text-muted-foreground",
        )}
      />
      <div className="space-y-1">
        <p>
          <span className="font-semibold">
            {perdida ? "Oportunidad perdida" : "Oportunidad anulada"}
          </span>{" "}
          el <span className="tabular-nums">{formatearFecha(fecha)}</span> a las{" "}
          <span className="tabular-nums">{formatearFecha(fecha, "HH:mm")}</span>
          , en la etapa {ETIQUETAS_ETAPA[etapa]}. Los datos quedan en solo
          lectura.
        </p>
        <p className="text-muted-foreground">
          {motivo ? `Motivo: ${motivo}` : "No se registró motivo."}
        </p>
      </div>
    </div>
  );
}
