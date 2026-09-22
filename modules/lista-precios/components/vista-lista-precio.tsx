import { Badge } from "@/components/ui/badge";
import { formatearMonto } from "@/core/dinero";
import { Dato, ListaDatos } from "@/core/vista-detalle";
import { formatearNumerico } from "../numeros";
import type { PrecioEditable } from "../tipos";

/**
 * Una oferta en solo lectura, para el modo "viendo" del modal.
 *
 * Enseña los mismos campos que el formulario y en el mismo orden, más tres que
 * el formulario no edita: el precio calculado, la situación (activa/inactiva) y
 * la fecha de actualización.
 *
 * EL PRECIO APARECE AQUÍ IGUAL QUE EN EL FORMULARIO: como un dato derivado, no
 * como algo guardado. Lo calculó el servidor en `queries.ts` a partir de
 * `precio_lista` y `descuento` — ver ../precio.ts para el porqué de que no sea
 * una columna.
 *
 * Sin `"use client"` a propósito: es marcado y nada más, igual que
 * `VistaMaterial`.
 */
export function VistaListaPrecio({
  precio,
  fechaActualizacion,
}: {
  precio: PrecioEditable;
  /** `updated_at` ya formateada en el servidor. Ver `fila-lista-precio.tsx`. */
  fechaActualizacion: string;
}) {
  const moneda = precio.moneda;

  return (
    <ListaDatos>
      <Dato etiqueta="Código de oferta" valor={precio.codigo_oferta} />
      <Dato etiqueta="Proveedor" valor={precio.proveedor} />
      <Dato
        etiqueta="Material"
        valor={precio.material_descripcion}
        className="sm:col-span-2"
      />
      <Dato etiqueta="Unidad" valor={precio.unidad} />
      <Dato etiqueta="Cantidad" valor={formatearNumerico(precio.cantidad)} />
      <Dato
        etiqueta="Precio de lista"
        valor={
          precio.precio_lista !== null && moneda !== null
            ? formatearMonto(precio.precio_lista, moneda)
            : null
        }
      />
      <Dato
        etiqueta="Descuento"
        valor={`${formatearNumerico(precio.descuento)} %`}
      />
      {/* Derivado, no guardado: `precio_lista × (1 − descuento/100)`. */}
      <Dato
        etiqueta="Precio"
        valor={
          precio.precio !== null && moneda !== null
            ? formatearMonto(precio.precio, moneda)
            : null
        }
      />
      <Dato etiqueta="Moneda" valor={moneda} />
      <Dato etiqueta="Fecha de actualización" valor={fechaActualizacion} />
      {/* Mismo criterio que `VistaMaterial`: el chip de activo sí se pinta
          aquí aunque la tabla no lo marque, porque una etiqueta "Situación"
          sin valor se leería como un dato que falta. */}
      <Dato etiqueta="Situación">
        <Badge variant={precio.activo ? "outline" : "secondary"}>
          {precio.activo ? "En la lista" : "Inactiva"}
        </Badge>
      </Dato>
    </ListaDatos>
  );
}
