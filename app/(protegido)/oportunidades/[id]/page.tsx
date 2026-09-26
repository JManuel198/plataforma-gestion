import { notFound } from "next/navigation";
import {
  ClipboardListIcon,
  FileTextIcon,
  SearchIcon,
  ShieldIcon,
} from "lucide-react";
import { MigaDetalle } from "@/components/migas-de-pan";
import { paginaSchema } from "@/core/paginacion";
import { exigirCrmVisible } from "@/core/visibilidad-crm";
import { ZONA_HORARIA } from "@/lib/fecha";
import { AvisoCierre } from "@/modules/oportunidades/components/aviso-cierre";
import { CabeceraDetalle } from "@/modules/oportunidades/components/cabecera-detalle";
import { InformacionGeneral } from "@/modules/oportunidades/components/informacion-general";
import { LineaDeTiempo } from "@/modules/oportunidades/components/linea-de-tiempo";
import { LineaEtapas } from "@/modules/oportunidades/components/linea-etapas";
import {
  PanelDetalle,
  Proximamente,
} from "@/modules/oportunidades/components/panel-detalle";
import { normalizarFiltros, urlListado } from "@/modules/oportunidades/filtros";
import {
  obtenerLineaDeTiempo,
  obtenerOportunidad,
} from "@/modules/oportunidades/queries";
import {
  filtroBusquedaSchema,
  filtroClienteSchema,
  filtroEstadoSchema,
  filtroRapidoSchema,
  filtroValorSchema,
  filtroVistaSchema,
} from "@/modules/oportunidades/schema";

// Título fijo, sin el código: `generateMetadata` correría su propia consulta
// y, sin pasar por `exigirCrmVisible`, pondría el código en la pestaña de
// quien tiene el CRM oculto antes del 404. El código ya está en las migas.
export const metadata = { title: "Oportunidad" };

/**
 * El detalle de una oportunidad (sección 7 de la spec): lectura (Parte 9 del
 * plan) y acciones (Parte 10). Página completa, no modal, y sin título de
 * módulo: el primer módulo con detalle en ruta propia.
 *
 * TODO LO QUE SE VE LO ESCRIBE ESTE SERVER COMPONENT. Las piezas interactivas
 * (lápices, línea de etapas, botones de la cabecera) llaman a su Server
 * Action y después a `router.refresh()`, que vuelve a pedir esta página: la
 * información, la cabecera y la línea de tiempo se actualizan sin recargar, y
 * ante un fallo se ve el estado real (ver `useAccionOportunidad`).
 *
 * Un id que no existe da un 404 REAL (`notFound()`), no una pantalla vacía:
 * `obtenerOportunidad` devuelve `null` solo en ese caso.
 */
export default async function PaginaDetalleOportunidad({
  params,
  searchParams,
}: PageProps<"/oportunidades/[id]">) {
  // TEMPORAL: esta pantalla da 404 a los correos de CRM_OCULTO_PARA mientras
  // el módulo esté en construcción (core/visibilidad-crm.ts).
  await exigirCrmVisible();

  const { id } = await params;
  const oportunidad = await obtenerOportunidad(id);

  if (!oportunidad) {
    notFound();
  }

  const entradas = await obtenerLineaDeTiempo(oportunidad.id);

  // "< Pipeline" vuelve a la vista y los filtros de los que se vino, que
  // llegan como los mismos parámetros del listado (`urlDetalle` en
  // filtros.ts). Pasan por los mismos Zod que en el listado y la URL se
  // RECONSTRUYE con `urlListado`: un parámetro inventado se ignora y nunca se
  // redirige a una cadena recibida tal cual.
  const origen = await searchParams;
  const vista = filtroVistaSchema.parse(origen.vista);
  const urlVolver = urlListado(
    normalizarFiltros(
      {
        busqueda: filtroBusquedaSchema.parse(origen.busqueda),
        rapido: filtroRapidoSchema.parse(origen.rapido),
        cliente: filtroClienteSchema.parse(origen.cliente),
        valor: filtroValorSchema.parse(origen.valor),
        estado: filtroEstadoSchema.parse(origen.estado),
        pagina: paginaSchema.parse(origen.pagina),
      },
      vista,
    ),
    vista,
  );

  const cerrada = oportunidad.situacion !== "abierta";

  return (
    <div className="space-y-5">
      <MigaDetalle etiqueta={oportunidad.codigo} />

      <CabeceraDetalle
        oportunidad={oportunidad}
        urlVolver={urlVolver}
        zonaHoraria={ZONA_HORARIA}
      />

      <LineaEtapas
        id={oportunidad.id}
        etapa={oportunidad.etapa}
        cerrada={cerrada}
      />

      {oportunidad.situacion !== "abierta" && oportunidad.cierre ? (
        <AvisoCierre
          situacion={oportunidad.situacion}
          etapa={oportunidad.etapa}
          fecha={oportunidad.cierre.fecha}
          motivo={oportunidad.cierre.motivo}
        />
      ) : null}

      {/* Algo más de la mitad a la izquierda y algo menos a la derecha
          (sección 7); en pantallas angostas, una debajo de la otra. */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
        <div className="space-y-5">
          <InformacionGeneral oportunidad={oportunidad} />
          <PanelDetalle titulo="Cotizaciones vinculadas" Icono={FileTextIcon}>
            <Proximamente Icono={SearchIcon}>
              Próximamente se podrán buscar / agregar
            </Proximamente>
          </PanelDetalle>
          <PanelDetalle titulo="Órdenes de trabajo" Icono={ClipboardListIcon}>
            <Proximamente Icono={ClipboardListIcon}>
              Próximamente las OT generadas
            </Proximamente>
          </PanelDetalle>
          <PanelDetalle titulo="Restricciones" Icono={ShieldIcon}>
            <Proximamente Icono={ShieldIcon}>
              Sin restricciones generadas, próximamente…
            </Proximamente>
          </PanelDetalle>
        </div>

        <LineaDeTiempo entradas={entradas} />
      </div>
    </div>
  );
}
