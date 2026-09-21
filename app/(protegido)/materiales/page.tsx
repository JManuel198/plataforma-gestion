import { Button } from "@/components/ui/button";
import { crearMaterialEnModal } from "@/modules/materiales/actions";
import { DialogoMaterial } from "@/modules/materiales/components/dialogo-material";
import { TablaMateriales } from "@/modules/materiales/components/tabla-materiales";
import { listarMateriales } from "@/modules/materiales/queries";

// Ruta plana a propósito: el encabezado "Catálogos maestros" bajo el que
// aparece este enlace es solo una etiqueta del menú y nunca entra en la URL.
// El porqué, y qué habría que tocar para revertirlo, está en
// components/barra-lateral.tsx (comentario sobre MENU).
export const metadata = { title: "Materiales" };

export default async function PaginaMateriales() {
  const materiales = await listarMateriales();

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

      {/* El buscador y el filtro de inactivos son Parte 2: van aquí, con el
          mismo patrón de `BuscadorPersonal` (estado en la URL, filtrado en la
          consulta del servidor). */}

      <TablaMateriales materiales={materiales} />
    </div>
  );
}
