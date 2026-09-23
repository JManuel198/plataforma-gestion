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
cualquier módulo puede llamar pasándole su propia `clave`. Hoy hay **dos
ámbitos en uso**, y que el segundo entrara sin tocar ni la tabla ni la
migración es la prueba de que la generalización era la correcta:

| `clave` | Formato | Quién lo usa |
|---|---|---|
| `"materiales"` | `MAT.0000001` — prefijo `MAT`, 7 dígitos | `materiales.codigo_interno` (Bloque 12, Parte 3) |
| `"lista_precios"` | `OFFT.0000001` — prefijo `OFFT`, 7 dígitos | `lista_precios.codigo_oferta` (Bloque 13, Parte 1) |

Los dos son globales y sin año. Cada módulo declara sus propias constantes
(prefijo, dígitos, inicial y clave) junto a su `codigo.ts` — ver
`modules/materiales/constantes.ts` y `modules/lista-precios/constantes.ts`.
Añadir un tercer ámbito **no exige migración**: es una fila más, creada por
el propio upsert la primera vez que se reserva.

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
| `unidad` | `text` | **no** | manual — unidad de medida, texto libre sin catálogo cerrado |
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
| `unidad` | `text` | no | manual — lista fija de 6 valores en la interfaz, sin `pgEnum` (ver más abajo) |
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

**`unidad` es `text`, no `pgEnum` — a propósito, a diferencia de
`ot_estado`.** La interfaz ofrecerá una lista fija de 6 valores (`m`, `und`,
`pzs`, `cja`, `kg`, `lt`), pero esa lista es un borrador sin confirmar con el
cliente (no se sabe si es exhaustiva o solo ejemplos — pregunta abierta en
`preguntas-abiertas.md`). Un `pgEnum` exige una migración para añadir o
quitar un valor; `text` no. La lista vive del lado de la aplicación, en
`modules/lista-precios/constantes.ts`. El día que se confirme como cerrada,
el sitio correcto es un `pgEnum` construido desde esa constante, igual que
`otEstadoEnum` se construye desde `ESTADOS_OT`.

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

**Todo lo que sigue es un borrador temporal**, dicho así explícitamente por el
desarrollador: son los campos tal como se han esbozado hasta el Bloque 11
(2026-09-21), **no una especificación cerrada ni confirmada con el cliente**.
De los cinco catálogos maestros del menú, **Materiales y Lista de precios ya
tienen tabla real** (ver las entidades correspondientes más arriba); los
otros tres —Servicios, Tarifario de personal y EPPs— siguen sin tabla en
`db/schema/`, y sus rutas (`/servicios`, `/tarifario-personal`, `/epps`)
muestran una pantalla "próximamente".

A diferencia del resto de este documento, que refleja lo que existe de verdad
en `db/schema/`, esta sección va por delante del código. **No generes
migraciones a partir de esto sin confirmarlo antes.** Las dudas abiertas de
cada catálogo están en `preguntas-abiertas.md`, sección "Catálogos maestros".

Los tipos concretos (`text`, `bigint`, enum…) se deciden al construir cada
tabla; aquí solo está la lista de campos. Dos reglas del proyecto ya aplican
sin discusión cuando llegue ese momento: todo importe va en **céntimos**
(regla 2) y toda fecha sin hora va como **`date`**, no `timestamp` (regla 10).

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
