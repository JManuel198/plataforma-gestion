---
name: proyecto-oportunidades-spec-bloque4-parte2
description: Auditoría de docs/spec/oportunidades.md (Parte 2 del plan del Embudo, solo documentación, 2026-09-25) — aprobado con hallazgos MEDIO/BAJO, sin bloqueantes; seguimiento mismo día con la resolución de la pregunta 31 (borrada, no marcada) y confirmación de 2 reglas sin plan.
metadata:
  type: project
---

Bloque 4 (Embudo de oportunidades), Parte 2 del plan (`docs/diseno/plan-embudo-oportunidades.md`
Parte B, paso 2): solo documentación, sin tabla ni código todavía. Auditado el
2026-09-25 contra el plan corregido (Parte A + Decisiones posteriores +
Resoluciones tras comparar el mockup).

Veredicto: APROBADO para continuar a la Parte 3 (mover el correlativo anual a
core/), con hallazgos MEDIO/BAJO a corregir en algún momento, ninguno
bloqueante.

**Patrón nuevo detectado — "porqués" añadidos en el spec sin respaldo en el
plan.** `docs/spec/oportunidades.md` explica con un *Por qué:* varias
decisiones que en `plan-embudo-oportunidades.md` aparecen sin ninguna
justificación (colores en un solo lugar — la mitad de la frase sí está en el
plan, la otra mitad no —, el historial de cambios, el límite de 30 días de
Finalizado, la ampliación de migas de pan a tercer nivel, y por qué la Tabla
muestra etapa+cierre junto y la cabecera del detalle no). Los razonamientos
inventados son plausibles y no contradicen nada, pero atribuyen al plan una
justificación que el plan no dio — vale la pena revisar en la próxima
auditoría de este módulo si se corrigieron (quitando el "por qué" o
trasladándolo al plan como decisión explícita) o si el patrón se repite en
partes siguientes. Ver también [[proyecto_crm-arranque-sin-actualizar-spec]]
para el patrón hermano (notas de estado obsoletas) — este es distinto: no es
un dato caducado, es contenido nuevo no verificable contra la fuente.

Dos reglas de negocio del spec (Contacto: opción "Sin contacto" para
quitarlo; Probabilidad: "vacío equivale a 0") están respaldadas por el
mockup (`docs/diseno/embudo-oportunidades.html`, confirmado con grep) pero no
aparecen en ninguna de las tres secciones del plan que el spec dice recoger
(Parte A, Decisiones posteriores, Resoluciones). No son inventadas de la
nada, pero el plan quedó incompleto respecto al spec.

CORRECCIÓN (verificada 2026-09-25 con `git log -p -1 24eef72 -- docs/spec/alcance-v2-servicios-ot.md`):
lo anotado arriba sobre `alcance-v2-servicios-ot.md:134` estaba MAL — sí se
actualizó, en el mismo commit 24eef72 que el resto de esta Parte 2 (pasó de
"hoy solo existe la ruta vacía `/oportunidades`" a "estado al 2026-09-25:
especificado en `oportunidades.md`, todavía sin tabla ni código"). El error
fue mío, no un caso real de [[proyecto_crm-arranque-sin-actualizar-spec]]:
antes de anotar un archivo como "no actualizado" hay que mirar el diff del
commit, no solo el contenido final. Lección para la próxima vez que se
sospeche de esa nota recurrente: confirmar con `git log -p` sobre el commit
en cuestión, no dar por hecho que un archivo quedó atrás solo porque en una
lectura rápida "suena" desactualizado.

**Seguimiento 2026-09-25 (mismo día, cambios sin commitear sobre 24eef72):**
el usuario resolvió la pregunta 31 (filtro "Sin mover ≥7d" se reinicia a
"Todas" al cambiar el estado de la Tabla a algo distinto de Activas) y la
eliminó de `preguntas-abiertas.md` sin marcarla "resuelta" — decisión
explícita de estilo: las preguntas resueltas por decisión del cliente se
BORRAN, no se dejan como registro histórico. Ver si este patrón se repite
(alternativa a lo que se hizo con la 24, que si quedó marcada "Resuelta" en
vez de borrarse — comparar antes de asumir un único estilo). También
confirmó como reglas normales (sin plan) que un contacto asignado se puede
quitar y que probabilidad vacía se guarda como 0 — las "dos reglas de
negocio... no aparecen en el plan" señaladas arriba ya no son un hallazgo:
el usuario decidió explícitamente que no hace falta escribirlas en el plan
por ser aplicación de reglas existentes (opcionalidad del campo, valor por
defecto). Auditado APROBADO, sin bloqueantes.

`npm run lint` y `npx tsc --noEmit` en verde (no hay script de tipos en
package.json al 2026-09-25, sigue igual que lo anotado en
[[proyecto_verificacion-tecnica]]). No se corrió `npm test` (Playwright
e2e) por ser cambios estrictamente de documentación, sin superficie de UI
que probar todavía.
