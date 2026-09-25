"use client";

import { BuscadorListado } from "@/core/components/buscador-listado";
import { urlListado, type FiltrosContactos } from "../filtros";

/**
 * Buscador del listado. El texto viaja en la URL (`/contactos?busqueda=ana`) y
 * la coincidencia la resuelve el `ILIKE` de queries.ts sobre el nombre, el
 * cargo y el correo del contacto y la razón social o el nombre comercial de su
 * empresa. La mecánica vive en `core/components/buscador-listado.tsx`; aquí
 * solo se le pasa la `urlListado` del módulo y el texto de ejemplo.
 */
export function BuscadorContactos({ filtros }: { filtros: FiltrosContactos }) {
  return (
    <BuscadorListado
      filtros={filtros}
      urlListado={urlListado}
      placeholder="Buscar por nombre, cargo, email o empresa"
    />
  );
}
