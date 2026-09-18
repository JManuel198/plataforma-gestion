// Listas compartidas entre el formulario (Client Component) y las validaciones
// del servidor. Este archivo no importa nada a propósito: así puede viajar al
// cliente sin arrastrar Drizzle ni la conexión a la base de datos con él.
//
// Son las mismas listas que definen los enums de PostgreSQL en
// db/schema/servicio.ts. modules/servicios/schema.ts verifica en tiempo de
// compilación que no se desincronicen.

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
