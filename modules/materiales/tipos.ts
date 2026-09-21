import type { Material } from "@/db/schema/materiales";

/**
 * Un material con lo que el formulario necesita para precargarse.
 *
 * Mismo criterio que `PersonaEditable` y `OrdenTrabajoEditable`: la fila del
 * listado no trae `createdAt`/`updatedAt` porque la consulta no los
 * selecciona, y exigir el `$inferSelect` completo obligaría a arrastrar dos
 * columnas que nadie muestra solo para contentar al compilador.
 */
export type MaterialEditable = Omit<Material, "createdAt" | "updatedAt">;
