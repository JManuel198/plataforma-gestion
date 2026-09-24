import { cn } from "cn";

/**
 * El recuadro del precio de una oferta, en la vista del modal y en el
 * formulario: el importe grande a la izquierda y, a la derecha, la fórmula con
 * la que sale («S/ 186.00 × (1 − 12 %)») y una nota sobre quién lo calcula.
 *
 * NO ES UN CAMPO, en ninguno de los dos sitios. El precio no tiene columna: se
 * deriva de `precio_lista` y `descuento` (ver ../precio.ts). En la vista, el
 * importe lo calculó el servidor; en el formulario es la vista previa en vivo,
 * y el definitivo lo vuelve a calcular el servidor al guardar. Por eso es un
 * `<output>` y no un input de solo lectura, que parecería editable pero
 * bloqueado.
 */
export function PanelPrecio({
  etiqueta,
  importe,
  formula,
  nota,
}: {
  /** "Precio" en la vista, "Precio · vista previa" en el formulario. */
  etiqueta: string;
  /** El importe ya formateado, o `null` si todavía no se puede calcular. */
  importe: string | null;
  /** «S/ 186.00 × (1 − 12 %)», o `null` si no hay con qué armarla. */
  formula: string | null;
  nota: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 rounded-lg border bg-muted/50 px-4 py-3">
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">{etiqueta}</p>
        <output
          className={cn(
            "block font-mono text-xl font-semibold tabular-nums",
            importe === null && "text-muted-foreground",
          )}
        >
          {importe ?? "—"}
        </output>
      </div>
      <div className="max-w-64 text-right text-xs text-muted-foreground">
        {formula ? <p className="tabular-nums">{formula}</p> : null}
        <p>{nota}</p>
      </div>
    </div>
  );
}
