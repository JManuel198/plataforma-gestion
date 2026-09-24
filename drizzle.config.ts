import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit no lee .env.local por su cuenta; esto lo carga con las mismas
// reglas de precedencia que usa Next.
loadEnvConfig(process.cwd());

// La sesión con la que drizzle-kit ejecuta un ALTER importa: un cambio de
// tipo de columna de `timestamp` a `timestamp with time zone` sin `USING`
// (lo que genera drizzle-kit) hace un cast implícito que Postgres interpreta
// con el `TimeZone` de ESA sesión, no necesariamente UTC. Verificado
// empíricamente (2026-09-24) que Neon devuelve `GMT` por defecto en esta
// conexión, pero nada en este repo lo garantiza — fijarlo aquí, en vez de
// confiar en el default del servidor, es lo que hace que la interpretación
// sea correcta pase lo que pase del lado de Neon.
const urlBase = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!;
const url = new URL(urlBase);
url.searchParams.set("options", "-c timezone=UTC");

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Neon separa dos cadenas: la *pooled* (`-pooler` en el host), que usa la
    // aplicación en runtime, y la *directa*, que es la que quiere una
    // migración. Migrar por el pooler es la causa más común de errores raros
    // en drizzle-kit con este stack, así que si `DATABASE_URL_DIRECT` está
    // definida se usa esa; si no, se cae a la de siempre.
    url: url.toString(),
  },
});
