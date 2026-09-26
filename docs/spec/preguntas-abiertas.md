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

**Asumido:** cada año inicia en `0001`. La primera OT del año inserta la fila
`"ordenes-trabajo:<año>"` de la tabla `correlativo` con `ultimo =
CORRELATIVO_INICIAL` (1), y el número se formatea con `padStart(4, "0")`.
(Hasta el 2026-09-25 la fila era de `ot_correlativo`; ver entidades.md.)
**Si se confirma `0000`:** es un ajuste de una línea —
`CORRELATIVO_INICIAL = 0` en `modules/ordenes-trabajo/constantes.ts`— y el
`ON CONFLICT ... DO UPDATE SET ultimo = ultimo + 1` se queda igual. **No
requiere migración**: la tabla `correlativo` no cambia. Ojo:
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

**Actualización (2026-09-23): los CINCO ya están construidos.** Materiales
(Bloque 12), Lista de precios (Bloque 13), Servicios (Bloque 14), Tarifario de
personal (Bloque 15) y EPPs (Bloque 16) tienen tabla real y ficha propia en
`entidades.md`, y **ninguna de las cinco pantallas es ya un placeholder** —
`components/pantalla-proximamente.tsx` ya no se usa en ninguna de estas rutas.
Con EPPs cae el último punto que quedaba sin modelo (decisión 6, cerrada). Las
dudas de abajo se han ido cerrando por bloques — lo que queda abierto lo dice
cada punto.

1. ~~**Cuatro de los cinco siguen sin modelo definido**~~ ~~**SOLO QUEDA
   EPPs**~~ **NINGUNO: los cinco están construidos (2026-09-23).** Todos
   tienen tabla real y ficha en `entidades.md`: Materiales (Bloque 12), Lista
   de precios (Bloque 13), Servicios (Bloque 14), Tarifario de personal
   (Bloque 15) y EPPs (Bloque 16). Ninguna de sus pantallas es ya un
   placeholder. La regla que este punto fijaba **sigue valiendo para lo que
   venga**: antes de construir un catálogo hay que documentar el modelo en
   `entidades.md`; mientras tanto su pantalla es un placeholder y no decide
   nada.
   Lo que este punto daba por indefinido y ya se resolvió: si la lista de
   precios era una tabla o varias versionadas (es una, ver decisiones 3 y 4).
   **¿Cómo se relaciona el tarifario con `personal`? — DESCARTADO (2026-09-23):
   no se relaciona.** El cliente confirmó explícitamente que no debe existir
   ninguna relación entre Personal y el nuevo Tarifario de personal. No
   quedó pendiente por descuido: fue una decisión directa del cliente. Ver
   la nota en `entidades.md`, sección Personal (campo `cargo`) y la ficha
   "Tarifario de personal (catálogo maestro)".
   Lo que sigue abierto de los ya construidos NO es su modelo: en Materiales
   es la obligatoriedad de sus campos (decisión 8) y qué significa `fecha`; en
   Servicios, si necesita baja lógica (decisión 16); en el Tarifario, si los
   cargos merecen catálogo propio (decisión 19).
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
6. ~~**Campos del catálogo de EPPs: no definidos todavía.**~~ **RESUELTO
   (Bloque 16, Parte 1, 2026-09-23).** Era el único de los cinco del que no
   había ni borrador, y por eso este punto decía que no se esbozara un modelo
   que nadie había propuesto. El cliente lo propuso: `codigo` (autogenerado,
   `EPP.000001`, seis dígitos), `descripcion`, `unidad`, `precio` y `moneda`.
   La tabla existe en `db/schema/epps.ts` y su ficha completa está en
   `entidades.md`; la pantalla `/epps` ya no dice "próximamente".
   **Dos cosas quedaron decididas y conviene no releerlas como omisiones:**
   `unidad` es la lista FÍSICA de `core/unidades.ts` (m, und, pzs…), no la de
   periodos del Tarifario — las dos columnas se llaman igual y son `text`, así
   que nada en el tipo avisa de la confusión; y **no hay columna `activo`
   porque el encargo dice que la baja lógica no aplica a este catálogo**, que
   NO es el caso de Servicios (decisión 16), donde la columna falta por estar
   sin confirmar. Mismo resultado en la tabla, motivo distinto: si alguna vez
   se pide dar de baja un EPP, eso es una decisión nueva del cliente, no el
   desbloqueo de una pregunta que quedara abierta aquí.
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
      *(Actualización 2026-09-25: se consolidaron, con claves
      `"ordenes-trabajo:<año>"` y la migración de datos 0020 — ver
      "Correlativo anual" en entidades.md.)*
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
    `lista_precios.unidad`?** — **RESUELTO (2026-09-22), a favor de texto
    libre en las dos.** No se resolvió confirmando que son o no el mismo
    concepto (la pregunta de fondo de este punto sigue sin respuesta del
    cliente) — se resolvió por el lado contrario: en vez de subir Materiales
    al nivel de restricción de Lista de precios, se bajó Lista de precios al
    nivel de Materiales. `lista_precios.unidad` deja de restringirse con
    `z.enum(UNIDADES)` y pasa a ser texto libre con sugerencia, igual que
    `materiales.unidad` ya era. La columna en Postgres nunca tuvo
    restricción en ninguna de las dos tablas — se verificó contra la base
    real de Neon (sin CHECK, sin ENUM) — así que este cambio fue enteramente
    de la capa de aplicación (Zod, interfaz), sin migración.
    La lista de valores conocidos (`UNIDADES`, ver decisión 13) se movió a
    `core/unidades.ts`, compartida entre los dos catálogos vía
    `core/components/campo-lista-sugerida.tsx`, y pasa a ser SUGERENCIA, no
    restricción: el usuario puede escribir "rollo" aunque no esté en la
    lista. Detalle completo en `entidades.md`, ficha de Lista de precios,
    "`unidad` es texto libre en las dos tablas".
    Lo que sigue sin decidir, y ahora importa menos: si la unidad en la que
    se INVENTARÍA un material es o no la misma en la que un proveedor la
    COTIZA. Con las dos columnas como texto libre y la misma lista de
    sugerencias, esa distinción ya no bloquea nada — el día que se quiera
    endurecer con un `pgEnum` (decisión 13) sí habrá que resolverla antes,
    porque un enum sí asume que es un catálogo cerrado y único.

13. **¿Los siete valores de `UNIDADES` son exhaustivos, o solo los que
    aparecieron primero?** Sigue sin confirmar — esto NO se resolvió el
    2026-09-22, solo se le bajó la urgencia (ver decisión 12): mientras
    `unidad` sea texto libre con sugerencia, un valor faltante en la lista
    no bloquea a nadie, solo no aparece como sugerencia. La lista creció de
    seis a siete valores en este mismo cambio (`m`, `und`, `pzs`, `cja`,
    `kg`, `lt`, `gal` — se añadió `gal`), lo que confirma la sospecha ya
    escrita aquí: son ejemplos que se han ido ampliando, no un catálogo
    cerrado. Siguen faltando candidatos evidentes en un contexto de obra
    (`rollo`, `juego`, `m2`, `m3`, `hora`) — no se añadieron por la misma
    razón que ya valía: suponerlos sería inventar.
    **Qué se mantiene igual:** la columna sigue siendo `text` en las dos
    tablas, **no** un `pgEnum`, a diferencia de `ot_estado` y `moneda`. Así,
    añadir un valor a la lista de sugerencias es editar el array en
    `core/unidades.ts` (antes en `modules/lista-precios/constantes.ts`, solo
    para Lista de precios) — sin migración.
    **Cuando el cliente confirme una lista cerrada**, el sitio correcto SÍ
    sigue siendo un `pgEnum` construido desde `UNIDADES`, igual que
    `ot_estado` — con la salvedad, nueva desde la decisión 12, de que
    aplicaría a las dos tablas a la vez, no solo a Lista de precios.

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

15. **Nota sobre la decisión 12, revisada al construir Servicios (Bloque 14,
    Parte 1, 2026-09-23): SIGUE RESUELTA IGUAL, y ahora son tres catálogos.**
    No es una pregunta nueva — se anota aquí porque al montar el tercer
    catálogo volvió a plantearse si `unidad` debía cerrarse a la lista fija
    (esta vez empezando por Servicios, no por Materiales), y la respuesta fue
    la misma: **texto libre con sugerencias en los tres**.
    `servicios.unidad` es `text` en la base y `textoObligatorio(…, 20)` en el
    Zod, exactamente como `materiales.unidad` y `lista_precios.unidad`. Los
    tres montan el mismo `core/components/campo-lista-sugerida.tsx` con las
    mismas `UNIDADES` de `core/unidades.ts`, y en los tres lo que no esté en la
    lista se guarda igual.
    **Por qué importa dejarlo escrito:** el modal de Servicios tiene, uno al
    lado del otro, un campo que SÍ restringe (`categoria`, un `Select` con
    `z.enum`) y otro que NO (`unidad`). Se parecen desde fuera y la asimetría
    parece un descuido si no se conoce esta decisión. El criterio que las
    separa: las cinco categorías se propusieron como la lista del negocio,
    mientras que `UNIDADES` nunca se confirmó como exhaustiva (decisión 13) y
    cerrarla dejaría al usuario sin poder registrar una unidad real.
    Lo que sigue abierto no cambia: la decisión 13 (si `UNIDADES` es
    exhaustiva) y, desde este bloque, el punto 17 de aquí abajo.

16. **¿El catálogo de Servicios necesita inactivar/reactivar, y con qué
    criterio?** SIN CONFIRMAR, y por eso `servicios` **no tiene columna
    `activo`** (Bloque 14, Parte 1, 2026-09-23).
    Es la decisión deliberada de este bloque y va en dirección contraria a
    `lista_precios.activo`, que sí entró de antemano "para no requerir una
    segunda migración solo por esto". Aquí se prefirió lo contrario: añadir la
    columna antes de saber si hace falta presupone una respuesta que todavía
    no existe, y una columna `activo` que nadie escribe nunca es peor que no
    tenerla — parece un mecanismo y no lo es.
    **Consecuencia que hay que asumir con los ojos abiertos: hoy este catálogo
    NO cumple la regla invariable 9** (ningún registro se borra, se desactiva).
    No la incumple por borrar —no hay ninguna acción de borrado, ni la habrá—
    sino por no tener todavía el mecanismo de baja que esa regla presupone. Un
    servicio registrado por error se queda en el catálogo hasta que esto se
    resuelva. Es una ausencia conocida, no un descuido.
    **Qué hay que preguntar:** si un servicio deja de ofrecerse alguna vez
    (¿un alquiler de un equipo que se vendió?, ¿un servicio de temporada?), si
    al dejar de ofrecerse debe desaparecer del catálogo o solo marcarse, y qué
    pasa con lo que ya lo referencie el día que algo lo referencie — hoy nada
    lo hace: `servicios` no tiene ninguna FK entrante.
    **Si se confirma que hace falta**, el camino está trillado y es corto:
    columna `activo boolean DEFAULT true NOT NULL` + índice, su propia acción
    confirmada desde el listado (`cambiarActivoServicio`, nunca una casilla
    dentro del formulario), su esquema mínimo aparte, y el filtro "Ver solo
    inactivos" — ojo, ALTERNANDO entre dos vistas excluyentes
    (`eq(activo, inactivos ? false : true)`), nunca `inactivos ? undefined : …`,
    que es el bug que estuvo en Materiales y Personal (deuda técnica de
    AGENTS.md, 2026-09-21).

17. **Unidades: un valor "ninguna" para los servicios que no tienen unidad
    real.** PLANTEADO POR EL CLIENTE, PENDIENTE DE CONVERSAR, y **explícitamente
    NO construido en el Bloque 14** — se anota tal cual se planteó para que no
    se pierda ni se dé por hecho.
    La idea venía en dos partes y conviene separarlas, porque una ya está
    resuelta y la otra no:
    - **Permitir texto libre fuera de la lista de unidades** — YA ES ASÍ, y no
      por este bloque: lo resolvió la decisión 12 el 2026-09-22 para los tres
      catálogos. Escribir "rollo" en el campo Unidad de un servicio funciona
      hoy. Esta mitad de la idea no está pendiente.
    - **Un valor "ninguna", para servicios que no se miden en nada** — ESTO SÍ
      SIGUE PENDIENTE. Hoy `unidad` es obligatoria en el Zod de los tres
      catálogos, así que un servicio sin unidad real (una consultoría a precio
      cerrado, por ejemplo) obliga a escribir algo igualmente. Lo que el
      usuario hará mientras tanto es inventarse un valor —"und", "serv", un
      guion— y cada quien uno distinto, que es exactamente el problema que las
      sugerencias vinieron a evitar.
    **Las dos salidas posibles, y no son equivalentes:** (a) añadir `"ninguna"`
    a `UNIDADES`, que es editar un array y nada más, pero mete un valor
    centinela dentro de una lista de unidades de medida reales; o (b) hacer
    `unidad` opcional en el Zod de Servicios y dejar la columna en NULL, que es
    más honesto —"no tiene unidad" no es una unidad— pero abre la pregunta de
    qué se pinta en la tabla y si eso debe aplicar también a Materiales y Lista
    de precios. **No elegir una de las dos sin preguntar**: la diferencia se
    nota en los datos años después, no en la pantalla de hoy.

18. **¿Los cinco valores de `CATEGORIAS_SERVICIO` son exhaustivos, o solo los
    que aparecieron primero?** (Bloque 14, Parte 1, 2026-09-23.) **Menor
    prioridad** — `otros` ya cubre el caso general, así que un valor faltante no
    bloquea a nadie: se registra el servicio en `otros` y se reclasifica el día
    que la lista crezca.
    Los cinco son: `alquiler`, `fabricación`, `consultoría`, `alimentación`,
    `otros`. Tienen pinta de ser los que surgieron de la conversación y no un
    catálogo cerrado — es la misma sospecha que la decisión 13 tiene sobre
    `UNIDADES`, y allí se confirmó (la lista creció de seis a siete valores).
    **A diferencia de `unidad`, esta lista SÍ restringe**: el modal la pinta con
    un `Select` y `categoriaSchema` la valida con `z.enum`, así que un valor de
    fuera se rechaza. Que restrinja y la de unidades no es deliberado — ver la
    decisión 15 de aquí arriba.
    **Lo que se mantiene igual que en la decisión 13:** la columna es `text`,
    **no** un `pgEnum`, a diferencia de `ot_estado` y `moneda`. Así, añadir o
    quitar una categoría es editar el array `CATEGORIAS_SERVICIO` en
    `modules/servicios/constantes.ts` — sin migración. La restricción vive del
    lado de la aplicación justamente porque la lista es un borrador.
    **Cuando el cliente confirme una lista cerrada**, el sitio correcto sí es un
    `pgEnum` construido DESDE ese array, igual que `ot_estado` se construye
    desde `ESTADOS_OT` — nunca un segundo array literal. Y si en el camino se
    quita un valor que alguna fila ya use, hay que reasignar esas filas primero.
    **Lo que sí conviene preguntar aunque esto no urja:** si el negocio espera
    poder FILTRAR el catálogo por categoría. Hoy no se puede (la Parte 1 no
    tiene filtros) y nadie lo ha pedido, pero es la razón más probable por la
    que la lista tendría que cerrarse de verdad.

19. **La sugerencia de cargo del Tarifario crece con el uso: NO hay lista
    cerrada de cargos válidos.** (Bloque 15, Parte 1, 2026-09-23.) **Esto es
    una decisión ya tomada, no una pregunta** — se registra aquí porque el
    comportamiento se parece lo bastante a una carencia como para que alguien
    lo "arregle" sin saber que es deliberado.
    `tarifario_personal.cargo` es texto libre. El campo del modal usa
    `CampoConSugerencias` (`core/components/`) contra `buscarCargos`
    (`modules/tarifario-personal/queries.ts`), que es un `SELECT DISTINCT`
    sobre esa misma columna: **las sugerencias son los cargos ya escritos en
    otras tarifas, y nada más**. Consecuencias que hay que asumir con los ojos
    abiertos:
    - Con el tarifario vacío no se sugiere nada, y **tiene que ser así**: la
      primera tarifa del sistema se escribe a pelo. Un selector estricto
      dejaría esa primera fila sin poder guardarse.
    - Un cargo mal escrito se convierte en sugerencia para el siguiente. Lo que
      esto evita es la disgregación por tecleo ("Operario" y "operario"
      conviviendo como dos cargos), no los errores de escritura.
    - La consulta **no filtra por `activo`**: el cargo de una tarifa inactivada
      sigue siendo un cargo real que se usó, y esconderlo provocaría justo el
      tecleo divergente que esto evita. Mismo criterio, y por la misma razón,
      que `buscarProveedores` en Lista de precios.
    Es el mismo planteamiento que `proveedor` allí, y por el mismo motivo: **no
    existe tabla de cargos**, así que el "catálogo" es lo que uno mismo ha ido
    escribiendo.
    **Lo que sí valdría la pena preguntar algún día**, y por eso queda anotado:
    si el negocio quiere un **catálogo de cargos de verdad**, separado del
    tarifario — una tabla propia con sus cargos válidos, contra la que tanto
    este campo como cualquier otro pudieran validarse. Hoy nadie lo ha pedido y
    nada lo necesita. Si llegara, el cambio no es pequeño: `cargo` pasaría de
    `text` a FK, el componente pasaría de `CampoConSugerencias` a
    `BuscadorSeleccion` (que exige que el valor exista) y habría que decidir
    qué pasa con los cargos ya escritos que no casen con ninguna fila.
    **Ojo con una tentación concreta:** ese catálogo de cargos NO es
    `personal.cargo` ni se alimenta de él. La relación entre Personal y el
    Tarifario está descartada explícitamente por el cliente (decisión 1 de esta
    misma sección); si alguna vez se crea un catálogo de cargos, es una tercera
    tabla y hay que volver a preguntar quién lo consume.

20. **Los cuatro valores de `PERIODOS_TARIFARIO` (hora, día, mes, año): ¿son
    exhaustivos?** (Bloque 15, Parte 1, 2026-09-23.) Sin confirmar, y con **la
    urgencia baja por la misma razón que la decisión 13** tiene sobre
    `UNIDADES`: el campo es texto libre con sugerencias, así que un periodo que
    falte no bloquea a nadie — se escribe y se guarda igual, solo no aparece
    como sugerencia.
    Candidatos evidentes que NO se añadieron por no suponerlos: `turno`,
    `jornada`, `semana`, `quincena`, `servicio` (para una tarifa a precio
    cerrado). No se inventan; se añaden cuando alguien los use de verdad.
    **La lista vive en `core/periodos.ts`, SEPARADA de `UNIDADES`
    (`core/unidades.ts`), y eso no se fusiona.** Es el punto que más fácil se
    rompe por descuido: los dos campos se llaman "Unidad" en pantalla, los dos
    usan `CampoListaSugerida` y las dos columnas se llaman `unidad`. Pero una
    mide cantidad física (m, und, kg) y la otra mide tiempo. Añadir "día" a
    `UNIDADES` o "kg" a `PERIODOS_TARIFARIO` no haría una lista más completa:
    rompería el vocabulario de las dos pantallas a la vez. La cabecera de
    `core/periodos.ts` tiene la tabla comparativa.
    **Cuando el cliente confirme una lista cerrada**, el sitio correcto es un
    `z.enum` en `modules/tarifario-personal/schema.ts` y —si se confirma del
    todo— un `pgEnum` construido DESDE ese array, nunca un segundo array
    literal. Y aplicaría solo a esta tabla, no a las tres de `UNIDADES`.

## Ajustes de usuario (módulo nuevo, 2026-09-24)

21. **¿`user.dni` y `user.telefono` deben viajar en la sesión de Better Auth?**
    — **Resuelto (2026-09-24): `dni` lleva `returned: false`; `telefono` se
    sigue devolviendo.** Ver entidades.md, sección Usuario. Contexto original: Hoy salen con `returned` en su default (`true`), así que los
    dos van en la respuesta de `/api/auth/get-session` y en `useSession()` del
    cliente, igual que ya pasa con `role` y `activo`. El riesgo actual es bajo:
    es el propio dato del usuario devuelto a su propia sesión, sin fuga entre
    cuentas, y `app/(protegido)/layout.tsx` no se lo pasa a ningún componente
    cliente. Pero el DNI es un dato de identidad, más sensible que `role`, y
    la opción por defecto no se eligió a propósito: salió del default.
    La alternativa es `returned: false` en `lib/auth.ts` y leer los dos campos
    con una consulta de Drizzle solo en la pantalla de perfil. Hay que
    decidirlo **antes** de que la Server Action de perfil lea la sesión para
    rellenar el formulario, porque ese es el momento en que el default deja
    de ser inofensivo. (Anotado a raíz de la auditoría del cambio.)

22. **Formato de `user.telefono` y de `user.dni`.** Supuestos, sin confirmar
    (2026-09-24). El DNI usa el mismo supuesto que Personal (supuesto 1: ocho
    dígitos exactos), copiado en `modules/ajustes-usuario/schema.ts`; si
    cambia, cambia en los dos. El teléfono acepta dígitos, espacios, guiones,
    paréntesis y un `+` inicial, con entre 6 y 15 dígitos reales —cubre fijo,
    celular de 9 dígitos y formato internacional— y se guarda tal como se
    escribió, sin normalizar. Si el cliente quiere solo celulares peruanos, o
    un formato único para poder buscar por teléfono, se cambia en
    `telefonoPerfilSchema`.

## CRM — Empresas / Clientes (2026-09-25)

23. **Obligatoriedad y valores por defecto de `empresas`.** Supuestos, sin
    confirmar. El encargo solo marcó `razon_social` como obligatorio, así que
    en la base todo lo demás de negocio quedó nullable:
    - `ruc`: nullable porque una empresa extranjera no lo tiene. ¿Debe ser
      obligatorio cuando `pais = 'PE'`? Si sí, va en el Zod del módulo (o en
      un CHECK condicional), no cambiando la columna a `NOT NULL`.
    - `tipo` — **Resuelto (2026-09-25): `NOT NULL` y sin default.** El
      usuario lo elige siempre; ningún valor se asume.
    - `pais` — **Resuelto (2026-09-25): DEFAULT `'PE'`**, columna nullable.
    - Formato del código: `CLT.0001` (con punto desde la corrección del
      2026-09-25; nació con guion por error) arranca en 1 y tiene 4 dígitos, como
      pidió el encargo; más de 9 999 empresas desordenaría el listado por
      código (ver la ficha en entidades.md).

24. **Filtro por tipo del listado de empresas — Resuelto (2026-09-25):
    inclusivo.** `?tipo=cliente` trae `cliente` y `cliente_y_proveedor`;
    `?tipo=proveedor` trae `proveedor` y `cliente_y_proveedor`;
    `?tipo=cliente_y_proveedor` trae solo ese valor. Antes era coincidencia
    exacta (una empresa que era ambas cosas no salía al filtrar «Clientes»).
    La tabla de equivalencias es `TIPOS_POR_FILTRO` en
    `modules/clientes/queries.ts`.

25. **Consulta de RUC (Decolecta): lo que la documentación no dice.**
    En `modules/clientes/decolecta.ts`, probado en parte con una key real
    (2026-09-25):
    - **Confirmado:** un RUC de 11 dígitos que SUNAT no conoce (`20999999999`)
      vuelve como 422 con `{"message": "ruc no valido"}`, y se muestra como
      «no encontrado». El 404 se trata igual por prudencia, sin haberlo visto.
    - **Riesgo conocido, sin resolver: el 401 es ambiguo.** Con una key
      válida, Decolecta devolvió 401 con "Apikey Required / Limit Exceeded":
      el mismo código significa key inválida o límite de tasa/cuota. Hoy
      cualquier 401/403 va por la rama de credencial: el usuario ve el
      mensaje genérico de falla (no el de cuota) y el log pide revisar
      `DECOLECTA_API_KEY`, aunque pueda ser un límite pasajero. Mejora futura:
      distinguir por el cuerpo de la respuesta cuando se conozca el texto
      exacto de cada causa.
    - 429 como cuota agotada sigue siendo una suposición: no se ha visto.
    - Decolecta **no devuelve nombre comercial** en ninguna de sus consultas de
      RUC, así que ese campo nunca se sugiere. `actividad_economica` sí se
      sugiere como `descripcion_rubro`, y solo la consulta avanzada
      (`/ruc/full`) trae el tipo de contribuyente — es la que se usa.

## Embudo de oportunidades (CRM, especificado el 2026-09-25)

Especificación en `oportunidades.md`. Tiene tablas (migración 0021) y
acciones y consultas del backend (Partes 5 y 6) el modal de alta (Parte 7) y el kanban de solo lectura (Parte 8); el detalle,
el arrastre y la Tabla llegan después.

26. **¿De dónde saldrán el valor estimado y la probabilidad cuando exista el
    módulo de Cotizaciones?** Hoy se fijan al crear la oportunidad (valor por
    defecto 0, probabilidad por defecto 0) y **no se editan después**. La
    hipótesis del plan es que el valor pase a ser la suma de las cotizaciones
    vinculadas, pero no está confirmada, y de la probabilidad no hay ninguna.
    Mientras tanto no se construye ninguna edición de esos dos campos: si
    se añadiera ahora, habría que retirarla o reconciliarla con el origen
    automático.

27. **Flujos automáticos por etapa (Cotización y otras, a definir).** No se
    construyen hasta que exista el módulo de Cotizaciones. Hoy el cambio de
    etapa pasa por una única acción del backend, sin efectos secundarios, con
    un punto de enganche comentado para ellos. El único definido es el de
    Cotización: al mover una oportunidad a Cotización **sin ninguna
    cotización vinculada**, aparecerá una alerta con este contenido:
    - Mensaje: "Para mover esta oportunidad a Cotización debe existir al
      menos una cotización vinculada al cliente *CLIENTE*" (el nombre del
      cliente en cursiva).
    - Debajo: "Oportunidad OPT.CCM.AAAA.NNNNN · Título".
    - Debajo: el contacto.
    - Botones: Cancelar · Vincular existente · Crear.

    Qué otras etapas tendrán flujo, y cuál, está sin definir.

28. **¿Qué pasa si una oportunidad se crea directamente en una etapa que
    tendrá flujo automático?** Hoy se puede crear en cualquiera de las seis
    etapas. Un flujo que se dispara al *mover* a una etapa no se dispara al
    *crear* en ella, porque no hay transición. Hay que decidir, antes de
    construir el primer flujo, si la creación en esa etapa lo dispara
    también, se prohíbe o se permite sin él.

29. **Acciones críticas pendientes de permisos.** Hoy cualquier usuario con
    sesión puede hacerlas todas. Cuando existan los roles, hay que decidir
    quién puede: **mover de etapa, marcar perdida, anular, reabrir y
    editar** (título, contacto y fecha estimada de cierre). La etiqueta
    "Solo lo mío" no cambia con los roles: es fija y nunca filtra.

30. **Decisiones tomadas por defecto** (marcadas **[por defecto]** en
    `oportunidades.md`), sin indicación explícita del cliente:
    - La fecha estimada de cierre es opcional; las oportunidades sin fecha
      van al final de su columna del kanban y de su etapa en la Tabla.
    - Las actividades no se editan ni se borran (se revisa con los roles).
    - La cantidad y los totales de la cabecera cambian con los filtros; la
      tasa de cierre es global e histórica, sin filtros.
    - En la línea de etapas del detalle, las etapas futuras se pintan solo
      con contorno.
    - Al guardar una oportunidad nueva, el modal se cierra, aparece un aviso
      y la tarjeta se muestra en su columna sin recargar.

31. **Decisiones de la capa de acciones (Parte 5, 2026-09-25)** que la spec
    no dice textualmente. Las tres primeras se derivan de la sección 7 ("una
    oportunidad perdida o anulada es de solo lectura; único botón: Reabrir");
    las otras se tomaron por defecto y pueden cambiarse:
    - Una oportunidad cerrada (perdida o anulada) rechaza en el servidor la
      edición, el cambio de etapa y las actividades nuevas, no solo en la
      interfaz.
    - No se puede anular una perdida ni marcar perdida una anulada: primero
      se reabre. Así cada cierre queda como una entrada propia del
      historial.
    - Al crear se exige empresa **activa**, y contacto activo y de esa
      empresa; al editar, lo mismo para el contacto nuevo (el que ya tenía
      no se revalida, para que su baja no impida editar el título o la
      fecha).
    - **[por defecto]** Mover una oportunidad a la etapa en la que ya está no
      escribe nada y responde como éxito (doble clic, pestaña
      desactualizada).
    - **[por defecto]** Reabrir vacía `oportunidades.motivo` (el motivo del
      último cierre); el motivo sigue en el historial.
    - **[por defecto]** La fecha y hora de una actividad puede ser futura: la
      spec solo dice que puede ser anterior al registro. Si no debe
      permitirse (p. ej. porque las reuniones futuras se agendarán en otro
      sitio), se añade la validación en `actividadSchema`.

32. **Decisiones de las consultas (Parte 6) — Resuelto (2026-09-25).**
    Confirmadas y movidas a `oportunidades.md` como reglas: ">$50k" y el
    desplegable Valor se combinan (AND) (sección 5, Filtros); "Sin mover" es
    7 días o más, inclusive (sección 3); las cerradas —Finalizadas, Perdidas
    y Anuladas— no llevan reloj ni entran en "Sin mover", también en el
    kanban (sección 3); la ventana de Finalizado son 30 × 24 h desde el
    momento de la consulta (sección 5, Columnas); en la Tabla las métricas
    siguen el filtro de estado (sección 5, Cabecera); y la tasa de cierre se
    entrega como porcentaje entero redondeado (sección 2, Definiciones
    derivadas).
