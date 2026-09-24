import { pgTable, text, date, boolean, timestamp, index } from "drizzle-orm/pg-core";

// Primer módulo de negocio que necesita una tabla propia de personas (más
// allá de `user`, que es la cuenta de acceso). No es lo mismo: `user` es
// quién puede entrar al sistema, `personal` es a quién se puede asignar
// trabajo — hoy ninguna fila de una se relaciona con la otra.
export const personal = pgTable(
  "personal",
  {
    // Mismo tipo y patrón que `orden_trabajo.id` y las tablas de Better
    // Auth (`user.id`): `text` con UUID generado en la aplicación, no
    // `serial`. Ver AGENTS.md — la PK de una tabla nueva sigue la
    // convención ya establecida, no se mezcla con `serial`.
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    nombre: text("nombre").notNull(),
    apellido: text("apellido").notNull(),
    // Texto libre: no existe todavía un catálogo de cargos (sería una tabla
    // aparte con su propio ciclo de vida). Si en el futuro se necesita
    // filtrar/reportar por cargo de forma consistente, ese es el momento de
    // normalizarlo — no antes.
    cargo: text("cargo").notNull(),
    // El UNIQUE es la garantía real de que dos personas no comparten DNI, no
    // la validación del formulario (que solo evita el viaje redondo al
    // servidor). `text` y no numérico a propósito: un DNI es un
    // identificador, no una cantidad — no se suma, puede llevar ceros a la
    // izquierda, y su longitud es fija.
    dni: text("dni").notNull().unique(),
    // `date`, no `timestamp`, y con mode "string": una fecha de nacimiento no
    // tiene hora, y una columna con hora (aunque sea `timestamptz`) obliga a
    // decidir a qué hora del día corresponde esa fecha en la zona de
    // visualización, decisión que no tiene ninguna respuesta correcta para un
    // dato que nunca tuvo hora. Una columna `date` con mode "string" entra y
    // sale como `YYYY-MM-DD` literal, sin pasar por ninguna conversión —
    // exactamente lo que produce y consume un `<input type="date">`.
    fecha_nacimiento: date("fecha_nacimiento", { mode: "string" }).notNull(),
    // Baja lógica, mismo criterio que `Cancelada` en orden_trabajo: dar de
    // baja a alguien pone esto en false, nunca se borra la fila. A
    // diferencia de la OT, aquí no hay un `estado` con enum que ya cumpla
    // ese papel, así que la bandera `activo` es la forma correcta (no la
    // excepción). Motivo concreto: si `orden_trabajo.responsable` (hoy texto
    // libre) llega a convertirse en FK a esta tabla, un DELETE real dejaría
    // referencias rotas.
    activo: boolean("activo").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  // Mismo criterio que `orden_trabajo_estado_idx`: el listado filtra por
  // `activo` en la consulta por defecto (solo personal activo).
  (table) => [index("personal_activo_idx").on(table.activo)],
);

export type Personal = typeof personal.$inferSelect;
export type PersonalNuevo = typeof personal.$inferInsert;
