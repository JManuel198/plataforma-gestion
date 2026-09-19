"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { urlListado, type FiltrosOt } from "../filtros";

type Opciones = {
  /**
   * `router.replace` en vez de `router.push`. Lo usa el buscador: escribiendo
   * se navega una vez por pausa de tecleo, y con `push` cada una de esas
   * navegaciones dejaría una entrada en el historial — el botón Atrás tendría
   * que recorrer la palabra letra a letra.
   */
  reemplazar?: boolean;
};

/**
 * Navegación compartida por los tres filtros del listado.
 *
 * Se llama `useFiltros` y no `usarFiltros`, rompiendo el español del resto del
 * módulo, porque la regla `react-hooks/rules-of-hooks` reconoce un hook por el
 * prefijo `use` — con el nombre en español, ESLint da error al ver
 * `useRouter` dentro. El archivo sigue en kebab-case como manda AGENTS.md.
 *
 * Existe para que cada control no reconstruya la URL a su manera: recibe solo
 * lo que cambia y lo mezcla con los filtros que ya están puestos, que es lo
 * que hace que los tres se combinen en vez de pisarse. Pasar `undefined` en
 * un campo lo quita de la URL.
 *
 * El filtrado en sí ocurre en el servidor (queries.ts); estos componentes solo
 * navegan.
 */
export function useFiltros(filtros: FiltrosOt) {
  const router = useRouter();
  const [navegando, iniciarNavegacion] = useTransition();

  function navegar(cambios: Partial<FiltrosOt>, opciones: Opciones = {}) {
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
