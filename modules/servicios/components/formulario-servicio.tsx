"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Servicio } from "@/db/schema/servicio";
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
import { ESTADOS_SERVICIO, MONEDAS } from "../constantes";
import { aMontoDecimal } from "../dinero";

type Props = {
  /**
   * Server Action que guarda el formulario — `crearServicio` o
   * `editarServicio`. El sufijo `Action` es la convención de Next para las
   * acciones que viajan como prop a un Client Component.
   */
  guardarAction: (
    estadoPrevio: EstadoFormulario,
    formData: FormData,
  ) => Promise<EstadoFormulario>;
  /** Servicio existente cuando se está editando; ausente al crear. */
  servicio?: Servicio;
};

function MensajeError({ errores }: { errores?: string[] }) {
  if (!errores?.length) return null;

  return (
    <p className="text-sm text-destructive" role="alert">
      {errores[0]}
    </p>
  );
}

export function FormularioServicio({ guardarAction, servicio }: Props) {
  const [estado, accion, enviando] = useActionState(
    guardarAction,
    estadoFormularioInicial,
  );
  const errores = estado.errores ?? {};

  return (
    <form action={accion} className="max-w-2xl space-y-6">
      {servicio ? <input type="hidden" name="id" value={servicio.id} /> : null}

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
            defaultValue={servicio?.codigo_cotizacion ?? ""}
            required
            aria-invalid={Boolean(errores.codigo_cotizacion)}
          />
          <MensajeError errores={errores.codigo_cotizacion} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="codigo_revision">Revisión (REV.)</Label>
          <Input
            id="codigo_revision"
            name="codigo_revision"
            defaultValue={servicio?.codigo_revision ?? ""}
            required
            aria-invalid={Boolean(errores.codigo_revision)}
          />
          <MensajeError errores={errores.codigo_revision} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="codigo_oc">Orden de compra (OC)</Label>
          <Input
            id="codigo_oc"
            name="codigo_oc"
            defaultValue={servicio?.codigo_oc ?? ""}
            placeholder="Opcional — formato libre según el cliente"
            aria-invalid={Boolean(errores.codigo_oc)}
          />
          <MensajeError errores={errores.codigo_oc} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="servicio">Servicio</Label>
          <Textarea
            id="servicio"
            name="servicio"
            defaultValue={servicio?.servicio ?? ""}
            required
            rows={3}
            aria-invalid={Boolean(errores.servicio)}
          />
          <MensajeError errores={errores.servicio} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cliente">Cliente</Label>
          <Input
            id="cliente"
            name="cliente"
            defaultValue={servicio?.cliente ?? ""}
            required
            aria-invalid={Boolean(errores.cliente)}
          />
          <MensajeError errores={errores.cliente} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="precio">Precio</Label>
          <Input
            id="precio"
            name="precio"
            // El usuario escribe un monto normal (150.50); el servidor lo
            // convierte a céntimos antes de guardarlo.
            inputMode="decimal"
            placeholder="150.50"
            defaultValue={servicio ? aMontoDecimal(servicio.precio) : ""}
            required
            aria-invalid={Boolean(errores.precio)}
          />
          <MensajeError errores={errores.precio} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="moneda">Moneda</Label>
          <Select
            name="moneda"
            defaultValue={servicio?.moneda ?? "PEN"}
            items={MONEDAS.map((moneda) => ({
              label: moneda,
              value: moneda,
            }))}
          >
            <SelectTrigger id="moneda" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONEDAS.map((moneda) => (
                <SelectItem key={moneda} value={moneda}>
                  {moneda}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MensajeError errores={errores.moneda} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="estado">Estado</Label>
          <Select
            name="estado"
            defaultValue={servicio?.estado ?? "Activado"}
            items={ESTADOS_SERVICIO.map((estadoServicio) => ({
              label: estadoServicio,
              value: estadoServicio,
            }))}
          >
            <SelectTrigger id="estado" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_SERVICIO.map((estadoServicio) => (
                <SelectItem key={estadoServicio} value={estadoServicio}>
                  {estadoServicio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MensajeError errores={errores.estado} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="comentarios">Comentarios</Label>
          <Textarea
            id="comentarios"
            name="comentarios"
            defaultValue={servicio?.comentarios ?? ""}
            rows={3}
            aria-invalid={Boolean(errores.comentarios)}
          />
          <MensajeError errores={errores.comentarios} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : servicio ? "Guardar cambios" : "Crear servicio"}
        </Button>
        <Button variant="outline" render={<Link href="/servicios" />}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
