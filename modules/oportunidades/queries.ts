import {
  and,
  asc,
  count,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { contactos } from "@/db/schema/contactos";
import { empresas } from "@/db/schema/empresas";
import {
  oportunidadActividades,
  oportunidadHistorial,
  oportunidades,
} from "@/db/schema/oportunidades";
import { patronParcial } from "@/core/busqueda";
import type { Paginacion } from "@/core/paginacion";
import { ZONA_HORARIA } from "@/lib/fecha";
import {
  DIAS_SIN_MOVER_ALERTA,
  DIAS_VENTANA_FINALIZADO,
  ETAPAS_OPORTUNIDAD,
  RANGOS_VALOR,
  UMBRAL_MAS_50K_CENTIMOS,
  type CampoHistorial,
  type EtapaOportunidad,
  type TipoActividad,
} from "./constantes";
import { normalizarFiltros, type FiltrosOportunidades } from "./filtros";

// Este módulo LEE `contactos` y `empresas` directamente, de db/schema/, y no a
// través de modules/contactos/ ni modules/clientes/ (el selector de empresa
// del modal usa además core/selector-empresas.ts, desde actions.ts): un
// módulo nunca importa de otro (AGENTS.md, Arquitectura). `db/schema/` es
// terreno compartido; el código de los otros módulos, no.
//
// TODO CÁLCULO DE ESTE ARCHIVO OCURRE EN LA BASE, no en el navegador (regla
// invariable 1): los días sin mover, las sumas por moneda, la ventana de 30
// días de Finalizado y la tasa de cierre salen de aquí ya resueltos. La
// interfaz solo los pinta.

/**
 * Contactos para el selector del formulario de oportunidad: SOLO los activos
 * de la empresa dada (sección 3 de la spec).
 *
 * Sin texto de búsqueda ni tope, a diferencia del selector de empresa: la
 * lista ya viene acotada a una empresa, que tiene pocos contactos. Si alguna
 * vez una empresa tiene tantos que el desplegable estorba, se añade búsqueda
 * entonces.
 *
 * Esto solo decide qué se OFRECE. Que el contacto que llega al guardar cumpla
 * lo mismo lo vuelve a comprobar la acción (`validarContacto` en actions.ts):
 * el formulario puede estar desactualizado o manipulado.
 */
export async function listarContactosParaSelector(empresaId: string) {
  return db
    .select({
      id: contactos.id,
      nombre: contactos.nombre,
      cargo: contactos.cargo,
    })
    .from(contactos)
    .where(and(eq(contactos.empresa_id, empresaId), eq(contactos.activo, true)))
    // El `id` desempata para que el orden sea estable si dos se llaman igual.
    .orderBy(asc(contactos.nombre), asc(contactos.id));
}

/** Una opción del selector de contacto, con el tipo real de la consulta. */
export type ContactoSeleccionable = Awaited<
  ReturnType<typeof listarContactosParaSelector>
>[number];

// --- Piezas comunes ----------------------------------------------------------

/**
 * Hoy, como FECHA en la zona del negocio. En Vercel el reloj corre en UTC:
 * entre las 19:00 y la medianoche de Lima, `current_date` ya sería mañana.
 */
const hoyEnLima = sql`(now() AT TIME ZONE ${ZONA_HORARIA})::date`;

/**
 * Días calendario, en hora de Lima, desde el último cambio de etapa hasta hoy
 * (sección 3, "Reloj de días"). Resta de dos `date` en PostgreSQL: un entero,
 * sin horas ni redondeos. Un cambio a las 23:50 de ayer ya cuenta 1 día a las
 * 00:10 de hoy, que es lo que significa "días calendario".
 */
const diasDesdeCambioDeEtapa = sql<number>`(${hoyEnLima} - (${oportunidades.etapa_cambiada_en} AT TIME ZONE ${ZONA_HORARIA})::date)`;

/**
 * Lo mismo, pero `null` donde el reloj NO APLICA: Finalizadas, Perdidas y
 * Anuladas (sección 3: mide movimiento, y solo tiene sentido mientras la
 * oportunidad sigue moviéndose). La interfaz pinta "—" con el `null`; no
 * decide ella cuándo aplica.
 */
const diasSinMover = sql<number | null>`CASE WHEN ${oportunidades.situacion} = 'abierta' AND ${oportunidades.etapa} <> 'finalizado' THEN ${diasDesdeCambioDeEtapa} END`;

/**
 * Condiciones que comparten el kanban y la tabla: búsqueda, cliente, valor y
 * opción rápida. Los filtros llegan ya normalizados (`normalizarFiltros`).
 *
 * LOS FILTROS DE VALOR NUNCA MEZCLAN MONEDAS: tanto el desplegable como
 * ">$50k" exigen `moneda = 'USD'` en la MISMA condición que compara el
 * importe. No hay tipo de cambio (sección 5 y "Una sola moneda por trabajo" en
 * reglas-negocio.md), así que una oportunidad de S/ 80,000 no es ">$50k" ni
 * cae en ningún rango: con un filtro de valor puesto, las de soles quedan
 * fuera. Compararlas por su número desnudo sería tratar soles como dólares.
 */
function condicionesComunes(filtros: FiltrosOportunidades): SQL | undefined {
  const { busqueda, rapido, cliente, valor } = filtros;
  const patron = busqueda ? patronParcial(busqueda) : null;
  const rango = valor ? RANGOS_VALOR[valor] : null;

  return and(
    // `nombre_comercial` es nullable: `ILIKE` sobre NULL da NULL, que dentro
    // del `or(...)` cuenta como "esta no casa", sin descartar la fila.
    patron
      ? or(
          ilike(oportunidades.titulo, patron),
          ilike(oportunidades.codigo, patron),
          ilike(empresas.razon_social, patron),
          ilike(empresas.nombre_comercial, patron),
        )
      : undefined,
    cliente ? eq(oportunidades.empresa_id, cliente) : undefined,
    rango
      ? and(
          eq(oportunidades.moneda, "USD"),
          gte(oportunidades.valor_estimado, rango[0]),
          // `null` = "$200k o más": sin techo.
          rango[1] === null ? undefined : lt(oportunidades.valor_estimado, rango[1]),
        )
      : undefined,
    rapido === "mas-50k"
      ? and(
          eq(oportunidades.moneda, "USD"),
          gte(oportunidades.valor_estimado, UMBRAL_MAS_50K_CENTIMOS),
        )
      : undefined,
    // Solo donde el reloj aplica: abierta y fuera de Finalizado. En el kanban
    // eso deja la columna Finalizado vacía con este filtro; en la tabla,
    // `normalizarFiltros` ya lo quitó si el estado no es "Activas".
    rapido === "sin-mover"
      ? and(
          eq(oportunidades.situacion, "abierta"),
          ne(oportunidades.etapa, "finalizado"),
          sql`${diasDesdeCambioDeEtapa} >= ${DIAS_SIN_MOVER_ALERTA}`,
        )
      : undefined,
  );
}

/**
 * Lo que muestra el kanban: SOLO abiertas (sección 5), y de Finalizado solo
 * las que llegaron a esa etapa en los últimos 30 días.
 *
 * La ventana se mide sobre `etapa_cambiada_en`, que en una oportunidad en
 * Finalizado es exactamente el momento en que llegó a Finalizado (solo un
 * cambio de etapa lo escribe). Son 30 días de reloj hacia atrás desde ahora:
 * una que llegó hace 29 días y 23 horas se ve; hace 30 días y 1 hora, ya no.
 * Las demás etapas no tienen ventana.
 */
function condicionesKanban(filtros: FiltrosOportunidades): SQL | undefined {
  return and(
    eq(oportunidades.situacion, "abierta"),
    or(
      ne(oportunidades.etapa, "finalizado"),
      sql`${oportunidades.etapa_cambiada_en} >= now() - make_interval(days => ${DIAS_VENTANA_FINALIZADO})`,
    ),
    condicionesComunes(normalizarFiltros(filtros, "embudo")),
  );
}

/**
 * El filtro de estado de la Tabla (sección 9). Cuatro vistas EXCLUYENTES: una
 * oportunidad está exactamente en una. Finalizadas va SIN la ventana de 30
 * días del kanban.
 */
function condicionEstado(estado: FiltrosOportunidades["estado"]): SQL | undefined {
  switch (estado ?? "activas") {
    case "activas":
      return and(
        eq(oportunidades.situacion, "abierta"),
        ne(oportunidades.etapa, "finalizado"),
      );
    case "finalizadas":
      return and(
        eq(oportunidades.situacion, "abierta"),
        eq(oportunidades.etapa, "finalizado"),
      );
    case "perdidas":
      return eq(oportunidades.situacion, "perdida");
    case "anuladas":
      return eq(oportunidades.situacion, "anulada");
  }
}

function condicionesTabla(filtros: FiltrosOportunidades): SQL | undefined {
  const normalizados = normalizarFiltros(filtros, "tabla");

  return and(
    condicionEstado(normalizados.estado),
    condicionesComunes(normalizados),
  );
}

/**
 * Iniciales para el avatar del asesor: la primera letra de las dos primeras
 * palabras del nombre ("Manuel Jáuregui" → "MJ"; "Ana" → "A").
 */
function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toLocaleUpperCase("es-PE"))
    .join("");
}

/** Suma de céntimos como número. `sum` de un `bigint` devuelve `numeric`. */
const sumaCentimos = (condicion?: SQL) =>
  (condicion
    ? sql<number>`coalesce(sum(${oportunidades.valor_estimado}) FILTER (WHERE ${condicion}), 0)`
    : sql<number>`coalesce(sum(${oportunidades.valor_estimado}), 0)`
  ).mapWith(Number);

/**
 * Las columnas que pintan una tarjeta del kanban y una fila de la tabla. Van
 * juntas porque son casi las mismas; cada consulta toma las suyas.
 */
const columnasOportunidad = {
  id: oportunidades.id,
  codigo: oportunidades.codigo,
  titulo: oportunidades.titulo,
  etapa: oportunidades.etapa,
  situacion: oportunidades.situacion,
  moneda: oportunidades.moneda,
  valor_estimado: oportunidades.valor_estimado,
  probabilidad: oportunidades.probabilidad,
  fecha_cierre_estimada: oportunidades.fecha_cierre_estimada,
  etapa_cambiada_en: oportunidades.etapa_cambiada_en,
  dias_sin_mover: diasSinMover,
  empresa_id: oportunidades.empresa_id,
  empresa_razon_social: empresas.razon_social,
  empresa_nombre_comercial: empresas.nombre_comercial,
  empresa_nombre_corto: empresas.nombre_corto,
  empresa_ruc: empresas.ruc,
  asesor_nombre: user.nombre_completo,
} as const;

/**
 * Orden dentro de una etapa: fecha estimada de cierre más próxima primero y,
 * [por defecto en la spec], sin fecha al final. `NULLS LAST` es ya el default
 * de PostgreSQL en `ASC`, pero se escribe para que no dependa de saberlo. El
 * código desempata para que el orden sea estable.
 */
const ordenPorCierre = [
  sql`${oportunidades.fecha_cierre_estimada} ASC NULLS LAST`,
  asc(oportunidades.codigo),
];

function conIniciales<T extends { asesor_nombre: string }>(fila: T) {
  return { ...fila, asesor_iniciales: iniciales(fila.asesor_nombre) };
}

// --- Kanban ------------------------------------------------------------------

/**
 * El embudo: una columna por etapa, en el orden del enum, con sus tarjetas y
 * sus sumas. Sin paginar (sección 5: scroll general).
 *
 * Dos consultas con LAS MISMAS condiciones (`condicionesKanban`): las
 * tarjetas y las sumas por etapa y moneda. Las sumas las hace la base con
 * `GROUP BY etapa, moneda`, así que dólares y soles salen en filas distintas
 * y NUNCA se suman entre sí.
 *
 * `total_pen` es `null` cuando en esa etapa no hay ninguna en soles (la
 * columna no pinta la línea S/); `total_usd` es siempre un número, 0 si no
 * hay ninguna en dólares (la columna pinta "US$ 0").
 */
export async function listarOportunidadesKanban(filtros: FiltrosOportunidades) {
  const condiciones = condicionesKanban(filtros);

  const [filas, sumas] = await Promise.all([
    db
      .select(columnasOportunidad)
      .from(oportunidades)
      .innerJoin(empresas, eq(oportunidades.empresa_id, empresas.id))
      .innerJoin(user, eq(oportunidades.asesor_id, user.id))
      .where(condiciones)
      .orderBy(...ordenPorCierre),
    db
      .select({
        etapa: oportunidades.etapa,
        moneda: oportunidades.moneda,
        total: sumaCentimos(),
      })
      .from(oportunidades)
      .innerJoin(empresas, eq(oportunidades.empresa_id, empresas.id))
      .innerJoin(user, eq(oportunidades.asesor_id, user.id))
      .where(condiciones)
      .groupBy(oportunidades.etapa, oportunidades.moneda),
  ]);

  return ETAPAS_OPORTUNIDAD.map((etapa) => {
    const tarjetas = filas.filter((f) => f.etapa === etapa).map(conIniciales);
    const suma = (moneda: "USD" | "PEN") =>
      sumas.find((s) => s.etapa === etapa && s.moneda === moneda)?.total;

    return {
      etapa,
      cantidad: tarjetas.length,
      total_usd: suma("USD") ?? 0,
      total_pen: suma("PEN") ?? null,
      tarjetas,
    };
  });
}

export type ColumnaKanban = Awaited<
  ReturnType<typeof listarOportunidadesKanban>
>[number];
export type TarjetaOportunidad = ColumnaKanban["tarjetas"][number];

// --- Tabla ---------------------------------------------------------------------

/**
 * Cuántas oportunidades casan con los filtros de la Tabla, en todas las
 * páginas. Mismo FROM, mismos JOIN y mismas condiciones que
 * `listarOportunidadesTabla`: si no, el pie diría «1–10 de 14» sobre otro
 * resultado. `INNER JOIN` con empresa y asesor no pierde filas: las dos FK son
 * `NOT NULL`.
 */
export async function contarOportunidadesTabla(
  filtros: FiltrosOportunidades,
): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(oportunidades)
    .innerJoin(empresas, eq(oportunidades.empresa_id, empresas.id))
    .innerJoin(user, eq(oportunidades.asesor_id, user.id))
    .where(condicionesTabla(filtros));

  return fila?.total ?? 0;
}

/**
 * La vista Tabla, paginada en el servidor (sección 9). `pagina` sale de
 * `calcularPaginacion` (core/), que necesita antes el total de
 * `contarOportunidadesTabla`.
 *
 * Orden: por etapa (el orden del enum, que es el del embudo) y luego por
 * fecha estimada de cierre, sin fecha al final.
 *
 * Cada fila trae `etapa` Y `situacion`: la columna Etapa pinta la etapa y, al
 * lado, "Perdida"/"Anulada" si corresponde. `dias_sin_mover` es `null` donde
 * se pinta "—".
 */
export async function listarOportunidadesTabla(
  filtros: FiltrosOportunidades,
  pagina: Pick<Paginacion, "limite" | "desplazamiento">,
) {
  const filas = await db
    .select(columnasOportunidad)
    .from(oportunidades)
    .innerJoin(empresas, eq(oportunidades.empresa_id, empresas.id))
    .innerJoin(user, eq(oportunidades.asesor_id, user.id))
    .where(condicionesTabla(filtros))
    .orderBy(asc(oportunidades.etapa), ...ordenPorCierre)
    .limit(pagina.limite)
    .offset(pagina.desplazamiento);

  return filas.map(conIniciales);
}

export type FilaOportunidad = Awaited<
  ReturnType<typeof listarOportunidadesTabla>
>[number];

// --- Métricas de cabecera ----------------------------------------------------------

/**
 * La cabecera del módulo (sección 5).
 *
 * CON FILTROS, sobre lo que se está viendo: en el Embudo, el conjunto del
 * kanban (abiertas, Finalizado con su ventana de 30 días); en la Tabla, el
 * del filtro de estado (confirmado, sección 5 de la spec).
 * - `cantidad`, `total_usd` y `total_pen`: las dos sumas por separado, cada
 *   una con su `FILTER (WHERE moneda = …)`. Nunca se convierten ni se suman
 *   entre sí.
 *
 * SIN FILTROS, globales e históricas:
 * - `activas`: el "N oportunidades activas" del subtítulo — abiertas fuera de
 *   Finalizado (sección 2).
 * - `tasa_cierre`: ganadas ÷ (ganadas + perdidas), en porcentaje entero
 *   redondeado. Ganadas: abiertas en Adjudicado, Ejecución o Finalizado (sin
 *   la ventana de 30 días: es histórica). Las anuladas no cuentan. `null` si
 *   el denominador es 0, y la interfaz pinta "—".
 */
export async function calcularMetricasOportunidades(
  filtros: FiltrosOportunidades,
  vista: "embudo" | "tabla",
) {
  const condiciones =
    vista === "embudo" ? condicionesKanban(filtros) : condicionesTabla(filtros);

  const [[filtradas], [globales]] = await Promise.all([
    db
      .select({
        cantidad: count(),
        total_usd: sumaCentimos(eq(oportunidades.moneda, "USD")),
        total_pen: sumaCentimos(eq(oportunidades.moneda, "PEN")),
      })
      .from(oportunidades)
      .innerJoin(empresas, eq(oportunidades.empresa_id, empresas.id))
      .innerJoin(user, eq(oportunidades.asesor_id, user.id))
      .where(condiciones),
    db
      .select({
        activas: sql<number>`count(*) FILTER (WHERE ${condicionEstado("activas")})`.mapWith(Number),
        ganadas: sql<number>`count(*) FILTER (WHERE ${and(
          eq(oportunidades.situacion, "abierta"),
          inArray(oportunidades.etapa, ETAPAS_GANADAS),
        )})`.mapWith(Number),
        perdidas: sql<number>`count(*) FILTER (WHERE ${eq(oportunidades.situacion, "perdida")})`.mapWith(Number),
      })
      .from(oportunidades),
  ]);

  const { ganadas, perdidas } = globales;
  const decididas = ganadas + perdidas;

  return {
    cantidad: filtradas.cantidad,
    total_usd: filtradas.total_usd,
    total_pen: filtradas.total_pen,
    activas: globales.activas,
    ganadas,
    perdidas,
    tasa_cierre: decididas === 0 ? null : Math.round((ganadas * 100) / decididas),
  };
}

/** Las etapas que cuentan como negocio ganado (sección 2). */
const ETAPAS_GANADAS: EtapaOportunidad[] = ["adjudicado", "ejecucion", "finalizado"];

export type MetricasOportunidades = Awaited<
  ReturnType<typeof calcularMetricasOportunidades>
>;

/**
 * El desplegable Cliente: las empresas que tienen alguna oportunidad, en
 * cualquier situación (sección 5). Incluye empresas dadas de baja después: el
 * desplegable filtra oportunidades que existen, no ofrece empresas para crear.
 */
export async function listarEmpresasConOportunidades() {
  return db
    .selectDistinct({ id: empresas.id, razon_social: empresas.razon_social })
    .from(oportunidades)
    .innerJoin(empresas, eq(oportunidades.empresa_id, empresas.id))
    .orderBy(asc(empresas.razon_social), asc(empresas.id));
}

// --- Línea de tiempo del detalle ------------------------------------------------

type Autor = { nombre: string; iniciales: string };

type Base = { id: string; fecha: Date; autor: Autor };

/**
 * Una entrada de la línea de tiempo, ya en la forma en que se lee (tabla de
 * formas en entidades.md, `oportunidad_historial`). La interfaz no necesita
 * saber qué columna del historial lleva qué: cada `tipo` trae solo lo suyo.
 * Los nombres de contacto vienen resueltos por JOIN.
 */
export type EntradaLineaDeTiempo = Base &
  (
    | { tipo: "creacion"; etapa: EtapaOportunidad }
    | {
        tipo: "cambio_etapa";
        etapa_anterior: EtapaOportunidad;
        etapa_nueva: EtapaOportunidad;
      }
    | {
        tipo: "edicion";
        campo: Extract<CampoHistorial, "titulo">;
        anterior: string;
        nuevo: string;
      }
    | {
        tipo: "edicion";
        campo: Extract<CampoHistorial, "contacto">;
        /** `null` = "sin contacto" (se asignó o se quitó). */
        anterior: { id: string; nombre: string } | null;
        nuevo: { id: string; nombre: string } | null;
      }
    | {
        tipo: "edicion";
        campo: Extract<CampoHistorial, "fecha_cierre_estimada">;
        /** `YYYY-MM-DD`; `null` = "sin fecha". */
        anterior: string | null;
        nuevo: string | null;
      }
    | { tipo: "perdida"; motivo: string }
    | { tipo: "anulacion"; motivo: string | null }
    /** `etapa`: la etapa a la que vuelve. */
    | { tipo: "reapertura"; etapa: EtapaOportunidad }
    | { tipo: "actividad"; tipo_actividad: TipoActividad; descripcion: string }
  );

const contactoAnterior = alias(contactos, "contacto_anterior");
const contactoNuevo = alias(contactos, "contacto_nuevo");

/**
 * El historial y las actividades de una oportunidad en UNA sola lista, lo más
 * reciente arriba (sección 4). Son tablas separadas por diseño; se juntan
 * solo aquí, al leer.
 *
 * La fecha de cada entrada: `created_at` en el historial (cuándo se hizo el
 * cambio) y `fecha_hora` en las actividades (cuándo OCURRIÓ, que puede ser
 * antes de registrarla). El "N registros" es el largo de la lista.
 *
 * Una oportunidad que no existe devuelve `[]`: la página decide el 404 con su
 * propia consulta del detalle.
 */
export async function obtenerLineaDeTiempo(
  oportunidadId: string,
): Promise<EntradaLineaDeTiempo[]> {
  const [historial, actividades] = await Promise.all([
    db
      .select({
        entrada: oportunidadHistorial,
        autor_nombre: user.nombre_completo,
        contacto_anterior_nombre: contactoAnterior.nombre,
        contacto_nuevo_nombre: contactoNuevo.nombre,
      })
      .from(oportunidadHistorial)
      .innerJoin(user, eq(oportunidadHistorial.usuario_id, user.id))
      .leftJoin(
        contactoAnterior,
        eq(oportunidadHistorial.contacto_anterior_id, contactoAnterior.id),
      )
      .leftJoin(
        contactoNuevo,
        eq(oportunidadHistorial.contacto_nuevo_id, contactoNuevo.id),
      )
      .where(eq(oportunidadHistorial.oportunidad_id, oportunidadId)),
    db
      .select({
        actividad: oportunidadActividades,
        autor_nombre: user.nombre_completo,
      })
      .from(oportunidadActividades)
      .innerJoin(user, eq(oportunidadActividades.autor_id, user.id))
      .where(eq(oportunidadActividades.oportunidad_id, oportunidadId)),
  ]);

  const autor = (nombre: string): Autor => ({
    nombre,
    iniciales: iniciales(nombre),
  });

  const entradas: EntradaLineaDeTiempo[] = [
    ...historial.map((fila) => deHistorial(fila, autor(fila.autor_nombre))),
    ...actividades.map(
      ({ actividad, autor_nombre }): EntradaLineaDeTiempo => ({
        id: actividad.id,
        fecha: actividad.fecha_hora,
        autor: autor(autor_nombre),
        tipo: "actividad",
        tipo_actividad: actividad.tipo,
        descripcion: actividad.descripcion,
      }),
    ),
  ];

  // Lo más reciente arriba. El `id` desempata para que el orden sea estable:
  // varias ediciones guardadas juntas comparten la misma hora exacta (la de su
  // transacción).
  return entradas.sort(
    (a, b) => b.fecha.getTime() - a.fecha.getTime() || a.id.localeCompare(b.id),
  );
}

/**
 * Traduce una fila del historial a su entrada. Las columnas que lee de cada
 * `tipo` son las que garantizan los CHECK de `oportunidad_historial`; los `!`
 * se apoyan en ellos (un `tipo` sin su columna no puede existir en la base).
 */
function deHistorial(
  fila: {
    entrada: typeof oportunidadHistorial.$inferSelect;
    contacto_anterior_nombre: string | null;
    contacto_nuevo_nombre: string | null;
  },
  autor: Autor,
): EntradaLineaDeTiempo {
  const { entrada: e } = fila;
  const base: Base = { id: e.id, fecha: e.createdAt, autor };

  switch (e.tipo) {
    case "creacion":
      return { ...base, tipo: "creacion", etapa: e.etapa_nueva! };
    case "cambio_etapa":
      return {
        ...base,
        tipo: "cambio_etapa",
        etapa_anterior: e.etapa_anterior!,
        etapa_nueva: e.etapa_nueva!,
      };
    case "perdida":
      return { ...base, tipo: "perdida", motivo: e.motivo! };
    case "anulacion":
      return { ...base, tipo: "anulacion", motivo: e.motivo };
    case "reapertura":
      return { ...base, tipo: "reapertura", etapa: e.etapa_nueva! };
    case "edicion":
      switch (e.campo!) {
        case "titulo":
          return {
            ...base,
            tipo: "edicion",
            campo: "titulo",
            anterior: e.titulo_anterior!,
            nuevo: e.titulo_nuevo!,
          };
        case "contacto":
          return {
            ...base,
            tipo: "edicion",
            campo: "contacto",
            anterior: e.contacto_anterior_id
              ? { id: e.contacto_anterior_id, nombre: fila.contacto_anterior_nombre! }
              : null,
            nuevo: e.contacto_nuevo_id
              ? { id: e.contacto_nuevo_id, nombre: fila.contacto_nuevo_nombre! }
              : null,
          };
        case "fecha_cierre_estimada":
          return {
            ...base,
            tipo: "edicion",
            campo: "fecha_cierre_estimada",
            anterior: e.fecha_cierre_anterior,
            nuevo: e.fecha_cierre_nueva,
          };
      }
  }
}
