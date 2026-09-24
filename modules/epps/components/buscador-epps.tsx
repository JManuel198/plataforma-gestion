"use client";

import { BuscadorListado } from "@/core/components/buscador-listado";
import { urlListado, type FiltrosEpps } from "../filtros";

/**
 * Buscador del listado. El texto viaja en la URL (`/epps?busqueda=casco`) y la
 * coincidencia la resuelve el `ILIKE` de queries.ts sobre `codigo`,
 * `descripcion` y `unidad` — aquí no se filtra nada: la pantalla nunca llega a
 * tener en memoria las filas que no coinciden (regla 1 de AGENTS.md).
 *
 * El texto del usuario pasa por `patronParcial` de `core/busqueda.ts` antes de
 * llegar al `ILIKE`, importado y nunca copiado — sin ese escape, un `%`
 * escrito en esta caja actuaría como comodín.
 *
 * LA NAVEGACIÓN LA PONE `useFiltrosListado` (core/use-filtros-listado.ts), que
 * se importa y NO se copia. EPPs es el séptimo listado que lo usa, y el
 * primero que nace con él ya unificado: los seis anteriores tuvieron cada uno
 * su `components/use-filtros.ts` idéntico hasta que se fundieron el
 * 2026-09-23. La deuda técnica de AGENTS.md cuenta por qué se dejó llegar a
 * seis copias y por qué no debe haber una séptima — el resumen es que una
 * excepción que se puede repetir indefinidamente no es una excepción, es la
 * regla nueva. Lo propio de este módulo no vive en el hook: vive en
 * `FiltrosEpps` y en `urlListado` (../filtros.ts), que es justo lo que el hook
 * recibe como segundo argumento.
 *
 * Una sola caja para las tres columnas, no tres cajas: quien busca un EPP
 * escribe lo que recuerda —el código, la descripción o la unidad— sin saber de
 * antemano en qué columna cae.
 *
 * La mecánica (pausa de tecleo, `replace`, vaciarse al limpiar filtros) vive
 * en `core/components/buscador-listado.tsx`, común a todos los listados; este
 * archivo solo le pasa la `urlListado` del módulo y el texto de ejemplo.
 */
export function BuscadorEpps({ filtros }: { filtros: FiltrosEpps }) {
  return (
    <BuscadorListado
      filtros={filtros}
      urlListado={urlListado}
      placeholder="Buscar por código, descripción o unidad"
    />
  );
}
