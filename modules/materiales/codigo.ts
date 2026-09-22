import {
  DIGITOS_CORRELATIVO,
  PREFIJO_MATERIAL,
} from "./constantes";

/**
 * Arma el código visible de un material a partir del correlativo que ya se
 * reservó: `1` → `"MAT.0000001"`.
 *
 * Es solo el formateo. Quién decide ese número —y cómo evita que dos altas
 * simultáneas reciban el mismo— vive en `reservarCorrelativo`
 * (core/correlativo.ts). Están separados a propósito, igual que en OT: esta
 * función es pura y se lee de un vistazo; la otra toca la base de datos.
 *
 * No recibe año ni ningún otro segmento, y no es un olvido: el correlativo de
 * Materiales es global y no reinicia (ver `constantes.ts`), así que el código
 * queda determinado solo por el número.
 */
export function formatearCodigoMaterial(correlativo: number): string {
  const numero = String(correlativo).padStart(DIGITOS_CORRELATIVO, "0");
  return `${PREFIJO_MATERIAL}.${numero}`;
}
