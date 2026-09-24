import { PackageIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabeceraListado } from "@/core/components/cabecera-listado";
import { ContadorRegistros } from "@/core/components/contador-registros";
import { EstadoVacio } from "@/core/components/estado-vacio";
import { LimpiarFiltros } from "@/core/components/limpiar-filtros";
import { PaginacionListado } from "@/core/components/paginacion-listado";
import { calcularPaginacion, paginaSchema } from "@/core/paginacion";
import { crearMaterialEnModal } from "@/modules/materiales/actions";
import { BuscadorMateriales } from "@/modules/materiales/components/buscador-materiales";
import { DialogoMaterial } from "@/modules/materiales/components/dialogo-material";
import { FiltroInactivos } from "@/modules/materiales/components/filtro-inactivos";
import { TablaMateriales } from "@/modules/materiales/components/tabla-materiales";
import {
  contarFiltros,
  urlListado,
  type FiltrosMateriales,
} from "@/modules/materiales/filtros";
import {
  contarMateriales,
  contarResultados,
  listarMateriales,
} from "@/modules/materiales/queries";
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
  const { busqueda, inactivos, pagina } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla.
  const filtros: FiltrosMateriales = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
    inactivos: filtroInactivosSchema.parse(inactivos) === "1",
    pagina: paginaSchema.parse(pagina),
  };

  // El total va primero porque decide qué página se trae: una página que ya
  // no existe se ajusta a la última real. Ver `calcularPaginacion`.
  const [total, totalVista] = await Promise.all([
    contarResultados(filtros),
    contarMateriales(filtros.inactivos),
  ]);
  const paginacion = calcularPaginacion(total, filtros.pagina);
  const materiales = await listarMateriales(filtros, paginacion);
  const filtrosPuestos = contarFiltros(filtros);

  // Solo cuando la vista de activos sale vacía sin filtros: distingue "el
  // catálogo está vacío" de "todos están dados de baja".
  const hayInactivos =
    materiales.length === 0 && filtrosPuestos === 0
      ? (await contarMateriales(true)) > 0
      : false;

  // El mismo disparador para la cabecera y el estado vacío: dos modales
  // independientes, no uno compartido.
  const nuevoMaterial = (
    <DialogoMaterial
      guardarAction={crearMaterialEnModal}
      disparador={
        <Button>
          <PlusIcon />
          Nuevo material
        </Button>
      }
    />
  );

  const limpiar = (
    <LimpiarFiltros href={urlListado()} cantidad={filtrosPuestos} />
  );

  return (
    <div className="space-y-6">
      {/* La descripción no es una división del catálogo —el esquema es una
          sola tabla `materiales` sin columna de tipo—: es como el cliente
          nombra lo que guarda aquí. Si algún día hiciera falta separarlos de
          verdad, eso es una columna nueva y una conversación con el cliente. */}
      <CabeceraListado
        titulo="Materiales"
        descripcion="Herramientas, Materiales y Consumibles"
        accion={nuevoMaterial}
      />

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva al otro en la URL en vez de pisarlo. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <BuscadorMateriales filtros={filtros} />
          <FiltroInactivos filtros={filtros} />
          {limpiar}
        </div>
        <ContadorRegistros
          texto={textoContador(totalVista, Boolean(filtros.inactivos))}
          activos={!filtros.inactivos}
        />
      </div>

      {materiales.length > 0 ? (
        <TablaMateriales
          materiales={materiales}
          pie={
            <PaginacionListado
              paginacion={paginacion}
              hrefPagina={(numero) => urlListado({ ...filtros, pagina: numero })}
            />
          }
        />
      ) : filtros.busqueda ? (
        <EstadoVacio
          Icono={SearchXIcon}
          titulo="Ningún material coincide con la búsqueda"
          descripcion="Prueba con otro código, descripción, marca o modelo, o quita los filtros."
          accion={limpiar}
        />
      ) : filtros.inactivos ? (
        <EstadoVacio
          Icono={PackageIcon}
          titulo="No hay materiales inactivos"
          descripcion="Los materiales que des de baja aparecerán aquí, y desde aquí podrás reactivarlos."
          accion={limpiar}
        />
      ) : hayInactivos ? (
        <EstadoVacio
          Icono={PackageIcon}
          titulo="No hay materiales activos"
          descripcion="Todos los materiales están dados de baja. Puedes verlos y reactivarlos con «Ver solo inactivos»."
          accion={nuevoMaterial}
        />
      ) : (
        <EstadoVacio
          Icono={PackageIcon}
          titulo="Aún no hay materiales registrados"
          descripcion="Cuando registres el primer material del catálogo, aparecerá aquí."
          accion={nuevoMaterial}
        />
      )}
    </div>
  );
}

/** «42 materiales activos», «1 material inactivo». */
function textoContador(total: number, inactivos: boolean): string {
  const uno = total === 1;
  const sustantivo = uno ? "material" : "materiales";
  const situacion = inactivos
    ? uno
      ? "inactivo"
      : "inactivos"
    : uno
      ? "activo"
      : "activos";

  return `${total} ${sustantivo} ${situacion}`;
}
