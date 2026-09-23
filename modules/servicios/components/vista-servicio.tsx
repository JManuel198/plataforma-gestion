import { formatearMonto } from "@/core/dinero";
import { Dato, ListaDatos } from "@/core/vista-detalle";
import { capitalizarCategoria } from "../constantes";
import type { FilaServicio } from "../queries";

/**
 * Un servicio en solo lectura, para el modo "viendo" del modal.
 *
 * Enseña los mismos campos que el formulario y en el mismo orden, más la fecha
 * de creación, que la pone la base de datos.
 *
 * NO HAY DATO "SITUACIÓN", a diferencia de `VistaMaterial` y `VistaListaPrecio`:
 * esta tabla no tiene columna `activo`, así que no hay nada que enseñar ahí. Un
 * chip "En el catálogo" fijo sería peor que nada — sugeriría que existe un
 * estado contrario que hoy no existe. Ver la ficha de Servicios en
 * docs/spec/entidades.md.
 *
 * Sin `"use client"` a propósito: es marcado y nada más. Lo monta el modal, que
 * sí es cliente, así que acaba en el bundle igual — pero mantenerlo como
 * componente neutro deja la puerta abierta a reusarlo desde una pantalla
 * servidor si algún día Servicios tiene una.
 */
export function VistaServicio({
  servicio,
  fechaCreacion,
}: {
  servicio: FilaServicio;
  /** `created_at` ya formateada en el servidor. Ver `fila-servicio.tsx`. */
  fechaCreacion: string;
}) {
  return (
    <ListaDatos>
      <Dato etiqueta="Código" valor={servicio.codigo} />
      {/* `capitalizarCategoria` por lo mismo que en el formulario: lo guardado
          es el valor en minúscula de `CATEGORIAS_SERVICIO`, y esto es solo
          cómo se lee. NO es `className="capitalize"` de Tailwind — ver el
          comentario de esa función en ../constantes.ts. */}
      <Dato etiqueta="Categoría">
        {servicio.categoria ? capitalizarCategoria(servicio.categoria) : "—"}
      </Dato>
      <Dato
        etiqueta="Servicio"
        valor={servicio.servicio}
        className="sm:col-span-2"
      />
      <Dato etiqueta="Unidad" valor={servicio.unidad} />
      {/* Las dos columnas admiten NULL, y el precio no se puede enseñar sin su
          moneda: `formatearMonto` necesita las dos para poner el símbolo
          correcto. Si falta cualquiera de ellas se pinta el guion de "no
          tiene", nunca un número sin moneda — que se leería como soles por
          defecto y podría no serlo. */}
      <Dato etiqueta="Precio">
        {servicio.precio !== null && servicio.moneda !== null
          ? formatearMonto(servicio.precio, servicio.moneda)
          : "—"}
      </Dato>
      <Dato etiqueta="Moneda" valor={servicio.moneda} />
      <Dato etiqueta="Fecha de creación" valor={fechaCreacion} />
    </ListaDatos>
  );
}
