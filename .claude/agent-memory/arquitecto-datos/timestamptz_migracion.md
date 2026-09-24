---
name: timestamptz-migracion
description: Migración global timestamp → timestamp with time zone (2026-09-24); por qué el riesgo real estaba en el ALTER sin USING, no en el esquema
metadata:
  type: project
---

Todas las columnas `timestamp` sin zona del esquema (las 12 de Better Auth en
`db/schema/auth.ts`, `orden_trabajo`/`ot_correlativo`, y `created_at`/`updated_at`
de Personal, Materiales, Servicios, Lista de precios, Tarifario de personal,
EPPs, `material_caracteristicas` y `correlativo`) pasaron a
`timestamp({ withTimezone: true })`. Migración generada y aplicada el
2026-09-24 (verificar contra `db/migrations/meta/_journal.json` y la base
antes de asumir que sigue siendo la última palabra). `personal.fecha_nacimiento`
sigue siendo `date` — fuera de alcance a propósito, sigue sin hora.

**Por qué el riesgo no estaba en decidir el tipo, sino en el `ALTER COLUMN`
generado.** `npx drizzle-kit generate` produce el cambio `timestamp` →
`timestamp with time zone` SIN cláusula `USING` (confirmado leyendo su código
fuente). Postgres hace entonces un cast implícito que interpreta los valores
YA EXISTENTES con el `TimeZone` de la SESIÓN que ejecuta el `ALTER` — no
necesariamente UTC, y nada en el repo fijaba esa sesión (el supuesto "Neon
corre en GMT" nunca se verificaba en código). Corregir el `.sql` a mano
habría violado la regla de nunca editar migraciones generadas.

**Solución adoptada:** forzar `options=-c timezone=UTC` en la cadena de
conexión que usa drizzle-kit (`drizzle.config.ts`), NO en el archivo de
migración — la sesión queda en UTC sin tocar el SQL generado por Drizzle.

**Lección para la próxima ALTER de tipo con semántica de zona horaria:**
verificar el resultado leyendo el valor como TEXTO crudo (`columna::text`),
nunca con el parser por defecto de una conexión suelta de `pg` — ese parser
para `timestamp` sin zona interpreta con la zona LOCAL del proceso que lee
(no UTC), que es exactamente el mismo problema que la migración resolvía
para la app. Verificar con ese parser antes de corregirlo puede hacer creer
que hubo corrupción de datos donde no la hubo (pasó durante esta migración,
se corrigió antes de concluir nada).

**Consecuencia en `db/index.ts`:** los dos ajustes de node-postgres que
existían solo por las columnas sin zona (el type parser custom que leía como
UTC, y `defaults.parseInputDatesAsUTC`) se ELIMINARON — ya no tienen objeto,
porque `timestamptz` trae el offset explícito y node-postgres lo parsea bien
por defecto. Si alguna vez vuelve a aparecer una columna `timestamp` SIN
`withTimezone: true` en el esquema, es una regresión, no una excepción
válida — no revivir ese hack.

**docs/spec/entidades.md ya está sincronizado** (mismo día): todas las
celdas de tipo que decían `timestamp` para columnas de fecha/hora (no para
`date`, que sigue igual) pasaron a `timestamp with time zone`, y la
explicación de por qué `fecha_nacimiento` es `date` se reescribió para no
seguir citando el mecanismo de `db/index.ts` que ya no existe (se dejó como
nota histórica fechada, no se borró el porqué de fondo).

**Pendiente de sincronizar en otro lado (fuera del alcance de esta tarea,
reportado pero no corregido):** `docs/spec/entidades.md` no tiene ninguna
ficha para las tablas de Better Auth (`user`, `session`, `account`,
`verification`) — nunca las documentó, ni antes ni después de este cambio —
así que no hay nada que sincronizar ahí para esas 12 columnas
específicamente, pero si algún día se decide documentarlas, ya deberían
entrar directamente como `timestamp with time zone`.
