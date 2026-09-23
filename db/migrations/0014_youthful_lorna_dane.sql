CREATE TABLE "tarifario_personal" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"cargo" text,
	"unidad" text,
	"costo" bigint,
	"moneda" "moneda",
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tarifario_personal_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE INDEX "tarifario_personal_activo_idx" ON "tarifario_personal" USING btree ("activo");