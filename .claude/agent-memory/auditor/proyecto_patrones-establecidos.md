---
name: proyecto-patrones-establecidos
description: Patrones de código ya validados en plataforma-gestion que sirven de referencia al auditar módulos nuevos (dinero en céntimos, Server Actions con re-chequeo de sesión)
metadata:
  type: project
---

Validados primero en la entidad Servicio (Fase 2, auditado 2026-09-18 — sin
hallazgos) y reverificados el 2026-09-19 tras fusionarse Servicio y OT en una
sola entidad: los dos archivos se movieron a `modules/ordenes-trabajo/`, el de
dinero sin un solo byte de cambio. Siguen siendo la vara de medir en módulos
futuros que toquen dinero o Server Actions:

- **Conversión monto → céntimos**: en `modules/ordenes-trabajo/dinero.ts`, la
  función `aCentimos` parte la cadena de texto (enteros/decimales) en vez de
  multiplicar por 100 en coma flotante, evitando el clásico error de
  redondeo (`150.50 * 100 = 15050.000000000002`). El input llega ya
  restringido por una regex de Zod a 1-2 decimales antes de tocar esta
  función — la función en sí no valida formato, asume que ya pasó por
  `montoSchema`. Si aparece un módulo nuevo con montos (cotizaciones,
  proyectos), comparar contra este patrón en vez de aceptar
  `Number(x) * 100`.
- **Server Actions con sesión re-verificada dentro de la función**: en
  `modules/ordenes-trabajo/actions.ts` hay un `exigirSesion()` que se llama al
  inicio de cada action, con el comentario explícito de que una Server
  Action se puede invocar por POST directo sin pasar por el layout. Este es
  el patrón esperado en todo módulo nuevo — si una action nueva confía solo
  en que el layout protegió la ruta, es un hallazgo CRÍTICO real (no
  hipotético: layout.tsx en este proyecto protege el render de página, no
  las actions).

- **Cambio de estado desde el listado sin control de transición**: en
  `actualizarEstadoOrdenTrabajo` (`modules/ordenes-trabajo/actions.ts`,
  bloque 5, auditado 2026-09-19) `exigirSesion()` es la primera línea
  ejecutable de la función, antes de parsear o tocar la base. El único
  guardarraíl del lado del cliente (AlertDialog de confirmación en
  `selector-estado-fila.tsx` para `Facturado`/`Cancelada`) es explícitamente
  solo UX — el propio comentario del componente dice que la Server Action no
  restringe nada, y así es: cualquier transición entre los 6 estados se
  acepta, con o sin diálogo, en línea con el supuesto 11 (aún abierto) de
  `docs/spec/preguntas-abiertas.md`. Referencia útil si un módulo futuro
  pone un `AlertDialog`/`confirm()` de cliente delante de una acción
  sensible: verificar siempre que la restricción real (si la hay) esté
  también en el servidor.
- **`patronParcial` (escape de LIKE/ILIKE)**: en
  `modules/ordenes-trabajo/queries.ts`, `patronParcial` escapa `%`, `_` y `\`
  con `replace(/[\\%_]/g, ...)` antes de envolver en `%...%`. Verificado
  contra la base real el 2026-09-19 (inserción y borrado de 6 filas de
  prueba en `orden_trabajo`, limpiadas con `eq(ordenTrabajo.cliente, ...)` y
  confirmado el conteo en 0 al final): buscar `"%"` trae solo la fila con un
  `%` literal en `asunto`, `"50%"` no actúa como comodín (no trae la fila que
  solo empieza por "50"), `"_"` no casa con cualquier carácter, y `"\"` se
  busca como carácter literal. Sirve de referencia de cómo probar
  `ILIKE`/`LIKE` parametrizado con datos reales en vez de darlo por bueno
  leyendo el código, en cualquier módulo futuro que arme un patrón a mano.

Ver también [[proyecto-verificacion-tecnica]].
