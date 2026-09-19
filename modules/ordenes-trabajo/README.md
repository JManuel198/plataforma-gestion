# modules/ordenes-trabajo/

Fase 3 del alcance v2: el documento de ejecución que nace de un Servicio.

- `constantes.ts` — estados, piezas del código `OT.CCM.AAAA.NNNN`, zona
  horaria del negocio. Sin imports: puede viajar al cliente.
- `codigo.ts` — formateo del código y año vigente del correlativo.
- `correlativo.ts` — reserva atómica del `NNNN`. Lee su comentario antes de
  tocarlo: ahí está por qué no es `MAX(...) + 1`.
- `schema.ts` — validaciones Zod. Todo lo que llega del formulario pasa por
  aquí. `codigo_ot`, `fecha_creacion` y `servicio_id` nunca están.
- `actions.ts` — Server Actions de crear y editar. Verifican sesión.
- `queries.ts` — lecturas (listado con filtro por estado, detalle, servicio
  de origen).
- `components/` — formulario, tabla, filtro y toast.

La OT no se crea desde su propio listado: se abre desde un Servicio
(`/ordenes-trabajo/nueva?servicio=<id>`), y el servicio se ata a la Server
Action con `.bind()`, nunca como campo del formulario.

Pantallas en `app/(protegido)/ordenes-trabajo/`. Entidad documentada en
`docs/spec/entidades.md`; supuestos 5 a 9 en
`docs/spec/preguntas-abiertas.md`.
