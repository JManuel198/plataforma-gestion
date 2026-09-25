---
name: proyecto-verificar-migracion-datos-sin-aplicar
description: Técnica para auditar en modo solo lectura una migración de datos escrita a mano (excepción a la regla invariable 6) sin aplicarla contra la base real
metadata:
  type: project
---

Caso de origen: migración `0020_correlativo-anual-ot-a-core.sql`
(2026-09-25, rama `feature/crm-oportunidades`), que consolida
`ot_correlativo` en la tabla `correlativo` copiando filas, no estructura.
Aprobada como excepción explícita a la regla invariable 6 de AGENTS.md
(nunca SQL manual salvo esta). El encargo pedía verificar la migración
**sin aplicarla** (el usuario decide después si se aplica). Dos técnicas
que sirvieron y conviene repetir cuando vuelva a tocar auditar un caso así:

1. **Confirmar que `drizzle-kit generate` no habría emitido DDL** sin
   correrlo yo mismo (correrlo escribiría un archivo nuevo, que el auditor
   no debe hacer): comparar el `meta/<N-1>_snapshot.json` (el de antes del
   cambio, vía `git show HEAD:...`) contra el `meta/<N>_snapshot.json`
   nuevo, cargando ambos con Python/`json` y quitando `id`/`prevId` (esos
   dos campos son solo la cadena de migraciones, cambian siempre) antes de
   comparar por igualdad. Si el resto es idéntico, el snapshot nuevo no
   describe ningún cambio de esquema — confirma que la migración es
   puramente de datos sin tener que ejecutar Drizzle.
2. **Simular el SQL de la migración dentro de una transacción que termina
   en `ROLLBACK`**, con `node --env-file=.env.local` y `pg`: `BEGIN`,
   ejecutar el archivo `.sql` tal cual (leído con `fs.readFileSync`, no
   copiado a mano — para probar el archivo real, no una paráfrasis),
   `SELECT` el resultado, `ROLLBACK`. Esto confirma el resultado EXACTO
   (valores, no solo que "no falla") sin persistir nada — cumple la regla
   de solo lectura del auditor mejor que un `SELECT` suelto, porque prueba
   el propio archivo de migración.

Sirve para cualquier futura migración de datos con la misma excepción
aprobada, no solo para el correlativo. Ver [[proyecto-checkpoint-migracion-pendiente]]
para el otro tipo de checkpoint con migración sin aplicar (ahí es DDL
generado por Drizzle, no SQL de datos a mano).
