import { Button } from "@/components/ui/button";
import { buscarMaterialesParaSeleccionAction } from "@/modules/materiales/actions";
import { crearPrecioEnModal } from "@/modules/lista-precios/actions";
import { BuscadorListaPrecios } from "@/modules/lista-precios/components/buscador-lista-precios";
import { DialogoListaPrecio } from "@/modules/lista-precios/components/dialogo-lista-precio";
import { FiltroInactivos } from "@/modules/lista-precios/components/filtro-inactivos";
import { TablaListaPrecios } from "@/modules/lista-precios/components/tabla-lista-precios";
import {
  hayFiltros,
  type FiltrosListaPrecios,
} from "@/modules/lista-precios/filtros";
import { listarPrecios } from "@/modules/lista-precios/queries";
import {
  filtroBusquedaSchema,
  filtroInactivosSchema,
} from "@/modules/lista-precios/schema";

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
 *
 * El buscador de PROVEEDORES no pasa por aquí, y la asimetría es deliberada:
 * esos salen de `lista_precios`, la tabla de este mismo módulo, así que su
 * acción se importa donde se usa. Este rodeo es solo para cruzar la frontera
 * entre dos módulos.
 */
export default async function PaginaListaPrecios({
  searchParams,
}: PageProps<"/lista-precios">) {
  const { busqueda, inactivos } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla.
  const filtros: FiltrosListaPrecios = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
    inactivos: filtroInactivosSchema.parse(inactivos) === "1",
  };

  const precios = await listarPrecios(filtros);

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

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva al otro en la URL en vez de pisarlo. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <BuscadorListaPrecios filtros={filtros} />
        <FiltroInactivos filtros={filtros} />
      </div>

      <TablaListaPrecios
        precios={precios}
        buscarMaterialAction={buscarMaterialesParaSeleccionAction}
        filtrado={hayFiltros(filtros)}
      />
    </div>
  );
}
