import type { Moneda } from "./monedas";

/**
 * Conversión y formato de importes.
 *
 * VIVE EN core/ DESDE 2026-09-22. Estuvo en `modules/ordenes-trabajo/dinero.ts`
 * mientras la OT era la única entidad con importes; `modules/lista-precios/` es
 * la segunda, y la regla de AGENTS.md (Arquitectura) es explícita: cuando una
 * segunda entidad necesita algo que vive en un módulo, se mueve a core/ —
 * terreno neutral—, nunca se importa en cruz entre módulos.
 *
 * Todo importe del sistema se guarda como entero en la unidad mínima
 * (céntimos), nunca como float — regla invariable 2 de AGENTS.md. Estas tres
 * funciones son la única frontera entre ese entero y lo que ve o escribe el
 * usuario.
 */

/**
 * Convierte el monto que escribe el usuario ("150.50", "150,5", "150") al
 * entero en céntimos que se guarda en la base de datos (15050, 15050, 15000).
 *
 * Se parte la cadena en texto en vez de multiplicar por 100: `150.50 * 100`
 * en coma flotante da 15050.000000000002, y un céntimo perdido por redondeo
 * en una cotización es un error que nadie encuentra después.
 *
 * Espera un monto ya validado por `montoSchema` — no valida el formato.
 */
export function aCentimos(monto: string): number {
  const [enteros, decimales = ""] = monto.trim().replace(",", ".").split(".");
  return Number(enteros) * 100 + Number(decimales.padEnd(2, "0"));
}

/**
 * El camino de vuelta: céntimos a monto decimal en texto plano ("15050" →
 * "150.50"). Para rellenar el formulario de edición con lo que el usuario
 * escribió en su momento.
 */
export function aMontoDecimal(centimos: number): string {
  const signo = centimos < 0 ? "-" : "";
  const absoluto = Math.abs(centimos);
  return `${signo}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, "0")}`;
}

/** Monto en céntimos a texto con símbolo de moneda, para mostrar en pantalla. */
export function formatearMonto(centimos: number, moneda: Moneda): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: moneda,
  }).format(centimos / 100);
}
