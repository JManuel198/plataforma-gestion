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
import { useControlDetalle, type ControlDetalle } from "@/core/fila-clicable";
import { CamposOrdenTrabajo } from "./campos-orden-trabajo";
import { VistaOrdenTrabajo } from "./vista-orden-trabajo";
import {
  estadoFormularioInicial,
  type EstadoFormulario,
} from "@/core/estado-formulario";
import type { OrdenTrabajoEditable } from "../tipos";

type Props = {
  /**
   * Variante de la Server Action que NO redirige: devuelve `{ ok: true }` en
   * vez de terminar en `redirect()`. Es lo que permite cerrar el modal y
   * quedarse en el listado; la versión que redirige sigue existiendo para las
   * pantallas /nueva y /[id]/editar.
   */
  guardarAction: (formData: FormData) => Promise<EstadoFormulario>;
  /**
   * El control que abre el modal. Solo lo trae el alta desde la cabecera, que
   * vive en un Server Component y no puede pasar un `control`.
   */
  disparador?: ReactElement;
  /**
   * Los tres modos, cuando manda quien monta el modal. Lo pasa la fila, que
   * tiene dos disparadores para un mismo modal: el clic en la fila lo abre en
   * "viendo" y el lápiz en "editando". Sin esto el modal lleva su propio
   * estado y solo conoce dos modos (cerrado y editando).
   */
  control?: ControlDetalle;
} & (
  | {
      orden: OrdenTrabajoEditable;
      fechaHoy?: never;
      /**
       * El precio y la fecha ya formateados, para el modo "viendo". Vienen de
       * fuera porque los dos se resuelven en el servidor — la zona horaria del
       * negocio y `Intl.NumberFormat`; el porqué está en
       * `vista-orden-trabajo.tsx`.
       *
       * Obligatorios cuando hay `orden`, y no opcionales con un "—" de
       * repuesto: toda OT existente tiene precio y fecha, así que un hueco
       * aquí sería un olvido de quien monta el modal, no un dato que falta.
       * Que lo cace el compilador es más barato que descubrirlo mirando la
       * pantalla.
       */
      precio: string;
      fechaCreacion: string;
    }
  | {
      orden?: undefined;
      fechaHoy: string;
      precio?: never;
      fechaCreacion?: never;
    }
);

/**
 * Crear, consultar o editar una OT sin salir del listado.
 *
 * LOS DOS MODOS ABIERTOS SON UN SOLO MODAL, no dos. Es el mismo patrón que
 * `DialogoMaterial` y `DialogoPersona`, con la máquina de estados importada de
 * `core/fila-clicable.tsx` — no copiada: pasar de "viendo" a "editando" (el
 * botón "Editar" de la vista) solo cambia lo que se pinta dentro, sin cerrar
 * ni volver a abrir, así que no hay parpadeo ni foco perdido por el camino.
 *
 * POR QUÉ NO USA `useActionState`, que es el patrón estándar del proyecto:
 * aquí el resultado tiene que mover la interfaz (cerrar el modal, lanzar el
 * toast, refrescar la tabla), y `useActionState` solo deja leer el estado ya
 * renderizado. Reaccionar a él exigiría un `useEffect` con `setState` dentro,
 * que es justo lo que el lint rechaza (`react-hooks/set-state-in-effect`, el
 * mismo error que salió en hooks/use-mobile.ts). Con `useTransition` el
 * resultado se maneja donde se produce.
 *
 * Es el mismo patrón que `selector-estado-fila.tsx` —transición, toast,
 * `router.refresh()`— por la misma razón: una acción que termina en el propio
 * listado, no en otra pantalla.
 *
 * Los campos se montan y desmontan con `abierto`, mediante un render
 * condicional explícito. Base UI no lo hace por su cuenta —los hijos del
 * Dialog sobreviven a la animación de salida, ver el comentario junto a ese
 * render— así que "se desmonta al cerrar" es algo que este componente impone,
 * no algo que herede. De ahí que cada apertura arranque con los campos y los
 * errores limpios.
 */
export function DialogoOrdenTrabajo({
  guardarAction,
  disparador,
  control: controlExterno,
  orden,
  fechaHoy,
  precio,
  fechaCreacion,
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
        // `exigirSesion()` manda a /login con `redirect()`, que llega aquí
        // como error lanzado. No es un fallo: es una navegación, y hay que
        // dejarla subir o el usuario se queda en el modal con un mensaje
        // falso en vez de ir al login.
        if (esRedireccionDeNext(error)) throw error;

        // Cualquier otra cosa —un ETIMEDOUT de Neon, que ya pasó dos veces en
        // este proyecto, o cualquier error del servidor que no se tradujo—
        // llegaba aquí como promesa rechazada que nadie recogía: ni mensaje,
        // ni toast, la ventana quieta como si no hubiera pasado nada. El
        // detalle técnico va al log, no a la pantalla.
        console.error("[OT] fallo inesperado al guardar desde el modal", error);
        setEstado({ mensaje: "No se pudo guardar. Intenta de nuevo." });
        return;
      }

      if (!resultado.ok) {
        // Errores por campo o mensaje general: el modal se queda abierto con
        // lo que el usuario escribió (los campos son no controlados, así que
        // el navegador conserva los valores) y pinta el error donde toca.
        setEstado(resultado);
        return;
      }

      control.cambiar("cerrado");
      setEstado(estadoFormularioInicial);
      toast.success(
        orden
          ? `${orden.codigo_ot}: cambios guardados.`
          : "Orden de trabajo creada.",
      );
      // La tabla se vuelve a pedir al servidor sin recargar la página, así que
      // los filtros de la URL siguen puestos — que es justo lo que se perdía
      // con el `redirect()` a /ordenes-trabajo pelado.
      router.refresh();
    });
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(siguiente) => {
        // Cerrar por Escape, por el aspa o por el botón Cancelar es lo mismo:
        // soltar lo escrito. No se pide confirmación — nada se ha guardado.
        // Y se vuelve a "cerrado" sin recordar en qué modo estaba: el próximo
        // clic en la fila tiene que abrir la vista otra vez, no la edición de
        // antes. Abrir desde el disparador propio es siempre el alta, que solo
        // tiene sentido en edición.
        control.cambiar(siguiente ? "editando" : "cerrado");
        if (!siguiente) setEstado(estadoFormularioInicial);
      }}
    >
      {disparador ? <DialogTrigger render={disparador} /> : null}

      {/* `sm:max-w-2xl` porque el ancho por defecto del Dialog (`sm:max-w-sm`)
          parte en dos la rejilla de dos columnas del formulario. El alto se
          topa en 85svh y el que scrollea es el bloque de campos, no el modal
          entero: así el pie con Guardar/Cancelar no se va de la vista en una
          pantalla baja.

          SIN ANIMACIÓN DE SALIDA, y solo en este modal. `data-closed:animate-none`
          y `duration-0` pisan el `data-closed:animate-out duration-100` que
          components/ui/dialog.tsx pone por defecto (`cn` resuelve el conflicto
          desde aquí; la animación de ENTRADA no se toca). El motivo es propio
          de este Dialog: sus campos se desmontan al cerrar —atados a `abierto`,
          ver el render condicional de abajo— y el contenedor es `flex-1`, así
          que durante los ~100 ms de desvanecido el modal se veía colapsar
          vacío. Sin animación de salida el cierre es instantáneo y no hay
          nada que ver a medias.

          No se quita del Dialog genérico a propósito: otros usos no cambian de
          tamaño al cerrarse y su animación está bien como está.

          `data-closed:fade-out-0` y `data-closed:zoom-out-95` siguen en la
          cadena (tailwind-merge no reconoce esos grupos de tw-animate-css),
          pero quedan inertes: solo fijan variables que lee el keyframe de
          `animate-out`, que ya no corre. No hace falta pisarlas.

          Efecto secundario bueno: Base UI desmonta a los hijos cuando las
          animaciones terminan (`useAnimationsFinished`, `Promise.all([])` si no
          hay ninguna), así que la ventana en la que los campos seguían vivos
          tras cerrar —la que provocaba el aviso del Select— pasa de ~100 ms a
          prácticamente cero. El render condicional se queda igualmente: es la
          garantía, esto solo la refuerza. */}
      <DialogContent className="flex max-h-[85svh] flex-col data-closed:animate-none duration-0 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {orden
              ? editando
                ? "Editar Orden de Trabajo"
                : "Detalle de la Orden de Trabajo"
              : "Nueva Orden de Trabajo"}
          </DialogTitle>
          <DialogDescription>
            {orden
              ? `${orden.codigo_ot} · ${orden.cliente}`
              : "El número de OT y la fecha se generan solos."}
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

        {/* Formulario o vista de solo lectura: son dos remates del MISMO modal
            abierto, no dos modales. El alta (`!orden`) nunca pasa por la
            vista — no hay nada que consultar todavía. */}
        {editando || !orden ? (
          <form action={alEnviar} className="flex min-h-0 flex-1 flex-col gap-4">
            {orden ? <input type="hidden" name="id" value={orden.id} /> : null}

            {/* `-mx-4 px-4`: el contenedor se estira hasta el borde real del
                Dialog (que tiene `p-4`) y recupera el margen visual por
                dentro. Así la barra de scroll queda al ras del borde en vez
                de flotando a 16px, y el anillo de foco (`ring-3`, 3px por
                fuera del borde) tiene sitio dentro del área de recorte en vez
                de cortarse contra ella. `py-1` es lo mismo para el primer y el
                último campo, que se recortaban por arriba y por abajo. */}
            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {/* Render condicional EXPLÍCITO, no por cortesía del Dialog.
                  Base UI NO desmonta a los hijos cuando `open` pasa a false:
                  `DialogPortal` se monta según `mounted` (DialogPortal.js:32),
                  que es el estado con conciencia de animación de
                  `useTransitionStatus` y sigue en `true` hasta que la animación
                  de salida termina (`useOpenChangeComplete`, DialogPopup.js:51).
                  Con `duration-100` en el popup son ~100 ms en los que estos
                  campos siguen vivos mientras el `router.refresh()` de
                  `alEnviar` trae la fila nueva del servidor. El Select de moneda
                  recibía entonces un `defaultValue` distinto del que capturó al
                  abrirse, y avisaba: "changing the default value state of an
                  uncontrolled Select after being initialized"
                  (@base-ui/utils/useControlled.js:37-42, que lo compara POR
                  VALOR contra el del primer render).
                  Atarlo a `abierto` los desmonta de golpe al cerrar, que es lo
                  que el comentario anterior daba por hecho sin que lo fuera. No
                  se convierten a controlados: sería sincronizar el estado de
                  nueve campos para arreglar un problema de desmontaje. */}
              {abierto ? (
                orden ? (
                  <CamposOrdenTrabajo
                    orden={orden}
                    errores={estado.errores ?? {}}
                  />
                ) : (
                  <CamposOrdenTrabajo
                    fechaHoy={fechaHoy}
                    errores={estado.errores ?? {}}
                  />
                )
              ) : null}
            </div>

            <DialogFooter>
              {/* Cancelar es un `DialogClose`, no un Link: aquí no se navega a
                  ninguna parte, solo se cierra la ventana. */}
              <DialogClose
                render={<Button type="button" variant="outline" />}
                disabled={enviando}
              >
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Guardando…" : orden ? "Guardar cambios" : "Crear OT"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {/* Mismo render condicional que los campos, por la misma razón:
                  Base UI no desmonta a los hijos al cerrar. Aquí no hay
                  `defaultValue` que se queje, pero el criterio es uno solo
                  para todo el modal. */}
              {abierto ? (
                <VistaOrdenTrabajo
                  orden={orden}
                  precio={precio}
                  fechaCreacion={fechaCreacion}
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
