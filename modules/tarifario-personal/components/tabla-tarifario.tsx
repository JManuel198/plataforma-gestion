import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/fecha";
import type { FilaTarifa } from "../queries";
import { FilaDeTarifa } from "./fila-tarifa";
import {
  CELDA_FIJA_ANTES_DEL_FIN,
  CELDA_FIJA_FIN,
  CELDA_FIJA_INICIO,
  CLASE_CABECERA,
  CLASE_FILA_CABECERA,
  MarcoTabla,
} from "@/core/components/tabla-listado";

export function TablaTarifario({
  tarifas,
  pie,
}: {
  tarifas: FilaTarifa[];
  /** Lo que va debajo de la tabla, dentro del marco: la paginación. */
  pie?: ReactNode;
}) {
  // El listado no cabe holgado en móvil. El scroll va en este contenedor y no
  // en la página, para que la barra quede pegada a la tabla (misma regla que
  // aplica el resto del proyecto: el body nunca desborda en horizontal).
  //
  // Las filas se pintan en `fila-tarifa.tsx`, que es cliente: cada una lleva el
  // estado de su modal (vista/edición). Esta tabla se queda en el servidor y
  // solo arma la cabecera y el marco.
  return (
    <MarcoTabla pie={pie}>
      <Table>
        <TableHeader>
          <TableRow className={CLASE_FILA_CABECERA}>
            <TableHead
              className={`${CELDA_FIJA_INICIO} ${CLASE_CABECERA} px-3`}
            >
              Código
            </TableHead>
            <TableHead className={CLASE_CABECERA}>Cargo</TableHead>
            {/* "Unidad" son periodos de tiempo aquí, no unidades físicas. Se
                deja pegada al Costo a propósito: el costo no significa nada sin
                saber si es por hora o por mes. */}
            <TableHead className={CLASE_CABECERA}>Unidad</TableHead>
            <TableHead className={`${CLASE_CABECERA} text-right`}>
              Costo
            </TableHead>
            <TableHead className={CLASE_CABECERA}>Moneda</TableHead>
            <TableHead className={`${CLASE_CABECERA} w-24 whitespace-normal`}>
              Fecha de creación
            </TableHead>
            <TableHead
              className={`${CELDA_FIJA_ANTES_DEL_FIN} ${CLASE_CABECERA} px-3`}
            >
              Situación
            </TableHead>
            <TableHead
              className={`${CELDA_FIJA_FIN} ${CLASE_CABECERA} text-right`}
            >
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tarifas.map((fila) => (
            // `created_at` se formatea AQUÍ, en el servidor, y baja como texto a
            // la fila (que es un Client Component): hay que mostrarlo con la
            // zona del negocio (`formatearFecha`, lib/fecha.ts), no con la de
            // quien mira la pantalla. Hacerlo en el navegador usaría el reloj
            // del equipo y desajustaría la hidratación. Mismo criterio que en
            // `TablaMateriales` y `TablaServicios`.
            <FilaDeTarifa
              key={fila.id}
              tarifa={fila}
              fechaCreacion={formatearFecha(fila.createdAt)}
            />
          ))}
        </TableBody>
      </Table>
    </MarcoTabla>
  );
}
