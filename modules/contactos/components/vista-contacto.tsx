import { BadgeSituacion } from "@/core/components/badge-situacion";
import { Dato, ListaDatos } from "@/core/vista-detalle";
import type { FilaContacto } from "../queries";

/**
 * Un contacto en solo lectura, para el modo "viendo" del modal.
 *
 * Enseña los campos del contacto más la situación activa/inactiva, que el
 * formulario no edita. Cuando llegue el formulario (Parte 4), el orden de aquí
 * tiene que seguir al suyo.
 *
 * La empresa se pinta con su RUC, los dos de la fila del listado: no hace
 * falta un segundo viaje al servidor (`obtenerContacto`) para abrir la vista.
 *
 * Sin `"use client"`: es marcado y nada más.
 */
export function VistaContacto({ contacto }: { contacto: FilaContacto }) {
  return (
    <ListaDatos>
      <Dato
        etiqueta="Nombre"
        valor={contacto.nombre}
        className="sm:col-span-2"
      />
      <Dato etiqueta="Cargo" valor={contacto.cargo} />
      <Dato etiqueta="Empresa" valor={contacto.empresa_razon_social} />
      <Dato etiqueta="RUC de la empresa" valor={contacto.empresa_ruc} />
      <Dato etiqueta="Email" valor={contacto.correo} />
      <Dato etiqueta="Celular" valor={contacto.celular} />

      {/* Mismo badge que usan los demás módulos con baja lógica. */}
      <Dato etiqueta="Situación">
        <BadgeSituacion activo={contacto.activo} />
      </Dato>
    </ListaDatos>
  );
}
