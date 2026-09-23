import { DIGITOS_CORRELATIVO_EPP, PREFIJO_EPP } from "./constantes";

/**
 * Arma el código visible de un EPP a partir del correlativo ya reservado:
 * `1` → `"EPP.000001"`.
 *
 * Es solo el formateo. Quién decide ese número —y cómo evita que dos EPPs
 * creados a la vez reciban el mismo— vive en `reservarCorrelativo`
 * (`core/correlativo.ts`). Están separados a propósito, igual que en el resto
 * de catálogos: esta función es pura y se lee de un vistazo; la otra toca la
 * base.
 *
 * No recibe año, a diferencia de `formatearCodigoOt`: el correlativo de un EPP
 * es global y no reinicia (ver `PREFIJO_EPP` en constantes.ts).
 */
export function formatearCodigoEpp(correlativo: number): string {
  const numero = String(correlativo).padStart(DIGITOS_CORRELATIVO_EPP, "0");
  return `${PREFIJO_EPP}.${numero}`;
}
