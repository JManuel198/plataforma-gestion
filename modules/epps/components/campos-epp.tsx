"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampoListaSugerida } from "@/core/components/campo-lista-sugerida";
import { aMontoDecimal } from "@/core/dinero";
import { MONEDAS, type Moneda } from "@/core/monedas";
import { UNIDADES } from "@/core/unidades";
import type { FilaEpp } from "../queries";

type Props = {
  /** Errores por campo que devolvió el servidor, ya aplanados con Zod. */
  errores: Record<string, string[] | undefined>;
  /** EPP existente: se está editando. */
  epp?: FilaEpp;
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
 * Los campos de un EPP, sin `<form>` ni botones alrededor.
 *
 * Vive aparte del modal por el mismo motivo que `CamposMaterial`,
 * `CamposListaPrecio` y `CamposServicio`: lo que cambia entre un envoltorio y
 * otro es cómo se envía y a dónde se va después, nunca los campos.
 *
 * ── `unidad` ES LA LISTA FÍSICA, NO LA DE PERIODOS ──────────────────────────
 *
 * `UNIDADES` (core/unidades.ts: m, und, pzs, cja, kg, lt, gal), la misma que
 * Materiales, Lista de precios y Servicios. **NO es `PERIODOS_TARIFARIO`**
 * (core/periodos.ts: hora, día, mes, año), que es lo que usa el Tarifario de
 * personal en su campo del mismo nombre. Un EPP se cuenta en unidades o pares;
 * no se cobra por periodo. Las dos columnas se llaman `unidad` y las dos son
 * `text`, así que nada en el tipo avisaría de la confusión — por eso queda
 * dicho aquí y en `unidadSchema` (../schema.ts).
 *
 * Y es TEXTO LIBRE con sugerencias, no un `Select`: lo que no esté en
 * `UNIDADES` se guarda igual. Decisión 12 de "Catálogos maestros" en
 * docs/spec/preguntas-abiertas.md, cerrada el 2026-09-22 — esa lista nunca se
 * confirmó como exhaustiva, y cerrarla dejaría al usuario sin poder registrar
 * una unidad real.
 *
 * ── LO QUE NO SE PIDE AQUÍ ──────────────────────────────────────────────────
 *
 * - `codigo` se enseña pero no se escribe: lo genera el correlativo del
 *   servidor. Ver el comentario de su campo.
 * - `activo` no está porque NO EXISTE como columna en esta tabla, igual que en
 *   Servicios. No hay nada que marcar ni que dar de baja.
 */
export function CamposEpp({ epp, errores }: Props) {
  // Las columnas de negocio admiten NULL en la base (mismo criterio que el
  // resto de catálogos), así que ninguna se interpola a pelo.
  const precioInicial = epp?.precio != null ? aMontoDecimal(epp.precio) : "";
  const monedaInicial: Moneda = epp?.moneda ?? "PEN";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="codigo">Código</Label>
        {/* NUNCA EDITABLE, ni al crear ni al editar: lo emite el correlativo
            global del servidor (`EPP.000001`, ver ../codigo.ts). Se enseña
            igualmente porque quien llena la ficha espera ver el código, pero no
            es una decisión suya.

            `disabled` y sin `name`, en los dos modos: así no viaja en el envío.
            Que no viaje es la segunda mitad de la garantía — la primera es que
            `eppCrearSchema` ni siquiera lo declara, de modo que un POST directo
            que lo incluyera tampoco conseguiría imponerlo.

            Al crear no hay número que enseñar todavía: el correlativo se
            reserva dentro de la transacción del INSERT, así que cualquier valor
            que se pintara aquí antes de guardar sería una adivinanza que otra
            alta simultánea dejaría falsa. Mismo criterio, y mismo marcador de
            posición, que en los otros cuatro catálogos. */}
        <Input
          id="codigo"
          value={epp?.codigo ?? ""}
          placeholder="Se genera automáticamente al guardar"
          disabled
          readOnly
        />
      </div>

      <div className="space-y-2">
        {/* TEXTO LIBRE con sugerencias — ver la cabecera de este archivo, y ojo
            con que la lista es la FÍSICA (`core/unidades.ts`) y no la de
            periodos del Tarifario. */}
        <CampoListaSugerida
          id="unidad"
          name="unidad"
          etiqueta="Unidad"
          placeholder="ej. und"
          opciones={UNIDADES}
          valorInicial={epp?.unidad ?? ""}
          requerido
          invalido={Boolean(errores.unidad)}
        />
        <MensajeError errores={errores.unidad} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Input
          id="descripcion"
          name="descripcion"
          defaultValue={epp?.descripcion ?? ""}
          placeholder="Ingresa la descripción del equipo de protección"
          required
          aria-invalid={Boolean(errores.descripcion)}
        />
        <MensajeError errores={errores.descripcion} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="precio">Precio</Label>
        {/* ES UN CAMPO DIRECTO, igual que en Servicios y a diferencia de Lista
            de precios: allí el precio no se escribe porque se deriva de
            `precio_lista` y `descuento`, y el modal lo enseña como un `<output>`
            de solo lectura sin `name`. Aquí es el precio del equipo — un solo
            número que alguien fija—, así que es una columna de verdad y sí
            viaja en el FormData.

            El usuario escribe un monto normal (150.50); el servidor lo convierte
            a céntimos antes de guardarlo (regla invariable 2). */}
        <Input
          id="precio"
          name="precio"
          inputMode="decimal"
          defaultValue={precioInicial}
          placeholder="ej. 150.50"
          required
          aria-invalid={Boolean(errores.precio)}
        />
        <MensajeError errores={errores.precio} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="moneda">Moneda</Label>
        {/* Nunca un monto sin su moneda. Mismo enum compartido que OT, Lista de
            precios, Servicios y Tarifario (core/monedas.ts). Arranca en PEN al
            crear: es la moneda del negocio, y dejarlo sin elegir obligaría a un
            paso más en el caso normal. */}
        <Select
          name="moneda"
          defaultValue={monedaInicial}
          items={MONEDAS.map((unaMoneda) => ({
            label: unaMoneda,
            value: unaMoneda,
          }))}
        >
          <SelectTrigger
            id="moneda"
            className="w-full"
            aria-invalid={Boolean(errores.moneda)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONEDAS.map((unaMoneda) => (
              <SelectItem key={unaMoneda} value={unaMoneda}>
                {unaMoneda}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MensajeError errores={errores.moneda} />
      </div>
    </div>
  );
}
