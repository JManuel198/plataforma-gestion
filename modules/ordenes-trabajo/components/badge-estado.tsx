import { Badge } from "@/components/ui/badge";
import type { EstadoOt } from "../constantes";

/**
 * Un tono distinto por estado: con siete, dos que compartan variante dejan
 * de comunicar nada. El eje es cuánto peso visual merece cada punto del
 * ciclo, y `Facturado` no puede compartir tono con `Finalizada` — una es el
 * cierre técnico (el trabajo terminó) y la otra el cierre comercial (se
 * cobró), que es justo la distinción que el listado tiene que dejar ver.
 *
 * `dashed`, `success` e `info` se agregaron a components/ui/badge.tsx para
 * esto: el tema es monocromo (solo `destructive` tenía color), así que siete
 * rellenos de gris distinguibles no existían. `Pausada` pasa a distinguirse
 * por trazo punteado — lo interrumpido se lee mejor así que como un gris
 * más —, `Facturado` estrena el token `--success` y `Aceptada` el token
 * `--info`, los dos con el mismo patrón de tinte que `destructive`.
 *
 * `Aceptada` va en azul y no en otro verde a propósito: es el visto bueno
 * para arrancar, no el cobro, y con `Facturado` a un par de filas de
 * distancia dos verdes se leerían como el mismo estado de un vistazo.
 */
const variantePorEstado: Record<
  EstadoOt,
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "dashed"
  | "success"
  | "info"
> = {
  Pendiente: "outline",
  Aceptada: "info",
  "En ejecución": "default",
  Pausada: "dashed",
  Finalizada: "secondary",
  Facturado: "success",
  Cancelada: "destructive",
};

/**
 * El estado de una OT con su color, dondequiera que se muestre.
 *
 * Vive suelto y no dentro de `selector-estado-fila.tsx` porque hay DOS sitios
 * que lo pintan: el disparador del Select de la fila y la vista de solo
 * lectura del modal. Es el mismo dato y no puede verse de dos maneras, así
 * que el mapa de variantes tiene un solo dueño — la misma regla que ya
 * obligó a mover `patronParcial` y `esUniqueViolado` a core/, aplicada aquí a
 * escala de módulo (ver la deuda técnica de AGENTS.md: dos copias de una
 * tabla de colores divergen igual de callado que dos copias de un `if`).
 *
 * Sin `"use client"` a propósito: es marcado y nada más, así que sirve igual
 * dentro del Select (cliente) que en una pantalla de servidor.
 */
export function BadgeEstado({ estado }: { estado: EstadoOt }) {
  return <Badge variant={variantePorEstado[estado]}>{estado}</Badge>;
}
