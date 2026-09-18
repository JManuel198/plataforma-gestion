CREATE TYPE "public"."moneda" AS ENUM('PEN', 'USD');--> statement-breakpoint
CREATE TYPE "public"."servicio_estado" AS ENUM('Activado', 'En espera', 'En ejecución', 'Finalizado', 'Facturado', 'Rechazado');--> statement-breakpoint
CREATE TABLE "servicio" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo_cotizacion" text NOT NULL,
	"codigo_revision" text NOT NULL,
	"codigo_oc" text,
	"servicio" text NOT NULL,
	"cliente" text NOT NULL,
	"fecha" timestamp DEFAULT now() NOT NULL,
	"precio" integer NOT NULL,
	"moneda" "moneda" NOT NULL,
	"estado" "servicio_estado" DEFAULT 'Activado' NOT NULL,
	"comentarios" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "servicio_estado_idx" ON "servicio" USING btree ("estado");