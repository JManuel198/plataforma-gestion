"use client";

import { Building2Icon } from "lucide-react";
import {
  CELDA_FIJA_ANTES_DEL_FIN,
  CELDA_FIJA_FIN,
  CLASE_FILA,
} from "@/core/components/tabla-listado";
import { TableCell, TableRow } from "@/components/ui/table";
import { BadgeSituacion } from "@/core/components/badge-situacion";
import {
  propsFilaClicable,
  SinPropagacion,
  useControlDetalle,
} from "@/core/fila-clicable";
import { oVacio } from "@/core/vista-detalle";
import { cn } from "cn";
import { actualizarContacto } from "../actions";
import type { FilaContacto } from "../queries";
import { AccionesContacto } from "./acciones-contacto";
import { DialogoContacto } from "./dialogo-contacto";

/**
 * Una fila del listado de contactos, con su modal.
 *
 * El patrón de siempre, importado de `core/fila-clicable.tsx`:
 * 1. La fila sigue siendo un `<tr>` con `tabIndex`; Enter y Espacio la abren.
 * 2. Todo lo interactivo va dentro del `SinPropagacion`, EL MODAL Y EL
 *    `alert-dialog` DE LA BAJA INCLUIDOS: los eventos de React burbujean por
 *    el árbol de componentes, no por el DOM, así que un clic dentro de un
 *    portal llega igual al `onClick` de esta fila.
 *
 * El correo va como texto y NO como enlace `mailto:`: un `<a>` dentro de la
 * fila sería otro control interactivo que envolver, y el clic en la fila tiene
 * que abrir la vista, no el cliente de correo.
 */
export function FilaDeContacto({ contacto }: { contacto: FilaContacto }) {
  const control = useControlDetalle();

  return (
    <TableRow
      {...propsFilaClicable(() => control.cambiar("viendo"), CLASE_FILA)}
    >
      <TableCell
        className="max-w-56 truncate font-medium"
        title={contacto.nombre}
      >
        {contacto.nombre}
      </TableCell>
      <TableCell
        className="max-w-48 truncate"
        title={contacto.cargo ?? undefined}
      >
        {oVacio(contacto.cargo)}
      </TableCell>
      <TableCell className="max-w-72">
        <div className="flex items-start gap-2">
          <Building2Icon
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0">
            {/* Empresa dada de baja: atenuada y con el badge «Inactiva», el
                mismo criterio que su selector en el formulario. El contacto
                sigue asociado a ella a propósito (ver entidades.md); esto solo
                lo hace visible. */}
            <div className="flex min-w-0 items-center gap-2">
              <p
                className={cn(
                  "truncate",
                  !contacto.empresa_activo && "text-muted-foreground",
                )}
                title={contacto.empresa_razon_social}
              >
                {contacto.empresa_razon_social}
              </p>
              {contacto.empresa_activo ? null : (
                <BadgeSituacion activo={false} etiquetaInactivo="Inactiva" />
              )}
            </div>
            {/* Una empresa extranjera no tiene RUC: el guion de "no tiene",
                igual que en el listado de Empresas. */}
            <p className="font-mono text-xs text-muted-foreground tabular-nums">
              {oVacio(contacto.empresa_ruc)}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell
        className="max-w-56 truncate"
        title={contacto.correo ?? undefined}
      >
        {oVacio(contacto.correo)}
      </TableCell>
      <TableCell className="whitespace-nowrap tabular-nums">
        {oVacio(contacto.celular)}
      </TableCell>
      <TableCell className={CELDA_FIJA_ANTES_DEL_FIN}>
        <BadgeSituacion activo={contacto.activo} />
      </TableCell>
      <TableCell className={`${CELDA_FIJA_FIN} text-right`}>
        <SinPropagacion className="flex items-center justify-end gap-1">
          <AccionesContacto contacto={contacto} control={control} />
          {/* `actualizarContacto` recibe el `id` como primer argumento; `.bind`
              lo fija aquí para que el modal vea la misma firma
              `(formData) => …` que en el alta. */}
          <DialogoContacto
            guardarAction={actualizarContacto.bind(null, contacto.id)}
            control={control}
            contacto={contacto}
          />
        </SinPropagacion>
      </TableCell>
    </TableRow>
  );
}
