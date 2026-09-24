import { z } from "zod";

/**
 * Filas por página en los listados. Diez, como en el mockup de docs/diseno/.
 * Un solo valor para todos los catálogos: si algún día uno necesita otro, se
 * pasa como tercer argumento a `calcularPaginacion`, no se cambia este.
 */
export const TAMANO_PAGINA = 10;

/**
 * La página que llega en la URL (`?pagina=2`). Cualquier cosa que no sea un
 * entero positivo —texto, cero, negativo, el parámetro repetido— se ignora y
 * se trata como la primera página, en vez de reventar la pantalla: mismo
 * criterio que los demás filtros que vienen de `searchParams`.
 */
export const paginaSchema = z.coerce
  .number()
  .int()
  .min(1)
  .optional()
  .catch(undefined);

export type Paginacion = {
  /** La página que se muestra, ya ajustada al rango real (1 si no hay filas). */
  pagina: number;
  totalPaginas: number;
  /** Las filas que casan con los filtros, en todas las páginas. */
  total: number;
  /** Posición (1-based) de la primera y la última fila visibles: «11–14 de 14». */
  desde: number;
  hasta: number;
  /** Para la consulta: `LIMIT` y `OFFSET`. */
  limite: number;
  desplazamiento: number;
};

/**
 * Traduce el total de filas y la página pedida en lo que necesitan la consulta
 * (`limite`, `desplazamiento`) y el pie de la tabla («11–14 de 14»).
 *
 * UNA PÁGINA FUERA DE RANGO SE AJUSTA A LA ÚLTIMA, no devuelve una tabla vacía.
 * Pasa de verdad, no solo con URLs escritas a mano: al dar de baja la única
 * fila de la última página, el `router.refresh()` vuelve a pedir esa misma
 * página, que ya no existe. Mostrar la anterior es lo que el usuario espera;
 * un "no hay resultados" con filas en el catálogo sería mentira.
 *
 * Por eso el total se cuenta ANTES de traer las filas: sin él no se sabe cuál
 * es la última página.
 */
export function calcularPaginacion(
  total: number,
  paginaPedida = 1,
  tamano = TAMANO_PAGINA,
): Paginacion {
  const totalPaginas = Math.max(1, Math.ceil(total / tamano));
  const pagina = Math.min(Math.max(1, paginaPedida), totalPaginas);
  const desplazamiento = (pagina - 1) * tamano;

  return {
    pagina,
    totalPaginas,
    total,
    desde: total === 0 ? 0 : desplazamiento + 1,
    hasta: Math.min(desplazamiento + tamano, total),
    limite: tamano,
    desplazamiento,
  };
}

/**
 * Los números de página que se pintan: todos si son pocos; si son muchos, la
 * primera, la última y las vecinas de la actual, con huecos (`null`) donde se
 * salta. Con 20 páginas y la 9 abierta: 1 … 8 9 10 … 20.
 */
export function paginasVisibles(
  actual: number,
  totalPaginas: number,
): (number | null)[] {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, i) => i + 1);
  }

  const numeros = [
    ...new Set([1, actual - 1, actual, actual + 1, totalPaginas]),
  ]
    .filter((n) => n >= 1 && n <= totalPaginas)
    .sort((a, b) => a - b);

  const resultado: (number | null)[] = [];
  numeros.forEach((n, i) => {
    if (i > 0 && n - numeros[i - 1] > 1) resultado.push(null);
    resultado.push(n);
  });
  return resultado;
}
