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
  CLASE_CABECERA,
  CLASE_FILA_CABECERA,
  MarcoTabla,
} from "@/core/components/tabla-listado";
import type { FilaContacto } from "../queries";
import { FilaDeContacto } from "./fila-contacto";

/**
 * La tabla de contactos. Servidor: solo arma la cabecera y el marco; cada fila
 * (cliente) lleva el estado de su modal.
 *
 * Estado y acciones fijos a la derecha, como en los catálogos con baja lógica:
 * con el correo y la empresa la tabla desplaza en pantallas estrechas. Sin
 * columna fija a la izquierda porque no hay código: el nombre del contacto es
 * lo primero y se lee igual.
 */
export function TablaContactos({
  contactos,
  pie,
}: {
  contactos: FilaContacto[];
  /** Lo que va debajo de la tabla, dentro del marco: la paginación. */
  pie?: ReactNode;
}) {
  return (
    <MarcoTabla pie={pie}>
      <Table>
        <TableHeader>
          <TableRow className={CLASE_FILA_CABECERA}>
            <TableHead className={CLASE_CABECERA}>Contacto</TableHead>
            <TableHead className={CLASE_CABECERA}>Cargo</TableHead>
            <TableHead className={CLASE_CABECERA}>Empresa</TableHead>
            <TableHead className={CLASE_CABECERA}>Email</TableHead>
            <TableHead className={CLASE_CABECERA}>Celular</TableHead>
            <TableHead
              className={`${CELDA_FIJA_ANTES_DEL_FIN} ${CLASE_CABECERA}`}
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
          {contactos.map((fila) => (
            <FilaDeContacto key={fila.id} contacto={fila} />
          ))}
        </TableBody>
      </Table>
    </MarcoTabla>
  );
}
