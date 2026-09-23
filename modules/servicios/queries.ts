import { asc } from "drizzle-orm";
import { db } from "@/db";
import { servicios } from "@/db/schema/servicios";

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
 * Lista el catálogo de servicios entero.
 *
 * SIN FILTROS TODAVÍA, y es el estado real de la Parte 1, no un olvido:
 *
 * - No hay buscador. Llega en la Parte 2, igual que en Materiales y Lista de
 *   precios, y cuando llegue el patrón es `patronParcial` de core/busqueda.ts
 *   sobre `codigo` y `servicio` — nunca una copia nueva del escape de
 *   comodines (esa lección la dejó escrita la deuda técnica de AGENTS.md).
 * - No hay filtro de inactivos porque no hay columna `activo`. Mientras no la
 *   haya, esta consulta devuelve TODO lo que existe, y eso es lo correcto: no
 *   hay nada oculto que un filtro pudiera revelar.
 *
 * Cuando aparezcan, se resuelven en la consulta y nunca en el navegador.
 */
export async function listarServicios() {
  return db
    .select(columnasListado)
    .from(servicios)
    // Por código, que desde que se autogenera es además el orden de alta:
    // `SRV.0000001`, `SRV.0000002`… Con 7 dígitos fijos y ceros a la izquierda,
    // el orden alfabético y el numérico coinciden, así que ordenar el texto no
    // hace falsos saltos (que es justo lo que pasaría con un código de ancho
    // variable). Mismo razonamiento que en `listarMateriales`.
    .orderBy(asc(servicios.codigo));
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
