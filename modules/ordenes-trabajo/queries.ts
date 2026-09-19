import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ordenTrabajo } from "@/db/schema/orden-trabajo";
import { servicio } from "@/db/schema/servicio";
import type { EstadoOt } from "./constantes";

/**
 * Las columnas que muestra el listado, más las dos del Servicio de origen que
 * sirven para reconocerlo de un vistazo.
 *
 * Se lee la tabla `servicio` directamente desde el esquema compartido, no a
 * través de `modules/servicios/` — un módulo de negocio no importa de otro
 * (AGENTS.md, Arquitectura). Lo que se comparte es el esquema, no el módulo.
 */
const columnasListado = {
  id: ordenTrabajo.id,
  codigo_ot: ordenTrabajo.codigo_ot,
  codigo_cotizacion: ordenTrabajo.codigo_cotizacion,
  asunto: ordenTrabajo.asunto,
  codigo_oc: ordenTrabajo.codigo_oc,
  cliente: ordenTrabajo.cliente,
  estado: ordenTrabajo.estado,
  fecha_creacion: ordenTrabajo.fecha_creacion,
  responsable: ordenTrabajo.responsable,
  servicio_id: ordenTrabajo.servicio_id,
  servicio_descripcion: servicio.servicio,
} as const;

/**
 * Lista las órdenes de trabajo, opcionalmente filtradas por estado. El filtro
 * se resuelve en la consulta, no en el navegador: la pantalla solo recibe las
 * filas que va a mostrar.
 *
 * `innerJoin` y no `leftJoin`: `servicio_id` es `NOT NULL` con clave foránea,
 * así que toda OT tiene su Servicio — si algún día no lo tuviera, es un dato
 * roto que conviene ver, no esconder con un join permisivo.
 */
export async function listarOrdenesTrabajo(estado?: EstadoOt) {
  return db
    .select(columnasListado)
    .from(ordenTrabajo)
    .innerJoin(servicio, eq(ordenTrabajo.servicio_id, servicio.id))
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

/**
 * El Servicio del que va a nacer una OT. La pantalla de creación lo resuelve
 * en el servidor a partir del `?servicio=` de la URL: si no existe, no se
 * abre el formulario.
 */
export async function obtenerServicioOrigen(id: string) {
  const [encontrado] = await db
    .select({
      id: servicio.id,
      servicio: servicio.servicio,
      cliente: servicio.cliente,
      codigo_cotizacion: servicio.codigo_cotizacion,
      codigo_oc: servicio.codigo_oc,
    })
    .from(servicio)
    .where(eq(servicio.id, id))
    .limit(1);

  return encontrado ?? null;
}

export type ServicioOrigen = NonNullable<
  Awaited<ReturnType<typeof obtenerServicioOrigen>>
>;
