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
Ojo al leer esto hoy: la ruta `/servicios` volvió a existir en el Bloque 11
(2026-09-21), pero para el **catálogo maestro de servicios**, que no es esta
entidad. Es una pantalla "próximamente" sin modelo definido — ver
"Catálogos maestros" en `preguntas-abiertas.md`.

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
de confirmar con el cliente** — ver supuesto 12 de `preguntas-abiertas.md`.
La regla enunciada (los 7 en orden y por qué `Aceptada` va donde va) está en
`reglas-negocio.md`.

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

**`cargo` dejará de ser texto libre — forma ya decidida, construcción
pendiente.** Pasará a ser un campo de **búsqueda con autocompletado** contra
`tarifario_personal` (ver el borrador más abajo), no un `<select>`
tradicional: la lista de cargos crecerá y un desplegable plano se vuelve
inmanejable. Lo que está decidido es esa forma de interacción; lo que NO está
decidido es el modelo (si `cargo` pasa a ser FK a `tarifario_personal` o sigue
siendo texto validado contra él). **La construcción de esta conexión queda
para después de que `tarifario_personal` esté aprobado por el cliente** — hasta
entonces `cargo` sigue siendo `text` libre, con las consecuencias ya anotadas
en `preguntas-abiertas.md` (supuesto 3 de Personal).

**Índices.** `personal_activo_idx` sobre `activo`, mismo criterio que
`orden_trabajo_estado_idx`: el listado filtra por `activo` en la consulta por
defecto.

**Consume:** nada. **Consumida por:** `modules/personal/` (en desarrollo). Sin
relación todavía con `orden_trabajo.responsable`, que sigue siendo texto
libre — ver deuda técnica en AGENTS.md sobre esa columna.

---

## Materiales

Primer catálogo maestro de los cinco que declara el menú del Bloque 11
(Materiales, Lista de precios, Servicios, Tarifario de personal y EPPs) en
tener tabla real. Definida en `db/schema/materiales.ts`, tabla `materiales`.
Construida en el Bloque 12, Parte 1 (2026-09-21), consumida por
`modules/materiales/` (en desarrollo en paralelo).

**Sus campos siguen siendo un borrador sin confirmar con el cliente** — lo
que cambió con este bloque es que dejaron de ser una lista de nombres en este
documento para ser columnas reales, con tipo y obligatoriedad decididos. El
esquema implementado coincide con lo que estaba esbozado (mismos siete campos
de negocio, mismos nombres), así que esta entidad ya no lleva la marca
BORRADOR — pero su obligatoriedad y varias reglas de negocio siguen sin
confirmar, y eso sí sigue abierto (ver más abajo y
`preguntas-abiertas.md`, decisión 8 de "Catálogos maestros").

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `id` | `text` (PK, UUID) | sí | automático |
| `codigo_interno` | `text` (**UNIQUE**) | **no** | manual — el código que usa la empresa, distinto del de fábrica |
| `descripcion` | `text` | **no** | manual |
| `marca` | `text` | **no** | manual |
| `modelo` | `text` | **no** | manual |
| `codigo_fabrica` | `text` | **no** | manual — el del fabricante, distinto del interno |
| `unidad` | `text` | **no** | manual — unidad de medida, texto libre sin catálogo cerrado |
| `fecha_activacion` | `date` (mode `"string"` en Drizzle) | **no** | manual — fecha de activación del material, sujeta a una validación previa aún sin construir |
| `activo` | `boolean`, default `true` | sí | automático al crear; manual al inactivar desde el listado (Bloque 12, Parte 2) |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**Ningún campo de negocio es `NOT NULL`.** A diferencia de `personal` u
`orden_trabajo`, aquí no hay una fuente (ni un Excel, ni una reunión) de la
que inferir qué es obligatorio, así que se optó por la lectura literal de la
regla "solo `NOT NULL` donde sea evidente por el propio campo": ninguno de
los siete se consideró evidente. **Decisión asumida**, no confirmada — ver
decisión 8 de "Catálogos maestros" en `preguntas-abiertas.md`, con el camino
para endurecerlo (primero el Zod del módulo, después la columna).

**`UNIQUE` sobre `codigo_interno`, confirmado por el cliente (Bloque 12,
Parte 2): dos materiales no pueden compartir código interno.** La garantía
real es el `UNIQUE` de la base, no la validación del formulario — mismo
razonamiento que `personal.dni`. Sigue sin ser `NOT NULL`: solo se confirmó
la unicidad, no la obligatoriedad, y en Postgres varias filas con `NULL` no
chocan entre sí bajo un `UNIQUE`. `codigo_fabrica` sigue SIN `UNIQUE` — no
está confirmado que sea un identificador único, podría haber duplicados
mientras se depura el catálogo.

**`fecha_activacion` es `date`, no `timestamp`** — regla invariable 10 de
AGENTS.md, mismo patrón que `personal.fecha_nacimiento`: sin hora, sin el
problema de zona horaria de las columnas `timestamp` sin zona (ver la deuda
técnica de `db/index.ts`). Su significado ya está confirmado (Bloque 12,
Parte 2): es la fecha de activación del material, sujeta a una validación
previa que todavía no se construye (fuera de alcance por ahora). Lo que
sigue sin confirmar es si admite fechas futuras (un material podría
registrarse antes de completar esa validación) — no se impuso ningún `CHECK`
al respecto, a propósito.

**`activo` es baja lógica, no borrado** — regla invariable 9, mismo criterio
que `personal.activo`: Materiales no tiene un enum de estado propio que ya
cumpla ese papel. Hoy la columna existe y el listado (`listarMateriales`) ya
filtra por ella. Desde el Bloque 12, Parte 2, la pone en `false`
`cambiarActivoMaterial` (`modules/materiales/actions.ts`), disparada desde el
icono de inactivar del listado con un `alert-dialog` de confirmación delante.
El filtro «Ver solo inactivos» es lo que permite volver a verlas y
reactivarlas: sin él, inactivar sería irreversible de cara al usuario aunque
en la base no lo sea.

**Índices.** `materiales_activo_idx` sobre `activo`, mismo criterio que
`personal_activo_idx` y `orden_trabajo_estado_idx`: el listado filtra por
`activo` en la consulta por defecto.

**Consume:** nada. **Consumida por:** `modules/materiales/` (en desarrollo).
Sin relación todavía con `lista_precios.material` (borrador, más abajo): esa
relación —si el `material` de Lista de precios termina siendo una FK real en
vez de texto libre— es una decisión pendiente por separado (ver
"Catálogos maestros", decisión 3, en `preguntas-abiertas.md`).

---

# BORRADOR — Catálogos maestros (no confirmado con el cliente)

**Todo lo que sigue es un borrador temporal**, dicho así explícitamente por el
desarrollador: son los campos tal como se han esbozado hasta el Bloque 11
(2026-09-21), **no una especificación cerrada ni confirmada con el cliente**.
De los cinco catálogos maestros del menú, **Materiales ya tiene tabla real**
(ver la entidad "Materiales" más arriba); los otros cuatro —Lista de
precios, Servicios, Tarifario de personal y EPPs— siguen sin tabla en
`db/schema/`, y sus rutas (`/lista-precios`, `/servicios`,
`/tarifario-personal`, `/epps`) muestran una pantalla "próximamente".

A diferencia del resto de este documento, que refleja lo que existe de verdad
en `db/schema/`, esta sección va por delante del código. **No generes
migraciones a partir de esto sin confirmarlo antes.** Las dudas abiertas de
cada catálogo están en `preguntas-abiertas.md`, sección "Catálogos maestros".

Los tipos concretos (`text`, `bigint`, enum…) se deciden al construir cada
tabla; aquí solo está la lista de campos. Dos reglas del proyecto ya aplican
sin discusión cuando llegue ese momento: todo importe va en **céntimos**
(regla 2) y toda fecha sin hora va como **`date`**, no `timestamp` (regla 10).

## BORRADOR — Lista de precios

| Campo | Notas |
|---|---|
| código oferta | |
| material | **sin decidir** si es texto libre o relación real contra Materiales — ver preguntas-abiertas.md |
| proveedor | |
| unidad | |
| cantidad | |
| precio lista | importe, en céntimos |
| precio | importe, en céntimos — **sin decidir** si es independiente o se deriva de precio lista menos descuentos |
| descuentos | |
| moneda | mismo criterio que la OT: una sola por registro |
| fecha | |

## BORRADOR — Servicios (catálogo maestro)

**Ojo con el nombre:** este catálogo NO es la entidad Servicio fusionada en OT
el 2026-09-19 (ver la primera sección de este documento). Comparten nombre y
ruta (`/servicios`), y esa colisión está registrada como pregunta abierta.

| Campo | Notas |
|---|---|
| código | |
| servicio | |
| categoría | |
| unidad | |
| precio | importe, en céntimos |
| moneda | |
| comprobante | **sin decidir** si es texto (referencia/número) o un archivo real — si es archivo, es infraestructura nueva para el proyecto |
| fecha de actualización | **automática** en cada edición, nunca manual |

## BORRADOR — tarifario_personal

Es el catálogo contra el que se autocompletará el `cargo` de Personal (ver esa
sección más arriba).

| Campo | Notas |
|---|---|
| cargo | |
| nivel | **opcional** |
| costo por día | entero, en **céntimos** (regla 2) |
| moneda | |
| activo | baja lógica, nunca borrado (regla 9) |

## EPPs

Sin campos definidos todavía. Registrado en `preguntas-abiertas.md`; no se
esboza aquí para no inventar un modelo que nadie ha propuesto.
