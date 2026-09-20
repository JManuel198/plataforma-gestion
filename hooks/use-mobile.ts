import * as React from "react"

const MOBILE_BREAKPOINT = 768
const CONSULTA = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// OJO: este archivo lo instaló `npx shadcn@latest add sidebar`, pero NO está
// tal cual salió del catálogo. La versión original arrancaba en `undefined` y
// hacía `setIsMobile(...)` dentro de un `useEffect`, que es justo lo que
// prohíbe `react-hooks/set-state-in-effect` (el lint del proyecto lo marca
// como error, no como aviso): provoca un render en cascada en cada montaje.
//
// `useSyncExternalStore` es la forma que React recomienda para leer un dato
// que vive fuera de React —aquí, el `matchMedia` del navegador— y da el mismo
// resultado sin el render de más. Si algún día se reinstala el componente con
// `--overwrite`, esto vuelve a la versión del catálogo y el lint falla otra
// vez: hay que volver a aplicarlo.

function suscribir(alCambiar: () => void) {
  const mql = window.matchMedia(CONSULTA)
  mql.addEventListener("change", alCambiar)
  return () => mql.removeEventListener("change", alCambiar)
}

function leerEnCliente() {
  return window.matchMedia(CONSULTA).matches
}

// En el servidor no hay ancho de ventana que consultar, así que se asume
// escritorio. Es exactamente lo que hacía la versión original: su estado
// inicial `undefined` salía del hook como `false` por el `!!`. Mantenerlo
// igual importa porque es el valor con el que se pinta el HTML del servidor —
// cambiarlo a `true` haría que en escritorio la barra se renderizara primero
// como cajón de móvil.
function leerEnServidor() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(suscribir, leerEnCliente, leerEnServidor)
}
