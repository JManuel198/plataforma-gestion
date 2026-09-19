import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AvisoToast } from "@/modules/servicios/components/aviso-toast";
import { FiltroEstado } from "@/modules/servicios/components/filtro-estado";
import { TablaServicios } from "@/modules/servicios/components/tabla-servicios";
import { listarServicios } from "@/modules/servicios/queries";
import { avisoSchema, filtroEstadoSchema } from "@/modules/servicios/schema";

export const metadata = { title: "Servicios" };

export default async function PaginaServicios({
  searchParams,
}: PageProps<"/servicios">) {
  const { estado, aviso } = await searchParams;
  // Un ?estado= inventado en la URL no revienta la pantalla: se ignora y se
  // listan todos (`.catch(undefined)` en el esquema).
  const estadoFiltrado = filtroEstadoSchema.parse(estado);
  const servicios = await listarServicios(estadoFiltrado);

  // La misma URL sin `aviso`, para limpiarla en cuanto se muestre el toast
  // sin perder el filtro que el usuario tenga puesto.
  const urlSinAviso = estadoFiltrado
    ? `/servicios?estado=${encodeURIComponent(estadoFiltrado)}`
    : "/servicios";

  return (
    <div className="space-y-6">
      <AvisoToast aviso={avisoSchema.parse(aviso)} destino={urlSinAviso} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Servicios</h1>
        <Link href="/servicios/nuevo" className={buttonVariants()}>
          Nuevo Servicio
        </Link>
      </div>

      <FiltroEstado estado={estadoFiltrado} />

      <TablaServicios servicios={servicios} />
    </div>
  );
}
