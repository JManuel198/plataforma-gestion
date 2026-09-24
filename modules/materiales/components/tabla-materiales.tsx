import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CELDA_FIJA_ANTES_DEL_FIN,
  CELDA_FIJA_FIN,
  CELDA_FIJA_INICIO,
  CLASE_CABECERA,
  CLASE_FILA_CABECERA,
  MarcoTabla,
} from "@/core/components/tabla-listado";
import { formatearFecha } from "@/lib/fecha";
import type { FilaMaterial } from "../queries";
import { FilaDeMaterial } from "./fila-material";

export function TablaMateriales({
  materiales,
  pie,
}: {
  materiales: FilaMaterial[];
  /** Lo que va debajo de la tabla, dentro del marco: la paginación. */
  pie?: ReactNode;
}) {
  // La tabla se desplaza en horizontal dentro de su marco cuando no cabe, con
  // el código fijo a la izquierda y la situación y las acciones fijas a la
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
              Código interno
            </TableHead>
            <TableHead className={CLASE_CABECERA}>Descripción</TableHead>
            <TableHead className={CLASE_CABECERA}>Marca</TableHead>
            <TableHead className={CLASE_CABECERA}>Modelo</TableHead>
            <TableHead className={CLASE_CABECERA}>Código de fábrica</TableHead>
            <TableHead className={CLASE_CABECERA}>Unidad</TableHead>
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
          {materiales.map((fila) => (
            // `created_at` se formatea AQUÍ, en el servidor, y baja como texto
            // a la fila (que es un Client Component): hay que mostrarlo con la
            // zona del negocio (`formatearFecha`, lib/fecha.ts), no con la de
            // quien mira la pantalla. Hacerlo en el navegador usaría el reloj
            // del equipo y desajustaría la hidratación. Mismo criterio que la
            // edad en `TablaPersonal`.
            <FilaDeMaterial
              key={fila.id}
              material={fila}
              fechaCreacion={formatearFecha(fila.createdAt)}
            />
          ))}
        </TableBody>
      </Table>
    </MarcoTabla>
  );
}
