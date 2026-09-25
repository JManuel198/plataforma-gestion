# Plan — Embudo de Oportunidades (CRM Comercial)

Estado: **aprobado**. Las decisiones marcadas como **[por defecto]** fueron tomadas sin indicación explícita y pueden cambiarse.

---

# Parte A — Qué construimos

## 1. Etapas y situación

- **6 etapas, en este orden y con estos colores:**
  1. Prospecto — gris
  2. Cotización — morado
  3. Negociación — naranja
  4. Adjudicado — verde
  5. Ejecución — azul oscuro
  6. Finalizado — verde oscuro

  Los colores se definen en un solo lugar del código, porque pueden cambiar según lo que prefiera el cliente.
- **Situación, separada de la etapa:** abierta, perdida o anulada. Una oportunidad perdida o anulada conserva su última etapa; al reabrirla vuelve exactamente a donde estaba.
- **Perdida:** el negocio no se dio. Motivo obligatorio. Cuenta en la tasa de cierre como no ganada.
- **Anulada:** creada por error o duplicada. Motivo opcional. No cuenta en la tasa de cierre.
- **Reabrir:** devuelve la oportunidad a su última etapa y queda registrado en el historial. Los permisos se deciden con los roles.
- **Oportunidades activas:** situación abierta y etapa distinta de Finalizado.
- **Tasa de cierre:** ganadas ÷ (ganadas + perdidas).
  - Ganadas: oportunidades abiertas en Adjudicado, Ejecución o Finalizado.
  - Las anuladas no cuentan.
  - Sin datos suficientes, se muestra "—".
- **Sin baja lógica:** no hay activar/desactivar. Anular cumple ese papel.
- **Historia:** antes existía la etapa "Calificado" después de Prospecto. Se eliminó y se agregó "Finalizado" al final, por decisión del cliente.

## 2. Datos de una oportunidad

| Campo | Regla |
|---|---|
| Código | `OPT.CCM.AAAA.NNNNN`, autogenerado. Reinicia cada año, igual que las OT. "CCM" es fijo (abreviatura de la empresa, igual que en las OT) y no es configurable hasta que se pida explícitamente. |
| Título | Obligatorio. Editable con lápiz desde el detalle. |
| Empresa | Obligatoria. Solo empresas activas; incluye clientes y proveedores. No se puede cambiar después de crear. |
| Contacto | Opcional. Solo contactos activos de la empresa elegida. Se asigna al crear (debajo de Empresa) o después, con lápiz. |
| Asesor | El usuario que crea la oportunidad, asignado automáticamente. |
| Moneda | USD (por defecto) o PEN. Fija después de crear. |
| Valor estimado | Por defecto 0, con 2 decimales. **No se edita después de crear.** Su origen futuro (¿suma de las cotizaciones vinculadas?) queda en preguntas abiertas. |
| Probabilidad % | Entero de 0 a 100, por defecto 0. No se edita después de crear (solo lectura en el detalle). Su origen futuro va a la misma pregunta abierta. |
| Etapa inicial | Cualquiera de las 6. Por defecto, Prospecto. |
| Fecha estimada de cierre | Tipo `date`. Editable desde el detalle con el ícono de fecha. **[por defecto]** Opcional; las oportunidades sin fecha van al final de su columna. |
| Etapa cambiada en | Se actualiza en cada cambio de etapa. Alimenta el reloj de días y el filtro "Sin mover ≥7d". |

## 3. Historial y actividades

- **El historial registra:**
  - la creación;
  - cada cambio de etapa (de cuál a cuál);
  - las ediciones de título, contacto y fecha de cierre (valor anterior → valor nuevo);
  - marcar perdida (con motivo), anular y reabrir.

  Cada entrada guarda quién lo hizo, fecha y hora. El historial no se edita.
- **Actividades:**
  - Tipo: Nota, Llamada, Reunión, Correo o Visita.
  - Descripción obligatoria.
  - Fecha y hora: por defecto el momento actual, editable.
  - Autor: el usuario en sesión.
  - **[por defecto]** Por ahora no se editan ni se borran; se revisa con los roles.
- **Línea de tiempo:** historial y actividades juntos en una sola lista, ordenada por fecha y hora, lo más reciente arriba.

## 4. Vista Embudo (Kanban) — vista por defecto

- **Cabecera:**
  - Título "CRM Comercial" con la etiqueta "Solo lo mío". Es un recordatorio fijo de que los registros son propios; nunca filtra, tampoco cuando existan los roles.
  - Subtítulo "Pipeline en tiempo real · N oportunidades activas".
- **Lado derecho:**
  - Botón "Nueva oportunidad".
  - Debajo: cantidad de oportunidades, total en dólares, total en soles y tasa de cierre.
  - **[por defecto]** Cantidad y totales cambian con los filtros aplicados. La tasa de cierre es global e histórica, sin filtros.
- **Filtros** (guardados en la URL, combinables entre sí):
  - Búsqueda por oportunidad (título o código) o por cliente (razón social o nombre comercial).
  - Opciones rápidas, de selección única: Todas · Sin mover ≥7d · >$50k.
  - Desplegable Cliente: empresas con oportunidades. Por defecto, todos.
  - Desplegable Valor: Todos · menos de $10k · $10k–$50k · $50k–$200k · más de $200k.
  - Los filtros de valor solo consideran oportunidades en dólares.
- **Columnas:**
  - Arriba: número de la etapa, nombre y cantidad de tarjetas (ej. "02 Cotización 14").
  - Debajo: "Valor estimado" a la izquierda y la suma en dólares a la derecha. Si hay oportunidades en soles, su suma aparece debajo (S/). Las monedas nunca se convierten ni se mezclan.
  - El kanban solo muestra oportunidades abiertas.
  - Finalizado muestra solo las finalizadas en los últimos 30 días. Las más antiguas se consultan en la vista Tabla.
- **Tarjetas:**
  - Borde izquierdo del color de su etapa.
  - De arriba hacia abajo:
    1. Código, pequeño y claro.
    2. Título.
    3. Empresa, más pequeña y clara, con el ícono `Building2`.
    4. Valor a la izquierda, porcentaje a la derecha.
    5. Avatar de iniciales con el nombre del asesor a la izquierda; a la derecha, un reloj con los días desde el último cambio de etapa (hora de Lima).
  - Dentro de cada columna, ordenadas por fecha estimada de cierre, de la más próxima a la más lejana.
  - No se reordenan a mano.
  - Un clic abre la página de detalle.
- **Scroll general de la página, sin paginación.**

## 5. Arrastrar y soltar

- Una tarjeta se puede arrastrar a cualquier columna: adelante, atrás o saltándose etapas.
- Al soltarla aparece una confirmación. Si se cancela, vuelve a su lugar. Soltarla en su misma columna no hace nada.
- Al empezar a arrastrar aparece en la esquina inferior izquierda un cuarto de círculo rojo con una papelera. Soltar ahí abre un diálogo con dos opciones:
  - Marcar perdida (motivo obligatorio).
  - Anular (motivo opcional).
- El cambio de etapa pasa por una **única acción del backend, sin efectos secundarios**, con un punto de enganche comentado para los flujos automáticos por etapa que se construirán después.

## 6. Página de detalle (`/oportunidades/[id]`)

Página completa, no modal. Sin título de módulo.

- **Cabecera:**
  - Izquierda: botón "< Pipeline" (vuelve con los filtros que había), código, título grande con lápiz para editarlo y etiqueta de estado.
  - Derecha: "+ Actividad", "X Marcar perdida" y "Anular".
- **Línea de etapas:**
  - Etapas pasadas en gris, la actual en su color. **[por defecto]** Las futuras solo con contorno.
  - Clickeables para cambiar de etapa, con la misma confirmación que el arrastre.
- **Columna izquierda (algo más de la mitad), con títulos pequeños:**
  - "Información general", una sola columna, solo lectura salvo donde se indica: Código, Empresa, Contacto (lápiz), Asesor, Moneda, Valor, Probabilidad, Creado, Cierre est. (ícono de fecha).
  - "Cotizaciones vinculadas": "Próximamente se podrán buscar / agregar".
  - "Órdenes de trabajo": "Próximamente las OT generadas".
  - "Restricciones": "Sin restricciones generadas, próximamente…".
- **Columna derecha (algo menos de la mitad):** "Historial & Actividades". Cambios de estado con el usuario, fecha y hora, incluida la creación; lo más reciente arriba.
- **Oportunidad perdida o anulada:**
  - Solo lectura: línea de etapas desactivada y lápices ocultos.
  - Único botón disponible: "Reabrir".
  - La etiqueta muestra "Perdida" o "Anulada".

## 7. Modal "Nueva oportunidad"

- **Campos, en este orden:**
  1. Código ("Se asignará al guardar")
  2. Título
  3. Empresa (placeholder "Buscar empresa...")
  4. Contacto (se habilita al elegir empresa; se vacía si la empresa cambia)
  5. Moneda
  6. Valor estimado (por defecto 0)
  7. Probabilidad % (entero, sin decimales)
  8. Etapa inicial (por defecto Prospecto)
  9. Fecha estimada de cierre (selector de fecha)
- **[por defecto]** Al guardar: el modal se cierra, aparece un aviso y la tarjeta se muestra en su columna sin recargar.

## 8. Vista Tabla

- Botón para alternar Embudo / Tabla, guardado en la URL (`?vista=tabla`).
- **Columnas:** Código · Oportunidad · Empresa (RUC debajo) · Etapa (etiqueta de color) · Valor · Prob. % · Cierre estimado · Días sin mover · Responsable · Acciones.
- Paginación en servidor, mismos filtros del embudo más un filtro de estado:
  - Activas (por defecto)
  - Finalizadas (todas, sin límite de 30 días)
  - Perdidas
  - Anuladas
- Clic en la fila abre el detalle.

## 9. A documentar (no se construye ahora)

- **Pregunta abierta:** de dónde saldrán el valor y la probabilidad cuando existan las cotizaciones.
- **Flujos automáticos por etapa** (Cotización y otras etapas, a definir):
  - Al mover a Cotización sin ninguna cotización vinculada, aparecerá una alerta:
    - Texto: "Para mover esta oportunidad a Cotización debe existir al menos una cotización vinculada al cliente *CLIENTE*" (nombre del cliente en cursiva).
    - Debajo: "Oportunidad OPT.CCM.AAAA.NNNNN · Título".
    - Debajo: el contacto.
    - Botones: Cancelar · Vincular existente · Crear.
  - Pendiente: qué pasa si la oportunidad se crea directamente en una etapa con flujo (no hay transición que lo dispare).
- **Acciones críticas para los roles:** mover de etapa, marcar perdida, anular, reabrir y editar.
- **Decisiones registradas:**
  - El reloj cuenta desde el último cambio de etapa, porque "Sin mover ≥7d" solo tiene sentido así.
  - Se guarda un historial de cambios de etapa.
  - Finalizado en el kanban muestra solo los últimos 30 días.
  - "Solo lo mío" es una etiqueta fija.
  - Los colores de etapa pueden cambiar.

---

# Parte B — Orden de trabajo

**Reglas para todas las partes:**
- Una sola rama: `feature/crm-oportunidades`.
- Después de cada parte se corre el agente auditor y se hace un commit.
- La rama se fusiona al final.

**Cuidado con la base de datos:** la base de desarrollo contiene datos reales.
- Las migraciones solo agregan tablas nuevas; no modifican las existentes.
- Los datos de prueba llevan el prefijo "PRUEBA" y se limpian en la Parte 13.
- Nadie puede crear oportunidades reales hasta la fusión (la app desplegada sale de `main`), así que la limpieza final es segura.

1. **Guía visual (mockup).** Incluye:
   - kanban con datos de ejemplo;
   - una tarjeta en pleno arrastre, con la papelera visible;
   - diálogo de confirmación y diálogo de perdida/anulada;
   - modal "Nueva oportunidad";
   - página de detalle (abierta y perdida);
   - vista Tabla.

   Se ajusta hasta aprobarla; opcionalmente se revisa con el cliente.
2. **Especificación.** `docs/spec/oportunidades.md` con todo lo de la Parte A, actualización de preguntas abiertas y nota de CRM en `AGENTS.md`. Sin código.
3. **Correlativo anual a `core/`** (arquitecto-datos). La lógica de correlativo anual vive hoy en Órdenes de Trabajo; Oportunidades es el segundo consumidor, así que corresponde moverla a `core/`. **La numeración de las OT no puede cambiar en nada** (hay datos reales). Commit propio, revertible por separado.
4. **Schema** (arquitecto-datos). Tabla de oportunidades, tabla de historial, tabla de actividades y enums de etapa, situación, moneda y tipo de actividad. Migración generada, SQL revisado y aplicada.
5. **Backend: acciones.**
   - Crear (registra la creación en el historial).
   - Editar título, contacto y fecha de cierre (cada edición al historial).
   - `cambiarEtapa`: única puerta, sin efectos secundarios, con punto de enganche comentado.
   - Marcar perdida, anular y reabrir.
   - Agregar actividad.
   - Selectores de empresa y contacto: consultas propias del módulo, sin imports de otros módulos.
6. **Backend: consultas.**
   - Kanban agrupado por etapa, sumas por moneda, Finalizado limitado a 30 días, orden por fecha de cierre.
   - Filtros.
   - Métricas y tasa de cierre.
   - Tabla paginada con filtro de estado.
   - Línea de tiempo del detalle.
7. **Modal "Nueva oportunidad".** Formulario completo y guardado.
8. **Kanban de solo lectura.** Cabecera, métricas, filtros, columnas, tarjetas, scroll y clic hacia el detalle.
9. **Detalle — lectura.** Estructura de dos columnas, información general, secciones "próximamente" y línea de tiempo.
10. **Detalle — acciones.** Ediciones con lápiz y fecha, línea de etapas clickeable con confirmación, "+ Actividad", Marcar perdida, Anular, Reabrir y modo solo lectura.
11. **Arrastrar y soltar.** Confirmación, papelera y su diálogo. Parte aislada por ser la más delicada técnicamente.
12. **Vista Tabla y botón Embudo / Tabla.**
13. **Cierre.**
    1. Recorrido completo en el navegador.
    2. Borrar todo lo "PRUEBA" (oportunidades, historial y actividades). Reiniciar el contador de oportunidades solo tras comprobar que no existe ninguna real, para que la primera real sea `OPT.CCM.2026.00001`.
    3. Sincronizar la documentación.
    4. Push, PR y fusión.

---

# Fuera de alcance

- Flujos automáticos al cambiar de etapa (crear cotización, alertas, etc.). Dependen del módulo de Cotizaciones.
- Roles y permisos sobre las acciones críticas.
- Origen automático del valor y la probabilidad.
