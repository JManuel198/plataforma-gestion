"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { OrdenTrabajo } from "@/db/schema/orden-trabajo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  estadoFormularioInicial,
  type EstadoFormulario,
} from "../estado-formulario";
import { ESTADOS_OT } from "../constantes";

type Props = {
  /**
   * Server Action que guarda el formulario. Al crear llega ya atada al
   * Servicio de origen con `.bind()`, así que su firma es la misma en los dos
   * casos. El sufijo `Action` es la convención de Next para las acciones que
   * viajan como prop a un Client Component.
   */
  guardarAction: (
    estadoPrevio: EstadoFormulario,
    formData: FormData,
  ) => Promise<EstadoFormulario>;
  /** OT existente cuando se está editando; ausente al crear. */
  orden?: OrdenTrabajo;
  /** A dónde vuelve el botón Cancelar. */
  urlCancelar: string;
};

function MensajeError({ errores }: { errores?: string[] }) {
  if (!errores?.length) return null;

  return (
    <p className="text-sm text-destructive" role="alert">
      {errores[0]}
    </p>
  );
}

/**
 * Solo los campos manuales del documento. `codigo_ot`, `fecha_creacion` y
 * `servicio_id` no aparecen ni como campo oculto: los pone el servidor.
 *
 * Los campos que se ven repetidos respecto al Servicio (cotización, OC,
 * cliente) se escriben a mano y no se sincronizan — decisión cerrada del
 * alcance v2.
 */
export function FormularioOrdenTrabajo({
  guardarAction,
  orden,
  urlCancelar,
}: Props) {
  const [estado, accion, enviando] = useActionState(
    guardarAction,
    estadoFormularioInicial,
  );
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="max-w-2xl space-y-6">
      {orden ? <input type="hidden" name="id" value={orden.id} /> : null}

      {estado.mensaje ? (
        <p
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {estado.mensaje}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="codigo_cotizacion">Cotización (COT.)</Label>
          <Input
            id="codigo_cotizacion"
            name="codigo_cotizacion"
            defaultValue={orden?.codigo_cotizacion ?? ""}
            required
            aria-invalid={Boolean(errores.codigo_cotizacion)}
          />
          <MensajeError errores={errores.codigo_cotizacion} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="codigo_oc">Orden de compra (OC)</Label>
          <Input
            id="codigo_oc"
            name="codigo_oc"
            defaultValue={orden?.codigo_oc ?? ""}
            placeholder="Opcional — formato libre según el cliente"
            aria-invalid={Boolean(errores.codigo_oc)}
          />
          <MensajeError errores={errores.codigo_oc} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="asunto">Asunto</Label>
          <Textarea
            id="asunto"
            name="asunto"
            defaultValue={orden?.asunto ?? ""}
            required
            rows={3}
            aria-invalid={Boolean(errores.asunto)}
          />
          <MensajeError errores={errores.asunto} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cliente">Cliente</Label>
          <Input
            id="cliente"
            name="cliente"
            defaultValue={orden?.cliente ?? ""}
            required
            aria-invalid={Boolean(errores.cliente)}
          />
          <MensajeError errores={errores.cliente} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsable">Responsable</Label>
          <Input
            id="responsable"
            name="responsable"
            defaultValue={orden?.responsable ?? ""}
            placeholder="Opcional — nombre del técnico a cargo"
            aria-invalid={Boolean(errores.responsable)}
          />
          <MensajeError errores={errores.responsable} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Select
            name="estado"
            defaultValue={orden?.estado ?? "Pendiente"}
            items={ESTADOS_OT.map((estadoOt) => ({
              label: estadoOt,
              value: estadoOt,
            }))}
          >
            <SelectTrigger id="estado" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_OT.map((estadoOt) => (
                <SelectItem key={estadoOt} value={estadoOt}>
                  {estadoOt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MensajeError errores={errores.estado} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : orden ? "Guardar cambios" : "Crear OT"}
        </Button>
        <Button variant="outline" render={<Link href={urlCancelar} />}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
