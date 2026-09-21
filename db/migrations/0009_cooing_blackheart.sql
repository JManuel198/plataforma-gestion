CREATE TABLE "materiales" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo_interno" text,
	"descripcion" text,
	"marca" text,
	"modelo" text,
	"codigo_fabrica" text,
	"unidad" text,
	"fecha_activacion" date,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "materiales_codigo_interno_unique" UNIQUE("codigo_interno")
);
--> statement-breakpoint
CREATE INDEX "materiales_activo_idx" ON "materiales" USING btree ("activo");