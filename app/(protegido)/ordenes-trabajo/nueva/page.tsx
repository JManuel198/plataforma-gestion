import { hoyIso } from "@/lib/fecha";
import { crearOrdenTrabajo } from "@/modules/ordenes-trabajo/actions";
import { FormularioOrdenTrabajo } from "@/modules/ordenes-trabajo/components/formulario-orden-trabajo";

export const metadata = { title: "Nueva orden de trabajo" };

/**
 * Desde la fusión con Servicio, una OT se crea desde cero: no hay Servicio de
 * origen que resolver ni `?servicio=` que leer de la URL, así que la pantalla
 * solo monta el formulario.
 *
 * La fecha de hoy se calcula aquí, en el servidor, y baja como prop: el
 * formulario es un Client Component y el reloj del navegador puede estar en
 * otra zona horaria que la del negocio (ver `hoyIso` en lib/fecha.ts).
 */
export default function PaginaNuevaOrdenTrabajo() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Nueva Orden de Trabajo
        </h1>
        <p className="text-sm text-muted-foreground">
          El número de OT y la fecha se generan solos.
        </p>
      </div>

      <FormularioOrdenTrabajo
        guardarAction={crearOrdenTrabajo}
        fechaHoy={hoyIso()}
        urlCancelar="/ordenes-trabajo"
      />
    </div>
  );
}
