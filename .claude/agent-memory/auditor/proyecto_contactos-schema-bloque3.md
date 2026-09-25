---
name: proyecto-contactos-schema-bloque3
description: Auditoría del schema de contactos (CRM Bloque 3, rama feature/crm-contactos-schema, 2026-09-25) — APROBADO, sin hallazgos
metadata:
  type: project
---

Checkpoint solo de esquema (db/schema/contactos.ts + migración 0019 + docs),
sin código en modules/contactos/ todavía — coherente con lo documentado.
Verificado línea por línea contra el encargo: FK real `empresa_id` NOT NULL
con índice (mismo patrón que `lista_precios.material_id`), sin CHECK/trigger
que mire `empresas.activo`, `correo` sin UNIQUE a propósito, `celular` sin
CHECK de formato, `activo` boolean default true, timestamps con zona, sin
correlativo. El SQL generado (0019_peaceful_maximus.sql) y el snapshot JSON
coinciden exactamente con el schema.ts — no hay drift. `npx tsc --noEmit` y
`npm run lint` pasaron limpios. Barrido completo de secretos y `tenant_id`
en todo el repo, sin hallazgos.

**Pendiente para cuando se construya la UI de Contactos (no de este
checkpoint):** [[proyecto-core-antes-del-segundo-consumidor]] deja dicho que
`paises.ts`/`campo-pais.tsx` se mueven de `modules/clientes/` a `core/`
quel día que Contactos los necesite. La tabla `contactos` de este bloque NO
tiene columna `pais`, así que esa condición todavía no se disparó — no lo
des por resuelto ni por pendiente sin releer el schema de esa parte cuando
llegue el formulario.
