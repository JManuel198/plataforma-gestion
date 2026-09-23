import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/fecha";
import type { FilaEpp } from "../queries";
import { FilaDeEpp } from "./fila-epp";

export function TablaEpps({
  epps,
  filtrado = false,
}: {
  epps: FilaEpp[];
  /**
   * Si hay algún filtro puesto (hoy solo la búsqueda) — cambia el mensaje de
   * lista vacía. Llegó en la Parte 2 junto con el buscador: distinguir "no hay
   * nada registrado" de "nada coincide" importa porque el segundo caso tiene
   * arreglo desde la propia pantalla (borrar la búsqueda) y el primero no.
   */
  filtrado?: boolean;
}) {
  if (epps.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {filtrado
          ? "Ningún EPP coincide con la búsqueda."
          : "No hay EPPs registrados todavía."}
      </p>
    );
  }

  // El listado no cabe holgado en móvil. El scroll va en este contenedor y no
  // en la página, para que la barra quede pegada a la tabla (misma regla que
  // aplica el resto del proyecto: el body nunca desborda en horizontal).
  //
  // Las filas se pintan en `fila-epp.tsx`, que es cliente: cada una lleva el
  // estado de su modal (vista/edición). Esta tabla se queda en el servidor y
  // solo arma la cabecera y el marco.
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Fecha de creación</TableHead>
            <TableHead className="sr-only">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {epps.map((fila) => (
            // `created_at` se formatea AQUÍ, en el servidor, y baja como texto a
            // la fila (que es un Client Component). Es un `timestamp` sin zona
            // guardado en UTC, así que hay que leerlo con la zona del negocio
            // (`formatearFecha`, lib/fecha.ts); hacerlo en el navegador usaría
            // el reloj del equipo y desajustaría la hidratación. Mismo criterio
            // que en `TablaMateriales` y `TablaServicios`.
            <FilaDeEpp
              key={fila.id}
              epp={fila}
              fechaCreacion={formatearFecha(fila.createdAt)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
