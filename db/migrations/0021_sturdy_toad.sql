CREATE TYPE "public"."oportunidad_actividad_tipo" AS ENUM('nota', 'llamada', 'reunion', 'correo', 'visita');--> statement-breakpoint
CREATE TYPE "public"."oportunidad_etapa" AS ENUM('prospecto', 'cotizacion', 'negociacion', 'adjudicado', 'ejecucion', 'finalizado');--> statement-breakpoint
CREATE TYPE "public"."oportunidad_historial_campo" AS ENUM('titulo', 'contacto', 'fecha_cierre_estimada');--> statement-breakpoint
CREATE TYPE "public"."oportunidad_historial_tipo" AS ENUM('creacion', 'cambio_etapa', 'edicion', 'perdida', 'anulacion', 'reapertura');--> statement-breakpoint
CREATE TYPE "public"."oportunidad_situacion" AS ENUM('abierta', 'perdida', 'anulada');--> statement-breakpoint
CREATE TABLE "oportunidad_actividades" (
	"id" text PRIMARY KEY NOT NULL,
	"oportunidad_id" text NOT NULL,
	"tipo" "oportunidad_actividad_tipo" NOT NULL,
	"descripcion" text NOT NULL,
	"fecha_hora" timestamp with time zone DEFAULT now() NOT NULL,
	"autor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oportunidad_historial" (
	"id" text PRIMARY KEY NOT NULL,
	"oportunidad_id" text NOT NULL,
	"tipo" "oportunidad_historial_tipo" NOT NULL,
	"etapa_anterior" "oportunidad_etapa",
	"etapa_nueva" "oportunidad_etapa",
	"campo" "oportunidad_historial_campo",
	"titulo_anterior" text,
	"titulo_nuevo" text,
	"contacto_anterior_id" text,
	"contacto_nuevo_id" text,
	"fecha_cierre_anterior" date,
	"fecha_cierre_nueva" date,
	"motivo" text,
	"usuario_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oportunidad_historial_etapas_check" CHECK ((
        "oportunidad_historial"."tipo" IN ('creacion', 'reapertura')
          AND "oportunidad_historial"."etapa_anterior" IS NULL AND "oportunidad_historial"."etapa_nueva" IS NOT NULL
      ) OR (
        "oportunidad_historial"."tipo" = 'cambio_etapa'
          AND "oportunidad_historial"."etapa_anterior" IS NOT NULL AND "oportunidad_historial"."etapa_nueva" IS NOT NULL
          AND "oportunidad_historial"."etapa_anterior" <> "oportunidad_historial"."etapa_nueva"
      ) OR (
        "oportunidad_historial"."tipo" IN ('edicion', 'perdida', 'anulacion')
          AND "oportunidad_historial"."etapa_anterior" IS NULL AND "oportunidad_historial"."etapa_nueva" IS NULL
      )),
	CONSTRAINT "oportunidad_historial_campo_check" CHECK (("oportunidad_historial"."tipo" = 'edicion') = ("oportunidad_historial"."campo" IS NOT NULL)),
	CONSTRAINT "oportunidad_historial_motivo_check" CHECK ("oportunidad_historial"."motivo" IS NULL OR "oportunidad_historial"."tipo" IN ('perdida', 'anulacion')),
	CONSTRAINT "oportunidad_historial_titulo_check" CHECK ((
        "oportunidad_historial"."campo" IS NOT DISTINCT FROM 'titulo'
          AND "oportunidad_historial"."titulo_anterior" IS NOT NULL AND "oportunidad_historial"."titulo_nuevo" IS NOT NULL
          AND "oportunidad_historial"."titulo_anterior" <> "oportunidad_historial"."titulo_nuevo"
      ) OR (
        "oportunidad_historial"."campo" IS DISTINCT FROM 'titulo'
          AND "oportunidad_historial"."titulo_anterior" IS NULL AND "oportunidad_historial"."titulo_nuevo" IS NULL
      )),
	CONSTRAINT "oportunidad_historial_contacto_check" CHECK ((
        "oportunidad_historial"."campo" IS NOT DISTINCT FROM 'contacto'
          AND "oportunidad_historial"."contacto_anterior_id" IS DISTINCT FROM "oportunidad_historial"."contacto_nuevo_id"
      ) OR (
        "oportunidad_historial"."campo" IS DISTINCT FROM 'contacto'
          AND "oportunidad_historial"."contacto_anterior_id" IS NULL AND "oportunidad_historial"."contacto_nuevo_id" IS NULL
      )),
	CONSTRAINT "oportunidad_historial_fecha_cierre_check" CHECK ((
        "oportunidad_historial"."campo" IS NOT DISTINCT FROM 'fecha_cierre_estimada'
          AND "oportunidad_historial"."fecha_cierre_anterior" IS DISTINCT FROM "oportunidad_historial"."fecha_cierre_nueva"
      ) OR (
        "oportunidad_historial"."campo" IS DISTINCT FROM 'fecha_cierre_estimada'
          AND "oportunidad_historial"."fecha_cierre_anterior" IS NULL AND "oportunidad_historial"."fecha_cierre_nueva" IS NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "oportunidades" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"titulo" text NOT NULL,
	"empresa_id" text NOT NULL,
	"contacto_id" text,
	"asesor_id" text NOT NULL,
	"moneda" "moneda" DEFAULT 'USD' NOT NULL,
	"valor_estimado" bigint DEFAULT 0 NOT NULL,
	"probabilidad" integer DEFAULT 0 NOT NULL,
	"etapa" "oportunidad_etapa" DEFAULT 'prospecto' NOT NULL,
	"situacion" "oportunidad_situacion" DEFAULT 'abierta' NOT NULL,
	"motivo" text,
	"fecha_cierre_estimada" date,
	"etapa_cambiada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oportunidades_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "oportunidades_probabilidad_check" CHECK ("oportunidades"."probabilidad" >= 0 AND "oportunidades"."probabilidad" <= 100),
	CONSTRAINT "oportunidades_valor_estimado_check" CHECK ("oportunidades"."valor_estimado" >= 0)
);
--> statement-breakpoint
ALTER TABLE "oportunidad_actividades" ADD CONSTRAINT "oportunidad_actividades_oportunidad_id_oportunidades_id_fk" FOREIGN KEY ("oportunidad_id") REFERENCES "public"."oportunidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oportunidad_actividades" ADD CONSTRAINT "oportunidad_actividades_autor_id_user_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oportunidad_historial" ADD CONSTRAINT "oportunidad_historial_oportunidad_id_oportunidades_id_fk" FOREIGN KEY ("oportunidad_id") REFERENCES "public"."oportunidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oportunidad_historial" ADD CONSTRAINT "oportunidad_historial_contacto_anterior_id_contactos_id_fk" FOREIGN KEY ("contacto_anterior_id") REFERENCES "public"."contactos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oportunidad_historial" ADD CONSTRAINT "oportunidad_historial_contacto_nuevo_id_contactos_id_fk" FOREIGN KEY ("contacto_nuevo_id") REFERENCES "public"."contactos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oportunidad_historial" ADD CONSTRAINT "oportunidad_historial_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oportunidades" ADD CONSTRAINT "oportunidades_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oportunidades" ADD CONSTRAINT "oportunidades_contacto_id_contactos_id_fk" FOREIGN KEY ("contacto_id") REFERENCES "public"."contactos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oportunidades" ADD CONSTRAINT "oportunidades_asesor_id_user_id_fk" FOREIGN KEY ("asesor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "oportunidad_actividades_oportunidad_id_idx" ON "oportunidad_actividades" USING btree ("oportunidad_id");--> statement-breakpoint
CREATE INDEX "oportunidad_historial_oportunidad_id_idx" ON "oportunidad_historial" USING btree ("oportunidad_id");--> statement-breakpoint
CREATE INDEX "oportunidades_empresa_id_idx" ON "oportunidades" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "oportunidades_contacto_id_idx" ON "oportunidades" USING btree ("contacto_id");--> statement-breakpoint
CREATE INDEX "oportunidades_asesor_id_idx" ON "oportunidades" USING btree ("asesor_id");--> statement-breakpoint
CREATE INDEX "oportunidades_situacion_etapa_idx" ON "oportunidades" USING btree ("situacion","etapa");