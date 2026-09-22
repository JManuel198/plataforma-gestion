import { ZONA_HORARIA } from "@/lib/fecha";
import { CODIGO_EMPRESA, DIGITOS_CORRELATIVO, PREFIJO_OT } from "./constantes";

/**
 * Arma el código visible de una OT a partir del año y del correlativo que ya
 * se reservó: `(2026, 1)` → `"OT.CCM.2026.0001"`.
 *
 * Es solo el formateo. Quién decide ese número —y cómo evita que dos OT
 * creadas a la vez reciban el mismo— vive en `reservarCorrelativoAnual`
 * (modules/ordenes-trabajo/correlativo.ts). Están separados a propósito: esta
 * función es pura y se lee de un vistazo; la otra toca la base de datos.
 */
export function formatearCodigoOt(anio: number, correlativo: number): string {
  const numero = String(correlativo).padStart(DIGITOS_CORRELATIVO, "0");
  return `${PREFIJO_OT}.${CODIGO_EMPRESA}.${anio}.${numero}`;
}

/**
 * El año con el que se numera una OT nueva.
 *
 * Se calcula en la zona horaria del negocio, no en la del servidor: en Vercel
 * el reloj corre en UTC, así que una OT creada el 31 de diciembre a las 20:00
 * en Lima ya es 1 de enero en UTC y se numeraría con el año siguiente. Cinco
 * horas al año en las que el correlativo saltaría de año antes de tiempo, y
 * el `RESTART` anual quedaría corrido respecto al calendario que ve el
 * cliente.
 */
export function anioVigente(fecha: Date = new Date()): number {
  // Misma ZONA_HORARIA que usa formatearFecha() para mostrar: el año con el
  // que se numera una OT y el que se ve en pantalla salen de la misma fuente.
  const formateador = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
  });

  return Number(formateador.format(fecha));
}
