import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { materiales } from "@/db/schema/materiales";
import { patronParcial } from "@/core/busqueda";
import type { FiltrosMateriales } from "./filtros";

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
 * Lista el catálogo de materiales aplicando los filtros que vengan.
 *
 * Por defecto solo los activos: la baja es lógica (`activo = false`, nunca un
 * DELETE — regla invariable 9), pero de cara al usuario tiene que verse como
 * un borrado. Quien quiera ver los inactivos lo pide explícitamente con
 * `inactivos`.
 *
 * Todo se resuelve en la consulta, nunca en el navegador.
 */
export async function listarMateriales(filtros: FiltrosMateriales = {}) {
  const { busqueda, inactivos } = filtros;
  const patron = busqueda ? patronParcial(busqueda) : null;

  const condiciones = [
    // El filtro ALTERNA entre dos vistas excluyentes, no acumula: sin él se
    // ven los activos, con él SOLO los inactivos. Antes era
    // `inactivos ? undefined : eq(activo, true)` —o sea, sin condición— y eso
    // hacía que la vista de inactivos mostrase TAMBIÉN los activos: al
    // reactivar una fila seguía ahí, y una fila que nunca se inactivó
    // aparecía igual. No era un problema de refresco: la consulta ya devolvía
    // esa fila.
    eq(materiales.activo, inactivos ? false : true),
    // Las cuatro columnas del buscador. Son `nullable`, y eso importa aquí:
    // `ILIKE` sobre NULL da NULL, no false — pero dentro de un `or(...)` eso
    // se comporta como "esta no casa", que es exactamente lo que se quiere.
    // Una fila sin marca no desaparece de la búsqueda: sigue pudiendo casar
    // por descripción o por código.
    patron
      ? or(
          ilike(materiales.codigo_interno, patron),
          ilike(materiales.descripcion, patron),
          ilike(materiales.marca, patron),
          ilike(materiales.modelo, patron),
        )
      : undefined,
  ];

  return db
    .select(columnasListado)
    .from(materiales)
    .where(and(...condiciones))
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
