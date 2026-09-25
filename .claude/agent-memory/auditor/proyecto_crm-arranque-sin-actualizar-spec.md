---
name: proyecto-crm-arranque-sin-actualizar-spec
description: Patrón recurrente — cada avance real de un bloque de CRM deja alguna nota de estado desactualizada en otro documento (AGENTS.md o docs/spec/); resuelto dos veces (2026-09-24 arranque del menú, 2026-09-25 schema de Empresas), verificar en cada bloque nuevo.
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

**Segunda ocurrencia (2026-09-25, rama `feature/crm-empresas-schema`, sin commitear al auditar):**
al llegar el schema real de `empresas` (Bloque 2, primer pedazo funcional), `docs/spec/entidades.md` y `preguntas-abiertas.md` SÍ se actualizaron correctamente en el mismo diff (ficha completa de Empresas, tabla de ámbitos del correlativo, supuesto 23) — el compromiso de la nota anterior se cumplió esta vez. Pero aparecieron dos notas de estado en OTROS documentos que el diff no tocó y que quedaron desactualizadas por el mismo movimiento:
- `AGENTS.md` (Arquitectura, nota "Excepción en curso — CRM"): sigue diciendo "Hoy solo existen la entrada del menú y la ruta protegida con su título; sin tabla, sin código en modules/" — ya falso en cuanto este schema se fusione.
- `docs/spec/alcance-v2-servicios-ot.md:128`: sigue diciendo "hoy solo existen las rutas vacías /clientes y /contactos" — mismo problema.
Ninguna de las dos es "spec de negocio" (esa parte sí se mantuvo al día); son notas de progreso/estado que vive fuera de `entidades.md` y que nadie tiene asignado actualizar. Marqué esto como MEDIO, no bloqueante, en esa auditoría.
**Lección ampliada:** el compromiso de "actualizar docs/spec al avanzar CRM" solo cubre entidades.md/preguntas-abiertas.md en la práctica (responsabilidad clara del arquitecto-datos). Las notas de estado sueltas en AGENTS.md y en alcance-v2-servicios-ot.md no tienen dueño claro y son las que se quedan atrás. Al auditar el próximo bloque de CRM (Contactos, Embudo, o el resto de Clientes), grep explícitamente por "sin tabla" / "rutas vacías" / "solo existen" en AGENTS.md y alcance-v2-servicios-ot.md para ver si ya quedaron obsoletas otra vez.
