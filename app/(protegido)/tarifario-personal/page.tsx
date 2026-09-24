import { BanknoteIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabeceraListado } from "@/core/components/cabecera-listado";
import { ContadorRegistros } from "@/core/components/contador-registros";
import { EstadoVacio } from "@/core/components/estado-vacio";
import { LimpiarFiltros } from "@/core/components/limpiar-filtros";
import { PaginacionListado } from "@/core/components/paginacion-listado";
import { calcularPaginacion, paginaSchema } from "@/core/paginacion";
import { crearTarifaEnModal } from "@/modules/tarifario-personal/actions";
import { BuscadorTarifas } from "@/modules/tarifario-personal/components/buscador-tarifas";
import { DialogoTarifa } from "@/modules/tarifario-personal/components/dialogo-tarifa";
import { FiltroInactivos } from "@/modules/tarifario-personal/components/filtro-inactivos";
import { TablaTarifario } from "@/modules/tarifario-personal/components/tabla-tarifario";
import {
  contarFiltros,
  urlListado,
  type FiltrosTarifario,
} from "@/modules/tarifario-personal/filtros";
import {
  contarTarifas,
  contarResultados,
  listarTarifas,
} from "@/modules/tarifario-personal/queries";
import {
  filtroBusquedaSchema,
  filtroInactivosSchema,
} from "@/modules/tarifario-personal/schema";

// Ruta plana a propósito: el encabezado "Catálogos maestros" bajo el que
// aparece este enlace es solo una etiqueta del menú y nunca entra en la URL.
// El porqué, y qué habría que tocar para revertirlo, está en
// components/barra-lateral.tsx (comentario sobre MENU).
export const metadata = { title: "Tarifario de personal" };

/**
 * El tarifario de personal: cuánto cuesta un cargo por periodo de tiempo.
 *
 * NO TIENE NINGUNA RELACIÓN CON EL MÓDULO PERSONAL, y no es un pendiente: el
 * cliente descartó explícitamente (2026-09-23) que los dos se conecten. El
 * `cargo` de aquí y el `cargo` de una persona se llaman igual y son
 * independientes — ver la decisión 1 de "Catálogos maestros" en
 * docs/spec/preguntas-abiertas.md.
 *
 * DOS FILTROS: buscador de texto y "Ver solo inactivos", ambos en
 * `searchParams` y combinados con AND en la consulta (ver `listarTarifas`).
 * Mismo patrón que `app/(protegido)/materiales/page.tsx`: cada valor de la URL
 * pasa por su propio Zod con `.catch(undefined)` antes de usarse, así que un
 * parámetro inventado o repetido se ignora en vez de reventar la pantalla.
 */
export default async function PaginaTarifarioPersonal({
  searchParams,
}: PageProps<"/tarifario-personal">) {
  const { busqueda, inactivos, pagina } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla.
  const filtros: FiltrosTarifario = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
    inactivos: filtroInactivosSchema.parse(inactivos) === "1",
    pagina: paginaSchema.parse(pagina),
  };

  // El total va primero porque decide qué página se trae: una página que ya
  // no existe se ajusta a la última real. Ver `calcularPaginacion`.
  const [total, totalVista] = await Promise.all([
    contarResultados(filtros),
    contarTarifas(filtros.inactivos),
  ]);
  const paginacion = calcularPaginacion(total, filtros.pagina);
  const tarifas = await listarTarifas(filtros, paginacion);
  const filtrosPuestos = contarFiltros(filtros);

  // Solo cuando la vista de activos sale vacía sin filtros: distingue "el
  // catálogo está vacío" de "todos están dados de baja".
  const hayInactivos =
    tarifas.length === 0 && filtrosPuestos === 0
      ? (await contarTarifas(true)) > 0
      : false;

  // El mismo disparador para la cabecera y el estado vacío: dos modales
  // independientes, no uno compartido.
  const nuevaTarifa = (
    <DialogoTarifa
      guardarAction={crearTarifaEnModal}
      disparador={
        <Button>
          <PlusIcon />
          Nueva tarifa
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
        titulo="Tarifario de personal"
        descripcion="Costo por cargo y periodo de tiempo"
        accion={nuevaTarifa}
      />

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva al otro en la URL en vez de pisarlo. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <BuscadorTarifas filtros={filtros} />
          <FiltroInactivos filtros={filtros} />
          {limpiar}
        </div>
        <ContadorRegistros
          texto={textoContador(totalVista, Boolean(filtros.inactivos))}
          activos={!filtros.inactivos}
        />
      </div>

      {tarifas.length > 0 ? (
        <TablaTarifario
          tarifas={tarifas}
          pie={
            <PaginacionListado
              paginacion={paginacion}
              hrefPagina={(numero) =>
                urlListado({ ...filtros, pagina: numero })
              }
            />
          }
        />
      ) : filtros.busqueda ? (
        <EstadoVacio
          Icono={SearchXIcon}
          titulo="Ninguna tarifa coincide con la búsqueda"
          descripcion="Prueba con otro código, cargo o unidad, o quita los filtros."
          accion={limpiar}
        />
      ) : filtros.inactivos ? (
        <EstadoVacio
          Icono={BanknoteIcon}
          titulo="No hay tarifas inactivas"
          descripcion="Las tarifas que des de baja aparecerán aquí, y desde aquí podrás reactivarlas."
          accion={limpiar}
        />
      ) : hayInactivos ? (
        <EstadoVacio
          Icono={BanknoteIcon}
          titulo="No hay tarifas activas"
          descripcion="Todas las tarifas están dadas de baja. Puedes verlas y reactivarlas con «Ver solo inactivos»."
          accion={nuevaTarifa}
        />
      ) : (
        <EstadoVacio
          Icono={BanknoteIcon}
          titulo="Aún no hay tarifas registradas"
          descripcion="Cuando registres la primera tarifa de un cargo, aparecerá aquí."
          accion={nuevaTarifa}
        />
      )}
    </div>
  );
}

/** «12 tarifas activas». */
function textoContador(total: number, inactivos: boolean): string {
  const uno = total === 1;
  const sustantivo = uno ? "tarifa" : "tarifas";
  const situacion = inactivos
    ? uno
      ? "inactiva"
      : "inactivas"
    : uno
      ? "activa"
      : "activas";

  return `${total} ${sustantivo} ${situacion}`;
}
