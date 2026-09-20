import { Button } from "@/components/ui/button";
import { crearPersonaEnModal } from "@/modules/personal/actions";
import { BuscadorPersonal } from "@/modules/personal/components/buscador-personal";
import { DialogoPersona } from "@/modules/personal/components/dialogo-persona";
import { FiltroInactivos } from "@/modules/personal/components/filtro-inactivos";
import { TablaPersonal } from "@/modules/personal/components/tabla-personal";
import { hayFiltros, type FiltrosPersonal } from "@/modules/personal/filtros";
import { listarPersonal } from "@/modules/personal/queries";
import {
  filtroBusquedaSchema,
  filtroInactivosSchema,
} from "@/modules/personal/schema";

export const metadata = { title: "Personal" };

export default async function PaginaPersonal({
  searchParams,
}: PageProps<"/personal">) {
  const { busqueda, inactivos } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla.
  const filtros: FiltrosPersonal = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
    inactivos: filtroInactivosSchema.parse(inactivos) === "1",
  };

  const personas = await listarPersonal(filtros);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Personal</h1>
        <DialogoPersona
          guardarAction={crearPersonaEnModal}
          disparador={<Button>Nueva persona</Button>}
        />
      </div>

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva al otro en la URL en vez de pisarlo. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <BuscadorPersonal filtros={filtros} />
        <FiltroInactivos filtros={filtros} />
      </div>

      <TablaPersonal personas={personas} filtrado={hayFiltros(filtros)} />
    </div>
  );
}
