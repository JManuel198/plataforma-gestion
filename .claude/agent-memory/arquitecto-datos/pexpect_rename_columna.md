---
name: pexpect-rename-columna
description: Receta pexpect para responder "rename column" (no "create column") en el prompt interactivo de drizzle-kit generate — caso opuesto al de la fusión Servicio+OT
metadata:
  type: project
---

`npx drizzle-kit generate` no acepta stdin no-TTY para su prompt interactivo
de columnsResolver ("Interactive prompts require a TTY"). Ya había una receta
en [[fusion-servicio-ot]] para cuando la opción deseada era la primera
("+ crear columna", el default resaltado con `❯`). Este caso (2026-09-20,
`orden_trabajo.asunto` → `orden_trabajo.servicio`) fue el inverso: se quería
la SEGUNDA opción, "~ asunto › servicio rename column", que no es el default.

Solución con `pexpect` (Python), igual que la vez anterior pero enviando
flecha abajo antes de confirmar:

```python
import pexpect
child = pexpect.spawn("npx drizzle-kit generate", cwd=REPO, timeout=60, encoding="utf-8")
child.expect("rename column")   # confirma que el menú ya se dibujó
child.send("\x1b[B")            # flecha abajo: mueve el cursor a "rename column"
child.send("\r")                # confirma la selección
child.expect([pexpect.EOF, pexpect.TIMEOUT], timeout=30)
child.close(force=True)
```

El log del proceso confirma la selección correcta con la línea
`~ asunto › servicio column will be renamed` (en vez de `+ create column`) y
el SQL resultante fue exactamente `ALTER TABLE "orden_trabajo" RENAME COLUMN
"asunto" TO "servicio";` — sin DROP+ADD.

**Lección general:** antes de automatizar el prompt con pexpect, correrlo una
vez solo hasta el `expect` inicial (sin enviar teclas) para leer el texto
completo del menú y confirmar en qué posición está la opción deseada — no
asumir que el default sirve, varía según si lo que se quiere es "crear" o
"renombrar".

Ver también [[fusion-servicio-ot]], [[feedback-generar-no-aplicar]].
