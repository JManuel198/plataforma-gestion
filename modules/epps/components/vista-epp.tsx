import { formatearMonto } from "@/core/dinero";
import { Dato, ListaDatos } from "@/core/vista-detalle";
import type { FilaEpp } from "../queries";

/**
 * Un EPP en solo lectura, para el modo "viendo" del modal.
 *
 * Enseña los mismos campos que el formulario y en el mismo orden, más la fecha
 * de creación, que la pone la base de datos.
 *
 * NO HAY DATO "SITUACIÓN", igual que en `VistaServicio` y a diferencia de
 * `VistaMaterial`, `VistaListaPrecio` y `VistaTarifa`: esta tabla no tiene
 * columna `activo`, así que no hay nada que enseñar ahí. Un chip "En el
 * catálogo" fijo sería peor que nada — sugeriría que existe un estado contrario
 * que aquí no existe. Ver la ficha de EPPs en docs/spec/entidades.md.
 *
 * Sin `"use client"` a propósito: es marcado y nada más. Lo monta el modal, que
 * sí es cliente, así que acaba en el bundle igual — pero mantenerlo como
 * componente neutro deja la puerta abierta a reusarlo desde una pantalla
 * servidor si algún día EPPs tiene una.
 */
export function VistaEpp({
  epp,
  fechaCreacion,
}: {
  epp: FilaEpp;
  /** `created_at` ya formateada en el servidor. Ver `fila-epp.tsx`. */
  fechaCreacion: string;
}) {
  return (
    <ListaDatos>
      <Dato etiqueta="Código" valor={epp.codigo} />
      <Dato etiqueta="Unidad" valor={epp.unidad} />
      <Dato
        etiqueta="Descripción"
        valor={epp.descripcion}
        className="sm:col-span-2"
      />
      {/* Las dos columnas admiten NULL, y el precio no se puede enseñar sin su
          moneda: `formatearMonto` necesita las dos para poner el símbolo
          correcto. Si falta cualquiera de ellas se pinta el guion de "no
          tiene", nunca un número sin moneda — que se leería como soles por
          defecto y podría no serlo. */}
      <Dato etiqueta="Precio">
        {epp.precio !== null && epp.moneda !== null
          ? formatearMonto(epp.precio, epp.moneda)
          : "—"}
      </Dato>
      <Dato etiqueta="Moneda" valor={epp.moneda} />
      <Dato etiqueta="Fecha de creación" valor={fechaCreacion} />
    </ListaDatos>
  );
}
