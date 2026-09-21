import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { editarMaterialEnModal } from "../actions";
import type { FilaMaterial } from "../queries";
import { DialogoMaterial } from "./dialogo-material";

/**
 * Un guion para las celdas sin dato, en vez de dejar el hueco en blanco: una
 * celda vacía se lee como "no cargó" y no como "no tiene". Cubre tanto el
 * `null` (si la columna admite vacío) como la cadena vacía.
 */
function oVacio(valor: string | null | undefined) {
  return valor && valor.trim() !== "" ? valor : "—";
}

export function TablaMateriales({ materiales }: { materiales: FilaMaterial[] }) {
  if (materiales.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay materiales registrados todavía.
      </p>
    );
  }

  // El listado no cabe holgado en móvil: siete columnas de texto. El scroll va
  // en este contenedor y no en la página, para que la barra quede pegada a la
  // tabla (misma regla que aplica el resto del proyecto: el body nunca
  // desborda en horizontal).
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
            <TableHead>Fecha de activación</TableHead>
            <TableHead className="sr-only">Situación</TableHead>
            <TableHead className="sr-only">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materiales.map((fila) => (
            <TableRow key={fila.id}>
              <TableCell className="font-medium whitespace-nowrap">
                {oVacio(fila.codigo_interno)}
              </TableCell>
              <TableCell
                className="max-w-72 truncate"
                title={fila.descripcion ?? undefined}
              >
                {oVacio(fila.descripcion)}
              </TableCell>
              <TableCell>{oVacio(fila.marca)}</TableCell>
              <TableCell>{oVacio(fila.modelo)}</TableCell>
              <TableCell>{oVacio(fila.codigo_fabrica)}</TableCell>
              <TableCell>{oVacio(fila.unidad)}</TableCell>
              {/* `fecha_activacion` es una columna `date` en modo string:
                  llega como `YYYY-MM-DD` literal, sin hora y sin pasar por
                  ninguna conversión de zona. Por eso se formatea directo con
                  dayjs y no hay nada que corregir aquí. */}
              <TableCell className="whitespace-nowrap tabular-nums">
                {fila.fecha_activacion
                  ? dayjs(fila.fecha_activacion).format("DD/MM/YYYY")
                  : "—"}
              </TableCell>
              <TableCell>
                {fila.activo ? null : <Badge variant="secondary">Inactivo</Badge>}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {/* Un botón de texto y no un icono: los iconos de acción por
                    fila son Parte 2. Esto es lo mínimo para probar el modal de
                    edición de punta a punta, igual que se hizo en OT. */}
                <DialogoMaterial
                  guardarAction={editarMaterialEnModal}
                  material={fila}
                  disparador={
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
