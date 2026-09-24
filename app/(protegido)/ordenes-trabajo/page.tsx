import { ClipboardListIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabeceraListado } from "@/core/components/cabecera-listado";
import { ContadorRegistros } from "@/core/components/contador-registros";
import { EstadoVacio } from "@/core/components/estado-vacio";
import { LimpiarFiltros } from "@/core/components/limpiar-filtros";
import { PaginacionListado } from "@/core/components/paginacion-listado";
import { calcularPaginacion, paginaSchema } from "@/core/paginacion";
import { hoyIso } from "@/lib/fecha";
import { crearOrdenTrabajoEnModal } from "@/modules/ordenes-trabajo/actions";
import { AvisoToast } from "@/modules/ordenes-trabajo/components/aviso-toast";
import { DialogoOrdenTrabajo } from "@/modules/ordenes-trabajo/components/dialogo-orden-trabajo";
import { BuscadorOrdenes } from "@/modules/ordenes-trabajo/components/buscador-ordenes";
import { FiltroEstado } from "@/modules/ordenes-trabajo/components/filtro-estado";
import { FiltroFechas } from "@/modules/ordenes-trabajo/components/filtro-fechas";
import { TablaOrdenesTrabajo } from "@/modules/ordenes-trabajo/components/tabla-ordenes-trabajo";
import {
  contarFiltros,
  urlListado,
  type FiltrosOt,
} from "@/modules/ordenes-trabajo/filtros";
import {
  contarResultados,
  listarOrdenesTrabajo,
} from "@/modules/ordenes-trabajo/queries";
import {
  avisoSchema,
  filtroBusquedaSchema,
  filtroEstadoSchema,
  filtroFechaSchema,
} from "@/modules/ordenes-trabajo/schema";

export const metadata = { title: "Órdenes de trabajo" };

export default async function PaginaOrdenesTrabajo({
  searchParams,
}: PageProps<"/ordenes-trabajo">) {
  const { estado, busqueda, desde, hasta, aviso, pagina } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla.
  const filtros: FiltrosOt = {
    estado: filtroEstadoSchema.parse(estado),
    busqueda: filtroBusquedaSchema.parse(busqueda),
    desde: filtroFechaSchema.parse(desde),
    hasta: filtroFechaSchema.parse(hasta),
    pagina: paginaSchema.parse(pagina),
  };

  // El total va primero porque decide qué página se trae (ver
  // `calcularPaginacion`). La OT no tiene baja lógica —una que no va se marca
  // `Cancelada`—, así que el contador de la barra enseña todas las OT
  // registradas: la misma consulta de conteo, sin filtros.
  const [total, totalOrdenes] = await Promise.all([
    contarResultados(filtros),
    contarResultados({}),
  ]);
  const paginacion = calcularPaginacion(total, filtros.pagina);
  const ordenes = await listarOrdenesTrabajo(filtros, paginacion);
  const filtrosPuestos = contarFiltros(filtros);

  const urlSinAviso = urlListado(filtros);

  // Ya no navega: abre el modal sobre este mismo listado, así que es un botón
  // de verdad y no un enlace disfrazado. La ruta /ordenes-trabajo/nueva sigue
  // existiendo y sigue funcionando — es la única forma de enlazar el
  // formulario por URL.
  //
  // `hoyIso()` se calcula aquí, en el servidor: el reloj del navegador puede
  // estar en otra zona que la del negocio y enseñaría un día distinto del que
  // la base de datos va a escribir.
  //
  // El mismo disparador para la cabecera y el estado vacío: dos modales
  // independientes, no uno compartido.
  const nuevaOrden = (
    <DialogoOrdenTrabajo
      guardarAction={crearOrdenTrabajoEnModal}
      fechaHoy={hoyIso()}
      disparador={
        <Button>
          <PlusIcon />
          Nueva OT
        </Button>
      }
    />
  );

  const limpiar = (
    <LimpiarFiltros href={urlListado()} cantidad={filtrosPuestos} />
  );

  return (
    <div className="space-y-6">
      <AvisoToast aviso={avisoSchema.parse(aviso)} destino={urlSinAviso} />

      <CabeceraListado titulo="Órdenes de Trabajo" accion={nuevaOrden} />

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva a los otros en la URL en vez de pisarlos. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <BuscadorOrdenes filtros={filtros} />
          <FiltroEstado filtros={filtros} />
          <FiltroFechas filtros={filtros} />
          {limpiar}
        </div>
        <ContadorRegistros
          texto={`${totalOrdenes} ${totalOrdenes === 1 ? "orden de trabajo" : "órdenes de trabajo"}`}
          activos
        />
      </div>

      {ordenes.length > 0 ? (
        <TablaOrdenesTrabajo
          ordenes={ordenes}
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
          titulo="Ninguna OT coincide con la búsqueda"
          descripcion="Prueba con otro número de OT, cliente o servicio, o quita los filtros."
          accion={limpiar}
        />
      ) : filtrosPuestos > 0 ? (
        <EstadoVacio
          Icono={SearchXIcon}
          titulo="Ninguna OT coincide con los filtros"
          descripcion="Prueba con otro estado u otro rango de fechas, o quita los filtros."
          accion={limpiar}
        />
      ) : (
        <EstadoVacio
          Icono={ClipboardListIcon}
          titulo="Aún no hay órdenes de trabajo"
          descripcion="Cuando registres la primera OT, aparecerá aquí."
          accion={nuevaOrden}
        />
      )}
    </div>
  );
}
