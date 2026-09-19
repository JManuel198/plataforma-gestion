// Listas y constantes compartidas entre el formulario (Client Component) y las
// validaciones del servidor. Este archivo no importa nada a propósito: así
// puede viajar al cliente sin arrastrar Drizzle ni la conexión a la base de
// datos con él. Mismo criterio que modules/servicios/constantes.ts.
//
// Los estados son los mismos que definen el enum de PostgreSQL en
// db/schema/orden-trabajo.ts. modules/ordenes-trabajo/schema.ts tiene un
// chequeo de compilación, pero cubre solo una dirección: detecta un valor
// inventado aquí, no uno que falte respecto al enum. Lee el comentario de
// `_estadoCoincide` antes de confiarte.

/**
 * Los cinco estados propuestos en docs/spec/alcance-v2-servicios-ot.md
 * (Fase 3), ya autorizados por el cliente como propuesta temporal. Son de
 * ejecución en campo, distintos a propósito de los de Servicio, que son
 * administrativos/comerciales.
 *
 * No hay columna `activo`/`inactivo` aparte: `Cancelada` ya cumple ese rol.
 */
export const ESTADOS_OT = [
  "Pendiente",
  "En ejecución",
  "Pausada",
  "Finalizada",
  "Cancelada",
] as const;

export type EstadoOt = (typeof ESTADOS_OT)[number];

/**
 * Las tres piezas fijas del código `OT.CCM.AAAA.NNNN`. Viven aquí y no
 * escritas a mano dentro de la lógica: `CCM` es la empresa y el documento la
 * declara fija, pero "fija" no es lo mismo que "repetida en cinco archivos".
 */
export const PREFIJO_OT = "OT";
export const CODIGO_EMPRESA = "CCM";
export const DIGITOS_CORRELATIVO = 4;

// La zona horaria del negocio NO está aquí: vive en lib/fecha.ts, porque
// Servicios también la necesita para mostrar fechas y un módulo de negocio no
// importa de otro. El `AAAA` del código y el reinicio anual del correlativo se
// calculan con esa misma zona (ver `anioVigente` en codigo.ts), no con el
// reloj del servidor — en Vercel ese reloj corre en UTC y adelantaría el
// cambio de año cinco horas.

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
