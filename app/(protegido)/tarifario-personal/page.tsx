import { PantallaProximamente } from "@/components/pantalla-proximamente";

// Ruta plana a propósito: el encabezado "Catálogos maestros" bajo el que
// aparece este enlace es solo una etiqueta del menú y nunca entra en la URL.
// El porqué, y qué habría que tocar para revertirlo, está en
// components/barra-lateral.tsx (comentario sobre MENU).
export const metadata = { title: "Tarifario de personal" };

export default function PaginaTarifarioPersonal() {
  return <PantallaProximamente titulo="Tarifario de personal" />;
}
