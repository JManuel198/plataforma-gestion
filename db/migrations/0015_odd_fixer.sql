CREATE TABLE "epps" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"descripcion" text,
	"unidad" text,
	"precio" bigint,
	"moneda" "moneda",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "epps_codigo_unique" UNIQUE("codigo")
);
