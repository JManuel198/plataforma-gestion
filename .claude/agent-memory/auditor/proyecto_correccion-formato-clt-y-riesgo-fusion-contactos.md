---
name: proyecto-correccion-formato-clt-y-riesgo-fusion-contactos
description: fix/formato-codigo-empresas (2026-09-25) corrigió CLT-0001 → CLT.0001 en todo el código vivo; feature/crm-contactos (no fusionada aún) sigue teniendo la referencia vieja CLT-0001 en su propia sección nueva de entidades.md. Verificar en vivo si ya se corrigió al auditar la próxima vez que se toque Contactos o se fusionen ambas ramas.
metadata:
  type: project
---

**Qué pasó:** `fix/formato-codigo-empresas` corrigió el separador del código de
Empresas de `CLT-0001` a `CLT.0001` (código, comentarios, entidades.md,
preguntas-abiertas.md) para igualar el patrón de los otros seis ámbitos del
correlativo (`formatearCodigoMaterial` y hermanos, que ya escriben el punto en
la plantilla). Sin migración (no hay CHECK de formato en `empresas.codigo` ni
validación Zod). Verificado con `npx drizzle-kit generate` → "No schema
changes". `tsc --noEmit` y `eslint` en verde.

**Corrección de datos en la base de desarrollo compartida**, aprobada
explícitamente por el usuario, no a través de código de la app: se borraron 3
empresas de prueba (`PRB-`) y sus 5 contactos, se borró y se recreó (vía la
Server Action `crearEmpresa` real, con sesión) la única empresa real (AZUMA
FOODS, antes `CLT-0002`, ahora `CLT.0001`, con un `id` UUID **nuevo** — no se
preservó el original), y se reinició a 0 el contador `correlativo.ultimo` de
la clave `"empresas"` (materiales siguió en 15, sin tocar). Se verificó antes
que ningún contacto apuntara a la empresa vieja (0 filas) — mitiga el riesgo
de FK huérfana que la recreación con id nuevo habría creado. Verificado en la
base tras el cambio: 1 fila en `empresas` (`CLT.0001`), `correlativo`
(`empresas`)=1, `contactos`=0. Coherente con lo declarado por el usuario en el
encargo.

**Riesgo de fusión real, detectado leyendo `feature/crm-contactos` (no
fusionada, ya tiene commits reales: schema, actions, formulario de
Contactos):** esa rama añade a `entidades.md` una sección `## Contactos (CRM,
Bloque 3)` que en su propio texto sigue diciendo *"A diferencia de
`empresas.codigo` (`CLT-0001`)..."* — el formato VIEJO, porque esa rama nació
antes de esta corrección. El merge de git probablemente no producirá conflicto
textual (los rangos de línea tocados por cada rama en `entidades.md` no se
solapan: esta corrección edita dentro de la ficha de Empresas, la otra rama
añade texto después del final de esa ficha), pero el CONTENIDO quedará
inconsistente tras fusionar ambas: la ficha de Empresas dirá `CLT.0001` y la
sección de Contactos, un párrafo más abajo, seguirá citando `CLT-0001`.
[[proyecto_crm-arranque-sin-actualizar-spec]] documenta el mismo tipo de
desincronización entre bloques de CRM, pero por notas de estado en AGENTS.md;
este es el primer caso concreto de una cita textual (no solo una nota de
estado) que queda desactualizada por trabajar en ramas paralelas.

**Cómo aplicar:** al auditar `feature/crm-contactos` (o el merge de ambas a
`main`), grepear `CLT-0001` / `CLT-` en `docs/spec/entidades.md` — si sigue
ahí tras la fusión, es un hallazgo MEDIO de coherencia de documentación
heredado de esta corrección, no un error nuevo de esa rama.
