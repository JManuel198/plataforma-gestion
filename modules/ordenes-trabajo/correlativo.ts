import { sql } from "drizzle-orm";
import { otCorrelativo } from "@/db/schema/orden-trabajo";
import type { Transaccion } from "@/core/correlativo";
import { CORRELATIVO_INICIAL } from "./constantes";

// `Transaccion` se mudó a core/correlativo.ts cuando Materiales necesitó el
// mismo tipo: dos módulos no se importan entre sí, lo compartido va a core/.
// Se reexporta para no romper a quien ya lo importaba de aquí.
export type { Transaccion };

/**
 * Reserva el siguiente correlativo DEL AÑO y lo devuelve.
 *
 * Es el hermano anual de `reservarCorrelativo` (core/correlativo.ts), que
 * cuenta en global y no reinicia. Los dos usan el mismo upsert atómico; lo que
 * cambia es la clave de la tabla —aquí el año, allí un ámbito de texto— y que
 * este reinicia cada enero. Si algún día se consolidan, el camino es mover
 * este contador a la tabla `correlativo` con una clave tipo
 * `"orden-trabajo:2026"`; hoy conviven a propósito, porque `ot_correlativo` ya
 * tiene datos y moverlos sería una migración que nadie ha pedido.
 *
 * CÓMO EVITA LA CONDICIÓN DE CARRERA — esto es lo importante de este archivo.
 *
 * Leer el máximo y sumarle uno no sirve: dos OT creadas casi a la vez leen el
 * mismo máximo y se llevan el mismo número. No es un caso teórico, bastan dos
 * pestañas abiertas.
 *
 * Aquí la reserva es UNA SOLA sentencia, un upsert sobre la fila del año:
 *
 *   INSERT INTO ot_correlativo (anio, ultimo)
 *   VALUES ($anio, $inicial)
 *   ON CONFLICT (anio) DO UPDATE SET ultimo = ot_correlativo.ultimo + 1
 *   RETURNING ultimo;
 *
 * PostgreSQL toma el lock de esa fila mientras la ejecuta: una segunda
 * creación simultánea **espera** a que la primera cierre su transacción y
 * recién entonces lee el valor ya incrementado. Nunca ven el mismo número.
 *
 * Exige recibir un `tx`, no la conexión suelta, a propósito: la reserva y el
 * INSERT de la OT tienen que ir en la misma transacción. Si la OT falla, el
 * número se revierte con ella y no quedan huecos en la numeración — que es
 * justamente lo que una `sequence` de PostgreSQL no daría (las secuencias no
 * revierten, y reiniciarlas cada año exigiría un ALTER programado).
 *
 * El `UNIQUE` sobre `orden_trabajo.codigo_ot` queda como red de seguridad por
 * si algún cambio futuro se saltara este camino.
 */
export async function reservarCorrelativoAnual(
  tx: Transaccion,
  anio: number,
): Promise<number> {
  const [fila] = await tx
    .insert(otCorrelativo)
    .values({ anio, ultimo: CORRELATIVO_INICIAL })
    .onConflictDoUpdate({
      target: otCorrelativo.anio,
      set: {
        ultimo: sql`${otCorrelativo.ultimo} + 1`,
        // `$onUpdate` de Drizzle no se dispara en un upsert: si se quiere que
        // `updated_at` refleje la última reserva hay que escribirlo aquí.
        updatedAt: sql`now()`,
      },
    })
    .returning({ ultimo: otCorrelativo.ultimo });

  return fila.ultimo;
}
