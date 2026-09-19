// Listas y constantes compartidas entre el formulario (Client Component) y las
// validaciones del servidor. Este archivo no importa nada a propósito: así
// puede viajar al cliente sin arrastrar Drizzle ni la conexión a la base de
// datos con él.
//
// ESTADOS_OT y MONEDAS son la fuente de verdad única de los enums `ot_estado`
// y `moneda`: db/schema/orden-trabajo.ts importa los dos arrays de aquí para
// construir sus `pgEnum`, así que no hay segundas listas que puedan
// desincronizarse. Por eso modules/ordenes-trabajo/schema.ts ya no tiene los
// chequeos de compilación que las ataban (ver el comentario que dejaron).
//
// Si tocas cualquiera de las dos listas, estás cambiando el enum de PostgreSQL:
// hace falta una migración (npx drizzle-kit generate), y quitar un valor que
// alguna fila ya use exige reasignar esas filas primero.

/**
 * Los seis estados de la OT tras la fusión con Servicio: los cinco de
 * ejecución en campo que ya tenía, más `Facturado`, que viene de los estados
 * de Servicio y permite cerrar el ciclo comercial ahora que la OT es también
 * el registro comercial.
 *
 * Lista propuesta, pendiente de confirmar con el cliente (supuesto 12 de
 * docs/spec/preguntas-abiertas.md).
 *
 * No hay columna `activo`/`inactivo` aparte: `Cancelada` ya cumple ese rol.
 */
export const ESTADOS_OT = [
  "Pendiente",
  "En ejecución",
  "Pausada",
  "Finalizada",
  "Facturado",
  "Cancelada",
] as const;

export type EstadoOt = (typeof ESTADOS_OT)[number];

/**
 * Monedas de `precio`, heredadas de Servicio en la fusión. El cliente no
 * mencionó explícitamente que la OT deba conservar moneda; se mantiene porque
 * el precio venía con ella (supuesto 13 de docs/spec/preguntas-abiertas.md).
 */
export const MONEDAS = ["PEN", "USD"] as const;

export type Moneda = (typeof MONEDAS)[number];

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
 * Avisos que una Server Action deja en la URL al redirigir, para que el
 * listado pueda mostrar el toast de confirmación después de la navegación.
 */
export const AVISOS = ["creada", "editada"] as const;

export type Aviso = (typeof AVISOS)[number];
