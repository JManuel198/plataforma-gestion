"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { esRedireccionDeNext } from "@/lib/redireccion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MensajeError } from "@/core/components/mensaje-error";
import {
  estadoFormularioInicial,
  type EstadoFormulario,
} from "@/core/estado-formulario";
import type { Perfil } from "../queries";

type Props = {
  /** `actualizarPerfil`: devuelve el resultado, nunca redirige. */
  guardarAction: (formData: FormData) => Promise<EstadoFormulario>;
  perfil: Perfil;
};

/**
 * Edición del perfil propio: nombre, DNI y teléfono.
 *
 * Pantalla propia y no modal, pero con el mecanismo de los modales
 * (`useTransition`, no `useActionState`): al guardar hay que avisar con un
 * toast y quedarse en la misma pantalla, y reaccionar al resultado de
 * `useActionState` obligaría a un `useEffect` con `setState`, que el lint
 * rechaza. Ver `dialogo-persona.tsx`, que es de donde sale.
 *
 * El envío va por `onSubmit`, NUNCA por `action={...}`: con `action`, React 19
 * restablece los campos no controlados al terminar, también cuando el
 * servidor devuelve errores, y se perdería lo escrito.
 *
 * EMAIL: se muestra, no se envía. Va como texto en un `<dl>` fuera del
 * `<form>` —no como input deshabilitado—, así que no hay nada que un usuario
 * pueda "rehabilitar" desde las herramientas del navegador. Aunque lo
 * hiciera, `actualizarPerfil` no lo acepta (su esquema no lo declara y su
 * UPDATE nombra las columnas una a una).
 *
 * No hay contraseña ni rol aquí, a propósito: AGENTS.md, sección "Módulo de
 * ajustes de usuario".
 */
export function FormularioPerfil({ guardarAction, perfil }: Props) {
  const router = useRouter();
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
        // Sesión vencida: `exigirSesion()` redirige a /login. Es una
        // navegación, no un fallo.
        if (esRedireccionDeNext(error)) throw error;

        console.error("[Ajustes de usuario] fallo inesperado al guardar", error);
        setEstado({ mensaje: "No se pudo guardar. Intenta de nuevo." });
        return;
      }

      if (!resultado.ok) {
        setEstado(resultado);
        return;
      }

      setEstado(estadoFormularioInicial);
      toast.success("Perfil actualizado.");
      // Trae el perfil guardado (y el nombre nuevo de la barra lateral). La
      // página remonta este formulario con los valores nuevos: ver el `key`
      // en app/(protegido)/ajustes/page.tsx.
      router.refresh();
    });
  }

  const errores = estado.errores ?? {};

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        alEnviar(new FormData(evento.currentTarget));
      }}
      className="space-y-6"
    >
      {estado.mensaje ? (
        <p
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {estado.mensaje}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nombre">Nombre completo</Label>
          <Input
            id="nombre"
            name="nombre"
            autoComplete="name"
            defaultValue={perfil.nombre}
            required
            aria-invalid={Boolean(errores.nombre)}
          />
          <MensajeError errores={errores.nombre} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dni">DNI</Label>
          {/* Texto con teclado numérico: un DNI puede empezar por cero y no es
              una cantidad. Opcional; en blanco se guarda como vacío (null),
              no como "". La comprobación real está en el servidor. */}
          <Input
            id="dni"
            name="dni"
            inputMode="numeric"
            maxLength={8}
            defaultValue={perfil.dni ?? ""}
            placeholder="8 dígitos"
            aria-invalid={Boolean(errores.dni)}
          />
          <MensajeError errores={errores.dni} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            name="telefono"
            type="tel"
            autoComplete="tel"
            maxLength={25}
            defaultValue={perfil.telefono ?? ""}
            placeholder="Ej. 987 654 321"
            aria-invalid={Boolean(errores.telefono)}
          />
          <MensajeError errores={errores.telefono} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
