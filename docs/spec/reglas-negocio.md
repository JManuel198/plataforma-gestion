# Reglas de negocio

Reglas del negocio del cliente, no del código. Lo que está aquí se aplica sin
volver a preguntar; lo que no está, se consulta antes de asumirlo y se
registra en `preguntas-abiertas.md` (regla invariable 7 de AGENTS.md).

Las reglas técnicas transversales —montos en céntimos, cálculos en el
backend, fechas sin hora como `date`— viven en las Reglas invariables de
AGENTS.md, no aquí.

Archivo creado el 2026-09-21, recogiendo dos reglas que ya se aplicaban en el
código y en `entidades.md` pero que no estaban enunciadas en un solo sitio.

---

## Estados de una Orden de Trabajo

Una OT tiene **siete** estados, en este orden:

1. `Pendiente`
2. `Aceptada`
3. `En ejecución`
4. `Pausada`
5. `Finalizada`
6. `Facturado`
7. `Cancelada`

La lista vive en `modules/ordenes-trabajo/constantes.ts` (`ESTADOS_OT`), que
es su única fuente de verdad: `db/schema/orden-trabajo.ts` importa ese array
para construir el `pgEnum`. Si esta lista cambia, se cambia ahí y se genera
una migración — nunca se edita el enum a mano.

**Por qué `Aceptada` va inmediatamente después de `Pendiente`**, y no al
final: marca que **el cliente confirma que acepta la cotización antes de que
empiece el trabajo**, no al terminarlo. Es un hito comercial previo a la
ejecución, no un cierre. Por eso se sitúa entre `Pendiente` (la OT existe y
está cotizada, esperando respuesta) y `En ejecución` (ya se trabaja en
campo): una OT `Aceptada` tiene el visto bueno para arrancar pero todavía no
se ha tocado en campo.

El cliente pidió este estado el 2026-09-20, después de la fusión Servicio+OT.
La lista completa de siete sigue **pendiente de confirmación formal** — ver
`preguntas-abiertas.md`. `Facturado` viene de los estados de Servicio;
`Pausada`, `Finalizada` y `En ejecución` son los de ejecución en campo que ya
tenía la OT.

**Sin borrado.** Una OT que no va se marca `Cancelada`; nunca se borra la
fila, y no lleva columna `activo` porque el propio estado ya cumple ese papel
(regla invariable 9 de AGENTS.md).

---

## Una sola moneda por trabajo

Un trabajo se registra **en una sola moneda, nunca en dos a la vez**. La OT
lleva un único `precio` con su única `moneda` (`PEN` o `USD`); no existe ni
debe existir un registro con importes en ambas.

**Confirmado contra los datos reales**, no asumido: en el Excel original del
cliente las dos columnas de moneda eran **mutuamente excluyentes** — cada fila
tenía valor en una o en la otra, nunca en las dos. La única excepción era la
fila de totales, que no es un trabajo sino una suma, y por tanto no contradice
la regla.

Ya estaba recogido en `alcance-v2-servicios-ot.md` (Fase 2: la tabla de campos
dice "nunca ambas a la vez", y la Definición de hecho exige "un solo monto y
una sola moneda por registro"). Se enuncia aquí porque aplica a la OT
fusionada, que es donde vive hoy el precio.

**Consecuencia práctica:** no hay conversión de moneda en el sistema, ni tipo
de cambio guardado. Si alguna vez se necesita un total mezclando monedas, eso
es una regla nueva que hay que confirmar con el cliente antes de construirla
— no se deduce de esta.
