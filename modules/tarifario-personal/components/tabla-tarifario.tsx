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

export function TablaTarifario({
  tarifas,
  filtrado = false,
}: {
  tarifas: FilaTarifa[];
  /**
   * Si hay filtros puestos (búsqueda o "Ver solo inactivos") — cambia el
   * mensaje de lista vacía. Sin esto el usuario leería "no hay tarifas
   * registradas" cuando lo que pasa es que su búsqueda no encontró nada, o que
   * no hay ninguna inactiva. Llega en la Parte 2, con los filtros.
   */
  filtrado?: boolean;
}) {
  if (tarifas.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {filtrado
          ? "Ninguna tarifa coincide con los filtros."
          : "No hay tarifas registradas todavía."}
      </p>
    );
  }

  // El listado no cabe holgado en móvil. El scroll va en este contenedor y no
  // en la página, para que la barra quede pegada a la tabla (misma regla que
  // aplica el resto del proyecto: el body nunca desborda en horizontal).
  //
  // Las filas se pintan en `fila-tarifa.tsx`, que es cliente: cada una lleva el
  // estado de su modal (vista/edición). Esta tabla se queda en el servidor y
  // solo arma la cabecera y el marco.
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Cargo</TableHead>
            {/* "Unidad" son periodos de tiempo aquí, no unidades físicas. Se
                deja pegada al Costo a propósito: el costo no significa nada sin
                saber si es por hora o por mes. */}
            <TableHead>Unidad</TableHead>
            <TableHead>Costo</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Fecha de creación</TableHead>
            {/* `sr-only` las dos: la columna existe para un lector de pantalla
                —que necesita saber a qué encabezado pertenece el chip
                "Inactivo" y el grupo de botones— pero un título visible sobre
                una columna casi siempre vacía sería ruido. Mismo criterio que
                en `TablaMateriales`. */}
            <TableHead className="sr-only">Situación</TableHead>
            <TableHead className="sr-only">Acciones</TableHead>
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
    </div>
  );
}
