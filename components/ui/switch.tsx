"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

// Escrito a mano sobre el primitivo de Base UI, siguiendo la forma de los demás
// componentes de esta carpeta, porque `npx shadcn add switch` no pudo
// descargarse: ui.shadcn.com no era accesible desde el entorno en que se
// construyó. Si se instala el oficial, sustituye este archivo sin más — la API
// es la del primitivo (`checked`, `onCheckedChange`, `disabled`).
//
// Base UI lo renderiza como un `<span role="switch">` más un `<input>` oculto,
// así que la forma de darle nombre accesible es envolverlo en un `<label>` con
// el texto al lado (ver core/components/filtro-solo-inactivos.tsx).
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-primary data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform data-checked:translate-x-4 data-unchecked:translate-x-0.5"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
