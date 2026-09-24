"use client";

import { LockIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampoConSugerencias } from "@/core/components/campo-con-sugerencias";
import { CampoListaSugerida } from "@/core/components/campo-lista-sugerida";
import { aMontoDecimal } from "@/core/dinero";
import { MONEDAS, type Moneda } from "@/core/monedas";
import { PERIODOS_TARIFARIO } from "@/core/periodos";
import { buscarCargosAction } from "../actions";
import type { FilaTarifa } from "../queries";
import { MensajeError } from "@/core/components/mensaje-error";

type Props = {
  /** Errores por campo que devolvió el servidor, ya aplanados con Zod. */
  errores: Record<string, string[] | undefined>;
  /** Tarifa existente: se está editando. */
  tarifa?: FilaTarifa;
};

/**
 * Los campos de una tarifa, sin `<form>` ni botones alrededor.
 *
 * Vive aparte del modal por el mismo motivo que `CamposServicio`,
 * `CamposMaterial` y `CamposListaPrecio`: lo que cambia entre un envoltorio y
 * otro es cómo se envía y a dónde se va después, nunca los campos.
 *
 * ── DOS CAMPOS CON SUGERENCIAS, Y CADA UNO USA UN COMPONENTE DISTINTO ───────
 *
 * `cargo` y `unidad` están uno al lado del otro, los dos son texto libre y los
 * dos ofrecen una lista debajo mientras se escribe. Aun así NO son el mismo
 * componente, y confundirlos rompe uno de los dos. **Lo que decide cuál va no
 * es el aspecto, es de dónde salen las sugerencias** (la regla está en la
 * cabecera de `core/components/campo-lista-sugerida.tsx`):
 *
 * - **Cargo es `CampoConSugerencias`**: las sugerencias salen del SERVIDOR, de
 *   un `SELECT DISTINCT` sobre los cargos ya escritos en este mismo tarifario
 *   (`buscarCargos` en ../queries.ts). Cambian solas, con cada alta que hace un
 *   usuario. Es exactamente el caso de `proveedor` en Lista de precios: no hay
 *   tabla de cargos, así que el "catálogo" es lo que uno mismo ha ido
 *   escribiendo. **Con el tarifario vacío no sugiere nada, y tiene que ser
 *   así**: la primera tarifa del sistema se escribe a pelo.
 * - **Unidad es `CampoListaSugerida`**: las sugerencias salen del CÓDIGO, de
 *   `PERIODOS_TARIFARIO` (core/periodos.ts). Son cuatro cadenas ya presentes en
 *   el bundle; filtrarlas es un `.filter()` síncrono, sin red, sin pausa de
 *   tecleo y sin nada que pueda fallar. Con el campo vacío ofrece la lista
 *   entera, que es justo lo contrario de lo que hace su vecino.
 *
 * Montar Cargo sobre `CampoListaSugerida` exigiría una lista fija de cargos que
 * nadie ha escrito; montar Unidad sobre `CampoConSugerencias` obligaría a
 * envolver un array de cuatro elementos en una Server Action y esperar 300 ms
 * para enseñar algo que ya está en memoria.
 *
 * ── "UNIDAD" AQUÍ NO ES LA "UNIDAD" DE LOS OTROS CATÁLOGOS ──────────────────
 *
 * El campo se llama igual que en Materiales, Lista de precios y Servicios, y la
 * columna también, pero la lista es OTRA: allí son unidades físicas (m, und,
 * kg…), aquí son periodos de tiempo (hora, día, mes, año). Por eso el import es
 * `@/core/periodos` y no `@/core/unidades` — dos archivos separados a propósito
 * para que este error no se cometa por descuido. Ver la cabecera de
 * `core/periodos.ts`.
 *
 * ── LO QUE NO SE PIDE AQUÍ ──────────────────────────────────────────────────
 *
 * - `codigo` se enseña pero no se escribe: lo genera el correlativo del
 *   servidor. Ver el comentario de su campo.
 * - `activo` no está aunque la columna SÍ exista (a diferencia de Servicios):
 *   dar de baja es una acción propia y confirmada desde el listado, nunca una
 *   casilla dentro del formulario. Mismo reparto que en Materiales y Lista de
 *   precios. Esa acción llega en la Parte 2.
 */
export function CamposTarifa({ tarifa, errores }: Props) {
  // Las columnas de negocio admiten NULL en la base (mismo criterio que los
  // otros tres catálogos), así que ninguna se interpola a pelo.
  const costoInicial = tarifa?.costo != null ? aMontoDecimal(tarifa.costo) : "";
  const monedaInicial: Moneda = tarifa?.moneda ?? "PEN";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Solo en el alta. Al editar, el código ya existe y va en la cabecera
          del modal como etiqueta, igual que en Lista de precios: repetirlo
          aquí en un campo gris no aporta nada. */}
      {tarifa ? null : (
        <div className="space-y-2">
          <Label htmlFor="codigo">Código</Label>
          {/* NUNCA EDITABLE, ni al crear ni al editar: lo emite el correlativo
              global del servidor (`PRS.0001`, ver ../codigo.ts). Se enseña
              igualmente porque quien llena la ficha espera ver el código, pero no
              es una decisión suya.
  
              `disabled` y sin `name`: así no viaja en el envío.
              Que no viaje es la segunda mitad de la garantía — la primera es que
              `tarifaCrearSchema` ni siquiera lo declara, de modo que un POST
              directo que lo incluyera tampoco conseguiría imponerlo.
  
              Al crear no hay número que enseñar todavía: el correlativo se
              reserva dentro de la transacción del INSERT, así que cualquier valor
              que se pintara aquí antes de guardar sería una adivinanza que otra
              alta simultánea dejaría falsa. Mismo criterio, y mismo marcador de
              posición, que en los otros tres catálogos. */}
          <div className="relative">
            <LockIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="codigo"
              value=""
              placeholder="Se genera automáticamente al guardar"
              className="pl-8 placeholder:italic"
              disabled
              readOnly
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {/* SUGERENCIAS DEL SERVIDOR — ver la cabecera de este archivo. No hay
            tabla de cargos: lo que se ofrece son los cargos ya escritos en este
            mismo tarifario, así que la lista empieza vacía y crece con el uso.
            Lo que el usuario escriba se guarda tal cual, esté o no sugerido.

            NO se cruza con `personal.cargo`: el cliente descartó explícitamente
            (2026-09-23) cualquier relación entre Personal y este tarifario. Los
            dos campos se llaman igual y son independientes a propósito. */}
        <CampoConSugerencias
          id="cargo"
          name="cargo"
          etiqueta="Cargo"
          placeholder="ej. Operario"
          buscarAction={buscarCargosAction}
          valorInicial={tarifa?.cargo ?? ""}
          requerido
          invalido={Boolean(errores.cargo)}
          ayuda="Escribe el cargo. Si ya lo usaste en otra tarifa, aparecerá debajo."
        />
        <MensajeError errores={errores.cargo} />
      </div>

      <div className="space-y-2">
        {/* SUGERENCIAS DEL CÓDIGO, y son PERIODOS DE TIEMPO, no unidades
            físicas: `PERIODOS_TARIFARIO` de core/periodos.ts, nunca `UNIDADES`
            de core/unidades.ts. Texto libre igual que en los otros catálogos —
            los cuatro periodos no se han confirmado como exhaustivos (¿por
            turno?, ¿por jornada?, ¿por semana?) y un `Select` convertiría un
            borrador en una prohibición. Ver ../schema.ts, `unidadSchema`. */}
        <CampoListaSugerida
          id="unidad"
          name="unidad"
          etiqueta="Unidad"
          placeholder="ej. día"
          opciones={PERIODOS_TARIFARIO}
          valorInicial={tarifa?.unidad ?? ""}
          requerido
          invalido={Boolean(errores.unidad)}
          ayuda="El periodo al que corresponde el costo. Elige uno o escribe el tuyo."
        />
        <MensajeError errores={errores.unidad} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="costo">Costo</Label>
        {/* ES UN CAMPO DIRECTO, igual que el precio de Servicios y al revés que
            Lista de precios, donde el precio no se escribe porque se deriva de
            `precio_lista` y `descuento`. Aquí es el costo que alguien fija para
            ese cargo en ese periodo, así que es una columna de verdad y sí
            viaja en el FormData.

            El usuario escribe un monto normal (150.50); el servidor lo convierte
            a céntimos antes de guardarlo (regla invariable 2).

            OJO AL LEERLO: este número no significa nada sin la Unidad de al
            lado. 500.00 por hora y 500.00 por mes son la misma columna y no son
            comparables — por eso la tabla y la vista los enseñan siempre
            juntos. */}
        <Input
          id="costo"
          name="costo"
          inputMode="decimal"
          defaultValue={costoInicial}
          placeholder="ej. 150.50"
          required
          aria-invalid={Boolean(errores.costo)}
        />
        <MensajeError errores={errores.costo} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="moneda">Moneda</Label>
        {/* Nunca un monto sin su moneda. Mismo enum compartido que OT, Lista de
            precios y Servicios (core/monedas.ts). Arranca en PEN al crear: es
            la moneda del negocio, y dejarlo sin elegir obligaría a un paso más
            en el caso normal. */}
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
