"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CaracteristicasMaterial } from "./caracteristicas-material";
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
 * TRES COSAS NO SE PIDEN AQUÍ, y las tres a propósito:
 *
 * - `codigo_interno` se enseña pero no se escribe: lo genera el correlativo
 *   del servidor. Ver el comentario de su campo.
 * - `fecha_activacion` YA NO EXISTE: la columna se eliminó del esquema. La
 *   fecha que muestran la tabla y la vista de detalle es `created_at`, que
 *   pone la base con su `DEFAULT now()` y nadie escribe a mano. Por eso este
 *   formulario no tiene ningún campo de fecha.
 * - `activo` no está: la baja es una acción confirmada del listado.
 */
export function CamposMaterial({ material, errores }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="codigo_interno">Código interno</Label>
        {/* NUNCA EDITABLE, ni al crear ni al editar: lo emite el correlativo
            global del servidor (`MAT.0000001`, ver ../codigo.ts). Se enseña
            igualmente porque quien llena la ficha espera ver el código, pero
            no es una decisión suya.

            `disabled` y sin `name`, en los dos modos: así no viaja en el envío.
            Que no viaje es la segunda mitad de la garantía — la primera es que
            `materialCrearSchema` ni siquiera lo declara, de modo que un POST
            directo que lo incluyera tampoco conseguiría imponerlo.

            Al crear no hay número que enseñar todavía: el correlativo se
            reserva dentro de la transacción del INSERT, así que cualquier
            valor que se pintara aquí antes de guardar sería una adivinanza que
            otra alta simultánea dejaría falsa. Mismo criterio, y mismo
            marcador de posición, que `codigo_ot` en Órdenes de Trabajo. */}
        <Input
          id="codigo_interno"
          defaultValue={material?.codigo_interno ?? ""}
          placeholder="Se genera automáticamente al guardar"
          disabled
        />
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

      {/* AL FINAL, después de todos los demás campos, y ocupando las dos
          columnas: es una lista que crece, no un campo más de la rejilla.
          `key` atada a las iniciales para que al pasar de un material a otro
          —o de vista a edición— el editor se remonte con su estado limpio en
          vez de arrastrar las líneas del anterior. */}
      <CaracteristicasMaterial
        key={(material?.caracteristicas ?? []).join("\u0000")}
        iniciales={material?.caracteristicas ?? []}
        errores={errores.caracteristicas}
      />
    </div>
  );
}
