import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/fecha";
import type { FilaServicio } from "../queries";
import { FilaDeServicio } from "./fila-servicio";

export function TablaServicios({ servicios }: { servicios: FilaServicio[] }) {
  if (servicios.length === 0) {
    // Sin variante "ningún resultado coincide con los filtros", a diferencia de
    // Materiales y Lista de precios: en la Parte 1 no hay filtros, así que una
    // lista vacía solo puede significar una cosa. La prop `filtrado` llega
    // cuando llegue el buscador, no antes.
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay servicios registrados todavía.
      </p>
    );
  }

  // El listado no cabe holgado en móvil. El scroll va en este contenedor y no
  // en la página, para que la barra quede pegada a la tabla (misma regla que
  // aplica el resto del proyecto: el body nunca desborda en horizontal).
  //
  // Las filas se pintan en `fila-servicio.tsx`, que es cliente: cada una lleva
  // el estado de su modal (vista/edición). Esta tabla se queda en el servidor y
  // solo arma la cabecera y el marco.
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Servicio</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Fecha de creación</TableHead>
            <TableHead className="sr-only">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {servicios.map((fila) => (
            // `created_at` se formatea AQUÍ, en el servidor, y baja como texto a
            // la fila (que es un Client Component). Es un `timestamp` sin zona
            // guardado en UTC, así que hay que leerlo con la zona del negocio
            // (`formatearFecha`, lib/fecha.ts); hacerlo en el navegador usaría
            // el reloj del equipo y desajustaría la hidratación. Mismo criterio
            // que en `TablaMateriales`.
            <FilaDeServicio
              key={fila.id}
              servicio={fila}
              fechaCreacion={formatearFecha(fila.createdAt)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
