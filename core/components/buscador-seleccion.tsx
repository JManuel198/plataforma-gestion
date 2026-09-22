"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Buscador que SELECCIONA un registro dentro de un formulario.
 *
 * NO CONFUNDIR CON EL BUSCADOR DE UN LISTADO. Son dos cosas distintas que se
 * parecen en la pantalla, y mezclarlas sería el error fácil:
 *
 * - `BuscadorMateriales` (modules/materiales/components/) **filtra una tabla**.
 *   El texto viaja en `searchParams`, la consulta la resuelve el servidor al
 *   navegar, y el resultado es que se ven menos filas. Es compartible por URL y
 *   sobrevive a un refresh, que es justo lo que se quiere de un filtro.
 * - Este componente **elige UNA fila** para meterla en un formulario. No toca
 *   la URL en ningún momento, y no debe: lo que el usuario está tecleando a
 *   medio rellenar un modal no es un estado de la aplicación que merezca
 *   compartirse ni recuperarse con el botón Atrás. Además, navegar cerraría el
 *   modal.
 *
 * ES GENÉRICO EN LAS DOS DIRECCIONES, y por eso vive en core/ y no en un
 * módulo: genérico en QUÉ BUSCA (la Server Action que recibe decide contra qué
 * columnas casa) y en QUÉ MUESTRA (las funciones `principalDe`/`secundarioDe`
 * deciden cómo se lee cada resultado). El componente no sabe qué es un material
 * ni un proveedor. Su primer uso es el material en el modal de Lista de precios;
 * el segundo será Proveedor en la Parte 2, y probablemente después
 * Personal ↔ tarifario_personal.
 *
 * LA BÚSQUEDA LA HACE EL SERVIDOR, SIEMPRE. `buscarAction` es una Server Action:
 * este componente nunca recibe el catálogo entero para filtrarlo en memoria
 * (regla 1 de AGENTS.md, y el mismo criterio que los filtros de los listados).
 * Esa acción llega como prop desde el Server Component de la página, que es lo
 * que permite que un módulo use la búsqueda de otro sin importarlo: quien los
 * junta es `app/`, no el módulo (AGENTS.md, Arquitectura).
 */

/** Pausa de tecleo antes de consultar. Sin ella cada letra sería una consulta. */
const RETARDO_MS = 300;

type Props<T> = {
  /** `id` del input, para atarlo a su `<Label>`. Único en la pantalla. */
  id: string;
  etiqueta: string;
  placeholder?: string;
  /**
   * Server Action que busca. Devuelve ya acotado —un `LIMIT` en la consulta—:
   * esta lista se pinta entera, así que el tope lo pone quien la escribe.
   */
  buscarAction: (texto: string) => Promise<T[]>;
  /** Identidad estable de un resultado: la `key` de React y el valor enviado. */
  claveDe: (item: T) => string;
  /** La línea principal de cada resultado. Siempre visible. */
  principalDe: (item: T) => string;
  /** Línea de contexto debajo, para distinguir dos resultados parecidos. */
  secundarioDe?: (item: T) => string;
  seleccionado: T | null;
  onSeleccionar: (item: T | null) => void;
  /**
   * `name` del input oculto que lleva la clave del seleccionado al `FormData`.
   * Lo pone este componente y no quien lo usa para que no haya dos sitios
   * donde el campo pueda quedarse sin enviar.
   */
  name: string;
  /** Marca el campo en rojo cuando el servidor devolvió un error para él. */
  invalido?: boolean;
};

export function BuscadorSeleccion<T>({
  id,
  etiqueta,
  placeholder,
  buscarAction,
  claveDe,
  principalDe,
  secundarioDe,
  seleccionado,
  onSeleccionar,
  name,
  invalido,
}: Props<T>) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<T[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [buscando, iniciarBusqueda] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cada búsqueda se numera y solo la última puede escribir el resultado. El
  // retardo de tecleo NO basta para esto: dos consultas ya lanzadas pueden
  // volver en orden distinto al que salieron, y sin este contador la respuesta
  // lenta de "tal" pisaría la rápida de "taladro" que el usuario ya está
  // leyendo.
  const ultimaBusqueda = useRef(0);

  function cancelarPendiente() {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
  }

  useEffect(() => cancelarPendiente, []);

  function buscar(valor: string) {
    cancelarPendiente();
    const limpio = valor.trim();
    const turno = ultimaBusqueda.current + 1;
    ultimaBusqueda.current = turno;

    if (limpio === "") {
      setResultados(null);
      setFallo(false);
      return;
    }

    iniciarBusqueda(async () => {
      try {
        const encontrados = await buscarAction(limpio);
        if (ultimaBusqueda.current !== turno) return;
        setResultados(encontrados);
        setFallo(false);
      } catch (error) {
        if (ultimaBusqueda.current !== turno) return;
        // Un fallo mudo aquí es lo peor que puede pasar: el usuario vería
        // "ningún resultado" y concluiría que el material no existe, cuando lo
        // que pasó es que la consulta no llegó.
        console.error("[BuscadorSeleccion] falló la búsqueda", error);
        setResultados(null);
        setFallo(true);
      }
    });
  }

  function elegir(item: T) {
    cancelarPendiente();
    // El turno avanza para que una búsqueda en vuelo no repueble la lista
    // justo después de elegir.
    ultimaBusqueda.current += 1;
    setTexto("");
    setResultados(null);
    setFallo(false);
    onSeleccionar(item);
  }

  // Con algo ya elegido, el buscador desaparece y deja una tarjeta con lo
  // seleccionado: seguir mostrando la caja de búsqueda invitaría a teclear sin
  // que quede claro si eso cambia la elección o la pierde.
  if (seleccionado) {
    return (
      <div className="space-y-2">
        <Label htmlFor={`${id}-elegido`}>{etiqueta}</Label>
        <div
          id={`${id}-elegido`}
          className="flex items-start justify-between gap-3 rounded-lg border bg-accent/40 px-3 py-2"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-medium">
              {principalDe(seleccionado)}
            </p>
            {secundarioDe ? (
              <p className="truncate text-xs text-muted-foreground">
                {secundarioDe(seleccionado)}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Cambiar"
            onClick={() => onSeleccionar(null)}
          >
            <XIcon />
            <span className="sr-only">Cambiar {etiqueta.toLowerCase()}</span>
          </Button>
        </div>
        <input type="hidden" name={name} value={claveDe(seleccionado)} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="search"
          className="pl-9"
          placeholder={placeholder}
          value={texto}
          autoComplete="off"
          aria-invalid={invalido}
          aria-describedby={`${id}-estado`}
          onChange={(evento) => {
            const valor = evento.target.value;
            setTexto(valor);
            cancelarPendiente();
            temporizador.current = setTimeout(() => buscar(valor), RETARDO_MS);
          }}
          onKeyDown={(evento) => {
            // Enter no espera la pausa — y sobre todo no envía el formulario:
            // este input vive dentro de un `<form>` y su Enter significa
            // "busca ya", nunca "guarda".
            if (evento.key === "Enter") {
              evento.preventDefault();
              buscar(texto);
            }
          }}
        />
      </div>

      {/* Los resultados son botones normales en una lista, no un `listbox` con
          `role="option"`: un listbox de verdad exige navegación con flechas y
          gestión de `aria-activedescendant`, y anunciarlo sin implementarlo es
          peor que no anunciarlo. Así cada resultado es alcanzable con Tab y se
          activa con Enter, que es lo que un botón ya promete. */}
      {resultados && resultados.length > 0 ? (
        <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border">
          {resultados.map((item) => (
            <li key={claveDe(item)}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                onClick={() => elegir(item)}
              >
                <span className="block truncate text-sm">
                  {principalDe(item)}
                </span>
                {secundarioDe ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {secundarioDe(item)}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* `aria-live` para que un lector de pantalla se entere de que la lista
          cambió: sin esto, quien no ve la pantalla teclea y no recibe nada. */}
      <p
        id={`${id}-estado`}
        className="text-xs text-muted-foreground"
        aria-live="polite"
      >
        {fallo
          ? "No se pudo buscar. Intenta de nuevo."
          : buscando
            ? "Buscando…"
            : resultados === null
              ? "Escribe para buscar."
              : resultados.length === 0
                ? "Ningún resultado."
                : `${resultados.length} resultado${resultados.length === 1 ? "" : "s"}.`}
      </p>
    </div>
  );
}
