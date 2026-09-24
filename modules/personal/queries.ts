import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { personal } from "@/db/schema/personal";
import { patronParcial } from "@/core/busqueda";
import type { FiltrosPersonal } from "./filtros";
import type { Paginacion } from "@/core/paginacion";

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
 * Las condiciones del listado, compartidas por `listarPersonal` y
 * `contarResultados`. Tienen que ser EXACTAMENTE las mismas en las dos: si el
 * conteo filtrara distinto que la página, el pie diría «1–10 de 14» sobre un
 * resultado de otro tamaño, y la última página podría salir vacía.
 */
function condicionesListado(filtros: FiltrosPersonal) {
  const { busqueda, inactivos } = filtros;
  const patron = busqueda ? patronParcial(busqueda) : null;

  return and(
    // El filtro ALTERNA entre dos vistas excluyentes, no acumula: sin él se
    // ven los activos, con él SOLO los inactivos. Antes era
    // `inactivos ? undefined : eq(activo, true)` —o sea, sin condición— y eso
    // hacía que la vista de inactivos mostrase TAMBIÉN los activos: al
    // reactivar una fila seguía ahí, y una fila que nunca se inactivó
    // aparecía igual. No era un problema de refresco: la consulta ya devolvía
    // esa fila.
    eq(personal.activo, inactivos ? false : true),
    patron
      ? or(
          ilike(personal.nombre, patron),
          ilike(personal.apellido, patron),
          ilike(personal.dni, patron),
          ilike(personal.cargo, patron),
        )
      : undefined,
  );
}

/**
 * Cuántos personas casan con los filtros, en todas las páginas: el «de N» del
 * pie de la tabla. Mismo `FROM` y mismas condiciones que `listarPersonal`.
 */
export async function contarResultados(filtros: FiltrosPersonal): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(personal)
    // Alfabético por apellido: es como se busca a una persona en una lista de
    // papel, y no hay correlativo ni fecha de emisión que sugiera otro orden.
    .where(condicionesListado(filtros));

  return fila?.total ?? 0;
}

/**
 * Cuántos personas hay en la vista de activos o en la de inactivos, sin mirar
 * la búsqueda: el contador de la barra de filtros, que responde "¿cuántos
 * hay?", no "¿cuántos encontré?". Mismo criterio de alternancia que el
 * listado: una vista u otra, nunca las dos sumadas.
 */
export async function contarPersonal(inactivos = false): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(personal)
    .where(eq(personal.activo, inactivos ? false : true));

  return fila?.total ?? 0;
}

/**
 * Lista al personal aplicando los filtros que vengan.
 *
 * Por defecto solo los activos: la baja es lógica (`activo = false`, nunca un
 * DELETE), pero de cara al usuario tiene que verse como un borrado. Quien
 * quiera ver a los dados de baja lo pide explícitamente con `inactivos`.
 *
 * Todo se resuelve en la consulta, nunca en el navegador.
 *
 * Paginada con `LIMIT`/`OFFSET`: `pagina` sale de `calcularPaginacion`
 * (core/), que necesita antes el total de `contarResultados`.
 */
export async function listarPersonal(
  filtros: FiltrosPersonal,
  pagina: Pick<Paginacion, "limite" | "desplazamiento">,
) {


  return db
    .select(columnasListado)
    .from(personal)
    // Alfabético por apellido: es como se busca a una persona en una lista de
    // papel, y no hay correlativo ni fecha de emisión que sugiera otro orden.
    .where(condicionesListado(filtros))
    .orderBy(asc(personal.apellido), asc(personal.nombre), asc(personal.id))
    .limit(pagina.limite)
    .offset(pagina.desplazamiento);
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
