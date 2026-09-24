import type { ReactNode } from "react";

/**
 * La cabecera de un listado: el título a la izquierda y la acción principal
 * ("Nueva oferta", "Nuevo material"…) a la derecha, como en el mockup de
 * docs/diseno/.
 *
 * `accion` es un nodo y no un texto porque lo que va ahí es el disparador del
 * modal de alta, que monta cada módulo con sus propias Server Actions — este
 * componente no sabe nada de ellas.
 */
export function CabeceraListado({
  titulo,
  accion,
}: {
  titulo: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      {accion}
    </div>
  );
}
