"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter } from "next/navigation";
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
import { CamposOportunidad } from "./campos-oportunidad";

type Props = {
  /** Server Action que crea: `crearOportunidad`. Devuelve, nunca redirige. */
  guardarAction: (formData: FormData) => Promise<EstadoFormulario>;
  /** El botón "Nueva oportunidad" de la cabecera. */
  disparador: ReactElement;
};

/**
 * Modal "Nueva oportunidad" (sección 8 de la spec).
 *
 * Es el modal de alta de `DialogoContacto` / `DialogoEmpresa` sin los modos
 * "viendo" y "editando": una oportunidad no se ve ni se edita en un modal,
 * sino en su página de detalle (`/oportunidades/[id]`, Partes 9 y 10). Por eso
 * no usa `useControlDetalle`: el único estado es abierto o cerrado.
 *
 * Conserva las tres cosas del patrón:
 * 1. `useTransition` y no `useActionState`: el resultado tiene que cerrar,
 *    avisar y refrescar sin un `useEffect` con `setState`.
 * 2. Los campos se montan solo con el modal abierto: Base UI NO desmonta a
 *    los hijos al cerrar, y así cada apertura empieza limpia (empresa,
 *    contacto y moneda incluidos).
 * 3. `try/catch` alrededor de la acción, dejando pasar el `redirect()` de
 *    sesión vencida.
 */
export function DialogoNuevaOportunidad({ guardarAction, disparador }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
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
          "[Oportunidades] fallo inesperado al guardar desde el modal",
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

      setAbierto(false);
      setEstado(estadoFormularioInicial);
      toast.success("Oportunidad registrada.");
      // Trae lo que haya en la página; la tarjeta en su columna llega con el
      // kanban (Parte 8).
      router.refresh();
    });
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(siguiente) => {
        setAbierto(siguiente);
        if (!siguiente) setEstado(estadoFormularioInicial);
      }}
    >
      <DialogTrigger render={disparador} />

      {/* Sin animación de salida, igual que en los demás modales: los campos
          se desmontan al cerrar y se vería el modal colapsar vacío. */}
      <DialogContent className="flex max-h-[85svh] flex-col data-closed:animate-none duration-0 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva oportunidad</DialogTitle>
          <DialogDescription>
            Registra una oportunidad comercial. El asesor serás tú.
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

        <form
          // `onSubmit` + `preventDefault`, NO `action={…}`: con `action`,
          // React 19 restablece los campos no controlados al terminar, también
          // cuando el servidor devuelve errores.
          onSubmit={(evento) => {
            evento.preventDefault();
            alEnviar(new FormData(evento.currentTarget));
          }}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
            {abierto ? (
              <CamposOportunidad errores={estado.errores ?? {}} />
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
              {enviando ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
