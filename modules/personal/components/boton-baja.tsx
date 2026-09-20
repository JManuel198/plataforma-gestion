"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import type { ResultadoAccion } from "@/core/resultado-accion";
import { cambiarActivoPersona } from "../actions";

/**
 * Dar de baja a una persona, o volver a darle de alta.
 *
 * LA BAJA SE CONFIRMA; EL ALTA NO. No es asimetría por descuido: dar de baja
 * saca a alguien de la lista y es lo que un usuario apresurado confundiría con
 * "borrar", así que se pone un aviso delante — el mismo criterio que
 * `Facturado`/`Cancelada` en OT, donde se confirma lo que cierra un ciclo y se
 * aplica directo lo que es rutina. Reactivar no destruye nada ni esconde nada,
 * y pedir confirmación también ahí entrenaría a aceptar sin leer, que es justo
 * lo que dejaría el aviso de la baja sin valor.
 *
 * Lo que se confirma tampoco es un borrado, aunque lo parezca desde fuera: la
 * acción solo pone `activo = false`. La fila se queda, porque si algún día
 * `orden_trabajo.responsable` apunta de verdad a esta tabla, un DELETE dejaría
 * OT históricas señalando a nadie. El texto del diálogo lo dice con las
 * palabras del usuario, no con las de la base de datos.
 */
export function BotonBaja({
  id,
  nombreCompleto,
  activo,
}: {
  id: string;
  /** Solo para el texto del aviso y del toast: identifica a la persona. */
  nombreCompleto: string;
  activo: boolean;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, iniciarGuardado] = useTransition();

  function aplicar(siguienteActivo: boolean) {
    iniciarGuardado(async () => {
      let resultado: ResultadoAccion;

      try {
        resultado = await cambiarActivoPersona(id, siguienteActivo);
      } catch (error) {
        // El `redirect()` a /login de `exigirSesion()` llega como error
        // lanzado. Es navegación, no fallo: se deja pasar.
        if (esRedireccionDeNext(error)) throw error;

        console.error("[Personal] fallo inesperado al cambiar el alta", error);
        toast.error("No se pudo completar. Intenta de nuevo.");
        return;
      }

      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }

      toast.success(
        siguienteActivo
          ? `${nombreCompleto} vuelve a estar activa.`
          : `${nombreCompleto} quedó dada de baja.`,
      );
      router.refresh();
    });
  }

  if (!activo) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={guardando}
        onClick={() => aplicar(true)}
      >
        Reactivar
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={guardando}
        onClick={() => setConfirmando(true)}
      >
        Dar de baja
      </Button>

      {/* Cerrar por cualquier vía (Cancelar, Escape, clic fuera) es soltar la
          intención: nada se ha enviado todavía, así que no hay que revertir
          nada. Mismo patrón que el AlertDialog de estado en OT. */}
      <AlertDialog
        open={confirmando}
        onOpenChange={(abierto) => {
          if (!abierto) setConfirmando(false);
        }}
      >
        {confirmando ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                ¿Dar de baja a {nombreCompleto}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Dejará de aparecer en la lista de personal. Sus datos se
                conservan y puedes volver a darle de alta cuando quieras.
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
