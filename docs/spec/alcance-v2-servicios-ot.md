# Alcance v2 — Servicios y Órdenes de Trabajo
## Plataforma de Gestión — versión mínima funcional, 3 días

**Reemplaza la priorización de fases anterior** (Clientes → Personal → Servicios → OT). Tras la conversación real con el cliente, el alcance se redujo a lo que de verdad necesita ver funcionando primero. Nada de lo anterior se pierde — queda en la sección 5, para versiones futuras.

---

## 1. Fase 1 — Cimientos (sin cambios de fondo, con foco en seguridad)

**Se construye:**
- Login con correo y contraseña (un solo usuario por ahora — el cliente)
- Protección de rutas del lado del servidor
- Layout base

**No se construye en este sprint** (para no perder tiempo en algo que nadie más usa todavía): pantallas de gestión de usuarios, cambio de rol, desactivar usuario. El modelo de roles queda en la base de datos, listo para cuando haga falta — solo no tiene pantalla propia todavía.

**Qué significa "buena seguridad" en 3 días** (lo real y alcanzable, no una lista aspiracional):
- Contraseñas nunca en texto plano — Better Auth ya lo hace por defecto (hash), no se toca.
- Cookies de sesión `httpOnly` y `secure` — también default de Better Auth.
- Rutas protegidas en el **servidor**, no solo ocultando el menú en el cliente.
- Claves y secretos (conexión a Neon, secreto de Better Auth) solo en variables de entorno — nunca escritos en el código ni subidos al repositorio.
- HTTPS automático por el despliegue en Vercel.

Fuera de alcance en 3 días, y está bien que sea así: 2FA, límite de intentos de login, recuperación de contraseña. Se agregan cuando haya más de un usuario real.

---

## 2. Fase 2 — Servicios

**Qué es:** cada trabajo contratado con un cliente — el equivalente digital de una fila del Excel que ya maneja el cliente.

### Modelo de datos

| Campo | Tipo | Cómo se llena |
|---|---|---|
| `id` | interno | automático |
| `codigo_cotizacion` (COT.) | texto | manual |
| `codigo_revision` (REV.) | texto | manual |
| `codigo_oc` (Orden de Compra) | texto libre | manual — cada cliente tiene su propio formato |
| `servicio` (descripción) | texto | manual |
| `cliente` | texto libre | manual — sin pantalla propia de Clientes todavía |
| `fecha` | fecha | **automática** — se pone sola al crear el registro |
| `precio` | numérico | manual |
| `moneda` | PEN / USD | manual — nunca ambas a la vez |
| `estado` | selector | manual — ver lista abajo |
| `comentarios` | texto libre | manual |

### Estados (confirmados por el cliente)
`Activado` · `En espera` · `En ejecución` · `Finalizado` · `Facturado` · `Rechazado`

### Definición de "hecho"
- [ ] Se puede crear un Servicio con todos los campos de la tabla
- [ ] La fecha se llena sola, sin que el usuario la escriba
- [ ] El precio acepta un solo monto y una sola moneda por registro
- [ ] Se puede editar un Servicio existente
- [ ] Se puede filtrar/ver la lista por Estado

---

## 3. Fase 3 — Órdenes de Trabajo (OT)

**Qué es:** el documento de ejecución que nace de un Servicio ya creado. Son **tablas relacionadas** — cada OT queda conectada a su Servicio por dentro del sistema, aunque varios de sus campos se llenan de nuevo a mano.

### Modelo de datos

| Campo | Tipo | Cómo se llena |
|---|---|---|
| `id` | interno | automático |
| `servicio_id` | relación → Servicio | automático (se asigna al crear la OT desde un Servicio) |
| `codigo_ot` | texto, formato `OT.CCM.AAAA.NNNN` | **automático** — ver numeración abajo |
| `codigo_cotizacion` | texto | manual — copiado a mano, no sincronizado con el del Servicio |
| `asunto` | texto | manual |
| `codigo_oc` | texto | manual — copiado a mano |
| `cliente` | texto libre | manual — copiado a mano |
| `estado` | selector | manual — ver propuesta abajo |
| `fecha_creacion` | fecha | automática |
| `responsable` | texto libre | manual — nombre del técnico, sin conexión a una lista de Personal todavía |

**Por qué los campos duplicados no se sincronizan:** es una decisión a propósito para ir rápido ahora. La relación real (`servicio_id`) ya existe por dentro, así que sincronizar automáticamente esos campos más adelante es un cambio contenido, no una reconstrucción.

### Numeración de la OT
Formato: `OT.CCM.2026.0001`
- `CCM` es fijo, siempre igual.
- El número correlativo (`0001`) reinicia cada año nuevo.
- **Asunción a confirmar:** cada año inicia en `0001`. Si el cliente de verdad quiere que inicie en `0000`, es un ajuste de una línea — avisar cuando se confirme.

### Estados propuestos (pendientes de validar con el cliente)
`Pendiente` · `En ejecución` · `Pausada` · `Finalizada` · `Cancelada`

Se proponen distintos a los de Servicio a propósito: los de Servicio son administrativos/comerciales, estos son de ejecución en campo. Sujetos a cambio — el cliente ya autorizó esta propuesta temporal.

### Definición de "hecho"
- [ ] Se puede crear una OT a partir de un Servicio existente
- [ ] El código de la OT se genera solo, con el formato y numeración correctos
- [ ] Los campos duplicados (Cotización, Asunto, OC, Cliente) se llenan a mano sin depender del Servicio
- [ ] Se puede ver la lista de OTs y filtrar por Estado
- [ ] Se puede editar una OT existente

---

## 4. Plan de 3 días

| Día | Bases mínimas | Construcción |
|---|---|---|
| 1 | Componentes, Server vs. Client Component en Next, `async/await`, desestructuración | Better Auth + esquema de usuario/sesión + login funcional + rutas protegidas + layout base |
| 2 | — | Esquema Drizzle de Servicio y OT (con relación) + migración a Neon + lógica del correlativo + formulario de Servicio |
| 3 | — | Formulario de OT desde un Servicio + listado con filtro por Estado + prueba de punta a punta + deploy + ensayo de la demo |

**Nota sobre el método estos 3 días:** el objetivo cambia temporalmente de "aprender bien mientras construyo" a "que funcione y se entienda lo mínimo para no ir a ciegas". El estudio profundo del stack sigue en paralelo después de este sprint — esto es una excepción puntual, no un cambio de hábito.

---

## 5. Diferido a versiones futuras (no perdido, solo no ahora)

- Pantalla de Clientes y Contactos — hoy es texto libre dentro de Servicio/OT
- Personal con acceso real al sistema — hoy "responsable" es texto libre
- Catálogo de servicios con precios fijos reutilizables
- Cotización formal con PDF y revisiones
- Numeración oficial de Cotización y Revisión (hoy son campos de texto manual)
- Dentro de cada OT: planteamiento, requerimientos de materiales, cotización asociada, archivos adjuntos — explícitamente mencionados por el cliente como próximos pasos
- Embudo de oportunidades (kanban) y flujo de aprobación

---

## 6. Pendiente de confirmar con el cliente (no bloquea este sprint)

- [ ] Validar la lista de estados de la OT propuesta en la sección 3
- [ ] Confirmar si la numeración de OT inicia en `0001` o `0000` cada año nuevo

---

*Alcance vivo — se actualiza cuando el cliente confirme los pendientes de la sección 6, o cuando se decida avanzar con algo de la sección 5.*
