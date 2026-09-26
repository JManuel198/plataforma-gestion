import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exigirCrmVisible } from "@/core/visibilidad-crm";
import { crearOportunidad } from "@/modules/oportunidades/actions";
import { CabeceraEmbudo } from "@/modules/oportunidades/components/cabecera-embudo";
import { DialogoNuevaOportunidad } from "@/modules/oportunidades/components/dialogo-nueva-oportunidad";
import { FiltrosEmbudo } from "@/modules/oportunidades/components/filtros-embudo";
import { TableroKanban } from "@/modules/oportunidades/components/tablero-kanban";
import { contarFiltros, normalizarFiltros } from "@/modules/oportunidades/filtros";
import {
  calcularMetricasOportunidades,
  listarEmpresasConOportunidades,
  listarOportunidadesKanban,
} from "@/modules/oportunidades/queries";
import {
  filtroBusquedaSchema,
  filtroClienteSchema,
  filtroRapidoSchema,
  filtroValorSchema,
} from "@/modules/oportunidades/schema";

// Ruta plana a propósito: el encabezado "CRM" bajo el que aparece este enlace
// es solo una etiqueta del menú y nunca entra en la URL. El porqué está en
// components/barra-lateral.tsx (comentario sobre MENU).
export const metadata = { title: "Embudo de oportunidades" };

/**
 * El Embudo de oportunidades en su vista por defecto, el kanban (sección 5
 * de la spec), de SOLO LECTURA: sin arrastrar y soltar (Parte 11) y sin la
 * vista Tabla (Parte 12). `?vista=tabla` todavía no se lee: el conmutador la
 * muestra deshabilitada.
 */
export default async function PaginaOportunidades({
  searchParams,
}: PageProps<"/oportunidades">) {
  // TEMPORAL: esta pantalla da 404 a los correos de CRM_OCULTO_PARA mientras
  // el módulo esté en construcción (core/visibilidad-crm.ts).
  await exigirCrmVisible();

  const { busqueda, rapido, cliente, valor } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla. Y se
  // normaliza para el Embudo, que no tiene filtro de estado ni páginas.
  const filtros = normalizarFiltros(
    {
      busqueda: filtroBusquedaSchema.parse(busqueda),
      rapido: filtroRapidoSchema.parse(rapido),
      cliente: filtroClienteSchema.parse(cliente),
      valor: filtroValorSchema.parse(valor),
    },
    "embudo",
  );

  const [columnas, metricas, empresas] = await Promise.all([
    listarOportunidadesKanban(filtros),
    calcularMetricasOportunidades(filtros, "embudo"),
    listarEmpresasConOportunidades(),
  ]);

  return (
    <div className="space-y-6">
      <CabeceraEmbudo
        metricas={metricas}
        accion={
          <DialogoNuevaOportunidad
            guardarAction={crearOportunidad}
            disparador={
              <Button>
                <PlusIcon />
                Nueva oportunidad
              </Button>
            }
          />
        }
      />

      {/* Los filtros reciben los filtros completos, no solo el suyo: así el
          que cambia conserva a los otros en la URL en vez de pisarlos. */}
      <FiltrosEmbudo filtros={filtros} empresas={empresas} />

      <TableroKanban
        columnas={columnas}
        filtros={filtros}
        hayFiltros={contarFiltros(filtros) > 0}
      />
    </div>
  );
}
