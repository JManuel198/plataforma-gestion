"use client";

import { BadgeSituacion } from "@/core/components/badge-situacion";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  propsFilaClicable,
  SinPropagacion,
  useControlDetalle,
} from "@/core/fila-clicable";
import { formatearMonto } from "@/core/dinero";
import { oVacio } from "@/core/vista-detalle";
import { editarTarifaEnModal } from "../actions";
import type { FilaTarifa } from "../queries";
import { AccionesTarifa } from "./acciones-tarifa";
import { DialogoTarifa } from "./dialogo-tarifa";
import {
  CELDA_FIJA_ANTES_DEL_FIN,
  CELDA_FIJA_FIN,
  CELDA_FIJA_INICIO,
  CLASE_CIFRA,
  CLASE_CODIGO,
  CLASE_FILA,
} from "@/core/components/tabla-listado";

/**
 * Una fila del tarifario, con su modal.
 *
 * Es cliente —y no parte de `tabla-tarifario.tsx`, que es servidor— porque aquí
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
 *    **Desde la Parte 2 esto ya no es solo precaución.** En la Parte 1 el único
 *    control era el lápiz, que la red de seguridad de `esClicDeLaFila` ya
 *    atajaría por ser un `<button>`. Ahora dentro del envoltorio vive también
 *    el `alert-dialog` de confirmación de `AccionesTarifa`, que se porta a
 *    `document.body`: sin el `SinPropagacion`, pulsar "Cancelar" ahí dentro
 *    abriría además la vista de la tarifa por detrás del diálogo. El envoltorio
 *    va alrededor del componente ENTERO, no de su disparador.
 *
 * DOS ICONOS DESDE LA PARTE 2 (lápiz y equis/reactivar), en un
 * `acciones-tarifa.tsx` propio — igual que `AccionesMaterial` y
 * `AccionesPrecio`. En la Parte 1 el lápiz estaba suelto aquí porque un archivo
 * para un solo botón era ceremonia; con la equis y su confirmación, extraerlo
 * pasa a valer la pena.
 */
export function FilaDeTarifa({
  tarifa,
  fechaCreacion,
}: {
  tarifa: FilaTarifa;
  /**
   * `created_at` ya formateada en el servidor con `formatearFecha`. Viene de
   * fuera porque hay que mostrarla con la zona del negocio, no con la de quien
   * mira la pantalla: leerla en el navegador usaría el reloj del equipo y
   * además desajustaría la hidratación. Mismo criterio que en Materiales y
   * Servicios.
   */
  fechaCreacion: string;
}) {
  const control = useControlDetalle();
  const { moneda } = tarifa;

  return (
    <TableRow
      {...propsFilaClicable(() => control.cambiar("viendo"), CLASE_FILA)}
    >
      <TableCell className={`${CELDA_FIJA_INICIO} ${CLASE_CODIGO} px-3`}>
        {oVacio(tarifa.codigo)}
      </TableCell>
      <TableCell className="max-w-72 truncate" title={tarifa.cargo ?? undefined}>
        {oVacio(tarifa.cargo)}
      </TableCell>
      {/* "Unidad" aquí es un PERIODO DE TIEMPO (hora, día, mes, año), no una
          unidad física como en los otros tres catálogos. Ver core/periodos.ts. */}
      <TableCell>{oVacio(tarifa.unidad)}</TableCell>
      {/* Las dos columnas admiten NULL y el costo no se enseña sin su moneda:
          un número suelto se leería como soles por defecto y podría no serlo.
          Va pegado a la columna Unidad a propósito: 500.00 por hora y 500.00
          por mes son la misma columna y no son comparables. */}
      <TableCell className={CLASE_CIFRA}>
        {tarifa.costo !== null && moneda !== null
          ? formatearMonto(tarifa.costo, moneda)
          : "—"}
      </TableCell>
      <TableCell>{oVacio(moneda)}</TableCell>
      <TableCell className="whitespace-nowrap tabular-nums">
        {fechaCreacion}
      </TableCell>
      {/* Siempre visible, también en las activas: ver `BadgeSituacion`. */}
      <TableCell className={`${CELDA_FIJA_ANTES_DEL_FIN} px-3`}>
        <BadgeSituacion activo={tarifa.activo} />
      </TableCell>
      <TableCell className={`${CELDA_FIJA_FIN} text-right`}>
        <SinPropagacion className="flex items-center justify-end gap-1">
          <AccionesTarifa tarifa={tarifa} control={control} />
          <DialogoTarifa
            guardarAction={editarTarifaEnModal}
            control={control}
            tarifa={tarifa}
            fechaCreacion={fechaCreacion}
          />
        </SinPropagacion>
      </TableCell>
    </TableRow>
  );
}
