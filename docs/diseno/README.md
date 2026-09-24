# docs/diseno/

Guía visual para unificar el diseño de la plataforma. **No es especificación**:
ante cualquier diferencia de datos, campos o reglas de negocio manda
`docs/spec/`, y ante cualquier diferencia de convenciones manda `AGENTS.md`.
El mockup decide cómo se ve algo, no qué hace.

## `mockups.html`

Página autocontenida (sin dependencias externas) generada con una herramienta
de diseño. Se abre en cualquier navegador; necesita JavaScript, porque el
contenido viene comprimido dentro del propio archivo.

Contenido a 2026-09-24 — tres tableros, todos de **Lista de precios**:

1. **Listado con filtros** — barra lateral colapsada a iconos, cabecera con
   migas de pan, buscador con un filtro aplicado, interruptor «Ver solo
   inactivos», «Limpiar filtros» con contador, contador de ofertas activas,
   tabla con paginación y el tooltip del icono de dar de baja.
2. **Sin registros** — barra lateral expandida (marca, secciones SSOMA y
   Catálogos maestros, pie con el usuario) y el estado vacío del listado.
3. **Modal** — los modos «viendo» y «editando» (con el buscador de material
   abierto) y el alta en dos pasos: primero solo se elige el material; después
   aparecen los demás campos (se muestra con un error de validación).

Los datos (materiales, proveedor, usuario «Ana Ramírez») son ficticios.

Lo que el mockup no cubre (login, Inicio, Órdenes de Trabajo, el resto de
catálogos) se diseña extendiendo estos mismos patrones.
