"use client";

import type { ReactElement } from "react";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useControlDetalle, type ControlDetalle } from "@/core/fila-clicable";
import type { FilaContacto } from "../queries";
import { VistaContacto } from "./vista-contacto";

type Props = {
  /**
   * El control que abre el modal. Solo lo trae el alta desde la cabecera, que
   * vive en un Server Component y no puede pasar un `control`.
   */
  disparador?: ReactElement;
  /**
   * Los tres modos, cuando manda quien monta el modal. Lo pasa la fila: el
   * clic en la fila abre en "viendo" y el lápiz en "editando".
   */
  control?: ControlDetalle;
  /** Contacto existente: se está viendo o editando. */
  contacto?: FilaContacto;
};

/**
 * Alta, consulta y edición de un contacto sin salir del listado. Mismo patrón
 * de tres modos en un solo modal que `DialogoEmpresa`.
 *
 * EL FORMULARIO NO ESTÁ TODAVÍA: llega en la Parte 4 del Bloque 3. Hoy el modo
 * "editando" (y el alta) solo enseña un aviso. Lo que ya es definitivo es la
 * mecánica: quién abre el modal, en qué modo, y que "Editar" en la vista cambia
 * de modo sin cerrar. Al añadir el formulario entran aquí `guardarAction`, el
 * estado de errores y el `useTransition`, copiados de `DialogoEmpresa`.
 */
export function DialogoContacto({
  disparador,
  control: controlExterno,
  contacto,
}: Props) {
  const controlPropio = useControlDetalle();
  const control = controlExterno ?? controlPropio;
  const abierto = control.modo !== "cerrado";
  const editando = control.modo === "editando";

  return (
    <Dialog
      open={abierto}
      onOpenChange={(siguiente) => {
        // Cerrar por cualquier vía vuelve a "cerrado" sin recordar el modo: el
        // próximo clic en la fila abre la vista otra vez. Abrir desde el
        // disparador propio es siempre el alta, que solo existe en edición.
        control.cambiar(siguiente ? "editando" : "cerrado");
      }}
    >
      {disparador ? <DialogTrigger render={disparador} /> : null}

      {/* Sin animación de salida, igual que en los demás modales: el contenido
          se desmonta al cerrar y se vería el modal colapsar vacío. */}
      <DialogContent className="flex max-h-[85svh] flex-col data-closed:animate-none duration-0 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {contacto
              ? editando
                ? "Editar contacto"
                : contacto.nombre
              : "Nuevo contacto"}
          </DialogTitle>
          <DialogDescription
            className={contacto && editando ? "sr-only" : undefined}
          >
            {contacto
              ? [contacto.cargo, contacto.empresa_razon_social]
                  .filter(Boolean)
                  .join(" · ")
              : "Registra una persona de contacto de una empresa."}
          </DialogDescription>
        </DialogHeader>

        {editando || !contacto ? (
          <>
            <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              El formulario de contacto está en construcción.
            </p>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cerrar
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {abierto ? <VistaContacto contacto={contacto} /> : null}
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cerrar
              </DialogClose>
              <Button type="button" onClick={() => control.cambiar("editando")}>
                <PencilIcon />
                Editar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
