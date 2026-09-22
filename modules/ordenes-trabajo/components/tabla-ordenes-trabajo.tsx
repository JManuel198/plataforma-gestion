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

export function TablaOrdenesTrabajo({
  ordenes,
  filtrado = false,
}: {
  ordenes: FilaOrdenTrabajo[];
  /**
   * Si la lista viene de una búsqueda o un filtro. Solo cambia el mensaje de
   * lista vacía: "no hay ninguna" y "ninguna coincide con lo que buscas" son
   * situaciones distintas y llevan a acciones distintas.
   */
  filtrado?: boolean;
}) {
  if (ordenes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {filtrado
          ? "Ninguna orden de trabajo coincide con los filtros."
          : "No hay órdenes de trabajo que mostrar."}
      </p>
    );
  }

  // Las filas se pintan en `fila-orden-trabajo.tsx`, que es cliente: cada una
  // lleva el estado de su modal (vista/edición) y el envoltorio que impide que
  // sus controles —el desplegable de estado, sobre todo— abran además la
  // vista. Esta tabla se queda en el servidor y solo arma la cabecera, el
  // marco y los dos valores formateados.
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>OT</TableHead>
          <TableHead>COT.</TableHead>
          <TableHead>REV.</TableHead>
          <TableHead>Servicio</TableHead>
          <TableHead>OC</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          <TableHead>Responsable</TableHead>
          <TableHead>Creación</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="sr-only">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordenes.map((fila) => (
          // El precio y la fecha se formatean AQUÍ, en el servidor, y viajan
          // como texto a la fila (que es un Client Component). Los dos
          // dependen de algo que el navegador resolvería distinto: la zona
          // horaria del negocio (`formatearFecha`, lib/fecha.ts — la columna
          // es un `timestamp` sin zona guardado en UTC) y `Intl.NumberFormat`,
          // cuya salida no coincide carácter a carácter entre Node y el
          // navegador. Mismo criterio que la edad en `TablaPersonal`.
          <FilaDeOrdenTrabajo
            key={fila.id}
            orden={fila}
            precio={formatearMonto(fila.precio, fila.moneda)}
            fechaCreacion={formatearFecha(fila.fecha_creacion)}
          />
        ))}
      </TableBody>
    </Table>
  );
}
