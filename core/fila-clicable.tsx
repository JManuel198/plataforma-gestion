"use client";

import {
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "cn";

/**
 * El estándar de "fila clicable → vista → editar" de los listados.
 *
 * VIVE EN core/ POR LA MISMA REGLA QUE `busqueda.ts` Y `errores-postgres.ts`:
 * lo van a usar varios módulos (Materiales primero, y detrás los otros
 * catálogos y Personal) y ninguno puede importar del otro. La lección que
 * dejó `esUniqueViolado` —tres copias, dos rotas en silencio durante
 * semanas— es justo la que se evita naciendo aquí en vez de en
 * `modules/materiales/`.
 *
 * Son tres piezas y se usan juntas:
 *
 * 1. `useControlDetalle()` — el estado de los tres modos (cerrado, viendo,
 *    editando). Lo monta la FILA, no el modal, porque en la fila hay dos
 *    disparadores distintos (el clic en la fila abre en vista, el lápiz abre
 *    en edición) y un mismo modal que los atiende a los dos.
 * 2. `propsFilaClicable()` — lo que hay que esparcir sobre el `<TableRow>`
 *    para que el clic y el teclado abran la vista.
 * 3. `SinPropagacion` — el envoltorio obligatorio alrededor de todo lo
 *    interactivo que viva dentro de la fila. Sin él, el clic en la equis de
 *    inactivar abriría además la vista.
 */

/**
 * Los tres estados del modal de una fila.
 *
 * "viendo" y "editando" son dos modos del MISMO modal abierto, no dos
 * modales: pasar de uno a otro no cierra nada ni vuelve a abrir, solo cambia
 * lo que se pinta dentro (es el botón "Editar" de la vista).
 */
export type ModoDetalle = "cerrado" | "viendo" | "editando";

export type ControlDetalle = {
  modo: ModoDetalle;
  cambiar: (modo: ModoDetalle) => void;
};

/**
 * El estado de los tres modos, para quien monte el modal de una fila.
 *
 * Es deliberadamente tonto —un `useState` con nombre— y ese es el punto: lo
 * que se comparte entre módulos es el vocabulario (los tres modos y quién los
 * cambia), no una máquina de estados con reglas propias. Un modal que sólo
 * abre y cierra (el alta desde la cabecera) usa el mismo hook y nunca pasa
 * por "viendo".
 */
export function useControlDetalle(): ControlDetalle {
  const [modo, cambiar] = useState<ModoDetalle>("cerrado");

  return { modo, cambiar };
}

/**
 * Las props que convierten un `<TableRow>` en una fila que abre su vista.
 *
 * SIGUE SIENDO UN `<tr>`. No se envuelve en un `<button>` ni se cambia por un
 * `<div role="button">`: eso rompería la tabla para un lector de pantalla
 * (perdería el `role="row"`, la cuenta de filas y la asociación con los
 * encabezados de columna). Lo que se añade es lo mínimo para que sea
 * accionable:
 *
 * - `tabIndex={0}` para que entre en el recorrido del tabulador. Cuesta una
 *   parada de tabulación por fila, que es el precio conocido de una fila
 *   clicable; a cambio, quien no usa ratón llega a la vista igual que quien
 *   lo usa.
 * - `Enter` y `Espacio` la activan. `Espacio` hace `preventDefault()` o la
 *   página daría un salto de scroll antes de abrir el modal.
 * - `aria-haspopup="dialog"` para que se anuncie que va a abrir un diálogo y
 *   no a navegar a otra pantalla. Es un atributo ARIA global: vale sobre un
 *   `role="row"` sin alterarlo.
 *
 * El `onKeyDown` ignora las teclas que no nacieron en la fila misma
 * (`target !== currentTarget`): así un Enter sobre el lápiz no dispara además
 * la vista, incluso si alguien olvida el `SinPropagacion` de abajo.
 *
 * El `onClick` no puede ser tan estricto —un clic normal aterriza en el `<td>`
 * o en el texto, no en el `<tr>`—, así que descarta dos casos y abre en el
 * resto. Son CINTURÓN Y TIRANTES, no un sustituto de `SinPropagacion`: la
 * convención sigue siendo envolver lo interactivo, y esto solo evita que
 * olvidarlo se convierta en un bug silencioso (nada en `tsc` ni en el lint
 * avisaría; el síntoma sería que un botón de la fila abre además la vista).
 *
 * 1. Lo que no está dentro de la fila en el DOM: es un portal —el contenido
 *    de un `Dialog` o de un `AlertDialog` montado en `document.body`— cuyo
 *    evento llega hasta aquí porque React burbujea por el árbol de
 *    componentes. Un clic ahí nunca es un clic en la fila.
 * 2. Lo que nace en un control propio (botón, enlace, campo): esos se
 *    accionan solos y no tienen por qué abrir además la vista.
 */
function esClicDeLaFila(evento: MouseEvent<HTMLTableRowElement>): boolean {
  const destino = evento.target;

  if (!(destino instanceof Element)) return true;
  if (!evento.currentTarget.contains(destino)) return false;

  return !destino.closest(
    'button, a, input, select, textarea, label, [role="button"]',
  );
}

export function propsFilaClicable(alAbrir: () => void, className?: string) {
  return {
    tabIndex: 0,
    "aria-haspopup": "dialog" as const,
    // Foco con `outline` y no con `ring`: el anillo de shadcn es un
    // `box-shadow`, y sobre un `<tr>` de una tabla con `border-collapse:
    // collapse` (lo que impone el preflight de Tailwind) los navegadores no
    // lo pintan de forma fiable. El `outline` sí. Va hacia dentro
    // (`-outline-offset-2`) para no quedar tapado por la fila siguiente.
    className: cn(
      "cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
      className,
    ),
    onClick: (evento: MouseEvent<HTMLTableRowElement>) => {
      if (!esClicDeLaFila(evento)) return;

      alAbrir();
    },
    onKeyDown: (evento: KeyboardEvent<HTMLTableRowElement>) => {
      if (evento.target !== evento.currentTarget) return;
      if (evento.key !== "Enter" && evento.key !== " ") return;

      evento.preventDefault();
      alAbrir();
    },
  };
}

/**
 * "La propagación del clic se detiene aquí."
 *
 * TODO lo interactivo que viva dentro de una fila clicable —botones de
 * acción, selects en línea, y también los modales y `alert-dialog` que esos
 * botones montan— va dentro de uno de estos. Sin él, el clic en la equis de
 * inactivar burbujea hasta el `onClick` de la fila y abre la vista encima del
 * diálogo de confirmación.
 *
 * OJO CON LOS PORTALES, que es la parte que no se ve venir: el contenido de
 * un `Dialog` o de un `AlertDialog` se monta en `document.body`, fuera del
 * `<tr>`, pero los eventos de React NO burbujean por el DOM sino por el árbol
 * de componentes. Un clic en "Cancelar" dentro del diálogo de confirmación
 * llega igualmente al `onClick` de la fila. Por eso el envoltorio tiene que
 * abarcar también al componente que monta el modal, no sólo al botón que lo
 * abre.
 *
 * Se detiene el teclado además del ratón por el mismo motivo (un Enter sobre
 * un botón de acción no debe abrir también la vista).
 *
 * Sin `className` sale como `display: contents`: no crea caja, así que se
 * puede meter en cualquier sitio sin tocar el layout que ya hubiera. Si el
 * sitio donde va necesitaba un contenedor de todas formas —la fila de
 * botones de acción, por ejemplo— se le pasan sus clases y hace de las dos
 * cosas, en vez de anidar dos `<div>`.
 */
export function SinPropagacion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-sin-propagacion=""
      className={className ?? "contents"}
      onClick={(evento) => evento.stopPropagation()}
      onKeyDown={(evento) => evento.stopPropagation()}
    >
      {children}
    </div>
  );
}
