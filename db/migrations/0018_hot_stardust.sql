CREATE TYPE "public"."empresa_tipo" AS ENUM('cliente', 'proveedor', 'cliente_y_proveedor');--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"razon_social" text NOT NULL,
	"nombre_comercial" text,
	"nombre_corto" text,
	"ruc" text,
	"tipo" "empresa_tipo" NOT NULL,
	"tipo_contribuyente" text,
	"descripcion_rubro" text,
	"estado" text,
	"condicion" text,
	"direccion" text,
	"distrito" text,
	"provincia" text,
	"departamento" text,
	"pais" text DEFAULT 'PE',
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "empresas_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "empresas_ruc_unique" UNIQUE("ruc"),
	CONSTRAINT "empresas_ruc_formato_check" CHECK ("empresas"."ruc" ~ '^[0-9]{11}$'),
	CONSTRAINT "empresas_pais_iso_check" CHECK ("empresas"."pais" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE INDEX "empresas_activo_idx" ON "empresas" USING btree ("activo");