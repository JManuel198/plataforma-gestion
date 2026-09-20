"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FiltrosOt } from "../filtros";
import { useFiltros } from "./use-filtros";

/**
 * Pausa de tecleo antes de navegar. Sin ella cada letra sería una consulta a
 * la base de datos; con mucha más, el listado se sentiría desconectado de lo
 * que se está escribiendo.
 */
const RETARDO_MS = 400;

/**
 * Buscador del listado. El texto viaja en la URL
 * (`/ordenes-trabajo?busqueda=acme`) y la coincidencia la resuelve el `ILIKE`
 * de queries.ts sobre `codigo_ot`, `cliente` y `servicio` — aquí no se filtra
 * nada: la pantalla nunca llega a tener en memoria las filas que no coinciden.
 *
 * El texto se guarda además en estado local porque el input tiene que seguir
 * al teclado al instante, mientras la navegación va por detrás en una
 * transición. Leerlo directo de `filtros.busqueda` haría que el cursor se
 * quedara esperando a la respuesta del servidor entre letra y letra.
 */
export function BuscadorOrdenes({ filtros }: { filtros: FiltrosOt }) {
  const { navegar } = useFiltros(filtros);
  const [texto, setTexto] = useState(filtros.busqueda ?? "");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelarPendiente() {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
  }

  // Un desmontaje con la navegación aún pendiente (por ejemplo, al irse a
  // "Nueva OT" justo después de escribir) no debe dejar el temporizador vivo.
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
        placeholder="OT, cliente o servicio"
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
