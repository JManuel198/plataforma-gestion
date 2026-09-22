"use client";

import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  propsFilaClicable,
  SinPropagacion,
  useControlDetalle,
} from "@/core/fila-clicable";
import { oVacio } from "@/core/vista-detalle";
import { editarMaterialEnModal } from "../actions";
import type { FilaMaterial } from "../queries";
import { AccionesMaterial } from "./acciones-material";
import { DialogoMaterial } from "./dialogo-material";

/**
 * Una fila del catálogo, con su modal.
 *
 * Es cliente —y no parte de `tabla-materiales.tsx`, que es servidor— porque
 * aquí vive el estado de los tres modos del modal, y porque hay dos maneras
 * de abrirlo que tienen que compartirlo: el clic en la fila (modo "viendo") y
 * el lápiz (modo "editando", el atajo). Un solo modal montado por fila, no
 * uno por botón.
 *
 * Las dos reglas del patrón, que están explicadas a fondo en
 * `core/fila-clicable.tsx` y que hay que respetar al copiarlo a los otros
 * catálogos:
 *
 * 1. La fila sigue siendo un `<tr>` con `tabIndex`, no un `<div role=button>`
 *    ni un `<button>` envolviendo celdas: la tabla tiene que seguir siendo una
 *    tabla para un lector de pantalla. Enter y Espacio la abren.
 * 2. Todo lo interactivo de la fila va dentro del `SinPropagacion`, EL MODAL
 *    INCLUIDO. Los eventos de React burbujean por el árbol de componentes y no
 *    por el DOM, así que un clic dentro de un diálogo portado a `document.body`
 *    llega igualmente al `onClick` de esta fila si no se corta aquí. Sin esto,
 *    confirmar la baja en la equis abriría además la vista del material.
 */
export function FilaDeMaterial({
  material,
  fechaCreacion,
}: {
  material: FilaMaterial;
  /**
   * `created_at` ya formateada en el servidor con `formatearFecha`. Viene de
   * fuera por lo mismo que la edad en Personal: es un `timestamp` sin zona
   * guardado en UTC, así que leerlo en el navegador usaría el reloj del equipo
   * y además desajustaría la hidratación. A diferencia de la difunta
   * `fecha_activacion` —una columna `date` en modo string, un `YYYY-MM-DD`
   * literal que sí se podía formatear aquí— esta no admite atajos.
   */
  fechaCreacion: string;
}) {
  const control = useControlDetalle();

  return (
    <TableRow {...propsFilaClicable(() => control.cambiar("viendo"))}>
      <TableCell className="font-medium whitespace-nowrap">
        {oVacio(material.codigo_interno)}
      </TableCell>
      <TableCell
        className="max-w-72 truncate"
        title={material.descripcion ?? undefined}
      >
        {oVacio(material.descripcion)}
      </TableCell>
      <TableCell>{oVacio(material.marca)}</TableCell>
      <TableCell>{oVacio(material.modelo)}</TableCell>
      <TableCell>{oVacio(material.codigo_fabrica)}</TableCell>
      <TableCell>{oVacio(material.unidad)}</TableCell>
      {/* La fecha de creación del registro, que sustituyó a
          `fecha_activacion`. Llega formateada del servidor — ver la prop. */}
      <TableCell className="whitespace-nowrap tabular-nums">
        {fechaCreacion}
      </TableCell>
      <TableCell>
        {material.activo ? null : <Badge variant="secondary">Inactivo</Badge>}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <SinPropagacion className="flex items-center justify-end gap-1">
          <AccionesMaterial material={material} control={control} />
          <DialogoMaterial
            guardarAction={editarMaterialEnModal}
            control={control}
            material={material}
            fechaCreacion={fechaCreacion}
          />
        </SinPropagacion>
      </TableCell>
    </TableRow>
  );
}
