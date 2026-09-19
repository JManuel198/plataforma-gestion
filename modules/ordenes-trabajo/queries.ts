import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ordenTrabajo } from "@/db/schema/orden-trabajo";
import type { EstadoOt } from "./constantes";

/**
 * Las columnas que muestra el listado. Desde la fusión con Servicio salen
 * todas de `orden_trabajo`: no hay join con ninguna otra tabla porque la OT
 * ya no nace de otra fila.
 */
const columnasListado = {
  id: ordenTrabajo.id,
  codigo_ot: ordenTrabajo.codigo_ot,
  codigo_cotizacion: ordenTrabajo.codigo_cotizacion,
  codigo_revision: ordenTrabajo.codigo_revision,
  asunto: ordenTrabajo.asunto,
  codigo_oc: ordenTrabajo.codigo_oc,
  cliente: ordenTrabajo.cliente,
  precio: ordenTrabajo.precio,
  moneda: ordenTrabajo.moneda,
  estado: ordenTrabajo.estado,
  fecha_creacion: ordenTrabajo.fecha_creacion,
  responsable: ordenTrabajo.responsable,
  comentarios: ordenTrabajo.comentarios,
} as const;

/**
 * Lista las órdenes de trabajo, opcionalmente filtradas por estado. El filtro
 * se resuelve en la consulta, no en el navegador: la pantalla solo recibe las
 * filas que va a mostrar.
 */
export async function listarOrdenesTrabajo(estado?: EstadoOt) {
  return db
    .select(columnasListado)
    .from(ordenTrabajo)
    .where(estado ? eq(ordenTrabajo.estado, estado) : undefined)
    .orderBy(desc(ordenTrabajo.fecha_creacion), desc(ordenTrabajo.createdAt));
}

/** Una fila del listado, con el tipo que de verdad devuelve la consulta. */
export type FilaOrdenTrabajo = Awaited<
  ReturnType<typeof listarOrdenesTrabajo>
>[number];

export async function obtenerOrdenTrabajo(id: string) {
  const [encontrada] = await db
    .select()
    .from(ordenTrabajo)
    .where(eq(ordenTrabajo.id, id))
    .limit(1);

  return encontrada ?? null;
}
