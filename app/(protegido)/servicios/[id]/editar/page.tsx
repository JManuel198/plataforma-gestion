import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Editar Servicio
          </h1>
          <p className="text-sm text-muted-foreground">
            {servicio.codigo_cotizacion} · {servicio.cliente}
          </p>
        </div>
        {/* Esta es hoy la única pantalla propia de un Servicio, así que hace
            también de detalle: desde aquí se abre la OT ya vinculada a él.
            El id viaja en la URL y se resuelve en el servidor — el formulario
            de la OT nunca vuelve a pedir el servicio. */}
        <Link
          href={`/ordenes-trabajo/nueva?servicio=${servicio.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Crear OT
        </Link>
      </div>

      <FormularioServicio guardarAction={editarServicio} servicio={servicio} />
    </div>
  );
}
