---
name: materiales-tabla
description: Diseño de la tabla `materiales` (primer catálogo maestro) — por qué todos los campos de negocio quedaron nullable, sin UNIQUE, y cómo se coordinó con modules/materiales/ ya escrito en paralelo
metadata:
  type: project
---

Tabla `materiales` creada 2026-09-21 (Bloque 12, Parte 1) en
`db/schema/materiales.ts`. La migración se generó dos veces: la primera nunca
se aplicó y se borró al regenerarla (ver "Regeneración completa" más abajo),
así que **la única que existe es `db/migrations/0009_cooing_blackheart.sql`** —
si ves citado otro nombre en algún sitio, está obsoleto. En su momento se
generó sin aplicar, mismo patrón que [[feedback_generar_no_aplicar]]; hoy ya
está aplicada (ver el cierre de este archivo). Primer
catálogo maestro de los cinco del Bloque 11 con tabla real. Cuando se
escribió esto, los otros cuatro seguían en borrador en
`docs/spec/entidades.md`; hoy (verificado el 2026-09-24) los cinco tienen
tabla y módulo — ver [[lista_precios_tabla]], [[servicios_tabla]],
[[tarifario_personal_tabla]] y [[epps_tabla]].

Decisiones de modelado:

- **Ningún campo de negocio es `NOT NULL`** (`codigo_interno`, `descripcion`,
  `marca`, `modelo`, `codigo_fabrica`, `unidad`, `fecha` — todos nullable).
  A diferencia de `personal` (que sí tuvo campos evidentemente obligatorios:
  nombre, apellido, dni), aquí no había ninguna fuente de la que inferir
  obligatoriedad, y el encargo fue explícito en pedir la lectura más
  conservadora: "solo NOT NULL donde sea evidente por el propio campo". Se
  registró como decisión asumida (item 8 de "Catálogos maestros" en
  `preguntas-abiertas.md`), no silenciada.
- **Sin `UNIQUE`** sobre `codigo_interno` ni `codigo_fabrica` — no confirmado
  que sean identificadores únicos. Consecuencia directa en
  `modules/materiales/actions.ts` (ya escrito por el usuario en paralelo):
  no hay traducción de 23505 ahí, a diferencia de Personal con su DNI.
- **`fecha` es `date`/mode string**, no `timestamp` — mismo patrón que
  `personal.fecha_nacimiento` (regla invariable 10). Sigue sin resolverse DE
  QUÉ fecha se trata (alta vs. actualización) — ver
  `preguntas-abiertas.md`, no se tocó en este bloque.
- **`activo` boolean default true, NOT NULL** — única columna de negocio
  obligatoria, porque la baja lógica (regla invariable 9) es política del
  proyecto, no una regla de negocio del material.
- **Índice `materiales_activo_idx`**, mismo criterio que
  `personal_activo_idx`.

Coordinación con código ya escrito en paralelo por el usuario: al llegar a
esta tarea, `modules/materiales/{actions,queries,tipos}.ts`,
`components/dialogo-material.tsx` y `README.md` YA EXISTÍAN e importaban
`Material`/`materiales` desde `@/db/schema/materiales` (que todavía no
existía). Leerlos antes de diseñar la tabla fue lo que fijó los nombres de
columna exactos (snake_case: `codigo_interno`, `codigo_fabrica`, etc.,
igual que `fecha_nacimiento` en `personal.ts`) y confirmó que `activo` no se
escribe desde `actions.ts` (confía en el `DEFAULT true` de la columna). No
hubo que adivinar nada: el código en paralelo ya documentaba las decisiones
de negocio en sus propios comentarios (p.ej. por qué no hay traducción de
23505). `modules/materiales/schema.ts` (Zod) y `components/campos-material.tsx`
seguían sin existir — eso es lo que el usuario dijo que completaría él
mismo, y por instrucción explícita del encargo no se tocó `modules/`.

Ver también [[personal_tabla]] (mismo patrón de PK/timestamps/activo) y
[[precio_bigint]] (no aplica aquí — Materiales no tiene ningún monto).

**Actualización (Bloque 12, Parte 2, 2026-09-21): dos de las decisiones
asumidas de arriba dejaron de serlo — Manuel las confirmó.**

- `codigo_interno` pasó a `.unique()`. Mismo razonamiento que `personal.dni`:
  el UNIQUE de la base es la garantía real, no la validación del formulario.
  Sigue sin `.notNull()` — solo se confirmó unicidad, no obligatoriedad (y en
  Postgres varias filas NULL no chocan bajo un UNIQUE). `codigo_fabrica`
  sigue sin UNIQUE, sin cambios.
- `fecha` se renombró a `fecha_activacion` (columna y propiedad TS). Es la
  fecha de activación del material, sujeta a una validación previa que
  todavía no se construye. Sigue sin confirmarse si admite fechas futuras —
  no se impuso ningún CHECK, a propósito. Sigue nullable.

**Regeneración completa de la migración 0009, no ALTER encadenado.** La
primera migración generada —otro nombre, hoy borrada y sin rastro en el
repositorio— no se había aplicado nunca a Neon, así que en ese momento la
tabla no existía en ninguna base real. Por eso, en vez de generar un `0010`
(rename column + add constraint) que dependiera de la anterior, se borró la
migración vieja + su snapshot (`meta/0009_snapshot.json`) + su entrada en
`meta/_journal.json`, y se corrió `drizzle-kit generate` desde cero. Resultado: `db/migrations/0009_cooing_blackheart.sql` — una sola
`CREATE TABLE` con la forma final (incluye el `CONSTRAINT
materiales_codigo_interno_unique UNIQUE(codigo_interno)` y la columna ya
como `fecha_activacion`). `drizzle-kit check` pasó limpio. Patrón a repetir
si alguna vez se necesita "corregir" una migración que nunca llegó a
aplicarse: borrar y regenerar, no encadenar — evita arrastrar en el
historial un nombre de columna que jamás existió en ninguna base real.
**APLICADA A NEON el 2026-09-21**, con autorización explícita del usuario
("sigue sin haber datos reales que perder"). Verificado contra la base: la
tabla existe con `UNIQUE (codigo_interno)`, `fecha_activacion` de tipo `date`
e índice `materiales_activo_idx`. La regla de [[feedback_generar_no_aplicar]]
sigue en pie para la próxima — generar y parar; lo que la levantó aquí fue una
autorización puntual, no un cambio de criterio.

Se actualizó `docs/spec/entidades.md` (ficha Materiales: tabla de columnas y
los dos párrafos de prosa sobre UNIQUE y sobre `fecha_activacion`) en el mismo
bloque. No se tocó `docs/spec/preguntas-abiertas.md` ni nada bajo `modules/`:
lo llevaba el usuario en paralelo, para evitar choque de ediciones
simultáneas.

**Cierre del bloque — ya no queda nada desalineado.** Al escribirse las líneas
de arriba, `modules/materiales/schema.ts` todavía decía `fecha` y
`campos-material.tsx` etiquetaba "Fecha"; el usuario completó el renombrado en
el mismo bloque, así que **todo el módulo está sincronizado con el esquema**:
Zod, queries, tabla, input y etiqueta visible usan `fecha_activacion`, y
`actions.ts` traduce el choque de `codigo_interno` duplicado.

**Lo que pasó después con `fecha_activacion` (añadido el 2026-09-24):** la
columna se eliminó en el Bloque 12, Parte 3 (migración
`0010_open_newton_destine.sql`) y la fecha que muestra la interfaz es
`created_at` — ver [[correlativo_generico]]. En la misma parte,
`codigo_interno` pasó a generarse solo (`MAT.0000001`). Lo que este archivo
cuenta de `fecha_activacion` y del código interno escrito a mano es
historia, no el estado actual.

Ojo con esa traducción, que es lo más valioso que salió de aquí: comprobar
`error.code === "23505"` NO funciona — drizzle-orm envuelve el error de `pg` y
el `code` queda en `cause`. Estaba mal en los tres módulos y se corrigió en
`core/errores-postgres.ts` (`esUniqueViolado`). Si diseñas una tabla con
`UNIQUE`, la traducción del choque se prueba contra la base real, no se da por
buena: que la base rechace el duplicado y que el usuario vea el mensaje
correcto son dos cosas distintas.
