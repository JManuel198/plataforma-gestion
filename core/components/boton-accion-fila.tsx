"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Un icono de acción de una fila de listado (editar, dar de baja, reactivar),
 * con su nombre en un tooltip al pasar el ratón.
 *
 * Sustituye al `title` nativo que llevaban estos botones: el tooltip del
 * navegador tarda en salir y no sigue el estilo de la app. El nombre para
 * lectores de pantalla va aparte, en `etiquetaAccesible`, porque puede ser más
 * largo que el tooltip ("Editar OFFT.0000318" frente a "Editar").
 *
 * `render={<Button/>}` en el trigger es correcto: el trigger de Base UI se
 * renderiza con `useRenderElement('button')`, sin `useButton`, y lo que acaba
 * en el DOM es el `<button>` nativo de nuestro `Button` — flag `nativeButton` y
 * elemento coinciden (la regla de AGENTS.md, mismo caso que el de Dialog).
 *
 * VA DENTRO DEL `SinPropagacion` de la fila, como todo lo interactivo de una
 * fila clicable. El tooltip se porta a `document.body`, pero no recibe clics,
 * así que no añade ningún riesgo de propagación nuevo.
 */
export function BotonAccionFila({
  etiqueta,
  etiquetaAccesible,
  destructiva = false,
  disabled,
  onClick,
  children,
}: {
  /** El texto del tooltip: "Editar", "Dar de baja", "Reactivar". */
  etiqueta: string;
  /** Lo que lee un lector de pantalla; por defecto, `etiqueta`. */
  etiquetaAccesible?: string;
  /** Resalte rojo al pasar el ratón, para las acciones que sacan algo. */
  destructiva?: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** El icono. */
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={onClick}
            className={
              destructiva
                ? "hover:bg-destructive/10 hover:text-destructive"
                : undefined
            }
          />
        }
      >
        {children}
        <span className="sr-only">{etiquetaAccesible ?? etiqueta}</span>
      </TooltipTrigger>
      <TooltipContent>{etiqueta}</TooltipContent>
    </Tooltip>
  );
}
