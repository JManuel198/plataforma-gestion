import { and, asc, count, desc, eq, ilike, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import { listaPrecios } from "@/db/schema/lista-precios";
import { materiales } from "@/db/schema/materiales";
import { patronParcial } from "@/core/busqueda";
import type { FiltrosListaPrecios } from "./filtros";
import { calcularPrecio } from "./precio";

/**
 * Las columnas del listado, con el material al que apunta cada oferta.
 *
 * EL JOIN ES CONTRA `materiales` Y ES OBLIGATORIO (`innerJoin`), no un
 * `leftJoin` defensivo: `material_id` es `NOT NULL` y tiene FK, así que toda
 * fila tiene su material. Un `leftJoin` sugeriría que puede no tenerlo y
 * obligaría a pintar un caso que la base no permite.
 *
 * `material.activo` NO se filtra: una oferta sobre un material que después se
 * inactivó sigue siendo un precio real que se cotizó, y esconderla haría
 * desaparecer filas del listado sin que nadie las haya tocado. Lo que sí impide
 * un material inactivo es elegirlo para una oferta NUEVA — eso lo resuelve
 * `buscarMaterialesParaSeleccion` en Materiales.
 */
const columnasListado = {
  id: listaPrecios.id,
  codigo_oferta: listaPrecios.codigo_oferta,
  material_id: listaPrecios.material_id,
  material_descripcion: materiales.descripcion,
  material_codigo_interno: materiales.codigo_interno,
  proveedor: listaPrecios.proveedor,
  unidad: listaPrecios.unidad,
  cantidad: listaPrecios.cantidad,
  precio_lista: listaPrecios.precio_lista,
  descuento: listaPrecios.descuento,
  moneda: listaPrecios.moneda,
  activo: listaPrecios.activo,
  // "Fecha de actualización" en la interfaz es ESTA columna, no una columna
  // propia: `updated_at` ya la mantiene el `$onUpdate` de Drizzle en cada
  // edición. Una columna «fecha» aparte sería un segundo dato que alguien
  // tendría que acordarse de escribir, y que se quedaría atrás en cuanto no
  // lo hiciera.
  updatedAt: listaPrecios.updatedAt,
} as const;

/**
 * Cuántas ofertas hay en la vista de activas o en la de inactivas, sin mirar la
 * búsqueda: es el contador de la barra de filtros («86 ofertas activas»), que
 * responde "¿cuántas hay?", no "¿cuántas encontré?".
 *
 * Mismo criterio de alternancia que `listarPrecios`: una vista u otra, nunca
 * las dos sumadas.
 */
export async function contarPrecios(inactivos = false): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(listaPrecios)
    .where(eq(listaPrecios.activo, inactivos ? false : true));

  return fila?.total ?? 0;
}

/**
 * Lista las ofertas del catálogo aplicando los filtros que vengan.
 *
 * Por defecto solo las activas: la baja es lógica (`activo = false`, nunca un
 * DELETE — regla invariable 9), pero de cara al usuario tiene que verse como un
 * borrado. Quien quiera ver las inactivas lo pide explícitamente con
 * `inactivos`.
 *
 * Todo se resuelve en la consulta, nunca en el navegador.
 */
export async function listarPrecios(filtros: FiltrosListaPrecios = {}) {
  const { busqueda, inactivos } = filtros;
  const patron = busqueda ? patronParcial(busqueda) : null;

  const condiciones = [
    // El filtro ALTERNA entre dos vistas excluyentes, no acumula: sin él se ven
    // las activas, con él SOLO las inactivas. Nunca
    // `inactivos ? undefined : eq(activo, true)` —o sea, sin condición—, que es
    // el bug que tuvieron Materiales y Personal: la vista de inactivos mostraba
    // TAMBIÉN los activos, así que al reactivar una fila seguía ahí. Un
    // `undefined` dentro de un `and(...)` desaparece en silencio y no significa
    // "no filtrar por esto" cuando la intención era filtrar al revés.
    eq(listaPrecios.activo, inactivos ? false : true),
    // Las tres columnas del buscador. `proveedor` y `descripcion` son
    // `nullable`, y eso importa aquí: `ILIKE` sobre NULL da NULL, no false —
    // pero dentro de un `or(...)` eso se comporta como "esta no casa", que es
    // exactamente lo que se quiere. Una oferta sin proveedor no desaparece de
    // la búsqueda: sigue pudiendo casar por código o por material.
    //
    // `materiales.descripcion` se busca en la tabla del JOIN, no en una copia
    // local: `lista_precios` guarda la FK del material, no su texto. Por eso el
    // buscador y el listado comparten una sola consulta en vez de filtrar
    // después en memoria.
    patron
      ? or(
          ilike(listaPrecios.codigo_oferta, patron),
          ilike(listaPrecios.proveedor, patron),
          ilike(materiales.descripcion, patron),
        )
      : undefined,
  ];

  const filas = await db
    .select(columnasListado)
    .from(listaPrecios)
    .innerJoin(materiales, eq(listaPrecios.material_id, materiales.id))
    .where(and(...condiciones))
    // Lo último registrado primero: a diferencia de Materiales —que se ordena
    // por código porque se consulta como una lista de papel— una lista de
    // precios se mira para ver qué se cotizó hace poco.
    .orderBy(desc(listaPrecios.updatedAt));

  // El precio se calcula AQUÍ, en el servidor, y viaja ya resuelto a la tabla
  // (regla invariable 1 de AGENTS.md). No es una columna: ver precio.ts para el
  // porqué completo.
  return filas.map((fila) => ({
    ...fila,
    precio:
      fila.precio_lista === null
        ? null
        : calcularPrecio(fila.precio_lista, fila.descuento),
  }));
}

/** Una fila del listado, con el tipo que de verdad devuelve la consulta. */
export type FilaPrecio = Awaited<ReturnType<typeof listarPrecios>>[number];

/**
 * Cuántas sugerencias de proveedor devuelve la búsqueda del modal.
 *
 * Mismo criterio y mismo número que `MAXIMO_RESULTADOS_SELECCION` en
 * Materiales: la lista se pinta entera, así que el tope lo pone la consulta, y
 * diez es lo que cabe leer sin desplazarse. Aquí pesa además que esto es una
 * ayuda, no el camino principal — si el proveedor buscado no está entre los
 * diez primeros, escribirlo entero sigue siendo una respuesta válida.
 */
const MAXIMO_SUGERENCIAS_PROVEEDOR = 10;

/**
 * Los proveedores ya usados que casan con el texto, para sugerirlos en el modal.
 *
 * NO HAY TABLA DE PROVEEDORES, y esta consulta es la consecuencia directa de
 * eso: `lista_precios.proveedor` es texto libre (ver db/schema/lista-precios.ts
 * y la ficha en docs/spec/entidades.md), así que el "catálogo" de proveedores
 * es literalmente lo ya escrito en otras ofertas. Por eso es un
 * `selectDistinct` sobre esta misma tabla y devuelve textos sueltos, no filas
 * con identidad: no hay un registro de proveedor que elegir, solo un nombre que
 * repetir igual que la vez anterior.
 *
 * Lo que esto resuelve es la disgregación por tecleo — "Ferretería Lima" y
 * "ferreteria lima" conviviendo como si fueran dos proveedores distintos. Lo
 * que NO hace es impedir un nombre nuevo: el campo sigue siendo texto libre y
 * lo que el usuario escriba se guarda tal cual (ver `CampoConSugerencias` en
 * core/components/).
 *
 * NO FILTRA POR `activo`, a diferencia del listado y a propósito: el proveedor
 * de una oferta inactiva sigue siendo un proveedor real con el que se trabajó,
 * y esconderlo de las sugerencias haría que alguien lo volviera a teclear a
 * mano —probablemente distinto— que es justo lo que esto evita. La bandera
 * `activo` habla de la vigencia de la OFERTA, no de la existencia del
 * proveedor.
 */
export async function buscarProveedores(texto: string): Promise<string[]> {
  const patron = patronParcial(texto);

  const filas = await db
    .selectDistinct({ proveedor: listaPrecios.proveedor })
    .from(listaPrecios)
    .where(
      and(
        // El `ILIKE` ya descarta los NULL por sí solo (NULL no casa con nada),
        // pero decirlo explícitamente es lo que hace evidente —leyendo la
        // consulta y sin saber la semántica del NULL de SQL— que de aquí no
        // puede salir una sugerencia vacía.
        isNotNull(listaPrecios.proveedor),
        ilike(listaPrecios.proveedor, patron),
      ),
    )
    // Alfabético: es una lista de nombres sin más orden natural que ese. El
    // `DISTINCT` de PostgreSQL exige que el ORDER BY sea sobre una columna
    // seleccionada, y lo es.
    .orderBy(asc(listaPrecios.proveedor))
    .limit(MAXIMO_SUGERENCIAS_PROVEEDOR);

  // El `isNotNull` de arriba ya garantiza esto en la base; el filtro está aquí
  // para que TypeScript lo sepa también (la columna es `text | null`).
  return filas
    .map((fila) => fila.proveedor)
    .filter((proveedor): proveedor is string => proveedor !== null);
}
