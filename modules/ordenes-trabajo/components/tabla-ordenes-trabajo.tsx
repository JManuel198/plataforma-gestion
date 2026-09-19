import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
import type { EstadoOt } from "../constantes";
import { formatearMonto } from "../dinero";
import type { FilaOrdenTrabajo } from "../queries";

/**
 * Un tono distinto por estado: con seis, dos que compartan variante dejan
 * de comunicar nada. El eje es cuánto peso visual merece cada punto del
 * ciclo, y `Facturado` no puede compartir tono con `Finalizada` — una es el
 * cierre técnico (el trabajo terminó) y la otra el cierre comercial (se
 * cobró), que es justo la distinción que el listado tiene que dejar ver.
 *
 * `dashed` y `success` se agregaron a components/ui/badge.tsx para esto: el
 * tema es monocromo (solo `destructive` tenía color), así que seis rellenos
 * de gris distinguibles no existían. `Pausada` pasa a distinguirse por
 * trazo punteado — lo interrumpido se lee mejor así que como un gris más — y
 * `Facturado` estrena el token `--success`, con el mismo patrón de tinte que
 * `destructive`.
 */
const variantePorEstado: Record<
  EstadoOt,
  "default" | "secondary" | "outline" | "destructive" | "dashed" | "success"
> = {
  Pendiente: "outline",
  "En ejecución": "default",
  Pausada: "dashed",
  Finalizada: "secondary",
  Facturado: "success",
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
        No hay órdenes de trabajo que mostrar.
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
            <TableCell>
              <Badge variant={variantePorEstado[fila.estado]}>
                {fila.estado}
              </Badge>
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
