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

### 12. ¿Cuáles son los 7 estados definitivos de la OT fusionada?
El alcance solo tenía confirmados los 6 estados de Servicio (comerciales) y
los 5 de OT (ejecución en campo), como listas separadas y con propósitos
distintos. La fusión obliga a tener una sola lista, y no hay una reunión
donde el cliente haya validado cuál debe ser.

**Asumido (actualizado el 2026-09-20 — ahora son 7, no 6):**
`Pendiente` · `Aceptada` · `En ejecución` · `Pausada` · `Finalizada` ·
`Facturado` · `Cancelada`.

Se llegó aquí en dos pasos:
1. Al fusionar (2026-09-19) se asumieron **6**: los 5 de OT más `Facturado`
   de Servicio insertado antes de `Cancelada`, para poder cerrar el ciclo
   comercial (facturar) sin reintroducir un estado comercial aparte. Se
   descartaron `Activado`, `En espera` y `Rechazado` de Servicio por
   redundar con `Pendiente`/`Pausada`/`Cancelada` de OT.
2. El **2026-09-20 el cliente pidió `Aceptada`**, entre `Pendiente` y
   `En ejecución`: marca que el cliente confirma que acepta la cotización
   **antes** de que empiece el trabajo, no al terminarlo. Una OT `Aceptada`
   tiene el visto bueno para arrancar pero todavía no se ha tocado en campo.
   Esa posición es lo único de la lista que el cliente pidió explícitamente;
   el resto sigue siendo propuesta nuestra.

Lo que queda **sin confirmar** es la lista completa de 7 como conjunto: nunca
hubo una reunión donde el cliente la validara entera. La lista vigente está
enunciada en `reglas-negocio.md`.
**Si se confirma distinto:** cambiar `ESTADOS_OT` en
`modules/ordenes-trabajo/constantes.ts` (fuente de verdad única desde
2026-09-19; `db/schema/orden-trabajo.ts` la importa de ahí para construir el
`pgEnum`, ya no declara su propia lista) y generar una nueva migración — si
además se elimina algún valor ya usado por una fila existente, esa migración
necesita primero reasignar esas filas a un estado válido (Postgres no permite
borrar un valor de un enum con filas que lo usan).

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

## Personal (módulo nuevo, 2026-09-20)

No hay nada sobre Personal en la especificación: quedó diferido en la
sección 5 de `alcance-v2-servicios-ot.md`. El módulo se construyó igualmente
a pedido del cliente, así que estos supuestos se tomaron para poder avanzar y
**ninguno está confirmado**. Cada uno dice dónde se cambia.

1. **Formato del DNI: ocho dígitos exactos.** Es el DNI peruano, pero no se
   preguntó si hay o habrá personal extranjero — un carné de extranjería tiene
   nueve dígitos y un pasaporte es alfanumérico. Si los hay, la fila no se
   puede registrar hoy. Se cambia en `dniSchema`
   (`modules/personal/schema.ts`), y el `UNIQUE` de la columna no estorba: ya
   es `text`.
2. **El DNI es único y no cambia de dueño.** El `UNIQUE` impide reutilizar un
   DNI aunque la persona esté dada de baja. Es lo correcto si el DNI
   identifica a la persona; sería un problema si el negocio espera "borrar" a
   alguien y volver a darlo de alta desde cero. Hoy la salida es reactivar la
   ficha existente, no crear otra.
3. **El cargo es texto libre.** Sin catálogo ni lista cerrada, así que "Técnico
   electricista" y "Tecnico Electricista" son dos cargos distintos para
   cualquier futuro agrupado o informe. Si el cliente quiere filtrar o contar
   por cargo, esto necesita una tabla de catálogo (iría en `core/`, como el
   resto de catálogos maestros según AGENTS.md).
4. **No hay edad mínima validada.** El esquema solo rechaza fechas futuras y
   de hace más de 120 años, que son topes de cordura, no reglas laborales. Si
   el negocio exige una edad mínima para dar de alta a alguien, va en
   `fechaNacimientoSchema`.
5. **Una persona de Personal no es un usuario del sistema.** No hay relación
   con la tabla `user` de Better Auth: registrar a alguien aquí no le da
   acceso. Es deliberado —son conceptos distintos— pero conviene confirmarlo
   antes de que alguien lo dé por hecho al asignar trabajo.
6. **`orden_trabajo.responsable` sigue siendo texto libre.** No se conectó a
   esta tabla en este sprint. Mientras siga así, el nombre escrito en una OT
   y la ficha de esa persona pueden no coincidir, y dar de baja a alguien no
   afecta a sus OT. Conectarlos es una migración aparte y hay que decidir
   antes qué pasa con las OT que hoy tienen un nombre que no casa con nadie.

## Catálogos maestros (enlaces del menú, Bloque 11, 2026-09-21)

El Bloque 11 agregó al menú lateral cinco catálogos maestros —**Materiales,
Lista de precios, Servicios, Tarifario de personal y EPPs**— con una ruta
plana cada uno (`/materiales`, `/lista-precios`, `/servicios`,
`/tarifario-personal`, `/epps`) y una pantalla "próximamente"
(`components/pantalla-proximamente.tsx`). Cuando se escribió esto no había
nada detrás de ninguno: ni tabla, ni schema, ni regla de negocio. Se
registraron aquí porque los cinco nombres entraban al vocabulario del sistema
sin estar en `entidades.md`.

**Actualización (Bloque 12, Parte 1, 2026-09-21): Materiales ya tiene tabla
real** (`db/schema/materiales.ts`) y ficha propia en `entidades.md`; su
pantalla ya no es un placeholder. Los otros CUATRO siguen como estaban. Las
dudas de abajo que son suyas (la 3, 4, 5 y 6) siguen abiertas tal cual; las
que eran de Materiales se cerraron o se concretaron en la 8.

1. **Cuatro de los cinco siguen sin modelo definido** (Lista de precios,
   Servicios, Tarifario de personal, EPPs). No se sabe si la lista de precios
   es una tabla o varias versionadas, ni cómo se relaciona el tarifario con
   `personal`. Antes de construir cualquiera de los cuatro hay que
   documentarlo en `entidades.md`; mientras tanto su pantalla es un
   placeholder y no decide nada.
   **Materiales ya no está en este grupo**: su modelo se decidió en el Bloque
   12 y está documentado. Lo que sigue abierto de él no es el modelo sino la
   obligatoriedad de sus campos (decisión 8) y qué significa `fecha`.
2. **Según AGENTS.md los catálogos maestros van en `core/`**, no en
   `modules/`. Las cinco pantallas viven en `app/(protegido)/` y todavía no
   tienen módulo, así que la decisión sigue abierta y no se ha prejuzgado.
3. **¿El campo `material` de Lista de precios es texto libre o una
   relación real contra la tabla Materiales?** — **RESUELTO (Bloque 13,
   Parte 1, 2026-09-22): es una relación real.** La columna se llama
   `material_id`, es `NOT NULL` y tiene FK contra `materiales.id` sin
   cascada. El modal no deja escribir un material a mano: se elige con un
   buscador (`BuscadorSeleccion`) que solo ofrece materiales **activos**.
   Lo que inclinó la decisión fue el argumento que ya estaba escrito aquí —
   una relación evita nombres desalineados— más uno que apareció al
   construirlo: sin FK, inactivar un material dejaría ofertas apuntando a un
   texto que ya no corresponde a nada, y nadie se enteraría.
   **El caso que este punto dejaba abierto —cotizar un material que aún no
   está en el catálogo— NO desaparece, se traslada:** hoy la respuesta es
   "primero das de alta el material, después la oferta". Si eso resulta
   incómodo en el uso real, la salida prevista es crear el material desde el
   propio modal de la oferta, que está registrado más abajo como mejora
   diferida (decisión 14) y no como deuda.
4. **¿`precio_lista` y `precio` son independientes, o `precio` se deriva de
   `precio_lista` menos `descuentos`?** — **RESUELTO (Bloque 13, Parte 1,
   2026-09-22): `precio` se deriva y NO es una columna.** Se calcula como
   `precio_lista × (1 − descuento/100)` cada vez que se muestra, en
   `modules/lista-precios/precio.ts`. `descuento` quedó definido como **un
   solo porcentaje**, `numeric(5,2)` con `DEFAULT 0`, `NOT NULL` y un CHECK
   de rango 0–100 — no un importe y no varios encadenados, que eran las otras
   dos lecturas posibles que este punto señalaba.
   El criterio es el mismo que ya aplicaba `edad` en Personal: un número que
   es consecuencia de otros dos no se guarda, porque guardado puede
   contradecirlos y nadie se entera. Eso también cierra el "pueden no cuadrar
   entre sí" que este punto pedía aceptar explícitamente: ya no puede pasar.
   **Lo único que quedó sin confirmar es si el descuento único basta.** Si
   aparecen descuentos encadenados (uno comercial y otro por volumen, por
   ejemplo), el sitio a cambiar es esa función y la columna, no la interfaz.
5. **¿`comprobante` en el catálogo de Servicios es un campo de texto o un
   archivo real?** Si es texto (una referencia o número de comprobante), es
   una columna más y no cambia nada. **Si es un archivo, es la primera vez
   que el proyecto necesita almacenamiento de archivos**: no es una
   columna, es una pieza de infraestructura nueva que hay que elegir y
   presupuestar (dónde se guarda —Vercel Blob, S3, otro—, límites de
   tamaño, permisos de acceso, qué pasa al borrar la fila). Preguntar esto
   antes de construir el catálogo de Servicios, no después.
6. **Campos del catálogo de EPPs: no definidos todavía.** Es el único de
   los cinco del que no hay ni borrador. Por eso no aparece en
   `entidades.md`: no se esboza un modelo que nadie ha propuesto. La
   pantalla existe en el menú y dice "próximamente".
7. **La ruta `/servicios` se reutiliza para un concepto distinto del que
   tenía.** `entidades.md` documenta que al fusionar Servicio en OT
   (2026-09-19) se retiraron `modules/servicios/` y las rutas
   `app/(protegido)/servicios/**`. Esa ruta vuelve a existir desde el
   Bloque 11, pero para el **catálogo maestro de servicios**, que no es la
   entidad Servicio extinta. **Sin confirmar**: si esta colisión de nombre
   confunde al negocio, el catálogo debería llamarse otra cosa
   (`/catalogo-servicios`, por ejemplo) — se cambia en el array `MENU` de
   `components/barra-lateral.tsx` y renombrando la carpeta de la ruta.
   Mientras no se confirme, la línea de `entidades.md` que dice que esas
   rutas "se retiraron por completo" describe la fusión, no el árbol de
   rutas de hoy.
8. **¿Qué campos de Materiales son obligatorios?** (Bloque 12, Parte 1,
   2026-09-21 — primer catálogo con tabla real, `db/schema/materiales.ts`).
   El borrador de campos (hoy movido al cuerpo de `entidades.md`) nunca dijo
   cuáles pueden quedar vacíos, y a diferencia de Personal u OT no hay
   ninguna fuente (ni siquiera un Excel) de la que inferirlo.
   **Asumido:** ningún campo de negocio es `NOT NULL` — `codigo_interno`,
   `descripcion`, `marca`, `modelo`, `codigo_fabrica`, `unidad` y `fecha`
   quedan todos nullable en la base. Solo `activo` (con su `DEFAULT true`) y
   las columnas de auditoría son obligatorias, porque esas sí las exige el
   comportamiento de la tabla, no una regla de negocio sobre el material. Es
   la lectura literal de "solo `NOT NULL` donde sea evidente por el propio
   campo": ninguno de los siete se consideró lo bastante evidente como para
   endurecerlo sin que el cliente lo pida. El Zod de
   `modules/materiales/schema.ts` puede exigir algunos en el formulario sin
   tocar la columna — mismo patrón en dos capas que ya usa `responsable` de
   OT (supuesto 6): endurecer primero el Zod y solo después, si se confirma,
   la columna con una migración.
   **Si se confirma que alguno es obligatorio:** agregar `.required()` (o
   equivalente) en el Zod del módulo primero; la migración que añada
   `.notNull()` a la columna en `db/schema/materiales.ts` solo es segura si
   ninguna fila existente tiene ese campo vacío — si ya hay filas cargadas
   sin `descripcion`, por ejemplo, hay que rellenarlas antes o la migración
   falla.

9. **Existe un proceso de validación previa a la activación de un material,
   y NO está construido. SIGUE ABIERTO.** Confirmado por el cliente en el
   Bloque 12 (2026-09-21): un material no se activa sin pasar antes por esa
   validación. Hoy el sistema **no la representa de ninguna forma**: no hay
   estado, ni checklist, ni comprobación, ni registro de quién validó.

   **Actualización (2026-09-22): la columna `fecha_activacion` se eliminó, y
   eso NO cierra este punto.** Aquella columna era lo único que aludía a este
   proceso, y era una alusión pobre: un campo de texto que el usuario escribía
   a mano, sin nada que comprobara que la validación hubiera ocurrido de
   verdad. Al quitarla, el sistema pasó de representar mal este proceso a no
   representarlo en absoluto — que es más honesto, pero igual de incompleto.
   La fecha que hoy se muestra en el catálogo es `created_at`, la de alta del
   registro, que no dice nada sobre validación ni activación.

   **POR QUÉ ESTÁ FUERA DE ALCANCE, y no solamente sin construir (contexto del
   cliente, 2026-09-22):** la distinción entre *fecha de activación* y *fecha
   de validación* no aporta nada mientras el sistema tenga un solo usuario,
   que es el propio cliente. Si quien registra el material es la misma persona
   que lo valida, separar las dos fechas solo añade un campo que esa persona
   se rellena a sí misma. La distinción **cobra sentido cuando existan
   supervisores u otros roles verificando el trabajo de alguien más**: ahí sí
   importa quién dio por buena la validación y cuándo, porque ya no coinciden
   con quien cargó el dato.
   Esto cambia la naturaleza del pendiente: no es una pieza que falte por
   falta de tiempo, es una pieza que hoy **no tendría a quién servir**. El
   disparador para retomarlo no es terminar otras tareas, es que el sistema
   deje de tener un solo usuario — o sea, que aparezcan roles con permisos
   distintos.

   Lo que falta por preguntar cuando llegue ese momento, sin cambios: en qué
   consiste la validación, quién la hace, si deja rastro (quién y cuándo), y
   si un material puede existir en el catálogo sin estar activado todavía —
   que es lo que hoy ocurre de hecho con todos, porque nada marca la
   diferencia. Si de ahí sale que hace falta una fecha de activación real, se
   vuelve a crear como columna con el proceso que la respalde, no como un
   campo suelto.
10. ~~**¿`fecha_activacion` puede ser una fecha futura, o solo pasada o de
    hoy?**~~ **PREGUNTA RETIRADA (2026-09-22): la columna ya no existe.** Se
    eliminó de `materiales` junto con su campo del formulario; no se sustituyó
    por otra columna de fecha, y la que muestra el catálogo es `created_at`,
    que la escribe la base y no admite fechas futuras por construcción. La
    duda sobre el rango dejó de tener objeto.
    **Ojo, esto no arrastra a la decisión 9**, que sigue abierta: el proceso
    de validación previa sigue siendo una necesidad de negocio real, y ahora
    sin ninguna representación en el sistema.

11. ~~**`codigo_interno` de Materiales pasará a generarse automáticamente.**~~
    **RESUELTO (2026-09-22).** Formato confirmado y construido: **`MAT.0000001`**
    — prefijo `MAT.` más un correlativo de **7 dígitos** con ceros a la
    izquierda. **Global, sin segmento de año, no reinicia nunca** (a diferencia
    del de OT, que sí es anual). El usuario ya no lo escribe.

    **Cómo quedó implementado:**
    - La reserva atómica vive en `core/correlativo.ts` (`reservarCorrelativo`),
      sobre una tabla `correlativo` cuya PK es un ámbito de texto (`clave`), no
      un año. El mecanismo es el mismo upsert `ON CONFLICT … DO UPDATE …
      RETURNING` que ya usaba OT, y por la misma razón: toma el lock de la fila,
      así que dos altas simultáneas nunca reciben el mismo número.
    - Lo que NO generalizaba de `modules/ordenes-trabajo/correlativo.ts` era su
      clave: `ot_correlativo.anio` significa literalmente "año". Forzar un año
      falso para reusar esa tabla habría ensuciado lo que allí funciona, así que
      el contador global nació aparte, en `core/` por ser lógica compartida entre
      módulos. La función de OT pasó a llamarse `reservarCorrelativoAnual` para
      que los dos nombres no se confundan, y el tipo `Transaccion` se mudó a
      `core/`.
    - `ot_correlativo` **no se migró** a la tabla nueva: tiene datos y funciona.
      Podrían consolidarse algún día con una clave tipo `"orden-trabajo:2026"`.
    - El formato se arma en `modules/materiales/codigo.ts`; sus constantes
      (`PREFIJO_MATERIAL`, `DIGITOS_CORRELATIVO`, `CORRELATIVO_INICIAL`,
      `CLAVE_CORRELATIVO`) están en `modules/materiales/constantes.ts`.

    **Lo que cambió de papel, como este mismo punto anticipaba:** el `UNIQUE`
    de la columna y su traducción de error **se quedaron**, pero ya no son una
    interacción del usuario sino red de seguridad del generador. El mensaje se
    reescribió: "Ya existe un material con ese código interno" presuponía que
    el usuario lo había escrito. Y **no ofrece reintentar**, deliberadamente —
    la transacción revierte también la reserva del correlativo, así que un
    segundo intento pide el mismo número y choca igual; el fallo es
    determinista, no transitorio. Es la misma trampa que ya documentaba
    `crearOrdenTrabajoEnModal`.

    **Lo que queda sin decidir, y no bloquea nada:** si algún día hiciera falta
    un correlativo por categoría en vez de global (hoy no hay categorías), y
    qué hacer con materiales cargados a mano desde fuera de la aplicación — hoy
    no hay ninguno: la tabla estaba vacía cuando se construyó esto, así que el
    contador arranca limpio en `MAT.0000001` y no hubo nada que resincronizar.

12. **¿`materiales.unidad` debería pasar a la misma lista fija que
    `lista_precios.unidad`?** Sin decidir, y hoy los dos catálogos tratan
    "unidad" de forma DISTINTA a propósito, no por descuido:
    - `materiales.unidad` es **texto libre**, sin catálogo cerrado. Se dejó
      así en el Bloque 12 porque no estaba confirmado si "UND", "und" y
      "Unidad" son el mismo valor (ver la ficha de Materiales en
      `entidades.md`).
    - `lista_precios.unidad` es una **lista fija** de seis valores (`m`,
      `und`, `pzs`, `cja`, `kg`, `lt`), declarada en
      `modules/lista-precios/constantes.ts` y validada por Zod. La columna
      sigue siendo `text`, no un `pgEnum` — ver la decisión 13.
    La inconsistencia es visible para el usuario: el mismo concepto se
    escribe a mano en una pantalla y se elige de un desplegable en la otra.
    **Lo que hay que preguntar antes de unificar** es si son de verdad el
    mismo concepto: la unidad en la que se INVENTARÍA un material (una caja
    de 100 tornillos) no tiene por qué ser aquella en la que un proveedor lo
    COTIZA (por millar, por kilo). Si son el mismo, la lista se sube a
    `core/` y Materiales pasa a Select; si no lo son, la duplicación es
    correcta y hay que dejar de verla como deuda.
    **Migrar Materiales no es gratis:** sus filas actuales tienen texto libre
    que habría que mapear a la lista antes de imponerla, y hoy los valores
    cargados no salen de ella.

13. **¿Los seis valores de `lista_precios.unidad` son exhaustivos, o solo los
    que aparecieron primero?** Sin confirmar. La lista —`m`, `und`, `pzs`,
    `cja`, `kg`, `lt`— llegó como parte del encargo del Bloque 13, sin decir
    si es cerrada.
    Faltan candidatos evidentes en un contexto de obra (`gal`, `rollo`,
    `juego`, `m2`, `m3`, `hora`), lo que hace sospechar que son ejemplos y no
    un catálogo cerrado — pero suponerlo sería inventar, así que la lista
    quedó exactamente como se pidió.
    **Qué se hizo mientras tanto, y por qué importa:** la columna es `text` y
    **no** un `pgEnum`, a diferencia de `ot_estado` y `moneda`. Así, añadir o
    quitar un valor es editar un array en
    `modules/lista-precios/constantes.ts` — sin migración. Si la lista fuera
    un enum, cada valor nuevo costaría una migración, que es un precio alto
    para algo que se espera que cambie.
    **Cuando el cliente la confirme**, el sitio correcto SÍ es un `pgEnum`
    construido desde ese mismo array, igual que `ot_estado`: ahí la
    restricción pasa a estar también en la base, no solo en el Zod.

14. **Crear un material desde el propio modal de la oferta, cuando no aparece
    en la búsqueda.** MEJORA DELIBERADAMENTE DIFERIDA — se registra para que
    no se pierda, **no es deuda técnica ni un pendiente del Bloque 13**: lo
    construido funciona y está completo sin esto.
    Hoy, si el material no está en el catálogo, el usuario tiene que salir a
    `/materiales`, darlo de alta y volver a empezar la oferta. Es el coste
    directo de haber resuelto la decisión 3 como FK real, y se aceptó a
    sabiendas.
    **Por qué no se hizo ya:** obligaría a decidir cosas que nadie ha
    preguntado todavía — si el material se crea con todos sus campos o con un
    mínimo, si se guarda antes que la oferta o en la misma transacción, y qué
    pasa si el usuario cancela la oferta después de haber creado el material.
    Esa última es la que más pesa: dejaría material huérfano en el catálogo
    sin que el usuario lo esperara.
    **Antes de construirlo hay que saber** si el caso ocurre de verdad y con
    qué frecuencia. Si es raro, el rodeo actual está bien y esta mejora no
    vale su complejidad.
