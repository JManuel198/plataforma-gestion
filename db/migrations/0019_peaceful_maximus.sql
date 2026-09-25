CREATE TABLE "contactos" (
	"id" text PRIMARY KEY NOT NULL,
	"empresa_id" text NOT NULL,
	"nombre" text NOT NULL,
	"cargo" text,
	"correo" text,
	"celular" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contactos_activo_idx" ON "contactos" USING btree ("activo");--> statement-breakpoint
CREATE INDEX "contactos_empresa_id_idx" ON "contactos" USING btree ("empresa_id");