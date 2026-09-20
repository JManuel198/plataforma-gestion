import type { Personal } from "@/db/schema/personal";

/**
 * Una persona con lo que el formulario necesita para precargarse.
 *
 * Mismo criterio que `OrdenTrabajoEditable` en modules/ordenes-trabajo: la
 * fila del listado no trae `createdAt`/`updatedAt` porque la consulta no los
 * selecciona, y exigir el `$inferSelect` completo obligaría a arrastrar dos
 * columnas que nadie muestra solo para contentar al compilador.
 */
export type PersonaEditable = Omit<Personal, "createdAt" | "updatedAt">;
