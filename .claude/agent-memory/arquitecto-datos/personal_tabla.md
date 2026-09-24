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

**Estado al escribir (2026-09-24), verificar antes de usar:** la migración figura en `db/migrations/meta/_journal.json`, cuyos `when` son estrictamente crecientes. La tabla `personal` sí existe en la base: la deuda técnica de `AGENTS.md` registra que el UNIQUE de `personal.dni` se probó rechazando duplicados "en la base real" (antes del 2026-09-21), y `modules/personal/` está construido sobre ella. NO se ha comprobado que conste en `drizzle.__drizzle_migrations`: desde el contenedor donde se corrigió esta nota no había acceso a Neon. Para confirmarlo, busca su `when` (`1789927015357`) en la columna `created_at` de esa tabla.

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
  `timestamp`. Motivo: evita por completo el problema de zonas horarias
  documentado en AGENTS.md (el type parser UTC + `parseInputDatesAsUTC` de
  `db/index.ts`, que existen para las columnas `timestamp` sin zona). `date`
  con mode string entra/sale como `YYYY-MM-DD` literal, calza con
  `<input type="date">` sin ninguna conversión. **Precedente a reutilizar**
  para cualquier fecha futura sin componente de hora (ej. si aparece
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
