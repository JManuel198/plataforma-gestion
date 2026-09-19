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
