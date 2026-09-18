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

### 3. ¿Hace falta cotizar por encima de S/ 21 474 836.47?
El tipo `integer` en céntimos topa ahí.

**Asumido:** no hace falta; montos mayores se rechazan con un mensaje claro
en vez de fallar contra la base de datos.
**Si se confirma que sí:** la columna `precio` pasa a `bigint` y
`PRECIO_MAXIMO_CENTIMOS` sube con ella.

### 4. ¿Se puede eliminar un Servicio?
El documento solo pide crear, editar y listar.

**Asumido:** no se elimina. Un servicio que no va se marca `Rechazado`.
Esto además protege la relación que la OT de la Fase 3 tendrá con él.
