---
name: feedback-generar-no-aplicar
description: El usuario pide explícitamente generar migraciones sin aplicarlas cuando quiere revisar el SQL antes de tocar la BD
metadata:
  type: feedback
---

Cuando el usuario dice "genera la migración pero no la apliques", se refiere
literalmente a correr `npx drizzle-kit generate` y parar ahí — nunca
`migrate` ni `push`, aunque el cambio sea de bajo riesgo (p.ej. tabla con 0
filas). Mostrar el SQL generado y decir explícitamente en el reporte final
que queda pendiente de aplicar, sin ambigüedad.

**Por qué:** el usuario quiere revisar el SQL antes de que toque la base de
datos real, incluso cuando el propio agente ya evaluó que no hay riesgo de
pérdida de datos. La decisión de aplicar es siempre del usuario, no del
agente, aunque el análisis diga que es seguro. Ver también la regla del
propio prompt del agente: "Migraciones: generar no es aplicar".

**Cómo aplicar:** en cualquier tarea de esquema, tratar "generar" y
"aplicar" como dos pasos separados por defecto; solo fusionarlos si el
usuario lo pide explícitamente en el mismo mensaje.
