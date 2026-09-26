"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EstadoFormulario } from "@/core/estado-formulario";
import type { ResultadoAccion } from "@/core/resultado-accion";
import {
  useAccionOportunidad,
  type FalloAccion,
} from "./use-accion-oportunidad";

type Errores = Record<string, string[] | undefined>;

/**
 * El diálogo con formulario de TODAS las acciones del detalle que piden datos
 * (Parte 10): los lápices de título, contacto y fecha, "+ Actividad",
 * "Marcar perdida" y "Anular". Un solo envoltorio para que los seis se
 * comporten igual:
 *
 * - Diálogo y no edición en línea: es el patrón del proyecto para editar, y
 *   aísla bien el error —queda bajo su campo, con lo escrito intacto—.
 * - `onSubmit` + `preventDefault`, nunca `<form action={…}>`: con `action`
 *   React restablecería los campos no controlados al volver un error.
 * - Los campos se montan solo con el diálogo abierto (Base UI NO desmonta a
 *   los hijos al cerrar): cada apertura parte del valor actual.
 * - No se cierra mientras se guarda: el resultado tiene que poder pintarse en
 *   el diálogo que lo pidió.
 * - Un error de campo queda bajo su campo; cualquier otro, arriba (y en un
 *   aviso, con la página ya refrescada: ver `useAccionOportunidad`). "Error
 *   de campo" solo existe en las acciones que devuelven `EstadoFormulario`
 *   (editar y "+ Actividad"). `marcarPerdida` y `anular` devuelven un
 *   `ResultadoAccion`, sin errores por campo —los usa también el diálogo de
 *   la papelera del kanban (Parte 11)—, así que un motivo rechazado sale
 *   arriba, como cualquier otro fallo, y no bajo el textarea. Si el
 *   refresco trae la oportunidad cerrada, el botón que abrió el diálogo deja
 *   de montarse y el diálogo desaparece con él; el aviso explica por qué.
 *
 * `campos` recibe los errores por campo y, para los casos que lo necesitan
 * ("Quitar fecha"), una función que envía un FormData ya armado.
 */
export function DialogoAccion({
  disparador,
  titulo,
  descripcion,
  textoEnviar = "Guardar",
  destructiva = false,
  exito,
  accion,
  sinCambios,
  campos,
}: {
  disparador: (abrir: () => void) => ReactNode;
  titulo: string;
  descripcion?: string;
  textoEnviar?: string;
  destructiva?: boolean;
  /** El texto del aviso de éxito. */
  exito: string;
  /**
   * Solo para los lápices: `true` si lo que trae el formulario es el valor
   * que ya tiene la oportunidad. Entonces el diálogo se cierra sin llamar a
   * la acción ni avisar nada: no hay nada que guardar. Es un atajo de la
   * interfaz, no una regla: si la comparación fallara, la acción tampoco
   * escribe nada cuando el valor no cambia (actions.ts).
   */
  sinCambios?: (formData: FormData) => boolean;
  accion: (formData: FormData) => Promise<ResultadoAccion | EstadoFormulario>;
  campos: (props: {
    errores: Errores;
    enviar: (formData: FormData) => void;
    pendiente: boolean;
  }) => ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const [fallo, setFallo] = useState<FalloAccion | null>(null);
  const { ejecutar, pendiente } = useAccionOportunidad();

  function enviar(formData: FormData) {
    // Base UI deja el diálogo en el DOM mientras se cierra, con los campos ya
    // desmontados: un envío desde ahí iría vacío. Cerrado, no se envía nada.
    if (!abierto) return;
    if (sinCambios?.(formData)) {
      setFallo(null);
      setAbierto(false);
      return;
    }
    setFallo(null);
    ejecutar(() => accion(formData), {
      exito,
      alTerminarBien: () => setAbierto(false),
      alFallar: setFallo,
    });
  }

  return (
    <>
      {/* Cada apertura empieza sin errores: un envío que termina con el
          diálogo ya cerrado (p. ej. un fallo que llega tarde) no debe
          reaparecer la próxima vez que se abra. */}
      {disparador(() => {
        setFallo(null);
        setAbierto(true);
      })}

      <Dialog
        open={abierto}
        onOpenChange={(siguiente) => {
          if (pendiente) return;
          setAbierto(siguiente);
          if (!siguiente) setFallo(null);
        }}
      >
        <DialogContent className="data-closed:animate-none duration-0 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            {descripcion ? (
              <DialogDescription>{descripcion}</DialogDescription>
            ) : null}
          </DialogHeader>

          {fallo && !fallo.errores ? (
            <p
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {fallo.mensaje}
            </p>
          ) : null}

          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              enviar(new FormData(evento.currentTarget));
            }}
            className="flex flex-col gap-4"
          >
            {abierto
              ? campos({ errores: fallo?.errores ?? {}, enviar, pendiente })
              : null}

            <DialogFooter>
              <DialogClose
                render={<Button type="button" variant="outline" />}
                disabled={pendiente}
              >
                Cancelar
              </DialogClose>
              <Button
                type="submit"
                variant={destructiva ? "destructive" : "default"}
                disabled={pendiente}
              >
                {pendiente ? "Guardando…" : textoEnviar}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
