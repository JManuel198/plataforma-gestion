import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Zona horaria del negocio. Única en todo el sistema: con ella se cuenta el
 * año del correlativo de OT (modules/ordenes-trabajo/codigo.ts) y con ella se
 * muestra cualquier fecha. Si estas dos dejan de coincidir, una OT puede
 * quedar numerada con un año y mostrada con otro.
 *
 * Vive aquí, fuera de los módulos de negocio, y no dentro de
 * modules/ordenes-trabajo/: es transversal, y cualquier módulo futuro que
 * muestre fechas la necesita sin tener que importar de otro módulo.
 */
export const ZONA_HORARIA = "America/Lima";

/**
 * Formatea un timestamp de la base en la zona del negocio.
 *
 * Existe para que no haya un `dayjs(...).format(...)` suelto por cada tabla:
 * las columnas se guardan sin zona horaria, así que el criterio de cómo se
 * leen tiene que estar en un solo sitio.
 *
 * Recibe `Date`, nunca el texto crudo de Postgres: una cadena como
 * "2026-09-19 06:54:06" la interpretaría dayjs en la zona local y se saltaría
 * justamente la garantía que da el type parser de db/index.ts. El `Date` que
 * entrega node-postgres ya es el instante correcto.
 */
export function formatearFecha(fecha: Date, formato = "DD/MM/YYYY"): string {
  return dayjs(fecha).tz(ZONA_HORARIA).format(formato);
}
