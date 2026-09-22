# modules/lista-precios/

Segundo catálogo maestro construido, después de Materiales. Guarda las
**ofertas de precio de un material por proveedor**.

Sigue el patrón de Materiales sin desviarse: mismo reparto de archivos, mismo
modal sobre el listado y mismo "fila clicable → vista → editar"
(`core/fila-clicable.tsx`). Si algo aquí se aparta de Materiales, es porque
esta entidad lo exige — y está comentado en el archivo donde ocurre.

## Las dos decisiones que conviene entender antes de tocar nada

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
- `queries.ts` — el listado, con el JOIN a `materiales` y el precio ya
  calculado en el servidor.
- `actions.ts` — Server Actions de crear y editar. Verifican sesión. El alta
  reserva el correlativo y hace el INSERT **en la misma transacción**, para
  que un fallo no deje huecos en la numeración.
- `components/` — campos, modal (tres modos), vista de detalle, fila y tabla.

Tabla en `db/schema/lista-precios.ts`. Pantalla en
`app/(protegido)/lista-precios/page.tsx` — ruta plana a propósito: el
encabezado "Catálogos maestros" del menú es solo una etiqueta y nunca entra en
la URL (ver la convención en AGENTS.md).

## Qué falta (Parte 2)

Buscador de tabla, filtro "Ver solo inactivos" y la acción de inactivar. Van
juntos a propósito: sin el filtro, inactivar sería irreversible de cara al
usuario aunque en la base no lo sea. La columna `activo` y su índice ya
existen, y el listado ya filtra por ella.

También en la Parte 2: `proveedor` deja de ser texto libre y pasa a tener su
propio `BuscadorSeleccion` — que es el segundo uso para el que ese componente
se escribió genérico.
