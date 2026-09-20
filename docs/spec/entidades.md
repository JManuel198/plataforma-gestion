# Entidades

Refleja lo que existe de verdad en `db/schema/`. Si el esquema cambia, este
documento cambia con él.

---

## Servicio — fusionada en Orden de Trabajo (2026-09-19)

**Esta entidad ya no existe.** El cliente confirmó que Servicio y Orden de
Trabajo son la misma cosa para él, y decidió que `orden_trabajo` absorbe
todo. La tabla `servicio` (y su enum `servicio_estado`) se eliminaron por
completo en las migraciones `0004_elite_wind_dancer.sql` (ajusta
`orden_trabajo`: enum, FK, índice y columnas) y `0005_smiling_sway.sql`
(`DROP TABLE servicio` + `DROP TYPE servicio_estado`, separada de la
anterior porque combinarlas en un solo archivo generaba un `DROP
CONSTRAINT` inválido — el `CASCADE` del `DROP TABLE` ya se había llevado
esa FK) — tenía 0 filas, no hubo
pérdida de datos real. Todo lo que describía esta sección ahora vive en
**Orden de Trabajo**, abajo. `modules/servicios/` y las rutas
`app/(protegido)/servicios/**` también se retiraron por completo.

---

## Orden de Trabajo (OT)

Entidad autónoma: ya no "nace de un Servicio" — desde la fusión del
2026-09-19, es a la vez el registro comercial (antes Servicio) y el
documento de ejecución. Definida en `db/schema/orden-trabajo.ts`, tabla
`orden_trabajo`. Origen: `alcance-v2-servicios-ot.md`, Fase 3, más los
campos absorbidos de Servicio, Fase 2.

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `id` | `text` (PK, UUID) | sí | automático |
| `codigo_ot` | `text` (**UNIQUE**) | sí | **automático** — formato `OT.CCM.AAAA.NNNN`, el usuario nunca lo escribe |
| `codigo_cotizacion` | `text` | sí | manual |
| `codigo_revision` | `text` | **no** | manual — ex `servicio.codigo_revision` (ahí era obligatorio; aquí queda opcional, mismo criterio que `codigo_oc`) |
| `servicio` | `text` | sí | manual — ex `asunto`, renombrada a pedido del cliente (2026-09-20), misma naturaleza |
| `codigo_oc` | `text` | **no** | manual — formato libre por cliente, suele llegar después |
| `cliente` | `text` | sí | manual — texto libre, sin tabla de Clientes todavía |
| `precio` | `bigint` (`mode: "number"` en Drizzle) | sí | manual — ex `servicio.precio`, **céntimos**, nunca decimal |
| `moneda` | `moneda` (enum) | sí | manual — ex `servicio.moneda`, `PEN` o `USD`, una sola por registro |
| `estado` | `ot_estado` (enum) | sí | manual — 7 valores, por defecto `Pendiente` |
| `fecha_creacion` | `timestamp` | sí | **automática** (`DEFAULT now()`) — nunca se pide al usuario |
| `responsable` | `text` | **no** | manual — nombre del técnico, texto libre (no hay tabla de Personal) |
| `comentarios` | `text` | **no** | manual — ex `servicio.comentarios` |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**Estados** (enum `ot_estado`): `Pendiente` · `Aceptada` · `En ejecución` ·
`Pausada` · `Finalizada` · `Facturado` · `Cancelada`. Lista propuesta al
fusionar Servicio (de donde viene `Facturado`) con los estados de ejecución
en campo que ya tenía la OT, más `Aceptada` (pedida por el cliente el
2026-09-20, entre `Pendiente` y `En ejecución`: marca que la OT ya tiene el
visto bueno para arrancar pero todavía no se trabaja en campo). **Pendiente
de confirmar con el cliente** — ver supuesto nuevo en `preguntas-abiertas.md`.

Desde 2026-09-19, `modules/ordenes-trabajo/constantes.ts` es la única fuente
de esta lista y también de `MONEDAS`: `db/schema/orden-trabajo.ts` importa los
dos arrays de ahí para construir sus `pgEnum`, ya no declara los suyos. No
queda ninguna lista de valores de enum duplicada entre el módulo y el esquema.

**Sin `servicio_id`.** La FK a `servicio` (con `ON DELETE RESTRICT`) se
eliminó junto con la tabla: una OT ya no depende de ningún otro registro para
existir. Los "campos duplicados a propósito" que describía esta sección ya
no aplican — no hay nada de qué duplicarse.

**Precio.** Mismo patrón que tenía `servicio.precio`: entero en céntimos
(regla 2 de AGENTS.md), `bigint` con `mode: "number"` en Drizzle (para no
arrastrar `BigInt` por el código — el techo técnico real es
`Number.MAX_SAFE_INTEGER`), siempre acompañado de su columna `moneda`. La
conversión monto↔céntimos y el techo de negocio (`PRECIO_MAXIMO_CENTIMOS`)
viven en el módulo: `modules/ordenes-trabajo/dinero.ts` (movido desde
Servicios, sin cambios) y `modules/ordenes-trabajo/schema.ts`.

**Sin borrado, sin columna `activo`.** Una OT que no va se marca `Cancelada`.
Es la excepción consciente al patrón de columna `activo` que usa el resto del
esquema: aquí el propio `estado` ya cumple ese papel, y una segunda bandera
solo podría desincronizarse.

**Índices.** `orden_trabajo_estado_idx` sobre `estado`, para el filtro del
listado. El índice `orden_trabajo_servicio_id_idx` se eliminó junto con la
columna que indexaba.

**Consume:** `ot_correlativo`. **Consumida por:** `modules/ordenes-trabajo/`.

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

---

## Personal

Primera tabla del nuevo módulo Personal (`modules/personal/`, en desarrollo
en paralelo). Definida en `db/schema/personal.ts`, tabla `personal`. No tiene
relación (todavía) con `user` de Better Auth: `user` es quién puede iniciar
sesión en la plataforma, `personal` es a quién se puede asignar trabajo — son
conceptos distintos aunque una misma persona pudiera algún día tener fila en
ambas.

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `id` | `text` (PK, UUID) | sí | automático |
| `nombre` | `text` | sí | manual |
| `apellido` | `text` | sí | manual |
| `cargo` | `text` | sí | manual — texto libre, no hay catálogo de cargos todavía |
| `dni` | `text` (**UNIQUE**) | sí | manual — identificador, no numérico: no se suma, puede llevar ceros a la izquierda y tiene longitud fija |
| `fecha_nacimiento` | `date` (mode `"string"` en Drizzle) | sí | manual — `YYYY-MM-DD` literal, sin hora |
| `activo` | `boolean`, default `true` | sí | automático al crear; manual al dar de baja |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**No existe columna `edad`.** Se calcula al mostrarla, a partir de
`fecha_nacimiento` — una columna `edad` quedaría desactualizada sola con el
paso del tiempo. Si una pantalla necesita ordenar o filtrar por edad, el
cálculo va en el backend a partir de `fecha_nacimiento`, nunca se persiste.

**`fecha_nacimiento` es `date`, no `timestamp`.** Una fecha de nacimiento no
tiene hora, y `timestamp` la habría metido en el problema de zonas horarias
que ya documenta AGENTS.md (el type parser y `parseInputDatesAsUTC` de
`db/index.ts`, que existen porque las columnas `timestamp` sin zona se corren
de día si el proceso no corre en UTC). Con `date` y `mode: "string"` el valor
entra y sale como `YYYY-MM-DD` literal — lo mismo que produce y consume un
`<input type="date">` — sin pasar por ninguna conversión.

**`activo` es baja lógica, no borrado.** Mismo criterio que `Cancelada` en
`orden_trabajo`, pero aquí sí es la bandera `activo` (no un enum de estado)
porque Personal no tiene un ciclo de estados propio que ya cumpla ese papel.
Dar de baja a alguien pone `activo = false`; nunca se borra la fila. Motivo
concreto: si `orden_trabajo.responsable` (hoy texto libre) llega a
convertirse algún día en FK a esta tabla, un DELETE real dejaría referencias
rotas.

**Índices.** `personal_activo_idx` sobre `activo`, mismo criterio que
`orden_trabajo_estado_idx`: el listado filtra por `activo` en la consulta por
defecto.

**Consume:** nada. **Consumida por:** `modules/personal/` (en desarrollo). Sin
relación todavía con `orden_trabajo.responsable`, que sigue siendo texto
libre — ver deuda técnica en AGENTS.md sobre esa columna.
