import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { materiales } from "@/db/schema/materiales";

/**
 * Las columnas que muestra el listado: todas las de negocio, más `activo`
 * para poder marcar visualmente las filas inactivas. Fuera quedan
 * `createdAt`/`updatedAt`, que nadie pinta.
 */
const columnasListado = {
  id: materiales.id,
  codigo_interno: materiales.codigo_interno,
  descripcion: materiales.descripcion,
  marca: materiales.marca,
  modelo: materiales.modelo,
  codigo_fabrica: materiales.codigo_fabrica,
  unidad: materiales.unidad,
  fecha_activacion: materiales.fecha_activacion,
  activo: materiales.activo,
} as const;

/**
 * Lista el catálogo de materiales.
 *
 * Solo los activos: la baja es lógica (`activo = false`, nunca un DELETE —
 * regla invariable 9), pero de cara al usuario tiene que verse como un
 * borrado. Hoy no hay nada que ponga `activo` en false, así que en la práctica
 * devuelve todo; el filtro está desde el principio para que el día que la
 * Parte 2 añada la baja no haya que tocar la consulta, y para que
 * `materiales_activo_idx` sirva de algo.
 *
 * Sin parámetros todavía: el buscador y el filtro de inactivos son Parte 2.
 * Cuando lleguen, esta función recibe un objeto de filtros como
 * `listarPersonal`, y el filtrado se resuelve aquí en la consulta — nunca en
 * el navegador sobre un arreglo ya traído entero.
 */
export async function listarMateriales() {
  return db
    .select(columnasListado)
    .from(materiales)
    .where(eq(materiales.activo, true))
    // Por código interno: es el identificador con el que el usuario busca una
    // herramienta en una lista de papel. No hay correlativo ni fecha de
    // emisión que sugiera otro orden.
    .orderBy(asc(materiales.codigo_interno));
}

/** Una fila del listado, con el tipo que de verdad devuelve la consulta. */
export type FilaMaterial = Awaited<ReturnType<typeof listarMateriales>>[number];

export async function obtenerMaterial(id: string) {
  const [encontrado] = await db
    .select()
    .from(materiales)
    .where(eq(materiales.id, id))
    .limit(1);

  return encontrado ?? null;
}
