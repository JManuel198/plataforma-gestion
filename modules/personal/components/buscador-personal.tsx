"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFiltrosListado } from "@/core/use-filtros-listado";
import { urlListado, type FiltrosPersonal } from "../filtros";

/**
 * Pausa de tecleo antes de navegar. Sin ella cada letra sería una consulta a
 * la base de datos.
 */
const RETARDO_MS = 400;

/**
 * Buscador del listado. El texto viaja en la URL (`/personal?busqueda=perez`)
 * y la coincidencia la resuelve el `ILIKE` de queries.ts sobre `nombre`,
 * `apellido`, `dni` y `cargo` — aquí no se filtra nada: la pantalla nunca
 * llega a tener en memoria las filas que no coinciden.
 *
 * El texto se guarda además en estado local porque el input tiene que seguir
 * al teclado al instante mientras la navegación va por detrás.
 */
export function BuscadorPersonal({ filtros }: { filtros: FiltrosPersonal }) {
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
        placeholder="Nombre, apellido, DNI o cargo"
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
