import { PlusIcon, SearchXIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabeceraListado } from "@/core/components/cabecera-listado";
import { ContadorRegistros } from "@/core/components/contador-registros";
import { EstadoVacio } from "@/core/components/estado-vacio";
import { LimpiarFiltros } from "@/core/components/limpiar-filtros";
import { PaginacionListado } from "@/core/components/paginacion-listado";
import { calcularPaginacion, paginaSchema } from "@/core/paginacion";
import { crearPersonaEnModal } from "@/modules/personal/actions";
import { BuscadorPersonal } from "@/modules/personal/components/buscador-personal";
import { DialogoPersona } from "@/modules/personal/components/dialogo-persona";
import { FiltroInactivos } from "@/modules/personal/components/filtro-inactivos";
import { TablaPersonal } from "@/modules/personal/components/tabla-personal";
import {
  contarFiltros,
  urlListado,
  type FiltrosPersonal,
} from "@/modules/personal/filtros";
import {
  contarPersonal,
  contarResultados,
  listarPersonal,
} from "@/modules/personal/queries";
import {
  filtroBusquedaSchema,
  filtroInactivosSchema,
} from "@/modules/personal/schema";

// Ruta plana a propósito: el encabezado "SSOMA" bajo el que aparece este
// enlace es solo una etiqueta del menú y nunca entra en la URL. El porqué, y
// qué habría que tocar para revertirlo, está en components/barra-lateral.tsx
// (comentario sobre MENU).
export const metadata = { title: "Personal" };

export default async function PaginaPersonal({
  searchParams,
}: PageProps<"/personal">) {
  const { busqueda, inactivos, pagina } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla.
  const filtros: FiltrosPersonal = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
    inactivos: filtroInactivosSchema.parse(inactivos) === "1",
    pagina: paginaSchema.parse(pagina),
  };

  // El total va primero porque decide qué página se trae: una página que ya
  // no existe se ajusta a la última real. Ver `calcularPaginacion`.
  const [total, totalVista] = await Promise.all([
    contarResultados(filtros),
    contarPersonal(filtros.inactivos),
  ]);
  const paginacion = calcularPaginacion(total, filtros.pagina);
  const personas = await listarPersonal(filtros, paginacion);
  const filtrosPuestos = contarFiltros(filtros);

  // Solo cuando la vista de activos sale vacía sin filtros: distingue "el
  // catálogo está vacío" de "todos están dados de baja".
  const hayInactivos =
    personas.length === 0 && filtrosPuestos === 0
      ? (await contarPersonal(true)) > 0
      : false;

  // El mismo disparador para la cabecera y el estado vacío: dos modales
  // independientes, no uno compartido.
  const nuevaPersona = (
    <DialogoPersona
      guardarAction={crearPersonaEnModal}
      disparador={
        <Button>
          <PlusIcon />
          Nueva persona
        </Button>
      }
    />
  );

  const limpiar = (
    <LimpiarFiltros href={urlListado()} cantidad={filtrosPuestos} />
  );

  return (
    <div className="space-y-6">
      <CabeceraListado titulo="Personal" accion={nuevaPersona} />

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva al otro en la URL en vez de pisarlo. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <BuscadorPersonal filtros={filtros} />
          <FiltroInactivos filtros={filtros} />
          {limpiar}
        </div>
        <ContadorRegistros
          texto={textoContador(totalVista, Boolean(filtros.inactivos))}
          activos={!filtros.inactivos}
        />
      </div>

      {personas.length > 0 ? (
        <TablaPersonal
          personas={personas}
          pie={
            <PaginacionListado
              paginacion={paginacion}
              hrefPagina={(numero) =>
                urlListado({ ...filtros, pagina: numero })
              }
            />
          }
        />
      ) : filtros.busqueda ? (
        <EstadoVacio
          Icono={SearchXIcon}
          titulo="Nadie coincide con la búsqueda"
          descripcion="Prueba con otro nombre, apellido, DNI o cargo, o quita los filtros."
          accion={limpiar}
        />
      ) : filtros.inactivos ? (
        <EstadoVacio
          Icono={UsersIcon}
          titulo="No hay personal dado de baja"
          descripcion="Las personas que des de baja aparecerán aquí, y desde aquí podrás reactivarlas."
          accion={limpiar}
        />
      ) : hayInactivos ? (
        <EstadoVacio
          Icono={UsersIcon}
          titulo="No hay personal activo"
          descripcion="Todo el personal está dado de baja. Puedes verlo y reactivarlo con «Ver solo dados de baja»."
          accion={nuevaPersona}
        />
      ) : (
        <EstadoVacio
          Icono={UsersIcon}
          titulo="Aún no hay personal registrado"
          descripcion="Cuando registres a la primera persona, aparecerá aquí."
          accion={nuevaPersona}
        />
      )}
    </div>
  );
}

/** «24 personas activas». */
function textoContador(total: number, inactivos: boolean): string {
  const uno = total === 1;
  const sustantivo = uno ? "persona" : "personas";
  const situacion = inactivos
    ? uno
      ? "dada de baja"
      : "dadas de baja"
    : uno
      ? "activa"
      : "activas";

  return `${total} ${sustantivo} ${situacion}`;
}
