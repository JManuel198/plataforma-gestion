import {
  DIGITOS_CORRELATIVO_SERVICIO,
  PREFIJO_SERVICIO,
} from "./constantes";

/**
 * Arma el código visible de un servicio a partir del correlativo ya reservado:
 * `1` → `"SRV.0000001"`.
 *
 * Es solo el formateo. Quién decide ese número —y cómo evita que dos servicios
 * creados a la vez reciban el mismo— vive en `reservarCorrelativo`
 * (`core/correlativo.ts`). Están separados a propósito, igual que en Materiales
 * y Lista de precios: esta función es pura y se lee de un vistazo; la otra toca
 * la base.
 *
 * No recibe año, a diferencia de `formatearCodigoOt`: el correlativo de un
 * servicio es global y no reinicia (ver `PREFIJO_SERVICIO` en constantes.ts).
 */
export function formatearCodigoServicio(correlativo: number): string {
  const numero = String(correlativo).padStart(DIGITOS_CORRELATIVO_SERVICIO, "0");
  return `${PREFIJO_SERVICIO}.${numero}`;
}
