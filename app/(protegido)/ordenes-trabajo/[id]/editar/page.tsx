import { notFound } from "next/navigation";
import { editarOrdenTrabajo } from "@/modules/ordenes-trabajo/actions";
import { FormularioOrdenTrabajo } from "@/modules/ordenes-trabajo/components/formulario-orden-trabajo";
import { obtenerOrdenTrabajo } from "@/modules/ordenes-trabajo/queries";

export const metadata = { title: "Editar orden de trabajo" };

export default async function PaginaEditarOrdenTrabajo({
  params,
}: PageProps<"/ordenes-trabajo/[id]/editar">) {
  const { id } = await params;
  const orden = await obtenerOrdenTrabajo(id);

  if (!orden) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Editar Orden de Trabajo
        </h1>
        {/* El código se muestra, no se edita: una OT emitida conserva su
            número y su Servicio de origen. */}
        <p className="text-sm text-muted-foreground">
          {orden.codigo_ot} · {orden.cliente}
        </p>
      </div>

      <FormularioOrdenTrabajo
        guardarAction={editarOrdenTrabajo}
        orden={orden}
        urlCancelar="/ordenes-trabajo"
      />
    </div>
  );
}
