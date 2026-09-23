---
name: tarifario-personal-tabla
description: Diseño de tarifario_personal (Bloque 15, Parte 1, 2026-09-23) — cuarto catálogo maestro, correlativo de 4 dígitos (no 7), unidad = periodo de tiempo no unidad física, sin relación con personal
metadata:
  type: project
---

Cuarto catálogo maestro con tabla real, después de [[materiales_tabla]],
[[lista_precios_tabla]] y [[servicios_tabla]]. Archivo
`db/schema/tarifario-personal.ts`. Migración `0014_youthful_lorna_dane.sql`
— un solo `CREATE TABLE tarifario_personal` + su índice de `activo`,
generada y **aplicada a Neon en el mismo turno** (encargo explícito de
aplicar, no solo generar — ver [[feedback_generar_no_aplicar]]). Verificado
con `psql` (`DATABASE_URL_DIRECT` + `&sslrootcert=system`, ver
[[unidad_texto_libre_unificado]] para el porqué de ese parámetro) que la
tabla y sus 9 columnas quedaron como se esperaba. Constraint UNIQUE de
`codigo` en Postgres: `tarifario_personal_codigo_unique`.

**Correlativo de 4 dígitos, no 7 — la única excepción entre los cuatro
ámbitos de `core/correlativo.ts`.** Formato `PRS.0001` (prefijo `PRS.` + 4
dígitos), ámbito `"tarifario_personal"` en la tabla compartida `correlativo`
(ver [[correlativo_generico]]). MAT./OFFT./SRV. usan 7 dígitos; este encargo
pidió 4 explícitamente. El número de dígitos ya era una constante por ámbito
(vive en `modules/<x>/constantes.ts`, no en la tabla ni en `core/correlativo.ts`),
así que no hizo falta ningún cambio de diseño para admitir un ancho distinto
— solo confirma que el mecanismo generaliza también en ese eje. Con 4
dígitos el orden alfabético de `codigo` solo coincide con el numérico hasta
`PRS.9999`; documentado como límite asumido (un tarifario de cargos no llega
a diez mil filas), no como bug.

**`unidad` aquí es un PERIODO DE TIEMPO (hora/día/mes/año), no una unidad
física.** Choque de nombre real con `materiales.unidad`/`lista_precios.unidad`/
`servicios.unidad` (esas sí son m/und/kg...) — incluso comparten el mismo
nombre de columna por casualidad de vocabulario del cliente, igual que pasó
con "Servicios" (catálogo) vs "Servicio" (fusionada en OT, ver
[[fusion_servicio_ot]]). Lista nueva `PERIODOS_TARIFARIO` en
`core/periodos.ts` (la crea el agente principal, fuera de mi alcance), NO
reutiliza `core/unidades.ts`. `text` sin CHECK/ENUM, mismo criterio que
`servicios.unidad`.

**`costo` generaliza el "costo por día" del borrador en DOS columnas
(`costo` + `unidad`)** — igual que `servicios.precio`, es directo (no
derivado como `lista_precios.precio`). `bigint` mode "number", nullable; el
tope de negocio vive en el Zod del módulo.

**`activo` SÍ entra desde esta primera migración** (a diferencia de
`servicios`, que no la tiene) — mismo criterio que `lista_precios.activo`:
"para no requerir una segunda migración solo por esto". Índice
`tarifario_personal_activo_idx`, mismo patrón que los otros dos catálogos
con `activo`.

**SIN relación con `personal`, descartada por el cliente el 2026-09-23 —
no un olvido.** El borrador original en entidades.md preveía que
`personal.cargo` se autocompletara contra este tarifario; el cliente
confirmó lo contrario explícitamente. `cargo` es texto libre e independiente
en las dos tablas, sin FK en ninguna dirección. Ya estaba anotado en la
sección Personal de entidades.md y en preguntas-abiertas.md (decisión 1)
antes de que esta tabla se construyera — este bloque solo lo llevó también
a la ficha nueva.

**El campo `nivel` del borrador NO se construyó** — el encargo no lo pidió.
Anotado en entidades.md como divergencia explícita del borrador (si aparece,
es columna nueva + migración, no algo ya presente sin usar).

Todas las columnas de negocio (`cargo`, `unidad`, `costo`, `moneda`)
nullable en la BD, mismo criterio de siempre. Solo `codigo`, `activo` y
auditoría son `NOT NULL`.

No se tocó `modules/`, `app/`, `core/` ni `preguntas-abiertas.md` —
instrucción explícita del encargo, llevados por el usuario en paralelo
(incluido `core/periodos.ts`, que ya existía como archivo vacío/en progreso
al momento de este cambio).
