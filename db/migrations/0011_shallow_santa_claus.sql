CREATE TABLE "material_caracteristicas" (
	"id" text PRIMARY KEY NOT NULL,
	"material_id" text NOT NULL,
	"texto" text NOT NULL,
	"orden" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "material_caracteristicas" ADD CONSTRAINT "material_caracteristicas_material_id_materiales_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materiales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "material_caracteristicas_material_id_idx" ON "material_caracteristicas" USING btree ("material_id");