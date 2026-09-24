import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calcularEdad } from "@/lib/fecha";
import type { FilaPersonal } from "../queries";
import { FilaDePersona } from "./fila-persona";
import {
  CLASE_CABECERA,
  CLASE_FILA_CABECERA,
  MarcoTabla,
} from "@/core/components/tabla-listado";

export function TablaPersonal({
  personas,
  pie,
}: {
  personas: FilaPersonal[];
  /** Lo que va debajo de la tabla, dentro del marco: la paginación. */
  pie?: ReactNode;
}) {
  // Las filas se pintan en `fila-persona.tsx`, que es cliente: cada una lleva
  // el estado de su modal (vista/edición). Esta tabla se queda en el servidor
  // y solo arma la cabecera y el marco. Con cero filas la página no la monta:
  // pinta `EstadoVacio`.
  //
  // SIN COLUMNAS FIJAS, a diferencia de los catálogos: aquí no hay código que
  // fijar a la izquierda, las acciones son botones con texto (más anchos que
  // la columna fija de `CELDA_FIJA_FIN`) y siete columnas caben sin desplazar.
  return (
    <MarcoTabla pie={pie}>
      <Table>
        <TableHeader>
          <TableRow className={CLASE_FILA_CABECERA}>
            <TableHead className={`${CLASE_CABECERA} px-3`}>Apellido</TableHead>
            <TableHead className={CLASE_CABECERA}>Nombre</TableHead>
            <TableHead className={CLASE_CABECERA}>DNI</TableHead>
            <TableHead className={CLASE_CABECERA}>Cargo</TableHead>
            <TableHead className={`${CLASE_CABECERA} text-right`}>
              Edad
            </TableHead>
            <TableHead className={`${CLASE_CABECERA} px-3`}>
              Situación
            </TableHead>
            <TableHead className={`${CLASE_CABECERA} text-right`}>
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {personas.map((fila) => (
            // La edad se calcula AQUÍ, en el servidor, cada vez que se pinta la
            // tabla: no hay columna `edad` que pueda quedarse vieja. La cuenta
            // usa la zona del negocio, no el reloj del proceso — ver
            // `calcularEdad` en lib/fecha.ts. Va como prop a la fila, que es un
            // Client Component, para que el número siga naciendo en el servidor
            // (el porqué, en el comentario de `fila-persona.tsx`).
            <FilaDePersona
              key={fila.id}
              persona={fila}
              edad={calcularEdad(fila.fecha_nacimiento)}
            />
          ))}
        </TableBody>
      </Table>
    </MarcoTabla>
  );
}
