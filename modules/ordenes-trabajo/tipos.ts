import type { OrdenTrabajo } from "@/db/schema/orden-trabajo";

/**
 * Una OT con lo que el formulario necesita para precargarse, y nada más.
 *
 * Existe porque `OrdenTrabajo` (el `$inferSelect` de la tabla entera) pide
 * `createdAt` y `updatedAt`, y la fila del listado no los trae:
 * `columnasListado` en queries.ts no los selecciona, porque la tabla no los
 * muestra. Sin este tipo, abrir el modal de edición desde una fila obligaría
 * a arrastrar dos columnas que nadie usa solo para satisfacer al compilador.
 *
 * Se define por resta (`Omit`) y no enumerando campos a mano a propósito: así
 * una columna nueva en el esquema entra sola aquí, y si alguna vez el
 * formulario necesita de verdad `createdAt`, el error salta en el sitio
 * correcto en vez de pasar desapercibido.
 */
export type OrdenTrabajoEditable = Omit<
  OrdenTrabajo,
  "createdAt" | "updatedAt"
>;
