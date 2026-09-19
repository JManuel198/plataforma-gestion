import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AvisoToast } from "@/modules/ordenes-trabajo/components/aviso-toast";
import { BuscadorOrdenes } from "@/modules/ordenes-trabajo/components/buscador-ordenes";
import { FiltroEstado } from "@/modules/ordenes-trabajo/components/filtro-estado";
import { FiltroFechas } from "@/modules/ordenes-trabajo/components/filtro-fechas";
import { TablaOrdenesTrabajo } from "@/modules/ordenes-trabajo/components/tabla-ordenes-trabajo";
import {
  hayFiltros,
  urlListado,
  type FiltrosOt,
} from "@/modules/ordenes-trabajo/filtros";
import { listarOrdenesTrabajo } from "@/modules/ordenes-trabajo/queries";
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
  const { estado, busqueda, desde, hasta, aviso } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado, repetido o mal formado no revienta la pantalla, se ignora
  // (`.catch(undefined)` en cada esquema).
  const filtros: FiltrosOt = {
    estado: filtroEstadoSchema.parse(estado),
    busqueda: filtroBusquedaSchema.parse(busqueda),
    desde: filtroFechaSchema.parse(desde),
    hasta: filtroFechaSchema.parse(hasta),
  };

  // Los tres filtros van juntos a la consulta y se combinan con AND ahí
  // dentro: filtrar nunca ocurre en el navegador sobre una lista ya traída.
  const ordenes = await listarOrdenesTrabajo(filtros);

  // La misma URL sin `aviso`, para limpiarla en cuanto se muestre el toast
  // sin perder los filtros que el usuario tenga puestos.
  const urlSinAviso = urlListado(filtros);

  return (
    <div className="space-y-6">
      <AvisoToast aviso={avisoSchema.parse(aviso)} destino={urlSinAviso} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Órdenes de Trabajo
        </h1>
        {/* Un Link con `buttonVariants`, no un Button con `render`: el
            patrón de `render` en un elemento de navegación es el que provocó
            el aviso de accesibilidad de Base UI que ya se corrigió (commit
            4bc1270). Aquí es un enlace de verdad, así que se escribe como
            enlace. */}
        <Link href="/ordenes-trabajo/nueva" className={buttonVariants()}>
          Nueva OT
        </Link>
      </div>

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva a los otros dos en la URL en vez de pisarlos. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <BuscadorOrdenes filtros={filtros} />
        <FiltroEstado filtros={filtros} />
        <FiltroFechas filtros={filtros} />
      </div>

      <TablaOrdenesTrabajo ordenes={ordenes} filtrado={hayFiltros(filtros)} />
    </div>
  );
}
