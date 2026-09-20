CREATE TABLE "personal" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"cargo" text NOT NULL,
	"dni" text NOT NULL,
	"fecha_nacimiento" date NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "personal_dni_unique" UNIQUE("dni")
);
--> statement-breakpoint
CREATE INDEX "personal_activo_idx" ON "personal" USING btree ("activo");