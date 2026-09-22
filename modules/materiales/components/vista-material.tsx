import { Badge } from "@/components/ui/badge";
import { Dato, ListaDatos } from "@/core/vista-detalle";
import type { MaterialEditable } from "../tipos";

/**
 * Un material en solo lectura, para el modo "viendo" del modal.
 *
 * Enseña las mismas columnas que el formulario y en el mismo orden, más dos
 * que el formulario no edita: la situación (activo/inactivo), porque la baja
 * es una acción de la fila y no un campo, y la fecha de creación, que la pone
 * la base de datos.
 *
 * Sin `"use client"` a propósito: es marcado y nada más. Lo monta el modal,
 * que sí es cliente, así que acaba en el bundle igual — pero mantenerlo como
 * componente neutro deja la puerta abierta a reusarlo desde una pantalla
 * servidor si algún día Materiales tiene una.
 */
export function VistaMaterial({
  material,
  fechaCreacion,
}: {
  material: MaterialEditable;
  /** `created_at` ya formateada en el servidor. Ver `fila-material.tsx`. */
  fechaCreacion: string;
}) {
  return (
    <ListaDatos>
      <Dato etiqueta="Código interno" valor={material.codigo_interno} />
      <Dato etiqueta="Unidad" valor={material.unidad} />
      <Dato
        etiqueta="Descripción"
        valor={material.descripcion}
        className="sm:col-span-2"
      />
      <Dato etiqueta="Marca" valor={material.marca} />
      <Dato etiqueta="Modelo" valor={material.modelo} />
      <Dato etiqueta="Código de fábrica" valor={material.codigo_fabrica} />
      {/* La fecha de creación del registro, la misma que pinta la tabla.
          Sustituye a `fecha_activacion`, que se eliminó del esquema: aquella
          era un dato de negocio que el usuario escribía; esta la pone la base
          con su `DEFAULT now()`. */}
      <Dato etiqueta="Fecha de creación" valor={fechaCreacion} />
      {/* Texto simple: ni campos, ni fantasmas, ni botones de quitar — eso es
          del formulario. Va en un solo `Dato` con una lista dentro, y no un
          `Dato` por característica, para que el `<dl>` siga teniendo una
          etiqueta por dato: "Características técnicas" es UN dato que resulta
          tener varias líneas, no tres datos sin nombre propio.
          Sin ninguna, `oVacio` pinta el guion de "no tiene" como en el resto
          de los campos. */}
      <Dato etiqueta="Características técnicas" className="sm:col-span-2">
        {material.caracteristicas.length > 0 ? (
          <ul className="list-inside list-disc space-y-1">
            {material.caracteristicas.map((texto, indice) => (
              <li key={indice}>{texto}</li>
            ))}
          </ul>
        ) : (
          "—"
        )}
      </Dato>
      {/* El "Inactivo" va en `secondary`, la misma variante con la que lo
          marca la tabla: es el mismo dato y no debe verse de dos maneras.
          El activo no lleva chip en la tabla —no hace falta marcar lo
          normal—, pero aquí sí, porque una etiqueta "Situación" sin valor
          se leería como un dato que falta. */}
      <Dato etiqueta="Situación">
        <Badge variant={material.activo ? "outline" : "secondary"}>
          {material.activo ? "En el catálogo" : "Inactivo"}
        </Badge>
      </Dato>
    </ListaDatos>
  );
}
