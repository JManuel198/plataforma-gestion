---
name: proyecto-verificacion-tecnica
description: Qué scripts de verificación existen realmente en package.json de plataforma-gestion y cómo suplir lo que falta
metadata:
  type: project
---

A fecha 2026-09-18, `package.json` de plataforma-gestion solo define el script
`lint` (`eslint`). No hay `typecheck` ni `test`.

**Por qué importa:** sin script de tipos declarado, no asumir que "no se pudo
verificar" — correr `npx tsc --noEmit` directamente desde la raíz del repo
funciona (el proyecto usa TypeScript estricto) y es la forma de cubrir el
chequeo de tipos exigido por la auditoría aunque no esté en package.json.

**Cómo aplicar:** en cada auditoría, releer `package.json` primero (puede
cambiar), correr `npm run lint` y, si no existe script de tipos, correr
`npx tsc --noEmit` como sustituto y reportarlo explícitamente como tal en
"Verificación técnica ejecutada" (aclarando que no vino de un script propio
del proyecto).
