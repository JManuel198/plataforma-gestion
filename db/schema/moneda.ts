import { pgEnum } from "drizzle-orm/pg-core";
import { MONEDAS } from "@/core/monedas";

// Movido fuera de `orden-trabajo.ts` el 2026-09-22 (Bloque 13, Parte 1): deja
// de ser una tabla la que declara el enum compartido para que ninguna de las
// dos tablas que lo usan (`orden_trabajo`, `lista_precios`) parezca la dueña
// del enum. Terreno neutral, mismo espíritu que llevó `MONEDAS` a `core/`.
//
// El nombre del tipo en PostgreSQL sigue siendo `moneda` — este movimiento es
// puramente de organización de archivos en Drizzle/TypeScript, no debe
// producir ningún DDL nuevo al generar la migración (ni CREATE TYPE, ni
// ALTER, ni nada que mencione el enum `moneda`).
//
// `MONEDAS` en sí sigue viviendo en `core/monedas.ts`, no aquí: este archivo
// solo la importa para construir el `pgEnum`. Nunca declares un segundo array
// literal con estos valores.
export const monedaEnum = pgEnum("moneda", MONEDAS);
