# db/migrations/

Migraciones generadas por Drizzle Kit (`npx drizzle-kit generate`).

No debe contener: migraciones escritas a mano — siempre se generan a partir
de cambios en `db/schema/`.

**Única excepción, aprobada explícitamente (2026-09-25):**
`0020_correlativo-anual-ot-a-core.sql` es una migración de DATOS (copia el
contador de `ot_correlativo` a la tabla `correlativo`). `drizzle-kit
generate` solo produce DDL, así que el archivo lo creó `npx drizzle-kit
generate --custom` vacío y el SQL se escribió a mano. No es precedente: otra
migración de datos necesita su propia aprobación. Ver la deuda técnica del
correlativo en AGENTS.md.
