import { AvisoToast } from "@/modules/ordenes-trabajo/components/aviso-toast";
import { FiltroEstado } from "@/modules/ordenes-trabajo/components/filtro-estado";
import { TablaOrdenesTrabajo } from "@/modules/ordenes-trabajo/components/tabla-ordenes-trabajo";
import { listarOrdenesTrabajo } from "@/modules/ordenes-trabajo/queries";
import { avisoSchema, filtroEstadoSchema } from "@/modules/ordenes-trabajo/schema";

export const metadata = { title: "Órdenes de trabajo" };

export default async function PaginaOrdenesTrabajo({
  searchParams,
}: PageProps<"/ordenes-trabajo">) {
  const { estado, aviso } = await searchParams;
  // Un ?estado= inventado en la URL no revienta la pantalla: se ignora y se
  // listan todas (`.catch(undefined)` en el esquema).
  const estadoFiltrado = filtroEstadoSchema.parse(estado);
  const ordenes = await listarOrdenesTrabajo(estadoFiltrado);

  // La misma URL sin `aviso`, para limpiarla en cuanto se muestre el toast
  // sin perder el filtro que el usuario tenga puesto.
  const urlSinAviso = estadoFiltrado
    ? `/ordenes-trabajo?estado=${encodeURIComponent(estadoFiltrado)}`
    : "/ordenes-trabajo";

  return (
    <div className="space-y-6">
      <AvisoToast aviso={avisoSchema.parse(aviso)} destino={urlSinAviso} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Órdenes de Trabajo
        </h1>
        {/* No hay botón de "Nueva OT" aquí a propósito: una OT nace de un
            Servicio ya creado (Fase 3 del alcance), así que se abre desde el
            listado de Servicios o desde el Servicio mismo. */}
        <p className="text-sm text-muted-foreground">
          Se crean desde un Servicio.
        </p>
      </div>

      <FiltroEstado estado={estadoFiltrado} />

      <TablaOrdenesTrabajo ordenes={ordenes} />
    </div>
  );
}
