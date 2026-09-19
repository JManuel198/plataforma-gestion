import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/fecha";
import { formatearMonto } from "../dinero";
import type { FilaOrdenTrabajo } from "../queries";
import { SelectorEstadoFila } from "./selector-estado-fila";

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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>OT</TableHead>
          <TableHead>COT.</TableHead>
          <TableHead>REV.</TableHead>
          <TableHead>Asunto</TableHead>
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
          <TableRow key={fila.id}>
            <TableCell className="font-medium whitespace-nowrap">
              {fila.codigo_ot}
            </TableCell>
            <TableCell>{fila.codigo_cotizacion}</TableCell>
            <TableCell>{fila.codigo_revision ?? "—"}</TableCell>
            <TableCell className="max-w-64 truncate" title={fila.asunto}>
              {fila.asunto}
            </TableCell>
            <TableCell>{fila.codigo_oc ?? "—"}</TableCell>
            <TableCell>{fila.cliente}</TableCell>
            {/* El monto se guarda en céntimos y solo se formatea aquí: el
                frontend muestra, no calcula (regla 1 de AGENTS.md). */}
            <TableCell className="text-right whitespace-nowrap">
              {formatearMonto(fila.precio, fila.moneda)}
            </TableCell>
            <TableCell>{fila.responsable ?? "—"}</TableCell>
            <TableCell className="whitespace-nowrap">
              {formatearFecha(fila.fecha_creacion)}
            </TableCell>
            {/* Editable en el sitio: cambiar el estado es la operación más
                frecuente del listado y no merece abrir el formulario entero.
                Es un Client Component dentro de esta tabla, que sigue siendo
                un Server Component. */}
            <TableCell>
              <SelectorEstadoFila
                id={fila.id}
                codigo={fila.codigo_ot}
                estado={fila.estado}
              />
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/ordenes-trabajo/${fila.id}/editar`}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Editar
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
