"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcwIcon, XIcon } from "lucide-react";
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
import type { ResultadoAccion } from "@/core/resultado-accion";
import { alternarActivoEmpresa } from "../actions";
import type { FilaEmpresa } from "../queries";

/**
 * Las acciones de una fila de empresas. Mismo patrón que `AccionesMaterial`
 * (iconos con `BotonAccionFila`, dar de baja confirmado, reactivar directo),
 * con UNA diferencia temporal: todavía no hay lápiz, porque el formulario de
 * edición llega en la Parte 4. Cuando llegue, el lápiz va delante de la equis
 * y mueve el `ControlDetalle` de la fila a "editando", como en Materiales.
 *
 * ESTE COMPONENTE NO SE MONTA SUELTO: va dentro del `SinPropagacion` de la
 * fila, `alert-dialog` incluido — un clic en "Cancelar" del diálogo, portado a
 * `document.body`, burbujea igual por el árbol de React hasta el `<tr>`. Ver
 * `core/fila-clicable.tsx`.
 *
 * DAR DE BAJA SE CONFIRMA; REACTIVAR NO. Mismo criterio que Materiales y
 * Personal: la baja se confunde con borrar, reactivar no destruye nada. Y no
 * es un borrado: `alternarActivoEmpresa` solo escribe `activo` (regla
 * invariable 9), nunca el `estado` de SUNAT.
 */
export function AccionesEmpresa({ empresa }: { empresa: FilaEmpresa }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, iniciarGuardado] = useTransition();

  const nombre = empresa.razon_social;

  function aplicar(siguienteActivo: boolean) {
    iniciarGuardado(async () => {
      let resultado: ResultadoAccion;

      try {
        resultado = await alternarActivoEmpresa(empresa.id, siguienteActivo);
      } catch (error) {
        // El `redirect()` a /login de `exigirSesion()` llega como error
        // lanzado. Es navegación, no fallo: se deja pasar.
        if (esRedireccionDeNext(error)) throw error;

        console.error("[Clientes] fallo inesperado al cambiar el activo", error);
        toast.error("No se pudo completar. Intenta de nuevo.");
        return;
      }

      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }

      toast.success(
        siguienteActivo
          ? `${nombre} vuelve a estar activa.`
          : `${nombre} quedó inactiva.`,
      );
      router.refresh();
    });
  }

  if (!empresa.activo) {
    return (
      <BotonAccionFila
        etiqueta="Reactivar"
        etiquetaAccesible={`Reactivar ${nombre}`}
        disabled={guardando}
        onClick={() => aplicar(true)}
      >
        <RotateCcwIcon />
      </BotonAccionFila>
    );
  }

  return (
    <>
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
              <AlertDialogTitle>¿Dar de baja {nombre}?</AlertDialogTitle>
              <AlertDialogDescription>
                Dejará de aparecer en el directorio de empresas. Sus datos se
                conservan y puedes volver a activarla cuando quieras desde «Ver
                solo inactivas».
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
