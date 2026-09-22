import type { ReactNode } from "react";
import { cn } from "cn";

/**
 * La mitad de "solo lectura" del patrón de `fila-clicable.tsx`: cómo se pinta
 * un registro cuando el modal está en modo "viendo".
 *
 * Vive en core/ por lo mismo que el resto del patrón — lo van a montar varios
 * módulos y ninguno puede importar del otro. Es presentación y nada más: no
 * sabe de qué entidad se trata ni trae estado.
 *
 * Es una lista de definiciones (`<dl>`) y no una tabla de dos columnas ni un
 * puñado de `<p>`: la relación etiqueta/valor queda en la semántica, así que
 * un lector de pantalla anuncia "Marca: Bosch" en vez de leer dos textos
 * sueltos que sólo se relacionan visualmente.
 */

/**
 * Un guion para lo que no tiene dato, en vez de dejar el hueco en blanco: una
 * celda vacía se lee como "no cargó" y no como "no tiene". Cubre tanto el
 * `null` (casi todas las columnas de los catálogos lo admiten) como la cadena
 * vacía o en blanco.
 */
export function oVacio(valor: string | null | undefined) {
  return valor && valor.trim() !== "" ? valor : "—";
}

/** La rejilla que agrupa los datos. Mismas dos columnas que el formulario. */
export function ListaDatos({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>;
}

/**
 * Un dato: su etiqueta y su valor.
 *
 * `valor` es para texto —pasa por `oVacio`, así que un campo vacío se ve como
 * "—" y no desaparece—. Cuando el valor no es texto (un `Badge` de situación,
 * por ejemplo) se pasa como `children`, que manda sobre `valor`.
 */
export function Dato({
  etiqueta,
  valor,
  children,
  className,
}: {
  etiqueta: string;
  valor?: string | null;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm">{children ?? oVacio(valor)}</dd>
    </div>
  );
}
