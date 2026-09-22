CREATE TABLE "lista_precios" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo_oferta" text NOT NULL,
	"material_id" text NOT NULL,
	"proveedor" text,
	"unidad" text,
	"cantidad" numeric(14, 3),
	"precio_lista" bigint,
	"descuento" numeric(5, 2) DEFAULT '0' NOT NULL,
	"moneda" "moneda",
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lista_precios_codigo_oferta_unique" UNIQUE("codigo_oferta"),
	CONSTRAINT "lista_precios_descuento_pct_check" CHECK ("lista_precios"."descuento" >= 0 AND "lista_precios"."descuento" <= 100)
);
--> statement-breakpoint
ALTER TABLE "lista_precios" ADD CONSTRAINT "lista_precios_material_id_materiales_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materiales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lista_precios_activo_idx" ON "lista_precios" USING btree ("activo");--> statement-breakpoint
CREATE INDEX "lista_precios_material_id_idx" ON "lista_precios" USING btree ("material_id");