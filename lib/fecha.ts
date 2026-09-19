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

/**
 * Hoy, en la zona del negocio, con el formato que espera un
 * `<input type="date">` (`YYYY-MM-DD`).
 *
 * Se calcula en el servidor y viaja como prop al formulario: si lo calculara
 * el navegador, un usuario con el reloj en otra zona vería un día distinto al
 * que la base de datos va a escribir con `DEFAULT now()`, y además habría
 * desajuste de hidratación (el HTML del servidor y el del cliente no
 * coincidirían).
 */
export function hoyIso(): string {
  return dayjs().tz(ZONA_HORARIA).format("YYYY-MM-DD");
}

/**
 * El instante en que empieza ese día en la zona del negocio.
 *
 * Existe para los filtros por fecha del listado. La columna `fecha_creacion`
 * es `timestamp` sin zona y se guarda en UTC (ver db/index.ts), así que
 * comparar contra el texto crudo "2026-09-19" filtraría desde las 00:00 UTC —
 * cinco horas antes de que empiece el día en Lima, y por tanto arrastrando OT
 * de la tarde del día anterior.
 *
 * `fechaIso` tiene que venir ya validada como fecha real (`z.iso.date()` en
 * schema.ts); aquí no se vuelve a comprobar.
 */
export function inicioDelDia(fechaIso: string): Date {
  return dayjs.tz(fechaIso, ZONA_HORARIA).startOf("day").toDate();
}

/**
 * El instante en que empieza el día SIGUIENTE, en la zona del negocio.
 *
 * Es lo que usa el filtro `hasta`, con un `<` en vez de un `<=`: el usuario
 * espera que "hasta el 19" incluya todo el 19, y un `<=` contra el inicio del
 * 19 dejaría fuera cualquier OT creada después de medianoche.
 */
export function inicioDelDiaSiguiente(fechaIso: string): Date {
  return dayjs.tz(fechaIso, ZONA_HORARIA).startOf("day").add(1, "day").toDate();
}
