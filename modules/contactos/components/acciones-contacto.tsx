"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { esRedireccionDeNext } from "@/lib/redireccion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BotonAccionFila } from "@/core/components/boton-accion-fila";
import type { ControlDetalle } from "@/core/fila-clicable";
import type { ResultadoAccion } from "@/core/resultado-accion";
import { alternarActivoContacto } from "../actions";
import type { FilaContacto } from "../queries";

/**
 * Las acciones de una fila de contactos. Mismo patrón que `AccionesEmpresa`:
 * lápiz (atajo directo a edición, sin pasar por la vista) y equis para dar de
 * baja, o la flecha de reactivar en la vista de inactivos. Ninguno monta su
 * propio modal: el lápiz mueve el `ControlDetalle` de la fila.
 *
 * ESTE COMPONENTE NO SE MONTA SUELTO: va dentro del `SinPropagacion` de la
 * fila, `alert-dialog` incluido — un clic en "Cancelar" del diálogo, portado a
 * `document.body`, burbujea igual por el árbol de React hasta el `<tr>`. Ver
 * `core/fila-clicable.tsx`.
 *
 * DAR DE BAJA SE CONFIRMA; REACTIVAR NO. Mismo criterio que Empresas y
 * Materiales: la baja se confunde con borrar, reactivar no destruye nada. Y no
 * es un borrado: `alternarActivoContacto` solo escribe `activo` (regla
 * invariable 9).
 */
export function AccionesContacto({
  contacto,
  control,
}: {
  contacto: FilaContacto;
  control: ControlDetalle;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, iniciarGuardado] = useTransition();

  const nombre = contacto.nombre;

  function aplicar(siguienteActivo: boolean) {
    iniciarGuardado(async () => {
      let resultado: ResultadoAccion;

      try {
        resultado = await alternarActivoContacto(contacto.id, siguienteActivo);
      } catch (error) {
        // El `redirect()` a /login de `exigirSesion()` llega como error
        // lanzado. Es navegación, no fallo: se deja pasar.
        if (esRedireccionDeNext(error)) throw error;

        console.error(
          "[Contactos] fallo inesperado al cambiar el activo",
          error,
        );
        toast.error("No se pudo completar. Intenta de nuevo.");
        return;
      }

      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }

      toast.success(
        siguienteActivo
          ? `${nombre} vuelve a estar activo.`
          : `${nombre} quedó inactivo.`,
      );
      router.refresh();
    });
  }

  const lapiz = (
    <BotonAccionFila
      etiqueta="Editar"
      etiquetaAccesible={`Editar ${nombre}`}
      onClick={() => control.cambiar("editando")}
    >
      <PencilIcon />
    </BotonAccionFila>
  );

  if (!contacto.activo) {
    return (
      <>
        {lapiz}
        <BotonAccionFila
          etiqueta="Reactivar"
          etiquetaAccesible={`Reactivar ${nombre}`}
          disabled={guardando}
          onClick={() => aplicar(true)}
        >
          <RotateCcwIcon />
        </BotonAccionFila>
      </>
    );
  }

  return (
    <>
      {lapiz}
      <BotonAccionFila
        etiqueta="Dar de baja"
        etiquetaAccesible={`Dar de baja ${nombre}`}
        destructiva
        disabled={guardando}
        onClick={() => setConfirmando(true)}
      >
        <XIcon />
      </BotonAccionFila>

      {/* Cerrar por cualquier vía es soltar la intención: nada se ha enviado
          todavía, así que no hay que revertir nada. */}
      <AlertDialog
        open={confirmando}
        onOpenChange={(abierto) => {
          if (!abierto) setConfirmando(false);
        }}
      >
        {confirmando ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Dar de baja a {nombre}?</AlertDialogTitle>
              <AlertDialogDescription>
                Dejará de aparecer en el listado de contactos. Sus datos se
                conservan y puedes volver a activarlo cuando quieras desde «Ver
                solo inactivos».
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setConfirmando(false);
                  aplicar(false);
                }}
              >
                Dar de baja
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </>
  );
}
