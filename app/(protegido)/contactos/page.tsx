import { PlusIcon, SearchXIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabeceraListado } from "@/core/components/cabecera-listado";
import { ContadorRegistros } from "@/core/components/contador-registros";
import { EstadoVacio } from "@/core/components/estado-vacio";
import { LimpiarFiltros } from "@/core/components/limpiar-filtros";
import { PaginacionListado } from "@/core/components/paginacion-listado";
import { calcularPaginacion, paginaSchema } from "@/core/paginacion";
import { crearContacto } from "@/modules/contactos/actions";
import { BuscadorContactos } from "@/modules/contactos/components/buscador-contactos";
import { DialogoContacto } from "@/modules/contactos/components/dialogo-contacto";
import { FiltroInactivos } from "@/modules/contactos/components/filtro-inactivos";
import { TablaContactos } from "@/modules/contactos/components/tabla-contactos";
import {
  contarFiltros,
  urlListado,
  type FiltrosContactos,
} from "@/modules/contactos/filtros";
import {
  contarContactosPorEstado,
  contarResultados,
  listarContactos,
} from "@/modules/contactos/queries";
import {
  filtroBusquedaSchema,
  filtroInactivosSchema,
} from "@/modules/contactos/schema";

// Ruta plana a propósito: el encabezado "CRM" bajo el que aparece este enlace
// es solo una etiqueta del menú y nunca entra en la URL. El porqué está en
// components/barra-lateral.tsx (comentario sobre MENU).
export const metadata = { title: "Contactos" };

export default async function PaginaContactos({
  searchParams,
}: PageProps<"/contactos">) {
  const { busqueda, inactivos, pagina } = await searchParams;

  // Todo lo que viene de la URL pasa por Zod antes de usarse: un parámetro
  // inventado o repetido se ignora en vez de reventar la pantalla.
  const filtros: FiltrosContactos = {
    busqueda: filtroBusquedaSchema.parse(busqueda),
    inactivos: filtroInactivosSchema.parse(inactivos) === "1",
    pagina: paginaSchema.parse(pagina),
  };

  // El total va primero porque decide qué página se trae: una página que ya
  // no existe se ajusta a la última real. Ver `calcularPaginacion`.
  const [total, porEstado] = await Promise.all([
    contarResultados(filtros),
    contarContactosPorEstado(),
  ]);
  const paginacion = calcularPaginacion(total, filtros.pagina);
  const contactos = await listarContactos(filtros, paginacion);
  const filtrosPuestos = contarFiltros(filtros);

  // El mismo disparador para la cabecera y el estado vacío: dos modales
  // independientes, no uno compartido.
  const nuevoContacto = (
    <DialogoContacto
      guardarAction={crearContacto}
      disparador={
        <Button>
          <PlusIcon />
          Nuevo contacto
        </Button>
      }
    />
  );

  const limpiar = (
    <LimpiarFiltros href={urlListado()} cantidad={filtrosPuestos} />
  );

  return (
    <div className="space-y-6">
      <CabeceraListado titulo="Contactos" accion={nuevoContacto} />

      {/* Cada control recibe los filtros completos, no solo el suyo: así el
          que cambia conserva a los otros en la URL en vez de pisarlos. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <BuscadorContactos filtros={filtros} />
          <FiltroInactivos filtros={filtros} />
          {limpiar}
        </div>
        {/* Los dos totales de la base, siempre: no dependen de la búsqueda ni
            de la vista. El punto sigue a la vista en la que se está. */}
        <ContadorRegistros
          texto={textoContador(porEstado.activos, porEstado.inactivos)}
          activos={!filtros.inactivos}
        />
      </div>

      {contactos.length > 0 ? (
        <TablaContactos
          contactos={contactos}
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
          titulo="Ningún contacto coincide con la búsqueda"
          descripcion="Prueba con otro nombre, cargo, email o empresa, o quita los filtros."
          accion={limpiar}
        />
      ) : filtros.inactivos ? (
        <EstadoVacio
          Icono={UsersIcon}
          titulo="No hay contactos inactivos"
          descripcion="Los contactos que des de baja aparecerán aquí, y desde aquí podrás reactivarlos."
          accion={limpiar}
        />
      ) : porEstado.inactivos > 0 ? (
        <EstadoVacio
          Icono={UsersIcon}
          titulo="No hay contactos activos"
          descripcion="Todos los contactos están dados de baja. Puedes verlos y reactivarlos con «Ver solo inactivos»."
          accion={nuevoContacto}
        />
      ) : (
        <EstadoVacio
          Icono={UsersIcon}
          titulo="Aún no hay contactos registrados"
          descripcion="Cuando registres el primer contacto, aparecerá aquí."
          accion={nuevoContacto}
        />
      )}
    </div>
  );
}

/** «12 activos · 3 inactivos», «1 activo · 0 inactivos». */
function textoContador(activos: number, inactivos: number): string {
  return `${activos} ${activos === 1 ? "activo" : "activos"} · ${inactivos} ${inactivos === 1 ? "inactivo" : "inactivos"}`;
}
