import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CELDA_FIJA_ANTES_DEL_FIN,
  CELDA_FIJA_FIN,
  CELDA_FIJA_INICIO,
  CLASE_CABECERA,
  CLASE_FILA_CABECERA,
  MarcoTabla,
} from "@/core/components/tabla-listado";
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
 * filas que ya casan y las pinta. Tampoco decide el estado vacío: con cero
 * filas la página no la monta y pinta `EstadoVacio` (core/components/), que
 * distingue "no hay nada" de "nada coincide" y necesita el disparador del
 * modal de alta, que esta tabla no tiene.
 */
export function TablaListaPrecios({
  precios,
  buscarMaterialAction,
}: {
  precios: FilaPrecio[];
  buscarMaterialAction: (texto: string) => Promise<MaterialElegible[]>;
}) {
  // Once columnas no caben holgadas ni en escritorio: la tabla se desplaza en
  // horizontal dentro de su marco, con el código fijo a la izquierda y la
  // situación y las acciones fijas a la derecha (ver core/components/
  // tabla-listado.tsx).
  return (
    <MarcoTabla>
      <Table>
        <TableHeader>
          <TableRow className={CLASE_FILA_CABECERA}>
            <TableHead
              className={`${CELDA_FIJA_INICIO} ${CLASE_CABECERA} px-3`}
            >
              Código de oferta
            </TableHead>
            <TableHead className={CLASE_CABECERA}>Material</TableHead>
            <TableHead className={CLASE_CABECERA}>Proveedor</TableHead>
            <TableHead className={CLASE_CABECERA}>Unidad</TableHead>
            <TableHead className={`${CLASE_CABECERA} text-right`}>
              Cantidad
            </TableHead>
            <TableHead className={`${CLASE_CABECERA} text-right`}>
              Precio de lista
            </TableHead>
            <TableHead className={`${CLASE_CABECERA} text-right`}>
              Descuento
            </TableHead>
            <TableHead className={`${CLASE_CABECERA} text-right`}>
              Precio
            </TableHead>
            {/* En dos líneas, como en el mockup: es la cabecera más larga y
                su contenido (una fecha) es corto. */}
            <TableHead className={`${CLASE_CABECERA} w-24 whitespace-normal`}>
              Fecha de actualización
            </TableHead>
            <TableHead
              className={`${CELDA_FIJA_ANTES_DEL_FIN} ${CLASE_CABECERA} px-3`}
            >
              Situación
            </TableHead>
            <TableHead
              className={`${CELDA_FIJA_FIN} ${CLASE_CABECERA} text-right`}
            >
              Acciones
            </TableHead>
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
    </MarcoTabla>
  );
}
