import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CabeceraListado } from "@/core/components/cabecera-listado";
import { exigirCrmVisible } from "@/core/visibilidad-crm";
import { crearOportunidad } from "@/modules/oportunidades/actions";
import { DialogoNuevaOportunidad } from "@/modules/oportunidades/components/dialogo-nueva-oportunidad";

// Ruta plana a propósito: el encabezado "CRM" bajo el que aparece este enlace
// es solo una etiqueta del menú y nunca entra en la URL. El porqué está en
// components/barra-lateral.tsx (comentario sobre MENU).
export const metadata = { title: "Embudo de oportunidades" };

/**
 * PROVISIONAL (Parte 7 del plan): solo la cabecera con el botón "Nueva
 * oportunidad". La cabecera real —"Solo lo mío", el subtítulo de activas, las
 * métricas y los filtros— y el kanban llegan en la Parte 8. "CRM Comercial"
 * es el título de la página (sección 5 de la spec); el menú y las migas de pan
 * siguen diciendo "Embudo de oportunidades".
 */
export default async function PaginaOportunidades() {
  // TEMPORAL: esta pantalla da 404 a los correos de CRM_OCULTO_PARA mientras
  // el módulo esté en construcción (core/visibilidad-crm.ts).
  await exigirCrmVisible();

  return (
    <CabeceraListado
      titulo="CRM Comercial"
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
  );
}
