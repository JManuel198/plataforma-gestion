import { Button } from "@/components/ui/button";
import { buscarMaterialesParaSeleccionAction } from "@/modules/materiales/actions";
import { crearPrecioEnModal } from "@/modules/lista-precios/actions";
import { DialogoListaPrecio } from "@/modules/lista-precios/components/dialogo-lista-precio";
import { TablaListaPrecios } from "@/modules/lista-precios/components/tabla-lista-precios";
import { listarPrecios } from "@/modules/lista-precios/queries";

// Ruta plana a propósito: el encabezado "Catálogos maestros" bajo el que
// aparece este enlace es solo una etiqueta del menú y nunca entra en la URL.
// El porqué, y qué habría que tocar para revertirlo, está en
// components/barra-lateral.tsx (comentario sobre MENU).
export const metadata = { title: "Lista de precios" };

/**
 * ESTA PÁGINA ES EL ÚNICO SITIO QUE CONOCE A LOS DOS MÓDULOS, y es a propósito.
 *
 * `modules/lista-precios/` necesita buscar materiales, pero NO importa nada de
 * `modules/materiales/`: un módulo de negocio nunca depende de otro (AGENTS.md,
 * Arquitectura). Quien los junta es `app/`, que es la capa de composición —
 * aquí se lee la Server Action de Materiales y se pasa como prop hacia abajo.
 *
 * El módulo de Lista de precios solo declara la FORMA que necesita
 * (`MaterialElegible` en su tipos.ts) y TypeScript comprueba que la acción real
 * encaje. Si Materiales renombra una columna, el error sale aquí, que es el
 * único archivo con contexto para arreglarlo.
 */
export default async function PaginaListaPrecios() {
  const precios = await listarPrecios();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Lista de precios
          </h1>
          <p className="text-sm text-muted-foreground">
            Ofertas de materiales por proveedor
          </p>
        </div>
        <DialogoListaPrecio
          guardarAction={crearPrecioEnModal}
          buscarMaterialAction={buscarMaterialesParaSeleccionAction}
          disparador={<Button>Nueva oferta</Button>}
        />
      </div>

      <TablaListaPrecios
        precios={precios}
        buscarMaterialAction={buscarMaterialesParaSeleccionAction}
      />
    </div>
  );
}
