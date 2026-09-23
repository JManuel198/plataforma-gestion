"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FiltrosServicios } from "../filtros";
import { useFiltros } from "./use-filtros";

/**
 * Pausa de tecleo antes de navegar. Sin ella cada letra sería una consulta a
 * la base de datos; con mucha más, el listado se sentiría desconectado de lo
 * que se está escribiendo.
 */
const RETARDO_MS = 400;

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
 * El texto se guarda además en estado local porque el input tiene que seguir
 * al teclado al instante, mientras la navegación va por detrás en una
 * transición. Leerlo directo de `filtros.busqueda` haría que el cursor se
 * quedara esperando a la respuesta del servidor entre letra y letra.
 */
export function BuscadorServicios({ filtros }: { filtros: FiltrosServicios }) {
  const { navegar } = useFiltros(filtros);
  const [texto, setTexto] = useState(filtros.busqueda ?? "");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelarPendiente() {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
  }

  // Un desmontaje con la navegación aún pendiente no debe dejar el
  // temporizador vivo.
  useEffect(() => cancelarPendiente, []);

  function buscar(valor: string) {
    cancelarPendiente();
    // Una búsqueda vacía no es una búsqueda por cadena vacía: es no filtrar,
    // así que el parámetro desaparece de la URL.
    navegar({ busqueda: valor.trim() || undefined }, { reemplazar: true });
  }

  function alEscribir(valor: string) {
    setTexto(valor);
    cancelarPendiente();
    temporizador.current = setTimeout(() => buscar(valor), RETARDO_MS);
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="busqueda">Buscar</Label>
      <Input
        id="busqueda"
        // `search` para que el navegador ofrezca su botón de limpiar: al
        // pulsarlo dispara un `change` con la cadena vacía, que es justo lo
        // que quita el filtro.
        type="search"
        className="w-72"
        placeholder="Código, servicio o unidad"
        value={texto}
        onChange={(evento) => alEscribir(evento.target.value)}
        onKeyDown={(evento) => {
          // Enter no espera la pausa: quien lo pulsa ya terminó de escribir.
          if (evento.key === "Enter") {
            evento.preventDefault();
            buscar(texto);
          }
        }}
      />
    </div>
  );
}
