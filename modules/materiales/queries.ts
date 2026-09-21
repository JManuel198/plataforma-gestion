import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { materiales } from "@/db/schema/materiales";
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
 * Convierte el texto del buscador en el patrón de un `ILIKE`.
 *
 * Copia deliberada de `patronParcial` en modules/personal/queries.ts y
 * modules/ordenes-trabajo/queries.ts: dos módulos no se importan entre sí
 * (AGENTS.md, Arquitectura). Ya son TRES copias idénticas, así que esta
 * función cumple de sobra la condición para mudarse a core/ — se deja aquí
 * solo para no mezclar ese movimiento con el trabajo de este bloque, y es lo
 * primero que hay que hacer si aparece un cuarto listado con búsqueda.
 *
 * El valor viaja parametrizado, así que no hay inyección posible; lo que hay
 * que neutralizar son los comodines del propio `LIKE`: sin esto, buscar "50%"
 * traería todo lo que empiece por "50". El escape es `\`, el que PostgreSQL
 * usa por defecto en `LIKE`/`ILIKE`.
 */
function patronParcial(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}%`;
}

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
    inactivos ? undefined : eq(materiales.activo, true),
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
