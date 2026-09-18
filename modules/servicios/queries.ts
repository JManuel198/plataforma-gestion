import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { servicio } from "@/db/schema/servicio";
import type { EstadoServicio } from "./constantes";

/**
 * Lista los servicios, opcionalmente filtrados por estado. El filtro se
 * resuelve en la consulta, no en el navegador: la pantalla solo recibe las
 * filas que va a mostrar.
 */
export async function listarServicios(estado?: EstadoServicio) {
  return db
    .select()
    .from(servicio)
    .where(estado ? eq(servicio.estado, estado) : undefined)
    .orderBy(desc(servicio.fecha), desc(servicio.createdAt));
}

export async function obtenerServicio(id: string) {
  const [encontrado] = await db
    .select()
    .from(servicio)
    .where(eq(servicio.id, id))
    .limit(1);

  return encontrado ?? null;
}
