import { and, asc, eq, ilike, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import { tarifarioPersonal } from "@/db/schema/tarifario-personal";
import { patronParcial } from "@/core/busqueda";
import type { FiltrosTarifario } from "./filtros";

/**
 * Las columnas que muestra el listado.
 *
 * `createdAt` SÍ entra, mismo criterio que en Materiales y Servicios: es el
 * dato que se pinta en la tabla y en la vista de detalle, no una columna de
 * auditoría que se cuele por descuido. `updatedAt` se queda fuera, que ese no
 * lo mira nadie.
 *
 * `activo` entra desde la Parte 2 (antes no estaba): lo necesitan el chip
 * "Inactivo" de la fila, el dato "Situación" de la vista y `AccionesTarifa`
 * para saber si pintar la equis o el botón de reactivar. Mismo papel que en
 * `listarMateriales` y `listarPrecios`.
 */
const columnasListado = {
  id: tarifarioPersonal.id,
  codigo: tarifarioPersonal.codigo,
  cargo: tarifarioPersonal.cargo,
  unidad: tarifarioPersonal.unidad,
  costo: tarifarioPersonal.costo,
  moneda: tarifarioPersonal.moneda,
  activo: tarifarioPersonal.activo,
  createdAt: tarifarioPersonal.createdAt,
} as const;

/**
 * Lista el tarifario aplicando los filtros que vengan.
 *
 * Los dos filtros se combinan con AND entre sí — cambiar a la vista de
 * inactivas no borra el texto buscado, y viceversa. Mismo criterio que
 * `listarMateriales` y `listarPrecios`.
 *
 * Todo se resuelve aquí, nunca en el navegador (regla 1 de AGENTS.md): la
 * pantalla jamás llega a tener en memoria las filas que no coinciden.
 */
export async function listarTarifas(filtros: FiltrosTarifario = {}) {
  const { busqueda, inactivos } = filtros;
  const patron = busqueda ? patronParcial(busqueda) : null;

  const condiciones = [
    // ALTERNA entre dos vistas excluyentes, NO acumula: sin la bandera se ven
    // las activas, con ella SOLO las inactivas. Nunca
    // `inactivos ? undefined : eq(activo, true)` — eso es no poner condición, y
    // es el bug que estuvo en Materiales y Personal hasta el 2026-09-21: la
    // vista de inactivos devolvía TAMBIÉN las activas, así que al reactivar una
    // fila seguía ahí y una fila que nunca se inactivó aparecía igual. Un
    // `undefined` dentro de un `and(...)` desaparece en silencio, que no es lo
    // mismo que "no filtrar por esto" cuando la intención era filtrar al revés.
    eq(tarifarioPersonal.activo, inactivos ? false : true),
    // Las TRES columnas de texto de la tabla, ninguna fuera — ver el comentario
    // de `busqueda` en ./filtros.ts para por qué `unidad` sí entra aquí y en
    // Materiales no.
    //
    // `cargo` y `unidad` son nullable, y eso importa: `ILIKE` sobre NULL da
    // NULL, no `false` — pero dentro de un `or(...)` eso se comporta como "esta
    // no casa", que es exactamente lo que se quiere. Una tarifa sin unidad no
    // desaparece de la búsqueda: sigue pudiendo casar por código o por cargo.
    patron
      ? or(
          ilike(tarifarioPersonal.codigo, patron),
          ilike(tarifarioPersonal.cargo, patron),
          ilike(tarifarioPersonal.unidad, patron),
        )
      : undefined,
  ];

  return db
    .select(columnasListado)
    .from(tarifarioPersonal)
    // `and()` ignora los `undefined` y devuelve `undefined` si no queda
    // ninguna condición — que es exactamente "sin WHERE".
    .where(and(...condiciones))
    // Por código, que desde que se autogenera es además el orden de alta:
    // `PRS.0001`, `PRS.0002`… Con cuatro dígitos fijos y ceros a la izquierda,
    // el orden alfabético y el numérico coinciden — hasta `PRS.9999`, límite
    // asumido y explicado en `PREFIJO_TARIFA` (./constantes.ts). Mismo
    // razonamiento que en `listarMateriales` y `listarServicios`.
    .orderBy(asc(tarifarioPersonal.codigo));
}

/** Una fila del listado, con el tipo que de verdad devuelve la consulta. */
export type FilaTarifa = Awaited<ReturnType<typeof listarTarifas>>[number];

/**
 * Cuántas sugerencias de cargo devuelve la búsqueda del modal.
 *
 * Mismo criterio y mismo número que `MAXIMO_SUGERENCIAS_PROVEEDOR` en Lista de
 * precios: la lista se pinta entera, así que el tope lo pone la consulta, y
 * diez es lo que cabe leer sin desplazarse. Aquí pesa además que esto es una
 * ayuda, no el camino principal — si el cargo buscado no está entre los diez
 * primeros, escribirlo entero sigue siendo una respuesta válida.
 */
const MAXIMO_SUGERENCIAS_CARGO = 10;

/**
 * Los cargos ya usados que casan con el texto, para sugerirlos en el modal.
 *
 * NO HAY TABLA DE CARGOS, y esta consulta es la consecuencia directa de eso:
 * `tarifario_personal.cargo` es texto libre, así que el "catálogo" de cargos es
 * literalmente lo ya escrito en otras tarifas. Es el mismo planteamiento y la
 * misma forma que `buscarProveedores` en Lista de precios: un `selectDistinct`
 * sobre esta misma tabla que devuelve textos sueltos, no filas con identidad —
 * no hay un registro de cargo que elegir, solo un nombre que repetir igual que
 * la vez anterior.
 *
 * **La lista de sugerencias crece con el uso y nunca está "completa".** El día
 * que se crea la primera tarifa no hay nada que sugerir y el campo tiene que
 * dejar escribir a pelo; a partir de ahí, cada cargo nuevo pasa a ser una
 * sugerencia para el siguiente. Es una decisión tomada, no una carencia: no
 * existe una lista cerrada de cargos válidos y este módulo no la inventa. Queda
 * registrado en docs/spec/preguntas-abiertas.md por si alguna vez se plantea un
 * catálogo de cargos separado del tarifario.
 *
 * Lo que esto resuelve es la disgregación por tecleo — "Operario" y "operario"
 * conviviendo como si fueran dos cargos distintos. Lo que NO hace es impedir un
 * cargo nuevo: el campo sigue siendo texto libre y lo que el usuario escriba se
 * guarda tal cual (ver `CampoConSugerencias` en core/components/).
 *
 * NO SE CRUZA CON `personal.cargo`, ni ahora ni luego: el cliente descartó
 * explícitamente (2026-09-23) cualquier relación entre Personal y este
 * tarifario. Las sugerencias salen de esta tabla y solo de esta tabla.
 *
 * NO FILTRA POR `activo`, a diferencia del listado y a propósito — mismo
 * criterio que `buscarProveedores`: el cargo de una tarifa inactivada sigue
 * siendo un cargo real que se usó, y esconderlo de las sugerencias haría que
 * alguien lo volviera a teclear a mano —probablemente distinto— que es justo lo
 * que esto evita. La bandera `activo` habla de la vigencia de la TARIFA, no de
 * la existencia del cargo.
 */
export async function buscarCargos(texto: string): Promise<string[]> {
  const patron = patronParcial(texto);

  const filas = await db
    .selectDistinct({ cargo: tarifarioPersonal.cargo })
    .from(tarifarioPersonal)
    .where(
      and(
        // El `ILIKE` ya descarta los NULL por sí solo (NULL no casa con nada),
        // pero decirlo explícitamente es lo que hace evidente —leyendo la
        // consulta y sin saber la semántica del NULL de SQL— que de aquí no
        // puede salir una sugerencia vacía.
        isNotNull(tarifarioPersonal.cargo),
        ilike(tarifarioPersonal.cargo, patron),
      ),
    )
    // Alfabético: es una lista de nombres sin más orden natural que ese. El
    // `DISTINCT` de PostgreSQL exige que el ORDER BY sea sobre una columna
    // seleccionada, y lo es.
    .orderBy(asc(tarifarioPersonal.cargo))
    .limit(MAXIMO_SUGERENCIAS_CARGO);

  // El `isNotNull` de arriba ya garantiza esto en la base; el filtro está aquí
  // para que TypeScript lo sepa también (la columna es `text | null`).
  return filas
    .map((fila) => fila.cargo)
    .filter((cargo): cargo is string => cargo !== null);
}
