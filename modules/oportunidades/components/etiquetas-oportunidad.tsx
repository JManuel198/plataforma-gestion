import { BanIcon, CircleXIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import {
  COLOR_ETAPA,
  ETIQUETAS_ETAPA,
  type EtapaOportunidad,
  type SituacionOportunidad,
} from "../constantes";

/**
 * Una etapa escrita con su punto de color, como se nombra dentro de un texto
 * ("Movió de ● Prospecto a ● Cotización"). El color va en el punto y nunca en
 * las letras: los tokens de etapa no dan contraste de texto (globals.css).
 */
export function NombreEtapa({
  etapa,
  className,
}: {
  etapa: EtapaOportunidad;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 font-medium", className)}
    >
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", COLOR_ETAPA[etapa].punto)}
      />
      {ETIQUETAS_ETAPA[etapa]}
    </span>
  );
}

/**
 * La ÚNICA etiqueta de estado de la cabecera del detalle (sección 7): la etapa
 * si está abierta —incluido Finalizado—, o "Perdida"/"Anulada" si está
 * cerrada. No se pintan las dos: en el detalle la etapa de una cerrada ya se
 * ve en la línea de etapas y en el aviso de cierre (a diferencia de la Tabla,
 * sección 9).
 */
export function EtiquetaEstadoOportunidad({
  etapa,
  situacion,
}: {
  etapa: EtapaOportunidad;
  situacion: SituacionOportunidad;
}) {
  if (situacion === "perdida") {
    return (
      <Badge variant="destructive">
        <CircleXIcon aria-hidden />
        Perdida
      </Badge>
    );
  }

  if (situacion === "anulada") {
    return (
      <Badge variant="secondary">
        <BanIcon aria-hidden />
        Anulada
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <NombreEtapa etapa={etapa} />
    </Badge>
  );
}
