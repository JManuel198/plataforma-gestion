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
(2026-09-21), y `modules/servicios/` en el Bloque 14 (2026-09-23), pero para
el **catálogo maestro de servicios**, que no es esta entidad. Ese catálogo
tiene hoy tabla propia (`servicios`) y pantalla con crear, ver, editar,
buscador y filtro de categoría — ver **Servicios (catálogo maestro)** más
abajo.

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
de esta lista: `db/schema/orden-trabajo.ts` importa el array de ahí para
construir su `pgEnum`, ya no declara el suyo. No queda ninguna lista de valores
de enum duplicada entre el módulo y el esquema.

`MONEDAS` ya NO vive ahí: desde el Bloque 13, Parte 1 (2026-09-22) está en
`core/monedas.ts`, y el `pgEnum` lo construye `db/schema/moneda.ts`. El motivo
es que `lista_precios.moneda` usa el MISMO enum de PostgreSQL, y una lista
compartida por dos módulos no puede vivir dentro de uno de ellos (AGENTS.md,
Arquitectura). `ESTADOS_OT` se quedó en el módulo porque es del ciclo de vida
de la OT y de nadie más. El tipo en Postgres sigue llamándose `moneda`: el
movimiento no generó ninguna migración.

**Sin `servicio_id`.** La FK a `servicio` (con `ON DELETE RESTRICT`) se
eliminó junto con la tabla: una OT ya no depende de ningún otro registro para
existir. Los "campos duplicados a propósito" que describía esta sección ya
no aplican — no hay nada de qué duplicarse.

**Precio.** Mismo patrón que tenía `servicio.precio`: entero en céntimos
(regla 2 de AGENTS.md), `bigint` con `mode: "number"` en Drizzle (para no
arrastrar `BigInt` por el código — el techo técnico real es
`Number.MAX_SAFE_INTEGER`), siempre acompañado de su columna `moneda`. La
conversión monto↔céntimos vive en `core/dinero.ts` desde el Bloque 13, Parte 1
(2026-09-22) — estuvo en `modules/ordenes-trabajo/dinero.ts` mientras la OT era
la única entidad con importes, y se movió al aparecer la segunda
(`lista_precios`). El techo de negocio (`PRECIO_MAXIMO_CENTIMOS`) sí sigue en
`modules/ordenes-trabajo/schema.ts`: es un límite de ESTA entidad, no una
conversión compartida.

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

## Correlativo genérico (tabla de apoyo)

Tabla `correlativo`, en `db/schema/correlativo.ts`. Creada en el Bloque 12,
Parte 3 (2026-09-22) para que `materiales.codigo_interno` se autogenere con
el formato `MAT.0000001`. No es una entidad de negocio, igual que
`ot_correlativo` — es el hermano genérico de esa misma tabla, no su
reemplazo (ver más abajo).

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `clave` | `text` (PK) | sí | automático — el ÁMBITO del contador, ej. `"materiales"` |
| `ultimo` | `integer` | sí | automático — último número entregado en ese ámbito |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**Mismo mecanismo de reserva atómica que `ot_correlativo`:**

```sql
INSERT INTO correlativo (clave, ultimo)
VALUES ($clave, $inicial)
ON CONFLICT (clave) DO UPDATE SET ultimo = correlativo.ultimo + 1
RETURNING ultimo;
```

PostgreSQL toma el lock de la fila de esa `clave`: una reserva simultánea
espera a que la primera transacción termine en vez de leer un valor
obsoleto. Esa sentencia y el `INSERT` de la fila que consume el número (hoy,
un material) van en la **misma transacción**, así que si esa fila falla el
número no se consume y no quedan huecos. Por el mismo motivo que
`ot_correlativo` tampoco es una `sequence` de PostgreSQL: las secuencias no
revierten con la transacción y dejarían huecos permanentes.

**En qué se diferencia de `ot_correlativo`, y por qué no la reemplaza.** El
correlativo de OT reinicia cada año, así que su PK es literalmente el año
(`anio integer`). Este correlativo es global y **nunca reinicia**, así que
generalizar exigía cambiar la PK por el ÁMBITO del contador (`clave text`) en
vez de un año — forzar un año falso en `ot_correlativo` para reusarla habría
ensuciado lo que ya funciona ahí. `ot_correlativo` ya tiene datos reales de
producción y sigue funcionando: no se toca ni se migra. Si algún día se
decide consolidar los dos, el camino es mover el contador de OT a una fila de
esta tabla con una clave como `"orden-trabajo:2026"` (una por año) — hasta
entonces conviven a propósito.

**Consumida por:** `core/correlativo.ts` (`reservarCorrelativo`), que
cualquier módulo puede llamar pasándole su propia `clave`. Hoy hay **cinco
ámbitos en uso**, y que cada uno entrara sin tocar ni la tabla ni la
migración es la prueba de que la generalización era la correcta:

| `clave` | Formato | Quién lo usa |
|---|---|---|
| `"materiales"` | `MAT.0000001` — prefijo `MAT`, 7 dígitos | `materiales.codigo_interno` (Bloque 12, Parte 3) |
| `"lista_precios"` | `OFFT.0000001` — prefijo `OFFT`, 7 dígitos | `lista_precios.codigo_oferta` (Bloque 13, Parte 1) |
| `"servicios"` | `SRV.0000001` — prefijo `SRV.`, 7 dígitos | `servicios.codigo` (Bloque 14, Parte 1) |
| `"tarifario_personal"` | `PRS.0001` — prefijo `PRS.`, **4 dígitos** (no 7) | `tarifario_personal.codigo` (Bloque 15, Parte 1) |
| `"epps"` | `EPP.000001` — prefijo `EPP.`, **6 dígitos** (ni 7 ni 4) | `epps.codigo` (Bloque 16, Parte 1) |

Los cinco son globales y sin año. Cada módulo declara sus propias
constantes (prefijo, dígitos, inicial y clave) junto a su `codigo.ts` — ver
`modules/materiales/constantes.ts`, `modules/lista-precios/constantes.ts`,
`modules/servicios/constantes.ts`, `modules/tarifario-personal/constantes.ts`
y `modules/epps/constantes.ts`. Añadir un ámbito nuevo **no exige
migración**: es una fila más, creada por el propio upsert la primera vez que
se reserva. El número de dígitos es una constante por ámbito, no un valor
fijo de la tabla: `tarifario_personal` fue el primero en usar 4 en vez de 7,
`epps` usa 6, y no hay nada en `correlativo` que impida un cuarto ancho
distinto si hiciera falta.

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

**DESCARTADO (2026-09-23): no habrá conexión entre `cargo` y
`tarifario_personal`.** Esta sección describía un plan —`cargo` pasando a ser
un campo de búsqueda con autocompletado contra `tarifario_personal`, con el
modelo exacto (FK o texto validado) todavía por decidir— que quedó sin
construir a la espera de que `tarifario_personal` se aprobara con el cliente.
Al aprobarse, el cliente confirmó explícitamente que Personal y el nuevo
Tarifario de personal **no** deben tener ninguna relación entre sí. No fue un
olvido ni quedó pendiente: fue una decisión directa del cliente. `cargo` se
queda como `text` libre, sin catálogo ni autocompletado, con las
consecuencias ya anotadas en `preguntas-abiertas.md` (supuesto 3 de Personal).

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

**Bloque 12, Parte 3 (2026-09-22): quedaron seis campos de negocio, no
siete.** `fecha_activacion` se eliminó (ver más abajo) y `codigo_interno`
dejó de ser un campo que el usuario llena para pasar a autogenerarse — los
detalles de las dos cosas están en los párrafos siguientes.

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `id` | `text` (PK, UUID) | sí | automático |
| `codigo_interno` | `text` (**UNIQUE**) | **no** | **automático** — generado con el correlativo, formato `MAT.0000001` |
| `descripcion` | `text` | **no** | manual |
| `marca` | `text` | **no** | manual |
| `modelo` | `text` | **no** | manual |
| `codigo_fabrica` | `text` | **no** | manual — el del fabricante, distinto del interno |
| `unidad` | `text` | **no** | manual — unidad de medida, texto libre con sugerencias de una lista fija (`core/unidades.ts`), sin restricción en la base ni en el Zod — ver la ficha de Lista de precios más abajo, "`unidad` es texto libre en las dos tablas" |
| `activo` | `boolean`, default `true` | sí | automático al crear; manual al inactivar desde el listado (Bloque 12, Parte 2) |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**Ningún campo de negocio es `NOT NULL`.** A diferencia de `personal` u
`orden_trabajo`, aquí no hay una fuente (ni un Excel, ni una reunión) de la
que inferir qué es obligatorio, así que se optó por la lectura literal de la
regla "solo `NOT NULL` donde sea evidente por el propio campo": ninguno de
los siete se consideró evidente. **Decisión asumida**, no confirmada — ver
decisión 8 de "Catálogos maestros" en `preguntas-abiertas.md`, con el camino
para endurecerlo (primero el Zod del módulo, después la columna).

**`codigo_interno` pasó de manual a autogenerado (Bloque 12, Parte 3,
2026-09-22).** Formato `MAT.0000001` — prefijo `MAT.` fijo, correlativo
global de 7 dígitos con ceros a la izquierda, que **nunca reinicia** (a
diferencia del correlativo anual de OT). Se reserva con la tabla `correlativo`
(ver la ficha nueva más abajo), con clave `"materiales"`. El `UNIQUE` de la
columna **sigue existiendo** pero cambia de papel: ya no es la validación de
una interacción esperada del usuario (que podía escribir dos veces el mismo
código), sino la red de seguridad del generador — exactamente el mismo papel
que cumple el `UNIQUE` de `orden_trabajo.codigo_ot` frente a
`ot_correlativo`. Sigue sin ser `NOT NULL`: el generador lo llena siempre,
pero la columna en sí no lo exige. `codigo_fabrica` sigue SIN `UNIQUE` — no
está confirmado que sea un identificador único, podría haber duplicados
mientras se depura el catálogo.

**La fecha que muestra la interfaz (tabla y vista de detalle) es
`created_at`, no una columna de negocio propia.** La columna `fecha_activacion`
existió como `date` independiente (Bloque 12, Parte 2) y se eliminó en el
Bloque 12, Parte 3 (2026-09-22): la tabla seguía con 0 filas, así que no hubo
pérdida de datos real, y no se agregó ninguna columna de reemplazo — `created_at`
ya cubre "cuándo entró este material" sin necesidad de una segunda fecha.

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

**Tabla hija: `material_caracteristicas`** (ficha propia más abajo, justo
después de "Correlativo genérico"). Guarda la lista de características
técnicas de cada material, una fila por línea. A diferencia del resto de
tablas de este esquema, esa tabla **no lleva columna `activo`** y permite
DELETE real — es una excepción deliberada, razonada en su propia ficha.

**Consume:** nada. **Consumida por:** `modules/materiales/` (en desarrollo) y,
desde el Bloque 13, Parte 1 (2026-09-22), `lista_precios.material_id` — ver la
entidad "Lista de precios" más abajo. La relación que aquí se dejaba como
pendiente ("Catálogos maestros", decisión 3 de `preguntas-abiertas.md`) ya se
resolvió: es una FK real, no texto libre.

---

## Lista de precios

Segundo catálogo maestro de los cinco que declara el menú (Bloque 11) en
tener tabla real, después de Materiales. Definida en
`db/schema/lista-precios.ts`, tabla `lista_precios`. Construida en el
Bloque 13, Parte 1 (2026-09-22), consumida por `modules/lista-precios/` (en
desarrollo en paralelo, fuera del alcance de este documento).

Este bloque resuelve las dos decisiones que "Catálogos maestros" dejaba
pendientes específicamente para esta tabla en `preguntas-abiertas.md`:
**decisión 3** (`material` es una FK real contra `materiales`, no texto
libre) y **decisión 4** (`precio` se deriva, no es una columna independiente
— ver más abajo).

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `id` | `text` (PK, UUID) | sí | automático |
| `codigo_oferta` | `text` (**UNIQUE**) | sí | **automático** — formato `OFFT.0000001`, 7 dígitos, correlativo global sin segmento de año |
| `material_id` | `text` (FK → `materiales.id`) | sí | manual — selección contra el catálogo de Materiales |
| `proveedor` | `text` | no | manual — **texto libre**, con sugerencias de los proveedores ya usados (ver abajo) |
| `unidad` | `text` | no | manual — texto libre con sugerencias de una lista fija en la interfaz, sin `pgEnum` ni CHECK (ver más abajo) |
| `cantidad` | `numeric(14,3)` (mode `"string"` en Drizzle) | no | manual |
| `precio_lista` | `bigint` (`mode: "number"` en Drizzle) | no | manual — céntimos, nunca decimal |
| `descuento` | `numeric(5,2)` (mode `"string"` en Drizzle), default `0` | sí | automático (`0`) si no se especifica; manual — porcentaje 0–100, con `CHECK` en la base |
| `moneda` | `moneda` (enum, compartido con `orden_trabajo`) | no | manual |
| `activo` | `boolean`, default `true` | sí | automático al crear; manual al inactivar o reactivar desde el listado (baja lógica, regla invariable 9) |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**No existe columna `precio`.** Es la decisión central de esta tabla. El
precio que se muestra al usuario se calcula siempre al leer la fila:

```
precio = precio_lista × (1 − descuento / 100)
```

y nunca se guarda. Mismo principio exacto que `edad` en Personal, que es
función de `fecha_nacimiento` y no una columna propia («la edad no es un
dato, es una consecuencia de dos fechas» — comentario de `calcularEdad` en
`lib/fecha.ts`): aquí el precio es consecuencia de `precio_lista` y
`descuento`, no un tercer dato capturado a mano. Guardarlo como columna
habría creado un número que puede contradecir a los otros dos —se edita
`precio_lista` o `descuento` y `precio` queda desactualizado, o los tres se
capturan sueltos y nunca cuadran entre sí—, y calcularlo en el backend es
además lo que exige la regla invariable 1 de AGENTS.md (el frontend nunca
calcula, solo muestra). El sitio del cálculo es `modules/lista-precios/`,
fuera del alcance del esquema.

**`material_id` es una FK real, no texto libre.** Resuelve la decisión 3 de
"Catálogos maestros": la lista de precios no admite filas de materiales que
no estén ya en el catálogo. `NOT NULL` porque una fila sin material no tiene
sentido de negocio. Sin `onDelete` explícito (queda en el `NO ACTION` por
defecto de Postgres/Drizzle): Materiales nunca se borra de verdad (regla
invariable 9, baja lógica), así que esa protección por defecto es
justamente la correcta — es la FK que vuelve real el aviso que ya dejaba
escrito el comentario de `cambiarActivoMaterial` en
`modules/materiales/actions.ts` sobre filas de precios señalando a un
material que ya no existe. Índice `lista_precios_material_id_idx`: el listado
hace JOIN contra `materiales` para mostrar su descripción.

**`proveedor` es texto libre y NO tiene tabla propia — pero el formulario
sugiere los ya usados.** Es la otra mitad de la decisión 3: el material se
eligió como relación real, el proveedor no. No hay entidad Proveedor en
ninguna parte del sistema, así que el "catálogo" de proveedores es
literalmente lo ya escrito en otras filas de esta tabla: el modal consulta
un `SELECT DISTINCT proveedor … ILIKE` sobre `lista_precios`
(`buscarProveedores` en `modules/lista-precios/queries.ts`) y ofrece las
coincidencias mientras se teclea.
Lo que eso resuelve es la disgregación por tecleo —"Ferretería Lima" y
"ferreteria lima" conviviendo como si fueran dos proveedores—; lo que
deliberadamente NO hace es impedir un nombre nuevo, porque con la tabla
vacía no habría nada que sugerir y la primera oferta del sistema no se
podría guardar. Las sugerencias **no filtran por `activo`**: el proveedor de
una oferta inactivada sigue siendo un proveedor real, y esconderlo
provocaría justo el tecleo divergente que esto evita.
**Si algún día se confirma que Proveedor es una entidad** (con RUC,
contacto, condiciones de pago), esto se convierte en una FK como
`material_id` y la migración tiene que mapear los textos existentes a filas
—con los duplicados por tecleo que hayan entrado— antes de imponerla. Las
sugerencias reducen ese trabajo futuro, no lo eliminan.

**`codigo_oferta` usa un correlativo global, sin año, distinto del de la
OT.** Formato `OFFT.0000001` (7 dígitos), reservado atómicamente con la
misma técnica que `ot_correlativo` pero desde la tabla genérica
`correlativo` (ver su ficha, más arriba), con la clave `"lista_precios"` —
la segunda de esa tabla, después de la de Materiales. `NOT NULL` porque lo
pone siempre el backend; `UNIQUE` como red de seguridad del contador — mismo
papel que `orden_trabajo.codigo_ot`.

**`cantidad` y `descuento` son `numeric` con `mode: "string"`, nunca
`float`.** Mismo razonamiento que la regla invariable 2 sobre montos,
aplicado aquí porque una operación aritmética en coma flotante de JS puede
perder precisión igual de mal en una cantidad o un porcentaje que en un
importe. `cantidad` usa `numeric(14,3)`: un material puede venderse por
fracción (2.5 m, 0.75 kg). `descuento` usa `numeric(5,2)` con `default("0")`:
dos decimales de porcentaje es precisión de sobra y cabe cómodo en el rango
0–100.

**`descuento` sí lleva `CHECK` de rango 0–100 — a diferencia de
`fecha_activacion` de Materiales, donde se evitó a propósito.** La diferencia
es que ahí el rango no estaba confirmado por el cliente y ponerlo habría
asumido una respuesta; aquí el rango 0–100 vino dado explícitamente. Un
descuento fuera de ese rango haría que el precio calculado salga negativo o
mayor que el de lista, lo cual no tiene lectura de negocio válida bajo
ninguna interpretación.

**`precio_lista` es `bigint` con `mode: "number"`, idéntico patrón que
`orden_trabajo.precio`.** La columna en Postgres es de 8 bytes; Drizzle la
mapea a `number` de JS para no arrastrar `BigInt` por el código (helpers de
`core/dinero.ts`, formularios, `JSON.stringify` en las Server Actions). El
techo técnico real es `Number.MAX_SAFE_INTEGER`; el límite de negocio se
valida en `modules/lista-precios/schema.ts`, no en la columna.

**`unidad` es texto libre en las dos tablas — decisión unificada
(2026-09-22).** Hasta este cambio, Materiales trataba `unidad` como texto
libre sin ninguna sugerencia y Lista de precios la restringía a una lista
cerrada de 6 valores mediante `z.enum(UNIDADES)` en
`modules/lista-precios/schema.ts` — la columna en Postgres nunca estuvo
restringida en ninguna de las dos tablas, la única restricción vivía en ese
Zod. Esa inconsistencia era justo la que registraba la decisión 12 de
"Catálogos maestros" en `preguntas-abiertas.md`, y se resolvió a favor de
texto libre en ambas: la columna sigue siendo `text` nullable, sin `pgEnum`
ni `CHECK`, en `materiales.unidad` y en `lista_precios.unidad` por igual.
**Verificado contra la base real de Neon (2026-09-22):** ninguna de las dos
columnas tenía CHECK ni ENUM asociado — se consultó `information_schema.columns`
y `pg_constraint` para ambas tablas; los únicos enums existentes en la base
son `moneda` y `ot_estado`, ninguno relacionado con `unidad`. No hizo falta
ninguna migración porque no había nada que quitar de la base.
La lista de valores conocidos —`m`, `und`, `pzs`, `cja`, `kg`, `lt`, y desde
este cambio también `gal`— se movió a `core/unidades.ts` (antes vivía solo en
`modules/lista-precios/constantes.ts`), compartida entre Materiales y Lista
de precios, y Servicios cuando se construya (regla de AGENTS.md: lo que usan
dos o más módulos sube a `core/`, mismo criterio que `MONEDAS` en
`core/monedas.ts`). Deja de ser una restricción de Zod y pasa a ser
SUGERENCIA de interfaz —vía `core/components/campo-lista-sugerida.tsx`—: el
usuario puede escribir y guardar un valor que no esté en la lista (p. ej.
"rollo"), igual que ya podía hacerlo con `proveedor` en esta misma tabla (ver
arriba).
**El día que el cliente confirme una lista exhaustiva** (decisión 13 de
"Catálogos maestros", que sigue abierta), el sitio correcto para endurecerla
SÍ sigue siendo un `pgEnum` construido desde `UNIDADES`, igual que
`otEstadoEnum` se construye desde `ESTADOS_OT` — esa decisión no se ha
tomado todavía, y este cambio no la prejuzga.

**Obligatoriedad del resto, mismo criterio que Materiales — con una
excepción deliberada.** `proveedor`, `unidad`, `cantidad`, `precio_lista` y
`moneda` quedan nullable en la columna aunque el formulario los exija: el
Zod del módulo puede ser más estricto que la tabla, nunca al revés — mismo
patrón en dos capas que `responsable` de la OT y los siete campos de
Materiales. **`descuento` es la excepción: es `NOT NULL`.** Ahí ese
criterio no aplica, porque `NULL` y `'0'` no son dos formas legítimas de
decir "no sé" y "sin descuento" — "sin descuento" ya tiene una
representación exacta, que es `0`, y dejar la columna nullable crearía dos
formas de decir lo mismo (justo lo que advierte el comentario de
`textoOpcional` en `modules/materiales/schema.ts`). Lo que decide, más que
eso: el precio se DERIVA de `descuento` (ver arriba); con `descuento` en
NULL el precio de esa fila no queda "desconocido", queda **incalculable**, y
la única salida sería un `?? "0"` en el cálculo — la segunda representación
que se quiere evitar. `NOT NULL DEFAULT '0'` hace que la columna nunca
pueda quedar en un estado donde ese cálculo no esté definido: mismo
criterio exacto por el que `activo` es `NOT NULL` en Materiales, no una
regla de negocio sin confirmar.

**`moneda` reutiliza el mismo enum de PostgreSQL que `orden_trabajo.moneda`,
no uno propio.** El `pgEnum("moneda", MONEDAS)` se movió el 2026-09-22 de
`db/schema/orden-trabajo.ts` a su propio archivo, `db/schema/moneda.ts` —
ninguna de las dos tablas que lo usan debe parecer la dueña de un enum que
comparten. El tipo en PostgreSQL sigue llamándose `moneda`; el movimiento no
generó ningún DDL (la migración `0010_many_psylocke.sql` no crea ni altera
el enum, solo lo referencia al crear la columna).

**`activo` es baja lógica, no borrado** — regla invariable 9, mismo criterio
que `materiales.activo`. La columna entra en este bloque; la acción que la
escribe (inactivar/reactivar desde el listado) es Parte 2, igual que ocurrió
con Materiales.

**Índices.** `lista_precios_activo_idx` sobre `activo` (mismo criterio que
`materiales_activo_idx`: el listado filtra por `activo` por defecto) y
`lista_precios_material_id_idx` sobre `material_id` (el JOIN del listado
contra `materiales`).

**Consume:** `materiales` (FK de `material_id`), `correlativo` (clave
`"lista_precios"`). **Consumida por:** `modules/lista-precios/` (en
desarrollo).

---

## Material — características técnicas (tabla hija de Materiales)

Tabla `material_caracteristicas`, en `db/schema/material-caracteristicas.ts`.
Creada en el Bloque 12, Parte 4 (2026-09-22). Guarda la lista de
características técnicas de un material (p.ej. "resistente al agua", "IP65",
"incluye batería") — una fila por línea de texto, no una columna con todo el
texto junto, para poder ordenarlas y editarlas una por una desde el modal de
Materiales.

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `id` | `text` (PK, UUID) | sí | automático |
| `material_id` | `text` (FK → `materiales.id`, `ON DELETE CASCADE`) | sí | automático — el material al que pertenece |
| `texto` | `text` | sí | manual |
| `orden` | `integer` | sí | **automático** — posición de entrada, no un campo de negocio |
| `created_at` | `timestamp` | sí | automático |

**Sin `updated_at`.** A diferencia del resto de tablas del esquema, esta no
lleva columna de actualización: una característica no se edita in place, se
borra y se vuelve a crear si el texto cambia (así lo maneja el modal de
Materiales) — no hay ningún UPDATE que `updated_at` necesite reflejar.

**`orden` es la posición de entrada, no un campo de negocio que el usuario
elija.** Entero base 0 que asigna la aplicación según la posición en que se
escribió cada característica en el formulario, para que al reabrir el modal
aparezcan en el mismo orden en que se capturaron. El usuario no lo ve ni lo
edita directamente — no hay un control de "mover arriba/abajo" en este
bloque.

**EXCEPCIÓN DELIBERADA A LA REGLA INVARIABLE 9 de AGENTS.md** ("ningún
registro se borra en operación normal — se desactiva"). Esta tabla **sí
permite DELETE real** y, a propósito, **no lleva columna `activo`**.

La razón: una característica no es una entidad de negocio independiente como
Cliente, Personal o un propio Material — es metadata descriptiva que solo
existe colgando de su material, y **nada más en el sistema la referencia**
(ninguna FK apunta a `material_caracteristicas`). Quitar una característica
de la lista ES la operación que el usuario quiere hacer; no hay un "estado
inactivo" que signifique algo distinto de "ya no está en la lista".

Compárese con la otra excepción ya razonada en este documento, la de
`orden_trabajo` (ver más arriba): ahí tampoco hay columna `activo`, pero
porque el propio enum `estado` ya llega a `Cancelada` y cumple ese papel —
sigue habiendo una bandera, solo que es una que ya existía por otro motivo.
Aquí no hay ningún enum ni bandera equivalente: no hace falta ninguna,
porque la fila deja de tener sentido en el momento en que el usuario decide
quitarla.

Si algún día otra tabla llegara a referenciar una característica (una FK
apuntando a `material_caracteristicas.id`), esta excepción deja de ser
válida y hay que revisarla: en ese momento una característica pasaría a
comportarse como una entidad con vida propia, no como metadata desechable, y
correspondería añadir la baja lógica como al resto del esquema.

**`onDelete: "cascade"` en la FK a `materiales`.** Si un material desaparece
de verdad (DELETE real — Materiales en sí usa baja lógica con `activo`, esto
solo aplicaría si alguna vez se purgara la tabla), sus características no
tienen sentido sin él. Es coherente con la excepción de arriba: son metadata
del material, no entidades con vida propia fuera de él.

**Índices.** `material_caracteristicas_material_id_idx` sobre `material_id`,
para listar rápido las características de un material dado.

**Consume:** `materiales` (vía `material_id`). **Consumida por:**
`modules/materiales/` (en desarrollo).

---

# BORRADOR — Catálogos maestros (no confirmado con el cliente)

**Todo lo que sigue describía, hasta el Bloque 11 (2026-09-21), un borrador
temporal sin tabla real.** Con el Bloque 16, Parte 1 (2026-09-23), los
**cinco** catálogos maestros del menú —Materiales, Lista de precios,
Servicios, Tarifario de personal y EPPs— **ya tienen tabla real** en
`db/schema/` (Materiales y Lista de precios más arriba, fuera de esta
sección; Servicios, Tarifario de personal y EPPs abajo, como fichas
completas dentro de ella); ninguna ruta del menú muestra ya una pantalla
"próximamente" por falta de esquema. Varios campos y reglas de negocio de
estos catálogos siguen sin confirmar con el cliente, y esas dudas concretas
siguen abiertas en `preguntas-abiertas.md` (sección "Catálogos maestros") —
lo que cambió aquí es que dejaron de ser un borrador sin tabla para ser
columnas reales con tipo y obligatoriedad decididos, exactamente el mismo
tránsito que ya documentaba la ficha de Materiales más arriba.

A diferencia del resto de este documento, que refleja lo que existe de verdad
en `db/schema/`, lo que quede de borrador en las fichas de abajo (si algo
todavía difiere de la tabla real) va por delante del código. **No generes
migraciones a partir de un borrador sin confirmarlo antes.**

Los tipos concretos (`text`, `bigint`, enum…) se deciden al construir cada
tabla; aquí solo está la lista de campos. Dos reglas del proyecto ya aplican
sin discusión cuando llegue ese momento: todo importe va en **céntimos**
(regla 2) y toda fecha sin hora va como **`date`**, no `timestamp` (regla 10).

## Servicios (catálogo maestro)

Tercer catálogo maestro de los cinco que declara el menú (Bloque 11) en tener
tabla real, después de Materiales y Lista de precios. Definida en
`db/schema/servicios.ts`, tabla `servicios`. Construida en el Bloque 14,
Parte 1 (2026-09-23), consumida por `modules/servicios/` (en desarrollo en
paralelo, fuera del alcance de este documento).

**Ojo con el nombre: esta tabla NO es la entidad `Servicio` fusionada en
Orden de Trabajo el 2026-09-19** (ver "Servicio — fusionada en Orden de
Trabajo" al principio de este documento, y la decisión 7 de "Catálogos
maestros" en `preguntas-abiertas.md` sobre la colisión de nombre en la ruta
`/servicios`). Aquella era el ciclo de vida completo de un trabajo (estado,
responsable, fechas de ejecución) y ya no existe como entidad separada — todo
lo que describía vive hoy en `orden_trabajo`. Esta es un catálogo de
**servicios con precios fijos reutilizables**, sin estado ni ciclo de vida
propio: la entidad que `docs/spec/alcance-v2-servicios-ot.md` difería a su
sección 5. Comparten nombre y ruta (`/servicios`) por coincidencia de
vocabulario del cliente, no porque sean la misma cosa.

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `id` | `text` (PK, UUID) | sí | automático |
| `codigo` | `text` (**UNIQUE**) | sí | **automático** — formato `SRV.0000001`, 7 dígitos, correlativo global sin segmento de año |
| `servicio` | `text` | no | manual — nombre/descripción del servicio |
| `categoria` | `text` | no | manual — lista fija de interfaz sin cerrar (ver abajo) |
| `unidad` | `text` | no | manual — texto libre con sugerencias, sin `pgEnum` ni CHECK (ver "Lista de precios" arriba) |
| `precio` | `bigint` (`mode: "number"` en Drizzle) | no | manual — céntimos, nunca decimal; **directo, no derivado** (ver abajo) |
| `moneda` | `moneda` (enum, compartido con `orden_trabajo` y `lista_precios`) | no | manual |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**`codigo` usa el correlativo genérico, ámbito `"servicios"` — tercera clave
de esa tabla.** Formato `SRV.0000001` (7 dígitos), reservado atómicamente con
la misma técnica que `materiales.codigo_interno` y
`lista_precios.codigo_oferta`, desde la tabla `correlativo` (ver su ficha más
arriba). Global, sin segmento de año, igual que las otras dos. `NOT NULL`
porque lo pone siempre el backend; `UNIQUE` como red de seguridad del
contador, mismo papel que `orden_trabajo.codigo_ot`. La tabla de ámbitos de
"Correlativo genérico" (arriba) ya incluye esta tercera fila.

**`categoria` es `text`, a propósito NO un `pgEnum`.** Mismo criterio exacto
que `lista_precios.unidad` frente a `ot_estado`/`moneda`: un `pgEnum` exige
una migración para añadir o quitar un valor, y la lista propuesta (alquiler,
fabricación, consultoría, alimentación, otros) es un borrador que nadie ha
confirmado como exhaustivo con el cliente — pregunta abierta en
`preguntas-abiertas.md`. La lista fija vive del lado de la aplicación, en
`modules/servicios/constantes.ts` (`CATEGORIAS_SERVICIO`); la columna en
Postgres no la restringe. El día que el cliente la cierre, el sitio correcto
es un `pgEnum` construido desde esa constante, igual que `otEstadoEnum` se
construye desde `ESTADOS_OT`.

**`unidad` es texto libre con sugerencias desde el primer día**, sin pasar
por la fase de lista cerrada que tuvo `lista_precios.unidad` antes del
2026-09-22 — llega directamente al estado final que comparten Materiales y
Lista de precios (ver esa ficha arriba). Sin CHECK ni ENUM en la base.

**`precio` es un campo directo, no derivado — a diferencia de
`lista_precios.precio`.** Es la diferencia de fondo entre las dos tablas
hermanas: Lista de precios NO tiene columna `precio` porque se calcula de
`precio_lista × (1 − descuento / 100)` (ver esa ficha arriba). Este catálogo
no tiene `precio_lista` ni `descuento` — no hay nada de lo que derivar un
precio, así que `precio` es simplemente el importe que se captura. Mismo tipo
que `orden_trabajo.precio` y `lista_precios.precio_lista`: `bigint` con
`mode: "number"` en Drizzle, céntimos, nunca `float` (regla invariable 2). El
límite de negocio (equivalente a `PRECIO_MAXIMO_CENTIMOS`) se valida en
`modules/servicios/schema.ts`, no en la columna.

**SIN columna `activo`, y es deliberado — hoy esta tabla NO cumple la regla
invariable 9 por ausencia de mecanismo, no porque se haya decidido que no
aplica.** Inactivar/reactivar un servicio no está confirmado con el cliente;
añadir la columna antes de saber si hace falta presupondría una respuesta que
no existe — pregunta abierta en `preguntas-abiertas.md`. Contrasta con
`lista_precios.activo`, que sí entró de antemano en su primera migración
porque la baja lógica de esa tabla ya estaba decidida. Si se confirma que
Servicios necesita baja lógica, el camino es una migración que añada
`activo boolean DEFAULT true NOT NULL`, mismo patrón que las otras tablas.

**Obligatoriedad, mismo criterio que Materiales y Lista de precios.**
`servicio`, `categoria`, `unidad`, `precio` y `moneda` quedan nullable en la
columna: el Zod de `modules/servicios/schema.ts` puede ser más estricto que
la tabla, nunca al revés.

**Sin índices.** No hay columna `activo` que filtrar en el listado por
defecto ni ninguna FK que sostenga un JOIN — a diferencia de `lista_precios`,
no hay caso real hoy que justifique uno.

**Consume:** `correlativo` (clave `"servicios"`). **Consumida por:**
`modules/servicios/` (en desarrollo).

## Tarifario de personal (catálogo maestro)

Cuarto catálogo maestro de los cinco que declara el menú (Bloque 11) en tener
tabla real, después de Materiales, Lista de precios y Servicios. Definida en
`db/schema/tarifario-personal.ts`, tabla `tarifario_personal`. Construida en
el Bloque 15, Parte 1 (2026-09-23), consumida por
`modules/tarifario-personal/` (en desarrollo en paralelo, fuera del alcance
de este documento).

**SIN NINGUNA RELACIÓN CON `personal` — descartada explícitamente por el
cliente el 2026-09-23, no un olvido.** El borrador que esta sección
reemplaza describía un plan distinto: `cargo` de Personal pasando a ser un
campo con autocompletado contra este tarifario. El cliente confirmó que las
dos tablas deben quedar independientes. `cargo` es texto libre en las dos
tablas — `personal.cargo` y `tarifario_personal.cargo` — sin FK en ninguna
dirección y sin obligación de coincidir entre sí. Ver la nota en la sección
Personal (arriba) y la decisión 1 de "Catálogos maestros" en
`preguntas-abiertas.md`.

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `id` | `text` (PK, UUID) | sí | automático |
| `codigo` | `text` (**UNIQUE**) | sí | **automático** — formato `PRS.0001`, **4 dígitos** (no 7 como `MAT.`/`OFFT.`/`SRV.`), correlativo global sin segmento de año |
| `cargo` | `text` | no | manual — texto libre, sin catálogo ni relación con `personal.cargo` |
| `unidad` | `text` | no | manual — **periodo de tiempo** (hora, día, mes, año), no una unidad física (ver abajo) |
| `costo` | `bigint` (`mode: "number"` en Drizzle) | no | manual — céntimos, nunca decimal |
| `moneda` | `moneda` (enum, compartido con `orden_trabajo`, `lista_precios` y `servicios`) | no | manual |
| `activo` | `boolean` | sí (`DEFAULT true`) | automático/manual — baja lógica |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**`codigo` usa el correlativo genérico, ámbito `"tarifario_personal"` —
cuarta clave de esa tabla, y la ÚNICA con 4 dígitos.** Formato `PRS.0001`
(prefijo `PRS.` + 4 dígitos), reservado atómicamente con la misma técnica que
`materiales.codigo_interno`, `lista_precios.codigo_oferta` y
`servicios.codigo`, desde la tabla `correlativo` (ver su ficha más arriba).
Global, sin segmento de año, igual que las otras tres — la diferencia es
solo el número de dígitos. `NOT NULL` porque lo pone siempre el backend;
`UNIQUE` (constraint `tarifario_personal_codigo_unique` en Postgres) como red
de seguridad del contador, mismo papel que `orden_trabajo.codigo_ot`. La
tabla de ámbitos de "Correlativo genérico" (arriba) debe incluir esta cuarta
fila.

**Límite asumido de los 4 dígitos, no un bug.** Con `padStart(4, "0")` el
orden alfabético de `codigo` coincide con el orden numérico solo hasta
`PRS.9999`; a partir de `PRS.10000` un listado que ordene por `codigo`
(texto) daría saltos frente al orden numérico real — el mismo fenómeno que
ya se documentó para los correlativos de 7 dígitos, solo que aquí el techo
se alcanza mil veces antes. Se acepta a propósito: un tarifario de cargos no
se espera que llegue a diez mil filas.

**`unidad` es un PERIODO DE TIEMPO, no una unidad física — no confundir con
`core/unidades.ts`.** A diferencia de `materiales.unidad`,
`lista_precios.unidad` y `servicios.unidad` (que son `m`, `und`, `kg`...),
aquí `unidad` dice con qué periodicidad se cobra el `costo`: hora, día, mes o
año. Lista fija nueva, `PERIODOS_TARIFARIO`, en `core/periodos.ts` — no
reutiliza `UNIDADES`. `text` sin CHECK ni ENUM en la base, mismo criterio que
el resto de catálogos: la restricción (si la hay) vive del lado de la
aplicación, en `modules/tarifario-personal/`.

**El borrador decía "costo por día"; la tabla lo generaliza en DOS
columnas.** En vez de fijar la periodicidad en el nombre del campo, `costo` +
`unidad` permiten que una tarifa sea por hora, día, mes o año según lo que
diga `unidad` en esa fila. Por eso `costo` a secas no significa nada sin su
`unidad` — igual que tampoco significa nada sin su `moneda`. `bigint` con
`mode: "number"`, céntimos, nunca `float` (regla invariable 2), mismo patrón
que `servicios.precio` y `orden_trabajo.precio`. El límite de negocio
(equivalente a `PRECIO_MAXIMO_CENTIMOS`) se valida en
`modules/tarifario-personal/schema.ts`, no en la columna.

**El campo `nivel` del borrador NO se construyó — no es un olvido.** El
encargo del cliente para esta tabla no lo incluye entre las columnas. Si se
confirma que hace falta más adelante, es una columna nueva y una migración
aparte, no algo que ya esté aquí sin usar.

**`activo` entró en la primera migración aunque la acción de inactivar
llegara en la Parte 2** (misma fecha) — mismo criterio explícito que
`lista_precios.activo` ("para no requerir una segunda migración solo por
esto"), y al revés que `servicios`, que no tiene esta columna todavía (ahí
sigue siendo pregunta abierta). Baja lógica, nunca borrado — regla invariable
9.

**Desde la Parte 2 la columna ya se escribe**, con `cambiarActivoTarifa`
(`modules/tarifario-personal/actions.ts`): una Server Action propia y mínima
que solo toca esta columna, invocada desde el icono de inactivar del listado
con un `alert-dialog` de confirmación delante. Reactivar no se confirma —no
destruye ni esconde nada—. El listado filtra por esta columna alternando entre
dos vistas excluyentes (`eq(activo, inactivos ? false : true)`), y el filtro
«Ver solo inactivos» es lo que permite volver a verlas y reactivarlas: sin él,
inactivar sería irreversible de cara al usuario aunque no lo sea en la base.
Mismo mecanismo, y mismas palabras, que en Materiales y Lista de precios.

**Obligatoriedad, mismo criterio que los otros tres catálogos.** `cargo`,
`unidad`, `costo` y `moneda` quedan nullable en la columna: el Zod de
`modules/tarifario-personal/schema.ts` puede ser más estricto que la tabla,
nunca al revés. Solo `codigo`, `activo` y las columnas de auditoría son
`NOT NULL`.

**Índice.** `tarifario_personal_activo_idx` sobre `activo`, mismo criterio
que `materiales_activo_idx` y `lista_precios_activo_idx`: el listado filtra
por `activo` en la consulta por defecto desde la Parte 1, y desde la Parte 2
también en la vista contraria.

**Buscador (Parte 2).** El listado busca sobre `codigo`, `cargo` y `unidad`
—las TRES columnas de texto, ninguna fuera—, con `ILIKE` resuelto en la
consulta. A diferencia de Materiales y Lista de precios, que excluyen su
`unidad` por ser un puñado de valores repetidos, aquí sí entra: la tabla solo
tiene tres columnas de texto, y `unidad` discrimina de verdad por ser un
periodo de tiempo («¿qué cargos tengo tarifados por mes?»). `costo` y `moneda`
quedan fuera, mismo criterio que en el resto de catálogos.

**Consume:** `correlativo` (clave `"tarifario_personal"`). **Consumida
por:** `modules/tarifario-personal/` (en desarrollo). **Sin relación con
`personal`** (ver arriba).

## EPPs (catálogo maestro)

Quinto y último catálogo maestro de los cinco que declara el menú (Bloque
11) en tener tabla real, después de Materiales, Lista de precios, Servicios
y Tarifario de personal. Definida en `db/schema/epps.ts`, tabla `epps`.
Construida en el Bloque 16, Parte 1 (2026-09-23), consumida por
`modules/epps/` (en desarrollo en paralelo, fuera del alcance de este
documento).

| Columna | Tipo en la BD | Obligatorio | Cómo se llena |
|---|---|---|---|
| `id` | `text` (PK, UUID) | sí | automático |
| `codigo` | `text` (**UNIQUE**) | sí | **automático** — formato `EPP.000001`, **6 dígitos** (ni 7 como `MAT.`/`OFFT.`/`SRV.` ni 4 como `PRS.`), correlativo global sin segmento de año |
| `descripcion` | `text` | no | manual |
| `unidad` | `text` | no | manual — unidad de medida **física**, texto libre con sugerencias (ver abajo) |
| `precio` | `bigint` (`mode: "number"` en Drizzle) | no | manual — céntimos, nunca decimal; **directo, no derivado** |
| `moneda` | `moneda` (enum, compartido con `orden_trabajo`, `lista_precios`, `servicios` y `tarifario_personal`) | no | manual |
| `created_at` / `updated_at` | `timestamp` | sí | automáticos |

**`codigo` usa el correlativo genérico, ámbito `"epps"` — quinta y última
clave de esa tabla, y la única con 6 dígitos.** Formato `EPP.000001`
(prefijo `EPP.` + 6 dígitos), reservado atómicamente con la misma técnica
que los otros cuatro catálogos, desde la tabla `correlativo` (ver su ficha
más arriba). Global, sin segmento de año, igual que los demás — la
diferencia es solo el número de dígitos: ni 7 (`MAT.`/`OFFT.`/`SRV.`) ni 4
(`PRS.`). `NOT NULL` porque lo pone siempre el backend; `UNIQUE`
(`epps_codigo_unique` en Postgres) como red de seguridad del contador,
mismo papel que `orden_trabajo.codigo_ot`. La tabla de ámbitos de
"Correlativo genérico" (arriba) ya incluye esta quinta fila. El formateo y
las constantes (prefijo, dígitos, inicial, clave) viven en
`modules/epps/constantes.ts`, no en el esquema.

**Límite asumido de los 6 dígitos, no un bug** — mismo fenómeno ya
documentado para los otros anchos: con `padStart(6, "0")` el orden
alfabético de `codigo` coincide con el orden numérico solo hasta
`EPP.999999`; a partir de `EPP.1000000` un listado que ordene por `codigo`
(texto) daría saltos frente al orden numérico real. Se acepta a propósito:
un catálogo de EPPs no se espera que llegue a un millón de filas.

**`unidad` es la unidad de medida FÍSICA, la misma lista que Materiales,
Lista de precios y Servicios — NO la confundir con el periodo de tiempo de
`tarifario_personal.unidad`.** Texto libre con sugerencias de
`core/unidades.ts` (m, und, pzs, cja, kg, lt, gal), sin CHECK ni `pgEnum` en
la base. Las cuatro tablas comparten nombre de columna y la misma lista de
sugerencias; solo `tarifario_personal.unidad` rompe el patrón (hora/día/
mes/año, `core/periodos.ts`) — es la confusión fácil al copiar el esquema
del catálogo de al lado, y por eso queda anotada aquí explícitamente igual
que en el comentario de `db/schema/epps.ts`.

**`precio` es un campo directo, no derivado — mismo criterio que
`servicios.precio` y `tarifario_personal.costo`, al contrario que
`lista_precios.precio`** (que se calcula de `precio_lista × (1 − descuento
/ 100)`, ver esa ficha arriba). Esta tabla no tiene `precio_lista` ni
`descuento`: no hay nada de lo que derivar un precio, así que `precio` es
simplemente el importe capturado. `bigint` con `mode: "number"` en Drizzle,
céntimos, nunca `float` (regla invariable 2). El límite de negocio
(equivalente a `PRECIO_MAXIMO_CENTIMOS`) se valida en
`modules/epps/schema.ts`, no en la columna.

**SIN columna `activo` — encargo explícito, no pregunta abierta.** Es el
segundo catálogo sin esta columna después de `servicios`, pero por un
motivo distinto que conviene no confundir: en Servicios la ausencia sigue
siendo pregunta abierta (inactivar/reactivar no está confirmado con el
cliente, decisión pendiente en `preguntas-abiertas.md`); aquí el encargo
dijo directamente que no aplica a este catálogo. El resultado en la tabla
es el mismo —ninguna de las dos tiene la columna, ninguna cumple hoy la
regla invariable 9 por ausencia de mecanismo—, pero mientras Servicios
podría ganarla el día que se confirme la respuesta, EPPs no la lleva porque
ya se decidió que no corresponde. Si eso cambiara más adelante, el camino
es una migración nueva con `activo boolean DEFAULT true NOT NULL`, mismo
patrón que el resto de tablas.

**Obligatoriedad, mismo criterio que los otros cuatro catálogos.**
`descripcion`, `unidad`, `precio` y `moneda` quedan nullable en la columna:
el Zod de `modules/epps/schema.ts` puede ser más estricto que la tabla,
nunca al revés. Solo `codigo` y las columnas de auditoría son `NOT NULL`.

**Sin índices.** No hay columna `activo` que filtrar en el listado por
defecto ni ninguna FK que sostenga un JOIN. El buscador de la Parte 2 (ver
abajo) hace `ILIKE '%…%'` sobre tres columnas de texto, que es un barrido
secuencial: un índice B-tree normal no lo acelera —solo serviría uno de
trigramas (`pg_trgm`), que exige una extensión— y a la escala de un catálogo
de EPPs no hace falta. Mismo criterio que el resto de los catálogos, ninguno
de los cuales indexa su buscador.

**Buscador (Parte 2, misma fecha).** El listado busca sobre `codigo`,
`descripcion` y `unidad` —las TRES columnas de texto, ninguna fuera—, con
`ILIKE` resuelto en la consulta y el texto escapado por `patronParcial`
(`core/busqueda.ts`). Misma decisión que en Servicios y Tarifario, y por el
mismo motivo: con solo tres columnas de texto, excluir una dejaría el
buscador cubriendo dos tercios del vocabulario. `precio` y `moneda` quedan
fuera, igual que en el resto de catálogos. **Es el único filtro del
listado**: sin «Ver solo inactivos» (no hay columna `activo`) y sin filtro de
lista cerrada (no hay ninguna columna de ese tipo), lo que lo convierte en el
listado más simple del proyecto.

**Consume:** `correlativo` (clave `"epps"`). **Consumida por:**
`modules/epps/`.

Con esta tabla, los cinco catálogos maestros del menú del Bloque 11
—Materiales, Lista de precios, Servicios, Tarifario de personal y EPPs—
tienen ya tabla real en `db/schema/`. Ninguno queda pendiente de esquema;
lo que sigue pendiente en cada uno son las preguntas de negocio concretas
ya registradas en `preguntas-abiertas.md`, no la existencia de la tabla.
