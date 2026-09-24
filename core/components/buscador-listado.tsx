"use client";

import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useFiltrosListado } from "@/core/use-filtros-listado";

/**
 * Pausa de tecleo antes de buscar. Lo bastante corta para sentirse inmediata
 * y lo bastante larga para no disparar una consulta por letra.
 */
const RETARDO_MS = 400;

/**
 * El buscador de texto de un listado. Filtra al escribir, con una pausa, y
 * escribe la búsqueda en la URL (`?busqueda=`); la consulta la hace el
 * servidor al leerla.
 *
 * ES LA VERSIÓN COMÚN de un buscador que llegó a estar copiado en los siete
 * módulos, idéntico salvo el texto de ejemplo (verificado al moverlo aquí).
 * Cada módulo lo envuelve en un componente cliente propio que le pasa su
 * `urlListado`: una función no puede viajar como prop desde un Server
 * Component, y `core/` no debe conocer los parámetros de URL de ningún módulo
 * — mismo motivo por el que `useFiltrosListado` la recibe como parámetro.
 *
 * `router.replace` y no `push` (vía `reemplazar: true`): una navegación por
 * pausa de tecleo con `push` llenaría el historial, y el botón Atrás tendría
 * que recorrer la palabra letra a letra.
 *
 * La etiqueta es solo para lectores de pantalla (`sr-only`): el mockup lleva la
 * lupa y el texto de ejemplo en su lugar, que es lo que se ve.
 */
export function BuscadorListado<F extends { busqueda?: string }>({
  filtros,
  urlListado,
  placeholder,
}: {
  filtros: F;
  urlListado: (filtros: F) => string;
  placeholder: string;
}) {
  const { navegar } = useFiltrosListado(filtros, urlListado);
  const [texto, setTexto] = useState(filtros.busqueda ?? "");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si la búsqueda desaparece de la URL desde fuera ("Limpiar filtros"), el
  // input se vacía también. Se ajusta durante el render comparando con el
  // valor anterior, que es el patrón de React para derivar estado de props:
  // con un `useEffect` + `setState` el lint lo rechaza
  // (react-hooks/set-state-in-effect).
  //
  // Solo se reacciona a QUITAR la búsqueda, no a cualquier cambio: mientras se
  // escribe, la URL va por detrás del input (la pausa de tecleo), y copiar
  // cada valor de la URL al input borraría lo último que se tecleó.
  const [busquedaPrevia, setBusquedaPrevia] = useState(filtros.busqueda);
  if (filtros.busqueda !== busquedaPrevia) {
    setBusquedaPrevia(filtros.busqueda);
    if (!filtros.busqueda) setTexto("");
  }

  function cancelarPendiente() {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
  }

  useEffect(() => cancelarPendiente, []);

  function buscar(valor: string) {
    cancelarPendiente();
    // Una búsqueda vacía no es buscar por cadena vacía: es no filtrar, así que
    // el parámetro desaparece de la URL.
    navegar({ busqueda: valor.trim() || undefined } as Partial<F>, {
      reemplazar: true,
    });
  }

  return (
    <div className="relative w-full sm:w-80">
      <label htmlFor="busqueda" className="sr-only">
        {placeholder}
      </label>
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id="busqueda"
        type="search"
        className="pl-8"
        placeholder={placeholder}
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
