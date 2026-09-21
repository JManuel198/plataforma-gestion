import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { personal } from "@/db/schema/personal";
import { patronParcial } from "@/core/busqueda";
import type { FiltrosPersonal } from "./filtros";

/**
 * Las columnas que muestra el listado. `edad` NO está aquí y no puede estar:
 * no es una columna, se calcula al pintarla con `calcularEdad` (lib/fecha.ts)
 * a partir de `fecha_nacimiento`.
 */
const columnasListado = {
  id: personal.id,
  nombre: personal.nombre,
  apellido: personal.apellido,
  cargo: personal.cargo,
  dni: personal.dni,
  fecha_nacimiento: personal.fecha_nacimiento,
  activo: personal.activo,
} as const;

/**
 * Lista al personal aplicando los filtros que vengan.
 *
 * Por defecto solo los activos: la baja es lógica (`activo = false`, nunca un
 * DELETE), pero de cara al usuario tiene que verse como un borrado. Quien
 * quiera ver a los dados de baja lo pide explícitamente con `inactivos`.
 *
 * Todo se resuelve en la consulta, nunca en el navegador.
 */
export async function listarPersonal(filtros: FiltrosPersonal = {}) {
  const { busqueda, inactivos } = filtros;
  const patron = busqueda ? patronParcial(busqueda) : null;

  const condiciones = [
    inactivos ? undefined : eq(personal.activo, true),
    patron
      ? or(
          ilike(personal.nombre, patron),
          ilike(personal.apellido, patron),
          ilike(personal.dni, patron),
          ilike(personal.cargo, patron),
        )
      : undefined,
  ];

  return db
    .select(columnasListado)
    .from(personal)
    // Alfabético por apellido: es como se busca a una persona en una lista de
    // papel, y no hay correlativo ni fecha de emisión que sugiera otro orden.
    .where(and(...condiciones))
    .orderBy(asc(personal.apellido), asc(personal.nombre));
}

/** Una fila del listado, con el tipo que de verdad devuelve la consulta. */
export type FilaPersonal = Awaited<ReturnType<typeof listarPersonal>>[number];

export async function obtenerPersona(id: string) {
  const [encontrada] = await db
    .select()
    .from(personal)
    .where(eq(personal.id, id))
    .limit(1);

  return encontrada ?? null;
}
