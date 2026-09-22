import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { listaPrecios } from "@/db/schema/lista-precios";
import { materiales } from "@/db/schema/materiales";
import { calcularPrecio } from "./precio";

/**
 * Lista las ofertas del catálogo, con el material al que apuntan.
 *
 * SIN FILTROS TODAVÍA. El buscador de tabla y el filtro «Ver solo inactivos»
 * llegan en la Parte 2; hasta entonces no hay `filtros.ts` en este módulo,
 * porque un archivo de filtros vacío solo sería un sitio donde adivinar cuáles
 * van a ser. La consulta ya filtra por `activo` para que el listado signifique
 * lo mismo desde el primer día: se ven las ofertas vigentes.
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
export async function listarPrecios() {
  const filas = await db
    .select({
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
    })
    .from(listaPrecios)
    .innerJoin(materiales, eq(listaPrecios.material_id, materiales.id))
    .where(eq(listaPrecios.activo, true))
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
