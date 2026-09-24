---
name: personal-tabla
description: Diseño de la tabla `personal` (módulo Personal) — por qué activo (no estado), por qué date/string para fecha_nacimiento, por qué no hay edad ni relación con user todavía
metadata:
  type: project
---

Tabla `personal` creada 2026-09-20 en `db/schema/personal.ts`, migración
`db/migrations/0008_crea_tabla_personal.sql`. Se generó sin aplicar
(2026-09-20, por instrucción explícita del usuario); esta nota decía "NO
aplicada" como si fuera permanente, y ya no lo es. Primer módulo de negocio
(`modules/personal/`, hoy terminado) con tabla propia fuera de
`orden_trabajo`.

**Confirmado el 2026-09-24:** `0008_crea_tabla_personal` está aplicada en Neon. Se comparó `drizzle.__drizzle_migrations` fila por fila con `db/migrations/meta/_journal.json`: las 16 entradas del journal tienen su fila, sin filas de más ni de menos, en el mismo orden, y en cada una coinciden `created_at` con el `when` del journal y `hash` con el SHA-256 del `.sql` (así que el archivo no se editó después de aplicarse). Esta en concreto es la fila `id` 9 (`created_at` `1789927015357`). La tabla `personal`, además, se probó en la base antes del 2026-09-21 (el UNIQUE de `personal.dni`, según la deuda técnica de `AGENTS.md`).

Decisiones de modelado, todas especificadas explícitamente por el usuario
(no asumidas por mí, por eso no generaron entrada nueva en
`docs/spec/preguntas-abiertas.md`):

- `id` text UUID (`$defaultFn(() => crypto.randomUUID())`) — misma
  convención que `orden_trabajo.id` y `user.id` de Better Auth. Confirma
  que la convención del proyecto es `text`, nunca `serial`, para PK nueva.
- `dni` text UNIQUE, no numérico — identificador, no cantidad (ceros a la
  izquierda, no se suma). El UNIQUE es la garantía real, el Zod del módulo
  es solo UX.
- `fecha_nacimiento` es `date` con `mode: "string"` en Drizzle, NO
  `timestamp`. Motivo: una fecha sin hora no debe llevar una columna que la
  tenga, ni siquiera `timestamptz` (RESUELTO 2026-09-24: todas las columnas
  `timestamp` del esquema pasaron a `withTimezone: true`, así que el viejo
  problema de zonas horarias de `db/index.ts` ya no existe, pero eso no
  cambia esto — seguiría obligando a decidir a qué hora del día corresponde
  un dato que nunca tuvo hora). `date` con mode string entra/sale como
  `YYYY-MM-DD` literal, calza con `<input type="date">` sin ninguna
  conversión. **Precedente a reutilizar** para cualquier fecha futura sin
  componente de hora (ej. si aparece
  `fecha_ingreso` de personal) — usar `date`/mode string, no `timestamp`.
- `activo` boolean default true, SÍ es la forma correcta aquí (a diferencia
  de `orden_trabajo`, que deliberadamente NO tiene `activo` porque su enum
  `estado` ya cumple ese papel vía `Cancelada`). Personal no tiene un enum
  de ciclo de vida propio, así que `activo` es el patrón por defecto del
  proyecto, sin excepción. Motivo concreto de por qué importa no borrar:
  si `orden_trabajo.responsable` (hoy texto libre) se vuelve algún día FK a
  `personal.id`, un DELETE real dejaría referencias rotas.
- Sin columna `edad` a propósito — se calcula en el backend a partir de
  `fecha_nacimiento` al mostrarla. El usuario fue explícito en pedir NO
  agregarla y en que se lo señalara si el esquema parecía incompleto sin
  ella; no lo pareció, dado que es un derivado puro de una columna que ya
  existe.
- Índice `personal_activo_idx` sobre `activo`, mismo criterio que
  `orden_trabajo_estado_idx` (el listado por defecto filtra por activo).
- Sin relación con `user` (Better Auth) todavía: son conceptos distintos
  (quién inicia sesión vs. a quién se asigna trabajo). Documentado así en
  `docs/spec/entidades.md` para que no se asuma que ya están vinculadas.

Ver también [[precio_bigint]] y [[feedback_generar_no_aplicar]] (aquí
también se generó sin aplicar en su momento, por instrucción explícita del
usuario).
