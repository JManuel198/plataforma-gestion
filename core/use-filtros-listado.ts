"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Opciones = {
  /**
   * `router.replace` en vez de `router.push`. Lo usa el buscador: escribiendo
   * se navega una vez por pausa de tecleo, y con `push` cada una de esas
   * navegaciones dejaría una entrada en el historial — el botón Atrás tendría
   * que recorrer la palabra letra a letra.
   *
   * Los filtros que se cambian de una sola vez (un Select, una casilla, una
   * fecha) usan `push`, que es el valor por defecto: ahí cada cambio sí es un
   * paso del que el usuario espera poder volver.
   */
  reemplazar?: boolean;
};

/**
 * Navegación compartida por los filtros de CUALQUIER listado.
 *
 * ── DE DÓNDE VIENE: SEIS COPIAS IDÉNTICAS ──────────────────────────────────
 *
 * Hasta el 2026-09-23 esto vivía copiado en un `components/use-filtros.ts` por
 * módulo — ordenes-trabajo, personal, materiales, lista-precios, servicios y
 * tarifario-personal—, seis archivos con el MISMO cuerpo y distinto tipo de
 * filtros. Se unificó aquí por la regla de AGENTS.md que ya movió
 * `patronParcial` y `esUniqueViolado` a `core/`: «a la tercera copia se mueve a
 * core/, sin esperar a una cuarta». Se había llegado a seis.
 *
 * Antes de fusionarlas se compararon las seis una contra otra, no se dieron por
 * equivalentes de vista: normalizando comentarios y el nombre del tipo, las
 * seis producían el mismo texto salvo un salto de línea de Prettier. Lo que
 * cambiaba entre módulos no era el hook sino QUÉ CAMPOS lleva cada listado, y
 * eso no vive aquí: vive en el tipo de filtros y en `urlListado` de cada
 * módulo, que siguen siendo suyos.
 *
 * ── POR QUÉ `urlListado` ENTRA COMO PARÁMETRO ───────────────────────────────
 *
 * Es la pieza que NO se generaliza, y es deliberado. Cada listado escribe sus
 * propios parámetros en la URL: Órdenes de Trabajo combina `estado`, `desde`,
 * `hasta` y `busqueda`; Servicios, `categoria` y `busqueda`; los otros cuatro,
 * `busqueda` e `inactivos`. Intentar construir la URL aquí dentro obligaría a
 * este archivo a conocer los parámetros de todos los módulos — exactamente el
 * acoplamiento que `core/` existe para evitar.
 *
 * Así, este hook aporta lo único que de verdad era común: mezclar los cambios
 * con los filtros ya puestos, envolver la navegación en una transición y elegir
 * entre `push` y `replace`.
 *
 * ── QUÉ GARANTIZA EL GENÉRICO ───────────────────────────────────────────────
 *
 * `F` ata los tres lados a la vez: los filtros que entran, los `cambios` que se
 * pasan a `navegar` y el `urlListado` que los escribe. Pasar el `urlListado` de
 * otro módulo no compila, así que el segundo argumento no es algo que haya que
 * acordarse de acertar — el tipo lo impone.
 *
 * ── NOMBRE Y UBICACIÓN ──────────────────────────────────────────────────────
 *
 * Se llama `useFiltrosListado` y no `usarFiltros`, rompiendo el español del
 * resto del proyecto, porque `react-hooks/rules-of-hooks` reconoce un hook por
 * el prefijo `use` — con el nombre en español, ESLint da error al ver
 * `useRouter` dentro. El archivo sigue en kebab-case, como manda AGENTS.md.
 *
 * Lleva `Listado` en el nombre a propósito: lo distingue del buscador que vive
 * DENTRO de un formulario (`BuscadorSeleccion`, `CampoConSugerencias`), que no
 * toca la URL nunca porque navegar cerraría el modal.
 *
 * El filtrado en sí ocurre siempre en el servidor (el `queries.ts` de cada
 * módulo, regla 1 de AGENTS.md); los componentes que usan este hook solo
 * navegan.
 */
export function useFiltrosListado<F extends object>(
  filtros: F,
  urlListado: (filtros: F) => string,
) {
  const router = useRouter();
  const [navegando, iniciarNavegacion] = useTransition();

  /**
   * Navega al listado con `cambios` aplicado encima de los filtros actuales.
   *
   * Recibe SOLO lo que cambia y lo mezcla con lo que ya hay, que es lo que hace
   * que los filtros se combinen en vez de pisarse: cada control manda lo suyo
   * sin saber qué otros están puestos. Pasar `undefined` en un campo lo quita
   * de la URL — así "sin filtro" es la ausencia del parámetro y no un valor
   * vacío que luego haya que distinguir.
   */
  function navegar(cambios: Partial<F>, opciones: Opciones = {}) {
    const destino = urlListado({ ...filtros, ...cambios });

    iniciarNavegacion(() => {
      // `scroll: false` en las dos ramas: filtrar no debería saltar al inicio
      // de la página, que es lo que haría perder de vista la tabla justo cuando
      // el usuario acaba de tocar un control que está encima de ella.
      if (opciones.reemplazar) {
        router.replace(destino, { scroll: false });
      } else {
        router.push(destino, { scroll: false });
      }
    });
  }

  /**
   * `navegando` lo consumen hoy tres controles (el Select de estado y el rango
   * de fechas de OT, y el Select de categoría de Servicios) para deshabilitarse
   * mientras la transición está en curso. Los demás no lo leen, y no pasa nada:
   * un buscador con pausa de tecleo no debe bloquearse mientras se escribe.
   */
  return { navegar, navegando };
}
