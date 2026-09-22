# core/

Código transversal compartido por toda la plataforma: autenticación, roles y
permisos, catálogos maestros, motor de precios, generación de PDF y
auditoría. Nunca se bifurca ni se condiciona por cliente.

No debe contener: lógica específica de un módulo de negocio (eso va en
`modules/`) ni configuración particular de un cliente (eso va en
`config/clientes/`).

También vive aquí la interfaz que comparten varios módulos y no pertenece a
ninguno — hoy `fila-clicable.tsx` y `vista-detalle.tsx`, el patrón de "fila
clicable → vista → editar" de los listados. Es la misma regla que trajo aquí
`busqueda.ts` y `errores-postgres.ts`: si dos módulos lo necesitan, ninguno
importa del otro, se mueve a `core/`. Lo que NO va aquí son los primitivos
visuales (`components/ui/`, que los genera shadcn) ni los componentes de una
entidad concreta (`modules/<entidad>/components/`).
