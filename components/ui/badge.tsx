import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // NO usa `bg-primary` a propósito, aunque sea lo que trae shadcn de
        // fábrica. `variantePorEstado` le da esta variante a `En ejecución`, y
        // desde que --primary es el verde de marca ese estado competiría con
        // `Facturado` (--success), que también es verde. El token
        // --chip-neutral vale exactamente lo que valía --primary antes del
        // tema verde, así que el chip se ve igual que siempre y los siete
        // estados de OT siguen distinguiéndose por su propio criterio, sin
        // seguir a la marca. Ver el comentario de --chip-neutral en
        // app/globals.css antes de "simplificar" esto de vuelta a bg-primary.
        default:
          "bg-chip-neutral text-chip-neutral-foreground [a]:hover:bg-chip-neutral/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        // Añadidas a la variante original de shadcn/ui para que los siete
        // estados de una OT se distingan entre sí (ver `variantePorEstado`
        // en modules/ordenes-trabajo/components/selector-estado-fila.tsx,
        // donde el Badge se pinta dentro del Select de la celda de estado).
        // `dashed` distingue por trazo, no por relleno, porque la rampa de
        // grises del tema ya no daba más pasos legibles; `success` e `info`
        // siguen exactamente el mismo patrón que `destructive` (tinte al
        // 10/20% sobre texto del color), con los tokens --success e --info
        // de globals.css.
        dashed:
          "border-dashed border-muted-foreground/60 text-muted-foreground [a]:hover:bg-muted",
        success:
          "bg-success/10 text-success focus-visible:ring-success/20 dark:bg-success/20 dark:focus-visible:ring-success/40 [a]:hover:bg-success/20",
        info:
          "bg-info/10 text-info focus-visible:ring-info/20 dark:bg-info/20 dark:focus-visible:ring-info/40 [a]:hover:bg-info/20",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
