"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChipCodigo } from "@/core/components/chip-codigo";
import type { ControlDetalle } from "@/core/fila-clicable";
import type { FilaEmpresa } from "../queries";
import { VistaEmpresa } from "./vista-empresa";

/**
 * El modal de una empresa. HOY SOLO TIENE EL MODO "viendo".
 *
 * Lleva ya el `ControlDetalle` de `core/fila-clicable.tsx` —los tres modos,
 * un solo modal— para que la Parte 4 añada "editando" sin cambiar la forma de
 * la fila: se sumará aquí el formulario (y el botón "Editar" del pie), igual
 * que en `DialogoPersona`. Hasta entonces no hay ningún camino que ponga el
 * control en "editando", así que cualquier modo abierto se pinta como vista.
 *
 * No hay botón "Editar" desconectado en el pie a propósito: un botón que no
 * hace nada se lee como "está roto", y el patrón no pierde nada por llegar
 * entero en la Parte 4.
 *
 * `VistaEmpresa` se monta solo con el modal abierto: Base UI NO desmonta a
 * los hijos de un Dialog al cerrarse (ver la nota de `DialogoPersona`), y así
 * el `router.refresh()` de una baja no re-renderiza una vista invisible.
 */
export function DialogoEmpresa({
  control,
  empresa,
}: {
  control: ControlDetalle;
  empresa: FilaEmpresa;
}) {
  const abierto = control.modo !== "cerrado";

  return (
    <Dialog
      open={abierto}
      onOpenChange={(siguiente) => {
        // Solo se abre desde la fila (que ya pone "viendo"); aquí solo llega
        // el cierre, por cualquier vía.
        if (!siguiente) control.cambiar("cerrado");
      }}
    >
      <DialogContent className="flex max-h-[85svh] flex-col data-closed:animate-none duration-0 sm:max-w-lg">
        <DialogHeader>
          <ChipCodigo codigo={empresa.codigo} />
          <DialogTitle>{empresa.razon_social}</DialogTitle>
          <DialogDescription>
            {[empresa.ruc ? `RUC ${empresa.ruc}` : null, empresa.nombre_comercial]
              .filter(Boolean)
              .join(" · ") || "Sin RUC registrado"}
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
          {abierto ? <VistaEmpresa empresa={empresa} /> : null}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
