import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calcularEdad } from "@/lib/fecha";
import type { FilaPersonal } from "../queries";
import { FilaDePersona } from "./fila-persona";

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

  // Las filas se pintan en `fila-persona.tsx`, que es cliente: cada una lleva
  // el estado de su modal (vista/edición). Esta tabla se queda en el servidor
  // y solo arma la cabecera y el marco.
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
        {personas.map((fila) => (
          // La edad se calcula AQUÍ, en el servidor, cada vez que se pinta la
          // tabla: no hay columna `edad` que pueda quedarse vieja. La cuenta
          // usa la zona del negocio, no el reloj del proceso — ver
          // `calcularEdad` en lib/fecha.ts. Va como prop a la fila, que es un
          // Client Component, para que el número siga naciendo en el servidor
          // (el porqué, en el comentario de `fila-persona.tsx`).
          <FilaDePersona
            key={fila.id}
            persona={fila}
            edad={calcularEdad(fila.fecha_nacimiento)}
          />
        ))}
      </TableBody>
    </Table>
  );
}
