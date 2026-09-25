import { Building2Icon, PlusIcon, SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabeceraListado } from "@/core/components/cabecera-listado";
import { ContadorRegistros } from "@/core/components/contador-registros";
import { EstadoVacio } from "@/core/components/estado-vacio";
import { LimpiarFiltros } from "@/core/components/limpiar-filtros";
import { PaginacionListado } from "@/core/components/paginacion-listado";
import { calcularPaginacion, paginaSchema } from "@/core/paginacion";
import { exigirCrmVisible } from "@/core/visibilidad-crm";
import { crearEmpresa } from "@/modules/clientes/actions";
import { BuscadorEmpresas } from "@/modules/clientes/components/buscador-empresas";
import { DialogoEmpresa } from "@/modules/clientes/components/dialogo-empresa";
import { FiltroInactivos } from "@/modules/clientes/components/filtro-inactivos";
import { FiltroTipo } from "@/modules/clientes/components/filtro-tipo";
import { TablaEmpresas } from "@/modules/clientes/components/tabla-empresas";
import {
  contarFiltros,
  urlListado,
  type FiltrosEmpresas,
} from "@/modules/clientes/filtros";
import {
  contarEmpresas,
  contarResultados,
  listarEmpresas,
} from "@/modules/clientes/queries";
import {
  filtroBusquedaSchema,
  filtroInactivosSchema,
  filtroTipoSchema,
} from "@/modules/clientes/schema";

// Ruta plana a propósito: el encabezado "CRM" bajo el que aparece este enlace
// es solo una etiqueta del menú y nunca entra en la URL. El porqué está en
// components/barra-lateral.tsx (comentario sobre MENU).
//
// El menú dice "Clientes" y la pantalla "Empresas": la tabla guarda clientes,
// proveedores o ambas cosas (ver db/schema/empresas.ts). El título de la
// pestaña sigue al de la pantalla.
export const metadata = { title: "Empresas" };

export default async function PaginaEmpresas({
  searchParams,
}: PageProps<"/clientes">) {
  // TEMPORAL: 404 para quien tiene el CRM oculto (core/visibilidad-crm.ts).
  await exigirCrmVisible();

  const { busqueda, tipo, inactivos, pagina } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla.
  const filtros: FiltrosEmpresas = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
    tipo: filtroTipoSchema.parse(tipo),
    inactivos: filtroInactivosSchema.parse(inactivos) === "1",
    pagina: paginaSchema.parse(pagina),
  };

  // El total va primero porque decide qué página se trae: una página que ya
  // no existe se ajusta a la última real. Ver `calcularPaginacion`.
  const [total, totalVista] = await Promise.all([
    contarResultados(filtros),
    contarEmpresas(filtros.inactivos),
  ]);
  const paginacion = calcularPaginacion(total, filtros.pagina);
  const empresas = await listarEmpresas(filtros, paginacion);
  const filtrosPuestos = contarFiltros(filtros);

  // Solo cuando la vista de activas sale vacía sin filtros: distingue "el
  // directorio está vacío" de "todas están dadas de baja".
  const hayInactivas =
    empresas.length === 0 && filtrosPuestos === 0
      ? (await contarEmpresas(true)) > 0
      : false;

  // El mismo disparador para la cabecera y el estado vacío: dos modales
  // independientes, no uno compartido.
  const nuevaEmpresa = (
    <DialogoEmpresa
      guardarAction={crearEmpresa}
      disparador={
        <Button>
          <PlusIcon />
          Nueva empresa
        </Button>
      }
    />
  );

  const limpiar = (
    <LimpiarFiltros href={urlListado()} cantidad={filtrosPuestos} />
  );

  return (
    <div className="space-y-6">
      <CabeceraListado
        titulo="Empresas"
        descripcion="Directorio unificado de clientes y proveedores"
        accion={nuevaEmpresa}
      />

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva a los otros en la URL en vez de pisarlos. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <BuscadorEmpresas filtros={filtros} />
          <FiltroTipo filtros={filtros} />
          <FiltroInactivos filtros={filtros} />
          {limpiar}
        </div>
        <ContadorRegistros
          texto={textoContador(totalVista, Boolean(filtros.inactivos))}
          activos={!filtros.inactivos}
        />
      </div>

      {empresas.length > 0 ? (
        <TablaEmpresas
          empresas={empresas}
          pie={
            <PaginacionListado
              paginacion={paginacion}
              hrefPagina={(numero) => urlListado({ ...filtros, pagina: numero })}
            />
          }
        />
      ) : filtros.busqueda ? (
        <EstadoVacio
          Icono={SearchXIcon}
          titulo="Ninguna empresa coincide con la búsqueda"
          descripcion="Prueba con otra razón social o RUC, o quita los filtros."
          accion={limpiar}
        />
      ) : filtros.tipo ? (
        <EstadoVacio
          Icono={SearchXIcon}
          titulo="No hay empresas de este tipo"
          descripcion="Elige otro tipo o quita los filtros para ver todo el directorio."
          accion={limpiar}
        />
      ) : filtros.inactivos ? (
        <EstadoVacio
          Icono={Building2Icon}
          titulo="No hay empresas inactivas"
          descripcion="Las empresas que des de baja aparecerán aquí, y desde aquí podrás reactivarlas."
          accion={limpiar}
        />
      ) : hayInactivas ? (
        <EstadoVacio
          Icono={Building2Icon}
          titulo="No hay empresas activas"
          descripcion="Todas las empresas están dadas de baja. Puedes verlas y reactivarlas con «Ver solo inactivas»."
          accion={nuevaEmpresa}
        />
      ) : (
        <EstadoVacio
          Icono={Building2Icon}
          titulo="Aún no hay empresas registradas"
          descripcion="Cuando registres la primera empresa, aparecerá aquí."
          accion={nuevaEmpresa}
        />
      )}
    </div>
  );
}

/** «24 empresas activas», «1 empresa inactiva». */
function textoContador(total: number, inactivos: boolean): string {
  const uno = total === 1;
  const sustantivo = uno ? "empresa" : "empresas";
  const situacion = inactivos
    ? uno
      ? "inactiva"
      : "inactivas"
    : uno
      ? "activa"
      : "activas";

  return `${total} ${sustantivo} ${situacion}`;
}
