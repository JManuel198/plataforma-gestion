import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { servicios } from "@/db/schema/servicios";
import { patronParcial } from "@/core/busqueda";
import type { FiltrosServicios } from "./filtros";
import type { Paginacion } from "@/core/paginacion";

/**
 * Las columnas que muestra el listado.
 *
 * `createdAt` SÍ entra, mismo criterio que en Materiales: es el dato que se
 * pinta en la tabla y en la vista de detalle, no una columna de auditoría que
 * se cuele por descuido. `updatedAt` se queda fuera, que ese no lo mira nadie.
 *
 * NO HAY `activo` QUE SELECCIONAR: esta tabla no tiene esa columna (ver la
 * ficha de Servicios en docs/spec/entidades.md). Por eso esta consulta tampoco
 * filtra por ella, a diferencia de `listarMateriales` y `listarPrecios`.
 */
const columnasListado = {
  id: servicios.id,
  codigo: servicios.codigo,
  servicio: servicios.servicio,
  categoria: servicios.categoria,
  unidad: servicios.unidad,
  precio: servicios.precio,
  moneda: servicios.moneda,
  createdAt: servicios.createdAt,
} as const;

/**
 * Las condiciones del listado, compartidas por `listarServicios` y
 * `contarResultados`. Tienen que ser EXACTAMENTE las mismas en las dos: si el
 * conteo filtrara distinto que la página, el pie diría «1–10 de 14» sobre un
 * resultado de otro tamaño, y la última página podría salir vacía.
 */
function condicionesListado(filtros: FiltrosServicios) {
  const { busqueda, categoria } = filtros;
  const patron = busqueda ? patronParcial(busqueda) : null;

  return and(
    categoria ? eq(servicios.categoria, categoria) : undefined,
    // Las tres columnas del buscador. `codigo` y `servicio` son las mismas que
    // en cualquier catálogo; `unidad` SÍ entra aquí a diferencia de Materiales
    // y Lista de precios — ver el comentario de `busqueda` en ../filtros.ts
    // para el porqué de esa diferencia deliberada.
    //
    // Las tres son nullable, y eso importa: `ILIKE` sobre NULL da NULL, no
    // `false` — pero dentro de un `or(...)` eso se comporta como "esta no
    // casa", que es exactamente lo que se quiere. Un servicio sin unidad no
    // desaparece de la búsqueda: sigue pudiendo casar por código o por nombre.
    patron
      ? or(
          ilike(servicios.codigo, patron),
          ilike(servicios.servicio, patron),
          ilike(servicios.unidad, patron),
        )
      : undefined,
  );
}

/**
 * Cuántos servicios casan con los filtros, en todas las páginas: el «de N» del
 * pie de la tabla. Mismo `FROM` y mismas condiciones que `listarServicios`.
 */
export async function contarResultados(filtros: FiltrosServicios): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(servicios)
    // `and()` ignora los `undefined` y devuelve `undefined` si no queda
    // ninguna condición — que es exactamente "sin WHERE".
    .where(condicionesListado(filtros));

  return fila?.total ?? 0;
}

/**
 * Lista el catálogo de servicios aplicando los filtros que vengan.
 *
 * Los dos filtros se combinan con AND entre sí — elegir una categoría no borra
 * el texto buscado, y viceversa. Mismo criterio que `listarOrdenesTrabajo`
 * combinando `estado`, `busqueda` y fechas.
 *
 * SIN FILTRO DE INACTIVOS, a diferencia de `listarMateriales` y
 * `listarPrecios`: esta tabla no tiene columna `activo`, así que no hay nada
 * que alternar y la consulta siempre devuelve todo lo que exista (dentro de
 * los filtros de texto/categoría que se pidan).
 *
 * Todo se resuelve aquí, nunca en el navegador.
 *
 * Paginada con `LIMIT`/`OFFSET`: `pagina` sale de `calcularPaginacion`
 * (core/), que necesita antes el total de `contarResultados`.
 */
export async function listarServicios(
  filtros: FiltrosServicios,
  pagina: Pick<Paginacion, "limite" | "desplazamiento">,
) {


  return db
    .select(columnasListado)
    .from(servicios)
    // `and()` ignora los `undefined` y devuelve `undefined` si no queda
    // ninguna condición — que es exactamente "sin WHERE".
    .where(condicionesListado(filtros))
    // Por código, que desde que se autogenera es además el orden de alta:
    // `SRV.0000001`, `SRV.0000002`… Con 7 dígitos fijos y ceros a la izquierda,
    // el orden alfabético y el numérico coinciden, así que ordenar el texto no
    // hace falsos saltos (que es justo lo que pasaría con un código de ancho
    // variable). Mismo razonamiento que en `listarMateriales`.
    .orderBy(asc(servicios.codigo))
    .limit(pagina.limite)
    .offset(pagina.desplazamiento);
}

/** Una fila del listado, con el tipo que de verdad devuelve la consulta. */
export type FilaServicio = Awaited<ReturnType<typeof listarServicios>>[number];

/**
 * POR QUÉ ESTE MÓDULO NO TIENE `tipos.ts`, y los otros tres sí.
 *
 * En Materiales y Lista de precios ese archivo declara un `…Editable` que es la
 * fila del listado MENOS lo que llega formateado aparte (`Omit<…,
 * "updatedAt">`), o MÁS lo que viene de otra tabla (las características de un
 * material). Aquí no hay ni una cosa ni la otra: `columnasListado` ya deja
 * fuera `updatedAt` y no hay tabla hija, así que un `ServicioEditable` sería un
 * alias exactamente igual a `FilaServicio` — un nombre más que mantener y un
 * salto más que dar al leer, a cambio de nada.
 *
 * Los componentes usan `FilaServicio` directamente. Si algún día este módulo
 * necesita de verdad una forma distinta para el modal —el caso claro sería una
 * tabla hija, como le pasó a Materiales—, ese es el momento de crear `tipos.ts`
 * y no antes.
 *
 * `MaterialElegible` de Lista de precios es otra cosa y no sirve de precedente:
 * aquel existe para cruzar la frontera entre dos módulos sin importar en cruz
 * (AGENTS.md, Arquitectura). Servicios hoy no cruza ninguna.
 */
