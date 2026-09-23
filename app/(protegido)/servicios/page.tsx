import { Button } from "@/components/ui/button";
import { crearServicioEnModal } from "@/modules/servicios/actions";
import { BuscadorServicios } from "@/modules/servicios/components/buscador-servicios";
import { DialogoServicio } from "@/modules/servicios/components/dialogo-servicio";
import { FiltroCategoria } from "@/modules/servicios/components/filtro-categoria";
import { TablaServicios } from "@/modules/servicios/components/tabla-servicios";
import {
  hayFiltros,
  type FiltrosServicios,
} from "@/modules/servicios/filtros";
import { listarServicios } from "@/modules/servicios/queries";
import {
  filtroBusquedaSchema,
  filtroCategoriaSchema,
} from "@/modules/servicios/schema";

// Ruta plana a propósito: el encabezado "Catálogos maestros" bajo el que
// aparece este enlace es solo una etiqueta del menú y nunca entra en la URL.
// El porqué, y qué habría que tocar para revertirlo, está en
// components/barra-lateral.tsx (comentario sobre MENU).
//
// OJO CON EL NOMBRE: este catálogo NO es la entidad `Servicio` que se fusionó
// en Orden de Trabajo el 2026-09-19. Esta ruta se reutiliza para un concepto
// distinto — el catálogo maestro de servicios con precios de tarifa. La
// colisión está registrada como decisión 7 de "Catálogos maestros" en
// docs/spec/preguntas-abiertas.md, con la salida prevista (renombrar a
// `/catalogo-servicios`) si llega a confundir al negocio.
export const metadata = { title: "Servicios" };

/**
 * El catálogo de servicios.
 *
 * DOS FILTROS, NO TRES: buscador de texto y categoría, ambos en `searchParams`
 * y combinados con AND en la consulta (ver `listarServicios`). Sin filtro de
 * inactivos, a diferencia de Materiales y Lista de precios — esta tabla no
 * tiene columna `activo` (decisión 16 de "Catálogos maestros" en
 * docs/spec/preguntas-abiertas.md), así que no hay nada que alternar.
 *
 * Mismo patrón que `app/(protegido)/ordenes-trabajo/page.tsx` combinando
 * `estado`, `busqueda` y fechas: cada valor de la URL pasa por su propio Zod
 * con `.catch(undefined)` antes de usarse, así que un parámetro inventado o
 * repetido se ignora en vez de reventar la pantalla.
 */
export default async function PaginaServicios({
  searchParams,
}: PageProps<"/servicios">) {
  const { busqueda, categoria } = await searchParams;

  const filtros: FiltrosServicios = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
    categoria: filtroCategoriaSchema.parse(categoria),
  };

  const servicios = await listarServicios(filtros);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Servicios</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de servicios con su precio de tarifa
          </p>
        </div>
        <DialogoServicio
          guardarAction={crearServicioEnModal}
          disparador={<Button>Nuevo servicio</Button>}
        />
      </div>

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva al otro en la URL en vez de pisarlo. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <BuscadorServicios filtros={filtros} />
        <FiltroCategoria filtros={filtros} />
      </div>

      <TablaServicios servicios={servicios} filtrado={hayFiltros(filtros)} />
    </div>
  );
}
