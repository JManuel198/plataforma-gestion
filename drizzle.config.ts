import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit no lee .env.local por su cuenta; esto lo carga con las mismas
// reglas de precedencia que usa Next.
loadEnvConfig(process.cwd());

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
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!,
  },
});
