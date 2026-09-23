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

- **Lista de precios (Bloque 13, Partes 1 y 2, auditado 2026-09-22 — sin
  hallazgos).** Segundo catálogo maestro con tabla real, y primer módulo con
  un campo derivado (`precio = precio_lista × (1 − descuento/100)`, nunca
  columna) y un campo de texto libre con sugerencias (`proveedor`, sin tabla
  propia). Confirma que el patrón de Materiales (fila clicable, filtro
  inactivos que ALTERNA con `eq(activo, inactivos ? false : true)`, dos
  Server Actions `cambiarActivoX`/`buscarXAction` con `exigirSesion()` +
  Zod mínimo) se replica sin desviarse también en un tercer/cuarto módulo.
  Piezas nuevas de interés como referencia futura:
  - `core/components/busqueda-remota.ts`: motor compartido (`useBusquedaRemota`)
    entre `BuscadorSeleccion` (elige un registro existente) y
    `CampoConSugerencias` (texto libre que sugiere lo ya usado) — extraído
    directo a `core/` en su segundo uso, sin pasar primero por la fase de
    "copiarlo y esperar una tercera vez" que sí tuvieron `patronParcial` y
    `esUniqueViolado`. Aplicar el mismo criterio si aparece un tercer
    consumidor de ese motor.
  - El cálculo de precio evita `BigInt` con una descomposición en
    `cientos × 10000 + resto` porque el producto intermedio
    `precioLista × factor` puede superar `Number.MAX_SAFE_INTEGER` antes de
    dividir — vale la pena revisar con la misma sospecha cualquier cálculo
    monetario nuevo que multiplique un céntimo grande por un factor de escala
    antes de dividir.
  - `useFiltros` de este módulo es el CUARTO hook idéntico (materiales,
    personal, ordenes-trabajo, lista-precios) y deliberadamente NO se subió a
    core/: el criterio de "mover a la tercera copia" aplica a lógica que puede
    divergir en silencio (regex, parseo de errores), no a ocho líneas sin
    lógica propia donde el síntoma de una divergencia sería visible al tocar
    el filtro. Útil como criterio para no exigir de más en una futura auditoría.

- **EPPs (Bloque 16, Parte 1, auditado 2026-09-23 — sin hallazgos).** Quinto y
  último catálogo maestro del menú (cierra Materiales, Lista de precios,
  Servicios, Tarifario de personal, EPPs). Copiado explícitamente del patrón
  de Servicios (catálogo sin columna `activo`) y sin desviaciones: `codigo`
  fuera del FormData y del Zod tanto en crear como en editar, `esUniqueViolado`
  con el nombre real del constraint (`epps_codigo_unique`, verificado contra
  el `CREATE TABLE` de la migración generada), fila clicable con el modal
  entero dentro de `SinPropagacion`, `PATRON_PRECIO` (12 enteros + 2
  decimales) cuadrando exactamente con `PRECIO_MAXIMO_CENTIMOS`
  (99_999_999_999_999 = 14 nueves), sin imports cruzados entre módulos. La
  única variación real frente a los hermanos es el ancho del correlativo (6
  dígitos, ni 7 ni 4) y que `unidad` es la lista física de `core/unidades.ts`
  y no la de periodos de `core/periodos.ts` del Tarifario — ambas diferencias
  están documentadas en tres sitios a la vez (comentario de schema/columna,
  README del módulo, SKILL.md) sin contradecirse entre sí.
  Con este bloque los cinco catálogos maestros del menú tienen ya tabla real;
  útil como referencia de que el patrón de "catálogo sin `activo`" (Servicios
  primero, EPPs segundo) es ahora el segundo caso, no una excepción de una
  sola vez — al auditar un sexto catálogo futuro sin `activo`, comparar contra
  estos dos en vez de tratarlo como algo nuevo.

Ver también [[proyecto-verificacion-tecnica]].
