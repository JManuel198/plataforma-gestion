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
| `precio` | `integer` | sí | manual — **céntimos**, nunca decimal |
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
multiplicando en coma flotante. Techo del tipo `integer`: 21 474 836.47 —
validado en `modules/servicios/schema.ts`; superarlo exigiría pasar la
columna a `bigint`.

**Índices.** `servicio_estado_idx` sobre `estado`, para el filtro del listado.

**Sin borrado.** No hay acción de eliminar: un servicio se cierra moviéndolo
a `Finalizado`, `Facturado` o `Rechazado`. Es el mismo criterio que el resto
del esquema — no se borran filas que otra tabla pueda referenciar (la OT de
la Fase 3 apuntará a `servicio.id`).

**Consume:** nada. **Consumida por:** `modules/servicios/`.
