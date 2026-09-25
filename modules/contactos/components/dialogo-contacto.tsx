"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { esRedireccionDeNext } from "@/lib/redireccion";
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
import {
  estadoFormularioInicial,
  type EstadoFormulario,
} from "@/core/estado-formulario";
import { useControlDetalle, type ControlDetalle } from "@/core/fila-clicable";
import type { FilaContacto } from "../queries";
import { CamposContacto } from "./campos-contacto";
import { VistaContacto } from "./vista-contacto";

type Props = {
  /**
   * Server Action que guarda. Devuelve el resultado, nunca redirige. Al editar
   * es `actualizarContacto` con el `id` ya fijado (`.bind`), así que aquí las
   * dos tienen la misma forma.
   */
  guardarAction: (formData: FormData) => Promise<EstadoFormulario>;
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
 * Alta, consulta y edición de un contacto sin salir del listado.
 *
 * Mismo patrón que `DialogoEmpresa`, con las tres cosas que allí costó
 * descubrir:
 *
 * 1. `useTransition` y no `useActionState`: el resultado tiene que cerrar,
 *    avisar y refrescar, y con `useActionState` habría que reaccionar en un
 *    `useEffect` con `setState` (lo rechaza el lint).
 * 2. Los campos se montan solo con el modal abierto (`abierto ? … : null`):
 *    Base UI NO desmonta a los hijos al cerrar, y sin esto el
 *    `router.refresh()` llegaría a campos todavía vivos. Además resetea la
 *    empresa elegida en el selector entre una apertura y otra.
 * 3. `try/catch` alrededor de la acción, dejando pasar el `redirect()` de
 *    sesión vencida.
 *
 * LOS DOS MODOS ABIERTOS SON UN SOLO MODAL: el botón "Editar" de la vista solo
 * cambia el modo, sin cerrar ni volver a abrir.
 */
export function DialogoContacto({
  guardarAction,
  disparador,
  control: controlExterno,
  contacto,
}: Props) {
  const router = useRouter();
  const controlPropio = useControlDetalle();
  const control = controlExterno ?? controlPropio;
  const abierto = control.modo !== "cerrado";
  const editando = control.modo === "editando";
  const [estado, setEstado] = useState<EstadoFormulario>(
    estadoFormularioInicial,
  );
  const [enviando, iniciarGuardado] = useTransition();

  function alEnviar(formData: FormData) {
    iniciarGuardado(async () => {
      let resultado: EstadoFormulario;

      try {
        resultado = await guardarAction(formData);
      } catch (error) {
        if (esRedireccionDeNext(error)) throw error;

        console.error(
          "[Contactos] fallo inesperado al guardar desde el modal",
          error,
        );
        setEstado({ mensaje: "No se pudo guardar. Intenta de nuevo." });
        return;
      }

      if (!resultado.ok) {
        // El modal se queda abierto con lo escrito: el formulario se envía con
        // `onSubmit`, que no restablece los campos no controlados.
        setEstado(resultado);
        return;
      }

      control.cambiar("cerrado");
      setEstado(estadoFormularioInicial);
      toast.success(
        contacto
          ? `${contacto.nombre}: cambios guardados.`
          : "Contacto registrado.",
      );
      router.refresh();
    });
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(siguiente) => {
        // Cerrar por cualquier vía vuelve a "cerrado" sin recordar el modo: el
        // próximo clic en la fila abre la vista otra vez. Abrir desde el
        // disparador propio es siempre el alta, que solo existe en edición.
        control.cambiar(siguiente ? "editando" : "cerrado");
        if (!siguiente) setEstado(estadoFormularioInicial);
      }}
    >
      {disparador ? <DialogTrigger render={disparador} /> : null}

      {/* Sin animación de salida, igual que en los demás modales: los campos
          se desmontan al cerrar y se vería el modal colapsar vacío. */}
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

        {estado.mensaje ? (
          <p
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {estado.mensaje}
          </p>
        ) : null}

        {editando || !contacto ? (
          <form
            // `onSubmit` + `preventDefault`, NO `action={…}`: con `action`,
            // React 19 restablece los campos no controlados al terminar,
            // también cuando el servidor devuelve errores.
            onSubmit={(evento) => {
              evento.preventDefault();
              alEnviar(new FormData(evento.currentTarget));
            }}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {abierto ? (
                <CamposContacto
                  contacto={contacto}
                  errores={estado.errores ?? {}}
                />
              ) : null}
            </div>

            <DialogFooter>
              <DialogClose
                render={<Button type="button" variant="outline" />}
                disabled={enviando}
              >
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Guardando…" : contacto ? "Guardar" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
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
