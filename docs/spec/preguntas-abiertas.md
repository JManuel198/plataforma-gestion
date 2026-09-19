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
generada — su aplicación contra la base de datos queda pendiente de
confirmación aparte). En Drizzle se usa `mode: "number"` (no `mode:
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
