"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { urlListado, type FiltrosListaPrecios } from "../filtros";

type Opciones = {
  /**
   * `router.replace` en vez de `router.push`. Lo usa el buscador: con `push`,
   * cada pausa de tecleo dejaría una entrada en el historial y el botón Atrás
   * tendría que recorrer la palabra letra a letra.
   */
  reemplazar?: boolean;
};

/**
 * Navegación compartida por los filtros del listado.
 *
 * Se llama `useFiltros` y no `usarFiltros`, rompiendo el español del resto del
 * módulo, porque `react-hooks/rules-of-hooks` reconoce un hook por el prefijo
 * `use` — con el nombre en español ESLint da error al ver `useRouter` dentro.
 *
 * Gemelo del de materiales/, personal/ y ordenes-trabajo/: cada módulo tiene el
 * suyo porque un módulo no importa de otro (AGENTS.md, Arquitectura), y porque
 * cada uno está atado a su propio tipo de filtros.
 *
 * ESTE ES EL CUARTO, que es justo el umbral que el de Materiales dejaba
 * anotado ("si aparece un cuarto listado idéntico, ese es el momento de mover
 * esto a core/ con el tipo de filtros como genérico"). NO SE MOVIÓ, y conviene
 * que la razón quede escrita: la regla de las tres copias vale para el código
 * que puede romperse en silencio si una copia diverge —`patronParcial`,
 * `esUniqueViolado`—, y esto no lo es. Son ocho líneas sin lógica propia: si
 * una divergiera, el síntoma sería una URL mal construida, visible en cuanto
 * se pulsa el filtro. Lo que sí está compartido de verdad es lo que importa:
 * la URL la construye `urlListado` (uno por módulo, con sus parámetros) y la
 * consulta la resuelve el servidor.
 *
 * Si algún día se mueve, se mueve con el tipo de filtros como genérico y de
 * una vez para los cuatro — nunca importando el de otro módulo.
 */
export function useFiltros(filtros: FiltrosListaPrecios) {
  const router = useRouter();
  const [navegando, iniciarNavegacion] = useTransition();

  function navegar(
    cambios: Partial<FiltrosListaPrecios>,
    opciones: Opciones = {},
  ) {
    const destino = urlListado({ ...filtros, ...cambios });

    iniciarNavegacion(() => {
      if (opciones.reemplazar) {
        router.replace(destino, { scroll: false });
      } else {
        router.push(destino, { scroll: false });
      }
    });
  }

  return { navegar, navegando };
}
