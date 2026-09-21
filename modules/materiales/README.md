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
- `components/` — campos, modal y tabla.

Tabla en `db/schema/materiales.ts`. Pantalla en
`app/(protegido)/materiales/page.tsx` — ruta plana a propósito: el encabezado
"Catálogos maestros" del menú es solo una etiqueta y nunca entra en la URL
(ver la convención en AGENTS.md).

**Pendiente para la Parte 2:** el buscador, el filtro de inactivos y los
iconos de acción por fila. Hoy hay un botón "Editar" por fila, que es lo
mínimo para probar el modal de punta a punta. La baja lógica todavía no
tiene botón: la columna `activo` existe y el listado ya filtra por ella,
pero nada la pone en `false` (igual que hacía `BotonBaja` en Personal).
