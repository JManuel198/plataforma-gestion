import { Button } from "@/components/ui/button";
import { crearServicioEnModal } from "@/modules/servicios/actions";
import { DialogoServicio } from "@/modules/servicios/components/dialogo-servicio";
import { TablaServicios } from "@/modules/servicios/components/tabla-servicios";
import { listarServicios } from "@/modules/servicios/queries";

// Ruta plana a propósito: el encabezado "Catálogos maestros" bajo el que
// aparece este enlace es solo una etiqueta del menú y nunca entra en la URL.
// El porqué, y qué habría que tocar para revertirlo, está en
// components/barra-lateral.tsx (comentario sobre MENU).
//
// OJO CON EL NOMBRE: este catálogo NO es la entidad `Servicio` que se fusionó
// en Orden de Trabajo el 2026-09-19. Esta ruta se reutiliza para un concepto
// distinto — el catálogo maestro de servicios con precios de tarifa. La
// colisión está registrada como decisión 7 de "Catálogos maestros" en
// docs/spec/preguntas-abiertas.md, con la salida prevista (renombrar a
// `/catalogo-servicios`) si llega a confundir al negocio.
export const metadata = { title: "Servicios" };

/**
 * El catálogo de servicios.
 *
 * SIN `searchParams`, a diferencia de las páginas de Materiales, Lista de
 * precios, Personal y OT: en la Parte 1 no hay ni buscador ni filtro de
 * inactivos, así que no hay nada que leer de la URL y nada que validar con Zod.
 * Cuando llegue el buscador (Parte 2), el patrón completo —parseo con
 * `.catch(undefined)` para que un parámetro inventado se ignore en vez de
 * reventar la pantalla— está en `app/(protegido)/lista-precios/page.tsx`.
 *
 * Tampoco hay filtro de inactivos, y ese no llega en la Parte 2 por sí solo:
 * depende de que se confirme si este catálogo necesita inactivar/reactivar, que
 * hoy es una pregunta abierta y por eso la tabla no tiene columna `activo`.
 */
export default async function PaginaServicios() {
  const servicios = await listarServicios();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Servicios</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de servicios con su precio de tarifa
          </p>
        </div>
        <DialogoServicio
          guardarAction={crearServicioEnModal}
          disparador={<Button>Nuevo servicio</Button>}
        />
      </div>

      <TablaServicios servicios={servicios} />
    </div>
  );
}
