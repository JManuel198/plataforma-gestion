/**
 * Los PERIODOS DE TIEMPO en los que se tarifa el trabajo de una persona.
 *
 * ── NO ES `UNIDADES`, Y NO SE MEZCLA CON ELLA ───────────────────────────────
 *
 * Esta es la razón por la que este archivo existe en vez de ser un export más
 * dentro de `core/unidades.ts`. Las dos listas alimentan un campo que en el
 * formulario se LLAMA IGUAL ("Unidad") y se pinta con el MISMO componente
 * (`core/components/campo-lista-sugerida.tsx`), así que la única defensa contra
 * confundirlas es que vivan en archivos distintos y que el import lo diga:
 *
 * | | `UNIDADES` (core/unidades.ts) | `PERIODOS_TARIFARIO` (aquí) |
 * | --- | --- | --- |
 * | Qué mide | cantidad física | tiempo |
 * | Valores | m, und, pzs, cja, kg, lt, gal | hora, día, mes, año |
 * | Quién la usa | Materiales, Lista de precios, Servicios | Tarifario de personal |
 * | Qué responde | "¿en qué se mide esta cosa?" | "¿por cuánto tiempo es este costo?" |
 *
 * Un material se cotiza por metro; una persona se tarifa por día. Añadir "día"
 * a `UNIDADES` —o "kg" aquí— no sería una lista más completa, sería un
 * vocabulario roto: el desplegable de Materiales empezaría a ofrecer periodos y
 * el del Tarifario, kilos. Si alguna vez parece que las dos listas "casi" son
 * la misma, vuelve a leer esta tabla antes de fusionarlas.
 *
 * ── POR QUÉ VIVE EN core/ CON UN SOLO CONSUMIDOR ────────────────────────────
 *
 * La regla de AGENTS.md es que a `core/` sube lo que DOS módulos comparten, y
 * hoy esta lista la usa uno solo (`modules/tarifario-personal/`). Está aquí
 * igualmente, a propósito y por decisión explícita del encargo: lo que se
 * comparte no son los valores sino EL SITIO DONDE SE BUSCAN. Quien vaya a
 * llenar un campo "Unidad" abrirá `core/unidades.ts`; si la lista de periodos
 * estuviera escondida dentro de un módulo, el final probable es que alguien
 * añada "día" a `UNIDADES` por no encontrar esto — que es exactamente lo que
 * este archivo existe para evitar. El coste de tenerlo en `core/` es un archivo
 * de cuatro cadenas; el de no tenerlo es la fusión silenciosa de dos listas que
 * no son la misma.
 *
 * Por lo demás se comporta igual que `UNIDADES`: **es una SUGERENCIA, no una
 * restricción.** El campo es texto libre y lo que el usuario escriba se guarda
 * tal cual, esté o no en esta lista (`tarifario_personal.unidad` es `text`, sin
 * CHECK ni enum). Editar este array no necesita migración.
 *
 * Tampoco hay un `type Periodo = (typeof PERIODOS_TARIFARIO)[number]`, por el
 * mismo motivo que `UNIDADES` no lo tiene: un tipo así diría que la columna
 * solo puede contener uno de estos cuatro valores, y eso no es verdad. Lo que
 * la tipa es `string`.
 *
 * El día que el cliente confirme que estos cuatro son exhaustivos, el sitio
 * correcto para cerrarla es un `z.enum` en el módulo y —si se confirma del
 * todo— un `pgEnum` construido DESDE este array, nunca un segundo array
 * literal. Esa decisión no se ha tomado.
 */
export const PERIODOS_TARIFARIO = ["hora", "día", "mes", "año"] as const;
