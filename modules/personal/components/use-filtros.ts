"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { urlListado, type FiltrosPersonal } from "../filtros";

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
 * Gemelo del de modules/ordenes-trabajo/components/: cada módulo tiene el
 * suyo porque un módulo no importa de otro (AGENTS.md, Arquitectura), y
 * porque cada uno está atado a su propio tipo de filtros.
 */
export function useFiltros(filtros: FiltrosPersonal) {
  const router = useRouter();
  const [navegando, iniciarNavegacion] = useTransition();

  function navegar(cambios: Partial<FiltrosPersonal>, opciones: Opciones = {}) {
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
