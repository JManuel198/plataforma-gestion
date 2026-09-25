import { and, asc, count, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { contactos } from "@/db/schema/contactos";
import { empresas } from "@/db/schema/empresas";
import { patronParcial } from "@/core/busqueda";
import type { Paginacion } from "@/core/paginacion";
import type { TipoEmpresa } from "./constantes";
import type { FiltrosEmpresas } from "./filtros";

/**
 * Qué valores de `empresas.tipo` trae cada opción del filtro. INCLUSIVO
 * (decidido el 2026-09-25, supuesto 24 de docs/spec/preguntas-abiertas.md):
 * una empresa que es cliente y proveedor aparece al filtrar por cualquiera de
 * los dos, porque lo es. Filtrar por `cliente_y_proveedor` sigue siendo
 * exacto: pide las que son ambas cosas, no las que son una u otra.
 *
 * `Record` sobre `TipoEmpresa` a propósito: si se añade un valor al enum,
 * tsc obliga a decidir aquí qué trae, en vez de que el filtro lo ignore en
 * silencio.
 */
const TIPOS_POR_FILTRO: Record<TipoEmpresa, TipoEmpresa[]> = {
  cliente: ["cliente", "cliente_y_proveedor"],
  proveedor: ["proveedor", "cliente_y_proveedor"],
  cliente_y_proveedor: ["cliente_y_proveedor"],
};

/**
 * Las columnas de la tabla MÁS las que solo enseña la vista de detalle.
 *
 * Van todas en la misma consulta, como en los demás listados: la fila le pasa
 * sus datos al modal y la vista se abre sin un segundo viaje al servidor. Son
 * diez filas por página de columnas de texto cortas, así que traer las de más
 * no pesa. `createdAt`/`updatedAt` quedan fuera: ni la tabla ni la vista las
 * pintan.
 */
const columnasListado = {
  id: empresas.id,
  codigo: empresas.codigo,
  razon_social: empresas.razon_social,
  nombre_comercial: empresas.nombre_comercial,
  nombre_corto: empresas.nombre_corto,
  ruc: empresas.ruc,
  tipo: empresas.tipo,
  tipo_contribuyente: empresas.tipo_contribuyente,
  descripcion_rubro: empresas.descripcion_rubro,
  estado: empresas.estado,
  condicion: empresas.condicion,
  direccion: empresas.direccion,
  distrito: empresas.distrito,
  provincia: empresas.provincia,
  departamento: empresas.departamento,
  pais: empresas.pais,
  activo: empresas.activo,
  // Columna Contactos del listado: cuántos contactos tiene la empresa,
  // ACTIVOS E INACTIVOS (decidido en el encargo del Bloque 3, 2026-09-25). Se
  // lee la tabla `contactos` directamente, nunca a través de
  // modules/contactos/ (un módulo no importa de otro).
  //
  // Subconsulta correlacionada y no `LEFT JOIN … GROUP BY`: el listado ya
  // pagina de a diez, así que son diez conteos que resuelve el índice
  // `contactos_empresa_id_idx`, y el `GROUP BY` obligaría a agrupar por las
  // diecisiete columnas de arriba. Vive aquí y no en core/: hoy solo la usa
  // este listado (se mueve cuando aparezca un segundo consumidor real).
  //
  // `db.$count` y NO la subconsulta escrita a mano con la plantilla `sql`:
  // dentro de un `sql` en el SELECT, Drizzle escribe las columnas SIN tabla
  // (`"empresa_id" = "id"`), y Postgres resuelve las dos contra `contactos` —
  // el conteo sale 0 siempre, sin ningún error.
  // `$count` sí las califica. Verificado contra la base el 2026-09-25.
  contactos: db.$count(contactos, eq(contactos.empresa_id, empresas.id)),
} as const;

/**
 * Las condiciones del listado, compartidas por `listarEmpresas` y
 * `contarResultados`. Tienen que ser EXACTAMENTE las mismas en las dos: si el
 * conteo filtrara distinto que la página, el pie diría «1–10 de 14» sobre un
 * resultado de otro tamaño.
 */
function condicionesListado(filtros: FiltrosEmpresas) {
  const { busqueda, tipo, inactivos } = filtros;
  const patron = busqueda ? patronParcial(busqueda) : null;

  return and(
    // ALTERNA entre dos vistas excluyentes, no acumula: sin el filtro se ven
    // las activas, con él SOLO las inactivas. Nunca
    // `inactivos ? undefined : eq(activo, true)` — ver la convención de
    // AGENTS.md. Es `activo` (baja lógica propia), NUNCA `estado` de SUNAT.
    eq(empresas.activo, inactivos ? false : true),
    tipo ? inArray(empresas.tipo, TIPOS_POR_FILTRO[tipo]) : undefined,
    // `ruc` es nullable: `ILIKE` sobre NULL da NULL, que dentro del `or(...)`
    // se comporta como "esta no casa". Una empresa extranjera sin RUC sigue
    // pudiendo casar por razón social.
    patron
      ? or(ilike(empresas.razon_social, patron), ilike(empresas.ruc, patron))
      : undefined,
  );
}

/**
 * Cuántas empresas casan con los filtros, en todas las páginas: el «de N» del
 * pie de la tabla. Mismo `FROM` y mismas condiciones que `listarEmpresas`.
 */
export async function contarResultados(
  filtros: FiltrosEmpresas,
): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(empresas)
    .where(condicionesListado(filtros));

  return fila?.total ?? 0;
}

/**
 * Cuántas empresas hay en la vista de activas o en la de inactivas, sin mirar
 * búsqueda ni tipo: el contador de la barra de filtros. Mismo criterio de
 * alternancia que el listado.
 */
export async function contarEmpresas(inactivos = false): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(empresas)
    .where(eq(empresas.activo, inactivos ? false : true));

  return fila?.total ?? 0;
}

/**
 * Lista las empresas aplicando los filtros que vengan. Los filtros llegan ya
 * validados desde `searchParams` por los esquemas `filtro*Schema` de
 * ./schema.ts — mismo reparto que en Personal y EPPs: la página parsea, esta
 * función solo consulta.
 *
 * Paginada con `LIMIT`/`OFFSET`: `pagina` sale de `calcularPaginacion`
 * (core/), que necesita antes el total de `contarResultados`.
 */
export async function listarEmpresas(
  filtros: FiltrosEmpresas,
  pagina: Pick<Paginacion, "limite" | "desplazamiento">,
) {
  return (
    db
      .select(columnasListado)
      .from(empresas)
      .where(condicionesListado(filtros))
      // Por código, que es además el orden de alta. Con ancho fijo de 4
      // dígitos el orden alfabético coincide con el numérico hasta
      // `CLT.9999` (ver constantes.ts). Único y obligatorio: orden estable
      // para paginar.
      .orderBy(asc(empresas.codigo))
      .limit(pagina.limite)
      .offset(pagina.desplazamiento)
  );
}

/** Una fila del listado, con el tipo que de verdad devuelve la consulta. */
export type FilaEmpresa = Awaited<ReturnType<typeof listarEmpresas>>[number];

/** El detalle completo de una empresa, o `null` si no existe. */
export async function obtenerEmpresa(id: string) {
  const [encontrada] = await db
    .select()
    .from(empresas)
    .where(eq(empresas.id, id))
    .limit(1);

  return encontrada ?? null;
}
