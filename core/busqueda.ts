/**
 * Piezas compartidas de la búsqueda por texto de los listados.
 *
 * VIVE EN core/ PORQUE LO USAN TRES MÓDULOS (ordenes-trabajo, personal y
 * materiales) y ninguno debe importar del otro — misma regla que ya movió aquí
 * `estado-formulario.ts`, `resultado-accion.ts` y `errores-postgres.ts`
 * (AGENTS.md, Arquitectura).
 *
 * POR QUÉ SE MOVIÓ, que es la parte que conviene no olvidar: estuvo copiada y
 * pegada en los tres `queries.ts` a la espera de un cuarto listado que
 * justificara el movimiento. El coste real de esa espera se vio en
 * `errores-postgres.ts`: allí había otras tres copias del mismo patrón, dos de
 * ellas rotas en silencio durante semanas, y solo se descubrió al escribir la
 * tercera y probarla contra la base real. Un arreglo en una copia no llega a
 * las otras, y nada —ni tsc, ni el lint— avisa de que han divergido.
 *
 * La lección aplicada aquí: cuando el mismo código está en tres sitios, lo
 * barato no es dejarlo, es moverlo.
 */

/**
 * Convierte el texto que escribió el usuario en el patrón de un `ILIKE`.
 *
 * El valor viaja parametrizado en la consulta, así que no hay inyección
 * posible; lo que hay que neutralizar son los comodines del propio `LIKE`. Sin
 * este escape, buscar "50%" traería todo lo que empiece por "50", y un "_"
 * casaría con cualquier carácter — el usuario estaría escribiendo una
 * expresión sin saberlo.
 *
 * El carácter de escape es `\`, el que PostgreSQL usa por defecto en
 * `LIKE`/`ILIKE`. Se escapa también el propio `\`, o un texto que lo contenga
 * dejaría el patrón mal formado.
 *
 * Verificado contra la base real (2026-09-21): buscar "50%" encuentra el
 * material cuya descripción contiene literalmente "50%", y "TMP_A1" no trae
 * "TMP-A1".
 */
export function patronParcial(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}%`;
}
