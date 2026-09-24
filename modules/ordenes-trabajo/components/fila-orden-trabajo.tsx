"use client";

import { PencilIcon } from "lucide-react";
import { BotonAccionFila } from "@/core/components/boton-accion-fila";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  propsFilaClicable,
  SinPropagacion,
  useControlDetalle,
} from "@/core/fila-clicable";
import { editarOrdenTrabajoEnModal } from "../actions";
import type { FilaOrdenTrabajo } from "../queries";
import { DialogoOrdenTrabajo } from "./dialogo-orden-trabajo";
import { SelectorEstadoFila } from "./selector-estado-fila";
import {
  CELDA_FIJA_ANTES_DEL_FIN,
  CELDA_FIJA_FIN,
  CELDA_FIJA_INICIO,
  CLASE_CIFRA,
  CLASE_CODIGO,
  CLASE_FILA,
} from "@/core/components/tabla-listado";

/**
 * Una fila del listado de OT, con su modal.
 *
 * Mismo patrón que `FilaDeMaterial` y `FilaDePersona`, con las piezas
 * importadas de `core/fila-clicable.tsx` — nada de máquina de estados propia.
 * Las dos reglas que hay que respetar al copiarlo están explicadas a fondo
 * allí:
 *
 * 1. La fila sigue siendo un `<tr>` con `tabIndex`, no un `<div role=button>`:
 *    la tabla tiene que seguir siendo una tabla para un lector de pantalla.
 *    Enter y Espacio la abren.
 * 2. Todo lo interactivo de la fila va dentro del `SinPropagacion`.
 *
 * ESTA ES LA FILA DELICADA DE LAS TRES, y el motivo es la celda de estado.
 *
 * A diferencia de Materiales y Personal, aquí lo que vive dentro de la fila no
 * es solo un par de botones: es un `Select` que ya se editaba en línea, con su
 * propio desplegable y su propio AlertDialog de confirmación para `Facturado`
 * y `Cancelada`. Eso son TRES envoltorios distintos que hay que cubrir, y los
 * tres cuelgan del mismo `SinPropagacion` de la celda de estado:
 *
 * - El disparador del Select (un `<button>`).
 * - El desplegable con las siete opciones, que se porta a `document.body`.
 * - El AlertDialog de confirmación, que también se porta.
 *
 * Los dos últimos son los que no se ven venir: están fuera del `<tr>` en el
 * DOM, pero los eventos de React burbujean por el ÁRBOL DE COMPONENTES, así
 * que un clic en la opción "Facturado" o en el "Cancelar" del diálogo llega
 * igualmente al `onClick` de esta fila. Sin el envoltorio, elegir un estado
 * abriría además la vista de la OT por detrás del diálogo de confirmación.
 *
 * Ojo con la red de seguridad de `propsFilaClicable` (`esClicDeLaFila`): aquí
 * NO basta. Descarta lo que nace fuera de la fila en el DOM y lo que nace en
 * un control nativo, pero las opciones del desplegable de Base UI son
 * `role="option"` sobre un `<div>` — que no está en esa lista — y solo se
 * salvan por el primer criterio. Depender de eso sería depender de un detalle
 * de implementación del portal. El envoltorio es lo que de verdad lo sostiene.
 *
 * El `SinPropagacion` del estado se queda con su `display: contents` por
 * defecto: el disparador del Select ya trae su propio ancho (`w-40`), así que
 * una caja extra alrededor no aportaría nada y solo habría que mantenerla
 * sincronizada con él.
 *
 * EL PRECIO Y LA FECHA LLEGAN FORMATEADOS desde la tabla, que es un Server
 * Component. Es la misma razón por la que la edad de Personal se calcula allí:
 * `formatearFecha` muestra el timestamp con la zona del negocio y
 * `formatearMonto` pasa por `Intl.NumberFormat` — los dos darían un resultado
 * distinto en el navegador y desajustarían la hidratación, además de arrastrar
 * dayjs con sus plugins de zona al bundle del cliente.
 */
export function FilaDeOrdenTrabajo({
  orden,
  precio,
  fechaCreacion,
}: {
  orden: FilaOrdenTrabajo;
  /** Formateado en el servidor con `formatearMonto`. Ver arriba. */
  precio: string;
  /** Formateada en el servidor con `formatearFecha`. Ver arriba. */
  fechaCreacion: string;
}) {
  const control = useControlDetalle();

  return (
    <TableRow
      {...propsFilaClicable(() => control.cambiar("viendo"), CLASE_FILA)}
    >
      <TableCell className={`${CELDA_FIJA_INICIO} ${CLASE_CODIGO} px-3`}>
        {orden.codigo_ot}
      </TableCell>
      <TableCell>{orden.codigo_cotizacion}</TableCell>
      <TableCell>{orden.codigo_revision ?? "—"}</TableCell>
      <TableCell className="max-w-64 truncate" title={orden.servicio}>
        {orden.servicio}
      </TableCell>
      <TableCell>{orden.codigo_oc ?? "—"}</TableCell>
      <TableCell>{orden.cliente}</TableCell>
      {/* El monto se guarda en céntimos y solo se formatea para mostrarlo: el
          frontend muestra, no calcula (regla 1 de AGENTS.md). */}
      <TableCell className={CLASE_CIFRA}>{precio}</TableCell>
      <TableCell>{orden.responsable ?? "—"}</TableCell>
      <TableCell className="whitespace-nowrap">{fechaCreacion}</TableCell>
      {/* Editable en el sitio: cambiar el estado es la operación más frecuente
          del listado y no merece abrir el formulario entero. Va envuelto — ver
          el comentario de arriba, es el control más fácil de dejarse suelto de
          los tres módulos. */}
      {/* Fija a la derecha junto a las acciones, en el sitio que en los
          catálogos ocupa la «Situación»: es el dato de estado de la fila. */}
      <TableCell className={`${CELDA_FIJA_ANTES_DEL_FIN} px-3`}>
        <SinPropagacion>
          <SelectorEstadoFila
            id={orden.id}
            codigo={orden.codigo_ot}
            estado={orden.estado}
          />
        </SinPropagacion>
      </TableCell>
      {/* El lápiz es el atajo a edición: salta la vista y abre el formulario
          directamente, que es lo que quiere quien ya sabe a qué viene. No hay
          lupa de "ver detalle" —para eso está el clic en la fila— ni equis de
          inactivar: en la OT ese papel lo cumple el estado `Cancelada` (ver la
          regla 9 de AGENTS.md), que se pone desde la celda de al lado.

          Icono y no texto, a diferencia de Personal: esta tabla tiene once
          columnas, la más ancha del proyecto, y una etiqueta por fila empuja
          el contenido. El nombre va en un `<span class="sr-only">` —que es lo
          que anuncia un lector de pantalla— y en un tooltip (los dos los pone
          `BotonAccionFila`). */}
      <TableCell className={`${CELDA_FIJA_FIN} text-right`}>
        <SinPropagacion className="flex items-center justify-end gap-1">
          <BotonAccionFila
            etiqueta="Editar"
            etiquetaAccesible={`Editar {orden.codigo_ot}`}
            onClick={() => control.cambiar("editando")}
          >
            <PencilIcon />
          </BotonAccionFila>
          {/* El modal también va dentro del envoltorio: es un portal, y los
              eventos de un portal burbujean igual por el árbol de componentes.
              Sin esto, el "Cancelar" del formulario abriría de nuevo la vista
              al cerrarse. */}
          <DialogoOrdenTrabajo
            guardarAction={editarOrdenTrabajoEnModal}
            control={control}
            orden={orden}
            precio={precio}
            fechaCreacion={fechaCreacion}
          />
        </SinPropagacion>
      </TableCell>
    </TableRow>
  );
}
