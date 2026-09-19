CREATE TYPE "public"."ot_estado" AS ENUM('Pendiente', 'En ejecución', 'Pausada', 'Finalizada', 'Cancelada');--> statement-breakpoint
CREATE TABLE "orden_trabajo" (
	"id" text PRIMARY KEY NOT NULL,
	"servicio_id" text NOT NULL,
	"codigo_ot" text NOT NULL,
	"codigo_cotizacion" text NOT NULL,
	"asunto" text NOT NULL,
	"codigo_oc" text,
	"cliente" text NOT NULL,
	"estado" "ot_estado" DEFAULT 'Pendiente' NOT NULL,
	"fecha_creacion" timestamp DEFAULT now() NOT NULL,
	"responsable" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orden_trabajo_codigo_ot_unique" UNIQUE("codigo_ot")
);
--> statement-breakpoint
CREATE TABLE "ot_correlativo" (
	"anio" integer PRIMARY KEY NOT NULL,
	"ultimo" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orden_trabajo" ADD CONSTRAINT "orden_trabajo_servicio_id_servicio_id_fk" FOREIGN KEY ("servicio_id") REFERENCES "public"."servicio"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orden_trabajo_estado_idx" ON "orden_trabajo" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "orden_trabajo_servicio_id_idx" ON "orden_trabajo" USING btree ("servicio_id");