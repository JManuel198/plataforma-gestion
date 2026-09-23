CREATE TABLE "servicios" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"servicio" text,
	"categoria" text,
	"unidad" text,
	"precio" bigint,
	"moneda" "moneda",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "servicios_codigo_unique" UNIQUE("codigo")
);
