import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// RESUELTO (2026-09-24): todas las columnas de fecha/hora del esquema son
// `timestamp with time zone` (ver deuda técnica de AGENTS.md). node-postgres
// parsea `timestamptz` correctamente por defecto —el texto que devuelve
// Postgres siempre trae el offset explícito— así que ya no hace falta forzar
// nada aquí en ninguna dirección: ni un type parser custom para lectura, ni
// `parseInputDatesAsUTC` para escritura. Antes de este cambio, las columnas
// eran `timestamp` sin zona y dependían de dos ajustes en este archivo para
// comportarse igual en cualquier máquina; si algún día vuelve a aparecer una
// columna `timestamp` sin `withTimezone: true`, ese es el síntoma de que se
// repitió el problema, no una razón para revivir el hack de aquí.

// El HMR de `next dev` reevalúa este módulo en cada cambio; sin cachear el Pool
// se abre uno nuevo cada vez y se agota el límite de conexiones de Neon.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
