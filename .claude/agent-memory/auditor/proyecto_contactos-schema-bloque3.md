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

Ver también [[proyecto_core-antes-del-segundo-consumidor]] (paises.ts sigue
sin moverse: `contactos` no tiene columna `pais`) y
[[proyecto_crm-arranque-sin-actualizar-spec]] (esta vez sí se actualizaron
AGENTS.md, entidades.md y alcance-v2-servicios-ot.md en el mismo cambio).
