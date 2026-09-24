# modules/lista-precios/

Segundo catálogo maestro construido, después de Materiales. Guarda las
**ofertas de precio de un material por proveedor**.

Sigue el patrón de Materiales sin desviarse: mismo reparto de archivos, mismo
modal sobre el listado y mismo "fila clicable → vista → editar"
(`core/fila-clicable.tsx`). Si algo aquí se aparta de Materiales, es porque
esta entidad lo exige — y está comentado en el archivo donde ocurre.

## Las decisiones que conviene entender antes de tocar nada

**1. `precio` NO es una columna.** Se calcula al mostrarlo, siempre:

```
precio = precio_lista × (1 − descuento/100)
```

La cuenta vive en `precio.ts` y en ningún otro sitio. Guardarlo sería un
tercer número capaz de contradecir a los otros dos sin que nada avise — mismo
principio que `edad` en Personal (`calcularEdad` en `lib/fecha.ts`). Esto
resuelve la decisión 4 de "Catálogos maestros" en `preguntas-abiertas.md`.

El modal lo muestra **en vivo** mientras se teclea, de solo lectura y sin
`name`. Eso respeta la regla invariable 1 de AGENTS.md porque **no hay un
segundo cálculo**: el listado del servidor y la vista previa del modal llaman
a la misma función. Lo que la regla prohíbe es que el frontend tenga su propia
implementación, capaz de divergir en silencio.

"Fecha de actualización" en la interfaz es `updated_at`, tampoco una columna
nueva.

**2. `material_id` es una FK real contra `materiales`**, no texto libre —
resuelve la decisión 3 de esa misma sección. El material se elige con
`BuscadorSeleccion` (`core/components/`), que solo ofrece materiales
**activos**.

Ese buscador llega como **prop desde la página**: este módulo NO importa nada
de `modules/materiales/` (un módulo de negocio nunca depende de otro). Quien
junta los dos es `app/(protegido)/lista-precios/page.tsx`, la capa de
composición. Aquí solo se declara la forma que hace falta (`MaterialElegible`
en `tipos.ts`) y TypeScript comprueba que encaje.

**El coste de esa decisión:** para cotizar un material que no está en el
catálogo hay que darlo de alta primero. Crear el material desde este mismo
modal está registrado como **mejora deliberadamente diferida** (decisión 14 de
`preguntas-abiertas.md`), no como pendiente técnico.

**3. Proveedor NO se convirtió en un selector, y eso fue un cambio de plan.**
La Parte 1 dejó escrito aquí que en la Parte 2 `proveedor` pasaría a tener su
propio `BuscadorSeleccion`. **No fue así, y conviene saber por qué antes de
"arreglarlo".**

`BuscadorSeleccion` solo admite un registro existente: mientras no se elige
uno, el formulario no tiene nada que enviar. Eso funciona para el material
—que tiene tabla— y **no puede funcionar para el proveedor**, que no la tiene:
el "catálogo" de proveedores es el `SELECT DISTINCT` de esta misma columna, así
que con la tabla vacía no habría nada que elegir y la primera oferta del
sistema no se podría guardar.

Lo que se construyó es `CampoConSugerencias` (`core/components/`): texto libre
—lo que se escriba se guarda tal cual— que ofrece los proveedores ya usados
mientras se teclea. Resuelve el problema real, que es la disgregación por
tecleo ("Ferretería Lima" y "ferreteria lima" como si fueran dos), sin impedir
un nombre nuevo.

Los dos comparten el motor de búsqueda (`core/components/busqueda-remota.ts`:
pausa de tecleo, turno de cada consulta y fallo visible), que se extrajo en vez
de copiarse — habría sido la tercera copia del mismo patrón en este repositorio,
y las dos anteriores (`esUniqueViolado`, `patronParcial`) acabaron divergiendo
en silencio.

El día que Proveedor sea una entidad de verdad (con RUC, contacto, condiciones
de pago), entonces sí es una FK y un `BuscadorSeleccion` — y la migración
tendrá que mapear los textos ya guardados, duplicados incluidos. Ver la ficha
de la tabla en `docs/spec/entidades.md`.

## Archivos

- `constantes.ts` — sin imports, seguro para el cliente: `UNIDADES`, las
  piezas del código de oferta y los patrones numéricos que comparten el Zod y
  la vista previa del precio. `MONEDAS` NO está aquí, viene de `core/monedas.ts`
  porque la comparte con Órdenes de Trabajo.
- `precio.ts` — el cálculo derivado. Sin imports de servidor: lo usan el
  listado (servidor) y el modal (cliente).
- `codigo.ts` — formatea `OFFT.0000001`. Solo el formato; quién entrega el
  número es `reservarCorrelativo` de `core/correlativo.ts`.
- `schema.ts` — validaciones Zod. Más estricto que la tabla, nunca al revés.
- `tipos.ts` — el contrato del material elegible y el tipo del formulario.
- `filtros.ts` — la forma de los filtros del listado y cómo se escriben en la
  URL. Sin imports de servidor: lo usan la consulta y los controles, que son
  cliente. `RUTA_LISTADO` no se redeclara aquí, viene de `constantes.ts`.
- `queries.ts` — el listado (JOIN a `materiales`, filtros, página con
  `LIMIT`/`OFFSET` y precio ya calculado en el servidor), los dos conteos —
  `contarResultados` (lo que casa con los filtros: el «de 14» del pie) y
  `contarPrecios` (la vista entera: «86 ofertas activas»)— y las sugerencias
  de proveedor. La paginación en sí (`calcularPaginacion`, `?pagina=`) es
  común y vive en `core/paginacion.ts`.
- `actions.ts` — Server Actions: crear, editar, cambiar `activo` y buscar
  proveedores. Todas verifican sesión. El alta reserva el correlativo y hace
  el INSERT **en la misma transacción**, para que un fallo no deje huecos en
  la numeración.
- `components/` — campos, modal (tres modos), vista de detalle, fila, tabla y
  acciones de fila (lápiz + inactivar). El buscador de tabla y el interruptor
  «Ver solo inactivos» son envoltorios finos de los comunes de
  `core/components/` (`BuscadorListado`, `FiltroSoloInactivos`), que reciben
  la `urlListado` de este módulo. La cabecera, «Limpiar filtros», el contador,
  el badge de situación y el estado vacío también salen de ahí.

Tabla en `db/schema/lista-precios.ts`. Pantalla en
`app/(protegido)/lista-precios/page.tsx` — ruta plana a propósito: el
encabezado "Catálogos maestros" del menú es solo una etiqueta y nunca entra en
la URL (ver la convención en AGENTS.md).

## Lo que trajo la Parte 2

Buscador de tabla (contra `codigo_oferta`, `proveedor` y la `descripcion` del
material, esta última vía el JOIN que la consulta ya hacía), filtro «Ver solo
inactivas» e inactivar/reactivar con confirmación. Los tres van juntos a
propósito: sin el filtro, inactivar sería irreversible de cara al usuario
aunque en la base no lo sea.

Todo importado de lo ya construido, sin reescribirlo: el estándar de fila
clicable viene de `core/fila-clicable.tsx`, el escape de comodines de
`core/busqueda.ts`, y la forma de las acciones y del filtro se copia de
Materiales, que es la referencia de los catálogos maestros.
