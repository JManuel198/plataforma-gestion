import {
  pgEnum,
  pgTable,
  text,
  integer,
  bigint,
  date,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  CAMPOS_HISTORIAL,
  ETAPAS_OPORTUNIDAD,
  SITUACIONES_OPORTUNIDAD,
  TIPOS_ACTIVIDAD,
  TIPOS_HISTORIAL,
} from "@/modules/oportunidades/constantes";
import { user } from "./auth";
import { contactos } from "./contactos";
import { empresas } from "./empresas";
import { monedaEnum } from "./moneda";

// Tercera entidad del grupo CRM: Embudo de oportunidades (Bloque 4, Parte 4
// del plan — 2026-09-25). Especificación en docs/spec/oportunidades.md, que
// manda sobre este archivo en reglas de negocio.
//
// Tres tablas: la oportunidad, su historial de cambios y sus actividades. Las
// listas de los enums viven en modules/oportunidades/constantes.ts (las
// necesitarán los formularios en el cliente, sin arrastrar Drizzle); aquí solo
// se importan — mismo patrón que `otEstadoEnum` con `ESTADOS_OT`.
//
// Ninguna de las tres se borra en operación normal y ninguna lleva `activo`
// (regla invariable 9): la oportunidad tiene `situacion`, y el historial y las
// actividades no se editan ni se borran (sección 4 de la spec). Por eso todas
// las FK quedan con el `NO ACTION` por defecto, igual que
// `contactos.empresa_id`: protegen sin cascadas que nadie debería disparar.

export const oportunidadEtapaEnum = pgEnum(
  "oportunidad_etapa",
  ETAPAS_OPORTUNIDAD,
);
export const oportunidadSituacionEnum = pgEnum(
  "oportunidad_situacion",
  SITUACIONES_OPORTUNIDAD,
);
export const oportunidadActividadTipoEnum = pgEnum(
  "oportunidad_actividad_tipo",
  TIPOS_ACTIVIDAD,
);
export const oportunidadHistorialTipoEnum = pgEnum(
  "oportunidad_historial_tipo",
  TIPOS_HISTORIAL,
);
export const oportunidadHistorialCampoEnum = pgEnum(
  "oportunidad_historial_campo",
  CAMPOS_HISTORIAL,
);

export const oportunidades = pgTable(
  "oportunidades",
  {
    // Mismo patrón que el resto de tablas: `text` con UUID generado en la
    // aplicación, no `serial`.
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Formato `OPT.CCM.AAAA.NNNNN`, autogenerado — el usuario nunca lo
    // escribe. Lo reserva `reservarCorrelativoAnual` (core/correlativo.ts)
    // con la clave `"oportunidades"`, en la misma transacción que el INSERT;
    // reinicia cada año, como el de la OT. El formateo y sus constantes son
    // de la capa de acciones (Parte 5), no de aquí. `UNIQUE` es la red de
    // seguridad del contador, mismo papel que `orden_trabajo.codigo_ot`.
    codigo: text("codigo").notNull().unique(),
    titulo: text("titulo").notNull(),
    // Obligatoria y fija después de crear (esto último lo aplica la capa de
    // acciones). La FK NO mira `empresas.activo`, igual que
    // `contactos.empresa_id`: que al crear solo se ofrezcan empresas activas
    // es cosa de la aplicación; una oportunidad sigue siendo válida si la
    // empresa se da de baja después.
    empresa_id: text("empresa_id")
      .notNull()
      .references(() => empresas.id),
    // Opcional: se asigna al crear o después, y se puede quitar (sección 3).
    // La base NO garantiza que el contacto sea de la misma empresa: eso lo
    // valida la capa de acciones. Hacerlo en la base exigiría una FK
    // compuesta (contacto_id, empresa_id) → contactos(id, empresa_id) y un
    // UNIQUE nuevo en `contactos`, y esta migración no toca tablas
    // existentes.
    contacto_id: text("contacto_id").references(() => contactos.id),
    // El usuario que la crea (tabla `user` de Better Auth). No se edita. Sin
    // `onDelete: "cascade"` —a diferencia de `session`/`account`—: borrar
    // una cuenta no puede llevarse por delante oportunidades.
    asesor_id: text("asesor_id")
      .notNull()
      .references(() => user.id),
    // Fija después de crear. Mismo enum compartido que `orden_trabajo` y
    // `lista_precios`. Default USD por la spec (sección 3).
    moneda: monedaEnum("moneda").default("USD").notNull(),
    // Entero en la unidad mínima (céntimos), NUNCA float ni numeric — regla
    // invariable 2 y sección 3 de la spec ("se guarda en céntimos"). `bigint`
    // con `mode: "number"`, idéntico a `orden_trabajo.precio` y
    // `lista_precios.precio_lista` (ver sus comentarios): el límite de negocio
    // se valida en el Zod del módulo. Que no se edite después de crear lo
    // aplica la capa de acciones; la base solo garantiza que no sea negativo.
    valor_estimado: bigint("valor_estimado", { mode: "number" })
      .default(0)
      .notNull(),
    // Porcentaje entero 0-100 (sección 3). "Vacía" se guarda como 0, que es
    // el default.
    probabilidad: integer("probabilidad").default(0).notNull(),
    etapa: oportunidadEtapaEnum("etapa").default("prospecto").notNull(),
    situacion: oportunidadSituacionEnum("situacion")
      .default("abierta")
      .notNull(),
    // Motivo del último cierre. Obligatorio al marcar perdida y opcional al
    // anular, pero eso lo distingue la capa de acciones: la base no.
    motivo: text("motivo"),
    // Solo fecha, sin hora — regla invariable 10. Mismo `mode: "string"` que
    // `personal.fecha_nacimiento`: `'YYYY-MM-DD'` tal cual, sin pasar por un
    // `Date` de JS que la desplazaría con la zona horaria.
    fecha_cierre_estimada: date("fecha_cierre_estimada", { mode: "string" }),
    // Momento del último cambio de etapa: alimenta el reloj de días y el
    // filtro "Sin mover ≥7d". Solo un cambio de etapa lo actualiza (no
    // perder, anular, reabrir ni editar).
    //
    // Nace IGUAL a `created_at` sin que nadie lo copie: los dos usan
    // `DEFAULT now()`, y en PostgreSQL `now()` es la hora de INICIO de la
    // transacción, así que en el mismo INSERT devuelven exactamente el mismo
    // valor. Para que se cumpla, el INSERT no debe mandar ninguno de los dos.
    etapa_cambiada_en: timestamp("etapa_cambiada_en", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Postgres no indexa el lado que referencia de una FK. Mismo papel que
    // `contactos_empresa_id_idx`: el JOIN del embudo y la tabla contra
    // `empresas`, y el desplegable "Cliente" (empresas con oportunidades).
    index("oportunidades_empresa_id_idx").on(table.empresa_id),
    index("oportunidades_contacto_id_idx").on(table.contacto_id),
    index("oportunidades_asesor_id_idx").on(table.asesor_id),
    // El kanban y el filtro de estado de la Tabla filtran siempre por
    // situación y etapa juntas.
    index("oportunidades_situacion_etapa_idx").on(table.situacion, table.etapa),
    check(
      "oportunidades_probabilidad_check",
      sql`${table.probabilidad} >= 0 AND ${table.probabilidad} <= 100`,
    ),
    check(
      "oportunidades_valor_estimado_check",
      sql`${table.valor_estimado} >= 0`,
    ),
  ],
);

/**
 * Historial de cambios de una oportunidad (sección 4 de la spec). Una fila
 * por acción; NO se edita ni se borra, así que no lleva `updated_at` (mismo
 * tipo de excepción razonada que `material_caracteristicas`).
 *
 * DISEÑO: un `tipo` y columnas de detalle TIPADAS, no un JSON ni un par de
 * columnas de texto genéricas. Cada valor se guarda con su tipo real: las
 * etapas con su enum, la fecha como `date` (regla invariable 10) y el contacto
 * como FK a `contactos` — así la base comprueba que existan, y el nombre que
 * se muestra se resuelve por JOIN.
 *
 * Qué columnas lleva cada `tipo` (el resto, NULL):
 * - `creacion`:     `etapa_nueva` (etapa inicial).
 * - `cambio_etapa`: `etapa_anterior` y `etapa_nueva`, distintas.
 * - `edicion`:      `campo` y el par anterior/nuevo de ESE campo.
 * - `perdida`:      `motivo`.
 * - `anulacion`:    `motivo`, si lo hubo.
 * - `reapertura`:   `etapa_nueva` (la etapa a la que vuelve).
 *
 * Los CHECK de abajo hacen que una fila solo pueda tener una de esas formas:
 * no hay forma ambigua de leer una entrada. Que `perdida` exija motivo es
 * regla de la capa de acciones, igual que en `oportunidades.motivo`. Los CHECK
 * usan `IS [NOT] DISTINCT FROM` y no `=`: un CHECK que se evalúa a NULL se da
 * por cumplido, y `campo = 'titulo'` con `campo` NULL daría NULL.
 */
export const oportunidadHistorial = pgTable(
  "oportunidad_historial",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    oportunidad_id: text("oportunidad_id")
      .notNull()
      .references(() => oportunidades.id),
    tipo: oportunidadHistorialTipoEnum("tipo").notNull(),
    etapa_anterior: oportunidadEtapaEnum("etapa_anterior"),
    etapa_nueva: oportunidadEtapaEnum("etapa_nueva"),
    campo: oportunidadHistorialCampoEnum("campo"),
    // Pares anterior/nuevo, uno por campo editable. Dentro de una edición de
    // contacto o de fecha, cualquiera de los dos puede ser NULL: asignar un
    // contacto donde no había, quitarlo, poner o quitar la fecha.
    titulo_anterior: text("titulo_anterior"),
    titulo_nuevo: text("titulo_nuevo"),
    contacto_anterior_id: text("contacto_anterior_id").references(
      () => contactos.id,
    ),
    contacto_nuevo_id: text("contacto_nuevo_id").references(() => contactos.id),
    fecha_cierre_anterior: date("fecha_cierre_anterior", { mode: "string" }),
    fecha_cierre_nueva: date("fecha_cierre_nueva", { mode: "string" }),
    motivo: text("motivo"),
    // Quien hizo el cambio. Sin cascada, por lo mismo que `asesor_id`.
    usuario_id: text("usuario_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // La línea de tiempo del detalle lee siempre por oportunidad.
    index("oportunidad_historial_oportunidad_id_idx").on(table.oportunidad_id),
    check(
      "oportunidad_historial_etapas_check",
      sql`(
        ${table.tipo} IN ('creacion', 'reapertura')
          AND ${table.etapa_anterior} IS NULL AND ${table.etapa_nueva} IS NOT NULL
      ) OR (
        ${table.tipo} = 'cambio_etapa'
          AND ${table.etapa_anterior} IS NOT NULL AND ${table.etapa_nueva} IS NOT NULL
          AND ${table.etapa_anterior} <> ${table.etapa_nueva}
      ) OR (
        ${table.tipo} IN ('edicion', 'perdida', 'anulacion')
          AND ${table.etapa_anterior} IS NULL AND ${table.etapa_nueva} IS NULL
      )`,
    ),
    check(
      "oportunidad_historial_campo_check",
      sql`(${table.tipo} = 'edicion') = (${table.campo} IS NOT NULL)`,
    ),
    check(
      "oportunidad_historial_motivo_check",
      sql`${table.motivo} IS NULL OR ${table.tipo} IN ('perdida', 'anulacion')`,
    ),
    // Un título es obligatorio en la oportunidad, así que en su edición los
    // dos valores existen.
    check(
      "oportunidad_historial_titulo_check",
      sql`(
        ${table.campo} IS NOT DISTINCT FROM 'titulo'
          AND ${table.titulo_anterior} IS NOT NULL AND ${table.titulo_nuevo} IS NOT NULL
          AND ${table.titulo_anterior} <> ${table.titulo_nuevo}
      ) OR (
        ${table.campo} IS DISTINCT FROM 'titulo'
          AND ${table.titulo_anterior} IS NULL AND ${table.titulo_nuevo} IS NULL
      )`,
    ),
    check(
      "oportunidad_historial_contacto_check",
      sql`(
        ${table.campo} IS NOT DISTINCT FROM 'contacto'
          AND ${table.contacto_anterior_id} IS DISTINCT FROM ${table.contacto_nuevo_id}
      ) OR (
        ${table.campo} IS DISTINCT FROM 'contacto'
          AND ${table.contacto_anterior_id} IS NULL AND ${table.contacto_nuevo_id} IS NULL
      )`,
    ),
    check(
      "oportunidad_historial_fecha_cierre_check",
      sql`(
        ${table.campo} IS NOT DISTINCT FROM 'fecha_cierre_estimada'
          AND ${table.fecha_cierre_anterior} IS DISTINCT FROM ${table.fecha_cierre_nueva}
      ) OR (
        ${table.campo} IS DISTINCT FROM 'fecha_cierre_estimada'
          AND ${table.fecha_cierre_anterior} IS NULL AND ${table.fecha_cierre_nueva} IS NULL
      )`,
    ),
  ],
);

/**
 * Actividades registradas sobre una oportunidad (sección 4). Por ahora no se
 * editan ni se borran [por defecto en la spec, se revisa con los roles]; aun
 * así llevan `updated_at`, porque esa decisión está marcada como provisional
 * y la columna no estorba si nunca cambia.
 */
export const oportunidadActividades = pgTable(
  "oportunidad_actividades",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    oportunidad_id: text("oportunidad_id")
      .notNull()
      .references(() => oportunidades.id),
    // Sin default: el usuario elige siempre el tipo.
    tipo: oportunidadActividadTipoEnum("tipo").notNull(),
    descripcion: text("descripcion").notNull(),
    // Cuándo OCURRIÓ la actividad, que puede ser antes de registrarla: por
    // eso es distinta de `created_at`. Default ahora; editable al crear.
    fecha_hora: timestamp("fecha_hora", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // El usuario en sesión. Sin cascada, por lo mismo que `asesor_id`.
    autor_id: text("autor_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("oportunidad_actividades_oportunidad_id_idx").on(
      table.oportunidad_id,
    ),
  ],
);

export type Oportunidad = typeof oportunidades.$inferSelect;
export type OportunidadNueva = typeof oportunidades.$inferInsert;
export type OportunidadHistorial = typeof oportunidadHistorial.$inferSelect;
export type OportunidadHistorialNueva =
  typeof oportunidadHistorial.$inferInsert;
export type OportunidadActividad = typeof oportunidadActividades.$inferSelect;
export type OportunidadActividadNueva =
  typeof oportunidadActividades.$inferInsert;
