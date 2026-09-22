CREATE TABLE "correlativo" (
	"clave" text PRIMARY KEY NOT NULL,
	"ultimo" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "materiales" DROP COLUMN "fecha_activacion";