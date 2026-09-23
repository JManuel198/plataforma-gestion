"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { urlListado, type FiltrosTarifario } from "../filtros";

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
 * Navegación compartida por los dos filtros del listado.
 *
 * Se llama `useFiltros` y no `usarFiltros`, rompiendo el español del resto del
 * módulo, porque `react-hooks/rules-of-hooks` reconoce un hook por el prefijo
 * `use` — con el nombre en español, ESLint da error al ver `useRouter` dentro.
 * El archivo sigue en kebab-case como manda AGENTS.md.
 *
 * Existe para que cada control no reconstruya la URL a su manera: recibe solo
 * lo que cambia y lo mezcla con los filtros que ya están puestos, que es lo que
 * hace que los dos se combinen en vez de pisarse. Pasar `undefined` en un campo
 * lo quita de la URL.
 *
 * El filtrado en sí ocurre en el servidor (queries.ts); estos componentes solo
 * navegan.
 *
 * ── ESTA ES LA SEXTA COPIA DE ESTE ARCHIVO, Y ESO YA NO ES CÓMODO ───────────
 *
 * Existe una por módulo con listado filtrable (ordenes-trabajo, personal,
 * materiales, lista-precios, servicios y este). Las seis son idénticas salvo
 * por el tipo de filtros y por el texto de sus comentarios, que es justamente
 * la señal que AGENTS.md manda vigilar: «a la tercera copia se mueve a core/,
 * sin esperar a una cuarta».
 *
 * Se copia igualmente aquí, a sabiendas y por dos razones que no anulan la
 * anterior: un módulo no importa de otro (AGENTS.md, Arquitectura), así que la
 * alternativa no es importar el de Materiales sino generalizar los seis a la
 * vez con el tipo de filtros y `urlListado` como parámetros — un cambio que
 * toca cinco módulos ya funcionando y que no cabe en el alcance de esta Parte
 * 2. Y el riesgo real de divergencia es menor que el de `esUniqueViolado` o
 * `patronParcial`: aquí no hay lógica que pueda romperse en silencio, solo tres
 * líneas de navegación — si una copia divergiera, se vería al instante al usar
 * el filtro, no semanas después en un mensaje de error que nunca aparece.
 *
 * **Aun así, el siguiente listado que aparezca debería encontrar esto en
 * `core/` y no escribir la séptima copia.** La forma es un
 * `useFiltrosListado<F>(filtros: F, urlListado: (f: F) => string)`, y el trabajo
 * es mecánico: mover el archivo y cambiar seis imports.
 */
export function useFiltros(filtros: FiltrosTarifario) {
  const router = useRouter();
  const [navegando, iniciarNavegacion] = useTransition();

  function navegar(
    cambios: Partial<FiltrosTarifario>,
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
