ALTER TABLE "user" ADD COLUMN "dni" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "telefono" text;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_dni_unique" UNIQUE("dni");