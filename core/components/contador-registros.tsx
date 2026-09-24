import { cn } from "cn";

/**
 * El contador de la barra de filtros: «86 ofertas activas».
 *
 * Cuenta el catálogo entero de la vista en la que se está (activos, o inactivos
 * con «Ver solo inactivos»), NO lo que deja ver la búsqueda: es la respuesta a
 * "¿cuántas hay?", no a "¿cuántas encontré?". Por eso el número lo trae una
 * consulta propia del módulo y no el largo de las filas del listado.
 *
 * El texto llega ya armado desde la página (con su singular y su plural), para
 * que este componente no tenga que saber de géneros ni de sustantivos.
 */
export function ContadorRegistros({
  texto,
  activos,
}: {
  texto: string;
  /** Punto verde para la vista de activos, gris para la de inactivos. */
  activos: boolean;
}) {
  return (
    // Verde de marca solo en la vista de activos, como en el mockup: es el
    // estado "normal" del catálogo. La de inactivos va en gris para que no se
    // confunda con ella de un vistazo.
    <p
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
        activos
          ? "border-primary/25 bg-accent text-primary"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          activos ? "bg-primary" : "bg-muted-foreground",
        )}
      />
      {texto}
    </p>
  );
}
