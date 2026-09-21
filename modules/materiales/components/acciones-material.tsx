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
import type { ResultadoAccion } from "@/core/resultado-accion";
import { cambiarActivoMaterial, editarMaterialEnModal } from "../actions";
import type { FilaMaterial } from "../queries";
import { DialogoMaterial } from "./dialogo-material";

/**
 * Las dos acciones de una fila del catálogo: editar e inactivar.
 *
 * SON DOS, NO TRES: no hay lupa de "ver detalle". Un material cabe entero en
 * su fila, así que una pantalla de solo lectura no enseñaría nada que no esté
 * ya a la vista — y el modal de edición sirve igual para mirar, porque se
 * cierra sin guardar. Este es el patrón estándar de los Catálogos maestros
 * (ver la sección "Catálogos maestros" en
 * .claude/skills/shadcn-conventions/SKILL.md): los que vengan —Servicios,
 * Lista de precios, Tarifario de personal, EPPs— lo heredan tal cual.
 *
 * Iconos sin texto, a diferencia de Personal, que usa botones con palabras: en
 * una tabla de siete columnas el ancho es escaso y dos etiquetas por fila
 * empujan el contenido. Cada botón lleva su nombre en un `<span class="sr-only">`
 * —que es lo que anuncia un lector de pantalla— y un `title` para el tooltip
 * nativo del navegador al pasar el ratón. Un icono suelto sin ninguna de las
 * dos cosas sería inaccesible.
 *
 * INACTIVAR SE CONFIRMA; REACTIVAR NO. No es asimetría por descuido: inactivar
 * saca el material del catálogo vigente y es lo que un usuario apresurado
 * confundiría con "borrar", así que se pone un aviso delante. Reactivar no
 * destruye ni esconde nada, y pedir confirmación también ahí entrenaría a
 * aceptar sin leer, que es justo lo que dejaría el aviso de inactivar sin
 * valor. Mismo criterio que `BotonBaja` en Personal y que
 * `Facturado`/`Cancelada` en OT.
 *
 * Lo que se confirma tampoco es un borrado, aunque lo parezca desde fuera: la
 * acción solo pone `activo = false`. El texto del diálogo lo dice con las
 * palabras del usuario, no con las de la base de datos.
 */
export function AccionesMaterial({ material }: { material: FilaMaterial }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, iniciarGuardado] = useTransition();

  // La descripción identifica el material en los avisos; si viniera vacía
  // —la columna lo admite— se cae al código, y si tampoco, a algo genérico.
  const nombre =
    material.descripcion?.trim() || material.codigo_interno?.trim() || "material";

  function aplicar(siguienteActivo: boolean) {
    iniciarGuardado(async () => {
      let resultado: ResultadoAccion;

      try {
        resultado = await cambiarActivoMaterial(material.id, siguienteActivo);
      } catch (error) {
        // El `redirect()` a /login de `exigirSesion()` llega como error
        // lanzado. Es navegación, no fallo: se deja pasar.
        if (esRedireccionDeNext(error)) throw error;

        console.error("[Materiales] fallo inesperado al cambiar el activo", error);
        toast.error("No se pudo completar. Intenta de nuevo.");
        return;
      }

      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }

      toast.success(
        siguienteActivo
          ? `${nombre} vuelve al catálogo.`
          : `${nombre} quedó inactivo.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <DialogoMaterial
        guardarAction={editarMaterialEnModal}
        material={material}
        disparador={
          <Button variant="ghost" size="icon-sm" title="Editar">
            <PencilIcon />
            <span className="sr-only">Editar {nombre}</span>
          </Button>
        }
      />

      {material.activo ? (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Inactivar"
            disabled={guardando}
            onClick={() => setConfirmando(true)}
          >
            <XIcon />
            <span className="sr-only">Inactivar {nombre}</span>
          </Button>

          {/* Cerrar por cualquier vía (Cancelar, Escape, clic fuera) es soltar
              la intención: nada se ha enviado todavía, así que no hay que
              revertir nada. Mismo patrón que el AlertDialog de Personal. */}
          <AlertDialog
            open={confirmando}
            onOpenChange={(abierto) => {
              if (!abierto) setConfirmando(false);
            }}
          >
            {confirmando ? (
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Inactivar {nombre}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dejará de aparecer en el catálogo. Sus datos se conservan y
                    puedes volver a activarlo cuando quieras marcando «Mostrar
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
          <span className="sr-only">Reactivar {nombre}</span>
        </Button>
      )}
    </div>
  );
}
