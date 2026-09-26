"use client";

import { useState } from "react";
import { PlusIcon, RotateCcwIcon, XIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MensajeError } from "@/core/components/mensaje-error";
import { agregarActividad, anular, marcarPerdida, reabrir } from "../actions";
import {
  ETIQUETAS_ETAPA,
  ETIQUETAS_TIPO_ACTIVIDAD,
  TIPOS_ACTIVIDAD,
  type EtapaOportunidad,
  type SituacionOportunidad,
} from "../constantes";
import { DialogoAccion } from "./dialogo-accion";
import { useAccionOportunidad } from "./use-accion-oportunidad";

/**
 * Las acciones de la cabecera del detalle (sección 7 de la spec, Parte 10).
 *
 * QUÉ BOTONES SE VEN depende del estado que manda el servidor, y es solo el
 * reflejo visual de reglas que el backend ya aplica (no se duplican aquí):
 * - Abierta: "+ Actividad", "Marcar perdida" y "Anular". En Finalizado no hay
 *   "Marcar perdida" (sección 2: convertiría un negocio ganado en perdido);
 *   `marcarPerdida` lo rechaza igual.
 * - Perdida o anulada: solo "Reabrir".
 *
 * Todas terminan en `useAccionOportunidad`: al acabar, `router.refresh()`
 * trae la página ya escrita por el servidor. Por eso, al perder o anular, la
 * página pasa sola a solo lectura (aviso de cierre, línea desactivada, sin
 * lápices) y al reabrir vuelve con todo activo en la etapa en que estaba: no
 * hay un estado local que sincronizar. Si la acción falla porque otra pestaña
 * ya la cerró o reabrió, el mismo refresh muestra lo que de verdad pasó.
 */
export function AccionesDetalle({
  id,
  etapa,
  situacion,
  zonaHoraria,
}: {
  id: string;
  etapa: EtapaOportunidad;
  situacion: SituacionOportunidad;
  /** Para el "ahora" por defecto de una actividad, en hora del negocio. */
  zonaHoraria: string;
}) {
  if (situacion !== "abierta") {
    return <BotonReabrir id={id} etapa={etapa} />;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DialogoActividad id={id} zonaHoraria={zonaHoraria} />
      {etapa === "finalizado" ? null : <DialogoMarcarPerdida id={id} />}
      <DialogoAnular id={id} />
    </div>
  );
}

// --- Actividad -----------------------------------------------------------------

/**
 * "+ Actividad" (sección 4): tipo, descripción (obligatoria) y fecha y hora,
 * por defecto el momento actual y editable (pudo ocurrir antes). Lo valida
 * `actividadSchema` en el servidor; aquí no se comprueba nada.
 */
function DialogoActividad({
  id,
  zonaHoraria,
}: {
  id: string;
  zonaHoraria: string;
}) {
  return (
    <DialogoAccion
      disparador={(abrir) => (
        <Button variant="outline" onClick={abrir}>
          <PlusIcon aria-hidden />
          Actividad
        </Button>
      )}
      titulo="Nueva actividad"
      descripcion="Queda en la línea de tiempo con tu nombre."
      textoEnviar="Guardar"
      exito="Actividad registrada."
      accion={(formData) => agregarActividad(id, formData)}
      campos={({ errores }) => (
        <CamposActividad zonaHoraria={zonaHoraria} errores={errores} />
      )}
    />
  );
}

function CamposActividad({
  zonaHoraria,
  errores,
}: {
  zonaHoraria: string;
  errores: Record<string, string[] | undefined>;
}) {
  // "Ahora" se calcula AL ABRIR el diálogo (estos campos solo se montan con
  // él abierto), no al cargar la página: si el usuario lo abre media hora
  // después, el valor por defecto sigue siendo el momento actual. En la zona
  // del negocio, que es como el servidor lee lo que se escribe aquí
  // (`instanteDeFechaHoraLocal`), no en la del equipo del usuario. Con `Intl`
  // nativo: no hace falta arrastrar dayjs al navegador para un valor inicial.
  const [ahora] = useState(() => ahoraLocal(zonaHoraria));

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo</Label>
        {/* Sin valor por defecto: el tipo lo elige siempre el usuario. */}
        <Select
          name="tipo"
          items={TIPOS_ACTIVIDAD.map((tipo) => ({
            value: tipo,
            label: ETIQUETAS_TIPO_ACTIVIDAD[tipo],
          }))}
        >
          <SelectTrigger
            id="tipo"
            className="w-full"
            aria-invalid={Boolean(errores.tipo)}
          >
            <SelectValue placeholder="Elige el tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_ACTIVIDAD.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>
                {ETIQUETAS_TIPO_ACTIVIDAD[tipo]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MensajeError errores={errores.tipo} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          name="descripcion"
          rows={4}
          required
          aria-invalid={Boolean(errores.descripcion)}
        />
        <MensajeError errores={errores.descripcion} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fecha_hora">Fecha y hora</Label>
        <Input
          id="fecha_hora"
          name="fecha_hora"
          type="datetime-local"
          defaultValue={ahora}
          className="sm:max-w-64"
          aria-invalid={Boolean(errores.fecha_hora)}
        />
        <MensajeError errores={errores.fecha_hora} />
      </div>
    </div>
  );
}

/** `YYYY-MM-DDTHH:mm` del momento actual en `zona`, para `datetime-local`. */
function ahoraLocal(zona: string): string {
  // `sv-SE` da justo "2026-09-26 14:05".
  const texto = new Intl.DateTimeFormat("sv-SE", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

  return texto.replace(" ", "T");
}

// --- Marcar perdida y anular ---------------------------------------------------

/** "Marcar perdida": motivo OBLIGATORIO (sección 2). */
function DialogoMarcarPerdida({ id }: { id: string }) {
  return (
    <DialogoAccion
      disparador={(abrir) => (
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={abrir}
        >
          <XIcon aria-hidden />
          Marcar perdida
        </Button>
      )}
      titulo="Marcar como perdida"
      descripcion="El negocio no se dio. Cuenta en la tasa de cierre como no ganada. La oportunidad queda en solo lectura hasta que la reabras."
      textoEnviar="Marcar perdida"
      destructiva
      exito="Oportunidad marcada como perdida."
      accion={(formData) =>
        marcarPerdida(id, String(formData.get("motivo") ?? ""))
      }
      campos={() => <CampoMotivo obligatorio />}
    />
  );
}

/** "Anular": motivo OPCIONAL, en cualquier etapa, Finalizado incluida. */
function DialogoAnular({ id }: { id: string }) {
  return (
    <DialogoAccion
      disparador={(abrir) => (
        <Button variant="ghost" onClick={abrir}>
          Anular
        </Button>
      )}
      titulo="Anular oportunidad"
      descripcion="Para una oportunidad creada por error o duplicada. No cuenta en la tasa de cierre. Queda en solo lectura hasta que la reabras."
      textoEnviar="Anular"
      destructiva
      exito="Oportunidad anulada."
      accion={(formData) => anular(id, String(formData.get("motivo") ?? ""))}
      campos={() => <CampoMotivo obligatorio={false} />}
    />
  );
}

function CampoMotivo({ obligatorio }: { obligatorio: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="motivo">
        Motivo
        {obligatorio ? null : (
          <span className="font-normal text-muted-foreground"> (opcional)</span>
        )}
      </Label>
      <Textarea id="motivo" name="motivo" rows={3} required={obligatorio} />
    </div>
  );
}

// --- Reabrir -------------------------------------------------------------------

/**
 * "Reabrir": sin motivo. Se confirma porque cambia lo que se puede hacer con
 * la oportunidad y deja constancia en el historial; vuelve a la etapa en la
 * que estaba (cerrar nunca la tocó).
 */
function BotonReabrir({ id, etapa }: { id: string; etapa: EtapaOportunidad }) {
  const [confirmando, setConfirmando] = useState(false);
  const { ejecutar, pendiente } = useAccionOportunidad();

  return (
    <>
      <Button
        variant="outline"
        disabled={pendiente}
        onClick={() => setConfirmando(true)}
      >
        <RotateCcwIcon aria-hidden />
        Reabrir
      </Button>

      <AlertDialog
        open={confirmando}
        onOpenChange={(abierto) => {
          if (!abierto) setConfirmando(false);
        }}
      >
        {confirmando ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Reabrir la oportunidad?</AlertDialogTitle>
              <AlertDialogDescription>
                Vuelve a {ETIQUETAS_ETAPA[etapa]}, la etapa en la que estaba,
                con todas sus acciones disponibles. Queda registrado en el
                historial.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmando(false);
                  ejecutar(() => reabrir(id), {
                    exito: "Oportunidad reabierta.",
                  });
                }}
              >
                Reabrir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </>
  );
}
