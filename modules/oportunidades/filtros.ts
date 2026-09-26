/**
 * Los filtros del embudo y de la tabla de oportunidades, y cómo se escriben en
 * la URL.
 *
 * Fuera de queries.ts a propósito: este archivo no importa Drizzle ni la
 * conexión, así que lo pueden usar tanto las consultas del servidor como los
 * controles de filtro, que son Client Components. Mismo criterio que
 * `modules/contactos/filtros.ts`.
 */

import {
  RUTA_LISTADO,
  type EstadoTabla,
  type OpcionRapida,
  type RangoValor,
  type Vista,
} from "./constantes";

export type FiltrosOportunidades = {
  /**
   * Texto libre: casa parcialmente con el título o el código de la
   * oportunidad, o con la razón social / nombre comercial de su empresa.
   */
  busqueda?: string;
  /** Opción rápida de selección única; ausente = "Todas". */
  rapido?: OpcionRapida;
  /** `empresa_id` del desplegable Cliente; ausente = todos. */
  cliente?: string;
  /** Rango del desplegable Valor (solo USD); ausente = todos. */
  valor?: RangoValor;
  /** Solo lo usa la Tabla; el kanban lo ignora. Ausente = "activas". */
  estado?: EstadoTabla;
  /** La página de la Tabla (1-based). No es un filtro. */
  pagina?: number;
};

/**
 * Deja los filtros en una combinación con sentido para la vista:
 *
 * - En la Tabla, "Sin mover ≥7d" solo existe con el estado "Activas". Con
 *   otro estado se REINICIA a "Todas" (sección 9: no se conserva marcada ni
 *   reaparece al volver a Activas). *Por qué:* el reloj de días no aplica a
 *   Finalizadas, Perdidas ni Anuladas (sección 3).
 * - El kanban no tiene filtro de estado: se descarta, para que una URL que
 *   venga de la Tabla no arrastre un estado que el embudo no muestra.
 *
 * Lo llaman la página, para que la URL y los controles reflejen la
 * combinación real, y las consultas, para que un filtro imposible nunca
 * llegue a la base aunque alguien se salte la página.
 */
export function normalizarFiltros(
  filtros: FiltrosOportunidades,
  vista: Vista,
): FiltrosOportunidades {
  if (vista === "embudo") {
    const { busqueda, rapido, cliente, valor } = filtros;
    return { busqueda, rapido, cliente, valor };
  }

  const estado = filtros.estado ?? "activas";

  if (filtros.rapido === "sin-mover" && estado !== "activas") {
    return { ...filtros, estado, rapido: undefined };
  }

  return { ...filtros, estado };
}

/** Los parámetros de URL de una vista del listado con sus filtros. */
function parametrosListado(
  filtros: FiltrosOportunidades,
  vista: Vista,
): URLSearchParams {
  const params = new URLSearchParams();

  if (vista === "tabla") params.set("vista", "tabla");
  if (filtros.busqueda) params.set("busqueda", filtros.busqueda);
  if (filtros.rapido) params.set("rapido", filtros.rapido);
  if (filtros.cliente) params.set("cliente", filtros.cliente);
  if (filtros.valor) params.set("valor", filtros.valor);

  // El estado y la página solo existen en la Tabla, y sus valores por defecto
  // son la ausencia del parámetro, no un `estado=activas` / `pagina=1`.
  if (vista === "tabla") {
    if (filtros.estado && filtros.estado !== "activas") {
      params.set("estado", filtros.estado);
    }
    if (filtros.pagina && filtros.pagina > 1) {
      params.set("pagina", String(filtros.pagina));
    }
  }

  return params;
}

export function urlListado(
  filtros: FiltrosOportunidades = {},
  vista: Vista = "embudo",
): string {
  const cadena = parametrosListado(filtros, vista).toString();

  return cadena ? `${RUTA_LISTADO}?${cadena}` : RUTA_LISTADO;
}

/**
 * El enlace al detalle de una oportunidad, LLEVANDO EL ORIGEN: la vista y los
 * filtros con los que se llegó viajan como los mismos parámetros del listado
 * (`/oportunidades/<id>?rapido=sin-mover&vista=tabla`). El detalle los valida
 * con los mismos Zod y reconstruye con `urlListado` el destino de "< Pipeline"
 * (sección 7: vuelve a la vista de la que se vino, con sus filtros).
 *
 * En la URL y no en el historial del navegador: sobrevive a una recarga y a
 * abrir la tarjeta en otra pestaña, y es el mismo criterio de todo el
 * proyecto (los filtros viven en la URL). Y como el destino se RECONSTRUYE
 * desde filtros validados, nunca se redirige a una cadena recibida tal cual.
 */
export function urlDetalle(
  id: string,
  filtros: FiltrosOportunidades = {},
  vista: Vista = "embudo",
): string {
  const ruta = `${RUTA_LISTADO}/${encodeURIComponent(id)}`;
  const cadena = parametrosListado(filtros, vista).toString();

  return cadena ? `${ruta}?${cadena}` : ruta;
}

/**
 * Cuántos filtros hay puestos: el número de «Limpiar filtros». `pagina` no
 * cuenta, y el estado solo cuenta si no es el de por defecto.
 */
export function contarFiltros(filtros: FiltrosOportunidades): number {
  return [
    filtros.busqueda,
    filtros.rapido,
    filtros.cliente,
    filtros.valor,
    filtros.estado && filtros.estado !== "activas" ? filtros.estado : undefined,
  ].filter(Boolean).length;
}
