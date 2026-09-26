import Link from "next/link";
import { Building2Icon, ClockIcon } from "lucide-react";
import { AvatarIniciales } from "@/core/components/avatar-iniciales";
import { formatearMonto } from "@/core/dinero";
import { cn } from "cn";
import {
  COLOR_ETAPA,
  DIAS_SIN_MOVER_ALERTA,
  RUTA_LISTADO,
} from "../constantes";
import type { TarjetaOportunidad as DatosTarjeta } from "../queries";

/**
 * Una tarjeta del kanban (sección 5 de la spec), de arriba abajo: código,
 * título, empresa, valor y probabilidad, asesor y reloj de días.
 *
 * ES UN ENLACE (`<a>`) A LA PÁGINA DE DETALLE, no un `<div>` con `onClick`:
 * se abre con Enter, en otra pestaña con el botón central, y un lector de
 * pantalla lo anuncia como enlace. `/oportunidades/[id]` llega en la Parte 9;
 * hasta entonces el enlace da la página de "no encontrado", y eso es lo
 * esperado.
 *
 * `draggable={false}`: todavía NO se arrastra (eso es la Parte 11). Un `<a>`
 * es arrastrable de fábrica en el navegador —se lleva la URL—, y arrastrarlo
 * a otra columna parecería el gesto de cambiar de etapa sin hacer nada.
 *
 * Todo número viene resuelto de la consulta (regla invariable 1): los días
 * los calcula la base en hora de Lima, y son `null` donde el reloj no aplica
 * (Finalizado, sección 3), así que aquí solo se decide si se pinta.
 */
export function TarjetaOportunidad({
  oportunidad,
}: {
  oportunidad: DatosTarjeta;
}) {
  const {
    id,
    codigo,
    titulo,
    etapa,
    empresa_razon_social,
    moneda,
    valor_estimado,
    probabilidad,
    asesor_nombre,
    dias_sin_mover,
  } = oportunidad;

  return (
    <Link
      href={`${RUTA_LISTADO}/${id}`}
      draggable={false}
      className={cn(
        // El borde izquierdo del color de su etapa; el resto, el borde normal.
        "flex flex-col gap-1.5 rounded-md border border-l-[3px] bg-card px-3 py-2.5 shadow-xs transition-shadow outline-none hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50",
        COLOR_ETAPA[etapa].borde,
      )}
    >
      <span className="font-mono text-xs text-muted-foreground">{codigo}</span>
      <span className="line-clamp-2 text-sm font-medium">{titulo}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Building2Icon aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">{empresa_razon_social}</span>
      </span>

      <span className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatearMonto(valor_estimado, moneda)}
        </span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          <span className="sr-only">Probabilidad </span>
          {probabilidad}%
        </span>
      </span>

      <span className="flex items-center justify-between gap-2 border-t pt-1.5">
        <span className="flex min-w-0 items-center gap-1.5 text-xs">
          <AvatarIniciales nombre={asesor_nombre} size="sm" />
          <span className="truncate">{asesor_nombre}</span>
        </span>
        {dias_sin_mover === null ? null : (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums",
              // En rojo desde 7 días (sección 3). `text-destructive` sí da
              // contraste de texto; los colores de etapa no.
              dias_sin_mover >= DIAS_SIN_MOVER_ALERTA
                ? "font-medium text-destructive"
                : "text-muted-foreground",
            )}
            title={`${dias_sin_mover} ${dias_sin_mover === 1 ? "día" : "días"} sin cambiar de etapa`}
          >
            <ClockIcon aria-hidden className="size-3.5" />
            {dias_sin_mover} d
            <span className="sr-only"> sin cambiar de etapa</span>
          </span>
        )}
      </span>
    </Link>
  );
}
