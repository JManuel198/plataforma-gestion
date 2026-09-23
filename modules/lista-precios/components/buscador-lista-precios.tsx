"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFiltrosListado } from "@/core/use-filtros-listado";
import { urlListado, type FiltrosListaPrecios } from "../filtros";

/**
 * Pausa de tecleo antes de navegar. Sin ella cada letra sería una consulta a
 * la base de datos.
 */
const RETARDO_MS = 400;

/**
 * Buscador del listado. El texto viaja en la URL
 * (`/lista-precios?busqueda=ferreteria`) y la coincidencia la resuelve el
 * `ILIKE` de queries.ts sobre `codigo_oferta`, `proveedor` y la `descripcion`
 * del material — aquí no se filtra nada: la pantalla nunca llega a tener en
 * memoria las filas que no coinciden.
 *
 * Una sola caja para los tres campos, no tres cajas: quien busca una oferta
 * recuerda el número que le dieron, quién la ofreció o qué se estaba
 * cotizando, sin saber de antemano en qué columna cae.
 *
 * OJO CON EL TERCERO, que es el que distingue a este buscador del de
 * Materiales: la descripción del material NO está en `lista_precios`. Sale del
 * JOIN contra `materiales` que la consulta ya hacía para pintar la columna —
 * ver el `or(...)` de queries.ts. Es la razón de que esto se resuelva en el
 * servidor y no filtrando en memoria un arreglo ya traído: media búsqueda vive
 * en otra tabla.
 *
 * NO CONFUNDIR CON EL BUSCADOR DEL MODAL: aquel elige un material o sugiere un
 * proveedor y nunca toca la URL (ver `core/components/buscador-seleccion.tsx`).
 * Este filtra la tabla y por eso vive en `searchParams`, donde es compartible
 * por enlace y sobrevive a un refresh.
 *
 * El texto se guarda además en estado local porque el input tiene que seguir
 * al teclado al instante mientras la navegación va por detrás.
 */
export function BuscadorListaPrecios({
  filtros,
}: {
  filtros: FiltrosListaPrecios;
}) {
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
        placeholder="Código, proveedor o material"
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
