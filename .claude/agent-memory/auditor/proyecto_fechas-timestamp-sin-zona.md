---
name: proyecto-fechas-timestamp-sin-zona
description: Asimetría verificada en plataforma-gestion entre fechas que pone la base (UTC) y las que escribe Node (hora local del proceso) en columnas timestamp sin zona
metadata:
  type: project
---

Verificado empíricamente el 2026-09-18 contra la base real: en las columnas
`timestamp` (sin zona) de este proyecto conviven dos orígenes con semántica
distinta.

- Las que pone la base (`DEFAULT now()`: `servicio.fecha`,
  `orden_trabajo.fecha_creacion`, los `created_at`) guardan **UTC**, porque la
  sesión de Neon corre en `TimeZone = GMT`.
- Las que escribe Node vía el driver (`session.expires_at`, `created_at` y
  `updated_at` de Better Auth, y todo `$onUpdate(() => new Date())`) guardan la
  **hora local del proceso**: `pg` serializa un `Date` con offset y Postgres
  descarta el offset al meterlo en una columna sin zona. Evidencia: una fila de
  `session` recién creada tenía `created_at` en hora de Caracas, no en UTC.

**Why:** db/index.ts registra un type parser global que lee TODA columna
`timestamp` como UTC. Ese supuesto es cierto para el primer grupo y falso para
el segundo. En Vercel el proceso corre en UTC y los dos grupos coinciden, así
que el desfase solo aparece en desarrollo — y la máquina de desarrollo no
corre en `America/Lima`, que es lo que asumen varios comentarios del código.

**How to apply:** al auditar cualquier fecha nueva, primero preguntar quién la
escribe. Si la escribe Node en una columna sin zona, el parser la corre; si la
pone la base, no. La comprobación es barata: leer `created_at::text` de una
fila reciente y compararlo con `now()` y con el reloj local. Ver
[[proyecto-verificacion-tecnica]] para cómo consultar la base sin dejar
scripts (también funciona un `.cjs` en el scratchpad que haga
`require("<ruta-absoluta-del-repo>/node_modules/pg")` y se ejecute con
`node --env-file=<repo>/.env.local`).
