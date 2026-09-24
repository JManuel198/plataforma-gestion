import type { ReactNode } from "react";

/**
 * Piezas comunes de las tablas de listado, según el mockup de docs/diseno/.
 * Lista de precios las estrena; los demás listados las adoptan en la parte 6.
 *
 * Son clases y componentes sin estado, usables desde Server Components: la
 * tabla de cada módulo sigue siendo suya (sus columnas, su fila clicable), y
 * esto solo fija CÓMO se ve cada tipo de dato, para que un código, un importe
 * o una referencia a otra entidad se lean igual en todos los catálogos.
 */

/**
 * El marco de la tabla: borde y esquinas redondeadas, con un pie opcional
 * debajo (la paginación). El scroll horizontal no va aquí sino en el
 * contenedor que ya pone `<Table>` (components/ui/table.tsx), que es también
 * el contenedor respecto al que se pegan las columnas fijas — así el pie se
 * queda quieto mientras la tabla se desplaza.
 */
export function MarcoTabla({
  children,
  pie,
}: {
  children: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      {children}
      {pie ? <div className="border-t px-3 py-2">{pie}</div> : null}
    </div>
  );
}

/**
 * Para `propsFilaClicable(…, CLASE_FILA)`: el resalte de la fila al pasar el
 * ratón es el verde suave de marca (`--accent`), no el gris por defecto de
 * shadcn. `group/fila` es lo que permite a las celdas fijas copiar ese fondo
 * (ver abajo).
 */
export const CLASE_FILA = "group/fila hover:bg-accent";

/** Para el `<TableRow>` de la cabecera: sin resalte al pasar el ratón. */
export const CLASE_FILA_CABECERA = "hover:bg-transparent";

/** Para cada `<TableHead>`: texto secundario, como en el mockup. */
export const CLASE_CABECERA = "text-xs text-muted-foreground";

/*
 * COLUMNAS FIJAS. En una tabla ancha (Lista de precios tiene once columnas),
 * el código queda pegado a la izquierda y las acciones a la derecha mientras el
 * resto se desplaza en horizontal: así nunca se pierde de vista qué fila es ni
 * cómo actuar sobre ella.
 *
 * Dos detalles que no son obvios:
 * - Una celda fija necesita fondo propio, o el contenido que pasa por debajo
 *   se transparenta. Y ese fondo tiene que seguir al resalte de la fila:
 *   `group-hover/fila:bg-accent` (la fila lleva `CLASE_FILA`).
 * - La línea que las separa del resto es una sombra interior y no un `border`:
 *   con `border-collapse: collapse` (el de Tailwind), los bordes de una celda
 *   `sticky` no se desplazan con ella y se quedan atrás.
 */
const FONDO_FIJO = "sticky z-10 bg-background group-hover/fila:bg-accent";

/** Primera columna (el código), pegada a la izquierda. */
export const CELDA_FIJA_INICIO = `${FONDO_FIJO} left-0 shadow-[inset_-1px_0_0_var(--color-border)]`;

/**
 * Última columna (las acciones), pegada a la derecha. Ancho fijo (`w-20`,
 * dos botones de icono) porque la columna anterior se pega a esa distancia.
 */
export const CELDA_FIJA_FIN = `${FONDO_FIJO} right-0 w-20 min-w-20`;

/**
 * Penúltima columna (la «Situación», en los catálogos que la tienen), pegada
 * justo a la izquierda de las acciones: `right-20` es el ancho de
 * `CELDA_FIJA_FIN`. Si cambia uno, cambia el otro.
 */
export const CELDA_FIJA_ANTES_DEL_FIN = `${FONDO_FIJO} right-20 shadow-[inset_1px_0_0_var(--color-border)]`;

/** Un código autogenerado (OFFT.0000318, MAT.0000124): monoespaciado. */
export const CLASE_CODIGO = "font-mono text-xs font-medium";

/**
 * Un importe o una cifra alineada a la derecha, monoespaciada para que los
 * dígitos de filas distintas caigan en columna.
 */
export const CLASE_CIFRA = "text-right font-mono text-xs tabular-nums";

/**
 * Una referencia a otra entidad dentro de una celda: su código pequeño encima y
 * su descripción debajo (el material de una oferta, en Lista de precios). La
 * descripción se recorta con puntos suspensivos y entera queda en el `title`.
 */
export function ReferenciaConCodigo({
  codigo,
  descripcion,
}: {
  codigo: string | null;
  descripcion: string | null;
}) {
  return (
    <div
      className="grid max-w-56 leading-tight"
      title={descripcion ?? undefined}
    >
      {codigo ? (
        <span className="font-mono text-[11px] text-muted-foreground">
          {codigo}
        </span>
      ) : null}
      <span className="truncate">{descripcion?.trim() || "—"}</span>
    </div>
  );
}
