"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PersonaEditable } from "../tipos";
import { MensajeError } from "@/core/components/mensaje-error";

type Props = {
  /** Errores por campo que devolvió el servidor, ya aplanados con Zod. */
  errores: Record<string, string[] | undefined>;
  /** Persona existente: se está editando. */
  persona?: PersonaEditable;
};

/**
 * Los campos de una persona, sin `<form>` ni botones alrededor.
 *
 * Vive aparte del modal por el mismo motivo que `CamposOrdenTrabajo`: lo que
 * cambia entre un envoltorio y otro es cómo se envía y a dónde se va después,
 * nunca los campos. Hoy solo lo monta el modal; mañana, si Personal necesita
 * una pantalla propia para enlazarse por URL, la reutiliza tal cual.
 *
 * `edad` NO es un campo y no puede serlo: se calcula al mostrarla desde
 * `fecha_nacimiento` (ver `calcularEdad` en lib/fecha.ts). Pedirla al usuario
 * sería pedir dos veces el mismo dato y garantizar que se contradigan.
 *
 * `activo` tampoco está: la baja es una acción confirmada del listado, no una
 * casilla que se marque sin querer mientras se corrige un apellido.
 */
export function CamposPersona({ persona, errores }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          name="nombre"
          defaultValue={persona?.nombre ?? ""}
          required
          aria-invalid={Boolean(errores.nombre)}
        />
        <MensajeError errores={errores.nombre} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="apellido">Apellido</Label>
        <Input
          id="apellido"
          name="apellido"
          defaultValue={persona?.apellido ?? ""}
          required
          aria-invalid={Boolean(errores.apellido)}
        />
        <MensajeError errores={errores.apellido} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dni">DNI</Label>
        {/* `inputMode="numeric"` abre el teclado numérico en móvil, pero el
            campo sigue siendo texto: un DNI puede empezar por cero y no es
            una cantidad. La comprobación real de los ocho dígitos está en el
            servidor (`dniSchema`), como cualquier otra. */}
        <Input
          id="dni"
          name="dni"
          inputMode="numeric"
          maxLength={8}
          defaultValue={persona?.dni ?? ""}
          placeholder="8 dígitos"
          required
          aria-invalid={Boolean(errores.dni)}
        />
        <MensajeError errores={errores.dni} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
        {/* La columna es `date` (no `timestamp`), así que lo que este input
            produce —`YYYY-MM-DD`— es literalmente lo que se guarda, sin pasar
            por ninguna conversión de zona horaria. */}
        <Input
          id="fecha_nacimiento"
          name="fecha_nacimiento"
          type="date"
          defaultValue={persona?.fecha_nacimiento ?? ""}
          required
          aria-invalid={Boolean(errores.fecha_nacimiento)}
        />
        <MensajeError errores={errores.fecha_nacimiento} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="cargo">Cargo</Label>
        <Input
          id="cargo"
          name="cargo"
          defaultValue={persona?.cargo ?? ""}
          placeholder="Ingresa el cargo (ej. Técnico electricista)"
          required
          aria-invalid={Boolean(errores.cargo)}
        />
        <MensajeError errores={errores.cargo} />
      </div>
    </div>
  );
}
