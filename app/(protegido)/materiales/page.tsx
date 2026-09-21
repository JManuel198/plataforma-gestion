import { Button } from "@/components/ui/button";
import { crearMaterialEnModal } from "@/modules/materiales/actions";
import { BuscadorMateriales } from "@/modules/materiales/components/buscador-materiales";
import { DialogoMaterial } from "@/modules/materiales/components/dialogo-material";
import { FiltroInactivos } from "@/modules/materiales/components/filtro-inactivos";
import { TablaMateriales } from "@/modules/materiales/components/tabla-materiales";
import { hayFiltros, type FiltrosMateriales } from "@/modules/materiales/filtros";
import { listarMateriales } from "@/modules/materiales/queries";
import {
  filtroBusquedaSchema,
  filtroInactivosSchema,
} from "@/modules/materiales/schema";

// Ruta plana a propósito: el encabezado "Catálogos maestros" bajo el que
// aparece este enlace es solo una etiqueta del menú y nunca entra en la URL.
// El porqué, y qué habría que tocar para revertirlo, está en
// components/barra-lateral.tsx (comentario sobre MENU).
export const metadata = { title: "Materiales" };

export default async function PaginaMateriales({
  searchParams,
}: PageProps<"/materiales">) {
  const { busqueda, inactivos } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla.
  const filtros: FiltrosMateriales = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
    inactivos: filtroInactivosSchema.parse(inactivos) === "1",
  };

  const materiales = await listarMateriales(filtros);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Materiales</h1>
          {/* Texto de presentación, no una división del catálogo: el esquema
              sigue siendo una sola tabla `materiales` sin columna de tipo.
              Está aquí porque es como el cliente nombra lo que guarda aquí
              dentro; si algún día hiciera falta separarlos de verdad, eso es
              una columna nueva y una conversación con el cliente, no un
              subtítulo. */}
          <p className="text-sm text-muted-foreground">
            Herramientas, Materiales y Consumibles
          </p>
        </div>
        <DialogoMaterial
          guardarAction={crearMaterialEnModal}
          disparador={<Button>Nuevo material</Button>}
        />
      </div>

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva al otro en la URL en vez de pisarlo. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <BuscadorMateriales filtros={filtros} />
        <FiltroInactivos filtros={filtros} />
      </div>

      <TablaMateriales materiales={materiales} filtrado={hayFiltros(filtros)} />
    </div>
  );
}
