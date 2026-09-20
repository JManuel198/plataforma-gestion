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
import { CamposPersona } from "./campos-persona";
import type { PersonaEditable } from "../tipos";

type Props = {
  /** Server Action que guarda. Devuelve el resultado, nunca redirige. */
  guardarAction: (formData: FormData) => Promise<EstadoFormulario>;
  /** El control que abre el modal. Cada sitio trae el suyo. */
  disparador: ReactElement;
  /** Persona existente: se está editando. */
  persona?: PersonaEditable;
};

/**
 * Alta o edición de una persona sin salir del listado.
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
 * 2. Render condicional explícito de los campos (`{abierto ? … : null}`).
 *    Base UI NO desmonta a los hijos cuando `open` pasa a false: el portal se
 *    monta según `mounted` (dialog/portal/DialogPortal.js:32), que sobrevive a
 *    la animación de salida. Sin esto, el `router.refresh()` de abajo llega a
 *    unos campos todavía vivos y los inputs no controlados avisan de que su
 *    `defaultValue` cambió.
 * 3. `try/catch` alrededor de la acción. Si algo falla y no se recoge, la
 *    promesa se rechaza dentro de la transición y el modal se queda mudo,
 *    como si no hubiera pasado nada. El `redirect()` de sesión vencida se
 *    deja pasar: es una navegación, no un fallo.
 */
export function DialogoPersona({
  guardarAction,
  disparador,
  persona,
}: Props) {
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

      setAbierto(false);
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
        setAbierto(siguiente);
        if (!siguiente) setEstado(estadoFormularioInicial);
      }}
    >
      <DialogTrigger render={disparador} />

      {/* `data-closed:animate-none duration-0` anula la animación de salida
          que trae components/ui/dialog.tsx, solo aquí: como los campos se
          desmontan al cerrar y el contenedor es `flex-1`, con animación se
          veía el modal colapsar vacío mientras se desvanecía. El Dialog
          genérico conserva la suya — otros usos no cambian de tamaño al
          cerrarse. La animación de ENTRADA no se toca. */}
      <DialogContent className="flex max-h-[85svh] flex-col data-closed:animate-none duration-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {persona ? "Editar persona" : "Nueva persona"}
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

        <form action={alEnviar} className="flex min-h-0 flex-1 flex-col gap-4">
          {persona ? (
            <input type="hidden" name="id" value={persona.id} />
          ) : null}

          {/* `-mx-4 px-4`: el contenedor llega al borde real del Dialog (que
              tiene `p-4`) y recupera el margen por dentro, para que la barra
              de scroll quede al ras y el anillo de foco no se corte contra el
              recorte. `py-1` hace lo mismo arriba y abajo. */}
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
      </DialogContent>
    </Dialog>
  );
}
