import { aCentimos } from "@/core/dinero";
import { PATRON_DESCUENTO, PATRON_PRECIO_LISTA } from "./constantes";

/**
 * El precio de una fila de la lista de precios: `precio_lista × (1 − descuento/100)`.
 *
 * ── POR QUÉ ESTO NO ES UNA COLUMNA ──────────────────────────────────────────
 *
 * `lista_precios` NO tiene columna `precio`, y no debe tenerla. El precio no es
 * un dato: es una consecuencia de otros dos que ya están guardados. Mismo
 * principio que la edad en Personal (`calcularEdad` en lib/fecha.ts): guardada
 * sería correcta el día que se escribe y podría dejar de cuadrar en cuanto
 * alguien edite el precio de lista o el descuento, y nadie se enteraría —no hay
 * error, solo tres números que se contradicen entre sí—. Se calcula cada vez que
 * se muestra. Esto resuelve la decisión 4 de "Catálogos maestros" en
 * docs/spec/preguntas-abiertas.md.
 *
 * ── POR QUÉ ESTE ARCHIVO NO IMPORTA NADA DEL SERVIDOR ───────────────────────
 *
 * Porque lo usan los dos lados, y ESA es justamente la forma de respetar la
 * regla invariable 1 de AGENTS.md ("todo cálculo vive en el backend; el
 * frontend nunca calcula totales, descuentos ni impuestos, solo los muestra")
 * en un caso donde el usuario tiene que ver el precio actualizarse mientras
 * teclea.
 *
 * La regla protege contra una cosa concreta: que el frontend tenga su PROPIA
 * implementación del cálculo, capaz de divergir de la del servidor sin que nada
 * avise — que es exactamente cómo se rompieron `esUniqueViolado` y
 * `patronParcial` cuando estaban copiados en tres módulos (ver AGENTS.md, deuda
 * técnica). Aquí no hay dos implementaciones: hay UNA, esta, y el listado del
 * servidor y la vista previa del modal llaman a la misma función. Lo que el
 * modal enseña mientras se teclea es una previsualización de lo que el servidor
 * mostrará después, no un segundo cálculo.
 *
 * Y el valor calculado NUNCA viaja en el `FormData` ni se guarda: el campo de
 * la interfaz es de solo lectura y sin `name`. Aunque alguien forzara un POST
 * con un precio inventado, no hay columna donde escribirlo.
 *
 * Si algún día el cálculo se complica (IGV, descuentos encadenados, escalas por
 * cantidad), la respuesta NO es duplicarlo en el cliente: es que el modal deje
 * de previsualizar en vivo y pida el valor al servidor.
 */

/**
 * Convierte el porcentaje que guarda la base (`numeric(5,2)`, que Drizzle
 * entrega como texto: "12.50", "0", "7.5") a puntos básicos enteros:
 * "12.50" → 1250, "0" → 0, "100" → 10000.
 *
 * Se parte la cadena en texto en vez de hacer `Number(x) * 100`, por el mismo
 * motivo que `aCentimos` en core/dinero.ts: en coma flotante `7.5 * 100` es
 * fiable pero `12.55 * 100` da 1254.9999999999998, y truncar eso pierde un
 * punto básico. Con enteros no hay nada que redondear.
 *
 * NO reutiliza `aCentimos` aunque la aritmética sea idéntica: allí la entrada es
 * un importe que escribió el usuario y ya pasó por `montoSchema`; aquí es un
 * porcentaje que viene de la base y su rango lo garantiza el CHECK de la
 * columna. Son dos contratos distintos sobre el mismo truco. Si aparece un
 * tercer sitio que lo necesite, entonces sí toca subir la operación a core/ —
 * ese es el criterio que AGENTS.md fijó tras el caso de `patronParcial`.
 */
function aPuntosBasicos(porcentaje: string): number {
  const [enteros, decimales = ""] = porcentaje
    .trim()
    .replace(",", ".")
    .split(".");

  // Dos decimales, que es exactamente la escala de la columna `numeric(5,2)`:
  // nada que venga de la base puede traer un tercero. El `slice` cubre el caso
  // de un texto llegado por otra vía, para que un decimal de más no multiplique
  // el descuento por diez en silencio.
  return (
    Number(enteros) * 100 + Number(decimales.padEnd(2, "0").slice(0, 2))
  );
}

/**
 * El precio final en céntimos, ya con el descuento aplicado.
 *
 * `precioLista` son céntimos enteros (regla 2) y `descuento` es el porcentaje
 * tal cual lo entrega la base. Un descuento de "0" devuelve el precio de lista
 * intacto — no un número parecido: la multiplicación por 10000 y la división
 * entre 10000 se cancelan exactamente.
 *
 * Se redondea al céntimo con `Math.round`: el resultado tiene que ser un entero
 * porque es un importe, y truncar siempre hacia abajo regalaría medio céntimo
 * en cada fila.
 */
export function calcularPrecio(precioLista: number, descuento: string): number {
  const puntosBasicos = aPuntosBasicos(descuento);
  return Math.round((precioLista * (10_000 - puntosBasicos)) / 10_000);
}

/**
 * La misma cuenta, pero a partir de lo que hay escrito en el formulario, y
 * devolviendo `null` cuando todavía no hay dos números con los que operar.
 *
 * Existe para la vista previa en vivo del modal, donde el texto pasa por
 * estados intermedios que no son números ("", "12.", "1,"). Un `Number("12.")`
 * daría 12 y enseñaría un precio que el usuario no ha terminado de escribir; un
 * `Number("")` daría 0 y enseñaría un precio de cero, que es peor todavía
 * porque parece un dato.
 *
 * Valida con LOS MISMOS patrones que el Zod del servidor (`constantes.ts`), no
 * con una comprobación propia: así no puede haber un texto que aquí produzca un
 * precio en pantalla y allí un error al guardar.
 *
 * Devuelve céntimos enteros, igual que `calcularPrecio` — quien lo llame lo
 * formatea con `formatearMonto` de core/dinero.ts.
 */
export function calcularPrecioDesdeTexto(
  precioLista: string,
  descuento: string,
): number | null {
  const precioLimpio = precioLista.trim();
  const descuentoLimpio = descuento.trim();

  if (!PATRON_PRECIO_LISTA.test(precioLimpio)) return null;
  if (!PATRON_DESCUENTO.test(descuentoLimpio)) return null;
  // El rango sí se comprueba aquí: la regex deja pasar "999", y un descuento
  // mayor que 100 daría un precio negativo en pantalla. El Zod y el CHECK de la
  // columna lo rechazan al guardar; esto evita enseñar el disparate mientras
  // tanto.
  if (Number(descuentoLimpio.replace(",", ".")) > 100) return null;

  return calcularPrecio(aCentimos(precioLimpio), descuentoLimpio);
}
