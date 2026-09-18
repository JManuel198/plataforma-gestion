import { notFound } from "next/navigation";
import { editarServicio } from "@/modules/servicios/actions";
import { FormularioServicio } from "@/modules/servicios/components/formulario-servicio";
import { obtenerServicio } from "@/modules/servicios/queries";

export const metadata = { title: "Editar servicio" };

export default async function PaginaEditarServicio({
  params,
}: PageProps<"/servicios/[id]/editar">) {
  const { id } = await params;
  const servicio = await obtenerServicio(id);

  if (!servicio) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Editar Servicio
        </h1>
        <p className="text-sm text-muted-foreground">
          {servicio.codigo_cotizacion} · {servicio.cliente}
        </p>
      </div>

      <FormularioServicio guardarAction={editarServicio} servicio={servicio} />
    </div>
  );
}
