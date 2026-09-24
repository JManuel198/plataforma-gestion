"use client";

import { BuscadorListado } from "@/core/components/buscador-listado";
import { urlListado, type FiltrosMateriales } from "../filtros";

/**
 * Buscador del listado. El texto viaja en la URL
 * (`/materiales?busqueda=taladro`) y la coincidencia la resuelve el `ILIKE` de
 * queries.ts sobre `codigo_interno`, `descripcion`, `marca` y `modelo` — aquí
 * no se filtra nada: la pantalla nunca llega a tener en memoria las filas que
 * no coinciden.
 *
 * Una sola caja para los cuatro campos, no cuatro cajas: quien busca un
 * material escribe lo que recuerda —el código, un trozo de la descripción o la
 * marca— sin saber de antemano en qué columna cae.
 *
 * La mecánica (pausa de tecleo, `replace`, vaciarse al limpiar filtros) vive
 * en `core/components/buscador-listado.tsx`, común a todos los listados; este
 * archivo solo le pasa la `urlListado` del módulo y el texto de ejemplo.
 */
export function BuscadorMateriales({ filtros }: { filtros: FiltrosMateriales }) {
  return (
    <BuscadorListado
      filtros={filtros}
      urlListado={urlListado}
      placeholder="Buscar por código, descripción, marca o modelo"
    />
  );
}
