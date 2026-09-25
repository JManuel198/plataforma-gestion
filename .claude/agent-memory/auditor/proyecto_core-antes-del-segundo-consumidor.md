---
name: proyecto-core-antes-del-segundo-consumidor
description: core/paises.ts y core/components/campo-pais.tsx nacieron en core/ con un solo consumidor (modules/clientes) — precedente a vigilar contra la regla ya escrita en AGENTS.md de mover a core/ solo con dos consumidores reales
metadata:
  type: project
---

Hallazgo BAJO en la auditoría de Empresas/Clientes Parte 4 (2026-09-25), sin
bloquear el commit: `core/paises.ts` (249 países) y
`core/components/campo-pais.tsx` se crearon directamente en `core/` aunque
hoy solo los usa `modules/clientes/`. AGENTS.md documenta explícitamente el
criterio contrario para MONEDAS/ESTADOS_OT en la deuda técnica del Bloque 13
Parte 1: **"a core/ sube lo que DOS módulos comparten, no todo lo que estaba
al lado"** — MONEDAS se quedó en el módulo de OT hasta que Lista de precios
apareció como segundo consumidor; ESTADOS_OT sigue en el módulo precisamente
porque solo tiene uno. Mismo patrón con `core/busqueda.ts`,
`core/errores-postgres.ts` y `core/use-filtros-listado.ts` (regla de las "tres
copias": se sube cuando aparece el segundo o tercer consumidor real, no antes).

El código de `campo-pais.tsx` se anticipa a esto y lo justifica en el propio
comentario ("el día que Contactos o Proveedores necesiten país, lo importan de
aquí"), lo cual es honesto pero no dispara la excepción documentada — es
justo el argumento de "generalización bien razonada que se puede repetir
indefinidamente" que la propia AGENTS.md señala como riesgo en la retrospectiva
del hook de filtros (seis copias antes de unificar): un argumento que nunca
caduca no es una excepción, es una regla nueva sin decidir a propósito.

**No se reportó como bloqueante** porque es dato estático (una lista ISO), no
lógica de negocio duplicable, y el propio Contactos (Bloque 3 de CRM) es
consumidor casi seguro en el corto plazo — pero vale la pena vigilar si
reaparece el mismo patrón (código nuevo puesto en `core/` "por si acaso" con
un solo consumidor real) en el próximo bloque de CRM, y si aparece, es el
momento de decidirlo a propósito (¿de verdad queremos generalizar de entrada
para catálogos neutros tipo país/moneda/unidad, aunque el resto del proyecto
espere al segundo consumidor?) en vez de dejar que se repita sin que nadie lo
note.

Referencia cruzada: [[proyecto-patron-fila-clicable]], [[proyecto-patrones-establecidos]].

**Resuelto (2026-09-25, antes de push, amend de a94af60):** a petición del
usuario, `paises.ts` y `campo-pais.tsx` volvieron a `modules/clientes/`. Regla
confirmada por el usuario: se mueven a core/ cuando Contactos (Bloque 3) los
necesite, no antes. Al auditar Contactos, comprobar que se MUEVEN (no que se
importan desde modules/clientes/ ni se copian).
