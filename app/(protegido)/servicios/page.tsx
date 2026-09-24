import { PlusIcon, SearchXIcon, WrenchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabeceraListado } from "@/core/components/cabecera-listado";
import { ContadorRegistros } from "@/core/components/contador-registros";
import { EstadoVacio } from "@/core/components/estado-vacio";
import { LimpiarFiltros } from "@/core/components/limpiar-filtros";
import { PaginacionListado } from "@/core/components/paginacion-listado";
import { calcularPaginacion, paginaSchema } from "@/core/paginacion";
import { crearServicioEnModal } from "@/modules/servicios/actions";
import { BuscadorServicios } from "@/modules/servicios/components/buscador-servicios";
import { DialogoServicio } from "@/modules/servicios/components/dialogo-servicio";
import { FiltroCategoria } from "@/modules/servicios/components/filtro-categoria";
import { TablaServicios } from "@/modules/servicios/components/tabla-servicios";
import {
  contarFiltros,
  urlListado,
  type FiltrosServicios,
} from "@/modules/servicios/filtros";
import {
  contarResultados,
  listarServicios,
} from "@/modules/servicios/queries";
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
  const { busqueda, categoria, pagina } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla.
  const filtros: FiltrosServicios = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
    categoria: filtroCategoriaSchema.parse(categoria),
    pagina: paginaSchema.parse(pagina),
  };

  // El total va primero porque decide qué página se trae: una página que ya
  // no existe se ajusta a la última real. Ver `calcularPaginacion`.
  // Sin baja lógica no hay activos ni inactivos que contar: el contador de la
  // barra enseña el catálogo entero (la misma consulta, sin filtros).
  const [total, totalCatalogo] = await Promise.all([
    contarResultados(filtros),
    contarResultados({}),
  ]);
  const paginacion = calcularPaginacion(total, filtros.pagina);
  const servicios = await listarServicios(filtros, paginacion);
  const filtrosPuestos = contarFiltros(filtros);

  // El mismo disparador para la cabecera y el estado vacío: dos modales
  // independientes, no uno compartido.
  const nuevoServicio = (
    <DialogoServicio
      guardarAction={crearServicioEnModal}
      disparador={
        <Button>
          <PlusIcon />
          Nuevo servicio
        </Button>
      }
    />
  );

  const limpiar = (
    <LimpiarFiltros href={urlListado()} cantidad={filtrosPuestos} />
  );

  return (
    <div className="space-y-6">
      <CabeceraListado
        titulo="Servicios"
        descripcion="Catálogo de servicios con su precio de tarifa"
        accion={nuevoServicio}
      />

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva al otro en la URL en vez de pisarlo. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <BuscadorServicios filtros={filtros} />
          <FiltroCategoria filtros={filtros} />
          {limpiar}
        </div>
        <ContadorRegistros
          texto={`${totalCatalogo} ${totalCatalogo === 1 ? "servicio registrado" : "servicios registrados"}`}
          activos
        />
      </div>

      {servicios.length > 0 ? (
        <TablaServicios
          servicios={servicios}
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
          titulo="Ningún servicio coincide con la búsqueda"
          descripcion="Prueba con otro código, servicio o unidad, o quita los filtros."
          accion={limpiar}
        />
      ) : filtros.categoria ? (
        <EstadoVacio
          Icono={SearchXIcon}
          titulo="No hay servicios en esta categoría"
          descripcion="Elige otra categoría o quita los filtros para ver todo el catálogo."
          accion={limpiar}
        />
      ) : (
        <EstadoVacio
          Icono={WrenchIcon}
          titulo="Aún no hay servicios registrados"
          descripcion="Cuando registres el primer servicio del catálogo, aparecerá aquí."
          accion={nuevoServicio}
        />
      )}
    </div>
  );
}
