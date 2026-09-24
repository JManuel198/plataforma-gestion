import { aCentimos, formatearMonto } from "@/core/dinero";
import type { Moneda } from "@/core/monedas";
import { PATRON_DESCUENTO, PATRON_PRECIO_LISTA } from "./constantes";
import { formatearNumerico } from "./numeros";

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
 * ── POR QUÉ NO ES UNA SOLA MULTIPLICACIÓN ───────────────────────────────────
 *
 * La forma obvia —`Math.round(precioLista * (10000 - bps) / 10000)`— DA UN
 * CÉNTIMO EQUIVOCADO en la parte alta del rango, y ese rango es alcanzable.
 *
 * El problema es el PRODUCTO INTERMEDIO, aunque la entrada y el resultado
 * quepan de sobra: `PRECIO_MAXIMO_CENTIMOS` es 99 999 999 999 999 (~10^14) y
 * multiplicarlo por 10 000 da ~10^18, muy por encima de
 * `Number.MAX_SAFE_INTEGER` (~9×10^15). Pasado ese punto los enteros de
 * JavaScript dejan de ser exactos y la división posterior arrastra el error.
 *
 * No es teórico: con `precioLista` en el techo y un descuento de 49.78 %, esa
 * versión daba 50 220 000 000 000 cuando el valor correcto es
 * 50 219 999 999 999. Y el techo lo permite `precioListaSchema`, así que el
 * cálculo solo era exacto en parte del rango que su propia validación admite —
 * la misma clase de error silencioso que la regla 2 evita al prohibir los float
 * para dinero.
 *
 * ── CÓMO SE EVITA, SIN `BigInt` ─────────────────────────────────────────────
 *
 * Partiendo el precio en las unidades de 10 000 céntimos que caben y el resto:
 *
 *     precioLista = cientos × 10000 + resto      (0 ≤ resto < 10000)
 *     precio      = cientos × factor + redondeo(resto × factor / 10000)
 *
 * Es la misma cuenta reordenada —sumar un entero antes o después de redondear
 * da igual—, pero ahora ningún producto se dispara: `cientos × factor` llega a
 * ~10^14 y `resto × factor` a ~10^8. Los dos caben exactos.
 *
 * Se hace así y no con `BigInt` porque el `target` de tsconfig.json es ES2017,
 * donde los literales `10000n` no compilan. Cambiar el target del proyecto
 * entero por esta función sería el rabo meneando al perro; la descomposición no
 * cuesta nada y además deja la propiedad a la vista.
 *
 * El `Math.round` final es el redondeo al céntimo más cercano: el resultado
 * tiene que ser entero —es un importe— y truncar siempre hacia abajo regalaría
 * medio céntimo en cada fila.
 *
 * Verificado contra aritmética exacta con `BigInt` en los 10 001 descuentos
 * posibles sobre el precio del techo: cero desvíos.
 */
export function calcularPrecio(precioLista: number, descuento: string): number {
  const factor = 10_000 - aPuntosBasicos(descuento);
  const cientos = Math.floor(precioLista / 10_000);
  const resto = precioLista - cientos * 10_000;

  return cientos * factor + Math.round((resto * factor) / 10_000);
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

/**
 * La cuenta escrita, para que quien mira el precio vea de dónde sale:
 * «S/ 186.00 × (1 − 12 %)». La usan la vista del modal (con los valores
 * guardados) y la vista previa del formulario (con lo que se está tecleando),
 * y por eso vive aquí: las dos tienen que escribirla igual.
 *
 * Solo TEXTO: no calcula nada. El importe sigue saliendo de `calcularPrecio`.
 */
export function formulaPrecio(
  precioListaCentimos: number,
  descuento: string,
  moneda: Moneda,
): string {
  const porcentaje = formatearNumerico(descuento.trim().replace(",", "."));
  return `${formatearMonto(precioListaCentimos, moneda)} × (1 − ${porcentaje} %)`;
}
