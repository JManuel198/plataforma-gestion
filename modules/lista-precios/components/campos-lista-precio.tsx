"use client";

import { useState } from "react";
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
import { BuscadorSeleccion } from "@/core/components/buscador-seleccion";
import { CampoConSugerencias } from "@/core/components/campo-con-sugerencias";
import { CampoListaSugerida } from "@/core/components/campo-lista-sugerida";
import { MensajeError } from "@/core/components/mensaje-error";
import {
  aCentimos,
  aMontoDecimal,
  formatearMonto,
  simboloMoneda,
} from "@/core/dinero";
import { MONEDAS, type Moneda } from "@/core/monedas";
import { UNIDADES } from "@/core/unidades";
import { buscarProveedoresAction } from "../actions";
import { calcularPrecioDesdeTexto, formulaPrecio } from "../precio";
import type { MaterialElegible, PrecioEditable } from "../tipos";
import { PanelPrecio } from "./panel-precio";

type Props = {
  /** Errores por campo que devolvió el servidor, ya aplanados con Zod. */
  errores: Record<string, string[] | undefined>;
  /** Oferta existente: se está editando. */
  precio?: PrecioEditable;
  /**
   * Server Action que busca materiales. Llega como prop desde la página, que es
   * quien conoce a los dos módulos — ver el comentario de `MaterialElegible` en
   * ../tipos.ts.
   */
  buscarMaterialAction: (texto: string) => Promise<MaterialElegible[]>;
  /**
   * Avisa cuando se elige o se quita el material. Lo usa el modal para cambiar
   * la descripción de la cabecera según el paso del alta ("busca el
   * material" / "completa los datos") y para habilitar «Registrar».
   */
  alCambiarMaterial?: (elegido: boolean) => void;
};

/** Junta marca y modelo para la línea de contexto de cada resultado. */
function contextoDe(material: MaterialElegible): string {
  return [material.codigo_interno, material.marca, material.modelo]
    .filter((parte) => parte && parte.trim() !== "")
    .join(" · ");
}

/**
 * Los campos de una oferta, sin `<form>` ni botones alrededor.
 *
 * ── EL FORMULARIO TIENE DOS FASES, Y ESE ES SU RASGO PRINCIPAL ──────────────
 *
 * Antes de elegir un material solo se ven el código de oferta (deshabilitado) y
 * el buscador. El resto de los campos no aparece. No es decoración: una oferta
 * es un precio PARA algo, así que pedir cantidad y moneda antes de saber de qué
 * material hablamos invita a llenar medio formulario y descubrir al final que el
 * material no está en el catálogo. Elegir primero convierte ese callejón en una
 * decisión de la primera pantalla.
 *
 * El buscador NO es el filtro de un listado: selecciona un registro y no toca la
 * URL. La diferencia, con el porqué, está en el comentario de
 * `BuscadorSeleccion` (core/components/).
 *
 * ── EL PRECIO CALCULADO NO ES UN CAMPO ──────────────────────────────────────
 *
 * `precio_lista × (1 − descuento/100)` se muestra en vivo, de solo lectura, y
 * **no se envía**: no lleva `name`, así que no entra en el `FormData`. Tampoco
 * hay columna donde guardarlo. La cuenta es la MISMA función que usa el listado
 * en el servidor (`calcularPrecioDesdeTexto` envuelve a `calcularPrecio`), no
 * una segunda implementación — que es lo que la regla invariable 1 de AGENTS.md
 * realmente protege. El razonamiento completo está en ../precio.ts.
 *
 * ── POR QUÉ HAY ESTADO LOCAL AQUÍ, SI LA CONVENCIÓN ES NO TENERLO ───────────
 *
 * Los campos siguen siendo NO CONTROLADOS (`defaultValue`, sin `value`), como
 * en el resto del proyecto. Lo que hacen los `onChange` es copiar el texto a un
 * estado que solo alimenta la vista previa del precio; el valor que se envía
 * sigue saliendo del DOM. Sin esa copia no habría forma de recalcular mientras
 * se teclea.
 */
export function CamposListaPrecio({
  precio,
  errores,
  buscarMaterialAction,
  alCambiarMaterial,
}: Props) {
  // Al editar, el material ya está elegido. La fila del listado no trae marca ni
  // modelo —la consulta no los selecciona, nadie los pinta en la tabla— así que
  // llegan en `null`: `contextoDe` simplemente los omite.
  const [material, setMaterial] = useState<MaterialElegible | null>(
    precio
      ? {
          id: precio.material_id,
          codigo_interno: precio.material_codigo_interno,
          descripcion: precio.material_descripcion,
          marca: null,
          modelo: null,
        }
      : null,
  );

  const precioListaInicial =
    precio?.precio_lista != null ? aMontoDecimal(precio.precio_lista) : "";
  const descuentoInicial = precio?.descuento ?? "0";
  const monedaInicial: Moneda = precio?.moneda ?? "PEN";

  const [precioListaTexto, setPrecioListaTexto] = useState(precioListaInicial);
  const [descuentoTexto, setDescuentoTexto] = useState(descuentoInicial);
  const [moneda, setMoneda] = useState<Moneda>(monedaInicial);

  const precioCalculado = calcularPrecioDesdeTexto(
    precioListaTexto,
    descuentoTexto,
  );

  function elegirMaterial(elegido: MaterialElegible | null) {
    setMaterial(elegido);
    alCambiarMaterial?.(elegido !== null);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Solo en el alta. Al editar, el código ya existe y va en la cabecera
          del modal, como en el mockup: repetirlo aquí en un campo gris no
          aporta nada. */}
      {precio ? null : (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="codigo_oferta">Código de oferta</Label>
          {/* Deshabilitado y SIN `name`: lo genera el correlativo atómico del
              servidor al guardar (ver ../codigo.ts). No hay número que enseñar
              hasta entonces, y que viajara en el FormData permitiría fijarlo con
              un POST directo saltándose el contador. Mismo patrón que el
              `codigo_ot` en el formulario de Órdenes de Trabajo. */}
          <div className="relative">
            <LockIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="codigo_oferta"
              value=""
              placeholder="Se genera automáticamente al guardar"
              className="pl-8 placeholder:italic"
              disabled
              readOnly
            />
          </div>
        </div>
      )}

      <div className="sm:col-span-2">
        <BuscadorSeleccion
          id="material"
          name="material_id"
          etiqueta="Material"
          placeholder="Código, descripción, marca o modelo"
          buscarAction={buscarMaterialAction}
          claveDe={(encontrado) => encontrado.id}
          // La descripción SIEMPRE visible: es lo que identifica un material
          // para quien lo busca. El fallback cubre que la columna admite NULL.
          principalDe={(encontrado) =>
            encontrado.descripcion?.trim() || "Sin descripción"
          }
          secundarioDe={contextoDe}
          seleccionado={material}
          onSeleccionar={elegirMaterial}
          invalido={Boolean(errores.material_id)}
        />
        <MensajeError errores={errores.material_id} />
        {material ? null : (
          <p className="mt-2 text-xs text-muted-foreground">
            Al elegir un material se mostrarán los demás campos de la oferta.
          </p>
        )}
      </div>

      {/* Todo lo demás depende de haber elegido un material. Se desmonta en vez
          de deshabilitarse: un formulario lleno de campos grises se lee como
          "está roto", mientras que uno corto se lee como "faltas tú". */}
      {material ? (
        <>
          <div className="space-y-2 sm:col-span-2">
            {/* SIGUE SIENDO TEXTO LIBRE, con sugerencias encima. No es un
                `BuscadorSeleccion` como el material de arriba, y la diferencia
                es de fondo: no hay tabla de proveedores, así que no existe un
                registro que elegir — el "catálogo" es lo ya escrito en otras
                ofertas (`selectDistinct` en ../queries.ts). Con un selector
                estricto, la primera oferta del sistema no se podría guardar:
                no habría nada que sugerir. Ver `CampoConSugerencias` en
                core/components/ para la tabla comparativa completa.

                La acción se importa directa y no llega como prop, al revés que
                `buscarMaterialAction`: ese rodeo existe solo porque el material
                es de OTRO módulo (AGENTS.md, Arquitectura). El proveedor sale
                de `lista_precios`, que es de este. */}
            <CampoConSugerencias
              id="proveedor"
              name="proveedor"
              etiqueta="Proveedor"
              placeholder="Quién ofrece este precio"
              valorInicial={precio?.proveedor ?? ""}
              buscarAction={buscarProveedoresAction}
              requerido
              invalido={Boolean(errores.proveedor)}
            />
            <MensajeError errores={errores.proveedor} />
          </div>

          <div className="space-y-2">
            {/* TEXTO LIBRE con sugerencias, ya NO un `Select`. `UNIDADES`
                (core/unidades.ts) dejó de ser la lista cerrada de este campo:
                nadie la confirmó como exhaustiva, así que ahora solo sugiere y
                se puede guardar una unidad que no esté en ella. El Zod de
                ../schema.ts se aflojó en el mismo cambio — si solo se cambiara
                esto, el servidor seguiría rechazando lo que el campo permite
                escribir.

                Es `CampoListaSugerida` y no `CampoConSugerencias` (el de
                Proveedor, aquí al lado) porque la lista vive en el código y no
                en la base: no hay consulta, ni pausa de tecleo, ni fallo de red
                que enseñar. La tabla comparativa completa está en la cabecera
                del componente. */}
            <CampoListaSugerida
              id="unidad"
              name="unidad"
              etiqueta="Unidad"
              placeholder="ej. und"
              opciones={UNIDADES}
              valorInicial={precio?.unidad ?? ""}
              requerido
              invalido={Boolean(errores.unidad)}
            />
            <MensajeError errores={errores.unidad} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantidad">Cantidad</Label>
            <Input
              id="cantidad"
              name="cantidad"
              inputMode="decimal"
              defaultValue={precio?.cantidad ?? ""}
              placeholder="ej. 2.5"
              required
              aria-invalid={Boolean(errores.cantidad)}
            />
            <MensajeError errores={errores.cantidad} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio_lista">Precio de lista</Label>
            {/* La moneda va pegada al importe y no en fila propia, como en el
                mockup: se leen juntas ("S/ 186.00 · PEN"). El símbolo del
                prefijo sigue a la moneda elegida. */}
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground"
                >
                  {simboloMoneda(moneda)}
                </span>
                <Input
                  id="precio_lista"
                  name="precio_lista"
                  // El usuario escribe un monto normal (150.50); el servidor lo
                  // convierte a céntimos antes de guardarlo (regla 2).
                  inputMode="decimal"
                  defaultValue={precioListaInicial}
                  placeholder="150.50"
                  required
                  // El prefijo es más ancho con "USD" que con "S/".
                  className={
                    simboloMoneda(moneda).length > 2
                      ? "pl-12 font-mono"
                      : "pl-8 font-mono"
                  }
                  aria-invalid={Boolean(errores.precio_lista)}
                  onChange={(evento) =>
                    setPrecioListaTexto(evento.target.value)
                  }
                />
              </div>
              <Select
                name="moneda"
                defaultValue={monedaInicial}
                items={MONEDAS.map((unaMoneda) => ({
                  label: unaMoneda,
                  value: unaMoneda,
                }))}
                // Para el prefijo y la vista previa; lo que se envía lo sigue
                // poniendo el input oculto del propio Select.
                onValueChange={(valor) => setMoneda(valor as Moneda)}
              >
                <SelectTrigger
                  id="moneda"
                  aria-label="Moneda"
                  className="w-24"
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
            </div>
            <MensajeError errores={errores.precio_lista} />
            <MensajeError errores={errores.moneda} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descuento">Descuento</Label>
            {/* Arranca en "0", no vacío: la columna es NOT NULL y "sin
                descuento" es exactamente 0. Un campo vacío obligaría a decidir
                qué significa, que es la ambigüedad que se quitó del esquema. */}
            <div className="relative">
              <Input
                id="descuento"
                name="descuento"
                inputMode="decimal"
                defaultValue={descuentoInicial}
                required
                className="pr-7"
                aria-invalid={Boolean(errores.descuento)}
                onChange={(evento) => setDescuentoTexto(evento.target.value)}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground"
              >
                %
              </span>
            </div>
            <MensajeError errores={errores.descuento} />
          </div>

          <div className="sm:col-span-2">
            <PanelPrecio
              etiqueta="Precio · vista previa"
              importe={
                precioCalculado === null
                  ? null
                  : formatearMonto(precioCalculado, moneda)
              }
              // Si hay precio calculado, los dos textos son válidos (es la
              // condición de `calcularPrecioDesdeTexto`), así que `aCentimos`
              // no puede recibir basura aquí.
              formula={
                precioCalculado === null
                  ? null
                  : formulaPrecio(
                      aCentimos(precioListaTexto),
                      descuentoTexto,
                      moneda,
                    )
              }
              nota={
                precioCalculado === null
                  ? "Completa el precio de lista y un descuento válido para ver el precio."
                  : "El valor definitivo lo calcula el servidor al guardar."
              }
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
