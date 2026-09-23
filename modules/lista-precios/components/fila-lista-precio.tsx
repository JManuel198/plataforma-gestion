"use client";

import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatearMonto } from "@/core/dinero";
import {
  propsFilaClicable,
  SinPropagacion,
  useControlDetalle,
} from "@/core/fila-clicable";
import { oVacio } from "@/core/vista-detalle";
import { editarPrecioEnModal } from "../actions";
import { formatearNumerico } from "../numeros";
import type { FilaPrecio } from "../queries";
import type { MaterialElegible } from "../tipos";
import { AccionesPrecio } from "./acciones-lista-precio";
import { DialogoListaPrecio } from "./dialogo-lista-precio";

/**
 * Una fila de la lista de precios, con su modal.
 *
 * Copia el patrón de `FilaDeMaterial` sin desviarse — ver
 * `core/fila-clicable.tsx` para el detalle. Las dos reglas que hay que
 * respetar:
 *
 * 1. La fila sigue siendo un `<tr>` con `tabIndex`, no un `<div role=button>`:
 *    la tabla tiene que seguir siendo una tabla para un lector de pantalla.
 * 2. Todo lo interactivo va dentro del `SinPropagacion`, EL MODAL INCLUIDO.
 *    Los eventos de React burbujean por el árbol de componentes y no por el
 *    DOM, así que un clic dentro de un diálogo portado a `document.body` llega
 *    igualmente al `onClick` de esta fila si no se corta aquí.
 *
 * Las dos acciones (lápiz e inactivar) viven agrupadas en `AccionesPrecio`,
 * como en Materiales: la fila solo decide dónde van y que no propaguen el clic.
 */
export function FilaDePrecio({
  precio,
  fechaActualizacion,
  buscarMaterialAction,
}: {
  precio: FilaPrecio;
  /**
   * `updated_at` ya formateada en el servidor con `formatearFecha`. Viene de
   * fuera porque es un `timestamp` sin zona guardado en UTC: leerlo en el
   * navegador usaría el reloj del equipo y además desajustaría la hidratación.
   */
  fechaActualizacion: string;
  buscarMaterialAction: (texto: string) => Promise<MaterialElegible[]>;
}) {
  const control = useControlDetalle();
  const { moneda } = precio;

  return (
    <TableRow {...propsFilaClicable(() => control.cambiar("viendo"))}>
      <TableCell className="font-medium whitespace-nowrap">
        {precio.codigo_oferta}
      </TableCell>
      <TableCell
        className="max-w-64 truncate"
        title={precio.material_descripcion ?? undefined}
      >
        {oVacio(precio.material_descripcion)}
      </TableCell>
      <TableCell>{oVacio(precio.proveedor)}</TableCell>
      <TableCell>{oVacio(precio.unidad)}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatearNumerico(precio.cantidad)}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap tabular-nums">
        {precio.precio_lista !== null && moneda !== null
          ? formatearMonto(precio.precio_lista, moneda)
          : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatearNumerico(precio.descuento)} %
      </TableCell>
      {/* `precio` NO sale de una columna: lo calculó el servidor en queries.ts
          a partir de `precio_lista` y `descuento`. Ver ../precio.ts. */}
      <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
        {precio.precio !== null && moneda !== null
          ? formatearMonto(precio.precio, moneda)
          : "—"}
      </TableCell>
      {/* «Fecha de actualización» es `updated_at`, no una columna propia.
          Llega formateada del servidor — ver la prop. */}
      <TableCell className="whitespace-nowrap tabular-nums">
        {fechaActualizacion}
      </TableCell>
      <TableCell>
        {precio.activo ? null : <Badge variant="secondary">Inactiva</Badge>}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <SinPropagacion className="flex items-center justify-end gap-1">
          <AccionesPrecio precio={precio} control={control} />
          <DialogoListaPrecio
            guardarAction={editarPrecioEnModal}
            buscarMaterialAction={buscarMaterialAction}
            control={control}
            precio={precio}
            fechaActualizacion={fechaActualizacion}
          />
        </SinPropagacion>
      </TableCell>
    </TableRow>
  );
}
