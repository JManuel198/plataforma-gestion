import { asc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { epps } from "@/db/schema/epps";
import { patronParcial } from "@/core/busqueda";
import type { FiltrosEpps } from "./filtros";

/**
 * Las columnas que muestra el listado.
 *
 * `createdAt` SÍ entra, mismo criterio que en Materiales y Servicios: es el
 * dato que se pinta en la tabla y en la vista de detalle, no una columna de
 * auditoría que se cuele por descuido. `updatedAt` se queda fuera, que ese no
 * lo mira nadie.
 *
 * NO HAY `activo` QUE SELECCIONAR: esta tabla no tiene esa columna (ver la
 * ficha de EPPs en docs/spec/entidades.md). Por eso esta consulta tampoco
 * filtra por ella, a diferencia de `listarMateriales`, `listarPrecios` y
 * `listarTarifas`.
 */
const columnasListado = {
  id: epps.id,
  codigo: epps.codigo,
  descripcion: epps.descripcion,
  unidad: epps.unidad,
  precio: epps.precio,
  moneda: epps.moneda,
  createdAt: epps.createdAt,
} as const;

/**
 * Lista el catálogo de EPPs aplicando el filtro de búsqueda que venga.
 *
 * UN SOLO FILTRO, así que no hay `and(...)` de varias condiciones como en los
 * otros seis listados: o se busca o no se busca. Cuando entre un segundo
 * filtro, esto vuelve al patrón de siempre (un array de condiciones y un
 * `and(...)` que ignora los `undefined`).
 *
 * Todo se resuelve aquí, nunca en el navegador (regla 1 de AGENTS.md): la
 * pantalla jamás llega a tener en memoria las filas que no coinciden.
 */
export async function listarEpps(filtros: FiltrosEpps = {}) {
  const { busqueda } = filtros;
  // `patronParcial` se IMPORTA de core/, nunca se copia: escapa los comodines
  // del `LIKE` (`%`, `_` y el propio `\`) para que un "50%" escrito en la caja
  // se busque literalmente en vez de actuar como comodín. Es la misma función
  // que usan los otros seis listados — la deuda técnica de AGENTS.md cuenta
  // por qué dejó de estar copiada en cada `queries.ts`.
  const patron = busqueda ? patronParcial(busqueda) : null;

  return db
    .select(columnasListado)
    .from(epps)
    // Las TRES columnas de texto de la tabla, ninguna fuera — ver el
    // comentario de `busqueda` en ./filtros.ts para el porqué, que no es el
    // mismo argumento que en Tarifario. Los números (`precio`) y `moneda`
    // quedan fuera: una coincidencia parcial sobre ellos no responde nada.
    //
    // Las tres son nullable, y eso importa: `ILIKE` sobre NULL da NULL, no
    // `false` — pero dentro de un `or(...)` eso se comporta como "esta no
    // casa", que es exactamente lo que se quiere. Un EPP sin unidad no
    // desaparece de la búsqueda: sigue pudiendo casar por código o por
    // descripción.
    //
    // `.where(undefined)` es "sin WHERE", así que sin búsqueda la consulta
    // devuelve el catálogo entero.
    .where(
      patron
        ? or(
            ilike(epps.codigo, patron),
            ilike(epps.descripcion, patron),
            ilike(epps.unidad, patron),
          )
        : undefined,
    )
    // Por código, que desde que se autogenera es además el orden de alta:
    // `EPP.000001`, `EPP.000002`… Con 6 dígitos fijos y ceros a la izquierda,
    // el orden alfabético y el numérico coinciden, así que ordenar el texto no
    // hace falsos saltos (que es justo lo que pasaría con un código de ancho
    // variable). Mismo razonamiento que en `listarMateriales` y
    // `listarServicios`.
    .orderBy(asc(epps.codigo));
}

/** Una fila del listado, con el tipo que de verdad devuelve la consulta. */
export type FilaEpp = Awaited<ReturnType<typeof listarEpps>>[number];

/**
 * POR QUÉ ESTE MÓDULO NO TIENE `tipos.ts`, igual que Servicios y al contrario
 * que Materiales y Lista de precios.
 *
 * En esos dos ese archivo declara un `…Editable` que es la fila del listado
 * MENOS lo que llega formateado aparte (`Omit<…, "updatedAt">`), o MÁS lo que
 * viene de otra tabla (las características de un material). Aquí no hay ni una
 * cosa ni la otra: `columnasListado` ya deja fuera `updatedAt` y no hay tabla
 * hija, así que un `EppEditable` sería un alias exactamente igual a `FilaEpp`
 * — un nombre más que mantener y un salto más que dar al leer, a cambio de
 * nada.
 *
 * Los componentes usan `FilaEpp` directamente. Si algún día este módulo
 * necesita de verdad una forma distinta para el modal —el caso claro sería una
 * tabla hija, como le pasó a Materiales—, ese es el momento de crear
 * `tipos.ts` y no antes.
 */
