import { Badge } from "@/components/ui/badge";
import { formatearMonto } from "@/core/dinero";
import { Dato, ListaDatos } from "@/core/vista-detalle";
import type { FilaTarifa } from "../queries";

/**
 * Una tarifa en solo lectura, para el modo "viendo" del modal.
 *
 * Enseña los mismos campos que el formulario y en el mismo orden, más la fecha
 * de creación, que la pone la base de datos.
 *
 * EL DATO "SITUACIÓN" ENTRA EN LA PARTE 2, con la acción de inactivar. En la
 * Parte 1 no estaba a propósito: la columna `activo` ya existía, pero nada
 * podía ponerla en `false`, así que un chip que siempre dijera "Activa" habría
 * sugerido un estado contrario que el usuario no podía producir. Ahora sí
 * puede, y las tres piezas del mecanismo —la columna en `columnasListado`, el
 * chip de la fila y este dato— entran juntas. Contrasta con `VistaServicio`,
 * que no lo tiene porque allí la columna no existe.
 *
 * Sin `"use client"` a propósito: es marcado y nada más. Lo monta el modal, que
 * sí es cliente, así que acaba en el bundle igual — pero mantenerlo como
 * componente neutro deja la puerta abierta a reusarlo desde una pantalla
 * servidor si algún día el Tarifario tiene una.
 */
export function VistaTarifa({
  tarifa,
  fechaCreacion,
}: {
  tarifa: FilaTarifa;
  /** `created_at` ya formateada en el servidor. Ver `fila-tarifa.tsx`. */
  fechaCreacion: string;
}) {
  return (
    <ListaDatos>
      <Dato etiqueta="Código" valor={tarifa.codigo} />
      <Dato etiqueta="Cargo" valor={tarifa.cargo} />
      {/* "Unidad" aquí es un PERIODO DE TIEMPO (hora, día, mes, año), no una
          unidad física como en Materiales, Lista de precios y Servicios. Ver
          core/periodos.ts. */}
      <Dato etiqueta="Unidad" valor={tarifa.unidad} />
      {/* Las dos columnas admiten NULL, y el costo no se puede enseñar sin su
          moneda: `formatearMonto` necesita las dos para poner el símbolo
          correcto. Si falta cualquiera de ellas se pinta el guion de "no
          tiene", nunca un número sin moneda — que se leería como soles por
          defecto y podría no serlo.

          Y tampoco dice nada sin la Unidad de arriba: 500.00 por hora y 500.00
          por mes son la misma columna. Por eso los dos datos van seguidos. */}
      <Dato etiqueta="Costo">
        {tarifa.costo !== null && tarifa.moneda !== null
          ? formatearMonto(tarifa.costo, tarifa.moneda)
          : "—"}
      </Dato>
      <Dato etiqueta="Moneda" valor={tarifa.moneda} />
      <Dato etiqueta="Fecha de creación" valor={fechaCreacion} />
      {/* El "Inactivo" va en `secondary`, la misma variante con la que lo marca
          la tabla: es el mismo dato y no debe verse de dos maneras. La activa
          no lleva chip en la tabla —no hace falta marcar lo normal—, pero aquí
          sí, porque una etiqueta "Situación" sin valor se leería como un dato
          que falta. Mismo criterio y mismas variantes que `VistaMaterial`. */}
      <Dato etiqueta="Situación">
        <Badge variant={tarifa.activo ? "outline" : "secondary"}>
          {tarifa.activo ? "En el tarifario" : "Inactivo"}
        </Badge>
      </Dato>
    </ListaDatos>
  );
}
