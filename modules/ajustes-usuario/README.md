# modules/ajustes-usuario/

Los datos de la propia cuenta del usuario en sesión. Se construye por etapas;
el alcance de cada una está en AGENTS.md, sección "Módulo de ajustes de
usuario". Hoy: solo perfil (nombre, dni, telefono).

- `schema.ts` — validación Zod del perfil. `email`, `role` y `activo` no
  están y no deben estar. Un campo opcional en blanco se guarda como `null`.
- `queries.ts` — `obtenerPerfil()`, siempre del usuario en sesión (no recibe
  id). Lee de la base porque `dni` no viaja en la sesión (`returned: false`).
- `actions.ts` — `actualizarPerfil()`. Toma el usuario de la sesión, escribe
  el nombre en `nombre_completo` y en `name` a la vez, y traduce el choque del
  UNIQUE de `dni`.

La tabla es `user` de Better Auth (`db/schema/auth.ts`); este módulo no tiene
tabla propia.
