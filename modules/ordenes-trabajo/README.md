# modules/ordenes-trabajo/

La Orden de Trabajo, entidad única del sistema tras fusionarse con Servicio:
es a la vez el documento de ejecución en campo y el registro comercial
(cotización, revisión, precio). No nace de ninguna otra entidad.

- `constantes.ts` — estados, monedas y piezas del código `OT.CCM.AAAA.NNNN`.
  Sin imports: puede viajar al cliente.
- `codigo.ts` — formateo del código y año vigente del correlativo.
- `correlativo.ts` — reserva atómica del `NNNN`. Lee su comentario antes de
  tocarlo: ahí está por qué no es `MAX(...) + 1`.
- `dinero.ts` — conversión entre el monto que escribe el usuario y los
  céntimos que se guardan (regla 2 de AGENTS.md). Venía de `modules/servicios/`.
- `schema.ts` — validaciones Zod. Todo lo que llega del formulario pasa por
  aquí. `codigo_ot` y `fecha_creacion` nunca están.
- `actions.ts` — Server Actions de crear y editar. Verifican sesión.
- `queries.ts` — lecturas (listado con filtro por estado, detalle).
- `components/` — formulario, tabla, filtro y toast.

La OT se crea desde su propio listado (`Nueva OT` →
`/ordenes-trabajo/nueva`), sin id externo atado a la Server Action.

Pantallas en `app/(protegido)/ordenes-trabajo/`. Entidad documentada en
`docs/spec/entidades.md`; supuestos 5 a 9 y 12 a 13 en
`docs/spec/preguntas-abiertas.md`.
