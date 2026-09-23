"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFiltrosListado } from "@/core/use-filtros-listado";
import { urlListado, type FiltrosTarifario } from "../filtros";

/**
 * Pausa de tecleo antes de navegar. Sin ella cada letra sería una consulta a la
 * base de datos.
 */
const RETARDO_MS = 400;

/**
 * Buscador del listado. El texto viaja en la URL
 * (`/tarifario-personal?busqueda=operario`) y la coincidencia la resuelve el
 * `ILIKE` de queries.ts sobre `codigo`, `cargo` y `unidad` — aquí no se filtra
 * nada: la pantalla nunca llega a tener en memoria las filas que no coinciden
 * (regla 1 de AGENTS.md).
 *
 * El texto del usuario pasa por `patronParcial` de `core/busqueda.ts` antes de
 * llegar al `ILIKE`, importado y nunca copiado — sin ese escape, un `%` escrito
 * en esta caja actuaría como comodín.
 *
 * Una sola caja para las tres columnas, no tres cajas: quien busca una tarifa
 * escribe lo que recuerda —el código, el cargo o el periodo— sin saber de
 * antemano en qué columna cae.
 *
 * NO ES EL BUSCADOR DEL MODAL, aunque los dos busquen sobre esta misma tabla.
 * Aquel (`CampoConSugerencias` sobre `buscarCargosAction`) elige un valor para
 * rellenar un campo y NO toca la URL; este filtra la tabla y vive entero en
 * `searchParams`. La distinción está en la skill de convenciones, sección
 * "Elegir un registro dentro de un formulario".
 *
 * El texto se guarda además en estado local porque el input tiene que seguir al
 * teclado al instante mientras la navegación va por detrás.
 */
export function BuscadorTarifas({ filtros }: { filtros: FiltrosTarifario }) {
  const { navegar } = useFiltrosListado(filtros, urlListado);
  const [texto, setTexto] = useState(filtros.busqueda ?? "");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelarPendiente() {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
  }

  useEffect(() => cancelarPendiente, []);

  function buscar(valor: string) {
    cancelarPendiente();
    // Una búsqueda vacía no es buscar por cadena vacía: es no filtrar, así que
    // el parámetro desaparece de la URL.
    navegar({ busqueda: valor.trim() || undefined }, { reemplazar: true });
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="busqueda">Buscar</Label>
      <Input
        id="busqueda"
        type="search"
        className="w-72"
        placeholder="Código, cargo o unidad"
        value={texto}
        onChange={(evento) => {
          const valor = evento.target.value;
          setTexto(valor);
          cancelarPendiente();
          temporizador.current = setTimeout(() => buscar(valor), RETARDO_MS);
        }}
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
