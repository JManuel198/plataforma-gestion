import Link from "next/link";
import { Button } from "@/components/ui/button";
import { crearOrdenTrabajo } from "@/modules/ordenes-trabajo/actions";
import { FormularioOrdenTrabajo } from "@/modules/ordenes-trabajo/components/formulario-orden-trabajo";
import { obtenerServicioOrigen } from "@/modules/ordenes-trabajo/queries";
import { idServicioSchema } from "@/modules/ordenes-trabajo/schema";

export const metadata = { title: "Nueva orden de trabajo" };

/**
 * Una OT no se crea desde cero: nace de un Servicio existente, que llega en
 * `?servicio=<id>` desde el listado de Servicios o desde el Servicio mismo.
 * El id se resuelve aquí, en el servidor, y se ata a la Server Action con
 * `.bind()` — el formulario nunca lo vuelve a pedir ni lo lleva como campo.
 */
export default async function PaginaNuevaOrdenTrabajo({
  searchParams,
}: PageProps<"/ordenes-trabajo/nueva">) {
  const { servicio: idEnUrl } = await searchParams;
  const id = idServicioSchema.safeParse(idEnUrl);
  const servicio = id.success ? await obtenerServicioOrigen(id.data) : null;

  if (!servicio) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Nueva Orden de Trabajo
        </h1>
        <p className="text-sm text-muted-foreground">
          Una OT se crea a partir de un Servicio existente. Elige el Servicio y
          usa su botón <span className="font-medium">Crear OT</span>.
        </p>
        <Button render={<Link href="/servicios" />}>Ir a Servicios</Button>
      </div>
    );
  }

  // El Servicio queda atado a la acción fuera del formulario: Next lo envía
  // codificado, no como HTML visible, así que no se puede cambiar desde el
  // navegador — a diferencia de un <input type="hidden">.
  const guardarAction = crearOrdenTrabajo.bind(null, servicio.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Nueva Orden de Trabajo
        </h1>
        <p className="text-sm text-muted-foreground">
          Desde el servicio{" "}
          <span className="font-medium text-foreground">
            {servicio.servicio}
          </span>{" "}
          · {servicio.cliente}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          El número de OT y la fecha se generan solos. La cotización, la OC y
          el cliente se escriben a mano — no se copian del servicio.
        </p>
      </div>

      <FormularioOrdenTrabajo
        guardarAction={guardarAction}
        urlCancelar="/servicios"
      />
    </div>
  );
}
