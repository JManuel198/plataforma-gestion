---
name: epps-tabla
description: Diseño de epps (Bloque 16, Parte 1, 2026-09-23) — quinto y último catálogo maestro, correlativo de 6 dígitos, unidad física (no periodo), sin activo por encargo explícito (no pregunta abierta)
metadata:
  type: project
---

Quinto y último catálogo maestro con tabla real, después de
[[materiales_tabla]], [[lista_precios_tabla]], [[servicios_tabla]] y
[[tarifario_personal_tabla]]. Archivo `db/schema/epps.ts`. Migración
`0015_odd_fixer.sql` — un solo `CREATE TABLE epps`, generada y **aplicada a
Neon en el mismo turno** (encargo explícito de aplicar, ver
[[feedback_generar_no_aplicar]]). Verificado con `psql`
(`DATABASE_URL_DIRECT` + `&sslrootcert=system`) que la tabla y sus 8
columnas quedaron como se esperaba, 0 filas, y que el enum `moneda` no
cambió (`\dT+ moneda` sigue mostrando solo PEN/USD — la migración no emitió
`CREATE TYPE` ni `ALTER TYPE`).

**Correlativo de 6 dígitos — el tercer ancho distinto entre los cinco
ámbitos de `core/correlativo.ts`.** Formato `EPP.000001` (prefijo `EPP.` +
6 dígitos), ámbito `"epps"` en la tabla compartida `correlativo` (ver
[[correlativo_generico]]). MAT./OFFT./SRV. usan 7, PRS. usa 4, este usa 6 —
confirma otra vez que el ancho es una constante por ámbito
(`modules/epps/constantes.ts`) sin nada especial en la tabla `correlativo`
ni en `core/correlativo.ts` que lo condicione. Orden alfabético = orden
numérico solo hasta `EPP.999999`, documentado como límite asumido (no bug).

**`unidad` aquí SÍ es la lista física de `core/unidades.ts`** (m, und, pzs,
cja, kg, lt, gal) — al contrario que `tarifario_personal.unidad`, que es un
periodo de tiempo (`core/periodos.ts`). Mismo nombre de columna en las
cuatro tablas de catálogo, pero solo tarifario_personal rompe el patrón.
Encargo explícito de dejarlo dicho en el comentario del schema Y en la
ficha de entidades.md, "porque es el error fácil al copiar del catálogo de
al lado" — cita textual del encargo, vale la pena recordar la frase si se
diseña un sexto catálogo algún día.

**`precio` es columna directa, no derivada** — mismo criterio que
`servicios.precio` y `tarifario_personal.costo`, al contrario que
`lista_precios.precio`. `bigint` mode "number", nullable.

**SIN columna `activo` — la distinción con Servicios es la parte que
importa recordar.** Servicios tampoco tiene `activo`, pero ahí sigue siendo
pregunta abierta (decisión 16 en preguntas-abiertas.md, sin confirmar con
el cliente). En EPPs el encargo dijo directamente "no aplica" — no es una
pregunta pendiente, es una respuesta ya dada. Mismo resultado en la tabla
(ninguna de las dos la tiene hoy), motivo distinto, y así quedó explícito
tanto en el comentario del schema como en la ficha. Si algún día se
confirma que Servicios sí necesita `activo`, EPPs no la hereda
automáticamente — son decisiones independientes.

**Documentación:** reemplazó la sección `## EPPs` de entidades.md (que
decía "Sin campos definidos todavía") con una ficha completa al mismo nivel
de detalle que Servicios y Tarifario, todavía anidada bajo el encabezado
"# BORRADOR — Catálogos maestros" (esa sección mezcla fichas ya reales de
Servicios/Tarifario/EPPs con el encabezado histórico — no se renombró el
encabezado, solo se actualizó su párrafo introductorio, porque el encargo
pedía puntualmente eso y no una reestructuración). También se actualizó la
tabla de ámbitos de "Correlativo genérico" (quinta fila) y el párrafo
introductorio del "BORRADOR" que decía que Servicios/Tarifario/EPPs
"siguen sin tabla" — con esta migración los cinco catálogos del menú del
Bloque 11 tienen ya tabla real, ninguno queda pendiente de esquema (lo que
queda pendiente son preguntas de negocio puntuales en
preguntas-abiertas.md).

No se tocó `preguntas-abiertas.md` ni `modules/` ni `app/` — instrucción
explícita del encargo, llevados por Manuel en paralelo (modules/epps/ ya
aparecía como untracked al empezar este turno).
