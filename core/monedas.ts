/**
 * Las monedas que admite cualquier importe del sistema.
 *
 * VIVE EN core/ DESDE 2026-09-22, Y ESTE MOVIMIENTO ESTABA PREVISTO. Estuvo en
 * `modules/ordenes-trabajo/constantes.ts` mientras la OT era el único módulo
 * con importes, con la nota escrita en la deuda técnica de AGENTS.md: «si un
 * segundo módulo necesita definir su propio enum compartido con el esquema,
 * mover estas listas a core/ — neutral para ambos lados — en vez de que
 * db/schema/ termine importando de varios módulos de negocio». Ese segundo
 * módulo es `modules/lista-precios/`, y `lista_precios.moneda` usa el MISMO
 * enum de PostgreSQL que `orden_trabajo.moneda`.
 *
 * `ESTADOS_OT` NO se mueve con ella y no debe: ese enum es del ciclo de vida de
 * la OT y de nadie más, así que su sitio sigue siendo el módulo. Lo que sube a
 * core/ es lo que dos módulos comparten, no todo lo que estaba al lado.
 *
 * ESTA ES LA FUENTE DE VERDAD ÚNICA del `pgEnum("moneda")`: lo construye
 * `db/schema/moneda.ts` importando este array. Nunca escribas un segundo array
 * literal con estos valores — tocar esta lista es cambiar el enum de
 * PostgreSQL, y eso exige una migración (`npx drizzle-kit generate`). Quitar un
 * valor que alguna fila ya use obliga a reasignar esas filas primero.
 *
 * Este archivo no importa nada a propósito: así viaja al cliente (los Select de
 * los formularios lo necesitan) sin arrastrar Drizzle ni la conexión.
 */
export const MONEDAS = ["PEN", "USD"] as const;

export type Moneda = (typeof MONEDAS)[number];
