# modules/servicios/

Fase 2 del alcance v2: el trabajo contratado con un cliente.

- `constantes.ts` — estados y monedas. Sin imports: puede viajar al cliente.
- `dinero.ts` — conversión monto ↔ céntimos y formato de visualización.
- `schema.ts` — validaciones Zod. Todo lo que llega del formulario pasa por aquí.
- `actions.ts` — Server Actions de crear y editar. Verifican sesión.
- `queries.ts` — lecturas (listado con filtro por estado, detalle).
- `components/` — formulario, tabla y filtro.

Pantallas en `app/(protegido)/servicios/`. Entidad documentada en
`docs/spec/entidades.md`; supuestos en `docs/spec/preguntas-abiertas.md`.
