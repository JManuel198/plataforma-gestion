import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import { Dato, ListaDatos } from "@/core/vista-detalle";
import type { PersonaEditable } from "../tipos";

/**
 * Una persona en solo lectura, para el modo "viendo" del modal.
 *
 * Enseña los mismos campos que el formulario y en el mismo orden, más los dos
 * que el formulario no edita: la edad (que no es un campo, ver abajo) y la
 * situación activa/de baja (que se cambia con una acción confirmada del
 * listado, no con una casilla).
 *
 * LA EDAD LLEGA CALCULADA, no se calcula aquí. `calcularEdad` de lib/fecha.ts
 * resuelve el "hoy" en la zona del negocio y es el servidor quien lo hace (ver
 * el comentario de `fila-persona.tsx`): repetir la cuenta en el navegador
 * metería dayjs con sus plugins de zona en el bundle del cliente y abriría la
 * puerta a que el HTML del servidor y el del cliente no coincidieran.
 *
 * Sin `"use client"` a propósito: es marcado y nada más. Lo monta el modal,
 * que sí es cliente, así que acaba en el bundle igual — pero mantenerlo como
 * componente neutro deja la puerta abierta a reusarlo desde una pantalla
 * servidor si algún día Personal tiene una.
 */
export function VistaPersona({
  persona,
  edad,
}: {
  persona: PersonaEditable;
  edad?: number;
}) {
  return (
    <ListaDatos>
      <Dato etiqueta="Nombre" valor={persona.nombre} />
      <Dato etiqueta="Apellido" valor={persona.apellido} />
      <Dato etiqueta="DNI" valor={persona.dni} />
      {/* `fecha_nacimiento` es una columna `date` en modo string: llega como
          `YYYY-MM-DD` literal, sin hora y sin pasar por ninguna conversión de
          zona. Por eso se formatea directo con dayjs, igual que en la tabla de
          Materiales — y a diferencia de la edad, que sí depende de "hoy". */}
      <Dato
        etiqueta="Fecha de nacimiento"
        valor={dayjs(persona.fecha_nacimiento).format("DD/MM/YYYY")}
      />
      <Dato etiqueta="Cargo" valor={persona.cargo} className="sm:col-span-2" />
      <Dato
        etiqueta="Edad"
        valor={edad === undefined ? null : `${edad} años`}
      />
      {/* El "De baja" va en `secondary`, la misma variante con la que lo marca
          la tabla: es el mismo dato y no debe verse de dos maneras. En la
          tabla el activo no lleva chip —no hace falta marcar lo normal—, pero
          aquí sí, porque una etiqueta "Situación" sin valor se leería como un
          dato que falta. */}
      <Dato etiqueta="Situación">
        <Badge variant={persona.activo ? "outline" : "secondary"}>
          {persona.activo ? "Activa" : "De baja"}
        </Badge>
      </Dato>
    </ListaDatos>
  );
}
