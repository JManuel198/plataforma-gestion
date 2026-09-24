import { BadgeSituacion } from "@/core/components/badge-situacion";
import { ChipCodigo } from "@/core/components/chip-codigo";
import { formatearMonto } from "@/core/dinero";
import { Dato, ListaDatos, oVacio } from "@/core/vista-detalle";
import { formatearNumerico } from "../numeros";
import { formulaPrecio } from "../precio";
import type { PrecioEditable } from "../tipos";
import { PanelPrecio } from "./panel-precio";

/**
 * Una oferta en solo lectura, para el modo "viendo" del modal. El código, la
 * descripción del material y el proveedor no se repiten aquí: van en la
 * cabecera del modal (ver `DialogoListaPrecio`), como en el mockup de
 * docs/diseno/.
 *
 * El precio va aparte, en su propio recuadro y con la fórmula a la vista:
 * es el dato por el que se abre una oferta, y no es una columna sino una
 * cuenta que hizo el servidor (ver ../precio.ts).
 *
 * Sin `"use client"`: es marcado y nada más. Lo monta el modal, que sí es
 * cliente.
 */
export function VistaListaPrecio({
  precio,
  fechaActualizacion,
  fechaCreacion,
}: {
  precio: PrecioEditable;
  fechaActualizacion: string;
  fechaCreacion: string;
}) {
  const { moneda, precio_lista: precioLista } = precio;

  return (
    <div className="space-y-4">
      <ListaDatos>
        <Dato etiqueta="Material" className="sm:col-span-2">
          <span className="flex flex-wrap items-center gap-2">
            {precio.material_codigo_interno ? (
              <ChipCodigo codigo={precio.material_codigo_interno} />
            ) : null}
            {oVacio(precio.material_descripcion)}
          </span>
        </Dato>
        <Dato etiqueta="Proveedor" valor={precio.proveedor} />
        <Dato etiqueta="Unidad" valor={precio.unidad} />
        <Dato etiqueta="Cantidad" valor={formatearNumerico(precio.cantidad)} />
        {/* La moneda no tiene fila propia: va en el símbolo de cada importe. */}
        <Dato etiqueta="Precio de lista">
          <span className="font-mono tabular-nums">
            {precioLista !== null && moneda !== null
              ? formatearMonto(precioLista, moneda)
              : "—"}
          </span>
        </Dato>
        <Dato
          etiqueta="Descuento"
          valor={`${formatearNumerico(precio.descuento)} %`}
        />
        <Dato etiqueta="Situación">
          <BadgeSituacion activo={precio.activo} />
        </Dato>
      </ListaDatos>

      <PanelPrecio
        etiqueta="Precio"
        importe={
          precio.precio !== null && moneda !== null
            ? formatearMonto(precio.precio, moneda)
            : null
        }
        formula={
          precioLista !== null && moneda !== null
            ? formulaPrecio(precioLista, precio.descuento, moneda)
            : null
        }
        nota="Calculado por el servidor"
      />

      <ListaDatos>
        <Dato etiqueta="Fecha de creación" valor={fechaCreacion} />
        <Dato etiqueta="Última actualización" valor={fechaActualizacion} />
      </ListaDatos>
    </div>
  );
}
