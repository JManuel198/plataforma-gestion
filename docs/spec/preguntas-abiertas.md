# Preguntas abiertas

Dudas de negocio que se resolvieron con una decisión **asumida**, no
confirmada por el cliente. Cada una dice qué se hizo mientras tanto, para
poder revertirla sin arqueología.

---

## Servicio (Fase 2)

### 1. ¿Qué campos son obligatorios al crear un Servicio?
La tabla de `alcance-v2-servicios-ot.md` dice cómo se llena cada campo, pero
no cuáles pueden quedar vacíos.

**Asumido:** `codigo_oc` y `comentarios` son opcionales — la orden de compra
suele llegar después de registrar el servicio, y un comentario vacío es
normal. Todos los demás son obligatorios.
**Si se confirma distinto:** cambiar el campo en
`modules/servicios/schema.ts` y quitar/poner `.notNull()` en
`db/schema/servicio.ts` (requiere migración).

### 2. ¿Con qué estado nace un Servicio nuevo?
El documento lista los seis estados pero no dice cuál es el inicial.

**Asumido:** `Activado`, por ser el primero de la lista confirmada. El
formulario lo preselecciona y el usuario puede cambiarlo antes de guardar.
**Si se confirma distinto:** cambiar el `.default()` de la columna `estado`
y el `defaultValue` del Select en el formulario.

### 3. ¿Hace falta cotizar por encima de S/ 21 474 836.47? — **Resuelto (2026-09-18)**
El tipo `integer` en céntimos topaba ahí.

**Decisión:** sí, se pidió levantar el techo. La columna `precio` pasó de
`integer` a `bigint` (migración `db/migrations/0002_fair_franklin_storm.sql`,
aplicada — verificado contra la base de datos el 2026-09-18:
`servicio.precio` es `bigint`). En Drizzle se usa `mode: "number"` (no `mode:
"bigint"`) para no arrastrar `BigInt` por el resto del código, así que el
techo técnico real quedó en `Number.MAX_SAFE_INTEGER`, no en el máximo de
`bigint` de PostgreSQL. `PRECIO_MAXIMO_CENTIMOS`
(`modules/servicios/schema.ts`) subió a `99_999_999_999_999` — el monto
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
son obligatorios. `codigo_ot`, `fecha_creacion` y `servicio_id` no se
preguntan: son automáticos.
**Si se confirma distinto:** cambiar el campo en
`modules/ordenes-trabajo/schema.ts` y quitar/poner `.notNull()` en
`db/schema/orden-trabajo.ts` (requiere migración).

### 8. ¿Una OT puede existir sin Servicio, o un Servicio tener varias OT?
El alcance dice que la OT "nace de un Servicio ya creado", pero no acota la
cardinalidad.

**Asumido:** uno a muchos — un Servicio puede tener varias OT, y ninguna OT
existe sin Servicio (`servicio_id` es `NOT NULL`). No hay `UNIQUE` sobre
`servicio_id`.
**Si se confirma una sola OT por Servicio:** agregar un índice único sobre
`servicio_id` (migración), que además sirve como control real, no solo como
validación en pantalla.

### 9. ¿Se puede eliminar una OT?
El documento solo pide crear, editar y listar.

**Asumido:** no se elimina. Una OT que no va se marca `Cancelada` — por eso
la tabla no tiene columna `activo`: el estado ya cumple ese papel.

### 10. ¿Cuál es el largo máximo de cada campo de texto?
Ni el alcance ni `entidades.md` acotan los campos: en la base son `text`, sin
límite. Los topes viven hoy solo en las validaciones de Zod.

**Asumido** (Servicio, `modules/servicios/schema.ts`): código de cotización
50, código de revisión 50, OC 100, descripción del servicio 1000, cliente 200,
comentarios 2000.
**Asumido** (OT, `modules/ordenes-trabajo/schema.ts`): código de cotización
50, asunto 300, OC 100, cliente 200, responsable 200.
Salieron de lo que se ve razonable en el Excel actual, no de una regla dada.
**Si se confirma distinto:** cambiar el número en el `schema.ts` del módulo.
No requiere migración — las columnas son `text` y no tienen límite propio.

### 11. ¿Se puede crear una OT desde un Servicio Rechazado o Facturado?
El alcance dice que la OT "nace de un Servicio ya creado", pero no acota desde
qué estados.

**Asumido:** desde cualquiera. Hoy el código no restringe: el botón "Crear OT"
aparece en toda fila del listado y `crearOrdenTrabajo` solo verifica que el
Servicio exista, no en qué estado está.
**Si se confirma restringido:** la comprobación va en `crearOrdenTrabajo`
(`modules/ordenes-trabajo/actions.ts`), no solo ocultando el botón — la Server
Action se puede invocar con un POST directo. Ocultar el botón en
`tabla-servicios.tsx` sería el complemento visual, nunca el control.
