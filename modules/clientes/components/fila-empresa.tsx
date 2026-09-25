"use client";

import {
  CELDA_FIJA_FIN,
  CELDA_FIJA_INICIO,
  CLASE_CIFRA,
  CLASE_CODIGO,
  CLASE_FILA,
} from "@/core/components/tabla-listado";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  propsFilaClicable,
  SinPropagacion,
  useControlDetalle,
} from "@/core/fila-clicable";
import { oVacio } from "@/core/vista-detalle";
import { actualizarEmpresa } from "../actions";
import type { FilaEmpresa } from "../queries";
import { AccionesEmpresa } from "./acciones-empresa";
import { BadgeTipo } from "./badge-tipo";
import { DialogoEmpresa } from "./dialogo-empresa";

/**
 * Una fila del directorio de empresas, con su modal.
 *
 * El patrón de siempre, importado de `core/fila-clicable.tsx`:
 * 1. La fila sigue siendo un `<tr>` con `tabIndex`; Enter y Espacio la abren.
 * 2. Todo lo interactivo va dentro del `SinPropagacion`, EL MODAL Y EL
 *    `alert-dialog` DE LA BAJA INCLUIDOS: los eventos de React burbujean por
 *    el árbol de componentes, no por el DOM, así que un clic dentro de un
 *    portal llega igual al `onClick` de esta fila.
 */
export function FilaDeEmpresa({ empresa }: { empresa: FilaEmpresa }) {
  const control = useControlDetalle();

  return (
    <TableRow
      {...propsFilaClicable(() => control.cambiar("viendo"), CLASE_FILA)}
    >
      <TableCell className={`${CELDA_FIJA_INICIO} ${CLASE_CODIGO} px-3`}>
        {empresa.codigo}
      </TableCell>
      <TableCell
        className="max-w-72 truncate font-medium"
        title={empresa.razon_social}
      >
        {empresa.razon_social}
      </TableCell>
      <TableCell
        className="max-w-56 truncate"
        title={empresa.nombre_comercial ?? undefined}
      >
        {oVacio(empresa.nombre_comercial)}
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums">
        {oVacio(empresa.ruc)}
      </TableCell>
      <TableCell>
        <BadgeTipo tipo={empresa.tipo} />
      </TableCell>
      <TableCell>{oVacio(empresa.distrito)}</TableCell>
      {/* Contactos activos e inactivos de la empresa. El número llega ya
          contado de la consulta del listado (`columnasListado` en
          queries.ts), nunca calculado aquí. */}
      <TableCell className={CLASE_CIFRA}>{empresa.contactos}</TableCell>
      <TableCell className={`${CELDA_FIJA_FIN} text-right`}>
        <SinPropagacion className="flex items-center justify-end gap-1">
          <AccionesEmpresa empresa={empresa} control={control} />
          {/* `actualizarEmpresa` recibe el `id` como primer argumento; `.bind`
              lo fija aquí para que el modal vea la misma firma
              `(formData) => …` que en el alta (Next documenta este uso en
              dist/docs/01-app/02-guides/forms.md). */}
          <DialogoEmpresa
            guardarAction={actualizarEmpresa.bind(null, empresa.id)}
            control={control}
            empresa={empresa}
          />
        </SinPropagacion>
      </TableCell>
    </TableRow>
  );
}
