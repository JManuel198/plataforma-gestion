"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  propsFilaClicable,
  SinPropagacion,
  useControlDetalle,
} from "@/core/fila-clicable";
import { editarPersonaEnModal } from "../actions";
import type { FilaPersonal } from "../queries";
import { BotonBaja } from "./boton-baja";
import { DialogoPersona } from "./dialogo-persona";

/**
 * Una fila del listado de personal, con su modal.
 *
 * Mismo patrón que `FilaDeMaterial`, con las piezas importadas de
 * `core/fila-clicable.tsx` — nada de máquina de estados propia. Las dos reglas
 * que hay que respetar al copiarlo están explicadas a fondo allí:
 *
 * 1. La fila sigue siendo un `<tr>` con `tabIndex`, no un `<div role=button>`:
 *    la tabla tiene que seguir siendo una tabla para un lector de pantalla.
 *    Enter y Espacio la abren.
 * 2. Todo lo interactivo de la fila va dentro del `SinPropagacion`, EL MODAL Y
 *    EL `alert-dialog` DE LA BAJA INCLUIDOS. Los eventos de React burbujean
 *    por el árbol de componentes y no por el DOM, así que un clic dentro de un
 *    diálogo portado a `document.body` llega igualmente al `onClick` de esta
 *    fila si no se corta aquí. Sin esto, confirmar la baja abriría además la
 *    vista de la persona.
 *
 * DOS COSAS SON DISTINTAS DE MATERIALES, y las dos a propósito:
 *
 * - Los controles llevan texto ("Editar", "Dar de baja") y no iconos. Es la
 *   decisión ya tomada para este listado: cinco columnas dan aire de sobra,
 *   mientras que en un catálogo de siete columnas dos etiquetas por fila
 *   empujan el contenido. El botón "Editar" hace aquí de atajo a edición, que
 *   es el papel que en Materiales tiene el lápiz.
 * - `edad` llega ya calculada desde la tabla, que es un Server Component. No
 *   es un capricho: `calcularEdad` (lib/fecha.ts) depende de "hoy" en la zona
 *   del negocio y hasta ahora se resolvía siempre en el servidor. Calcularla
 *   aquí arrastraría dayjs con sus plugins de utc/timezone al bundle del
 *   cliente y dejaría el número a merced del reloj del navegador, además de
 *   poder desajustar la hidratación si el render del servidor y el del cliente
 *   caen a distinto lado de la medianoche.
 */
export function FilaDePersona({
  persona,
  edad,
}: {
  persona: FilaPersonal;
  /** Calculada en el servidor con `calcularEdad`. Ver arriba. */
  edad: number;
}) {
  const control = useControlDetalle();
  const nombreCompleto = `${persona.nombre} ${persona.apellido}`;

  return (
    <TableRow {...propsFilaClicable(() => control.cambiar("viendo"))}>
      <TableCell className="font-medium">{persona.apellido}</TableCell>
      <TableCell>{persona.nombre}</TableCell>
      <TableCell className="tabular-nums">{persona.dni}</TableCell>
      <TableCell className="max-w-64 truncate" title={persona.cargo}>
        {persona.cargo}
      </TableCell>
      <TableCell className="text-right tabular-nums">{edad}</TableCell>
      <TableCell>
        {persona.activo ? null : <Badge variant="secondary">De baja</Badge>}
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">
        <SinPropagacion className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => control.cambiar("editando")}
          >
            Editar
          </Button>
          <BotonBaja
            id={persona.id}
            nombreCompleto={nombreCompleto}
            activo={persona.activo}
          />
          <DialogoPersona
            guardarAction={editarPersonaEnModal}
            control={control}
            persona={persona}
            edad={edad}
          />
        </SinPropagacion>
      </TableCell>
    </TableRow>
  );
}
