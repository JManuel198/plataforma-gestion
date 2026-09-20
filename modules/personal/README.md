# modules/personal/

Las personas que trabajan en la empresa. Entidad autónoma: no depende de
ningún otro módulo, y `orden_trabajo.responsable` sigue siendo texto libre —
no hay clave foránea entre las dos tablas todavía.

- `schema.ts` — validaciones Zod. Todo lo que llega del formulario pasa por
  aquí. `activo` nunca está: se cambia con su propia acción confirmada.
- `actions.ts` — Server Actions de alta, edición y cambio de alta/baja.
  Verifican sesión y traducen cualquier fallo a un mensaje; el detalle técnico
  va al log.
- `queries.ts` — lecturas. Por defecto solo personal activo.
- `filtros.ts` — los filtros del listado y cómo se escriben en la URL.
- `tipos.ts` — `PersonaEditable`, lo que el formulario necesita precargar.
- `components/` — modal, campos, tabla, buscador, filtro y botón de baja.

## Dos cosas que no son lo que parecen

**La edad no existe como dato.** No hay columna `edad`: se calcula al pintarla
con `calcularEdad` (lib/fecha.ts) desde `fecha_nacimiento`, usando la zona del
negocio. Guardarla sería correcto el día que se escribe y falso a partir del
siguiente cumpleaños, sin que nadie se entere.

**"Dar de baja" no borra.** Pone `activo = false` y la persona desaparece del
listado por defecto, que de cara al usuario se ve igual que un borrado. La
fila se conserva porque si algún día `orden_trabajo.responsable` pasa a
apuntar a esta tabla, un DELETE dejaría OT históricas señalando a nadie. Mismo
criterio que `Cancelada` en OT.

La pantalla vive en `app/(protegido)/personal/`. Entidad documentada en
`docs/spec/entidades.md`; los supuestos sin confirmar, en
`docs/spec/preguntas-abiertas.md`.
