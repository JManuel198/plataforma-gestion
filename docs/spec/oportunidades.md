# Embudo de oportunidades (CRM)

Especificación del módulo **Embudo de oportunidades** del grupo CRM (ruta
`/oportunidades`). Recoge la Parte A de `docs/diseno/plan-embudo-oportunidades.md`,
sus "Decisiones posteriores" y las resoluciones tomadas al comparar el mockup
(2026-09-25). Ante una diferencia con el plan, manda este archivo; el plan
conserva además el orden de trabajo (Parte B), que no es especificación.

**Guía visual:** `docs/diseno/embudo-oportunidades.html` (mockup autocontenido;
pantallas en `#/embudo`, `#/tabla` y `#/oportunidad/6`). Como todo lo de
`docs/diseno/`, decide cómo se ve, no qué hace: en datos y reglas manda este
archivo.

**Estado (2026-09-25):** especificado y con esquema (tablas `oportunidades`,
`oportunidad_historial` y `oportunidad_actividades`, migración 0021, aplicada
en desarrollo; detalle en `entidades.md`) y con las acciones del backend
(Parte 5 del plan: crear, editar, cambiar etapa, cerrar/reabrir, actividades y
selectores, en `modules/oportunidades/actions.ts`) y las consultas (Parte 6:
kanban, tabla, métricas y línea de tiempo, en `queries.ts`). La ruta
`/oportunidades` muestra el kanban de solo lectura con su cabecera, métricas
y filtros (Parte 8) y el modal "Nueva oportunidad" (Parte 7); el detalle, el
arrastre y la Tabla llegan después. Sigue oculta a
los correos de `CRM_OCULTO_PARA` (ver AGENTS.md).

**Marcas.** Lo que lleva **[por defecto]** se decidió sin indicación explícita
del cliente y puede cambiarse; está registrado también en
`preguntas-abiertas.md`, sección "Embudo de oportunidades". Todo lo demás está
confirmado.

---

## 1. Etapas

Seis etapas, en este orden y con estos colores:

| # | Etapa | Color |
|---|---|---|
| 01 | Prospecto | gris |
| 02 | Cotización | morado |
| 03 | Negociación | naranja |
| 04 | Adjudicado | verde |
| 05 | Ejecución | azul oscuro |
| 06 | Finalizado | verde oscuro |

- **Los colores se definen en un solo lugar del código.** *Por qué:* el
  cliente puede querer cambiarlos. Con una sola fuente, cambiar un color es
  editar un valor, no buscarlo en el kanban, la tabla, la línea de etapas y
  las etiquetas.
- **Se eliminó "Calificado" y se agregó "Finalizado".** Antes existía
  "Calificado" después de Prospecto. *Por qué:* decisión del cliente (el
  motivo de negocio no quedó registrado). Se anota para que nadie "restaure"
  la etapa creyendo que se perdió por descuido.

## 2. Situación

La situación es independiente de la etapa: **abierta**, **perdida** o
**anulada**.

- Una oportunidad perdida o anulada **conserva su última etapa**. Al
  reabrirla vuelve exactamente a esa etapa.
- **Perdida:** el negocio no se dio. Motivo **obligatorio**. Cuenta en la tasa
  de cierre como no ganada.
- **Anulada:** se creó por error o está duplicada. Motivo **opcional**. No
  cuenta en la tasa de cierre.
- **Reabrir:** devuelve la oportunidad a su última etapa y queda en el
  historial.
- **Una oportunidad en Finalizado no se puede marcar perdida**, pero sí
  anular. *Por qué:* convertiría un negocio ganado en perdido y alteraría la
  tasa de cierre. La regla se aplica en los tres sitios donde se puede marcar
  perdida: el detalle, el menú "…" de la Tabla y el diálogo de la papelera del
  kanban (donde solo aparece Anular).
- **Sin baja lógica.** No hay columna `activo` ni activar/desactivar: anular
  cumple ese papel. Es la misma excepción razonada que la OT con `Cancelada`
  (regla invariable 9 de AGENTS.md): el propio estado ya marca el registro
  como fuera de operación, y nunca se borra la fila.
- **Permisos:** hoy cualquier usuario con sesión puede hacerlo todo. Qué
  acciones se restringen se decide con los roles (ver preguntas abiertas).

### Definiciones derivadas

- **Oportunidades activas:** situación abierta y etapa distinta de Finalizado.
- **Ganadas:** oportunidades abiertas en Adjudicado, Ejecución o Finalizado.
- **Tasa de cierre:** ganadas ÷ (ganadas + perdidas). Las anuladas no
  cuentan. Sin datos suficientes (denominador 0) se muestra "—". Se entrega
  como **porcentaje entero redondeado** (ej. 2 ÷ 3 → 67 %), calculado en el
  backend (confirmado el 2026-09-25).

## 3. Campos de una oportunidad

| Campo | Regla |
|---|---|
| Código | `OPT.CCM.AAAA.NNNNN`, autogenerado al guardar. Reinicia cada año, igual que el de las OT. "CCM" es fijo (abreviatura de la empresa, como en las OT) y no es configurable hasta que se pida explícitamente. |
| Título | Obligatorio. Editable desde el detalle (lápiz). |
| Empresa | Obligatoria. Solo empresas **activas** de `empresas`; incluye clientes y proveedores. **No se puede cambiar** después de crear. |
| Contacto | Opcional. Solo contactos **activos** de la empresa elegida. Se asigna al crear o después, desde el detalle (lápiz). Un contacto asignado se puede quitar, dejando la oportunidad sin contacto (consecuencia de que el campo es opcional). |
| Asesor | El usuario que crea la oportunidad, asignado automáticamente. No se edita. |
| Moneda | USD (por defecto) o PEN. Fija después de crear. |
| Valor estimado | Por defecto 0, mayor o igual a 0, con 2 decimales; se guarda en céntimos (regla invariable 2). **No se edita después de crear.** |
| Probabilidad % | Entero de 0 a 100, por defecto 0. Si se deja vacía, se guarda como 0 (consecuencia de ese valor por defecto). **No se edita después de crear**; en el detalle es solo lectura. |
| Etapa inicial | Cualquiera de las seis. Por defecto, Prospecto. |
| Fecha estimada de cierre | Tipo `date` (regla invariable 10). Editable desde el detalle (ícono de fecha). **[por defecto]** Opcional; las oportunidades sin fecha van al final de su columna. |
| Etapa cambiada en | Momento del último cambio de etapa (y de la creación). Alimenta el reloj de días y el filtro "Sin mover ≥7d". |
| Situación | Abierta, perdida o anulada (sección 2). |

El origen futuro del valor y la probabilidad (¿las cotizaciones vinculadas?)
es una pregunta abierta; hoy se fijan al crear.

### Reloj de días

Días calendario, en hora de Lima, desde **Etapa cambiada en** hasta hoy.

- **Cuenta desde el último cambio de etapa**, no desde la creación ni desde la
  última actividad. *Por qué:* el filtro "Sin mover ≥7d" busca oportunidades
  estancadas en su etapa, y solo tiene sentido medido así.
- **Solo un cambio de etapa lo reinicia.** Marcar perdida, anular y reabrir
  no lo tocan, y tampoco las ediciones ni las actividades.
- Se muestra en rojo **desde 7 días**, y el filtro "Sin mover ≥7d" es
  **7 días o más, inclusive** (confirmado el 2026-09-25).
- **No aplica a oportunidades cerradas: Finalizadas, Perdidas y Anuladas.**
  *Por qué:* mide movimiento, y solo tiene sentido mientras la oportunidad
  sigue en movimiento. Ninguna de las tres lleva reloj de días **en ningún
  sitio** —tampoco las tarjetas de la columna Finalizado del kanban— ni
  entra en el filtro "Sin mover ≥7d". Por eso la Tabla muestra "—" en ellas y
  el filtro se deshabilita allí (sección 9). Confirmado el 2026-09-25; el
  mockup pintaba días en las tarjetas de Finalizado, y en esto manda este
  archivo.

## 4. Historial y actividades

### Historial

Se guarda un **historial de cambios**, empezando por los de etapa. *Por
qué:* un solo campo "etapa actual" pierde de dónde venía la oportunidad,
quién la movió y cuándo; el historial lo conserva y deja constancia de las
acciones que cierran o reabren una oportunidad, que no se pueden deshacer sin
dejar rastro.

Registra:

- la creación, con su etapa inicial;
- cada cambio de etapa, de cuál a cuál;
- las ediciones de título, contacto y fecha estimada de cierre, con el valor
  anterior y el nuevo;
- marcar perdida (con motivo), anular (con motivo, si lo hay) y reabrir (con
  la etapa a la que vuelve).

Cada entrada guarda quién lo hizo, con fecha y hora. **El historial no se
edita ni se borra.**

### Actividades

- Tipo: Nota, Llamada, Reunión, Correo o Visita.
- **Descripción:** obligatoria (así se llama el campo de texto).
- Fecha y hora: obligatorias; por defecto el momento actual, editables (la
  actividad pudo ocurrir antes).
- Autor: el usuario en sesión.
- **[por defecto]** Por ahora no se editan ni se borran; se revisa con los
  roles.

### Línea de tiempo

El historial y las actividades se muestran juntos en una sola lista, ordenada
por fecha y hora, lo más reciente arriba, con un contador "N registros".

## 5. Vista Embudo (kanban) — vista por defecto

### Cabecera

- Título **"CRM Comercial"** con la etiqueta **"Solo lo mío"**. La etiqueta
  **es fija y nunca filtra**, tampoco cuando existan los roles. *Por qué:* es
  un recordatorio de que los registros son propios, no un control. Quién ve
  qué se decidirá con los roles, fuera de esta etiqueta.
- Subtítulo "Pipeline en tiempo real · N oportunidades activas" (N según la
  definición de la sección 2, sin filtros).
- A la derecha: botón **"Nueva oportunidad"** y, debajo, cantidad de
  oportunidades, total en dólares, total en soles y tasa de cierre.
  **[por defecto]** La cantidad y los totales cambian con los filtros
  aplicados; la tasa de cierre es global e histórica, sin filtros.
  **Se calculan sobre lo que muestra la vista** (confirmado el 2026-09-25):
  en el Embudo, las oportunidades del kanban; en la Tabla, además, el filtro
  de estado activo.

### Nombres

"CRM Comercial" es **solo el título de la cabecera de la página**. El menú
lateral y las migas de pan siguen como hoy: grupo "CRM", ítem "Embudo de
oportunidades". Hay precedente: el ítem "Clientes" abre la página "Empresas".

### Filtros

Viven en la URL y se combinan entre sí.

- **Búsqueda:** por título o código de la oportunidad, y por razón social o
  nombre comercial de la empresa.
- **Opciones rápidas** (selección única): Todas · Sin mover ≥7d · >$50k.
  ">$50k" filtra valores **de $50k o más**.
- **Cliente:** desplegable con las empresas que tienen oportunidades. Por
  defecto, todas.
- **Valor:** Todos · menos de $10k · de $10k a menos de $50k · de $50k a
  menos de $200k · $200k o más. Límite inferior incluido, superior excluido.
- **">$50k" y el desplegable Valor se combinan (AND)**, como el resto de
  filtros (confirmado el 2026-09-25). La selección única es solo entre las
  tres opciones rápidas; Valor es un filtro aparte. *Por qué:* esta sección
  ya lo definía así desde el principio: "selección única" está escrita para
  las opciones rápidas, y "se combinan entre sí" para los filtros. Si se
  combinan sin intersección (">$50k" con "menos de $10k"), el resultado es
  una lista vacía, sin manejo especial.
- **En la interfaz, Valor y ">$50k" se excluyen** (decidido en la Parte 8,
  2026-09-26): elegir un rango en Valor quita ">$50k" si estaba activo, y
  activar ">$50k" devuelve Valor a "Todos". *Por qué:* los dos filtran por
  importe en dólares y juntos casi siempre dan una lista vacía; es la forma
  más simple de evitarlo sin quitarle a Valor su combinación con Cliente, la
  búsqueda y "Sin mover ≥7d". Es solo de la interfaz: una URL con los dos
  (escrita a mano) sigue combinándolos con AND.
- **Los filtros de valor (">$50k" y el desplegable) solo consideran
  oportunidades en dólares.** No hay tipo de cambio (ver "Una sola moneda por
  trabajo" en `reglas-negocio.md`), así que las de soles quedan fuera.

### Columnas

- Una por etapa. Arriba: número, nombre y cantidad de tarjetas (ej.
  "02 Cotización 14").
- Debajo: "Valor estimado" a la izquierda y la suma en dólares a la derecha;
  si hay oportunidades en soles, su suma (S/) debajo. **Las monedas nunca se
  convierten ni se mezclan.**
- El kanban muestra **solo oportunidades abiertas**.
- **Finalizado muestra solo las que llegaron a esa etapa en los últimos 30
  días**: 30 × 24 horas hacia atrás desde el momento de la consulta, medidas
  sobre **Etapa cambiada en** (confirmado el 2026-09-25). Las anteriores se consultan en la Tabla (estado Finalizadas).
  *Por qué:* Finalizado es la última etapa y solo acumula; sin límite, la
  columna crecería sin fin en una vista que no pagina.
- Scroll general de la página, sin paginación.

### Tarjetas

- Borde izquierdo del color de su etapa.
- De arriba hacia abajo: código (pequeño y claro); título; empresa (más
  pequeña, con el ícono `Building2`); valor a la izquierda y probabilidad a la
  derecha; avatar de iniciales con el nombre del asesor a la izquierda y, a la
  derecha, el reloj de días (sección 3), en rojo desde 7. Las tarjetas de
  Finalizado no llevan reloj.
- Dentro de cada columna, ordenadas por fecha estimada de cierre, de la más
  próxima a la más lejana; **[por defecto]** sin fecha, al final.
- No se reordenan a mano.
- Un clic abre la página de detalle.

## 6. Arrastrar y soltar

- Una tarjeta se puede arrastrar a **cualquier** columna: adelante, atrás o
  saltándose etapas.
- Al soltarla aparece una **confirmación**. Si se cancela, vuelve a su lugar.
  Soltarla en su misma columna no hace nada.
- Al empezar a arrastrar aparece, en la esquina inferior izquierda, un cuarto
  de círculo rojo con una papelera. Soltar ahí abre un diálogo con dos
  opciones: **Marcar perdida** (motivo obligatorio) y **Anular** (motivo
  opcional). Si la oportunidad está en Finalizado, **solo aparece Anular**.
- **El cambio de etapa pasa por una única acción del backend, sin efectos
  secundarios**, la misma que usa la línea de etapas del detalle. Lleva un
  punto de enganche comentado para los flujos automáticos por etapa, que se
  construirán después (ver preguntas abiertas).

## 7. Página de detalle (`/oportunidades/[id]`)

Página completa, no modal. Sin título de módulo. Es el primer módulo con
página de detalle en ruta propia; los demás usan el modal de
`core/fila-clicable.tsx`.

### Migas de pan

`CRM › Embudo de oportunidades › OPT.CCM.2026.00006`: un tercer nivel con el
código, y el segundo nivel es un enlace de vuelta al embudo.

- **"CRM" no es enlace.** *Por qué:* no hay página de aterrizaje para el grupo,
  y enlazarlo a uno de sus tres módulos sería arbitrario y confuso.
- **El componente compartido de migas de pan se amplía para aceptar un tercer
  nivel dinámico.** *Por qué:* hasta hoy toda pantalla era de un solo nivel;
  en una subruta el componente mostraría el enlace del módulo sin decir qué
  registro se está viendo. Los módulos que usan modal no se ven afectados.

### Cabecera

- Izquierda: botón "< Pipeline" (vuelve a la vista de la que se vino, Embudo
  o Tabla, con los filtros que había), código, título grande con lápiz para
  editarlo y **una sola etiqueta de estado**: la etapa si está abierta
  (incluido Finalizado), o "Perdida"/"Anulada" si está cerrada.
- Derecha: "+ Actividad", "X Marcar perdida" y "Anular". En Finalizado no
  aparece "Marcar perdida".

### Línea de etapas

- Etapas pasadas en gris, la actual en su color. **[por defecto]** Las futuras
  solo con contorno.
- Se pueden pulsar para cambiar de etapa, con la misma confirmación que el
  arrastre.

### Columna izquierda (algo más de la mitad)

Con títulos pequeños:

- **Información general**, una sola columna, solo lectura salvo donde se
  indica: Código, Empresa, Contacto (lápiz), Asesor, Moneda, Valor,
  Probabilidad, Creado, Cierre est. (ícono de fecha).
- **Cotizaciones vinculadas:** "Próximamente se podrán buscar / agregar".
- **Órdenes de trabajo:** "Próximamente las OT generadas".
- **Restricciones:** "Sin restricciones generadas, próximamente…".

### Columna derecha (algo menos de la mitad)

**Historial & Actividades**: la línea de tiempo de la sección 4, con el
contador "N registros".

### Oportunidad perdida o anulada

- Solo lectura: línea de etapas desactivada y lápices ocultos.
- Único botón disponible: **"Reabrir"**.
- La etiqueta muestra "Perdida" o "Anulada".
- Un **aviso de cierre** muestra la fecha y la hora en que se cerró, la etapa
  en la que estaba y el motivo (o que no se registró motivo, si fue una
  anulación sin él).

## 8. Modal "Nueva oportunidad"

Campos, en este orden:

1. Código — "Se asignará al guardar".
2. Título.
3. Empresa — buscador, placeholder "Buscar empresa...".
4. Contacto — se habilita al elegir empresa y se vacía si la empresa cambia.
5. Moneda.
6. Valor estimado — por defecto 0.
7. Probabilidad % — entero, sin decimales.
8. Etapa inicial — por defecto Prospecto.
9. Fecha estimada de cierre — selector de fecha.

Las reglas de cada campo están en la sección 3. **[por defecto]** Al guardar:
el modal se cierra, aparece un aviso y la tarjeta se muestra en su columna sin
recargar.

## 9. Vista Tabla

- Botón para alternar Embudo / Tabla, guardado en la URL (`?vista=tabla`).
- **Columnas:** Código · Oportunidad · Empresa (RUC debajo) · Etapa · Valor ·
  Prob. % · Cierre estimado · Días sin mover · Responsable (el asesor) ·
  Acciones.
- **Etapa** muestra la etapa en su color y, **al lado**, "Perdida" o
  "Anulada" cuando corresponda. *Por qué es distinto de la cabecera del
  detalle* (decidido al revisar el mockup, 2026-09-25): en una fila de la
  Tabla esa columna es el único sitio donde se ve la etapa en la que quedó
  una oportunidad cerrada; en el detalle la etapa ya aparece en la línea de
  etapas y en el aviso de cierre, así que la cabecera lleva una sola
  etiqueta.
- **Días sin mover** muestra "—" en Finalizadas, Perdidas y Anuladas
  (sección 3).
- **Orden:** por etapa y luego por fecha estimada de cierre (**[por defecto]**
  sin fecha, al final, igual que en el kanban).
- **Acciones:** un menú "…" con Abrir, Marcar perdida y Anular (sin Marcar
  perdida en Finalizado). Si la oportunidad está perdida o anulada: Abrir y
  Reabrir.
- Un clic en la fila abre el detalle. La fila sigue el patrón de
  `core/fila-clicable.tsx` en cuanto a no propagar clics desde el menú "…"
  (convención de AGENTS.md), aunque abra una página en vez del modal.
- **Paginación en el servidor.** Los mismos filtros del embudo, más un filtro
  de **estado**:
  - Activas (por defecto): abiertas y fuera de Finalizado.
  - Finalizadas: todas, sin el límite de 30 días.
  - Perdidas.
  - Anuladas.
- **"Sin mover ≥7d" queda deshabilitado (no seleccionable)** cuando el estado
  es distinto de Activas, por la razón de la sección 3. Si estaba
  seleccionado al cambiar a otro estado, **la opción rápida se reinicia a
  "Todas"**: no se conserva marcada y deshabilitada, y al volver a Activas no
  reaparece sola.

## 10. Fuera de alcance

- Flujos automáticos al cambiar de etapa (crear cotización, alertas, etc.).
  Dependen del módulo de Cotizaciones.
- Roles y permisos sobre las acciones críticas.
- Origen automático del valor y la probabilidad.

Los tres están en `preguntas-abiertas.md`, sección "Embudo de oportunidades".
