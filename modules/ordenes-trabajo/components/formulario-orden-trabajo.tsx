"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { CamposOrdenTrabajo } from "./campos-orden-trabajo";
import {
  estadoFormularioInicial,
  type EstadoFormulario,
} from "@/core/estado-formulario";
import type { OrdenTrabajoEditable } from "../tipos";

type Props = {
  /**
   * Server Action que guarda el formulario — `crearOrdenTrabajo` o
   * `editarOrdenTrabajo`. Desde la fusión con Servicio las dos tienen la
   * misma firma sin necesidad de `.bind()`: crear una OT ya no depende de
   * ningún id externo. El sufijo `Action` es la convención de Next para las
   * acciones que viajan como prop a un Client Component.
   *
   * Son las variantes que terminan en `redirect()`: esta pantalla se abandona
   * al guardar. El modal del listado usa las que devuelven (ver
   * dialogo-orden-trabajo.tsx).
   */
  guardarAction: (
    estadoPrevio: EstadoFormulario,
    formData: FormData,
  ) => Promise<EstadoFormulario>;
  /** A dónde vuelve el botón Cancelar. */
  urlCancelar: string;
} & (
  | {
      /** OT existente: se está editando. */
      orden: OrdenTrabajoEditable;
      fechaHoy?: never;
    }
  | {
      orden?: undefined;
      /**
       * Hoy en `YYYY-MM-DD`, calculado en el servidor con `hoyIso()`
       * (lib/fecha.ts). Solo existe al crear, y por eso el tipo lo exige
       * justo ahí y lo prohíbe al editar.
       */
      fechaHoy: string;
    }
);

/**
 * El formulario de OT como pantalla propia (/ordenes-trabajo/nueva y
 * /ordenes-trabajo/[id]/editar).
 *
 * Sigue el patrón estándar del proyecto —`useActionState` + Server Action que
 * valida con Zod y termina en `redirect()`— y se mantiene aunque el listado
 * haga ahora lo mismo en un modal: estas dos rutas son la única forma de
 * enlazar a una OT concreta por URL (un enlace que alguien pega en un correo
 * o guarda en favoritos), y el modal no da esa propiedad. Si algún día se
 * retiran, primero hay que decidir si el modal se refleja en la URL
 * (`?editar=<id>`), o esos enlaces dejan de existir sin sustituto.
 *
 * Los campos son exactamente los mismos que los del modal, y por eso viven
 * fuera, en `campos-orden-trabajo.tsx`: aquí solo queda el envoltorio.
 */
export function FormularioOrdenTrabajo({
  guardarAction,
  orden,
  fechaHoy,
  urlCancelar,
}: Props) {
  const [estado, accion, enviando] = useActionState(
    guardarAction,
    estadoFormularioInicial,
  );

  return (
    <form action={accion} className="max-w-2xl space-y-6">
      {orden ? <input type="hidden" name="id" value={orden.id} /> : null}

      {estado.mensaje ? (
        <p
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {estado.mensaje}
        </p>
      ) : null}

      {orden ? (
        <CamposOrdenTrabajo orden={orden} errores={estado.errores ?? {}} />
      ) : (
        <CamposOrdenTrabajo fechaHoy={fechaHoy} errores={estado.errores ?? {}} />
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : orden ? "Guardar cambios" : "Crear OT"}
        </Button>
        <Link
          href={urlCancelar}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
