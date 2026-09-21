import { and, desc, eq, gte, ilike, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { ordenTrabajo } from "@/db/schema/orden-trabajo";
import { patronParcial } from "@/core/busqueda";
import { inicioDelDia, inicioDelDiaSiguiente } from "@/lib/fecha";
import type { FiltrosOt } from "./filtros";

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
  servicio: ordenTrabajo.servicio,
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
 * Lista las órdenes de trabajo aplicando los filtros que vengan.
 *
 * Todo se resuelve en la consulta, nunca en el navegador: la pantalla recibe
 * solo las filas que va a mostrar (regla de tablas de
 * .claude/skills/shadcn-conventions/SKILL.md).
 *
 * Los filtros se combinan con AND entre sí — poner una fecha no borra el
 * estado ni la búsqueda. Dentro de la búsqueda, en cambio, los tres campos van
 * con OR: basta con que coincida uno.
 */
export async function listarOrdenesTrabajo(filtros: FiltrosOt = {}) {
  const { estado, busqueda, desde, hasta } = filtros;
  const patron = busqueda ? patronParcial(busqueda) : null;

  const condiciones = [
    estado ? eq(ordenTrabajo.estado, estado) : undefined,
    patron
      ? or(
          ilike(ordenTrabajo.codigo_ot, patron),
          ilike(ordenTrabajo.cliente, patron),
          ilike(ordenTrabajo.servicio, patron),
        )
      : undefined,
    // `fecha_creacion` es `timestamp` sin zona guardado en UTC (ver
    // db/index.ts), así que los límites se calculan con la zona del negocio en
    // lib/fecha.ts en vez de comparar contra el texto "2026-09-19" pelado, que
    // cortaría por las 00:00 UTC — cinco horas antes de que empiece el día en
    // Lima.
    desde ? gte(ordenTrabajo.fecha_creacion, inicioDelDia(desde)) : undefined,
    // `<` contra el inicio del día siguiente, no `<=` contra el inicio de
    // `hasta`: "hasta el 19" incluye todo el 19, no solo su medianoche.
    hasta
      ? lt(ordenTrabajo.fecha_creacion, inicioDelDiaSiguiente(hasta))
      : undefined,
  ];

  return db
    .select(columnasListado)
    .from(ordenTrabajo)
    // `and()` ignora los `undefined`, y devuelve `undefined` si no queda
    // ninguna condición — que es exactamente "sin WHERE".
    .where(and(...condiciones))
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
