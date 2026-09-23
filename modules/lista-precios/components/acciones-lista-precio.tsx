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
import { Button } from "@/components/ui/button";
import type { ControlDetalle } from "@/core/fila-clicable";
import type { ResultadoAccion } from "@/core/resultado-accion";
import { cambiarActivoPrecio } from "../actions";
import type { FilaPrecio } from "../queries";

/**
 * Las dos acciones de una fila de la lista de precios: editar e inactivar.
 *
 * COPIA EL PATRÓN DE `AccionesMaterial` SIN DESVIARSE — es el estándar de los
 * Catálogos maestros (ver esa sección en .claude/skills/shadcn-conventions/
 * SKILL.md). Lo que hay que respetar al heredarlo:
 *
 * - DOS ICONOS, NO TRES: no hay lupa de "ver detalle" porque la vista se abre
 *   haciendo clic en la fila (`core/fila-clicable.tsx`). El lápiz se queda como
 *   atajo: salta directo a edición sin pasar por la vista, que es lo que quiere
 *   quien ya sabe a qué viene.
 * - Ninguno de los dos monta su propio modal: los dos mueven el
 *   `ControlDetalle` de la fila, que es quien monta el único modal que hay.
 * - Iconos sin texto, con su nombre en un `<span class="sr-only">` —lo que
 *   anuncia un lector de pantalla— y un `title` para el tooltip del navegador.
 *   Un icono suelto sin ninguna de las dos cosas sería inaccesible. Aquí el
 *   argumento del ancho pesa más que en Materiales: esta tabla tiene ONCE
 *   columnas.
 * - INACTIVAR SE CONFIRMA; REACTIVAR NO. Inactivar saca la oferta de la lista
 *   vigente y es lo que un usuario apresurado confundiría con "borrar".
 *   Reactivar no destruye ni esconde nada, y pedir confirmación también ahí
 *   entrenaría a aceptar sin leer, que es justo lo que dejaría el aviso de
 *   inactivar sin valor.
 *
 * ESTE COMPONENTE NO SE MONTA SUELTO: va dentro del `SinPropagacion` de la
 * fila, o el clic en cualquiera de estos botones abriría además la vista, y el
 * "Cancelar" del diálogo de confirmación —que se porta a `document.body` pero
 * burbujea por el árbol de componentes— también. El envoltorio está en
 * `fila-lista-precio.tsx` y el porqué completo en `core/fila-clicable.tsx`.
 *
 * Lo que se confirma tampoco es un borrado, aunque lo parezca desde fuera: la
 * acción solo pone `activo = false`. El texto del diálogo lo dice con las
 * palabras del usuario, no con las de la base de datos.
 */
export function AccionesPrecio({
  precio,
  control,
}: {
  precio: FilaPrecio;
  control: ControlDetalle;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, iniciarGuardado] = useTransition();

  // El código de oferta identifica la fila en los avisos y NO necesita
  // fallback, a diferencia del nombre en Materiales: `codigo_oferta` es
  // `NOT NULL` y lo pone el correlativo, así que siempre hay algo que decir.
  const codigo = precio.codigo_oferta;
  // La descripción del material sí puede venir vacía (esa columna admite NULL),
  // así que solo se añade al diálogo cuando existe: es contexto, no identidad.
  const material = precio.material_descripcion?.trim();

  function aplicar(siguienteActivo: boolean) {
    iniciarGuardado(async () => {
      let resultado: ResultadoAccion;

      try {
        resultado = await cambiarActivoPrecio(precio.id, siguienteActivo);
      } catch (error) {
        // El `redirect()` a /login de `exigirSesion()` llega como error
        // lanzado. Es navegación, no fallo: se deja pasar.
        if (esRedireccionDeNext(error)) throw error;

        console.error(
          "[Lista de precios] fallo inesperado al cambiar el activo",
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
          ? `${codigo} vuelve a la lista.`
          : `${codigo} quedó inactiva.`,
      );
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Editar"
        onClick={() => control.cambiar("editando")}
      >
        <PencilIcon />
        <span className="sr-only">Editar {codigo}</span>
      </Button>

      {precio.activo ? (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Inactivar"
            disabled={guardando}
            onClick={() => setConfirmando(true)}
          >
            <XIcon />
            <span className="sr-only">Inactivar {codigo}</span>
          </Button>

          {/* Cerrar por cualquier vía (Cancelar, Escape, clic fuera) es soltar
              la intención: nada se ha enviado todavía, así que no hay que
              revertir nada. Mismo patrón que el AlertDialog de Materiales. */}
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
                    ¿Inactivar la oferta {codigo}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {material
                      ? `Este precio de ${material} dejará de aparecer en la lista vigente. `
                      : "Dejará de aparecer en la lista de precios vigente. "}
                    Sus datos se conservan y puedes volver a activarla cuando
                    quieras desde «Ver solo inactivas».
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
                    Inactivar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            ) : null}
          </AlertDialog>
        </>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          title="Reactivar"
          disabled={guardando}
          onClick={() => aplicar(true)}
        >
          <RotateCcwIcon />
          <span className="sr-only">Reactivar {codigo}</span>
        </Button>
      )}
    </>
  );
}
