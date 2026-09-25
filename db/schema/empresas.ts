import {
  pgEnum,
  pgTable,
  text,
  boolean,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { TIPOS_EMPRESA } from "@/modules/clientes/constantes";

// Primera tabla del grupo CRM (Bloque 2, Clientes — 2026-09-25). Se llama
// `empresas` y no `clientes` porque la misma fila puede ser cliente,
// proveedor o las dos cosas (ver `tipo`): el menú dice "Clientes", la tabla
// describe lo que guarda.
//
// DOS CAMPOS DE "ESTADO" QUE NO SON LO MISMO — es la confusión fácil de esta
// tabla:
// - `estado` y `condicion` son datos EXTERNOS: los devuelve SUNAT (vía la API
//   de Decolecta) al consultar el RUC. Son informativos, se copian tal cual y
//   el sistema no los usa para decidir nada.
// - `activo` es la baja lógica PROPIA del módulo (regla invariable 9). Una
//   empresa con `estado = 'BAJA'` en SUNAT puede seguir `activo = true` aquí
//   (hay historial con ella) y viceversa. Ninguno de los tres se deriva de
//   otro.

// La lista vive en `modules/clientes/constantes.ts` (la necesitará el
// formulario en el cliente, sin arrastrar Drizzle). Aquí solo se importa para
// construir el `pgEnum` — mismo patrón que `otEstadoEnum` con `ESTADOS_OT`.
export const empresaTipoEnum = pgEnum("empresa_tipo", TIPOS_EMPRESA);

export const empresas = pgTable(
  "empresas",
  {
    // Mismo patrón que el resto de tablas: `text` con UUID generado en la
    // aplicación, no `serial`.
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Formato `CLT.0001`, autogenerado por el correlativo genérico de
    // `core/correlativo.ts` (ámbito `"empresas"` en la tabla compartida
    // `correlativo`) — el usuario nunca lo escribe. `NOT NULL` porque lo pone
    // siempre el backend; `UNIQUE` como red de seguridad del contador, mismo
    // papel que `materiales.codigo_interno` o `servicios.codigo`. El formateo
    // y las constantes viven en `modules/clientes/constantes.ts`, no aquí.
    codigo: text("codigo").notNull().unique(),
    // Único campo de negocio obligatorio por encargo.
    razon_social: text("razon_social").notNull(),
    nombre_comercial: text("nombre_comercial"),
    nombre_corto: text("nombre_corto"),
    // `text` y no numérico, por lo mismo que `personal.dni`: es un
    // identificador, no una cantidad. El UNIQUE es la garantía real de que no
    // hay dos empresas con el mismo RUC, no la validación del formulario.
    // Nullable: una empresa extranjera (ver `pais`) no tiene RUC, y en
    // Postgres varias filas con NULL no chocan bajo un UNIQUE — mismo
    // razonamiento que `materiales.codigo_interno` antes del correlativo.
    // Obligatoriedad para empresas peruanas: pregunta abierta.
    ruc: text("ruc").unique(),
    // Obligatorio y SIN default, por decisión explícita (2026-09-25): toda
    // empresa nace declarada como cliente, proveedor o ambas, y el usuario lo
    // elige siempre — no hay un valor "asumido" que se cuele por omisión.
    tipo: empresaTipoEnum("tipo").notNull(),
    // Texto libre (ej. "SOCIEDAD ANONIMA CERRADA"), tal como lo devuelve
    // SUNAT. Sin catálogo: la lista de SUNAT es larga y no la controlamos.
    tipo_contribuyente: text("tipo_contribuyente"),
    descripcion_rubro: text("descripcion_rubro"),
    // DATOS EXTERNOS de SUNAT vía Decolecta (ver el encabezado del archivo).
    // `text` y no `pgEnum` a propósito: los valores los define SUNAT, no
    // nosotros, y un valor nuevo del lado de SUNAT no debe romper un INSERT.
    // NO son la baja lógica — eso es `activo`.
    estado: text("estado"), // ej. ACTIVO, BAJA DE OFICIO, SUSPENSION TEMPORAL
    condicion: text("condicion"), // ej. HABIDO, NO HABIDO
    direccion: text("direccion"),
    distrito: text("distrito"),
    provincia: text("provincia"),
    departamento: text("departamento"),
    // Código ISO 3166-1 alfa-2 (`PE`, `CL`, `US`…), NO el nombre del país. La
    // lista fija con nombres para el combobox vive del lado de la aplicación;
    // guardar el código hace que renombrar o traducir un país en la interfaz
    // no toque ninguna fila, y que no convivan "Perú", "Peru" y "PERÚ". El
    // CHECK solo garantiza la forma (dos mayúsculas); que el código exista en
    // la lista lo valida el Zod del módulo. Default `PE` por decisión
    // explícita (2026-09-25): casi todas las empresas son peruanas. Sigue
    // nullable — el default solo cubre el INSERT que no lo menciona.
    pais: text("pais").default("PE"),
    // Baja lógica PROPIA del módulo — regla invariable 9, mismo patrón exacto
    // que `materiales.activo`, `lista_precios.activo` y `personal.activo`. La
    // fila nunca se borra; se inactiva/reactiva desde la interfaz.
    // Independiente de `estado`/`condicion` (SUNAT).
    activo: boolean("activo").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Mismo criterio que `materiales_activo_idx`: el listado filtra por
    // `activo` en la consulta por defecto.
    index("empresas_activo_idx").on(table.activo),
    // Un RUC son exactamente 11 dígitos (formato SUNAT, no una regla de
    // negocio inventada). La base lo garantiza aunque un camino futuro se
    // salte el Zod.
    check("empresas_ruc_formato_check", sql`${table.ruc} ~ '^[0-9]{11}$'`),
    check("empresas_pais_iso_check", sql`${table.pais} ~ '^[A-Z]{2}$'`),
  ],
);

export type Empresa = typeof empresas.$inferSelect;
export type EmpresaNueva = typeof empresas.$inferInsert;
