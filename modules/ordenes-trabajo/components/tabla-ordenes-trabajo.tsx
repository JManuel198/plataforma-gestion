import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/fecha";
import { formatearMonto } from "@/core/dinero";
import type { FilaOrdenTrabajo } from "../queries";
import { FilaDeOrdenTrabajo } from "./fila-orden-trabajo";
import {
  CELDA_FIJA_ANTES_DEL_FIN,
  CELDA_FIJA_FIN,
  CELDA_FIJA_INICIO,
  CLASE_CABECERA,
  CLASE_FILA_CABECERA,
  MarcoTabla,
} from "@/core/components/tabla-listado";

export function TablaOrdenesTrabajo({
  ordenes,
  pie,
}: {
  ordenes: FilaOrdenTrabajo[];
  /** Lo que va debajo de la tabla, dentro del marco: la paginación. */
  pie?: ReactNode;
}) {
  // Las filas se pintan en `fila-orden-trabajo.tsx`, que es cliente: cada una
  // lleva el estado de su modal (vista/edición) y el envoltorio que impide que
  // sus controles —el desplegable de estado, sobre todo— abran además la
  // vista. Esta tabla se queda en el servidor y solo arma la cabecera, el
  // marco y los dos valores formateados.
  // Once columnas: se desplaza en horizontal dentro de su marco cuando no
  // cabe, con la OT fija a la izquierda y el estado y las acciones fijos a la
  // derecha (ver core/components/tabla-listado.tsx). Con cero filas la página
  // no la monta: pinta `EstadoVacio`.
  return (
    <MarcoTabla pie={pie}>
      <Table>
        <TableHeader>
          <TableRow className={CLASE_FILA_CABECERA}>
            <TableHead
              className={`${CELDA_FIJA_INICIO} ${CLASE_CABECERA} px-3`}
            >
              OT
            </TableHead>
            <TableHead className={CLASE_CABECERA}>COT.</TableHead>
            <TableHead className={CLASE_CABECERA}>REV.</TableHead>
            <TableHead className={CLASE_CABECERA}>Servicio</TableHead>
            <TableHead className={CLASE_CABECERA}>OC</TableHead>
            <TableHead className={CLASE_CABECERA}>Cliente</TableHead>
            <TableHead className={`${CLASE_CABECERA} text-right`}>
              Precio
            </TableHead>
            <TableHead className={CLASE_CABECERA}>Responsable</TableHead>
            <TableHead className={`${CLASE_CABECERA} w-24 whitespace-normal`}>
              Creación
            </TableHead>
            <TableHead
              className={`${CELDA_FIJA_ANTES_DEL_FIN} ${CLASE_CABECERA} px-3`}
            >
              Estado
            </TableHead>
            <TableHead
              className={`${CELDA_FIJA_FIN} ${CLASE_CABECERA} text-right`}
            >
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenes.map((fila) => (
            // El precio y la fecha se formatean AQUÍ, en el servidor, y viajan
            // como texto a la fila (que es un Client Component). Los dos
            // dependen de algo que el navegador resolvería distinto: la zona
            // horaria del negocio (`formatearFecha`, lib/fecha.ts) y
            // `Intl.NumberFormat`, cuya salida no coincide carácter a carácter
            // entre Node y el navegador. Mismo criterio que la edad en
            // `TablaPersonal`.
            <FilaDeOrdenTrabajo
              key={fila.id}
              orden={fila}
              precio={formatearMonto(fila.precio, fila.moneda)}
              fechaCreacion={formatearFecha(fila.fecha_creacion)}
            />
          ))}
        </TableBody>
      </Table>
    </MarcoTabla>
  );
}
