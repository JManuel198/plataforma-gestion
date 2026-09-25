import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { contactos } from "@/db/schema/contactos";
import { empresas } from "@/db/schema/empresas";
import { patronParcial } from "@/core/busqueda";
import type { Paginacion } from "@/core/paginacion";
import { MAXIMO_EMPRESAS_SELECTOR } from "./constantes";
import type { FiltrosContactos } from "./filtros";

// Este módulo LEE la tabla `empresas` directamente, con JOIN, y no a través de
// modules/clientes/: un módulo nunca importa de otro (AGENTS.md,
// Arquitectura). `db/schema/` es terreno compartido; el código de Clientes, no.

/**
 * Las columnas del contacto MÁS las de su empresa que pinta el listado.
 *
 * Mismo criterio que el listado de Empresas: la fila le pasa sus datos al modal
 * y la vista se abre sin un segundo viaje al servidor. `empresa_activo` va
 * porque la empresa puede estar dada de baja y el contacto no (decisión
 * confirmada, ver entidades.md): la interfaz necesita saberlo para marcarla.
 */
const columnasListado = {
  id: contactos.id,
  empresa_id: contactos.empresa_id,
  nombre: contactos.nombre,
  cargo: contactos.cargo,
  correo: contactos.correo,
  celular: contactos.celular,
  activo: contactos.activo,
  empresa_razon_social: empresas.razon_social,
  empresa_ruc: empresas.ruc,
  empresa_activo: empresas.activo,
} as const;

/**
 * Las condiciones del listado, compartidas por `listarContactos` y
 * `contarResultados`. Tienen que ser EXACTAMENTE las mismas en las dos (y sobre
 * el mismo JOIN): si el conteo filtrara distinto que la página, el pie diría
 * «1–10 de 14» sobre un resultado de otro tamaño.
 */
function condicionesListado(filtros: FiltrosContactos) {
  const { busqueda, inactivos } = filtros;
  const patron = busqueda ? patronParcial(busqueda) : null;

  return and(
    // ALTERNA entre dos vistas excluyentes, no acumula: sin el filtro se ven
    // los activos, con él SOLO los inactivos. Nunca
    // `inactivos ? undefined : eq(activo, true)` — ver la convención de
    // AGENTS.md. Es el `activo` del CONTACTO: el de la empresa no filtra nada.
    eq(contactos.activo, inactivos ? false : true),
    // `cargo`, `correo` y `nombre_comercial` son nullables: `ILIKE` sobre NULL
    // da NULL, que dentro del `or(...)` se comporta como "esta no casa". Un
    // contacto sin correo sigue pudiendo casar por su nombre o su empresa.
    patron
      ? or(
          ilike(contactos.nombre, patron),
          ilike(contactos.cargo, patron),
          ilike(contactos.correo, patron),
          ilike(empresas.razon_social, patron),
          ilike(empresas.nombre_comercial, patron),
        )
      : undefined,
  );
}

/**
 * Cuántos contactos casan con los filtros, en todas las páginas: el «de N» del
 * pie de la tabla. Mismo `FROM`, mismo JOIN y mismas condiciones que
 * `listarContactos`.
 *
 * `INNER JOIN` y no `LEFT`: `empresa_id` es `NOT NULL` con FK, así que todo
 * contacto tiene exactamente una empresa y el JOIN nunca pierde ni duplica
 * filas.
 */
export async function contarResultados(
  filtros: FiltrosContactos,
): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(contactos)
    .innerJoin(empresas, eq(contactos.empresa_id, empresas.id))
    .where(condicionesListado(filtros));

  return fila?.total ?? 0;
}

/**
 * Cuántos contactos activos e inactivos hay en total, sin mirar la búsqueda:
 * el indicador de la barra de filtros. Los dos números en una sola consulta
 * con `FILTER`, en vez de dos viajes; la página enseña el que corresponda a la
 * vista en la que está.
 */
export async function contarContactosPorEstado(): Promise<{
  activos: number;
  inactivos: number;
}> {
  const [fila] = await db
    .select({
      activos: sql<number>`count(*) filter (where ${contactos.activo})`.mapWith(
        Number,
      ),
      inactivos:
        sql<number>`count(*) filter (where not ${contactos.activo})`.mapWith(
          Number,
        ),
    })
    .from(contactos);

  return { activos: fila?.activos ?? 0, inactivos: fila?.inactivos ?? 0 };
}

/**
 * Lista los contactos aplicando los filtros que vengan. Los filtros llegan ya
 * validados desde `searchParams` por los esquemas `filtro*Schema` de
 * ./schema.ts — la página parsea, esta función solo consulta.
 *
 * Paginada con `LIMIT`/`OFFSET`: `pagina` sale de `calcularPaginacion`
 * (core/), que necesita antes el total de `contarResultados`.
 */
export async function listarContactos(
  filtros: FiltrosContactos,
  pagina: Pick<Paginacion, "limite" | "desplazamiento">,
) {
  return (
    db
      .select(columnasListado)
      .from(contactos)
      .innerJoin(empresas, eq(contactos.empresa_id, empresas.id))
      .where(condicionesListado(filtros))
      // Sin código correlativo que ordene: por nombre, y el `id` desempata
      // para que el orden sea estable entre páginas aunque dos contactos se
      // llamen igual.
      .orderBy(asc(contactos.nombre), asc(contactos.id))
      .limit(pagina.limite)
      .offset(pagina.desplazamiento)
  );
}

/** Una fila del listado, con el tipo que de verdad devuelve la consulta. */
export type FilaContacto = Awaited<ReturnType<typeof listarContactos>>[number];

/**
 * El detalle completo de un contacto con su empresa, o `null` si no existe.
 */
export async function obtenerContacto(id: string) {
  const [encontrado] = await db
    .select({
      contacto: contactos,
      empresa: {
        id: empresas.id,
        codigo: empresas.codigo,
        razon_social: empresas.razon_social,
        nombre_comercial: empresas.nombre_comercial,
        ruc: empresas.ruc,
        activo: empresas.activo,
      },
    })
    .from(contactos)
    .innerJoin(empresas, eq(contactos.empresa_id, empresas.id))
    .where(eq(contactos.id, id))
    .limit(1);

  return encontrado ? { ...encontrado.contacto, empresa: encontrado.empresa } : null;
}

export type DetalleContacto = NonNullable<
  Awaited<ReturnType<typeof obtenerContacto>>
>;

/**
 * Empresas para el selector del formulario de contacto.
 *
 * Trae TODAS, activas e inactivas, con su `activo`: un contacto puede estar
 * asociado a una empresa dada de baja, y al editarlo la suya tiene que poder
 * aparecer. Marcar visualmente las inactivas es cosa de la interfaz; esto solo
 * entrega el dato. Se ordenan las activas primero, que son las que se eligen
 * casi siempre.
 *
 * Sin texto devuelve las primeras por razón social: el combobox se abre antes
 * de que el usuario escriba. Con texto busca por razón social, nombre
 * comercial o RUC. El tope (`MAXIMO_EMPRESAS_SELECTOR`) es de combobox, no de
 * listado: si la empresa no aparece, se afina el texto.
 */
export async function listarEmpresasParaSelector(busqueda: string) {
  const patron = busqueda ? patronParcial(busqueda) : null;

  return db
    .select({
      id: empresas.id,
      razon_social: empresas.razon_social,
      ruc: empresas.ruc,
      activo: empresas.activo,
    })
    .from(empresas)
    .where(
      patron
        ? or(
            ilike(empresas.razon_social, patron),
            ilike(empresas.nombre_comercial, patron),
            ilike(empresas.ruc, patron),
          )
        : undefined,
    )
    .orderBy(desc(empresas.activo), asc(empresas.razon_social), asc(empresas.id))
    .limit(MAXIMO_EMPRESAS_SELECTOR);
}

/** Una opción del selector de empresa, con el tipo real de la consulta. */
export type EmpresaSeleccionable = Awaited<
  ReturnType<typeof listarEmpresasParaSelector>
>[number];
