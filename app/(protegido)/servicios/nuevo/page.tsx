import { crearServicio } from "@/modules/servicios/actions";
import { FormularioServicio } from "@/modules/servicios/components/formulario-servicio";

export const metadata = { title: "Nuevo servicio" };

export default function PaginaNuevoServicio() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Nuevo Servicio
        </h1>
        <p className="text-sm text-muted-foreground">
          La fecha se registra sola al crear el servicio.
        </p>
      </div>

      <FormularioServicio guardarAction={crearServicio} />
    </div>
  );
}
