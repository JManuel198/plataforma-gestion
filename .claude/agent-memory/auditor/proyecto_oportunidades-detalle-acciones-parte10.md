---
name: proyecto-oportunidades-detalle-acciones-parte10
description: Hallazgos de la auditoría de la Parte 10 del Embudo (acciones del detalle /oportunidades/[id]), 2026-09-26, checkpoint sin commitear.
metadata:
  type: project
---

Auditoría de modules/oportunidades/components/{use-accion-oportunidad.ts,
dialogo-accion.tsx, ediciones-oportunidad.tsx, acciones-detalle.tsx} y el
rehecho de linea-etapas.tsx/cabecera-detalle.tsx/informacion-general.tsx
(Parte 10 del plan del Embudo). Sin commitear al auditar (rama
feature/crm-oportunidades). tsc y eslint en verde; sin hallazgos CRÍTICO ni
ALTO.

**Patrón a vigilar en el módulo — MEDIO:** `DialogoAccion` (dialogo-accion.tsx)
documenta en su propio comentario "un error de campo queda bajo su campo",
pero eso solo es cierto para las acciones que devuelven `EstadoFormulario`
(`actualizarOportunidad`, `agregarActividad`, que sí traen `errores` por
campo). `marcarPerdida` y `anular` devuelven `ResultadoAccion` (`{ok, mensaje}`
sin `errores`), así que su error de "motivo" (vacío o solo espacios) sale
siempre como un aviso genérico arriba del diálogo, y `CampoMotivo` en
acciones-detalle.tsx ni siquiera recibe/usa `errores` ni `aria-invalid`.
Funciona (el usuario ve el rechazo), pero es una promesa documentada que el
propio código no cumple para ese caso, y una asimetría de accesibilidad
(el campo real no queda marcado inválido). Vale la pena revisar si se repite
en Partes futuras (Tabla, arrastre) que reutilicen `DialogoAccion` con
acciones de tipo `ResultadoAccion`.

**Patrón ya confirmado, no repetir como hallazgo:** `value={null}` en
`SelectorContacto` (Select de Base UI) ya existía igual en
`campos-oportunidad.tsx` (Parte 7); no es nuevo ni sospechoso.

**Nota de spec desactualizada, no introducida por esta Parte:**
`docs/spec/preguntas-abiertas.md`, sección "Embudo de oportunidades" (línea
~783), sigue diciendo "el detalle... llegan después" desde el commit de la
Parte 8 (c897722); nunca se actualizó en la Parte 9 (9b0707b) ni en esta
Parte 10. Es otra instancia de [[proyecto_crm-arranque-sin-actualizar-spec]],
esta vez en preguntas-abiertas.md en vez de en AGENTS.md/alcance-v2 — vale la
pena ampliar esa memoria para incluir este archivo entre los que se quedan
atrás.
