-- Custom SQL migration file, put your code below! --
-- Migración de DATOS, escrita a mano sobre el archivo vacío que generó
-- `npx drizzle-kit generate --custom` (excepción a la regla invariable 6,
-- aprobada el 2026-09-25; ver db/migrations/README.md). No cambia ninguna
-- estructura.
--
-- El correlativo anual de OT pasa de `ot_correlativo` (PK anio) a la tabla
-- compartida `correlativo`, con una fila por año y clave
-- 'ordenes-trabajo:<año>' (CLAVE_CORRELATIVO_OT en
-- modules/ordenes-trabajo/constantes.ts). Se copia el último número entregado
-- de cada año tal cual, para que la próxima OT siga la numeración sin
-- reiniciar ni saltar.
--
-- GREATEST: si por cualquier motivo la fila ya existiera, nunca se retrocede
-- el contador (retroceder repetiría un código ya emitido).
INSERT INTO "correlativo" ("clave", "ultimo", "created_at", "updated_at")
SELECT 'ordenes-trabajo:' || "anio"::text, "ultimo", "created_at", "updated_at"
FROM "ot_correlativo"
ON CONFLICT ("clave") DO UPDATE
SET "ultimo" = GREATEST("correlativo"."ultimo", EXCLUDED."ultimo"),
    "updated_at" = now();
