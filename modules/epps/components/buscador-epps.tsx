"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFiltrosListado } from "@/core/use-filtros-listado";
import { urlListado, type FiltrosEpps } from "../filtros";

/**
 * Pausa de tecleo antes de navegar. Sin ella cada letra sería una consulta a
 * la base de datos; con mucha más, el listado se sentiría desconectado de lo
 * que se está escribiendo.
 */
const RETARDO_MS = 400;

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
 * El texto se guarda además en estado local porque el input tiene que seguir
 * al teclado al instante, mientras la navegación va por detrás en una
 * transición. Leerlo directo de `filtros.busqueda` haría que el cursor se
 * quedara esperando a la respuesta del servidor entre letra y letra.
 */
export function BuscadorEpps({ filtros }: { filtros: FiltrosEpps }) {
  const { navegar } = useFiltrosListado(filtros, urlListado);
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
        placeholder="Código, descripción o unidad"
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
