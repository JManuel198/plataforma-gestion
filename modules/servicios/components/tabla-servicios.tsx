import Link from "next/link";
import type { Servicio } from "@/db/schema/servicio";
import { formatearFecha } from "@/lib/fecha";
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
import type { EstadoServicio } from "../constantes";
import { formatearMonto } from "../dinero";

const variantePorEstado: Record<
  EstadoServicio,
  "default" | "secondary" | "outline" | "destructive"
> = {
  Activado: "default",
  "En espera": "outline",
  "En ejecución": "secondary",
  Finalizado: "secondary",
  Facturado: "default",
  Rechazado: "destructive",
};

export function TablaServicios({ servicios }: { servicios: Servicio[] }) {
  if (servicios.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay servicios que mostrar.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>COT.</TableHead>
          <TableHead>REV.</TableHead>
          <TableHead>OC</TableHead>
          <TableHead>Servicio</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Comentarios</TableHead>
          <TableHead className="sr-only">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {servicios.map((fila) => (
          <TableRow key={fila.id}>
            <TableCell className="font-medium">
              {fila.codigo_cotizacion}
            </TableCell>
            <TableCell>{fila.codigo_revision}</TableCell>
            <TableCell>{fila.codigo_oc ?? "—"}</TableCell>
            <TableCell className="max-w-64 truncate" title={fila.servicio}>
              {fila.servicio}
            </TableCell>
            <TableCell>{fila.cliente}</TableCell>
            <TableCell>{formatearFecha(fila.fecha)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {/* El monto vive en céntimos; el frontend solo lo muestra. */}
              {formatearMonto(fila.precio, fila.moneda)}
            </TableCell>
            <TableCell>
              <Badge variant={variantePorEstado[fila.estado]}>
                {fila.estado}
              </Badge>
            </TableCell>
            <TableCell
              className="max-w-48 truncate text-muted-foreground"
              title={fila.comentarios ?? undefined}
            >
              {fila.comentarios ?? "—"}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              {/* La OT nace ya vinculada a este Servicio: el id viaja en la
                  URL y la pantalla de creación lo resuelve en el servidor,
                  así que el formulario nunca vuelve a pedirlo. */}
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/ordenes-trabajo/nueva?servicio=${fila.id}`} />}
              >
                Crear OT
              </Button>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/servicios/${fila.id}/editar`} />}
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
