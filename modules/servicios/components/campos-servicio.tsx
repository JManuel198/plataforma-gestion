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
import {
  CATEGORIAS_SERVICIO,
  type CategoriaServicio,
} from "../constantes";
import type { FilaServicio } from "../queries";

type Props = {
  /** Errores por campo que devolvió el servidor, ya aplanados con Zod. */
  errores: Record<string, string[] | undefined>;
  /** Servicio existente: se está editando. */
  servicio?: FilaServicio;
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
 * Los campos de un servicio, sin `<form>` ni botones alrededor.
 *
 * Vive aparte del modal por el mismo motivo que `CamposMaterial` y
 * `CamposListaPrecio`: lo que cambia entre un envoltorio y otro es cómo se
 * envía y a dónde se va después, nunca los campos.
 *
 * ── DOS CAMPOS QUE SE PARECEN Y NO SE COMPORTAN IGUAL ───────────────────────
 *
 * `categoria` y `unidad` están uno al lado del otro y los dos ofrecen una lista,
 * pero NO son el mismo tipo de campo, y mezclarlos sería un error:
 *
 * - **Categoría es un `Select`**: lista CERRADA. Lo que no esté en
 *   `CATEGORIAS_SERVICIO` no se puede elegir aquí ni guardar allá — el
 *   `categoriaSchema` de ../schema.ts lo rechaza, que es la comprobación que
 *   vale (regla 1 de AGENTS.md).
 * - **Unidad es `CampoListaSugerida`**: texto libre con sugerencias. Lo que no
 *   esté en `UNIDADES` se guarda igual. Es el mismo componente y el mismo trato
 *   que en Materiales y Lista de precios, por la decisión 12 de "Catálogos
 *   maestros" en docs/spec/preguntas-abiertas.md.
 *
 * La asimetría no es descuido: las cinco categorías se propusieron como la
 * lista del negocio, mientras que `UNIDADES` nunca se confirmó como exhaustiva
 * y cerrarla dejaría al usuario sin poder registrar una unidad real. Las dos
 * cosas están sin confirmar del todo, pero solo una bloquea el trabajo si se
 * equivoca por el lado estricto.
 *
 * ── LO QUE NO SE PIDE AQUÍ ──────────────────────────────────────────────────
 *
 * - `codigo` se enseña pero no se escribe: lo genera el correlativo del
 *   servidor. Ver el comentario de su campo.
 * - `activo` no está porque NO EXISTE como columna en esta tabla, a diferencia
 *   de los otros dos catálogos. No hay nada que marcar ni que dar de baja.
 */
export function CamposServicio({ servicio, errores }: Props) {
  // Las columnas de negocio admiten NULL en la base (mismo criterio que
  // Materiales y Lista de precios), así que ninguna se interpola a pelo.
  const precioInicial =
    servicio?.precio != null ? aMontoDecimal(servicio.precio) : "";
  const monedaInicial: Moneda = servicio?.moneda ?? "PEN";
  // Sin `?? "alquiler"`: un servicio que no tenga categoría debe verse como un
  // desplegable SIN elegir (su `placeholder`), no como uno que ya trae la
  // primera opción puesta. Lo segundo haría que guardar sin tocar el campo
  // escribiera un valor que nadie eligió.
  const categoriaInicial = (servicio?.categoria ?? undefined) as
    | CategoriaServicio
    | undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="codigo">Código</Label>
        {/* NUNCA EDITABLE, ni al crear ni al editar: lo emite el correlativo
            global del servidor (`SRV.0000001`, ver ../codigo.ts). Se enseña
            igualmente porque quien llena la ficha espera ver el código, pero no
            es una decisión suya.

            `disabled` y sin `name`, en los dos modos: así no viaja en el envío.
            Que no viaje es la segunda mitad de la garantía — la primera es que
            `servicioCrearSchema` ni siquiera lo declara, de modo que un POST
            directo que lo incluyera tampoco conseguiría imponerlo.

            Al crear no hay número que enseñar todavía: el correlativo se
            reserva dentro de la transacción del INSERT, así que cualquier valor
            que se pintara aquí antes de guardar sería una adivinanza que otra
            alta simultánea dejaría falsa. Mismo criterio, y mismo marcador de
            posición, que `codigo_interno` en Materiales y `codigo_oferta` en
            Lista de precios. */}
        <Input
          id="codigo"
          value={servicio?.codigo ?? ""}
          placeholder="Se genera automáticamente al guardar"
          disabled
          readOnly
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria">Categoría</Label>
        {/* LISTA CERRADA — ver la cabecera de este archivo. `capitalize` es solo
            presentación: lo que se guarda es el valor en minúscula de
            `CATEGORIAS_SERVICIO`, que es el que valida el Zod. Pintar aquí una
            etiqueta distinta del valor crearía dos vocabularios para lo mismo;
            una clase de Tailwind no. */}
        <Select
          name="categoria"
          defaultValue={categoriaInicial}
          items={CATEGORIAS_SERVICIO.map((categoria) => ({
            label: categoria,
            value: categoria,
          }))}
        >
          <SelectTrigger
            id="categoria"
            className="w-full capitalize"
            aria-invalid={Boolean(errores.categoria)}
          >
            <SelectValue placeholder="Elige una categoría" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS_SERVICIO.map((categoria) => (
              <SelectItem
                key={categoria}
                value={categoria}
                className="capitalize"
              >
                {categoria}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MensajeError errores={errores.categoria} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="servicio">Servicio</Label>
        <Input
          id="servicio"
          name="servicio"
          defaultValue={servicio?.servicio ?? ""}
          placeholder="Ingresa el nombre o la descripción del servicio"
          required
          aria-invalid={Boolean(errores.servicio)}
        />
        <MensajeError errores={errores.servicio} />
      </div>

      <div className="space-y-2">
        {/* TEXTO LIBRE con sugerencias, el mismo componente y el mismo trato que
            en Materiales y Lista de precios. Deliberadamente NO es un `Select`
            como el de Categoría, aunque `UNIDADES` también sea una lista fija:
            nadie confirmó que esos valores sean todas las unidades que el
            negocio usa, y un Select convertiría un borrador en una prohibición.
            Ver core/unidades.ts y la cabecera de este archivo. */}
        <CampoListaSugerida
          id="unidad"
          name="unidad"
          etiqueta="Unidad"
          placeholder="ej. und"
          opciones={UNIDADES}
          valorInicial={servicio?.unidad ?? ""}
          requerido
          invalido={Boolean(errores.unidad)}
        />
        <MensajeError errores={errores.unidad} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="precio">Precio</Label>
        {/* ES UN CAMPO DIRECTO, y esa es la diferencia de fondo con Lista de
            precios: allí el precio no se escribe porque se deriva de
            `precio_lista` y `descuento`, y el modal lo enseña como un `<output>`
            de solo lectura sin `name`. Aquí es el precio de tarifa del
            servicio — un solo número que alguien fija—, así que es una columna
            de verdad y sí viaja en el FormData.

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
        {/* Nunca un monto sin su moneda. Mismo enum compartido que OT y Lista de
            precios (core/monedas.ts). Arranca en PEN al crear: es la moneda del
            negocio, y dejarlo sin elegir obligaría a un paso más en el caso
            normal. A diferencia de Categoría, aquí sí hay un valor por defecto
            defendible — no es una clasificación que alguien tenga que decidir. */}
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
