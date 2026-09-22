import { sql } from "drizzle-orm";
import type { db } from "@/db";
import { correlativo } from "@/db/schema/correlativo";

/**
 * El handle de transacción que entrega `db.transaction(async (tx) => ...)`.
 *
 * VIVE AQUÍ Y YA NO EN `modules/ordenes-trabajo/correlativo.ts` por la regla
 * de siempre: cuando una segunda entidad necesita algo que hoy vive en un
 * módulo, se mueve a core/ — nunca un import cruzado entre módulos. La segunda
 * entidad llegó (Materiales), así que el tipo se mudó y OT lo importa de aquí.
 *
 * Se deriva del tipo de `db` en vez de escribirlo a mano para que no se
 * desincronice si cambia el driver.
 */
export type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Reserva el siguiente número de un correlativo GLOBAL y lo devuelve.
 *
 * CÓMO EVITA LA CONDICIÓN DE CARRERA — esto es lo importante de este archivo,
 * y es el mismo mecanismo que ya usaba OT.
 *
 * Leer el máximo y sumarle uno no sirve: dos altas casi simultáneas leen el
 * mismo máximo y se llevan el mismo número. No es teórico, bastan dos
 * pestañas.
 *
 * Aquí la reserva es UNA SOLA sentencia, un upsert sobre la fila del ámbito:
 *
 *   INSERT INTO correlativo (clave, ultimo)
 *   VALUES ($clave, $inicial)
 *   ON CONFLICT (clave) DO UPDATE SET ultimo = correlativo.ultimo + 1
 *   RETURNING ultimo;
 *
 * PostgreSQL toma el lock de esa fila mientras la ejecuta: una segunda alta
 * simultánea **espera** a que la primera cierre su transacción y recién
 * entonces lee el valor ya incrementado. Nunca ven el mismo número.
 *
 * Exige recibir un `tx`, no la conexión suelta, a propósito: la reserva y el
 * INSERT de la fila tienen que ir en la misma transacción. Si el INSERT falla,
 * el número se revierte con él y no quedan huecos — que es justamente lo que
 * una `sequence` de PostgreSQL no daría (las secuencias no revierten).
 *
 * EN QUÉ SE DIFERENCIA DE `reservarCorrelativoAnual` (OT), que se quedó donde
 * estaba: aquel cuenta POR AÑO y reinicia cada enero, así que su tabla está
 * indexada por `anio`. Este es global y no reinicia nunca, así que su tabla se
 * indexa por un ámbito de texto (`clave`). El mecanismo de reserva es idéntico;
 * lo que no generaliza es la clave. Forzar un año falso en la tabla de OT para
 * reusarla habría ensuciado lo que allí ya funciona.
 *
 * El `UNIQUE` de la columna de código que se formatea con este número queda
 * como red de seguridad por si algún cambio futuro se saltara este camino.
 */
export async function reservarCorrelativo(
  tx: Transaccion,
  clave: string,
  inicial = 1,
): Promise<number> {
  const [fila] = await tx
    .insert(correlativo)
    .values({ clave, ultimo: inicial })
    .onConflictDoUpdate({
      target: correlativo.clave,
      set: {
        ultimo: sql`${correlativo.ultimo} + 1`,
        // `$onUpdate` de Drizzle no se dispara en un upsert: si se quiere que
        // `updated_at` refleje la última reserva hay que escribirlo aquí.
        updatedAt: sql`now()`,
      },
    })
    .returning({ ultimo: correlativo.ultimo });

  return fila.ultimo;
}
