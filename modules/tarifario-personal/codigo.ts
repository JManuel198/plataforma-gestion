import { DIGITOS_CORRELATIVO_TARIFA, PREFIJO_TARIFA } from "./constantes";

/**
 * Arma el código visible de una tarifa a partir del correlativo ya reservado:
 * `1` → `"PRS.0001"`.
 *
 * Es solo el formateo. Quién decide ese número —y cómo evita que dos tarifas
 * creadas a la vez reciban el mismo— vive en `reservarCorrelativo`
 * (`core/correlativo.ts`). Están separados a propósito, igual que en
 * Materiales, Lista de precios y Servicios: esta función es pura y se lee de un
 * vistazo; la otra toca la base.
 *
 * No recibe año, a diferencia de `formatearCodigoOt`: el correlativo de una
 * tarifa es global y no reinicia. Y son CUATRO dígitos, no siete como sus
 * hermanos — ver `PREFIJO_TARIFA` en constantes.ts, donde está el porqué y el
 * límite que eso asume.
 */
export function formatearCodigoTarifa(correlativo: number): string {
  const numero = String(correlativo).padStart(DIGITOS_CORRELATIVO_TARIFA, "0");
  return `${PREFIJO_TARIFA}.${numero}`;
}
