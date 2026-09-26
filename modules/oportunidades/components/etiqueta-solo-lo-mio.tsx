"use client";

import { UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * La etiqueta fija "Solo lo mío" junto al título (sección 5 de la spec).
 *
 * ES UN RECORDATORIO, NO UN CONTROL: nunca filtra, tampoco cuando existan los
 * roles. Por eso es un `Badge` y no un botón o un interruptor, y su tooltip
 * dice qué recuerda sin sugerir que cambie lo que se ve.
 *
 * El trigger es el propio `Badge` (un `<span>`) con `tabIndex={0}`, para que
 * el tooltip se alcance también con el teclado. El trigger de Base UI no pasa
 * por `useButton`, así que no le pone `role="button"` al `<span>` (la regla de
 * `nativeButton` de AGENTS.md no aplica aquí).
 */
export function EtiquetaSoloLoMio() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Badge variant="outline" tabIndex={0} className="gap-1" />}
      >
        <UserIcon aria-hidden />
        Solo lo mío
      </TooltipTrigger>
      <TooltipContent>
        Recordatorio: estos registros son propios. Eres el asesor de cada
        oportunidad que registras.
      </TooltipContent>
    </Tooltip>
  );
}
