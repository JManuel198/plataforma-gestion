import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types, defaults } from "pg";
import * as schema from "./schema";

// Las columnas `timestamp` no llevan zona horaria, así que node-postgres usa
// la zona del proceso Node en las DOS direcciones. Hay que fijar las dos, o se
// arregla una y se rompe la otra.
//
// El origen de los valores tampoco es uno solo:
// - Los que pone la base (`DEFAULT now()`): `fecha`, `fecha_creacion`,
//   `created_at`. La sesión de Neon corre en GMT, así que ya están en UTC.
// - Los que escribe Node: `session.expires_at` de Better Auth y los
//   `$onUpdate` de `updated_at`. Estos se serializan con la zona del proceso.
//
// LECTURA: el texto que devuelve Postgres se interpreta como UTC. Sin esto,
// una fila creada por `now()` se lee corrida en cualquier máquina que no esté
// en UTC, y formatearFecha() de lib/fecha.ts acierta en producción y falla en
// desarrollo — la peor combinación posible.
//
// ESCRITURA: las fechas que envía Node se serializan en UTC. Sin esto, un
// proceso fuera de UTC guardaría hora local y la releería como UTC, así que la
// fecha volvería corrida por el offset de la máquina: en desarrollo, una
// sesión de Better Auth duraría de más.
//
// En Vercel el proceso ya corre en UTC y ninguna de las dos cambia nada;
// existen para que desarrollo se comporte igual que producción.
//
// El arreglo de fondo es que esas columnas sean `timestamptz`; eso exige una
// migración de datos y está anotado en la deuda técnica de AGENTS.md.
defaults.parseInputDatesAsUTC = true;
types.setTypeParser(
  types.builtins.TIMESTAMP,
  (valor) => new Date(`${valor.replace(" ", "T")}Z`),
);

// El HMR de `next dev` reevalúa este módulo en cada cambio; sin cachear el Pool
// se abre uno nuevo cada vez y se agota el límite de conexiones de Neon.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
