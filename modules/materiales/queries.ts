import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { materiales } from "@/db/schema/materiales";
import { materialCaracteristicas } from "@/db/schema/material-caracteristicas";
import { patronParcial } from "@/core/busqueda";
import type { FiltrosMateriales } from "./filtros";

/**
 * Las columnas que muestra el listado: todas las de negocio, más `activo`
 * para poder marcar visualmente las filas inactivas.
 *
 * `createdAt` SÍ entra, a diferencia de los otros listados: desde que se
 * eliminó `fecha_activacion`, la fecha que ve el usuario en la tabla y en la
 * vista de detalle es la de creación del registro. No es una columna de
 * auditoría que se cuele por descuido — es el dato que se pinta. `updatedAt`
 * se queda fuera, que ese sí no lo mira nadie.
 */
const columnasListado = {
  id: materiales.id,
  codigo_interno: materiales.codigo_interno,
  descripcion: materiales.descripcion,
  marca: materiales.marca,
  modelo: materiales.modelo,
  codigo_fabrica: materiales.codigo_fabrica,
  unidad: materiales.unidad,
  activo: materiales.activo,
  createdAt: materiales.createdAt,
} as const;

/**
 * Lista el catálogo de materiales aplicando los filtros que vengan.
 *
 * Por defecto solo los activos: la baja es lógica (`activo = false`, nunca un
 * DELETE — regla invariable 9), pero de cara al usuario tiene que verse como
 * un borrado. Quien quiera ver los inactivos lo pide explícitamente con
 * `inactivos`.
 *
 * Todo se resuelve en la consulta, nunca en el navegador.
 */
export async function listarMateriales(filtros: FiltrosMateriales = {}) {
  const { busqueda, inactivos } = filtros;
  const patron = busqueda ? patronParcial(busqueda) : null;

  const condiciones = [
    // El filtro ALTERNA entre dos vistas excluyentes, no acumula: sin él se
    // ven los activos, con él SOLO los inactivos. Antes era
    // `inactivos ? undefined : eq(activo, true)` —o sea, sin condición— y eso
    // hacía que la vista de inactivos mostrase TAMBIÉN los activos: al
    // reactivar una fila seguía ahí, y una fila que nunca se inactivó
    // aparecía igual. No era un problema de refresco: la consulta ya devolvía
    // esa fila.
    eq(materiales.activo, inactivos ? false : true),
    // Las cuatro columnas del buscador. Son `nullable`, y eso importa aquí:
    // `ILIKE` sobre NULL da NULL, no false — pero dentro de un `or(...)` eso
    // se comporta como "esta no casa", que es exactamente lo que se quiere.
    // Una fila sin marca no desaparece de la búsqueda: sigue pudiendo casar
    // por descripción o por código.
    patron
      ? or(
          ilike(materiales.codigo_interno, patron),
          ilike(materiales.descripcion, patron),
          ilike(materiales.marca, patron),
          ilike(materiales.modelo, patron),
        )
      : undefined,
  ];

  const filas = await db
    .select(columnasListado)
    .from(materiales)
    .where(and(...condiciones))
    // Por código interno, que desde que se autogenera es además el orden de
    // alta: `MAT.0000001`, `MAT.0000002`… Con 7 dígitos fijos y ceros a la
    // izquierda, el orden alfabético y el numérico coinciden, así que ordenar
    // el texto no hace falsos saltos (que es justo lo que pasaría con un
    // código de ancho variable).
    .orderBy(asc(materiales.codigo_interno));

  return conCaracteristicas(filas);
}

/**
 * Cuelga de cada material sus características técnicas, en orden de entrada.
 *
 * UNA SOLA CONSULTA EXTRA PARA TODO EL LISTADO, no una por fila: se piden las
 * características de todos los materiales de la página con un `IN (...)` y se
 * agrupan aquí. Es la diferencia entre dos viajes a la base y N+1, que con un
 * catálogo creciendo es la clase de detalle que no se nota hasta que duele.
 *
 * Van en el listado y no se piden al abrir el modal porque el modal se precarga
 * desde la fila: es el patrón ya establecido en los tres módulos ("la fila ya
 * trae todos los campos que el formulario necesita"). Son como mucho tres
 * líneas de texto por material, así que el coste de traerlas siempre es
 * despreciable frente a una segunda ida al servidor al abrir cada ficha.
 */
async function conCaracteristicas<T extends { id: string }>(filas: T[]) {
  if (filas.length === 0) return [];

  const caracteristicas = await db
    .select({
      material_id: materialCaracteristicas.material_id,
      texto: materialCaracteristicas.texto,
    })
    .from(materialCaracteristicas)
    .where(
      inArray(
        materialCaracteristicas.material_id,
        filas.map((fila) => fila.id),
      ),
    )
    // El orden de entrada es el que se guardó en `orden`; sin este ORDER BY la
    // base no garantiza ninguno y las líneas podrían salir barajadas al reabrir
    // el modal.
    .orderBy(asc(materialCaracteristicas.orden));

  const porMaterial = new Map<string, string[]>();

  for (const fila of caracteristicas) {
    const lista = porMaterial.get(fila.material_id);

    if (lista) lista.push(fila.texto);
    else porMaterial.set(fila.material_id, [fila.texto]);
  }

  return filas.map((fila) => ({
    ...fila,
    caracteristicas: porMaterial.get(fila.id) ?? [],
  }));
}

/** Una fila del listado, con el tipo que de verdad devuelve la consulta. */
export type FilaMaterial = Awaited<ReturnType<typeof listarMateriales>>[number];

/**
 * Cuántos resultados devuelve la búsqueda para seleccionar un material.
 *
 * El componente que los pinta (`BuscadorSeleccion` en core/) muestra la lista
 * entera, así que el tope tiene que ponerlo la consulta. Diez es lo que cabe
 * leer de un vistazo sin desplazarse: si el material buscado no está entre los
 * diez primeros, la respuesta correcta es afinar el texto, no hacer scroll por
 * media tabla.
 */
const MAXIMO_RESULTADOS_SELECCION = 10;

/**
 * Busca materiales para ELEGIR UNO dentro de un formulario de otra entidad
 * (hoy, el modal de Lista de precios).
 *
 * No es `listarMateriales`: aquel alimenta la tabla del catálogo, trae todas
 * las filas que casen y sus filtros viajan en la URL. Este devuelve un puñado
 * de resultados para un desplegable y nunca toca `searchParams`.
 *
 * SOLO DEVUELVE MATERIALES ACTIVOS, y eso es una regla de negocio, no una
 * comodidad: un material inactivo está fuera del catálogo vigente, así que no
 * puede ser el material de una oferta nueva. Las ofertas YA creadas sobre un
 * material que luego se inactiva no se tocan — su FK sigue apuntando a la fila,
 * que nunca se borra (regla invariable 9).
 *
 * Las cuatro columnas buscables son las mismas que el buscador del listado de
 * Materiales —código interno, descripción, marca y modelo—, y por el mismo
 * motivo: quien busca escribe lo que recuerda sin saber en qué columna cae.
 */
export async function buscarMaterialesParaSeleccion(texto: string) {
  const patron = patronParcial(texto);

  return db
    .select({
      id: materiales.id,
      codigo_interno: materiales.codigo_interno,
      descripcion: materiales.descripcion,
      marca: materiales.marca,
      modelo: materiales.modelo,
    })
    .from(materiales)
    .where(
      and(
        eq(materiales.activo, true),
        // `ILIKE` sobre una columna NULL da NULL, que dentro de un `or(...)` se
        // comporta como "esta no casa". Un material sin marca sigue
        // encontrándose por descripción o por código.
        or(
          ilike(materiales.codigo_interno, patron),
          ilike(materiales.descripcion, patron),
          ilike(materiales.marca, patron),
          ilike(materiales.modelo, patron),
        ),
      ),
    )
    .orderBy(asc(materiales.codigo_interno))
    .limit(MAXIMO_RESULTADOS_SELECCION);
}

/** Un resultado de la búsqueda de selección, con el tipo real de la consulta. */
export type MaterialSeleccionable = Awaited<
  ReturnType<typeof buscarMaterialesParaSeleccion>
>[number];

export async function obtenerMaterial(id: string) {
  const [encontrado] = await db
    .select()
    .from(materiales)
    .where(eq(materiales.id, id))
    .limit(1);

  return encontrado ?? null;
}
