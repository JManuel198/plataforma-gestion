import { HardHatIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabeceraListado } from "@/core/components/cabecera-listado";
import { ContadorRegistros } from "@/core/components/contador-registros";
import { EstadoVacio } from "@/core/components/estado-vacio";
import { LimpiarFiltros } from "@/core/components/limpiar-filtros";
import { PaginacionListado } from "@/core/components/paginacion-listado";
import { calcularPaginacion, paginaSchema } from "@/core/paginacion";
import { crearEppEnModal } from "@/modules/epps/actions";
import { BuscadorEpps } from "@/modules/epps/components/buscador-epps";
import { DialogoEpp } from "@/modules/epps/components/dialogo-epp";
import { TablaEpps } from "@/modules/epps/components/tabla-epps";
import {
  contarFiltros,
  urlListado,
  type FiltrosEpps,
} from "@/modules/epps/filtros";
import {
  contarResultados,
  listarEpps,
} from "@/modules/epps/queries";
import {
  filtroBusquedaSchema,
} from "@/modules/epps/schema";

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
  const { busqueda, pagina } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla.
  const filtros: FiltrosEpps = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
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
  const epps = await listarEpps(filtros, paginacion);
  const filtrosPuestos = contarFiltros(filtros);

  // El mismo disparador para la cabecera y el estado vacío: dos modales
  // independientes, no uno compartido.
  const nuevoEpp = (
    <DialogoEpp
      guardarAction={crearEppEnModal}
      disparador={
        <Button>
          <PlusIcon />
          Nuevo EPP
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
        titulo="EPPs"
        descripcion="Catálogo de equipos de protección personal"
        accion={nuevoEpp}
      />

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva al otro en la URL en vez de pisarlo. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <BuscadorEpps filtros={filtros} />
          {limpiar}
        </div>
        <ContadorRegistros
          texto={`${totalCatalogo} ${totalCatalogo === 1 ? "EPP registrado" : "EPPs registrados"}`}
          activos
        />
      </div>

      {epps.length > 0 ? (
        <TablaEpps
          epps={epps}
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
          titulo="Ningún EPP coincide con la búsqueda"
          descripcion="Prueba con otro código, descripción o unidad, o quita los filtros."
          accion={limpiar}
        />
      ) : (
        <EstadoVacio
          Icono={HardHatIcon}
          titulo="Aún no hay EPPs registrados"
          descripcion="Cuando registres el primer equipo de protección personal, aparecerá aquí."
          accion={nuevoEpp}
        />
      )}
    </div>
  );
}
