"use client";

import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  propsFilaClicable,
  SinPropagacion,
  useControlDetalle,
} from "@/core/fila-clicable";
import { formatearMonto } from "@/core/dinero";
import { oVacio } from "@/core/vista-detalle";
import { editarServicioEnModal } from "../actions";
import { capitalizarCategoria } from "../constantes";
import type { FilaServicio } from "../queries";
import { DialogoServicio } from "./dialogo-servicio";

/**
 * Una fila del catálogo, con su modal.
 *
 * Es cliente —y no parte de `tabla-servicios.tsx`, que es servidor— porque aquí
 * vive el estado de los tres modos del modal, y porque hay dos maneras de
 * abrirlo que tienen que compartirlo: el clic en la fila (modo "viendo") y el
 * lápiz (modo "editando", el atajo). Un solo modal montado por fila, no uno por
 * botón.
 *
 * Las dos reglas del patrón, explicadas a fondo en `core/fila-clicable.tsx`:
 *
 * 1. La fila sigue siendo un `<tr>` con `tabIndex`, no un `<div role=button>`
 *    ni un `<button>` envolviendo celdas: la tabla tiene que seguir siendo una
 *    tabla para un lector de pantalla. Enter y Espacio la abren.
 * 2. Todo lo interactivo de la fila va dentro del `SinPropagacion`, EL MODAL
 *    INCLUIDO. Los eventos de React burbujean por el árbol de componentes y no
 *    por el DOM, así que un clic dentro de un diálogo portado a `document.body`
 *    llega igualmente al `onClick` de esta fila si no se corta aquí.
 *
 *    Hoy el único control de la fila es el lápiz, que la red de seguridad de
 *    `esClicDeLaFila` ya atajaría por ser un `<button>` — pero el envoltorio se
 *    pone igual, y a propósito. Lo dice AGENTS.md: la propagación se vigila en
 *    CUALQUIER fila que combine clic-para-abrir con controles dentro, y el
 *    riesgo se reabre el día que alguien meta en una celda un `Select`, un
 *    `Popover` o un control con `role` pintado sobre un `<span>` —nada de eso lo
 *    cubre la red—. Envolver desde el principio sale más barato que acordarse.
 *
 * NO HAY EQUIS DE INACTIVAR, a diferencia de Materiales y Lista de precios: esta
 * tabla no tiene columna `activo` (ver la ficha en docs/spec/entidades.md). Por
 * eso tampoco hay un `acciones-servicio.tsx` aparte — con un solo botón y sin
 * diálogo de confirmación, un archivo propio sería ceremonia; el día que llegue
 * la baja, ese es el momento de extraerlo como en los otros dos catálogos.
 */
export function FilaDeServicio({
  servicio,
  fechaCreacion,
}: {
  servicio: FilaServicio;
  /**
   * `created_at` ya formateada en el servidor con `formatearFecha`. Viene de
   * fuera porque es un `timestamp` sin zona guardado en UTC, así que leerlo en
   * el navegador usaría el reloj del equipo y además desajustaría la
   * hidratación. Mismo criterio que en Materiales.
   */
  fechaCreacion: string;
}) {
  const control = useControlDetalle();
  const { moneda } = servicio;
  // Identifica el servicio en el nombre accesible del botón; si el texto
  // viniera vacío —la columna lo admite— se cae al código, y si tampoco, a algo
  // genérico. Mismo criterio que `AccionesMaterial`.
  const nombre =
    servicio.servicio?.trim() || servicio.codigo?.trim() || "servicio";

  return (
    <TableRow {...propsFilaClicable(() => control.cambiar("viendo"))}>
      <TableCell className="font-medium whitespace-nowrap">
        {oVacio(servicio.codigo)}
      </TableCell>
      <TableCell
        className="max-w-72 truncate"
        title={servicio.servicio ?? undefined}
      >
        {oVacio(servicio.servicio)}
      </TableCell>
      {/* `capitalizarCategoria` es solo presentación: lo guardado es el valor
          en minúscula de `CATEGORIAS_SERVICIO`. NO es `className="capitalize"`
          de Tailwind — ver el comentario de esa función en ../constantes.ts
          para el error que evita. */}
      <TableCell>
        {servicio.categoria ? capitalizarCategoria(servicio.categoria) : "—"}
      </TableCell>
      <TableCell>{oVacio(servicio.unidad)}</TableCell>
      {/* Las dos columnas admiten NULL y el precio no se enseña sin su moneda:
          un número suelto se leería como soles por defecto y podría no serlo.
          A diferencia de Lista de precios, este precio SÍ sale de una columna —
          no se calcula (ver ../schema.ts). */}
      <TableCell className="whitespace-nowrap tabular-nums">
        {servicio.precio !== null && moneda !== null
          ? formatearMonto(servicio.precio, moneda)
          : "—"}
      </TableCell>
      <TableCell>{oVacio(moneda)}</TableCell>
      <TableCell className="whitespace-nowrap tabular-nums">
        {fechaCreacion}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <SinPropagacion className="flex items-center justify-end gap-1">
          {/* El lápiz es un ATAJO, no la única vía: salta directo a edición sin
              pasar por la vista, que es lo que quiere quien ya sabe a qué viene.
              Ver el detalle del patrón en `AccionesMaterial`. No monta su propio
              modal — mueve el `ControlDetalle` de la fila, que es quien monta el
              único que hay.

              Icono sin texto por el ancho de la tabla, con su nombre en un
              `sr-only` (lo que anuncia un lector de pantalla) y un `title` para
              el tooltip nativo. Un icono suelto sin ninguna de las dos cosas
              sería inaccesible. */}
          <Button
            variant="ghost"
            size="icon-sm"
            title="Editar"
            onClick={() => control.cambiar("editando")}
          >
            <PencilIcon />
            <span className="sr-only">Editar {nombre}</span>
          </Button>
          <DialogoServicio
            guardarAction={editarServicioEnModal}
            control={control}
            servicio={servicio}
            fechaCreacion={fechaCreacion}
          />
        </SinPropagacion>
      </TableCell>
    </TableRow>
  );
}
