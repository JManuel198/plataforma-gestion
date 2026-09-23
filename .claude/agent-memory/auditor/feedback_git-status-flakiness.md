---
name: feedback-git-status-flakiness
description: git status en este entorno a veces omite un archivo modificado que sí aparece en una llamada posterior — verificar el alcance con más de una lectura antes de darlo por cerrado
metadata:
  type: feedback
---

Al auditar Lista de precios (Bloque 13, Parte 2, 2026-09-22), una primera
llamada a `git status` (ejecutada en paralelo con `git diff --stat`) no listó
`modules/lista-precios/README.md` entre los modificados, aunque el archivo
tenía un diff real de dos pantallas contra HEAD. Una segunda llamada a
`git status`, minutos después, sí lo mostró. No se identificó la causa (¿un
proceso de `next dev` tocando el árbol de trabajo al mismo tiempo? — este
repo corre con `next dev` activo, ver el bloque de generate-agent-files.js al
inicio de AGENTS.md).

**Por qué importa:** si me hubiera quedado con la primera lectura, habría
dejado fuera del alcance un archivo con contenido real que auditar (y que,
en este caso, resultó relevante para el punto 6 del encargo — si Proveedor
como texto libre contradice algo ya decidido).

**Cómo aplicar:** cuando el alcance declarado por quien pide la auditoría
(o el propio encargo) menciona explícitamente un archivo, no confiar
ciegamente en que `git status` lo liste — si no aparece pero hay razón para
sospechar que cambió (el encargo lo nombra, o `find`/`ls` muestra que existe
y es reciente), confirmar con `git diff HEAD -- <archivo>` directamente antes
de excluirlo del reporte. No hace falta repetir esto para cada archivo del
repo, solo para los que el encargo señala por nombre.
