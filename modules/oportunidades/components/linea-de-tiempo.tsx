import type { ReactNode } from "react";
import dayjs from "dayjs";
import {
  ArrowRightIcon,
  BanIcon,
  CirclePlusIcon,
  CircleXIcon,
  HistoryIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  RotateCcwIcon,
  StickyNoteIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatearFecha } from "@/lib/fecha";
import { cn } from "cn";
import { ETIQUETAS_TIPO_ACTIVIDAD, type TipoActividad } from "../constantes";
import type { EntradaLineaDeTiempo } from "../queries";
import { NombreEtapa } from "./etiquetas-oportunidad";
import { PanelDetalle } from "./panel-detalle";

const ICONO_ACTIVIDAD: Record<TipoActividad, LucideIcon> = {
  nota: StickyNoteIcon,
  llamada: PhoneIcon,
  reunion: UsersIcon,
  correo: MailIcon,
  visita: MapPinIcon,
};

/**
 * "Historial & Actividades" del detalle (secciones 4 y 7): la línea de tiempo
 * de `obtenerLineaDeTiempo` tal cual llega —ya unida y ordenada, lo más
 * reciente arriba—, con el contador "N registros". Aquí no se ordena ni se
 * filtra nada.
 *
 * Cada `tipo` se lee como lo define la sección 4:
 * - creación, con su etapa inicial;
 * - cambio de etapa, de cuál a cuál;
 * - edición de título, contacto o fecha estimada de cierre, con el valor
 *   anterior y el nuevo ("Sin contacto" / "Sin fecha" cuando uno falta);
 * - perdida, con su motivo (obligatorio);
 * - anulada, con su motivo o la constancia de que no se registró;
 * - reabierta, con la etapa a la que vuelve;
 * - cada actividad, con su tipo y su descripción.
 *
 * Todas llevan quién y cuándo, en hora de Lima. La fecha de una actividad es
 * cuándo OCURRIÓ (puede ser anterior a su registro), no cuándo se escribió.
 */
export function LineaDeTiempo({
  entradas,
}: {
  entradas: EntradaLineaDeTiempo[];
}) {
  const total = entradas.length;

  return (
    <PanelDetalle
      titulo="Historial & Actividades"
      Icono={HistoryIcon}
      extra={`${total} ${total === 1 ? "registro" : "registros"}`}
    >
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">Sin registros.</p>
      ) : (
        <ol className="space-y-4">
          {entradas.map((entrada) => (
            <Entrada key={`${entrada.tipo}-${entrada.id}`} entrada={entrada} />
          ))}
        </ol>
      )}
    </PanelDetalle>
  );
}

function Entrada({ entrada }: { entrada: EntradaLineaDeTiempo }) {
  const { Icono, titulo, detalle, tono } = contenido(entrada);

  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground",
          tono === "perdida" && "border-destructive/40 text-destructive",
        )}
      >
        <Icono className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm">{titulo}</p>
        <p className="text-xs text-muted-foreground">
          {entrada.autor.nombre} ·{" "}
          <time dateTime={entrada.fecha.toISOString()} className="tabular-nums">
            {formatearFecha(entrada.fecha, "DD/MM/YYYY HH:mm")}
          </time>
        </p>
        {detalle ? (
          <div
            className={cn(
              "rounded-md bg-muted/60 px-3 py-2 text-sm break-words whitespace-pre-line",
              tono === "perdida" && "bg-destructive/10",
            )}
          >
            {detalle}
          </div>
        ) : null}
      </div>
    </li>
  );
}

type Contenido = {
  Icono: LucideIcon;
  titulo: ReactNode;
  detalle?: ReactNode;
  tono?: "perdida";
};

function contenido(entrada: EntradaLineaDeTiempo): Contenido {
  switch (entrada.tipo) {
    case "creacion":
      return {
        Icono: CirclePlusIcon,
        titulo: (
          <>
            Oportunidad creada en <NombreEtapa etapa={entrada.etapa} />
          </>
        ),
      };
    case "cambio_etapa":
      return {
        Icono: ArrowRightIcon,
        titulo: (
          <>
            Movió de <NombreEtapa etapa={entrada.etapa_anterior} /> a{" "}
            <NombreEtapa etapa={entrada.etapa_nueva} />
          </>
        ),
      };
    case "edicion":
      return contenidoEdicion(entrada);
    case "perdida":
      return {
        Icono: CircleXIcon,
        titulo: "Marcada como perdida",
        detalle: <Motivo motivo={entrada.motivo} />,
        tono: "perdida",
      };
    case "anulacion":
      return {
        Icono: BanIcon,
        titulo: "Anulada",
        detalle: <Motivo motivo={entrada.motivo} />,
      };
    case "reapertura":
      return {
        Icono: RotateCcwIcon,
        titulo: (
          <>
            Reabrió la oportunidad en <NombreEtapa etapa={entrada.etapa} />
          </>
        ),
      };
    case "actividad":
      return {
        Icono: ICONO_ACTIVIDAD[entrada.tipo_actividad],
        titulo: (
          <Badge variant="outline">
            {ETIQUETAS_TIPO_ACTIVIDAD[entrada.tipo_actividad]}
          </Badge>
        ),
        detalle: entrada.descripcion,
      };
  }
}

/** Las tres ediciones posibles (`CAMPOS_HISTORIAL`), con su anterior → nuevo. */
function contenidoEdicion(
  entrada: Extract<EntradaLineaDeTiempo, { tipo: "edicion" }>,
): Contenido {
  switch (entrada.campo) {
    case "titulo":
      return {
        Icono: PencilIcon,
        titulo: "Editó el título",
        detalle: (
          <AntesDespues anterior={entrada.anterior} nuevo={entrada.nuevo} />
        ),
      };
    case "contacto":
      return {
        Icono: PencilIcon,
        titulo: "Editó el contacto",
        detalle: (
          <AntesDespues
            anterior={entrada.anterior?.nombre ?? null}
            nuevo={entrada.nuevo?.nombre ?? null}
            vacio="Sin contacto"
          />
        ),
      };
    case "fecha_cierre_estimada":
      return {
        Icono: PencilIcon,
        titulo: "Editó la fecha estimada de cierre",
        detalle: (
          <AntesDespues
            anterior={fechaCorta(entrada.anterior)}
            nuevo={fechaCorta(entrada.nuevo)}
            vacio="Sin fecha"
          />
        ),
      };
  }
}

/** Valor anterior → valor nuevo; `vacio` es cómo se lee la ausencia de uno. */
function AntesDespues({
  anterior,
  nuevo,
  vacio = "—",
}: {
  anterior: string | null;
  nuevo: string | null;
  vacio?: string;
}) {
  return (
    <>
      <span className="text-muted-foreground line-through decoration-muted-foreground/50">
        {anterior ?? vacio}
      </span>
      <span className="sr-only"> cambió a </span>
      <span aria-hidden> → </span>
      <span className="font-medium">{nuevo ?? vacio}</span>
    </>
  );
}

function Motivo({ motivo }: { motivo: string | null }) {
  return motivo ? (
    <>
      <span className="font-semibold">Motivo:</span> {motivo}
    </>
  ) : (
    <span className="text-muted-foreground">No se registró motivo.</span>
  );
}

/** Una columna `date` (`YYYY-MM-DD`, sin hora): se formatea sin zona horaria. */
function fechaCorta(fecha: string | null): string | null {
  return fecha ? dayjs(fecha).format("DD/MM/YYYY") : null;
}
