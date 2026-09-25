import { CabeceraListado } from "@/core/components/cabecera-listado";

// Ruta plana a propósito: el encabezado "CRM" bajo el que aparece este enlace
// es solo una etiqueta del menú y nunca entra en la URL. El porqué está en
// components/barra-lateral.tsx (comentario sobre MENU).
export const metadata = { title: "Embudo de oportunidades" };

/**
 * Base vacía del módulo, en construcción activa: el contenido llega en el
 * Bloque 4 (ver "Estado del grupo CRM" en AGENTS.md). No es un
 * "próximamente" indefinido — ese patrón se retiró del resto del menú — sino
 * la ruta ya protegida por el layout, lista para llenarse.
 */
export default function PaginaOportunidades() {
  return <CabeceraListado titulo="Embudo de oportunidades" />;
}
