"use client";

import { BadgeSituacion } from "@/core/components/badge-situacion";
import {
  CELDA_FIJA_ANTES_DEL_FIN,
  CELDA_FIJA_FIN,
  CELDA_FIJA_INICIO,
  CLASE_CIFRA,
  CLASE_CODIGO,
  CLASE_FILA,
  ReferenciaConCodigo,
} from "@/core/components/tabla-listado";
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
  fechaCreacion,
  buscarMaterialAction,
}: {
  precio: FilaPrecio;
  /**
   * `updated_at` ya formateada en el servidor con `formatearFecha`. Viene de
   * fuera porque hay que mostrarla con la zona del negocio: leerla en el
   * navegador usaría el reloj del equipo y además desajustaría la hidratación.
   */
  fechaActualizacion: string;
  /** `created_at` ya formateada, por lo mismo. Solo la usa la vista del modal. */
  fechaCreacion: string;
  buscarMaterialAction: (texto: string) => Promise<MaterialElegible[]>;
}) {
  const control = useControlDetalle();
  const { moneda } = precio;

  return (
    <TableRow
      {...propsFilaClicable(() => control.cambiar("viendo"), CLASE_FILA)}
    >
      <TableCell className={`${CELDA_FIJA_INICIO} ${CLASE_CODIGO} px-3`}>
        {precio.codigo_oferta}
      </TableCell>
      <TableCell>
        <ReferenciaConCodigo
          codigo={precio.material_codigo_interno}
          descripcion={precio.material_descripcion}
        />
      </TableCell>
      <TableCell>{oVacio(precio.proveedor)}</TableCell>
      <TableCell>{oVacio(precio.unidad)}</TableCell>
      <TableCell className={CLASE_CIFRA}>
        {formatearNumerico(precio.cantidad)}
      </TableCell>
      <TableCell className={CLASE_CIFRA}>
        {precio.precio_lista !== null && moneda !== null
          ? formatearMonto(precio.precio_lista, moneda)
          : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatearNumerico(precio.descuento)} %
      </TableCell>
      {/* `precio` NO sale de una columna: lo calculó el servidor en queries.ts
          a partir de `precio_lista` y `descuento`. Ver ../precio.ts. */}
      <TableCell className={`${CLASE_CIFRA} font-semibold`}>
        {precio.precio !== null && moneda !== null
          ? formatearMonto(precio.precio, moneda)
          : "—"}
      </TableCell>
      {/* «Fecha de actualización» es `updated_at`, no una columna propia.
          Llega formateada del servidor — ver la prop. */}
      <TableCell className="whitespace-nowrap tabular-nums">
        {fechaActualizacion}
      </TableCell>
      <TableCell className={`${CELDA_FIJA_ANTES_DEL_FIN} px-3`}>
        <BadgeSituacion activo={precio.activo} />
      </TableCell>
      <TableCell className={`${CELDA_FIJA_FIN} text-right`}>
        <SinPropagacion className="flex items-center justify-end gap-1">
          <AccionesPrecio precio={precio} control={control} />
          <DialogoListaPrecio
            guardarAction={editarPrecioEnModal}
            buscarMaterialAction={buscarMaterialAction}
            control={control}
            precio={precio}
            fechaActualizacion={fechaActualizacion}
            fechaCreacion={fechaCreacion}
          />
        </SinPropagacion>
      </TableCell>
    </TableRow>
  );
}
