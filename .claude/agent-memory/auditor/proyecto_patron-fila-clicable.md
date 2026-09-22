---
name: proyecto-patron-fila-clicable
description: Patrón "fila clicable → vista → editar" (core/fila-clicable.tsx, core/vista-detalle.tsx) validado en Materiales, Personal y Órdenes de Trabajo (Bloque 13, Partes 1-3) — vara de medir cuando se copie a los catálogos que faltan
metadata:
  type: project
---

Auditado el 2026-09-22, sin hallazgos de fondo, sobre el diff sin commitear
del Bloque 13:

- **Parte 1 (Materiales)**: `core/fila-clicable.tsx` (`ModoDetalle`,
  `useControlDetalle`, `propsFilaClicable`, `SinPropagacion`) y
  `core/vista-detalle.tsx` (`oVacio`, `ListaDatos`, `Dato`), consumidos por
  `fila-material.tsx`, `vista-material.tsx` y `dialogo-material.tsx` (tres
  modos).
- **Parte 2 (Personal)**: mismo patrón importado (no copiado) en
  `fila-persona.tsx`, `vista-persona.tsx` y `dialogo-persona.tsx`. Los tres
  elementos interactivos de la fila (botón Editar, `BotonBaja` con su
  `AlertDialog`, `DialogoPersona`) quedan dentro de un único
  `SinPropagacion`. `edad` se calcula en `tabla-personal.tsx` (Server
  Component, vía `calcularEdad` de `lib/fecha.ts`) y baja como prop hasta
  `FilaDePersona` → `DialogoPersona` → `VistaPersona`: ningún componente
  cliente vuelve a invocar `calcularEdad`, así que no hay ruta de
  hidratación divergente.

**Novedad de la Parte 2**: `core/fila-clicable.tsx` ganó `esClicDeLaFila()`,
un cinturón-y-tirantes en el `onClick` del `<tr>` que descarta (a) clics que
no están DOM-contenidos en la fila (portal de `Dialog`/`AlertDialog`) y (b)
clics que nacen en `button, a, input, select, textarea, label,
[role="button"]`. Documentado explícitamente en el propio archivo como "no
sustituye a `SinPropagacion`, sólo evita que olvidarlo sea un bug
silencioso".

Punto para vigilar la próxima vez que se audite este patrón: el filtro de
`esClicDeLaFila` sólo reconoce esas seis etiquetas/rol. Un control
interactivo que NO sea un elemento nativo de esa lista ni lleve
`role="button"` —por ejemplo un `role="switch"`, `role="checkbox"` o
`role="menuitem"` que Base UI renderice sobre un `<span>`/`<div>` en vez de
un `<button>`— NO quedaría cubierto por el cinturón-y-tirantes y dependería
por completo de que `SinPropagacion` lo envuelva. Hoy no aplica (todo en
Materiales y Personal son `<Button>` reales, que sí son `<button>`), pero
conviene revisarlo explícitamente el día que un catálogo meta un control así
dentro de una fila.

También vale la pena notar, sin que sea un hallazgo: como
`esClicDeLaFila` ya bloquea por sí solo tanto los clics en botones reales
como los clics dentro de un portal (con o sin `SinPropagacion`), el ejemplo
ilustrativo que AGENTS.md usa para justificar `SinPropagacion` ("sin ese
envoltorio, el clic en la equis de inactivar abre además la vista") ya no
describe el modo de fallo más preciso — que es justo el de los roles no
cubiertos por el selector, no el de un `<button>` normal. El comentario del
propio `core/fila-clicable.tsx` sí es preciso en esto. No se reportó como
hallazgo formal por no violar ninguna regla citable, pero conviene mirar si
la próxima vez que se toque esa sección de AGENTS.md vale la pena afinar el
ejemplo.

**Parte 3 (Órdenes de Trabajo, auditado 2026-09-22), sin hallazgos de fondo**:
esta es la fila que confirma en la práctica el punto que esta misma memoria
dejó anotado en la Parte 2. `SelectorEstadoFila` es exactamente el caso "un
control que no es `<button>` real" — sus opciones son `role="option"` sobre un
`<div>` de Base UI, fuera de la lista que reconoce `esClicDeLaFila()` — y el
código lo resuelve bien: el `SinPropagacion` de la celda de estado envuelve el
componente `SelectorEstadoFila` COMPLETO (disparador + desplegable portado +
`AlertDialog` de confirmación para `Facturado`/`Cancelada`), no solo el
disparador. El comentario del propio componente y el de AGENTS.md nombran este
caso explícitamente como "lo que la red de seguridad no cubre". Buena señal:
la lección de la Parte 2 se aplicó antes de que hiciera falta encontrarla de
nuevo con un bug.

También se extrajo `BadgeEstado` (modules/ordenes-trabajo/components/badge-estado.tsx)
como única fuente del color por estado — antes vivía duplicable dentro de
`selector-estado-fila.tsx` y ahora también lo consume `vista-orden-trabajo.tsx`.
Mismo criterio que ya aplicó el proyecto a `patronParcial` y `esUniqueViolado`:
un mapa de colores con dos copias divergiría en silencio igual que un `if`.

Precio y fecha bajan siempre como texto ya formateado desde
`tabla-ordenes-trabajo.tsx` (Server Component) hasta la fila, el modal y la
vista — nunca se reformatea en un componente cliente. Coherente con el mismo
criterio que ya usa `edad` en Personal.

Referencia cruzada: [[proyecto-patrones-establecidos]].
