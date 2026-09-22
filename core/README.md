# core/

Código transversal compartido por toda la plataforma: autenticación, roles y
permisos, catálogos maestros, motor de precios, generación de PDF y
auditoría. Nunca se bifurca ni se condiciona por cliente.

No debe contener: lógica específica de un módulo de negocio (eso va en
`modules/`) ni configuración particular de un cliente (eso va en
`config/clientes/`).

También vive aquí la interfaz que comparten varios módulos y no pertenece a
ninguno — `fila-clicable.tsx` y `vista-detalle.tsx` (el patrón de "fila
clicable → vista → editar" de los listados) y `components/buscador-seleccion.tsx`
(elegir un registro dentro de un formulario, sin tocar la URL). Es la misma
regla que trajo aquí `busqueda.ts` y `errores-postgres.ts`: si dos módulos lo
necesitan, ninguno importa del otro, se mueve a `core/`. Lo que NO va aquí son
los primitivos visuales (`components/ui/`, que los genera shadcn) ni los
componentes de una entidad concreta (`modules/<entidad>/components/`).

Ojo con un matiz que se ve en `buscador-seleccion.tsx`: vivir en `core/` no
significa saber de dónde salen los datos. Ese componente recibe la Server
Action que busca como prop, así que no importa de ningún módulo — es la página
(`app/`) quien conecta el buscador de un módulo con el formulario de otro. Esa
es la forma de que dos módulos colaboren sin depender uno del otro.

Lo que subió a `core/` en el Bloque 13, Parte 1, por necesitarlo un segundo
módulo: `monedas.ts` (la lista `MONEDAS`, que comparte el `pgEnum` con
`db/schema/moneda.ts`) y `dinero.ts` (conversión y formato de importes). En los
dos casos el criterio fue el mismo: sube lo que comparten dos módulos, no todo
lo que estaba al lado — `ESTADOS_OT` se quedó en Órdenes de Trabajo, y
`PRECIO_MAXIMO_CENTIMOS` en el `schema.ts` de cada entidad.
