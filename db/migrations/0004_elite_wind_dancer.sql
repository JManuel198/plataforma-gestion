ALTER TYPE "public"."ot_estado" ADD VALUE 'Facturado' BEFORE 'Cancelada';--> statement-breakpoint
ALTER TABLE "orden_trabajo" DROP CONSTRAINT "orden_trabajo_servicio_id_servicio_id_fk";
--> statement-breakpoint
DROP INDEX "orden_trabajo_servicio_id_idx";--> statement-breakpoint
ALTER TABLE "orden_trabajo" ADD COLUMN "codigo_revision" text;--> statement-breakpoint
ALTER TABLE "orden_trabajo" ADD COLUMN "precio" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "orden_trabajo" ADD COLUMN "moneda" "moneda" NOT NULL;--> statement-breakpoint
ALTER TABLE "orden_trabajo" ADD COLUMN "comentarios" text;--> statement-breakpoint
ALTER TABLE "orden_trabajo" DROP COLUMN "servicio_id";