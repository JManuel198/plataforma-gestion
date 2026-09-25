---
name: proyecto-crm-arranque-sin-actualizar-spec
description: RESUELTO (2026-09-24) — docs/spec/alcance-v2-servicios-ot.md y README.md ya reflejan el arranque activo del grupo CRM; hallazgo MEDIO cerrado, solo queda vigilar que no se repita el patrón en módulos futuros.
metadata:
  type: project
---

RESUELTO (2026-09-24). El hallazgo original (auditoría del mismo día): al arrancar el grupo CRM en el menú (sección "CRM" en `components/barra-lateral.tsx` + tres páginas base `/clientes`, `/contactos`, `/oportunidades`), `docs/spec/alcance-v2-servicios-ot.md` sección 5 y `README.md` seguían listando esos ítems como "diferido a futuro" sin actualizar, contradiciendo la nota nueva de AGENTS.md que los declaraba en construcción activa.

**Qué se corrigió, verificado con `git diff`:**
- `docs/spec/alcance-v2-servicios-ot.md` sección 5: cada ítem afectado ("Pantalla de Clientes y Contactos", "Embudo de oportunidades") quedó anotado in situ con **"Se decidió avanzar (2026-09-24)"**, la fecha, el Bloque correspondiente (2/3/4), el estado real (solo rutas vacías) y un recordatorio de que las reglas de negocio no especificadas van primero a `preguntas-abiertas.md`. Precisión notable: el ítem del embudo aclara explícitamente que **el "flujo de aprobación" NO forma parte de la decisión de avanzar** — no sobre-reclama alcance.
- `README.md`: nuevo párrafo "En construcción activa: el grupo CRM del menú..." antes de la lista de "Diferido a versiones futuras", de la que se sacaron "CRM" y "clientes/empresas con pantalla propia" (quedan PDF, proyectos, logística, asistencias).
- Ambos archivos siguen coherentes entre sí y con AGENTS.md. `tsc --noEmit` y `eslint` en verde tras el cambio.

**Por qué importa guardarlo:** confirma que el flujo correcto ante este tipo de hallazgo es anotar in situ con fecha y alcance explícito (no necesariamente remover el ítem de su lista original) — el propio doc de alcance ya preveía este caso ("se actualiza... cuando se decida avanzar con algo de la sección 5").

**Cómo aplicar:** al auditar los Bloques 2/3/4 de CRM (Clientes, Contactos, Embudo) cuando lleguen con contenido funcional real, comprobar que las reglas de negocio que se construyan tengan primero su entrada en `docs/spec/entidades.md`/`preguntas-abiertas.md` — la anotación de 2026-09-24 lo deja como compromiso pendiente, no como hecho. Si aparece un módulo nuevo (cotizaciones, proyectos, etc.) que arranque igual sin tocar `docs/spec/`, es el mismo patrón: verificar en vivo, no asumir que se repite el mismo descuido.
