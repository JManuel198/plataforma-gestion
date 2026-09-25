---
name: proyecto-contactos-schema-bloque3
description: Estado de las auditorías del módulo Contactos (CRM, Bloque 3) — checkpoint de schema y checkpoint de capa de servidor.
metadata:
  type: project
---

Checkpoint 1 (2026-09-25) — solo esquema (`db/schema/contactos.ts`, migración
0019): APROBADO, sin hallazgos.

Checkpoint 2 (2026-09-25) — capa de servidor (`modules/contactos/{actions,
queries,schema,filtros,constantes}.ts`, `esFkViolada` en
`core/errores-postgres.ts`, conteo real de contactos en
`modules/clientes/queries.ts` vía `db.$count(contactos, eq(contactos.empresa_id,
empresas.id))`): APROBADO, sin hallazgos. Verificado punto por punto: sesión
fuera del try en las 4 acciones, safeParse+flattenError, filtro de inactivos
alternante (no `undefined`), `alternarActivoContacto` recibe el valor final,
FK traducida con el nombre de constraint correcto
(`contactos_empresa_id_empresas_id_fk`, confirmado contra la migración
0019_peaceful_maximus.sql), `listarEmpresasParaSelector` trae activas e
inactivas con límite 50, sin imports cruzados entre modules/contactos y
modules/clientes. El `sql<number>\`count(*) filter (where ${contactos.activo})\``
de `contarContactosPorEstado` interpola un objeto Column real (no texto crudo)
y es de una sola tabla sin JOIN, así que no repite el bug de columnas sin
calificar que sí tuvo la primera versión (con `sql` escrito a mano) del conteo
de `modules/clientes/queries.ts`. Pantalla `/contactos` sigue vacía a
propósito (Partes 3-4 del bloque) — sin componentes .tsx nuevos, así que la
regla de fila-clicable/SinPropagacion no aplica todavía a este checkpoint.

Checkpoint 3 (2026-09-25, rama `feature/crm-contactos-schema`, diff sin
commitear: `app/(protegido)/contactos/page.tsx` + `modules/contactos/components/`
nuevo — Parte 3 del Bloque 3, el listado real): APROBADO con 2 hallazgos MEDIO
de documentación (no bloqueantes), sin hallazgos de seguridad ni de reglas
invariables. `tsc --noEmit` y `npm run lint` en verde. Sigue el patrón de
Empresas al detalle: `TablaContactos`/`FilaDeContacto`/`AccionesContacto`/
`DialogoContacto`/`VistaContacto` calcan `tabla-empresas.tsx` y hermanos;
columnas en el orden pedido (Contacto, Cargo, Empresa con `Building2Icon` +
razón social + RUC gris debajo, Email, Celular, Estado con `BadgeSituacion`,
Acciones fija a la derecha); `SinPropagacion` en `fila-contacto.tsx` envuelve
`AccionesContacto` + `DialogoContacto` COMPLETOS (no sus disparadores), mismo
criterio que Empresas — no hay ningún control "difícil" (Select/Combobox) en
esta fila, así que es el caso fácil, no el que confirmó OT/Empresas. El modal
en modo alta/edición muestra el aviso "El formulario de contacto está en
construcción" a propósito (Parte 4 pendiente) — verificado que NO hay
`guardarAction` en `DialogoContacto` todavía, coherente con eso.
`empresa_activo` se selecciona en `columnasListado` de queries.ts pero no se
pinta en ningún componente de este diff — NO es un hallazgo: entidades.md
(sección Contactos, "La FK NO impone que la empresa esté activa") dice
explícitamente que marcarlo en la UI "es responsabilidad de la capa de UI
(Parte 4 del bloque), no de la base". Verificar contra esa nota, no contra
intuición, si reaparece un campo similar sin pintar.

**Los 2 hallazgos MEDIO (staleness de notas de estado, no de regla de
negocio):** `AGENTS.md:54-55` sigue diciendo "la pantalla `/contactos` sigue
vacía (Partes 3 y 4 del bloque)" y `docs/spec/alcance-v2-servicios-ot.md:128`
sigue diciendo "`/contactos` sigue siendo una ruta vacía" — las dos falsas
ahora que este diff monta el listado real. Ninguna de las dos se tocó en el
diff auditado. Ver la nueva ocurrencia (sexta) en
[[proyecto_crm-arranque-sin-actualizar-spec]].

**Dato importante sobre el propio proceso de auditoría, no sobre el código:**
el AGENTS.md que llegó inyectado en el system-reminder al arrancar esta
conversación estaba desactualizado respecto al archivo real en disco — traía
una versión de la nota de CRM anterior incluso al commit `356ea77` (schema de
Contactos), ya fusionado en la rama. El `Read` en vivo de `AGENTS.md` sí trajo
la versión correcta y actualizada (que ya incorporaba el conteo real de
Empresas y el estado de Contactos hasta el checkpoint 2). Confirma en la
práctica por qué la instrucción del propio auditor prohíbe citar AGENTS.md de
memoria o de lo inyectado por el sistema: hay que releerlo con `Read` cada vez,
incluso si el texto parece "ya visto" en el mismo turno.

Ver también [[proyecto_core-antes-del-segundo-consumidor]] (paises.ts sigue
sin moverse: `contactos` no tiene columna `pais`) y
[[proyecto_crm-arranque-sin-actualizar-spec]].
