# Servicios (catálogo maestro)

Catálogo de servicios que la empresa ofrece, con su precio de tarifa.
Tercer catálogo maestro con tabla real, después de Materiales y Lista de
precios (Bloque 14, Parte 1, 2026-09-23; buscador y filtro de categoría en
la Parte 2, mismo bloque).

**Este NO es la entidad `Servicio` que se fusionó en Orden de Trabajo el
2026-09-19.** Aquella era un trabajo contratado con un cliente concreto y sus
campos viven hoy en `orden_trabajo`. Este es un catálogo de precios
reutilizables: el "catálogo de servicios con precios fijos" que
`docs/spec/alcance-v2-servicios-ot.md` difería a su sección 5. Comparten la
ruta `/servicios` y poco más — la colisión de nombre está registrada como
decisión 7 de "Catálogos maestros" en `docs/spec/preguntas-abiertas.md`.

## Qué hay aquí

| Archivo | Qué resuelve |
| --- | --- |
| `constantes.ts` | `CATEGORIAS_SERVICIO`, `capitalizarCategoria`, el formato del código `SRV.` y el ámbito del correlativo. No importa nada, así que viaja al cliente. |
| `codigo.ts` | `1` → `"SRV.0000001"`. Solo formateo; quién decide el número es `core/correlativo.ts`. |
| `schema.ts` | Validación Zod, incluidos los dos esquemas de filtro. Más estricto que la tabla, nunca al revés. |
| `filtros.ts` | El tipo `FiltrosServicios`, `urlListado` y `hayFiltros` — la navegación por URL, sin Drizzle. |
| `queries.ts` | El listado, con sus dos filtros combinados por AND. También documenta por qué este módulo no tiene `tipos.ts`. |
| `actions.ts` | Alta y edición. La reserva del correlativo va en la misma transacción que el INSERT. |
| `components/` | Tabla, fila clicable, modal de tres modos, vista de solo lectura, buscador y filtro de categoría. |

## El buscador incluye `unidad`, a diferencia de sus hermanos

Materiales y Lista de precios dejan `unidad` fuera de su buscador — "un
puñado de valores repetidos… traería medio catálogo" (ver
`.claude/skills/shadcn-conventions/SKILL.md`). Aquí SÍ entra, junto con
`codigo` y `servicio`: es una decisión deliberada de la Parte 2, no una
inconsistencia. El argumento de los otros dos pesa menos cuando el
buscador solo tiene tres columnas de texto en total —`categoria` ya tiene
su propio filtro de lista cerrada (`FiltroCategoria`) y no le hace falta
buscador—, así que excluir `unidad` habría dejado el buscador cubriendo
dos tercios del vocabulario del catálogo en vez de todo. Ver el
comentario de `busqueda` en `filtros.ts` para el detalle completo.

## `capitalizarCategoria`, no `className="capitalize"`

`categoria` se guarda en minúscula (es el valor de `CATEGORIAS_SERVICIO`)
pero se muestra con la primera letra en mayúscula. La Parte 1 lo resolvía
con la clase de Tailwind `capitalize`, y tenía un error real: `capitalize`
de CSS mayusculiza CADA palabra del texto, no solo la primera. Eso
corrompía el `placeholder` del `Select` ("Elige una categoría" → "Elige
Una Categoría") y habría corrompido igual la opción "Todas las
categorías" del filtro nuevo de esta Parte 2. Se corrigió con una función
(`capitalizarCategoria`) que solo toca la primera letra del VALOR real,
nunca el texto que lo envuelve — usada en el formulario, el filtro, la
fila y la vista de detalle. Ningún componente de Servicios usa ya
`className="capitalize"`.

## Tres cosas que distinguen a este módulo de sus hermanos

1. **No hay columna `activo`, así que no hay inactivar ni reactivar.** No es
   un olvido: nadie ha confirmado que este catálogo necesite dar de baja, y
   añadir la columna antes de saberlo presupone una respuesta que todavía no
   existe. Consecuencia directa: hoy este catálogo **no cumple la regla
   invariable 9** por ausencia de mecanismo, no por haberla descartado. Está
   registrado como pregunta abierta.
2. **`precio` es un dato directo, no derivado.** Es la diferencia de fondo con
   Lista de precios, donde `precio` no existe como columna porque se calcula a
   partir de `precio_lista` y `descuento`. Aquí es el precio de tarifa: un solo
   número que alguien fija.
3. **`categoria` restringe y `unidad` no**, aunque los dos campos ofrezcan una
   lista y estén uno al lado del otro en el modal. Categoría es un `Select` y
   un `z.enum`; unidad es texto libre con sugerencias, igual que en los otros
   dos catálogos (decisión 12 de "Catálogos maestros", cerrada el 2026-09-22).
   El porqué de la asimetría está en la cabecera de `components/campos-servicio.tsx`.

## Lo que falta

- **Inactivar/reactivar**, si y solo si se confirma que hace falta (decisión
  16 de "Catálogos maestros" en `docs/spec/preguntas-abiertas.md`). No hay
  Parte 3 planeada para esto: depende de una respuesta del cliente, no de
  trabajo pendiente.
