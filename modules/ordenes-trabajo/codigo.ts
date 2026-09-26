import { CODIGO_EMPRESA, DIGITOS_CORRELATIVO, PREFIJO_OT } from "./constantes";

/**
 * Arma el código visible de una OT a partir del año y del correlativo que ya
 * se reservó: `(2026, 1)` → `"OT.CCM.2026.0001"`.
 *
 * Es solo el formateo. Quién decide ese número —y cómo evita que dos OT
 * creadas a la vez reciban el mismo— vive en `reservarCorrelativoAnual`
 * (core/correlativo.ts). Están separados a propósito: esta
 * función es pura y se lee de un vistazo; la otra toca la base de datos.
 */
export function formatearCodigoOt(anio: number, correlativo: number): string {
  const numero = String(correlativo).padStart(DIGITOS_CORRELATIVO, "0");
  return `${PREFIJO_OT}.${CODIGO_EMPRESA}.${anio}.${numero}`;
}

// `anioVigente` —el año con el que se numera una OT nueva, en la zona horaria
// del negocio— vive en core/correlativo.ts desde el 2026-09-25: el Embudo de
// oportunidades es su segundo consumidor.
