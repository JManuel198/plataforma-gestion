// Listas y constantes compartidas entre el formulario (Client Component) y las
// validaciones del servidor. Este archivo no importa nada a propósito: así
// puede viajar al cliente sin arrastrar Drizzle ni la conexión a la base de
// datos con él.
//
// ESTADOS_OT es la fuente de verdad única del enum `ot_estado`:
// db/schema/orden-trabajo.ts importa el array de aquí para construir su
// `pgEnum`, así que no hay una segunda lista que pueda desincronizarse. Por eso
// modules/ordenes-trabajo/schema.ts ya no tiene los chequeos de compilación que
// las ataban (ver el comentario que dejaron).
//
// Si tocas esa lista, estás cambiando el enum de PostgreSQL: hace falta una
// migración (npx drizzle-kit generate), y quitar un valor que alguna fila ya
// use exige reasignar esas filas primero.
//
// MONEDAS YA NO ESTÁ AQUÍ: vive en `core/monedas.ts` desde el 2026-09-22,
// porque `modules/lista-precios/` la comparte con este módulo y ninguno de los
// dos debe importar del otro. El movimiento estaba previsto textualmente en la
// deuda técnica de AGENTS.md. `ESTADOS_OT` se queda: es del ciclo de vida de la
// OT y de nadie más.

/**
 * Los siete estados de la OT: los cinco de ejecución en campo que ya tenía,
 * más `Facturado`, que viene de los estados de Servicio y permite cerrar el
 * ciclo comercial ahora que la OT es también el registro comercial, y
 * `Aceptada`, que el cliente pidió el 2026-09-20.
 *
 * `Aceptada` va entre `Pendiente` y `En ejecución` a propósito: marca que la
 * OT ya tiene el visto bueno para arrancar, pero que todavía no se está
 * trabajando en campo. Es un paso de avance del trabajo, no un cierre — por
 * eso no entra en `ESTADOS_A_CONFIRMAR` (ver selector-estado-fila.tsx).
 *
 * El orden del array es también el orden del enum en PostgreSQL, así que
 * refleja el ciclo de vida de la OT y no el capricho de quien lo editó: un
 * valor nuevo se inserta donde le toca en el ciclo, no al final.
 *
 * Lista propuesta, pendiente de confirmar con el cliente (supuesto 12 de
 * docs/spec/preguntas-abiertas.md).
 *
 * No hay columna `activo`/`inactivo` aparte: `Cancelada` ya cumple ese rol.
 */
export const ESTADOS_OT = [
  "Pendiente",
  "Aceptada",
  "En ejecución",
  "Pausada",
  "Finalizada",
  "Facturado",
  "Cancelada",
] as const;

export type EstadoOt = (typeof ESTADOS_OT)[number];

// Las monedas de `precio` —heredadas de Servicio en la fusión, supuesto 13 de
// docs/spec/preguntas-abiertas.md— se importan de `@/core/monedas`.

/**
 * Las tres piezas fijas del código `OT.CCM.AAAA.NNNN`. Viven aquí y no
 * escritas a mano dentro de la lógica: `CCM` es la empresa y el documento la
 * declara fija, pero "fija" no es lo mismo que "repetida en cinco archivos".
 */
export const PREFIJO_OT = "OT";
export const CODIGO_EMPRESA = "CCM";
export const DIGITOS_CORRELATIVO = 4;

// La zona horaria del negocio NO está aquí: vive en lib/fecha.ts. El `AAAA`
// del código y el reinicio anual del correlativo se calculan con esa misma
// zona (ver `anioVigente` en codigo.ts), no con el reloj del servidor — en
// Vercel ese reloj corre en UTC y adelantaría el cambio de año cinco horas.

/**
 * Primer correlativo de cada año nuevo.
 *
 * Supuesto, no confirmado por el cliente (sección 6 del alcance y
 * docs/spec/preguntas-abiertas.md): cada año arranca en `0001`. Si se
 * confirma que debe arrancar en `0000`, esta constante es el único sitio que
 * cambia — por eso existe en vez de estar escrita dentro del contador.
 */
export const CORRELATIVO_INICIAL = 1;

/**
 * Ámbito del correlativo anual de OT en la tabla compartida `correlativo`
 * (core/correlativo.ts, `reservarCorrelativoAnual`): la fila de cada año es
 * `"ordenes-trabajo:<año>"`.
 *
 * NO SE RENOMBRA: la migración 0020 copió el contador que ya existía
 * (`ot_correlativo`) a filas con este mismo texto. Cambiarlo haría que el año
 * en curso arrancara de nuevo en `CORRELATIVO_INICIAL` y chocara con el
 * UNIQUE de `codigo_ot`.
 */
export const CLAVE_CORRELATIVO_OT = "ordenes-trabajo";

/**
 * Avisos que una Server Action deja en la URL al redirigir, para que el
 * listado pueda mostrar el toast de confirmación después de la navegación.
 */
export const AVISOS = ["creada", "editada"] as const;

export type Aviso = (typeof AVISOS)[number];
