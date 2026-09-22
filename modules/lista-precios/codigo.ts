import {
  DIGITOS_CORRELATIVO_OFERTA,
  PREFIJO_OFERTA,
} from "./constantes";

/**
 * Arma el código visible de una oferta a partir del correlativo ya reservado:
 * `1` → `"OFFT.0000001"`.
 *
 * Es solo el formateo. Quién decide ese número —y cómo evita que dos ofertas
 * creadas a la vez reciban el mismo— vive en `reservarCorrelativo`
 * (`core/correlativo.ts`). Están separados a propósito, igual que en Órdenes de
 * Trabajo: esta función es pura y se lee de un vistazo; la otra toca la base.
 *
 * No recibe año, a diferencia de `formatearCodigoOt`: el correlativo de una
 * oferta es global y no reinicia (ver `PREFIJO_OFERTA` en constantes.ts).
 */
export function formatearCodigoOferta(correlativo: number): string {
  const numero = String(correlativo).padStart(DIGITOS_CORRELATIVO_OFERTA, "0");
  return `${PREFIJO_OFERTA}.${numero}`;
}
