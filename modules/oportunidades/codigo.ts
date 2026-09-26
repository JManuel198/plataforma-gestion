import {
  CODIGO_EMPRESA,
  DIGITOS_CORRELATIVO,
  PREFIJO_OPORTUNIDAD,
} from "./constantes";

/**
 * Arma el código visible de una oportunidad a partir del año y del
 * correlativo ya reservado: `(2026, 1)` → `"OPT.CCM.2026.00001"`.
 *
 * Es solo el formateo. Quién decide ese número —y cómo evita que dos
 * oportunidades creadas a la vez reciban el mismo— vive en
 * `reservarCorrelativoAnual` (core/correlativo.ts). Separados a propósito,
 * igual que en las OT: esta función es pura; la otra toca la base.
 */
export function formatearCodigoOportunidad(
  anio: number,
  correlativo: number,
): string {
  const numero = String(correlativo).padStart(DIGITOS_CORRELATIVO, "0");
  return `${PREFIJO_OPORTUNIDAD}.${CODIGO_EMPRESA}.${anio}.${numero}`;
}
