import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/fecha";
import type { FilaMaterial } from "../queries";
import { FilaDeMaterial } from "./fila-material";

export function TablaMateriales({
  materiales,
  filtrado = false,
}: {
  materiales: FilaMaterial[];
  /** Si hay filtros puestos — cambia el mensaje de lista vacía. */
  filtrado?: boolean;
}) {
  if (materiales.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {filtrado
          ? "Ningún material coincide con los filtros."
          : "No hay materiales registrados todavía."}
      </p>
    );
  }

  // El listado no cabe holgado en móvil: siete columnas de texto. El scroll va
  // en este contenedor y no en la página, para que la barra quede pegada a la
  // tabla (misma regla que aplica el resto del proyecto: el body nunca
  // desborda en horizontal).
  //
  // Las filas se pintan en `fila-material.tsx`, que es cliente: cada una lleva
  // el estado de su modal (vista/edición). Esta tabla se queda en el servidor
  // y solo arma la cabecera y el marco.
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código interno</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Código de fábrica</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead>Fecha de creación</TableHead>
            <TableHead className="sr-only">Situación</TableHead>
            <TableHead className="sr-only">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materiales.map((fila) => (
            // `created_at` se formatea AQUÍ, en el servidor, y baja como texto
            // a la fila (que es un Client Component). Es un `timestamp` sin
            // zona guardado en UTC, así que hay que leerlo con la zona del
            // negocio (`formatearFecha`, lib/fecha.ts); hacerlo en el navegador
            // usaría el reloj del equipo y desajustaría la hidratación. Mismo
            // criterio que la edad en `TablaPersonal`.
            <FilaDeMaterial
              key={fila.id}
              material={fila}
              fechaCreacion={formatearFecha(fila.createdAt)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
