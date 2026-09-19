---
name: ot-correlativo-contador-por-anio
description: Por qué el correlativo de OT usa la tabla ot_correlativo con upsert atómico en vez de MAX+1 o una sequence de Postgres, y qué quedó asumido
metadata:
  type: project
---

El correlativo `NNNN` de `OT.CCM.AAAA.NNNN` (tabla `orden_trabajo`, esquema
diseñado el 2026-09-18) se resuelve con una tabla de apoyo `ot_correlativo`
(`anio` PK, `ultimo`), no con `MAX(codigo_ot) + 1` ni con una `sequence`.

**Por qué:** `MAX + 1` tiene condición de carrera real (dos pestañas creando
OT a la vez leen el mismo máximo). Una `sequence` de PostgreSQL tampoco sirve:
no revierte con la transacción — dejaría huecos en una numeración que el
cliente lee como documento oficial — y reiniciarla cada año exigiría un
`ALTER` programado. El upsert `ON CONFLICT (anio) DO UPDATE SET ultimo =
ultimo + 1 RETURNING ultimo` toma el lock de la fila del año y, dentro de la
misma transacción que el `INSERT` de la OT, garantiza número único y sin
huecos. El `UNIQUE` sobre `codigo_ot` es la red de seguridad si alguien se
salta el contador.

**Cómo aplicar:** si en el futuro alguien propone "simplificar" quitando
`ot_correlativo` y calculando el número al vuelo, esa es exactamente la
regresión que esta tabla previene. Mismo patrón reutilizable para el
correlativo de Cotización cuando llegue (hoy es texto manual). Ojo: el
`$onUpdate` de `updated_at` es de Drizzle y no se dispara en un upsert escrito
a mano — hay que poner `updated_at = now()` en el `SET`.

**Supuestos abiertos registrados** (`docs/spec/preguntas-abiertas.md`,
supuestos 5 a 9): inicio en `0001` y no `0000` (cambiar no requiere
migración, solo el `VALUES ($anio, 1)`); `responsable` y `codigo_oc`
nullables; uno-a-muchos Servicio→OT sin `UNIQUE` en `servicio_id`; sin
borrado — `Cancelada` hace de `activo=false`, por eso `orden_trabajo` es la
excepción consciente a la regla de columna `activo`.

Ver también [[precio-bigint]] y [[feedback-generar-no-aplicar]] (la
migración `0003_lively_leo.sql` quedó generada y **no aplicada**).
