import {
  DIGITOS_CORRELATIVO_EMPRESA,
  PREFIJO_EMPRESA,
  SEPARADOR_CODIGO_EMPRESA,
} from "./constantes";

/**
 * Arma el código visible de una empresa a partir del correlativo ya reservado:
 * `1` → `"CLT-0001"`.
 *
 * Es solo el formateo. Quién decide ese número —y cómo evita que dos empresas
 * creadas a la vez reciban el mismo— vive en `reservarCorrelativo`
 * (`core/correlativo.ts`). Separados a propósito, igual que en los catálogos:
 * esta función es pura; la otra toca la base.
 */
export function formatearCodigoEmpresa(correlativo: number): string {
  const numero = String(correlativo).padStart(DIGITOS_CORRELATIVO_EMPRESA, "0");
  return `${PREFIJO_EMPRESA}${SEPARADOR_CODIGO_EMPRESA}${numero}`;
}
