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
    url: process.env.DATABASE_URL!,
  },
});
