import type { Material } from "@/db/schema/materiales";

/**
 * Un material con lo que el modal necesita para pintarse, en vista o en
 * edición.
 *
 * Mismo criterio que `PersonaEditable` y `OrdenTrabajoEditable`: se define por
 * resta, así que una columna nueva del esquema entra sola aquí.
 *
 * Solo omite `updatedAt`. `createdAt` SÍ está, y esa es la diferencia con los
 * otros dos: desde que desapareció `fecha_activacion`, la fecha que se muestra
 * en la vista de detalle es la de creación, así que dejó de ser una columna de
 * auditoría invisible para pasar a ser un dato de pantalla.
 */
export type MaterialEditable = Omit<Material, "updatedAt"> & {
  /**
   * Las características técnicas, en su orden de entrada. Vienen de la tabla
   * hija `material_caracteristicas`, no de una columna, pero para el modal son
   * parte de la misma ficha — por eso viajan juntas en este tipo y no aparte.
   *
   * Solo los textos: el modal no necesita los `id` de esas filas porque al
   * guardar se reescribe la lista completa del material dentro de una
   * transacción (ver `editarMaterialEnModal`).
   */
  caracteristicas: string[];
};
