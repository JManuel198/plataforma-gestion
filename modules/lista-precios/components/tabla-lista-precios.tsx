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
 * que `TablaMateriales` con `created_at`, y por el mismo motivo: es un
 * `timestamp` sin zona guardado en UTC, así que formatearlo en el navegador
 * usaría el reloj del equipo y desajustaría la hidratación.
 *
 * LISTADO BÁSICO A PROPÓSITO (Parte 1): sin buscador de tabla y sin inactivar.
 * Los dos llegan en la Parte 2 — la consulta ya trae solo las ofertas activas,
 * así que el listado significa lo mismo antes y después de que exista el
 * filtro. No hay icono de inactivar todavía porque sin el filtro «Ver solo
 * inactivos» que lo acompaña, inactivar sería irreversible de cara al usuario
 * aunque en la base no lo sea: los dos van juntos o no va ninguno (ver la
 * sección "Catálogos maestros" de la skill de convenciones).
 *
 * La columna de situación sí existe ya, aunque hoy nunca pinte nada: la trae
 * la consulta y la Parte 2 la necesita tal cual.
 */
export function TablaListaPrecios({
  precios,
  buscarMaterialAction,
}: {
  precios: FilaPrecio[];
  buscarMaterialAction: (texto: string) => Promise<MaterialElegible[]>;
}) {
  if (precios.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay ofertas registradas todavía.
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
