import { CircleAlertIcon } from "lucide-react";

/**
 * El error de un campo del formulario, debajo del campo y con icono, como en el
 * mockup de docs/diseno/. Muestra solo el primer mensaje: Zod puede devolver
 * varios para un mismo campo, y uno a la vez es lo que se puede corregir.
 *
 * Estuvo copiado idéntico en los siete formularios de módulo; vive aquí desde
 * que el rediseño le añadió el icono, para no repetir el cambio siete veces.
 */
export function MensajeError({ errores }: { errores?: string[] }) {
  if (!errores?.length) return null;

  return (
    <p
      className="flex items-center gap-1.5 text-sm text-destructive"
      role="alert"
    >
      <CircleAlertIcon aria-hidden className="size-3.5 shrink-0" />
      {errores[0]}
    </p>
  );
}
