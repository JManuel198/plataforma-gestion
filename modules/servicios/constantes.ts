// Listas compartidas entre el formulario (Client Component) y las validaciones
// del servidor. Este archivo no importa nada a propósito: así puede viajar al
// cliente sin arrastrar Drizzle ni la conexión a la base de datos con él.
//
// Son las mismas listas que definen los enums de PostgreSQL en
// db/schema/servicio.ts. modules/servicios/schema.ts tiene un chequeo de
// compilación, pero cubre solo una dirección: detecta un valor inventado
// aquí, no uno que falte respecto al enum. Lee el comentario de
// `_estadoCoincide` antes de confiarte.

export const ESTADOS_SERVICIO = [
  "Activado",
  "En espera",
  "En ejecución",
  "Finalizado",
  "Facturado",
  "Rechazado",
] as const;

export const MONEDAS = ["PEN", "USD"] as const;

export type EstadoServicio = (typeof ESTADOS_SERVICIO)[number];
export type Moneda = (typeof MONEDAS)[number];

/**
 * Avisos que una Server Action deja en la URL al redirigir, para que el
 * listado pueda mostrar el toast de confirmación después de la navegación.
 */
export const AVISOS = ["creado", "editado"] as const;

export type Aviso = (typeof AVISOS)[number];
