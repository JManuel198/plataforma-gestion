import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatearFecha } from "@/lib/fecha";
import type { FilaPrecio } from "../queries";
import type { MaterialElegible } from "../tipos";
import { FilaDePrecio } from "./fila-lista-precio";

/**
 * El listado del catálogo de ofertas.
 *
 * Es SERVIDOR: aquí no hay estado. Lo único que hace de más es formatear
 * `updated_at` con la zona del negocio antes de pasarla a cada fila — igual
 * que `TablaMateriales` con `created_at`, y por el mismo motivo: formatearlo
 * en el navegador usaría el reloj del equipo y desajustaría la hidratación.
 *
 * FILTRADO Y BÚSQUEDA VIVEN EN LA CONSULTA, no aquí: esta tabla recibe las
 * filas que ya casan y las pinta. Lo único que sabe de los filtros es si había
 * alguno puesto, y solo para el mensaje de lista vacía — "no hay nada" y "nada
 * coincide" son dos situaciones distintas y el usuario tiene que poder
 * distinguirlas sin mirar la URL.
 */
export function TablaListaPrecios({
  precios,
  buscarMaterialAction,
  filtrado = false,
}: {
  precios: FilaPrecio[];
  buscarMaterialAction: (texto: string) => Promise<MaterialElegible[]>;
  /** Si hay filtros puestos — cambia el mensaje de lista vacía. */
  filtrado?: boolean;
}) {
  if (precios.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {filtrado
          ? "Ninguna oferta coincide con los filtros."
          : "No hay ofertas registradas todavía."}
      </p>
    );
  }

  // Diez columnas de texto no caben holgadas en móvil. El scroll va en este
  // contenedor y no en la página, para que la barra quede pegada a la tabla.
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código de oferta</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Precio de lista</TableHead>
            <TableHead className="text-right">Descuento</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead>Fecha de actualización</TableHead>
            <TableHead className="sr-only">Situación</TableHead>
            <TableHead className="sr-only">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {precios.map((fila) => (
            <FilaDePrecio
              key={fila.id}
              precio={fila}
              fechaActualizacion={formatearFecha(fila.updatedAt)}
              buscarMaterialAction={buscarMaterialAction}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
