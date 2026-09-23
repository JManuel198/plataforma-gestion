import { Button } from "@/components/ui/button";
import { crearEppEnModal } from "@/modules/epps/actions";
import { BuscadorEpps } from "@/modules/epps/components/buscador-epps";
import { DialogoEpp } from "@/modules/epps/components/dialogo-epp";
import { TablaEpps } from "@/modules/epps/components/tabla-epps";
import { hayFiltros, type FiltrosEpps } from "@/modules/epps/filtros";
import { listarEpps } from "@/modules/epps/queries";
import { filtroBusquedaSchema } from "@/modules/epps/schema";

// Ruta plana a propósito: el encabezado "Catálogos maestros" bajo el que
// aparece este enlace es solo una etiqueta del menú y nunca entra en la URL.
// El porqué, y qué habría que tocar para revertirlo, está en
// components/barra-lateral.tsx (comentario sobre MENU).
export const metadata = { title: "EPPs" };

/**
 * El catálogo de equipos de protección personal. Quinto y último de los cinco
 * catálogos maestros del menú (Bloque 11) en dejar de ser un placeholder.
 *
 * UN SOLO FILTRO (Parte 2): el buscador de texto, que viaja en `searchParams`
 * y se resuelve en la consulta (ver `listarEpps`). Es el listado más simple
 * del proyecto, y las dos ausencias son deliberadas:
 *
 * - **Sin filtro de inactivos**, a diferencia de Materiales, Lista de precios
 *   y Tarifario: esta tabla no tiene columna `activo` y no la tendrá — el
 *   encargo dice que la baja lógica no aplica a este catálogo (decisión 6 de
 *   "Catálogos maestros" en docs/spec/preguntas-abiertas.md). No hay nada que
 *   alternar. Ojo con la diferencia frente a Servicios, que tampoco lo tiene
 *   pero por estar sin confirmar.
 * - **Sin filtro de lista cerrada**, a diferencia de la categoría de
 *   Servicios: no hay ninguna columna de ese tipo en esta tabla.
 *
 * Mismo patrón que el resto de pantallas de listado: el valor de la URL pasa
 * por su propio Zod con `.catch(undefined)` antes de usarse, así que un
 * parámetro inventado o repetido se ignora en vez de reventar la pantalla.
 */
export default async function PaginaEpps({
  searchParams,
}: PageProps<"/epps">) {
  const { busqueda } = await searchParams;

  const filtros: FiltrosEpps = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
  };

  const epps = await listarEpps(filtros);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">EPPs</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de equipos de protección personal
          </p>
        </div>
        <DialogoEpp
          guardarAction={crearEppEnModal}
          disparador={<Button>Nuevo EPP</Button>}
        />
      </div>

      {/* Un solo control hoy, pero en el mismo contenedor flex que usan los
          otros listados: el día que entre un segundo filtro se pone al lado
          sin tocar este marcado. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <BuscadorEpps filtros={filtros} />
      </div>

      <TablaEpps epps={epps} filtrado={hayFiltros(filtros)} />
    </div>
  );
}
