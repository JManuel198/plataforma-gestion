---
name: proyecto-verificacion-tecnica
description: Qué scripts de verificación existen realmente en package.json de plataforma-gestion, cómo suplir lo que falta y cómo consultar la base Neon sin dejar archivos en el repo
metadata:
  type: project
---

A fecha 2026-09-18, `package.json` de plataforma-gestion solo definía el script
`lint` (`eslint`). **Estado al escribir (2026-09-24), verificar antes de usar:**
ya define también `test` (`playwright test`, las pruebas de humo de `tests/`),
además de `dev`, `build` y `start`; sigue sin haber un script de tipos.

**Por qué importa:** sin script de tipos declarado, no asumir que "no se pudo
verificar" — correr `npx tsc --noEmit` directamente desde la raíz del repo
funciona (el proyecto usa TypeScript estricto) y es la forma de cubrir el
chequeo de tipos exigido por la auditoría aunque no esté en package.json.
`npx drizzle-kit check` también corre sin tocar la base y valida que las
migraciones no colisionen.

**Cómo aplicar:** en cada auditoría, releer `package.json` primero (puede
cambiar), correr `npm run lint` y `npm test` si existe, y, si no existe script de tipos, correr
`npx tsc --noEmit` como sustituto y reportarlo explícitamente como tal en
"Verificación técnica ejecutada" (aclarando que no vino de un script propio
del proyecto).

**Consultar la base real sin escribir archivos en el repo.** Como auditor no
debo dejar scripts sueltos. Funciona `node --input-type=module -e '...'`
ejecutado con cwd = raíz del repo (resuelve `node_modules` desde ahí):

- `import env from "@next/env"; env.loadEnvConfig(process.cwd())` — el named
  import falla, `@next/env` es CommonJS.
- Usar `process.env.DATABASE_URL` (pooled). La directa
  (`DATABASE_URL_DIRECT`, la que prefiere `drizzle.config.ts`) es un endpoint
  Neon que se suspende y da `ETIMEDOUT`.
- Dentro de `-e '...'` las comillas simples del SQL se las come bash: usar
  dollar quoting (`current_setting($$TimeZone$$)`) en vez de `'TimeZone'`.
- Solo lecturas de catálogo (`pg_constraint`, `pg_indexes`, `pg_enum`,
  `information_schema.columns`); nunca escribir datos de prueba.

Dato verificado el 2026-09-18: la sesión de la base corre en `TimeZone = GMT`,
así que las columnas `timestamp` con `DEFAULT now()` guardan hora UTC — útil
para juzgar cualquier fecha que se muestre sin convertir a `America/Lima`.
Ver [[proyecto-patrones-establecidos]].
