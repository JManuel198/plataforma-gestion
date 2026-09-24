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
import { cambiarActivoTarifa } from "../actions";
import type { FilaTarifa } from "../queries";

/**
 * Las dos acciones de una fila del tarifario: editar e inactivar (o reactivar).
 *
 * Nace en la Parte 2. En la Parte 1 el lápiz vivía suelto dentro de
 * `fila-tarifa.tsx` porque era el único control y un archivo para un botón era
 * ceremonia; con la equis y su diálogo de confirmación, el archivo propio pasa
 * a valer la pena — igual que `AccionesMaterial` y `AccionesPrecio`.
 *
 * DOS ICONOS, NO TRES: no hay lupa de "ver detalle" porque no hace falta un
 * botón para eso — se ve haciendo clic en la fila, que abre el mismo modal en
 * modo solo lectura (ver `fila-tarifa.tsx` y `core/fila-clicable.tsx`). El
 * lápiz se queda como atajo: salta directo a edición sin pasar por la vista,
 * que es lo que quiere quien ya sabe a qué viene. Es el patrón estándar de los
 * Catálogos maestros (ver "Catálogos maestros" en
 * .claude/skills/shadcn-conventions/SKILL.md).
 *
 * Ni el lápiz ni la equis montan su propio modal: los dos mueven el
 * `ControlDetalle` de la fila, que es quien monta el único modal que hay.
 *
 * ESTE COMPONENTE NO SE MONTA SUELTO: va dentro del `SinPropagacion` de la
 * fila, o el clic en cualquiera de estos botones abriría además la vista. Y no
 * basta con que el `AlertDialog` se porte a `document.body`: los eventos de
 * React burbujean por el árbol de COMPONENTES, no por el DOM, así que pulsar
 * "Cancelar" dentro de la confirmación llega igual al `onClick` del `<tr>`. El
 * envoltorio está en `fila-tarifa.tsx` y el porqué completo en
 * `core/fila-clicable.tsx`.
 *
 * Iconos sin texto, a diferencia de Personal, que usa botones con palabras: en
 * una tabla con varias columnas el ancho es escaso y dos etiquetas por fila
 * empujan el contenido. Cada botón lleva su nombre en un
 * `<span class="sr-only">` —que es lo que anuncia un lector de pantalla— y un
 * `title` para el tooltip nativo al pasar el ratón. Un icono suelto sin ninguna
 * de las dos cosas sería inaccesible.
 *
 * INACTIVAR SE CONFIRMA; REACTIVAR NO. No es asimetría por descuido: inactivar
 * saca la tarifa del tarifario vigente y es lo que un usuario apresurado
 * confundiría con "borrar", así que se pone un aviso delante. Reactivar no
 * destruye ni esconde nada, y pedir confirmación también ahí entrenaría a
 * aceptar sin leer, que es justo lo que dejaría el aviso de inactivar sin
 * valor. Mismo criterio que `AccionesMaterial`, `BotonBaja` en Personal y
 * `Facturado`/`Cancelada` en OT.
 *
 * Lo que se confirma tampoco es un borrado, aunque lo parezca desde fuera: la
 * acción solo pone `activo = false` (regla invariable 9). El texto del diálogo
 * lo dice con las palabras del usuario, no con las de la base de datos.
 */
export function AccionesTarifa({
  tarifa,
  control,
}: {
  tarifa: FilaTarifa;
  control: ControlDetalle;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, iniciarGuardado] = useTransition();

  // El cargo identifica la tarifa en los avisos; si viniera vacío —la columna
  // lo admite— se cae al código, y si tampoco, a algo genérico. Mismo criterio
  // que `AccionesMaterial`.
  const nombre = tarifa.cargo?.trim() || tarifa.codigo?.trim() || "tarifa";

  function aplicar(siguienteActivo: boolean) {
    iniciarGuardado(async () => {
      let resultado: ResultadoAccion;

      try {
        resultado = await cambiarActivoTarifa(tarifa.id, siguienteActivo);
      } catch (error) {
        // El `redirect()` a /login de `exigirSesion()` llega como error
        // lanzado. Es navegación, no fallo: se deja pasar.
        if (esRedireccionDeNext(error)) throw error;

        console.error(
          "[Tarifario] fallo inesperado al cambiar el activo",
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
          ? `${nombre} vuelve al tarifario.`
          : `${nombre} quedó inactivo.`,
      );
      router.refresh();
    });
  }

  return (
    <>
      <BotonAccionFila
        etiqueta="Editar"
        etiquetaAccesible={`Editar ${nombre}`}
        onClick={() => control.cambiar("editando")}
      >
        <PencilIcon />
      </BotonAccionFila>

      {tarifa.activo ? (
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
                  <AlertDialogTitle>¿Dar de baja {nombre}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dejará de aparecer en el tarifario. Sus datos se conservan y
                    puedes volver a activarla cuando quieras desde «Ver solo
                    inactivos».
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
      ) : (
        <BotonAccionFila
          etiqueta="Reactivar"
          etiquetaAccesible={`Reactivar ${nombre}`}
          disabled={guardando}
          onClick={() => aplicar(true)}
        >
          <RotateCcwIcon />
        </BotonAccionFila>
      )}
    </>
  );
}
