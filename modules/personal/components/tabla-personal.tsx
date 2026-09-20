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
import { calcularEdad } from "@/lib/fecha";
import { editarPersonaEnModal } from "../actions";
import type { FilaPersonal } from "../queries";
import { BotonBaja } from "./boton-baja";
import { DialogoPersona } from "./dialogo-persona";

export function TablaPersonal({
  personas,
  filtrado = false,
}: {
  personas: FilaPersonal[];
  /** Si hay filtros puestos — cambia el mensaje de lista vacía. */
  filtrado?: boolean;
}) {
  if (personas.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {filtrado
          ? "Nadie coincide con los filtros."
          : "No hay personal registrado todavía."}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Apellido</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>DNI</TableHead>
          <TableHead>Cargo</TableHead>
          <TableHead className="text-right">Edad</TableHead>
          <TableHead className="sr-only">Situación</TableHead>
          <TableHead className="sr-only">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {personas.map((fila) => {
          const nombreCompleto = `${fila.nombre} ${fila.apellido}`;

          return (
            <TableRow key={fila.id}>
              <TableCell className="font-medium">{fila.apellido}</TableCell>
              <TableCell>{fila.nombre}</TableCell>
              <TableCell className="tabular-nums">{fila.dni}</TableCell>
              <TableCell className="max-w-64 truncate" title={fila.cargo}>
                {fila.cargo}
              </TableCell>
              {/* Calculada aquí, en el servidor, cada vez que se pinta la
                  tabla: no hay columna `edad` que pueda quedarse vieja. La
                  cuenta usa la zona del negocio, no el reloj del proceso —
                  ver `calcularEdad` en lib/fecha.ts. */}
              <TableCell className="text-right tabular-nums">
                {calcularEdad(fila.fecha_nacimiento)}
              </TableCell>
              <TableCell>
                {fila.activo ? null : (
                  <Badge variant="secondary">De baja</Badge>
                )}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <DialogoPersona
                  guardarAction={editarPersonaEnModal}
                  persona={fila}
                  disparador={
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  }
                />
                <BotonBaja
                  id={fila.id}
                  nombreCompleto={nombreCompleto}
                  activo={fila.activo}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
