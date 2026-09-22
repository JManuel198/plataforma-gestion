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
import { useControlDetalle, type ControlDetalle } from "@/core/fila-clicable";
import { CamposPersona } from "./campos-persona";
import { VistaPersona } from "./vista-persona";
import type { PersonaEditable } from "../tipos";

type Props = {
  /** Server Action que guarda. Devuelve el resultado, nunca redirige. */
  guardarAction: (formData: FormData) => Promise<EstadoFormulario>;
  /**
   * El control que abre el modal. Solo lo trae el alta desde la cabecera, que
   * vive en un Server Component y no puede pasar un `control`.
   */
  disparador?: ReactElement;
  /**
   * Los tres modos, cuando manda quien monta el modal. Lo pasa la fila, que
   * tiene dos disparadores para un mismo modal: el clic en la fila lo abre en
   * "viendo" y el botón Editar en "editando". Sin esto el modal lleva su
   * propio estado y solo conoce dos modos (cerrado y editando).
   */
  control?: ControlDetalle;
  /** Persona existente: se está viendo o editando. */
  persona?: PersonaEditable;
  /**
   * La edad ya calculada, para el modo "viendo". Viene de fuera a propósito:
   * `calcularEdad` se resuelve en el servidor (ver `fila-persona.tsx`).
   */
  edad?: number;
};

/**
 * Alta, consulta y edición de una persona sin salir del listado.
 *
 * Es el patrón ya afinado en
 * modules/ordenes-trabajo/components/dialogo-orden-trabajo.tsx, con las tres
 * cosas que allí costó descubrir incorporadas desde el principio. No las
 * quites sin leer por qué están:
 *
 * 1. `useTransition` y no `useActionState`. El resultado tiene que mover la
 *    interfaz (cerrar, avisar, refrescar), y con `useActionState` habría que
 *    reaccionar a él en un `useEffect` con `setState` dentro — justo lo que
 *    el lint rechaza (`react-hooks/set-state-in-effect`).
 * 2. Render condicional explícito de los campos (`{editando ? … : null}`).
 *    Base UI NO desmonta a los hijos cuando `open` pasa a false: el portal se
 *    monta según `mounted` (dialog/portal/DialogPortal.js:32), que sobrevive a
 *    la animación de salida. Sin esto, el `router.refresh()` de abajo llega a
 *    unos campos todavía vivos y los inputs no controlados avisan de que su
 *    `defaultValue` cambió.
 * 3. `try/catch` alrededor de la acción. Si algo falla y no se recoge, la
 *    promesa se rechaza dentro de la transición y el modal se queda mudo,
 *    como si no hubiera pasado nada. El `redirect()` de sesión vencida se
 *    deja pasar: es una navegación, no un fallo.
 *
 * LOS DOS MODOS ABIERTOS SON UN SOLO MODAL, no dos. Es el mismo patrón que
 * `DialogoMaterial`, con la máquina de estados importada de
 * `core/fila-clicable.tsx` — no copiada: pasar de "viendo" a "editando" (el
 * botón "Editar" de la vista) solo cambia lo que se pinta dentro, sin cerrar
 * ni volver a abrir.
 */
export function DialogoPersona({
  guardarAction,
  disparador,
  control: controlExterno,
  persona,
  edad,
}: Props) {
  const router = useRouter();
  // El hook se llama siempre (no puede ser condicional) y se descarta cuando
  // el control viene de fuera: cuesta un `useState` sin usar y evita tener
  // dos caminos distintos según quién monte el modal.
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
          "[Personal] fallo inesperado al guardar desde el modal",
          error,
        );
        setEstado({ mensaje: "No se pudo guardar. Intenta de nuevo." });
        return;
      }

      if (!resultado.ok) {
        // El modal se queda abierto con lo que el usuario escribió: los campos
        // son no controlados, así que el navegador conserva los valores.
        setEstado(resultado);
        return;
      }

      control.cambiar("cerrado");
      setEstado(estadoFormularioInicial);
      toast.success(
        persona
          ? `${persona.nombre} ${persona.apellido}: cambios guardados.`
          : "Persona registrada.",
      );
      router.refresh();
    });
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(siguiente) => {
        // Cerrar por cualquier vía (Cancelar, Escape, clic fuera) vuelve a
        // "cerrado" sin recordar en qué modo estaba: el próximo clic en la
        // fila tiene que abrir la vista otra vez, no la edición de antes.
        // Abrir desde el disparador propio es siempre el alta, que solo tiene
        // sentido en edición.
        control.cambiar(siguiente ? "editando" : "cerrado");
        if (!siguiente) setEstado(estadoFormularioInicial);
      }}
    >
      {disparador ? <DialogTrigger render={disparador} /> : null}

      {/* `data-closed:animate-none duration-0` anula la animación de salida
          que trae components/ui/dialog.tsx, solo aquí: como los campos se
          desmontan al cerrar y el contenedor es `flex-1`, con animación se
          veía el modal colapsar vacío mientras se desvanecía. El Dialog
          genérico conserva la suya — otros usos no cambian de tamaño al
          cerrarse. La animación de ENTRADA no se toca. */}
      <DialogContent className="flex max-h-[85svh] flex-col data-closed:animate-none duration-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {persona
              ? editando
                ? "Editar persona"
                : "Detalle de la persona"
              : "Nueva persona"}
          </DialogTitle>
          <DialogDescription>
            {persona
              ? `${persona.nombre} ${persona.apellido} · DNI ${persona.dni}`
              : "La edad se calcula sola a partir de la fecha de nacimiento."}
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

        {/* `-mx-4 px-4`: el contenedor llega al borde real del Dialog (que
            tiene `p-4`) y recupera el margen por dentro, para que la barra
            de scroll quede al ras y el anillo de foco no se corte contra el
            recorte. `py-1` hace lo mismo arriba y abajo. */}
        {editando || !persona ? (
          <form action={alEnviar} className="flex min-h-0 flex-1 flex-col gap-4">
            {persona ? (
              <input type="hidden" name="id" value={persona.id} />
            ) : null}

            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {abierto ? (
                <CamposPersona
                  persona={persona}
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
                {enviando
                  ? "Guardando…"
                  : persona
                    ? "Guardar cambios"
                    : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {abierto ? <VistaPersona persona={persona} edad={edad} /> : null}
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cerrar
              </DialogClose>
              {/* El atajo de siempre —el botón Editar de la fila— sigue
                  existiendo; esto es el mismo salto a edición para quien
                  llegó mirando. */}
              <Button type="button" onClick={() => control.cambiar("editando")}>
                Editar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
