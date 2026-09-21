# modules/materiales/

Primer catálogo maestro construido de los cinco que declara el menú
(Materiales, Lista de precios, Servicios, Tarifario de personal, EPPs).
Los otros cuatro siguen siendo pantallas "próximamente".

**La mayoría de sus campos sigue sin confirmar con el cliente** — ver
`docs/spec/entidades.md` y la sección "Catálogos maestros" de
`docs/spec/preguntas-abiertas.md`. Por eso aquí no hay reglas de negocio
inventadas: ni formato impuesto al código interno, ni catálogo cerrado de
unidades, ni obligatoriedad en la base. Solo "requerido" en el formulario
donde el propio campo lo hace evidente.

Dos cosas SÍ están confirmadas y ya aplicadas:
- **`codigo_interno` es único.** Lo garantiza el `UNIQUE` de la tabla, no el
  formulario; el choque (error 23505) se traduce en `actions.ts` y sale
  debajo del campo.
- **`fecha_activacion` es la fecha de activación del material**, que pasa por
  una validación previa. **Ese proceso de validación no está construido** y
  queda fuera de alcance por ahora — hoy la fecha se escribe a mano y nada
  comprueba que esa validación haya ocurrido. Queda registrado en
  `preguntas-abiertas.md` para que no se pierda como necesidad futura. Sigue
  sin confirmarse si esa fecha puede ser futura, así que no se valida rango.

- `schema.ts` — validaciones Zod. Todo lo que llega del formulario pasa por
  aquí antes de tocar la base (regla 1 de AGENTS.md).
- `tipos.ts` — el tipo que consume el formulario para precargarse.
- `queries.ts` — lecturas (listado, detalle).
- `actions.ts` — Server Actions de crear y editar. Verifican sesión.
- `filtros.ts` — los filtros del listado y cómo se escriben en la URL. Sin
  Drizzle, para que lo usen tanto el servidor como los controles cliente.
- `components/` — campos, modal, tabla, buscador, filtro de inactivos y las
  acciones de fila.

Tabla en `db/schema/materiales.ts`. Pantalla en
`app/(protegido)/materiales/page.tsx` — ruta plana a propósito: el encabezado
"Catálogos maestros" del menú es solo una etiqueta y nunca entra en la URL
(ver la convención en AGENTS.md).

**Parte 2 (hecha):** buscador, filtro de inactivos y las dos acciones de
fila. Este módulo es ahora la **referencia del patrón de Catálogos maestros**
—dos iconos por fila (editar, inactivar), sin lupa de detalle— que Servicios,
Lista de precios, Tarifario de personal y EPPs heredan tal cual. Está
documentado en `.claude/skills/shadcn-conventions/SKILL.md`, sección
"Catálogos maestros"; si cambias algo aquí, cámbialo también allí.

`patronParcial()` en `queries.ts` es ya la TERCERA copia idéntica (las otras
en personal/ y ordenes-trabajo/). Cumple de sobra la condición de AGENTS.md
para mudarse a `core/`; se dejó aquí para no mezclar ese movimiento con este
bloque, y es lo primero que hay que hacer si aparece un cuarto listado con
búsqueda.
