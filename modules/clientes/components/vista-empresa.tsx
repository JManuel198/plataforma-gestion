import { BadgeSituacion } from "@/core/components/badge-situacion";
import { Dato, ListaDatos } from "@/core/vista-detalle";
import { nombrePais } from "../paises";
import type { FilaEmpresa } from "../queries";
import { BadgeTipo } from "./badge-tipo";

/**
 * Una empresa en solo lectura, para el modo "viendo" del modal.
 *
 * Enseña los mismos campos que el formulario (`campos-empresa.tsx`) y en el
 * mismo orden, más la situación activa/inactiva que el formulario no edita.
 *
 * `estado` y `condicion` se pintan como texto y NO como badge: son datos
 * externos de SUNAT, informativos, y un color los haría parecer una decisión
 * del sistema (ver el encabezado de db/schema/empresas.ts). La situación
 * propia sí lleva el mismo `BadgeSituacion` de siempre.
 *
 * Sin `"use client"`: es marcado y nada más.
 */
export function VistaEmpresa({ empresa }: { empresa: FilaEmpresa }) {
  return (
    <ListaDatos>
      <Dato
        etiqueta="Razón social"
        valor={empresa.razon_social}
        className="sm:col-span-2"
      />
      <Dato etiqueta="Nombre comercial" valor={empresa.nombre_comercial} />
      <Dato etiqueta="Nombre corto" valor={empresa.nombre_corto} />
      <Dato etiqueta="RUC" valor={empresa.ruc} className="sm:col-span-2" />
      <Dato etiqueta="Código interno" valor={empresa.codigo} />
      <Dato etiqueta="Tipo">
        <BadgeTipo tipo={empresa.tipo} />
      </Dato>
      <Dato
        etiqueta="Tipo de contribuyente"
        valor={empresa.tipo_contribuyente}
      />
      <Dato etiqueta="Descripción del rubro" valor={empresa.descripcion_rubro} />
      <Dato etiqueta="Estado (SUNAT)" valor={empresa.estado} />
      <Dato etiqueta="Condición (SUNAT)" valor={empresa.condicion} />
      <Dato
        etiqueta="Dirección"
        valor={empresa.direccion}
        className="sm:col-span-2"
      />
      <Dato etiqueta="Distrito" valor={empresa.distrito} />
      <Dato etiqueta="Provincia" valor={empresa.provincia} />
      <Dato etiqueta="Departamento" valor={empresa.departamento} />
      {/* El nombre del país, sacado de la misma lista del combobox; se guarda
          el código ISO. */}
      <Dato etiqueta="País" valor={nombrePais(empresa.pais)} />

      {/* Mismo badge que usan los demás módulos con baja lógica. */}
      <Dato etiqueta="Situación">
        <BadgeSituacion activo={empresa.activo} etiquetaInactivo="Inactiva" />
      </Dato>
    </ListaDatos>
  );
}
