import { Dato, ListaDatos } from "@/core/vista-detalle";
import { BadgeEstado } from "./badge-estado";
import type { OrdenTrabajoEditable } from "../tipos";

/**
 * Una OT en solo lectura, para el modo "viendo" del modal.
 *
 * Enseña los mismos campos que el formulario y en el mismo orden, más los dos
 * que el formulario no deja escribir: el número de OT (lo reserva el
 * correlativo al guardar) y la fecha de creación (la pone la base con su
 * `DEFAULT now()`). En el formulario esos dos aparecen solo al crear, y
 * deshabilitados; aquí son datos como cualquier otro.
 *
 * EL PRECIO Y LA FECHA LLEGAN YA FORMATEADOS, no se formatean aquí. Los dos
 * dependen de algo que solo el servidor sabe bien:
 *
 * - `fecha_creacion` hay que mostrarla con la zona del negocio
 *   (`formatearFecha`, lib/fecha.ts), no con la del reloj de quien mira la
 *   pantalla. En el navegador saldría con el reloj del usuario, y además el
 *   HTML del servidor y el del cliente no coincidirían al hidratar.
 * - `precio` pasa por `Intl.NumberFormat`, cuya salida no es idéntica carácter
 *   a carácter entre Node y el navegador (el separador antes del símbolo, sin
 *   ir más lejos), que es otro desajuste de hidratación esperando a ocurrir.
 *
 * Es el mismo criterio que la edad de `VistaPersona`: lo que depende del reloj
 * o de la configuración regional se calcula en el servidor y viaja como texto.
 *
 * Sin `"use client"` a propósito: es marcado y nada más. Lo monta el modal,
 * que sí es cliente, así que acaba en el bundle igual — pero mantenerlo como
 * componente neutro deja la puerta abierta a reusarlo desde la pantalla
 * /ordenes-trabajo/[id], que es servidor.
 */
export function VistaOrdenTrabajo({
  orden,
  precio,
  fechaCreacion,
}: {
  orden: OrdenTrabajoEditable;
  /** Ya pasado por `formatearMonto` en el servidor. Ver arriba. */
  precio: string;
  /** Ya pasada por `formatearFecha` en el servidor. Ver arriba. */
  fechaCreacion: string;
}) {
  return (
    <ListaDatos>
      {/* El número de OT, el servicio y el cliente no se repiten aquí: van en
          la cabecera del modal (etiqueta, título y subtítulo). */}
      <Dato etiqueta="Fecha de creación" valor={fechaCreacion} />
      <Dato etiqueta="Cotización (COT.)" valor={orden.codigo_cotizacion} />
      <Dato etiqueta="Revisión (REV.)" valor={orden.codigo_revision} />
      <Dato etiqueta="Orden de compra (OC)" valor={orden.codigo_oc} />
      <Dato etiqueta="Responsable" valor={orden.responsable} />
      <Dato etiqueta="Precio" valor={precio} />
      <Dato etiqueta="Moneda" valor={orden.moneda} />
      {/* El estado se pinta con el mismo Badge y el mismo color que en la
          celda del listado (`BadgeEstado`): es el mismo dato y no debe verse
          de dos maneras. Aquí NO es editable a propósito — se cambia con el
          desplegable de la fila, que es quien pide confirmación para
          `Facturado` y `Cancelada`. */}
      <Dato etiqueta="Estado">
        <BadgeEstado estado={orden.estado} />
      </Dato>
      <Dato
        etiqueta="Comentarios"
        valor={orden.comentarios}
        className="sm:col-span-2"
      />
    </ListaDatos>
  );
}
