import { BadgeSituacion } from "@/core/components/badge-situacion";
import { Dato, ListaDatos } from "@/core/vista-detalle";
import type { FilaContacto } from "../queries";

/**
 * Un contacto en solo lectura, para el modo "viendo" del modal.
 *
 * Enseña los mismos campos que el formulario (`campos-contacto.tsx`) y en el
 * mismo orden, más la situación activa/inactiva que el formulario no edita.
 *
 * La empresa se pinta con su RUC, los dos de la fila del listado: no hace
 * falta un segundo viaje al servidor (`obtenerContacto`) para abrir la vista.
 *
 * Sin `"use client"`: es marcado y nada más.
 */
export function VistaContacto({ contacto }: { contacto: FilaContacto }) {
  return (
    <ListaDatos>
      <Dato etiqueta="Empresa">
        {/* Mismo criterio que la tabla y el selector: la empresa de baja se
            marca, el contacto sigue asociado a ella. */}
        <span className="flex flex-wrap items-center gap-2">
          {contacto.empresa_razon_social}
          {contacto.empresa_activo ? null : (
            <BadgeSituacion activo={false} etiquetaInactivo="Inactiva" />
          )}
        </span>
      </Dato>
      <Dato etiqueta="RUC de la empresa" valor={contacto.empresa_ruc} />
      <Dato
        etiqueta="Nombre"
        valor={contacto.nombre}
        className="sm:col-span-2"
      />
      <Dato etiqueta="Cargo" valor={contacto.cargo} className="sm:col-span-2" />
      <Dato etiqueta="Correo corporativo" valor={contacto.correo} />
      <Dato etiqueta="Celular / Teléfono" valor={contacto.celular} />

      {/* Mismo badge que usan los demás módulos con baja lógica. */}
      <Dato etiqueta="Situación">
        <BadgeSituacion activo={contacto.activo} />
      </Dato>
    </ListaDatos>
  );
}
