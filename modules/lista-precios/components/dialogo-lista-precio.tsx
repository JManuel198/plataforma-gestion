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
import { ChipCodigo } from "@/core/components/chip-codigo";
import { useControlDetalle, type ControlDetalle } from "@/core/fila-clicable";
import { CamposListaPrecio } from "./campos-lista-precio";
import { VistaListaPrecio } from "./vista-lista-precio";
import type { MaterialElegible, PrecioEditable } from "../tipos";

type Props = {
  /** Server Action que guarda. Devuelve el resultado, nunca redirige. */
  guardarAction: (formData: FormData) => Promise<EstadoFormulario>;
  /** Server Action que busca materiales para el selector. */
  buscarMaterialAction: (texto: string) => Promise<MaterialElegible[]>;
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
  /** Oferta existente: se está viendo o editando. */
  precio?: PrecioEditable;
  /**
   * `updated_at` ya formateada, para el modo "viendo". Viene de fuera porque se
   * resuelve en el servidor con la zona del negocio (ver `fila-lista-precio.tsx`).
   * Solo la trae la fila; el alta desde la cabecera no pasa por la vista.
   */
  fechaActualizacion?: string;
  /** `created_at` ya formateada, por lo mismo que `fechaActualizacion`. */
  fechaCreacion?: string;
};

/**
 * Alta o edición de una oferta sin salir del listado.
 *
 * Mismo patrón que `DialogoMaterial`, `DialogoPersona` y `DialogoOrdenTrabajo`,
 * con las tres cosas que allí costó descubrir ya incorporadas. No las quites sin
 * leer por qué están:
 *
 * 1. `useTransition` y no `useActionState`. El resultado tiene que mover la
 *    interfaz (cerrar, avisar, refrescar), y con `useActionState` habría que
 *    reaccionar a él en un `useEffect` con `setState` dentro — justo lo que el
 *    lint rechaza (`react-hooks/set-state-in-effect`).
 * 2. Render condicional explícito de los campos (`{abierto ? … : null}`).
 *    Base UI NO desmonta a los hijos cuando `open` pasa a false: el portal se
 *    monta según `mounted` (dialog/portal/DialogPortal.js:32), que sobrevive a
 *    la animación de salida. Sin esto, el `router.refresh()` de abajo llega a
 *    unos campos todavía vivos y los inputs no controlados avisan de que su
 *    `defaultValue` cambió.
 *    Aquí importa además por una razón propia: `CamposListaPrecio` guarda en
 *    estado el material elegido. Si no se desmontara, reabrir el modal para
 *    crear otra oferta empezaría con el material de la anterior ya puesto.
 * 3. `try/catch` alrededor de la acción. Si algo falla y no se recoge, la
 *    promesa se rechaza dentro de la transición y el modal se queda mudo, como
 *    si no hubiera pasado nada. El `redirect()` de sesión vencida se deja pasar:
 *    es una navegación, no un fallo.
 */
export function DialogoListaPrecio({
  guardarAction,
  buscarMaterialAction,
  disparador,
  control: controlExterno,
  precio,
  fechaActualizacion,
  fechaCreacion,
}: Props) {
  const router = useRouter();
  // El hook se llama siempre (no puede ser condicional) y se descarta cuando el
  // control viene de fuera: cuesta un `useState` sin usar y evita dos caminos
  // distintos según quién monte el modal. Mismo criterio que `DialogoMaterial`.
  const controlPropio = useControlDetalle();
  const control = controlExterno ?? controlPropio;
  const abierto = control.modo !== "cerrado";
  const editando = control.modo === "editando";
  const [estado, setEstado] = useState<EstadoFormulario>(
    estadoFormularioInicial,
  );
  const [enviando, iniciarGuardado] = useTransition();
  // Solo importa en el alta: decide la descripción de la cabecera (en qué paso
  // está) y si «Registrar» se puede pulsar. Al editar el material ya viene
  // elegido. Lo avisa `CamposListaPrecio`, que es quien tiene el buscador.
  const [materialElegido, setMaterialElegido] = useState(false);

  // La columna admite NULL, así que no se puede interpolar a pelo: pintaría
  // literalmente "null" en el subtítulo. Mismo criterio que `DialogoMaterial`.
  const descripcion =
    precio?.material_descripcion?.trim() || "Sin descripción";

  function alEnviar(formData: FormData) {
    iniciarGuardado(async () => {
      let resultado: EstadoFormulario;

      try {
        resultado = await guardarAction(formData);
      } catch (error) {
        if (esRedireccionDeNext(error)) throw error;

        console.error(
          "[Lista de precios] fallo inesperado al guardar desde el modal",
          error,
        );
        setEstado({ mensaje: "No se pudo guardar. Intenta de nuevo." });
        return;
      }

      if (!resultado.ok) {
        // El modal se queda abierto con lo que el usuario escribió. Eso solo es
        // cierto porque el formulario se envía con `onSubmit` y no con
        // `action` (ver el `<form>` de abajo).
        setEstado(resultado);
        return;
      }

      control.cambiar("cerrado");
      setEstado(estadoFormularioInicial);
      setMaterialElegido(false);
      toast.success(
        precio ? `${precio.codigo_oferta}: cambios guardados.` : "Oferta registrada.",
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
        control.cambiar(siguiente ? "editando" : "cerrado");
        if (!siguiente) {
          setEstado(estadoFormularioInicial);
          setMaterialElegido(false);
        }
      }}
    >
      {disparador ? <DialogTrigger render={disparador} /> : null}

      {/* `data-closed:animate-none duration-0` anula la animación de salida
          que trae components/ui/dialog.tsx, solo aquí: como los campos se
          desmontan al cerrar y el contenedor es `flex-1`, con animación se
          veía el modal colapsar vacío mientras se desvanecía. La animación de
          ENTRADA no se toca. */}
      <DialogContent className="flex max-h-[85svh] flex-col data-closed:animate-none duration-0 sm:max-w-lg">
        {/* La cabecera cambia con el modo, como en el mockup de docs/diseno/:
            - viendo: el código como etiqueta, el material como título y el
              proveedor como subtítulo — lo que identifica a la oferta;
            - editando: el código y "Editar oferta de precio";
            - alta: "Nueva oferta de precio" y una descripción que dice en qué
              paso se está (primero el material, después el resto). */}
        <DialogHeader>
          {precio ? <ChipCodigo codigo={precio.codigo_oferta} /> : null}
          <DialogTitle>
            {precio
              ? editando
                ? "Editar oferta de precio"
                : descripcion
              : "Nueva oferta de precio"}
          </DialogTitle>
          <DialogDescription className={precio && editando ? "sr-only" : undefined}>
            {precio
              ? editando
                ? `${precio.codigo_oferta} · ${descripcion}`
                : precio.proveedor?.trim() || "Sin proveedor"
              : materialElegido
                ? "Completa los datos de la oferta para el material elegido."
                : "Busca y elige el material al que corresponde esta oferta."}
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
            tiene `p-4`) y recupera el margen por dentro, para que la barra de
            scroll quede al ras y el anillo de foco no se corte. */}
        {editando || !precio ? (
          // `onSubmit` + `preventDefault`, NO `<form action={alEnviar}>`. Con
          // `action`, React 19 restablece los campos no controlados al terminar
          // la acción, también cuando el servidor devuelve errores: el usuario
          // perdía lo que había escrito justo cuando tenía que corregirlo, y la
          // vista previa del precio (estado propio) se quedaba calculando con
          // un valor que ya no estaba en el campo. Se vio al probar el estado de
          // error del mockup. Aquí el `FormData` se arma a mano y el formulario
          // no se toca.
          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              alEnviar(new FormData(evento.currentTarget));
            }}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            {precio ? (
              <input type="hidden" name="id" value={precio.id} />
            ) : null}

            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {abierto ? (
                <CamposListaPrecio
                  precio={precio}
                  errores={estado.errores ?? {}}
                  buscarMaterialAction={buscarMaterialAction}
                  alCambiarMaterial={setMaterialElegido}
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
              {/* En el alta, «Registrar» espera a que haya material: sin él no
                  hay oferta posible, y el servidor solo podría devolver el
                  error. */}
              <Button
                type="submit"
                disabled={enviando || (!precio && !materialElegido)}
              >
                {enviando ? "Guardando…" : precio ? "Guardar" : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 py-1">
              {abierto ? (
                <VistaListaPrecio
                  precio={precio}
                  fechaActualizacion={fechaActualizacion ?? "—"}
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
