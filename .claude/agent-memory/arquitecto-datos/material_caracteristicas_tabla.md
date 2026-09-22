---
name: material-caracteristicas-tabla
description: Tabla hija de Materiales con DELETE real permitido — la primera excepción propia (no OT) a la regla invariable 9 de AGENTS.md, y por qué no lleva updated_at
metadata:
  type: project
---

Tabla `material_caracteristicas` (Bloque 12, Parte 4, 2026-09-22), en
`db/schema/material-caracteristicas.ts`. Diseño llegó ya decidido por Manuel
en el encargo, no propuesto por el agente — el trabajo fue implementarlo tal
cual, documentar el razonamiento en los comentarios y en
`docs/spec/entidades.md`, generar y aplicar la migración.

**Es la segunda excepción razonada a la regla invariable 9 de AGENTS.md**
("ningún registro se borra — se desactiva"), pero de naturaleza distinta a
la de `orden_trabajo`: OT no borra porque su propio `estado` ya llega a
`Cancelada` y cumple el papel de la bandera — sigue habiendo un campo que
hace ese trabajo. Aquí no hay ningún campo equivalente: se permite DELETE
real y NO hay columna `activo`, punto. La razón dada explícitamente por
Manuel: una característica no es una entidad de negocio independiente, es
metadata descriptiva que solo existe colgando de su material y que ninguna
otra tabla referencia — quitarla de la lista ES la operación, no hay un
"estado inactivo" que signifique algo. Si algún día otra tabla la
referenciara (FK hacia `material_caracteristicas.id`), la excepción deja de
ser válida y hay que revisarla — lo dejé anotado tanto en el comentario del
esquema como en la ficha de entidades.md, para que quien la lea en el futuro
no lo confunda con un olvido.

Coherente con esa misma razón: `onDelete: "cascade"` en la FK a
`materiales.id` (si el material se borra de verdad, sus características no
tienen sentido sin él), y la tabla **no lleva `updated_at`** — decisión mía,
no pedida explícitamente pero consistente con lo que Manuel describió del
flujo del modal: una característica no se edita in place, se borra y se
vuelve a crear si el texto cambia, así que no hay ningún UPDATE que
`updated_at` necesite reflejar. Si en el futuro el módulo termina editando
in place en vez de borrar+crear, esto habría que revisarlo junto con la
excepción de arriba.

`orden` es posición de entrada (entero base 0, asignado por la aplicación
según el orden de captura en el formulario), no un campo de negocio que el
usuario elija ni reordene con drag-and-drop — no hay control de "mover
arriba/abajo" en este bloque.

PK `text` con UUID en la app (misma convención que el resto de tablas
nuevas), índice sobre `material_id` para listar rápido las características
de un material. Migración `db/migrations/0011_shallow_santa_claus.sql` — un
`CREATE TABLE` + FK + índice, generada y **aplicada a Neon** con
`npx drizzle-kit migrate` (`DATABASE_URL_DIRECT`, autorización explícita del
encargo — "aplícala"). Verificado con psql (`&sslrootcert=system` en la URL,
ver la nota de conexión de AGENTS.md) que la tabla, la FK con
`ON DELETE CASCADE` y el índice existen, y que está en 0 filas — igual que
`materiales`, sin datos en juego.

No se tocó `modules/materiales/`, `core/` ni `preguntas-abiertas.md`:
instrucción explícita del encargo, el código de aplicación lo escribe Manuel
en paralelo.

Ver también [[materiales_tabla]] (tabla padre) y [[correlativo_generico]]
(otra tabla del mismo bloque de trabajo). Comparar con la excepción de OT en
docs/spec/entidades.md, sección "Orden de Trabajo", donde `estado` cumple el
papel que aquí no existe.
