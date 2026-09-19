"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FiltrosOt } from "../filtros";
import { useFiltros } from "./use-filtros";

/**
 * Filtro por rango de `fecha_creacion`, en la URL
 * (`/ordenes-trabajo?desde=2026-09-01&hasta=2026-09-19`) y resuelto en la
 * consulta del servidor como los otros dos. Los tres se combinan con AND: este
 * componente navega con los filtros que ya haya puestos más el suyo.
 *
 * Los dos extremos son inclusivos para el usuario — "hasta el 19" incluye el
 * 19 entero. Cómo se traduce eso a un `<` contra el inicio del día siguiente,
 * y por qué el corte se calcula en la zona del negocio y no en UTC, está en
 * `inicioDelDiaSiguiente` (lib/fecha.ts).
 *
 * El valor vive en estado local por el mismo motivo que en el buscador: el
 * input tiene que mostrar lo elegido de inmediato, sin esperar a que la
 * transición de navegación termine.
 */
export function FiltroFechas({ filtros }: { filtros: FiltrosOt }) {
  const { navegar, navegando } = useFiltros(filtros);
  const [desde, setDesde] = useState(filtros.desde ?? "");
  const [hasta, setHasta] = useState(filtros.hasta ?? "");

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="fecha-desde">Creación</Label>
      <Input
        id="fecha-desde"
        type="date"
        className="w-40"
        aria-label="Creadas desde"
        value={desde}
        disabled={navegando}
        onChange={(evento) => {
          const valor = evento.target.value;
          setDesde(valor);
          // Un input de fecha vacío es "sin límite inferior", no una fecha.
          navegar({ desde: valor || undefined });
        }}
      />
      <span className="text-sm text-muted-foreground">a</span>
      <Input
        id="fecha-hasta"
        type="date"
        className="w-40"
        aria-label="Creadas hasta"
        value={hasta}
        disabled={navegando}
        onChange={(evento) => {
          const valor = evento.target.value;
          setHasta(valor);
          navegar({ hasta: valor || undefined });
        }}
      />
    </div>
  );
}
