import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/fecha";
import type { EstadoOt } from "../constantes";
import type { FilaOrdenTrabajo } from "../queries";

const variantePorEstado: Record<
  EstadoOt,
  "default" | "secondary" | "outline" | "destructive"
> = {
  Pendiente: "outline",
  "En ejecución": "default",
  Pausada: "secondary",
  Finalizada: "secondary",
  Cancelada: "destructive",
};

export function TablaOrdenesTrabajo({
  ordenes,
}: {
  ordenes: FilaOrdenTrabajo[];
}) {
  if (ordenes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay órdenes de trabajo que mostrar. Se crean desde un Servicio.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>OT</TableHead>
          <TableHead>COT.</TableHead>
          <TableHead>Asunto</TableHead>
          <TableHead>OC</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Responsable</TableHead>
          <TableHead>Servicio de origen</TableHead>
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
            <TableCell className="max-w-64 truncate" title={fila.asunto}>
              {fila.asunto}
            </TableCell>
            <TableCell>{fila.codigo_oc ?? "—"}</TableCell>
            <TableCell>{fila.cliente}</TableCell>
            <TableCell>{fila.responsable ?? "—"}</TableCell>
            <TableCell
              className="max-w-48 truncate"
              title={fila.servicio_descripcion}
            >
              {/* La única relación real con el Servicio. Los demás campos que
                  se parecen a los suyos se escribieron a mano y pueden no
                  coincidir — es lo decidido, no un error. */}
              <Link
                href={`/servicios/${fila.servicio_id}/editar`}
                className="underline underline-offset-4"
              >
                {fila.servicio_descripcion}
              </Link>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {formatearFecha(fila.fecha_creacion)}
            </TableCell>
            <TableCell>
              <Badge variant={variantePorEstado[fila.estado]}>
                {fila.estado}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/ordenes-trabajo/${fila.id}/editar`} />}
              >
                Editar
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
