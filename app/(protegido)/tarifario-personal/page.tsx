import { Button } from "@/components/ui/button";
import { crearTarifaEnModal } from "@/modules/tarifario-personal/actions";
import { BuscadorTarifas } from "@/modules/tarifario-personal/components/buscador-tarifas";
import { DialogoTarifa } from "@/modules/tarifario-personal/components/dialogo-tarifa";
import { FiltroInactivos } from "@/modules/tarifario-personal/components/filtro-inactivos";
import { TablaTarifario } from "@/modules/tarifario-personal/components/tabla-tarifario";
import {
  hayFiltros,
  type FiltrosTarifario,
} from "@/modules/tarifario-personal/filtros";
import { listarTarifas } from "@/modules/tarifario-personal/queries";
import {
  filtroBusquedaSchema,
  filtroInactivosSchema,
} from "@/modules/tarifario-personal/schema";

// Ruta plana a propósito: el encabezado "Catálogos maestros" bajo el que
// aparece este enlace es solo una etiqueta del menú y nunca entra en la URL.
// El porqué, y qué habría que tocar para revertirlo, está en
// components/barra-lateral.tsx (comentario sobre MENU).
export const metadata = { title: "Tarifario de personal" };

/**
 * El tarifario de personal: cuánto cuesta un cargo por periodo de tiempo.
 *
 * NO TIENE NINGUNA RELACIÓN CON EL MÓDULO PERSONAL, y no es un pendiente: el
 * cliente descartó explícitamente (2026-09-23) que los dos se conecten. El
 * `cargo` de aquí y el `cargo` de una persona se llaman igual y son
 * independientes — ver la decisión 1 de "Catálogos maestros" en
 * docs/spec/preguntas-abiertas.md.
 *
 * DOS FILTROS: buscador de texto y "Ver solo inactivos", ambos en
 * `searchParams` y combinados con AND en la consulta (ver `listarTarifas`).
 * Mismo patrón que `app/(protegido)/materiales/page.tsx`: cada valor de la URL
 * pasa por su propio Zod con `.catch(undefined)` antes de usarse, así que un
 * parámetro inventado o repetido se ignora en vez de reventar la pantalla.
 */
export default async function PaginaTarifarioPersonal({
  searchParams,
}: PageProps<"/tarifario-personal">) {
  const { busqueda, inactivos } = await searchParams;

  const filtros: FiltrosTarifario = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
    inactivos: filtroInactivosSchema.parse(inactivos) === "1",
  };

  const tarifas = await listarTarifas(filtros);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Tarifario de personal
          </h1>
          <p className="text-sm text-muted-foreground">
            Costo por cargo y periodo de tiempo
          </p>
        </div>
        <DialogoTarifa
          guardarAction={crearTarifaEnModal}
          disparador={<Button>Nueva tarifa</Button>}
        />
      </div>

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva al otro en la URL en vez de pisarlo. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <BuscadorTarifas filtros={filtros} />
        <FiltroInactivos filtros={filtros} />
      </div>

      <TablaTarifario tarifas={tarifas} filtrado={hayFiltros(filtros)} />
    </div>
  );
}
