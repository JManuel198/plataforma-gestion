"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MaterialEditable } from "../tipos";

type Props = {
  /** Errores por campo que devolvió el servidor, ya aplanados con Zod. */
  errores: Record<string, string[] | undefined>;
  /** Material existente: se está editando. */
  material?: MaterialEditable;
};

function MensajeError({ errores }: { errores?: string[] }) {
  if (!errores?.length) return null;

  return (
    <p className="text-sm text-destructive" role="alert">
      {errores[0]}
    </p>
  );
}

/**
 * Los campos de un material, sin `<form>` ni botones alrededor.
 *
 * Vive aparte del modal por el mismo motivo que `CamposPersona` y
 * `CamposOrdenTrabajo`: lo que cambia entre un envoltorio y otro es cómo se
 * envía y a dónde se va después, nunca los campos. Hoy solo lo monta el
 * modal; si mañana Materiales necesita una pantalla propia enlazable por URL,
 * la reutiliza tal cual.
 *
 * Marca, modelo y código de fábrica NO llevan `required`: un consumible no
 * siempre los tiene (ver `textoOpcional` en ../schema.ts). El resto sí, y
 * ese `required` es solo comodidad de UX — la comprobación que vale está en
 * el servidor, como cualquier otra.
 *
 * `activo` no está: la baja será una acción confirmada del listado (Parte 2).
 */
export function CamposMaterial({ material, errores }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="codigo_interno">Código interno</Label>
        {/* Sin formato impuesto: no está confirmado que el código interno
            siga un patrón. Su UNICIDAD sí está confirmada, y la garantiza el
            UNIQUE de la tabla — no este input ni el Zod: comprobarlo antes
            con un SELECT dejaría una ventana de carrera. Si se repite, el
            choque vuelve traducido desde ../actions.ts y aparece debajo de
            este campo. */}
        <Input
          id="codigo_interno"
          name="codigo_interno"
          defaultValue={material?.codigo_interno ?? ""}
          placeholder="El código que usa la empresa"
          required
          aria-invalid={Boolean(errores.codigo_interno)}
        />
        <MensajeError errores={errores.codigo_interno} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="unidad">Unidad</Label>
        {/* Texto libre y no un Select: no hay catálogo de unidades confirmado.
            Cuando lo haya, esto pasa a ser un Select con su lista en
            constantes.ts, como `MONEDAS` en Órdenes de Trabajo. */}
        <Input
          id="unidad"
          name="unidad"
          defaultValue={material?.unidad ?? ""}
          placeholder="ej. UND, MT, KG"
          required
          aria-invalid={Boolean(errores.unidad)}
        />
        <MensajeError errores={errores.unidad} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="descripcion">Descripción</Label>
        <Input
          id="descripcion"
          name="descripcion"
          defaultValue={material?.descripcion ?? ""}
          placeholder="Ingresa la descripción del material"
          required
          aria-invalid={Boolean(errores.descripcion)}
        />
        <MensajeError errores={errores.descripcion} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="marca">Marca</Label>
        <Input
          id="marca"
          name="marca"
          defaultValue={material?.marca ?? ""}
          placeholder="Opcional"
          aria-invalid={Boolean(errores.marca)}
        />
        <MensajeError errores={errores.marca} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="modelo">Modelo</Label>
        <Input
          id="modelo"
          name="modelo"
          defaultValue={material?.modelo ?? ""}
          placeholder="Opcional"
          aria-invalid={Boolean(errores.modelo)}
        />
        <MensajeError errores={errores.modelo} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="codigo_fabrica">Código de fábrica</Label>
        {/* El del fabricante, distinto del interno de la empresa. */}
        <Input
          id="codigo_fabrica"
          name="codigo_fabrica"
          defaultValue={material?.codigo_fabrica ?? ""}
          placeholder="Opcional"
          aria-invalid={Boolean(errores.codigo_fabrica)}
        />
        <MensajeError errores={errores.codigo_fabrica} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fecha_activacion">Fecha de activación</Label>
        {/* La columna es `date` (no `timestamp`), así que lo que este input
            produce —`YYYY-MM-DD`— es literalmente lo que se guarda, sin pasar
            por ninguna conversión de zona horaria.
            Sin `min` ni `max`: no está confirmado si la activación puede ser
            futura (ver ../schema.ts), y acotarlo aquí asumiría la respuesta. */}
        <Input
          id="fecha_activacion"
          name="fecha_activacion"
          type="date"
          defaultValue={material?.fecha_activacion ?? ""}
          required
          aria-invalid={Boolean(errores.fecha_activacion)}
        />
        <MensajeError errores={errores.fecha_activacion} />
      </div>
    </div>
  );
}
