"use client";

import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BuscadorSeleccion } from "@/core/components/buscador-seleccion";
import { MensajeError } from "@/core/components/mensaje-error";
import { listarEmpresasParaSelectorAction } from "../actions";
import type { EmpresaSeleccionable, FilaContacto } from "../queries";

type Props = {
  /** Errores por campo que devolvió el servidor, ya aplanados con Zod. */
  errores: Record<string, string[] | undefined>;
  /** Contacto existente: se está editando. */
  contacto?: FilaContacto;
};

/**
 * Los campos de un contacto, sin `<form>` ni botones alrededor: el modal pone
 * el envoltorio. Mismo reparto que `CamposEmpresa`.
 *
 * LA EMPRESA SE ELIGE CON `BuscadorSeleccion` (core/), no con un combobox de
 * lista fija como el país de Empresas: el valor TIENE que ser una empresa que
 * existe, y la lista vive en la base — cada búsqueda es una consulta
 * (`listarEmpresasParaSelectorAction`, con su pausa de tecleo y su turno, ver
 * `core/components/busqueda-remota.ts`). La acción se importa directa y no
 * llega como prop desde la página, al revés que el material en Lista de
 * precios: la consulta es de ESTE módulo (lee la tabla `empresas`, no código
 * de modules/clientes/).
 *
 * A DIFERENCIA DE MATERIALES, EL SELECTOR OFRECE TAMBIÉN LAS EMPRESAS DADAS DE
 * BAJA, por decisión confirmada (ver la ficha de Contactos en
 * docs/spec/entidades.md): un contacto puede pertenecer a una empresa inactiva
 * y, al editarlo, la suya tiene que poder seguir elegida. Van atenuadas y con
 * el badge «Inactiva» (`inactivoDe`), para que asociar un contacto a una
 * empresa de baja sea siempre una decisión a la vista.
 *
 * El resto son campos no controlados (`name` + `defaultValue`). Sin
 * `required` en nada salvo el nombre, y sin `type="email"` ni `pattern`: la
 * única validación es la del Zod del servidor, que a propósito no exige
 * formato de correo ni de celular.
 */
export function CamposContacto({ errores, contacto }: Props) {
  // La empresa del contacto que se edita, reconstruida desde la fila: trae ya
  // razón social, RUC y si está activa, que es lo que pinta el selector.
  const [empresa, setEmpresa] = useState<EmpresaSeleccionable | null>(
    contacto
      ? {
          id: contacto.empresa_id,
          razon_social: contacto.empresa_razon_social,
          ruc: contacto.empresa_ruc,
          activo: contacto.empresa_activo,
        }
      : null,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <BuscadorSeleccion
          id="empresa"
          name="empresa_id"
          etiqueta="Empresa"
          placeholder="Buscar empresa cliente..."
          buscarAction={listarEmpresasParaSelectorAction}
          claveDe={(encontrada) => encontrada.id}
          principalDe={(encontrada) => encontrada.razon_social}
          // Una empresa extranjera no tiene RUC: se dice, en vez de dejar la
          // línea vacía y que parezca que no cargó.
          secundarioDe={(encontrada) =>
            encontrada.ruc ? `RUC ${encontrada.ruc}` : "Sin RUC"
          }
          inactivoDe={(encontrada) => !encontrada.activo}
          etiquetaInactivo="Inactiva"
          seleccionado={empresa}
          onSeleccionar={setEmpresa}
          invalido={Boolean(errores.empresa_id)}
        />
        {/* Aquí cae también el choque de la FK (`esFkViolada` en
            ../actions.ts): una empresa que dejó de existir entre elegirla y
            guardar. */}
        <MensajeError errores={errores.empresa_id} />
        {empresa && !empresa.activo ? (
          <p className="text-xs text-muted-foreground">
            Esta empresa está dada de baja. El contacto se guardará asociado a
            ella igualmente.
          </p>
        ) : null}
      </div>

      <Campo id="nombre" etiqueta="Nombre" errores={errores} ancho>
        <Input
          id="nombre"
          name="nombre"
          defaultValue={contacto?.nombre ?? ""}
          required
          aria-invalid={Boolean(errores.nombre)}
        />
      </Campo>

      <Campo id="cargo" etiqueta="Cargo" errores={errores} ancho>
        <Input
          id="cargo"
          name="cargo"
          defaultValue={contacto?.cargo ?? ""}
          aria-invalid={Boolean(errores.cargo)}
        />
      </Campo>

      <Campo id="correo" etiqueta="Correo corporativo" errores={errores}>
        {/* `type="text"` y no `email`: el navegador bloquearía el envío con su
            propia validación, y el formato no es regla de este campo. El
            `inputMode` solo pone el teclado de correo en el móvil. */}
        <Input
          id="correo"
          name="correo"
          inputMode="email"
          autoComplete="off"
          defaultValue={contacto?.correo ?? ""}
          aria-invalid={Boolean(errores.correo)}
        />
      </Campo>

      <Campo id="celular" etiqueta="Celular / Teléfono" errores={errores}>
        {/* El placeholder es solo una sugerencia visual: se guarda lo escrito,
            con o sin «+51» (decisión confirmada, sin CHECK ni Zod de
            formato). */}
        <Input
          id="celular"
          name="celular"
          type="tel"
          placeholder="+51 000 000 000"
          defaultValue={contacto?.celular ?? ""}
          aria-invalid={Boolean(errores.celular)}
        />
      </Campo>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  errores,
  ancho = false,
  children,
}: {
  id: string;
  etiqueta: string;
  errores: Record<string, string[] | undefined>;
  /** Ocupa las dos columnas. */
  ancho?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={ancho ? "space-y-2 sm:col-span-2" : "space-y-2"}>
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      <MensajeError errores={errores[id]} />
    </div>
  );
}
