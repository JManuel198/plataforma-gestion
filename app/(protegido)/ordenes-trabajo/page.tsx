import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
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
        {/* Un Link con `buttonVariants`, no un Button con `render`: el
            patrón de `render` en un elemento de navegación es el que provocó
            el aviso de accesibilidad de Base UI que ya se corrigió (commit
            4bc1270). Aquí es un enlace de verdad, así que se escribe como
            enlace. */}
        <Link href="/ordenes-trabajo/nueva" className={buttonVariants()}>
          Nueva OT
        </Link>
      </div>

      <FiltroEstado estado={estadoFiltrado} />

      <TablaOrdenesTrabajo ordenes={ordenes} />
    </div>
  );
}
