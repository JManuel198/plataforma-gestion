/**
 * Las unidades de medida que se SUGIEREN al llenar un catálogo.
 *
 * ── NO ES UNA RESTRICCIÓN. ES UNA LISTA DE SUGERENCIAS ──────────────────────
 *
 * Esto cambió, y el cambio es el punto de este archivo. Antes esta lista era la
 * restricción de `lista_precios.unidad`: un `z.enum(UNIDADES)` en el servidor y
 * un `<select>` en el modal, de modo que "rollo" no se podía guardar. Materiales
 * nunca la tuvo — su `unidad` siempre fue texto libre—, así que los dos
 * catálogos trataban el mismo concepto de forma distinta.
 *
 * Ahora los dos son texto libre y esta lista es solo lo que ofrece el
 * desplegable de `core/components/campo-lista-sugerida.tsx`. El valor que se
 * guarda es SIEMPRE lo que haya en el input, esté o no en esta lista. Si añades
 * un valor aquí, estás añadiendo una sugerencia; NO estás abriendo ni cerrando
 * nada que antes se rechazara.
 *
 * Por eso tampoco hay un `type Unidad = (typeof UNIDADES)[number]`: existía y se
 * eliminó a propósito. Un tipo así diría que la columna solo puede contener uno
 * de estos siete valores, que es justo lo que dejó de ser verdad. La columna es
 * `text` en las dos tablas y lo que la tipa es `string`.
 *
 * ── POR QUÉ VIVE EN core/ Y NO EN UN MÓDULO ─────────────────────────────────
 *
 * Estaba en modules/lista-precios/constantes.ts cuando la usaba un solo módulo.
 * La necesitan ya dos (Materiales y Lista de precios) y la necesitará un tercero
 * (Servicios), así que subió aquí por la regla de AGENTS.md: lo que comparten
 * dos módulos se mueve a `core/`, nunca se importa de un módulo a otro. Mismo
 * camino que `MONEDAS`, `patronParcial` y `esUniqueViolado`.
 *
 * A diferencia de `MONEDAS`, esta lista NO está atada a ningún `pgEnum`: no hay
 * tipo en PostgreSQL que mantener sincronizado, porque las dos columnas son
 * `text`. Editar este array no necesita migración.
 *
 * El día que el cliente confirme una lista exhaustiva de unidades, el sitio
 * correcto para cerrarla sería un CHECK o un `pgEnum` construido desde este
 * mismo array — pero esa decisión no se ha tomado, y hoy la interfaz permite a
 * propósito escribir una unidad que no esté aquí.
 */
export const UNIDADES = ["m", "und", "pzs", "cja", "kg", "lt", "gal"] as const;
