/**
 * Cómo se MUESTRAN las dos columnas `numeric` de este catálogo.
 *
 * `cantidad` es `numeric(14,3)` y `descuento` es `numeric(5,2)`, y PostgreSQL
 * devuelve siempre la escala completa: una cantidad de 10 llega como `"10.000"`
 * y un descuento de cero como `"0.00"`. Pintado tal cual, el listado se llena
 * de ceros que no dicen nada — y "0.00 %" se lee como un dato raro en vez de
 * como "sin descuento".
 *
 * OJO CON LA TENTACIÓN DE USAR ESTO PARA IMPORTES: no sirve y no debe. Los
 * montos son enteros en céntimos (regla 2 de AGENTS.md) y se formatean con
 * `formatearMonto` de core/dinero.ts, que además pone el símbolo de la moneda.
 * Esta función es solo para las columnas que NO son dinero.
 */

/**
 * Convierte el texto de una columna `numeric` en algo legible: `"10.000"` →
 * `"10"`, `"2.500"` → `"2.5"`, `"0.00"` → `"0"`, `"1234.5"` → `"1,234.5"`.
 *
 * ES SOLO PRESENTACIÓN. El valor que viaja y se guarda sigue siendo el texto
 * original: `numeric` se tipa con `mode: "string"` precisamente para que no
 * pase por un `number` de JS en el camino a la base. Aquí sí se convierte a
 * `number`, y es seguro porque `numeric(14,3)` tiene como mucho 11 dígitos
 * enteros — muy por debajo de `Number.MAX_SAFE_INTEGER`. Si alguna vez se
 * amplía esa precisión, esta función es lo primero que deja de valer.
 *
 * `maximumFractionDigits: 3` es la escala de `cantidad`, la mayor de las dos.
 */
export function formatearNumerico(valor: string | null): string {
  if (valor === null || valor.trim() === "") return "—";

  const numero = Number(valor);

  if (!Number.isFinite(numero)) return valor;

  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(
    numero,
  );
}
