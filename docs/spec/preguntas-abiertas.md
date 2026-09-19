# Preguntas abiertas

Dudas de negocio que se resolvieron con una decisión **asumida**, no
confirmada por el cliente. Cada una dice qué se hizo mientras tanto, para
poder revertirla sin arqueología.

---

## Servicio (Fase 2) — entidad fusionada en OT el 2026-09-19

Esta sección es **registro histórico**: la entidad Servicio dejó de existir
(ver la sección "Fusión Servicio + OT" al final). Se conserva para poder
reconstruir por qué se decidió cada cosa, pero ninguno de estos supuestos
describe el sistema de hoy. Donde la sustancia sobrevivió, cada uno dice a
qué supuesto de OT mirar en su lugar.

### 1. ¿Qué campos son obligatorios al crear un Servicio?
La tabla de `alcance-v2-servicios-ot.md` dice cómo se llena cada campo, pero
no cuáles pueden quedar vacíos.

**Asumido:** `codigo_oc` y `comentarios` son opcionales — la orden de compra
suele llegar después de registrar el servicio, y un comentario vacío es
normal. Todos los demás son obligatorios.
**OBSOLETO por la fusión.** El criterio sobrevivió sin cambios en la OT
(`codigo_oc` y `comentarios` opcionales): ver el **supuesto 7**, que es el
que hay que tocar hoy.

### 2. ¿Con qué estado nace un Servicio nuevo?
El documento lista los seis estados pero no dice cuál es el inicial.

**Asumido:** `Activado`, por ser el primero de la lista confirmada. El
formulario lo preselecciona y el usuario puede cambiarlo antes de guardar.
**OBSOLETO por la fusión.** `Activado` ya no existe: se descartó al unificar
las dos listas de estados (ver **supuesto 12**). Una OT nace `Pendiente`, por
el `.default()` de la columna en `db/schema/orden-trabajo.ts`.

### 3. ¿Hace falta cotizar por encima de S/ 21 474 836.47? — **Resuelto (2026-09-18)**
El tipo `integer` en céntimos topaba ahí.

**Decisión:** sí, se pidió levantar el techo. La columna `precio` pasó de
`integer` a `bigint` (migración `db/migrations/0002_fair_franklin_storm.sql`,
aplicada — verificado contra la base de datos el 2026-09-18:
`servicio.precio` era `bigint`). La decisión sigue vigente: la columna se
conservó tal cual al fusionarse en `orden_trabajo.precio` (migración
`0004_elite_wind_dancer.sql`). En Drizzle se usa `mode: "number"` (no `mode:
"bigint"`) para no arrastrar `BigInt` por el resto del código, así que el
techo técnico real quedó en `Number.MAX_SAFE_INTEGER`, no en el máximo de
`bigint` de PostgreSQL. `PRECIO_MAXIMO_CENTIMOS`
(hoy en `modules/ordenes-trabajo/schema.ts`) subió a `99_999_999_999_999` — el monto
máximo que puede escribir el usuario según la regex de `montoSchema` (12
dígitos enteros + 2 decimales), no el techo técnico, para que el número que
se valida y el que se comunica en el mensaje de error sean siempre el mismo.
**Si hiciera falta más adelante:** subir el límite de dígitos de la regex en
`montoSchema` junto con `PRECIO_MAXIMO_CENTIMOS` a la vez — nunca uno sin el
otro, o uno queda rechazando montos que el otro dice permitir.

### 4. ¿Se puede eliminar un Servicio?
El documento solo pide crear, editar y listar.

**Asumido:** no se elimina. Un servicio que no va se marca `Rechazado`.
Esto además protege la relación que la OT de la Fase 3 tendrá con él.
**OBSOLETO por la fusión.** `Rechazado` desapareció con la lista de estados de
Servicio (**supuesto 12**), y ya no hay relación que proteger. El criterio
equivalente y vigente es el **supuesto 9**: una OT no se elimina, se marca
`Cancelada`.

---

## Orden de Trabajo (Fase 3)

### 5. ¿El correlativo de cada año inicia en `0001` o en `0000`?
Listado como pendiente de confirmar en la sección 6 de
`alcance-v2-servicios-ot.md`. El formato es `OT.CCM.AAAA.NNNN`.

**Asumido:** cada año inicia en `0001`. La primera OT del año hace
`INSERT INTO ot_correlativo (anio, ultimo) VALUES ($anio, 1)`, y el número se
formatea con `padStart(4, "0")`.
**Si se confirma `0000`:** es un ajuste de una línea en
`modules/ordenes-trabajo/` — la primera inserción del año pasa a `VALUES
($anio, 0)` y el `ON CONFLICT ... DO UPDATE SET ultimo = ultimo + 1` se queda
igual. **No requiere migración**: la tabla `ot_correlativo` no cambia. Ojo:
solo aplica a años que todavía no tengan fila; si ya se emitieron OT de ese
año, cambiarlo retroactivamente rompería la numeración existente.

### 6. ¿`responsable` es obligatorio al crear una OT?
El alcance dice que es texto libre manual, pero no si puede quedar vacío. No
hay tabla de Personal todavía (diferido, sección 5).

**Asumido:** opcional en la base de datos — el técnico a cargo puede
asignarse después de abrir la OT. La columna es nullable a propósito: exigirlo
primero en el Zod de `modules/ordenes-trabajo/schema.ts` y endurecer la
columna después es reversible sin dolor; al revés (columna `NOT NULL` sobre
filas ya existentes sin responsable) obliga a rellenar datos a mano.
**Si se confirma obligatorio:** ponerlo `required` en el Zod del módulo; la
migración que agregue `.notNull()` a la columna solo es segura si ninguna fila
tiene `responsable` vacío.

### 7. ¿Qué campos de la OT son obligatorios, fuera de `responsable`?
Mismo vacío que el supuesto 1 para Servicio.

**Asumido:** `codigo_oc` es opcional (la orden de compra llega después,
idéntico criterio que en Servicio); `codigo_cotizacion`, `asunto` y `cliente`
son obligatorios. Tras la fusión se suman `precio` y `moneda`, también
obligatorios (**supuesto 13**), y `codigo_revision`, que quedó opcional con el
mismo criterio que `codigo_oc` — en Servicio era obligatorio. `codigo_ot` y
`fecha_creacion` no se preguntan: son automáticos.
**Si se confirma distinto:** cambiar el campo en
`modules/ordenes-trabajo/schema.ts` y quitar/poner `.notNull()` en
`db/schema/orden-trabajo.ts` (requiere migración).

### 8. ¿Una OT puede existir sin Servicio, o un Servicio tener varias OT?
El alcance dice que la OT "nace de un Servicio ya creado", pero no acota la
cardinalidad.

**Asumido:** uno a muchos — un Servicio puede tener varias OT, y ninguna OT
existe sin Servicio (`servicio_id` es `NOT NULL`). No hay `UNIQUE` sobre
`servicio_id`.
**OBSOLETO por la fusión.** La pregunta desapareció con la relación: no hay
dos entidades entre las que definir cardinalidad. La columna `servicio_id` y
su FK se eliminaron en la migración `0004_elite_wind_dancer.sql`.

### 9. ¿Se puede eliminar una OT?
El documento solo pide crear, editar y listar.

**Asumido:** no se elimina. Una OT que no va se marca `Cancelada` — por eso
la tabla no tiene columna `activo`: el estado ya cumple ese papel.

### 10. ¿Cuál es el largo máximo de cada campo de texto?
Ni el alcance ni `entidades.md` acotan los campos: en la base son `text`, sin
límite. Los topes viven hoy solo en las validaciones de Zod.

**Asumido** (OT fusionada, `modules/ordenes-trabajo/schema.ts`): código de
cotización 50, código de revisión 50, asunto 300, OC 100, cliente 200,
responsable 200, comentarios 2000. Los cuatro primeros valores venían de
Servicio y se conservaron sin cambios al fusionar; `asunto` (300) es el de la
OT, que reemplaza a la descripción del servicio (1000).
Salieron de lo que se ve razonable en el Excel actual, no de una regla dada.
**Si se confirma distinto:** cambiar el número en el `schema.ts` del módulo.
No requiere migración — las columnas son `text` y no tienen límite propio.

### 11. ¿Se puede crear una OT desde un Servicio Rechazado o Facturado?
**OBSOLETO por la fusión Servicio + OT (2026-09-19).** La pregunta no tiene
sujeto: una OT ya no nace de un Servicio, se crea desde su propio listado, y
no hay estado externo que consultar antes de insertar.

**Queda vivo un residuo, que sí hay que confirmar:** `Facturado` y `Cancelada`
son ahora estados de la propia OT, y hoy nada impide devolver una OT desde
cualquiera de los dos a `Pendiente` o `En ejecución` editándola.
**Asumido:** se puede, sin restricción — el formulario ofrece los seis estados
siempre.
**Si se confirma restringido:** la comprobación va en `editarOrdenTrabajo`
(`modules/ordenes-trabajo/actions.ts`), no solo limitando el `Select` — la
Server Action se puede invocar con un POST directo.

---

## Fusión Servicio + OT (2026-09-19)

El cliente confirmó que Servicio y Orden de Trabajo son la misma entidad
para él y pidió que `orden_trabajo` absorba todo. La fusión de esquema
(migraciones `0004_elite_wind_dancer.sql` y `0005_smiling_sway.sql`, partidas
en dos por un problema de orden entre `DROP TABLE ... CASCADE` y un `DROP
CONSTRAINT` explícito) resuelve la relación de los supuestos 5-9
de arriba (ya no aplica un `servicio_id`), pero abre dos preguntas nuevas.

### 12. ¿Cuáles son los 6 estados definitivos de la OT fusionada?
El alcance solo tenía confirmados los 6 estados de Servicio (comerciales) y
los 5 de OT (ejecución en campo), como listas separadas y con propósitos
distintos. La fusión obliga a tener una sola lista, y no hay una reunión
donde el cliente haya validado cuál debe ser.

**Asumido:** `Pendiente` · `En ejecución` · `Pausada` · `Finalizada` ·
`Facturado` · `Cancelada` — los 5 de OT más `Facturado` de Servicio insertado
antes de `Cancelada`, para poder cerrar el ciclo comercial (facturar) sin
tener que reintroducir un estado comercial aparte. Se descartaron
`Activado`, `En espera` y `Rechazado` de Servicio por redundar con
`Pendiente`/`Pausada`/`Cancelada` de OT.
**Si se confirma distinto:** cambiar `ESTADOS_OT` en
`db/schema/orden-trabajo.ts` y generar una nueva migración — si además se
elimina algún valor ya usado por una fila existente, esa migración necesita
primero reasignar esas filas a un estado válido (Postgres no permite borrar
un valor de un enum con filas que lo usan).

### 13. ¿`precio`/`moneda` de la OT fusionada siguen siendo obligatorios?
El cliente pidió la fusión pero no habló explícitamente de si el precio se
sigue exigiendo, ni mencionó la columna `moneda` en absoluto — es una
consecuencia de que `precio` nunca se guarda sin su moneda (regla del
esquema, no pedida aparte).

**Asumido:** sí, `precio` y `moneda` son `NOT NULL` en `orden_trabajo`,
igual que lo eran en `servicio` — la OT fusionada es ahora también el
registro comercial, así que hereda esa obligatoriedad. `moneda` viaja
siempre junto a `precio` aunque el cliente no la haya mencionado, porque un
monto sin su moneda no es un dato completo (mismo criterio que ya regía en
Servicio).
**Si se confirma que el precio es opcional en la OT** (por ejemplo, porque
se crea antes de cotizar): quitar `.notNull()` de ambas columnas en
`db/schema/orden-trabajo.ts` y generar una nueva migración — segura de
aplicar aunque haya filas, porque relajar `NOT NULL` nunca rompe datos
existentes.
