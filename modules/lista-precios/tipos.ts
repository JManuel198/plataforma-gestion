import type { FilaPrecio } from "./queries";

/**
 * Lo mínimo que este módulo necesita saber de un material para poder elegirlo.
 *
 * ESTE TIPO ES UN CONTRATO, NO UNA COPIA. `modules/lista-precios/` NO importa
 * nada de `modules/materiales/` —un módulo de negocio nunca depende de otro
 * (AGENTS.md, Arquitectura)—, así que en vez de traerse el tipo de allí declara
 * aquí la forma que le hace falta. La Server Action real
 * (`buscarMaterialesParaSeleccionAction`, que llega como prop desde la página)
 * devuelve un tipo con estos campos y alguno más, y TypeScript la acepta por
 * compatibilidad estructural.
 *
 * La ventaja de hacerlo así, y no con un import de tipo: si mañana Materiales
 * renombra una de estas columnas, el error salta en `app/`, que es el único
 * sitio que conoce a los dos módulos y por tanto el único que puede arreglarlo.
 *
 * Los cuatro campos son nullable porque en `materiales` ninguna columna de
 * negocio es `NOT NULL` — no es descuido de este módulo, es cómo está esa tabla.
 */
export type MaterialElegible = {
  id: string;
  codigo_interno: string | null;
  descripcion: string | null;
  marca: string | null;
  modelo: string | null;
};

/**
 * Una oferta tal como la reciben el modal y la vista de detalle.
 *
 * Mismo criterio que `MaterialEditable` en Materiales: es la fila del listado
 * sin lo que ya llega formateado por separado. Fuera queda `updatedAt`, que el
 * servidor entrega como texto (`fechaActualizacion`) porque es un `timestamp`
 * sin zona y formatearlo en el navegador usaría el reloj del equipo.
 *
 * SÍ incluye `precio` y `activo` aunque el formulario no los edite, porque la
 * VISTA los enseña. Que estén aquí no los convierte en campos: `precio` no
 * tiene columna —se deriva, ver precio.ts— y `activo` se cambia con su propia
 * acción (Parte 2). Ninguno de los dos aparece en `precioCrearSchema`, que es
 * lo que de verdad decide qué puede escribirse.
 */
export type PrecioEditable = Omit<FilaPrecio, "updatedAt">;
