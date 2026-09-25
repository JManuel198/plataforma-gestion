import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CELDA_FIJA_FIN,
  CELDA_FIJA_INICIO,
  CLASE_CABECERA,
  CLASE_FILA_CABECERA,
  MarcoTabla,
} from "@/core/components/tabla-listado";
import type { FilaEmpresa } from "../queries";
import { FilaDeEmpresa } from "./fila-empresa";

/**
 * La tabla del directorio de empresas. Servidor: solo arma la cabecera y el
 * marco; cada fila (cliente) lleva el estado de su modal.
 *
 * Código fijo a la izquierda y acciones a la derecha, como en los catálogos:
 * con ocho columnas la tabla desplaza en pantallas estrechas. SIN columna
 * «Situación» porque el encargo fija las columnas; la situación se lee en la
 * vista de detalle y en el filtro «Ver solo inactivas», que alterna entre
 * vistas excluyentes, así que toda la tabla está siempre en la misma.
 */
export function TablaEmpresas({
  empresas,
  pie,
}: {
  empresas: FilaEmpresa[];
  /** Lo que va debajo de la tabla, dentro del marco: la paginación. */
  pie?: ReactNode;
}) {
  return (
    <MarcoTabla pie={pie}>
      <Table>
        <TableHeader>
          <TableRow className={CLASE_FILA_CABECERA}>
            <TableHead className={`${CLASE_CABECERA} ${CELDA_FIJA_INICIO} px-3`}>
              Código
            </TableHead>
            <TableHead className={CLASE_CABECERA}>Razón social</TableHead>
            <TableHead className={CLASE_CABECERA}>Nombre comercial</TableHead>
            <TableHead className={CLASE_CABECERA}>RUC</TableHead>
            <TableHead className={CLASE_CABECERA}>Tipo</TableHead>
            <TableHead className={CLASE_CABECERA}>Distrito</TableHead>
            <TableHead className={`${CLASE_CABECERA} text-right`}>
              Contactos
            </TableHead>
            <TableHead
              className={`${CELDA_FIJA_FIN} ${CLASE_CABECERA} text-right`}
            >
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.map((fila) => (
            <FilaDeEmpresa key={fila.id} empresa={fila} />
          ))}
        </TableBody>
      </Table>
    </MarcoTabla>
  );
}
