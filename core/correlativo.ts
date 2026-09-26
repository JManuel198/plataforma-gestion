import { sql } from "drizzle-orm";
import type { db } from "@/db";
import { correlativo } from "@/db/schema/correlativo";
import { ZONA_HORARIA } from "@/lib/fecha";

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
 * Su hermano anual, `reservarCorrelativoAnual` (abajo), usa esta misma
 * función: un contador por año es solo una `clave` que incluye el año.
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

/**
 * Reserva el siguiente número de un correlativo que REINICIA CADA AÑO y lo
 * devuelve: el primero de cada año es `inicial`, y ningún año hereda el
 * conteo de otro.
 *
 * No es un mecanismo aparte: es `reservarCorrelativo` con una clave por año,
 * `"<clave>:<anio>"` (ej. `"ordenes-trabajo:2026"`), en la misma tabla
 * `correlativo`. El año nuevo no tiene fila todavía, así que su primera reserva
 * entra por el INSERT del upsert y devuelve `inicial`; las siguientes
 * incrementan. La reserva atómica, el lock de la fila y la reversión con la
 * transacción son exactamente los de arriba.
 *
 * El AÑO LO DECIDE QUIEN LLAMA, no esta función, y a propósito: el mismo año
 * tiene que numerar el contador y escribirse en el código visible (si se
 * calculara dos veces, un alta en el borde de fin de año podría salir como
 * `…2027.0001` contando sobre 2026), y tiene que calcularse en la zona horaria
 * del negocio, no en la del servidor. Ver `anioVigente`, abajo.
 *
 * `clave` no puede contener `:`, que separa el año: así la fila de un
 * correlativo anual nunca coincide con la de uno global ni con la de otro
 * anual.
 *
 * Lo usan Órdenes de Trabajo (`"ordenes-trabajo"`) y el Embudo de
 * oportunidades (`"oportunidades"`). Hasta el 2026-09-25 OT tenía su propia tabla,
 * `ot_correlativo` (PK `anio`); la migración 0020 copió su contador aquí y
 * esa tabla quedó sin uso.
 */
export async function reservarCorrelativoAnual(
  tx: Transaccion,
  clave: string,
  anio: number,
  inicial = 1,
): Promise<number> {
  if (clave.includes(":")) {
    throw new Error(`Clave de correlativo anual inválida: "${clave}"`);
  }

  return reservarCorrelativo(tx, `${clave}:${anio}`, inicial);
}

/**
 * El año con el que se numera un registro nuevo de un correlativo anual.
 *
 * Se calcula en la zona horaria del negocio, no en la del servidor: en Vercel
 * el reloj corre en UTC, así que un alta del 31 de diciembre a las 20:00 en
 * Lima ya es 1 de enero en UTC y se numeraría con el año siguiente. Cinco
 * horas al año en las que el correlativo saltaría de año antes de tiempo, y
 * el reinicio anual quedaría corrido respecto al calendario que ve el cliente.
 *
 * VIVE AQUÍ DESDE 2026-09-25. Estuvo en `modules/ordenes-trabajo/codigo.ts`
 * mientras la OT fue el único correlativo anual; el Embudo de oportunidades es
 * el segundo, y ninguno debe importar del otro. Se movió tal cual, sin cambiar
 * el cálculo: la numeración de las OT no se toca.
 */
export function anioVigente(fecha: Date = new Date()): number {
  // Misma ZONA_HORARIA que usa formatearFecha() para mostrar: el año con el
  // que se numera un registro y el que se ve en pantalla salen de la misma
  // fuente.
  const formateador = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
  });

  return Number(formateador.format(fecha));
}
