"use client";

import { BuscadorListado } from "@/core/components/buscador-listado";
import { urlListado, type FiltrosServicios } from "../filtros";

/**
 * Buscador del listado. El texto viaja en la URL
 * (`/servicios?busqueda=andamio`) y la coincidencia la resuelve el `ILIKE` de
 * queries.ts sobre `codigo`, `servicio` y `unidad` — aquí no se filtra nada:
 * la pantalla nunca llega a tener en memoria las filas que no coinciden.
 *
 * `unidad` SÍ está entre las tres, a diferencia del buscador de Materiales y
 * de Lista de precios, que la dejan fuera a propósito ("un puñado de valores
 * repetidos… traería medio catálogo"). Aquí pesa distinto: son solo tres
 * columnas de texto en total —`categoria` tiene su propio filtro cerrado, ver
 * `filtro-categoria.tsx`—, así que excluir `unidad` dejaría el buscador
 * cubriendo dos tercios del catálogo en vez de todo. Encargo explícito de la
 * Parte 2.
 *
 * Una sola caja para los tres campos, no tres cajas: quien busca un servicio
 * escribe lo que recuerda sin saber en qué columna cae.
 *
 * La mecánica (pausa de tecleo, `replace`, vaciarse al limpiar filtros) vive
 * en `core/components/buscador-listado.tsx`, común a todos los listados; este
 * archivo solo le pasa la `urlListado` del módulo y el texto de ejemplo.
 */
export function BuscadorServicios({ filtros }: { filtros: FiltrosServicios }) {
  return (
    <BuscadorListado
      filtros={filtros}
      urlListado={urlListado}
      placeholder="Buscar por código, servicio o unidad"
    />
  );
}
