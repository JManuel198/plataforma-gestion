---
name: proyecto-patrones-establecidos
description: Patrones de código ya validados en plataforma-gestion que sirven de referencia al auditar módulos nuevos (dinero en céntimos, Server Actions con re-chequeo de sesión)
metadata:
  type: project
---

Del Bloque 2 (entidad Servicio, Fase 2, auditado 2026-09-18 — sin hallazgos)
quedaron estos patrones ya validados en el código, útiles como vara de medir
en módulos futuros que toquen dinero o Server Actions:

- **Conversión monto → céntimos**: en `modules/servicios/dinero.ts`, la
  función `aCentimos` parte la cadena de texto (enteros/decimales) en vez de
  multiplicar por 100 en coma flotante, evitando el clásico error de
  redondeo (`150.50 * 100 = 15050.000000000002`). El input llega ya
  restringido por una regex de Zod a 1-2 decimales antes de tocar esta
  función — la función en sí no valida formato, asume que ya pasó por
  `montoSchema`. Si aparece un módulo nuevo con montos (cotizaciones,
  proyectos), comparar contra este patrón en vez de aceptar
  `Number(x) * 100`.
- **Server Actions con sesión re-verificada dentro de la función**: en
  `modules/servicios/actions.ts` hay un `exigirSesion()` que se llama al
  inicio de cada action, con el comentario explícito de que una Server
  Action se puede invocar por POST directo sin pasar por el layout. Este es
  el patrón esperado en todo módulo nuevo — si una action nueva confía solo
  en que el layout protegió la ruta, es un hallazgo CRÍTICO real (no
  hipotético: layout.tsx en este proyecto protege el render de página, no
  las actions).

Ver también [[proyecto-verificacion-tecnica]].
