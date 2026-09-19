# Entidades

Refleja lo que existe de verdad en `db/schema/`. Si el esquema cambia, este
documento cambia con él.

---

## Servicio

Cada trabajo contratado con un cliente — el equivalente digital de una fila
del Excel que ya maneja el cliente. Definida en `db/schema/servicio.ts`,
tabla `servicio`. Origen: `alcance-v2-servicios-ot.md`, Fase 2.

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `id` | `text` (PK, UUID) | sí | automático |
| `codigo_cotizacion` | `text` | sí | manual (COT.) |
| `codigo_revision` | `text` | sí | manual (REV.) |
| `codigo_oc` | `text` | **no** | manual — formato libre por cliente |
| `servicio` | `text` | sí | manual — descripción del trabajo |
| `cliente` | `text` | sí | manual — texto libre, sin tabla de Clientes todavía |
| `fecha` | `timestamp` | sí | **automática** (`DEFAULT now()`) — nunca se pide al usuario |
| `precio` | `bigint` (`mode: "number"` en Drizzle) | sí | manual — **céntimos**, nunca decimal |
| `moneda` | `moneda` (enum) | sí | manual — `PEN` o `USD`, una sola por registro |
| `estado` | `servicio_estado` (enum) | sí | manual — 6 valores, por defecto `Activado` |
| `comentarios` | `text` | **no** | manual |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**Estados** (enum `servicio_estado`, confirmados por el cliente):
`Activado` · `En espera` · `En ejecución` · `Finalizado` · `Facturado` ·
`Rechazado`

**Precio.** Se guarda como entero en céntimos (regla 2 de AGENTS.md): el
formulario acepta `150.50` y el servidor guarda `15050`. La conversión vive
en `modules/servicios/dinero.ts` y se hace partiendo la cadena en texto, no
multiplicando en coma flotante.

La columna es `bigint` (migración `0002_fair_franklin_storm.sql`, resuelve el
supuesto 3 de `preguntas-abiertas.md`), pero con `mode: "number"` de Drizzle:
en JS sigue siendo un `number` normal, no `BigInt`, para no arrastrar ese
tipo por `dinero.ts`, el formulario y las acciones. Eso mueve el techo
técnico real a `Number.MAX_SAFE_INTEGER` (2^53 - 1), no al de `bigint` de
PostgreSQL. El techo de negocio que de verdad se valida y se comunica al
usuario es `PRECIO_MAXIMO_CENTIMOS` en `modules/servicios/schema.ts`:
`999 999 999 999.99`, fijado ahí porque es exactamente lo máximo que la
regex de `montoSchema` deja escribir (12 dígitos enteros + 2 decimales) —
muy por debajo del techo técnico, así que la conversión en `dinero.ts` nunca
pierde precisión antes de llegar a ese límite.

**Índices.** `servicio_estado_idx` sobre `estado`, para el filtro del listado.

**Sin borrado.** No hay acción de eliminar: un servicio se cierra moviéndolo
a `Finalizado`, `Facturado` o `Rechazado`. Es el mismo criterio que el resto
del esquema — no se borran filas que otra tabla pueda referenciar (la OT de
la Fase 3 apuntará a `servicio.id`).

**Consume:** nada. **Consumida por:** `modules/servicios/`.

---

## Orden de Trabajo (OT)

El documento de ejecución que nace de un Servicio ya creado. Definida en
`db/schema/orden-trabajo.ts`, tabla `orden_trabajo`. Origen:
`alcance-v2-servicios-ot.md`, Fase 3.

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `id` | `text` (PK, UUID) | sí | automático |
| `servicio_id` | `text` (FK → `servicio.id`) | sí | automático — se asigna al crear la OT desde un Servicio |
| `codigo_ot` | `text` (**UNIQUE**) | sí | **automático** — formato `OT.CCM.AAAA.NNNN`, el usuario nunca lo escribe |
| `codigo_cotizacion` | `text` | sí | manual — copiado a mano, **no** sincronizado con el del Servicio |
| `asunto` | `text` | sí | manual |
| `codigo_oc` | `text` | **no** | manual — copiado a mano, llega después |
| `cliente` | `text` | sí | manual — texto libre, sin tabla de Clientes todavía |
| `estado` | `ot_estado` (enum) | sí | manual — 5 valores, por defecto `Pendiente` |
| `fecha_creacion` | `timestamp` | sí | **automática** (`DEFAULT now()`) — nunca se pide al usuario |
| `responsable` | `text` | **no** | manual — nombre del técnico, texto libre (no hay tabla de Personal) |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**Estados** (enum `ot_estado`): `Pendiente` · `En ejecución` · `Pausada` ·
`Finalizada` · `Cancelada`. Son de ejecución en campo, distintos a propósito
de los de Servicio, que son administrativos/comerciales. El cliente autorizó
la lista como propuesta temporal; su validación definitiva sigue pendiente
(sección 6 del alcance).

**Relación con Servicio.** `servicio_id` es una clave foránea real, con
`ON DELETE RESTRICT` explícito: los servicios no se borran (supuesto 4 de
`preguntas-abiertas.md`), así que si alguien lo intentara teniendo OT
colgando, la base de datos lo impide. Nunca `CASCADE`.

**Campos duplicados a propósito.** `codigo_cotizacion`, `asunto`, `codigo_oc`
y `cliente` se escriben a mano y no se copian ni se mantienen al día desde el
Servicio. Es una decisión del alcance v2 para ir rápido: como la relación
real (`servicio_id`) sí está guardada, sincronizarlos más adelante es un
cambio contenido.

**Sin borrado, sin columna `activo`.** Una OT que no va se marca `Cancelada`.
Es la excepción consciente al patrón de columna `activo` que usa el resto del
esquema: aquí el propio `estado` ya cumple ese papel, y una segunda bandera
solo podría desincronizarse.

**Índices.** `orden_trabajo_estado_idx` sobre `estado` (filtro del listado,
mismo patrón que `servicio_estado_idx`) y `orden_trabajo_servicio_id_idx`
sobre `servicio_id` (ver las OT de un Servicio).

**Consume:** `servicio`, `ot_correlativo`. **Consumida por:**
`modules/ordenes-trabajo/`.

---

## Correlativo de OT (tabla de apoyo)

Tabla `ot_correlativo`, en `db/schema/orden-trabajo.ts`. No es una entidad de
negocio: es el contador que hace que el `NNNN` de `OT.CCM.AAAA.NNNN` sea
único incluso con dos OT creadas a la vez.

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `anio` | `integer` (PK) | sí | automático — una fila por año |
| `ultimo` | `integer` | sí | automático — último número entregado ese año |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**Por qué no basta con `MAX(...) + 1`.** Dos OT creadas casi a la vez leerían
el mismo máximo y producirían el mismo código. La reserva del número se hace
en una sola sentencia atómica:

```sql
INSERT INTO ot_correlativo (anio, ultimo)
VALUES ($anio, 1)
ON CONFLICT (anio) DO UPDATE SET ultimo = ot_correlativo.ultimo + 1
RETURNING ultimo;
```

PostgreSQL toma el lock de la fila de ese año: una creación simultánea espera
a que la primera termine su transacción en vez de leer un valor obsoleto. Esa
sentencia y el `INSERT` de la OT van en la **misma transacción**, así que si
la OT falla el número no se consume y no quedan huecos.

**Por qué no una `sequence` de PostgreSQL.** Las secuencias no revierten con
la transacción (dejarían huecos) y reiniciarlas cada año exigiría un `ALTER`
programado.

**Red de seguridad.** El `UNIQUE` sobre `orden_trabajo.codigo_ot` existe por
si un cambio futuro se saltara el contador: la base de datos no acepta dos
códigos iguales aunque la aplicación se equivoque.

**Verificado en la base real (2026-09-18).** Seis creaciones simultáneas, cada
una en su propia conexión y transacción, devolvieron `OT.CCM.2026.0001` a
`0006`: seis códigos distintos, correlativos y sin huecos. Los datos de prueba
se borraron después.
