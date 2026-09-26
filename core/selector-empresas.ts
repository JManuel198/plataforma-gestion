import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { empresas } from "@/db/schema/empresas";
import { patronParcial } from "./busqueda";

/**
 * La consulta del selector de empresa de los formularios (el combobox de
 * `core/components/buscador-seleccion.tsx`).
 *
 * VIVE EN core/ DESDE 2026-09-25. Estuvo en `modules/contactos/queries.ts`
 * mientras Contactos fue el único formulario que elegía una empresa; el Embudo
 * de oportunidades es el segundo, y la regla de siempre (AGENTS.md,
 * Arquitectura) es que lo que comparten dos módulos sube a core/, nunca un
 * import cruzado.
 *
 * Las dos versiones solo difieren en UNA condición, y por eso se comparte con
 * un parámetro en vez de quedarse duplicada:
 * - Contactos ofrece también las empresas dadas de baja (un contacto puede
 *   pertenecer a una empresa inactiva y, al editarlo, la suya tiene que poder
 *   seguir elegida — ver la ficha de Contactos en docs/spec/entidades.md).
 * - Oportunidades solo ofrece las activas (docs/spec/oportunidades.md,
 *   sección 3).
 * El texto que se busca, las columnas que devuelve, el orden y el tope son los
 * mismos. Si algún día divergen en algo más que `activo` (otras columnas, otro
 * orden), lo sano es volver a separarlas, no llenar esto de banderas.
 *
 * Es SOLO la consulta. La Server Action que la envuelve (sesión, validación
 * del texto) sigue en cada módulo: cada uno decide qué variante pide y con qué
 * prefijo registra sus fallos.
 */

/**
 * Tope de resultados. Es un combobox de búsqueda, no un listado: si la empresa
 * no está entre las 50 primeras, lo que toca es afinar el texto. Más alto que
 * el 10 del selector de Materiales porque este también se abre sin texto y
 * conviene que muestre algo más que una pantalla.
 */
export const MAXIMO_EMPRESAS_SELECTOR = 50;

/**
 * El texto del selector. Vacío es válido (el combobox se abre sin texto y
 * enseña las primeras); el tope es el mismo que el del buscador de los
 * listados.
 */
export const busquedaSelectorEmpresaSchema = z.string().trim().max(200);

type Opciones = {
  /**
   * `true`: activas e inactivas, las activas primero (Contactos).
   * `false`: solo activas (Oportunidades).
   *
   * Obligatorio a propósito, sin valor por defecto: quien llama tiene que
   * decidirlo, porque las dos respuestas son reglas de negocio distintas.
   */
  incluirInactivas: boolean;
};

/**
 * Empresas para el selector. Sin texto devuelve las primeras por razón
 * social; con texto busca por razón social, nombre comercial o RUC.
 *
 * Devuelve siempre `activo`, también cuando solo trae activas: así el tipo de
 * una opción es uno solo, y la interfaz marca las inactivas sin preguntarse de
 * qué variante vienen.
 */
export async function buscarEmpresasParaSelector(
  busqueda: string,
  { incluirInactivas }: Opciones,
) {
  const patron = busqueda ? patronParcial(busqueda) : null;

  return db
    .select({
      id: empresas.id,
      razon_social: empresas.razon_social,
      ruc: empresas.ruc,
      activo: empresas.activo,
    })
    .from(empresas)
    .where(
      and(
        // `undefined` dentro de `and(...)` desaparece: con `incluirInactivas`
        // no se filtra por `activo` en absoluto, que es justo lo que se quiere
        // aquí (no es el filtro de "ver solo inactivos" de los listados, que
        // alterna entre dos vistas excluyentes).
        incluirInactivas ? undefined : eq(empresas.activo, true),
        patron
          ? or(
              ilike(empresas.razon_social, patron),
              ilike(empresas.nombre_comercial, patron),
              ilike(empresas.ruc, patron),
            )
          : undefined,
      ),
    )
    // Activas primero (solo importa cuando vienen las dos), luego por razón
    // social; el `id` desempata para que el orden sea estable.
    .orderBy(desc(empresas.activo), asc(empresas.razon_social), asc(empresas.id))
    .limit(MAXIMO_EMPRESAS_SELECTOR);
}

/** Una opción del selector de empresa, con el tipo real de la consulta. */
export type EmpresaSeleccionable = Awaited<
  ReturnType<typeof buscarEmpresasParaSelector>
>[number];
