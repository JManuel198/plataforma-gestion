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
import { CamposTarifa } from "./campos-tarifa";
import { VistaTarifa } from "./vista-tarifa";
import type { FilaTarifa } from "../queries";

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
   * "viendo" y el lápiz en "editando". Sin esto el modal lleva su propio estado
   * y solo conoce dos modos (cerrado y editando).
   */
  control?: ControlDetalle;
  /** Tarifa existente: se está viendo o editando. */
  tarifa?: FilaTarifa;
  /**
   * `created_at` ya formateada, para el modo "viendo". Viene de fuera porque se
   * resuelve en el servidor con la zona del negocio (ver `fila-tarifa.tsx`).
   * Solo la trae la fila; el alta desde la cabecera no pasa por la vista y no
   * tiene fecha que enseñar todavía.
   */
  fechaCreacion?: string;
};

/**
 * Alta, consulta y edición de una tarifa sin salir del listado.
 *
 * Mismo patrón que `DialogoServicio`, `DialogoMaterial`, `DialogoListaPrecio`,
 * `DialogoPersona` y `DialogoOrdenTrabajo`, con las tres cosas que allí costó
 * descubrir ya incorporadas. No las quites sin leer por qué están:
 *
 * 1. `useTransition` y no `useActionState`. El resultado tiene que mover la
 *    interfaz (cerrar, avisar, refrescar), y con `useActionState` habría que
 *    reaccionar a él en un `useEffect` con `setState` dentro — justo lo que el
 *    lint rechaza (`react-hooks/set-state-in-effect`).
 * 2. Render condicional explícito de los campos (`{abierto ? … : null}`). Base
 *    UI NO desmonta a los hijos cuando `open` pasa a false: el portal se monta
 *    según `mounted` (dialog/portal/DialogPortal.js:32), que sobrevive a la
 *    animación de salida. Sin esto, el `router.refresh()` de abajo llega a unos
 *    campos todavía vivos y los inputs no controlados avisan de que su
 *    `defaultValue` cambió.
 *    Aquí hay un motivo EXTRA para que ese desmontaje ocurra: los dos campos
 *    con sugerencias (`CampoConSugerencias` para Cargo y `CampoListaSugerida`
 *    para Unidad) llevan input CONTROLADO y leen su `valorInicial` solo al
 *    montar. Si sobrevivieran al cierre, abrir otra fila enseñaría el texto de
 *    la anterior. El desmontaje es lo que hace correcta esa simplificación —
 *    está anotado en la cabecera de los dos componentes.
 * 3. `try/catch` alrededor de la acción. Si algo falla y no se recoge, la
 *    promesa se rechaza dentro de la transición y el modal se queda mudo, como
 *    si no hubiera pasado nada. El `redirect()` de sesión vencida se deja pasar:
 *    es una navegación, no un fallo.
 *
 * LOS DOS MODOS ABIERTOS SON UN SOLO MODAL, no dos. Pasar de "viendo" a
 * "editando" (el botón "Editar" de la vista) solo cambia lo que se pinta
 * dentro: el diálogo no se cierra ni se vuelve a abrir, así que no hay
 * parpadeo, ni animación de entrada repetida, ni foco que se pierda por el
 * camino. Por eso el estado es un `ModoDetalle` de tres valores y no un
 * booleano `abierto` más otro `editando`, que admitiría la combinación
 * imposible "cerrado pero editando".
 */
export function DialogoTarifa({
  guardarAction,
  disparador,
  control: controlExterno,
  tarifa,
  fechaCreacion,
}: Props) {
  const router = useRouter();
  // Las columnas de negocio admiten NULL en la base, así que no se pueden
  // interpolar a pelo: una fila cargada fuera de este formulario pintaría
  // literalmente "null" en el título y en el toast. Mismo criterio que
  // `oVacio()` en core/vista-detalle.tsx y que el resto de modales.
  const nombre = tarifa?.cargo?.trim() || "Sin cargo";
  const codigo = tarifa?.codigo?.trim() || "Sin código";
  // El hook se llama siempre (no puede ser condicional) y se descarta cuando el
  // control viene de fuera: cuesta un `useState` sin usar y evita tener dos
  // caminos distintos según quién monte el modal.
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
          "[Tarifario] fallo inesperado al guardar desde el modal",
          error,
        );
        setEstado({ mensaje: "No se pudo guardar. Intenta de nuevo." });
        return;
      }

      if (!resultado.ok) {
        // El modal se queda abierto con lo que el usuario escribió: los campos
        // conservan sus valores (los no controlados por el DOM, y los dos de
        // sugerencias por su propio estado, que no se desmonta mientras el
        // modal siga abierto).
        setEstado(resultado);
        return;
      }

      control.cambiar("cerrado");
      setEstado(estadoFormularioInicial);
      toast.success(
        tarifa ? `${nombre}: cambios guardados.` : "Tarifa registrada.",
      );
      router.refresh();
    });
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(siguiente) => {
        // Cerrar por cualquier vía (Cancelar, Escape, clic fuera) vuelve a
        // "cerrado" sin recordar en qué modo estaba: el próximo clic en la fila
        // tiene que abrir la vista otra vez, no la edición de antes. Abrir desde
        // el disparador propio es siempre el alta, que solo tiene sentido en
        // edición.
        control.cambiar(siguiente ? "editando" : "cerrado");
        if (!siguiente) setEstado(estadoFormularioInicial);
      }}
    >
      {disparador ? <DialogTrigger render={disparador} /> : null}

      {/* `data-closed:animate-none duration-0` anula la animación de salida que
          trae components/ui/dialog.tsx, solo aquí: como los campos se desmontan
          al cerrar y el contenedor es `flex-1`, con animación se veía el modal
          colapsar vacío mientras se desvanecía. El Dialog genérico conserva la
          suya. La animación de ENTRADA no se toca. */}
      <DialogContent className="flex max-h-[85svh] flex-col data-closed:animate-none duration-0 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {tarifa
              ? editando
                ? "Editar tarifa"
                : "Detalle de la tarifa"
              : "Nueva tarifa"}
          </DialogTitle>
          <DialogDescription>
            {tarifa
              ? `${codigo} · ${nombre}`
              : "Costo por cargo y periodo, para el tarifario de personal."}
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

        {/* `-mx-4 px-4`: el contenedor llega al borde real del Dialog (que tiene
            `p-4`) y recupera el margen por dentro, para que la barra de scroll
            quede al ras y el anillo de foco no se corte contra el recorte.
            `py-1` hace lo mismo arriba y abajo. */}
        {editando || !tarifa ? (
          <form action={alEnviar} className="flex min-h-0 flex-1 flex-col gap-4">
            {tarifa ? (
              <input type="hidden" name="id" value={tarifa.id} />
            ) : null}

            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {abierto ? (
                <CamposTarifa tarifa={tarifa} errores={estado.errores ?? {}} />
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
                  : tarifa
                    ? "Guardar cambios"
                    : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {abierto ? (
                <VistaTarifa
                  tarifa={tarifa}
                  fechaCreacion={fechaCreacion ?? "—"}
                />
              ) : null}
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cerrar
              </DialogClose>
              {/* El atajo de siempre —el lápiz de la fila— sigue existiendo;
                  esto es el mismo salto a edición para quien llegó mirando. */}
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
