---
name: servicios-tabla
description: Diseño de servicios (Bloque 14, Parte 1, 2026-09-23) — precio directo no derivado (a diferencia de lista_precios), categoria text no enum, sin activo, tercer ámbito del correlativo genérico
metadata:
  type: project
---

Tercer catálogo maestro con tabla real, después de [[materiales_tabla]] y
[[lista_precios_tabla]]. Archivo `db/schema/servicios.ts`. Migración
`0013_wealthy_puppet_master.sql` — un solo `CREATE TABLE servicios`, generada
por este rol ([[feedback_generar_no_aplicar]]) y **aplicada después a Neon por
el hilo principal**, el 2026-09-23, tras revisar el DDL. Verificado contra la
base real: `to_regclass('public.servicios')` devuelve la tabla y sus 9 columnas
coinciden con el esquema. No queda nada pendiente de aplicar.

**No confundir con la entidad `Servicio` fusionada en OT (2026-09-19,
[[fusion_servicio_ot]]).** Esta tabla es el catálogo de "servicios con
precios fijos reutilizables" que `docs/spec/alcance-v2-servicios-ot.md`
difería a su sección 5 — comparten nombre y ruta `/servicios` por
coincidencia de vocabulario, no son la misma cosa. Colisión ya registrada
como decisión 7 de "Catálogos maestros" en preguntas-abiertas.md.

**`precio` es columna directa, NO derivada — la diferencia de fondo con
`lista_precios`.** Esta tabla no tiene `precio_lista`/`descuento`, así que no
hay nada de qué derivar: `precio` es simplemente el importe capturado.
`bigint` mode "number", mismo patrón que `orden_trabajo.precio` y
`lista_precios.precio_lista`. Importante no copiar mecánicamente el patrón de
Lista de precios a la próxima tabla con precio sin preguntar primero si es
directo o derivado — aquí el encargo lo dejó explícito, pero no siempre lo
estará.

**`categoria` es `text`, no `pgEnum`** — mismo criterio que `lista_precios.unidad`
antes de la unificación: lista de 5 valores (alquiler, fabricación,
consultoría, alimentación, otros) sin confirmar como exhaustiva, vive en
`modules/servicios/constantes.ts` (`CATEGORIAS_SERVICIO`). Pregunta abierta
la escribe el usuario en paralelo, no yo.

**`unidad` texto libre con sugerencias desde el día uno** — llega
directamente al estado final que Materiales y Lista de precios alcanzaron
recién en [[unidad_texto_libre_unificado]] (2026-09-22), sin pasar por la
fase de lista cerrada que tuvo Lista de precios.

**SIN columna `activo`, a propósito — pregunta abierta, no descarte.**
Inactivar/reactivar no está confirmado para este catálogo. A diferencia de
`lista_precios.activo` (que entró de antemano), aquí la ausencia es
literalmente "todavía no se sabe si hace falta", y el comentario en el schema
y la ficha de entidades.md lo dejan explícito: hoy esta tabla no cumple la
regla invariable 9 por ausencia de mecanismo. Si se confirma, el camino es
una migración nueva con `activo boolean DEFAULT true NOT NULL`.

**Sin índices** — sin `activo` que filtrar, sin FK que sostenga un JOIN.

**Correlativo:** tercer ámbito de `core/correlativo.ts` / tabla `correlativo`
(ver [[correlativo_generico]]), clave `"servicios"`, formato `SRV.0000001`
(prefijo `SRV.`, 7 dígitos, global, sin año) — no exigió tocar la tabla ni la
migración del correlativo, solo una fila nueva. Se actualizó la tabla de
ámbitos en la ficha "Correlativo genérico" de entidades.md (ahora tres filas)
en el mismo cambio.

Todas las columnas de negocio (`servicio`, `categoria`, `unidad`, `precio`,
`moneda`) nullable en la BD — mismo criterio de siempre: el Zod del módulo
puede ser más estricto, nunca al revés.

No se tocó `preguntas-abiertas.md` ni `modules/` — instrucción explícita del
encargo, lo lleva el usuario en paralelo.
