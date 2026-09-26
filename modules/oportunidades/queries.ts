import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contactos } from "@/db/schema/contactos";

// Este módulo LEE `contactos` (y `empresas`, vía core/selector-empresas.ts)
// directamente, y no a través de modules/contactos/ ni modules/clientes/: un
// módulo nunca importa de otro (AGENTS.md, Arquitectura). `db/schema/` es
// terreno compartido; el código de los otros módulos, no.
//
// Las consultas del embudo, la tabla, las métricas y la línea de tiempo llegan
// en la Parte 6 del plan.

/**
 * Contactos para el selector del formulario de oportunidad: SOLO los activos
 * de la empresa dada (sección 3 de la spec).
 *
 * Sin texto de búsqueda ni tope, a diferencia del selector de empresa: la
 * lista ya viene acotada a una empresa, que tiene pocos contactos. Si alguna
 * vez una empresa tiene tantos que el desplegable estorba, se añade búsqueda
 * entonces.
 *
 * Esto solo decide qué se OFRECE. Que el contacto que llega al guardar cumpla
 * lo mismo lo vuelve a comprobar la acción (`validarContacto` en actions.ts):
 * el formulario puede estar desactualizado o manipulado.
 */
export async function listarContactosParaSelector(empresaId: string) {
  return db
    .select({
      id: contactos.id,
      nombre: contactos.nombre,
      cargo: contactos.cargo,
    })
    .from(contactos)
    .where(and(eq(contactos.empresa_id, empresaId), eq(contactos.activo, true)))
    // El `id` desempata para que el orden sea estable si dos se llaman igual.
    .orderBy(asc(contactos.nombre), asc(contactos.id));
}

/** Una opción del selector de contacto, con el tipo real de la consulta. */
export type ContactoSeleccionable = Awaited<
  ReturnType<typeof listarContactosParaSelector>
>[number];
