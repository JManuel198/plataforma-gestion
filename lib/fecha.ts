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
 * el criterio de en qué zona se muestra una fecha tiene que estar en un solo
 * sitio.
 *
 * Recibe `Date`, nunca el texto crudo de Postgres: node-postgres ya entrega
 * el instante correcto para las columnas `timestamptz` del esquema (el texto
 * que devuelve Postgres trae el offset explícito), así que no hace falta
 * reinterpretar nada aquí — solo elegir en qué zona se muestra.
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
 * Existe para los filtros por fecha del listado. Comparar contra el texto
 * crudo "2026-09-19" filtraría desde las 00:00 UTC — cinco horas antes de que
 * empiece el día en Lima, y por tanto arrastrando OT de la tarde del día
 * anterior.
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

/**
 * El instante que corresponde a una fecha y hora escritas en un `<input
 * type="datetime-local">` (`2026-09-25T10:30`, sin zona), leídas en la zona
 * del negocio: quien escribe "10:30" quiere decir las 10:30 de Lima, no las de
 * UTC en que corre el servidor.
 *
 * `fechaHora` tiene que venir ya validada (`z.iso.datetime({ local: true })`);
 * aquí no se comprueba.
 */
export function instanteDeFechaHoraLocal(fechaHora: string): Date {
  return dayjs.tz(fechaHora, ZONA_HORARIA).toDate();
}

/**
 * Edad en años cumplidos a partir de una fecha de nacimiento `YYYY-MM-DD`.
 *
 * POR QUÉ ES UNA FUNCIÓN Y NO UNA COLUMNA: la edad no es un dato, es una
 * consecuencia de dos fechas. Guardada en `personal.edad` sería correcta el
 * día que se escribe y falsa a partir del siguiente cumpleaños, y nadie se
 * enteraría — no hay error, solo un número que envejece mal. Se calcula cada
 * vez que se muestra.
 *
 * El "hoy" contra el que se compara sale de la zona del negocio, no del reloj
 * del proceso: en Vercel el servidor corre en UTC, cinco horas por delante de
 * Lima, así que entre las 19:00 y la medianoche daría la edad de mañana. Para
 * alguien que cumple años hoy, eso es un año de diferencia.
 *
 * `dayjs.diff(..., "year")` ya trunca hacia abajo, que es justo lo que
 * significa "años cumplidos": el día antes del cumpleaños todavía es la edad
 * anterior.
 *
 * `fechaIso` tiene que venir ya validada (`z.iso.date()`); aquí no se
 * comprueba. Una fecha futura devolvería un número negativo — lo impide el
 * esquema de Zod, no esta función.
 */
export function calcularEdad(fechaIso: string): number {
  return dayjs()
    .tz(ZONA_HORARIA)
    .startOf("day")
    .diff(dayjs.tz(fechaIso, ZONA_HORARIA).startOf("day"), "year");
}
