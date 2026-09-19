---
name: proyecto-estados-ot-duplicados
description: ESTADOS_OT vive como array literal duplicado en dos archivos (db/schema/orden-trabajo.ts y modules/ordenes-trabajo/constantes.ts) desde la fusión Servicio+OT — revisar en cada auditoría que toque el enum de estado
metadata:
  type: project
---

Detectado auditando el bloque 5 de OT (2026-09-19, cambio de estado desde el
listado). `ESTADOS_OT` (los 6 valores: Pendiente, En ejecución, Pausada,
Finalizada, Facturado, Cancelada) está escrito como array literal en DOS
sitios, no en uno:

- `db/schema/orden-trabajo.ts` — de donde sale `otEstadoEnum` (el enum real de
  PostgreSQL).
- `modules/ordenes-trabajo/constantes.ts` — de donde salen `estadoOtSchema`
  (Zod) y las opciones del `Select` del formulario/filtro.

Los dos arrays coinciden hoy valor por valor, pero nada los mantiene
sincronizados automáticamente: el chequeo de compilación
(`_estadoCoincide` en `schema.ts`) solo detecta que `constantes.ts` no
invente un valor que `OrdenTrabajo["estado"]` no tenga — no detecta que el
enum de Postgres gane un valor y `constantes.ts` se quede corto (así lo dice
el propio comentario de ese archivo).

**Por qué importa:** el comentario nuevo de `otCambioEstadoSchema`
(`modules/ordenes-trabajo/schema.ts`) dice textualmente "la lista de estados
no se duplica en ningún sitio" — cierto en el sentido estrecho de que
`estadoOtSchema` se reutiliza dentro del módulo (no se reimplementa la
validación), pero no cierto a nivel de repo: la lista de los 6 nombres sí
está duplicada, entre `db/schema/` y `modules/ordenes-trabajo/`. Viene de
antes de este bloque (commit `7ca1e37`, fusión Servicio+OT), no se introdujo
ahora, pero el bloque 5 construye directamente sobre esa duplicación.

**Cómo aplicar:** en cualquier auditoría futura que toque `ESTADOS_OT`/
`ot_estado`, verificar si `constantes.ts` sigue importando el array desde
`db/schema/orden-trabajo.ts` en vez de redefinirlo. Mientras no se
unifique, un estado agregado solo en la base (migración manual) o solo en
`constantes.ts` puede desincronizarse en silencio — ni `tsc` ni `eslint` lo
detectan en esa dirección.

Ver también [[proyecto-patrones-establecidos]] y
[[proyecto-checkpoint-migracion-pendiente]] (mismo tipo de deuda: documentación
o código que queda desactualizado tras la fusión Servicio+OT sin que ninguna
herramienta automática avise).
