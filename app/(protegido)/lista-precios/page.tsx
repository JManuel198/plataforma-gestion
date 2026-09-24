import { PlusIcon, SearchXIcon, TagsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabeceraListado } from "@/core/components/cabecera-listado";
import { ContadorRegistros } from "@/core/components/contador-registros";
import { EstadoVacio } from "@/core/components/estado-vacio";
import { LimpiarFiltros } from "@/core/components/limpiar-filtros";
import { buscarMaterialesParaSeleccionAction } from "@/modules/materiales/actions";
import { crearPrecioEnModal } from "@/modules/lista-precios/actions";
import { BuscadorListaPrecios } from "@/modules/lista-precios/components/buscador-lista-precios";
import { DialogoListaPrecio } from "@/modules/lista-precios/components/dialogo-lista-precio";
import { FiltroInactivos } from "@/modules/lista-precios/components/filtro-inactivos";
import { TablaListaPrecios } from "@/modules/lista-precios/components/tabla-lista-precios";
import {
  contarFiltros,
  urlListado,
  type FiltrosListaPrecios,
} from "@/modules/lista-precios/filtros";
import { contarPrecios, listarPrecios } from "@/modules/lista-precios/queries";
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

  const [precios, totalVista] = await Promise.all([
    listarPrecios(filtros),
    contarPrecios(filtros.inactivos),
  ]);
  const filtrosPuestos = contarFiltros(filtros);

  // Solo hace falta cuando la vista de activas sale vacía sin filtros: ahí hay
  // que distinguir "el catálogo está vacío" de "todas están dadas de baja". En
  // cualquier otro caso no se consulta.
  const hayInactivas =
    precios.length === 0 && filtrosPuestos === 0
      ? (await contarPrecios(true)) > 0
      : false;

  // El mismo disparador sirve para la cabecera y para el estado vacío: son dos
  // modales independientes (cada uno con su estado), no uno compartido.
  const nuevaOferta = (
    <DialogoListaPrecio
      guardarAction={crearPrecioEnModal}
      buscarMaterialAction={buscarMaterialesParaSeleccionAction}
      disparador={
        <Button>
          <PlusIcon />
          Nueva oferta
        </Button>
      }
    />
  );

  const limpiar = (
    <LimpiarFiltros href={urlListado()} cantidad={filtrosPuestos} />
  );

  return (
    <div className="space-y-6">
      <CabeceraListado titulo="Lista de precios" accion={nuevaOferta} />

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva al otro en la URL en vez de pisarlo. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <BuscadorListaPrecios filtros={filtros} />
          <FiltroInactivos filtros={filtros} />
          {limpiar}
        </div>
        <ContadorRegistros
          texto={textoContador(totalVista, Boolean(filtros.inactivos))}
          activos={!filtros.inactivos}
        />
      </div>

      {precios.length > 0 ? (
        <TablaListaPrecios
          precios={precios}
          buscarMaterialAction={buscarMaterialesParaSeleccionAction}
        />
      ) : filtros.busqueda ? (
        <EstadoVacio
          Icono={SearchXIcon}
          titulo="Ninguna oferta coincide con la búsqueda"
          descripcion="Prueba con otro código, material o proveedor, o quita los filtros."
          accion={limpiar}
        />
      ) : filtros.inactivos ? (
        <EstadoVacio
          Icono={TagsIcon}
          titulo="No hay ofertas inactivas"
          descripcion="Las ofertas que des de baja aparecerán aquí, y desde aquí podrás reactivarlas."
          accion={limpiar}
        />
      ) : hayInactivas ? (
        <EstadoVacio
          Icono={TagsIcon}
          titulo="No hay ofertas activas"
          descripcion="Todas las ofertas están dadas de baja. Puedes verlas y reactivarlas con «Ver solo inactivos»."
          accion={nuevaOferta}
        />
      ) : (
        <EstadoVacio
          Icono={TagsIcon}
          titulo="Aún no hay ofertas registradas"
          descripcion="Cuando registres la primera oferta de precio de un proveedor, aparecerá aquí."
          accion={nuevaOferta}
        />
      )}
    </div>
  );
}

/**
 * «86 ofertas activas», «1 oferta inactiva». Vive aquí y no en el contador de
 * core/ porque el sustantivo y su género son de este catálogo.
 */
function textoContador(total: number, inactivas: boolean): string {
  const uno = total === 1;
  const sustantivo = uno ? "oferta" : "ofertas";
  const situacion = inactivas
    ? uno
      ? "inactiva"
      : "inactivas"
    : uno
      ? "activa"
      : "activas";

  return `${total} ${sustantivo} ${situacion}`;
}
