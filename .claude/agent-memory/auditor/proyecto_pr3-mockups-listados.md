---
name: proyecto-pr3-mockups-listados
description: Hallazgos de la auditoría del PR #3 (mockups aplicados a los siete listados y la barra lateral, merge-base 1d438d1..75e6b9d, 2026-09-24) — no repetir estos patrones al auditar el siguiente bloque
metadata:
  type: project
---

Auditoría del PR #3 (JManuel198/plataforma-gestion, rama
`claude/nifty-bardeen-y86egp`, ya fusionada a `main` en 86db491). Diff real:
`git diff 1d438d1..75e6b9d` (106 archivos). El patrón de fondo de
"fila clicable → vista → editar" (ver [[proyecto-patron-fila-clicable]]) no se
tocó en su lógica, solo se le aplicó el estilo del mockup — y se confirmó que
`SelectorEstadoFila` en `fila-orden-trabajo.tsx` sigue con el `SinPropagacion`
envolviendo el componente entero (disparador + desplegable portado +
`AlertDialog`), no solo el disparador.

**Hallazgos reales de este PR** (no se corrigieron, solo se reportaron):

1. **Cálculo de descuento en el frontend** (`modules/lista-precios/precio.ts`
   `calcularPrecio`/`calcularPrecioDesdeTexto`, invocado desde
   `campos-lista-precio.tsx` en un Client Component). El valor nunca se envía
   ni se guarda —es solo vista previa, y el servidor recalcula al guardar—
   pero la aritmética del descuento SÍ corre en el navegador. El propio
   archivo trae una justificación extensa (evitar una segunda implementación
   que pueda divergir) pero la regla invariable 1 de AGENTS.md no tiene ese
   matiz por escrito. Reportado como ALTO. Si en la próxima auditoría esto
   sigue así, verificar si alguien lo registró como excepción aceptada en
   AGENTS.md o en `docs/spec/preguntas-abiertas.md` — si no, sigue siendo
   hallazgo.
2. **Bug de interpolación real**: `modules/ordenes-trabajo/components/fila-orden-trabajo.tsx`
   línea 136, `` etiquetaAccesible={`Editar {orden.codigo_ot}`} `` sin el `$`
   — es el único de doce usos de `etiquetaAccesible` en todo el proyecto que
   le falta. Verificar si se corrigió antes de repetir este hallazgo.
3. **Indentación rota (no detectada por `eslint` ni `tsc`, los dos pasan
   limpios)** en dos archivos: `modules/materiales/components/acciones-material.tsx`
   (líneas ~112-118, 122-130, 168-175) y
   `modules/tarifario-personal/components/acciones-tarifa.tsx` (líneas
   ~118-124, 128-136, 174-181): los `<BotonAccionFila>` nuevos quedaron con 2
   espacios de indentación plana en vez del anidado normal del proyecto. El
   mismo componente en `lista-precios/acciones-lista-precio.tsx` sí está bien
   indentado — no es un problema del componente, es que esos dos archivos no
   pasaron por el formateador tras la edición.
4. **Tercera instancia de dato de cliente hardcodeado fuera de `config/clientes/`**:
   `components/barra-lateral.tsx` ahora muestra "CCM" como nombre de marca en
   la cabecera de la barra (línea ~318), con un comentario que lo compara
   explícitamente con `CODIGO_EMPRESA` (la excepción YA documentada en
   AGENTS.md, que cubre solo las constantes del correlativo y el array
   `MENU`). Este "CCM" no es ninguna de las dos cosas que AGENTS.md nombra
   como excepción aceptada — es una pieza nueva. Reportado como MEDIO
   (sugerencia: registrar esta tercera instancia junto a las otras dos en la
   deuda técnica de AGENTS.md, si se decide mantenerla así).

**Todo lo demás salió limpio** y puede servir de referencia rápida en la
próxima auditoría en vez de re-verificarlo desde cero (aunque sigue habiendo
que confirmarlo, no darlo por hecho): paginación en servidor en los 7 listados
(`condicionesListado` compartida entre conteo y listado, `orderBy` con
desempate único porque el campo de desempate es `UNIQUE` en el esquema,
`paginaSchema` de `core/paginacion.ts` con `z.coerce.number().int().min(1).optional().catch(undefined)`
en los 7 `page.tsx`), filtro "Ver solo inactivos" con la condición que
alterna (`eq(activo, inactivos ? false : true)`) en los 4 módulos que lo
tienen, los 7 formularios modales con `onSubmit`+`useTransition` (nunca
`<form action>`) y `esRedireccionDeNext()` (`lib/redireccion.ts`, nuevo
helper que reemplaza el chequeo de `.digest` a mano) dejando pasar el
`NEXT_REDIRECT` en cada `catch`, sin secretos ni `tenant_id` en el diff
completo, `components/ui/switch.tsx` sigue escrito a mano con el comentario
explicando por qué (ui.shadcn.com bloqueado), y los usos de `render=` en
`boton-accion-fila.tsx` (Button nativo) no tienen el bug de `nativeButton`;
`limpiar-filtros.tsx` y `migas-de-pan.tsx` no usan `render` en absoluto.

Referencia cruzada: [[proyecto-patron-fila-clicable]],
[[proyecto-patrones-establecidos]].
