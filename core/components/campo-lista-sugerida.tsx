"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Un campo de TEXTO LIBRE con una lista fija de sugerencias, servida en memoria.
 *
 * ── POR QUÉ NO ES `CampoConSugerencias`, QUE SE LE PARECE EN PANTALLA ───────
 *
 * Son dos componentes distintos a propósito. **No los fusiones por parecido
 * superficial**: lo que dibujan es casi lo mismo, pero de dónde salen las
 * sugerencias cambia todo lo demás.
 *
 * | | `CampoConSugerencias` | este (`CampoListaSugerida`) |
 * | --- | --- | --- |
 * | De dónde salen las sugerencias | del servidor, `SELECT DISTINCT` sobre la columna | de una constante del código |
 * | Quién las conoce | solo la base: cambian con cada alta | el repositorio: cambian al editar un array |
 * | Cuándo se filtran | en el servidor, en cada consulta | aquí, sobre un array de 7 elementos |
 * | Pausa de tecleo | imprescindible (una consulta por letra sería un ataque a la base) | no tiene sentido: filtrar es síncrono |
 * | Turno de respuestas | imprescindible (dos consultas vuelven desordenadas) | no existe: no hay nada en vuelo |
 * | Puede fallar | sí, es red — y el fallo se muestra | no |
 * | Con el campo vacío | no sugiere nada (no hay texto que buscar) | ofrece la lista entera |
 * | Su caso | Proveedor | Unidad |
 *
 * De ahí que **NO reutilice `busqueda-remota.ts`**. Ese hook resuelve tres
 * problemas —la pausa, el turno y el fallo visible— que solo existen cuando la
 * respuesta viaja por la red y puede tardar, perderse o llegar tarde. Aquí el
 * "catálogo" son siete cadenas ya presentes en el bundle: filtrarlas es un
 * `.filter()`. Montarlo sobre el hook remoto obligaría a envolver el array en
 * una promesa falsa y a esperar 300 ms para enseñar algo que ya está en
 * memoria; sería más código y peor interfaz.
 *
 * El criterio general, que es lo que conviene recordar: **la fuente de los
 * datos decide el componente, no su aspecto.** Si el catálogo vive en el
 * servidor y cambia solo, es `CampoConSugerencias`. Si vive en el código y
 * cambia con un commit, es este. Si además el valor TIENE que existir como
 * registro, ninguno de los dos: es `BuscadorSeleccion`.
 *
 * ── LO QUE SE GUARDA ES SIEMPRE LO QUE HAY EN EL INPUT ──────────────────────
 *
 * Elegir una sugerencia escribe en la caja, y nada más. No hay input oculto ni
 * valor paralelo, así que es imposible que lo enviado se desincronice de lo
 * que se ve; y un valor que no esté en la lista (`"rollo"`) se guarda igual.
 * La lista NO valida: si algún día hubiera que cerrar el conjunto, el sitio
 * sería el Zod del módulo y un CHECK en la columna, nunca este componente
 * —una comprobación que solo viva en el cliente no es una comprobación
 * (regla 1 de AGENTS.md)—.
 *
 * ── DETALLES DE IMPLEMENTACIÓN QUE NO SON GRATUITOS ─────────────────────────
 *
 * - **El input va CONTROLADO**, rompiendo la convención de campos no
 *   controlados del proyecto, por el mismo motivo que `CampoConSugerencias`:
 *   pulsar una sugerencia tiene que escribir en la caja, y eso exige que el
 *   valor salga del estado.
 * - **La lista se pinta en el flujo, no en una capa flotante ni en un portal.**
 *   Los modales que lo montan tienen el cuerpo en `overflow-y-auto` (ver
 *   `dialogo-lista-precio.tsx`), y un desplegable posicionado en absoluto se
 *   recortaría contra ese borde. En el flujo empuja a los campos de abajo,
 *   que es exactamente lo que ya hace su hermano en ese mismo modal.
 * - **Botones normales, no un `listbox` con `role="option"`.** Un listbox de
 *   verdad exige navegación con flechas y `aria-activedescendant`; anunciarlo
 *   sin implementarlo es peor que no anunciarlo. Mismo criterio que los otros
 *   dos buscadores de `core/components/`.
 * - **`onMouseDown` con `preventDefault` en cada sugerencia.** Sin eso, el
 *   `blur` del input cerraría la lista antes de que llegara el `click` y la
 *   sugerencia no se llegaría a elegir nunca. El `preventDefault` impide que
 *   el input pierda el foco, así que el `click` sí ocurre.
 * - **El `onBlur` va en el contenedor y mira `relatedTarget`**, para que salir
 *   con Tab cierre la lista pero moverse dentro de ella no.
 * - **Enter con la lista abierta la cierra y NO envía el formulario.** Viviendo
 *   dentro de un `<form>`, el comportamiento por defecto sería enviar, que con
 *   un desplegable abierto se lee como un accidente. Con la lista cerrada,
 *   Enter hace lo de siempre.
 *
 * Nada de esto toca la URL: vive dentro de un modal y navegar lo cerraría.
 */

type Props = {
  /** `id` del input, para atarlo a su `<Label>`. Único en la pantalla. */
  id: string;
  /** `name` con el que el texto entra en el `FormData`. */
  name: string;
  etiqueta: string;
  placeholder?: string;
  /**
   * Las sugerencias. Llegan como prop y no importadas aquí dentro: este
   * componente no sabe qué es una unidad, igual que `BuscadorSeleccion` no sabe
   * qué es un material. Así vale para la siguiente lista fija que aparezca sin
   * que `core/` acumule constantes de negocio ajenas.
   */
  opciones: readonly string[];
  /**
   * Valor de partida: el que ya tenía el registro que se está editando.
   *
   * Se comporta como un `defaultValue`, no como un `value`: solo se lee al
   * montar. Basta porque los modales desmontan sus campos al cerrarse, así que
   * abrir otra fila monta un campo nuevo. Mismo matiz, y mismo límite, que en
   * `CampoConSugerencias`.
   */
  valorInicial?: string;
  /** Marca el campo en rojo cuando el servidor devolvió un error para él. */
  invalido?: boolean;
  requerido?: boolean;
  /** La línea de ayuda cuando la lista está cerrada. */
  ayuda?: string;
};

/**
 * Filtra las sugerencias por lo escrito, sin distinguir mayúsculas.
 *
 * `includes` y no `startsWith`: con siete opciones cortas, que "nd" encuentre
 * "und" ayuda y no estorba. Con el campo vacío devuelve la lista entera — es lo
 * que hace que un clic en un campo en blanco enseñe las opciones.
 */
function filtrar(opciones: readonly string[], texto: string): string[] {
  const limpio = texto.trim().toLowerCase();
  if (limpio === "") return [...opciones];
  return opciones.filter((opcion) => opcion.toLowerCase().includes(limpio));
}

export function CampoListaSugerida({
  id,
  name,
  etiqueta,
  placeholder,
  opciones,
  valorInicial = "",
  invalido,
  requerido,
  ayuda = "Elige una de la lista o escribe la tuya.",
}: Props) {
  const [texto, setTexto] = useState(valorInicial);
  const [abierta, setAbierta] = useState(false);

  const sugerencias = filtrar(opciones, texto);

  function elegir(opcion: string) {
    setTexto(opcion);
    setAbierta(false);
  }

  return (
    <div
      className="space-y-2"
      onBlur={(evento) => {
        // Solo cierra si el foco salió del campo Y de su lista. Sin esta
        // comprobación, moverse con Tab a una sugerencia la haría desaparecer.
        if (evento.currentTarget.contains(evento.relatedTarget)) return;
        setAbierta(false);
      }}
    >
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input
        id={id}
        name={name}
        value={texto}
        placeholder={placeholder}
        // `off` para que la lista del navegador (lo tecleado en este equipo) no
        // se solape con la nuestra. Mismo motivo que en `CampoConSugerencias`.
        autoComplete="off"
        required={requerido}
        aria-invalid={invalido}
        aria-describedby={`${id}-estado`}
        onChange={(evento) => {
          setTexto(evento.target.value);
          // Teclear reabre la lista: si se cerró con Escape y el usuario sigue
          // escribiendo, espera volver a ver las coincidencias.
          setAbierta(true);
        }}
        onFocus={() => setAbierta(true)}
        // El clic también abre, no solo el foco: volver a pulsar un campo que
        // ya tenía el foco no dispara `onFocus`, y ahí es donde un usuario que
        // acaba de cerrar la lista con Escape intenta reabrirla.
        onClick={() => setAbierta(true)}
        onKeyDown={(evento) => {
          if (evento.key === "Escape" && abierta) {
            // Sin `stopPropagation` NO basta: el Escape llegaría al Dialog y
            // cerraría el modal entero con lo que el usuario llevara escrito.
            evento.stopPropagation();
            setAbierta(false);
            return;
          }
          if (evento.key === "Enter" && abierta) {
            evento.preventDefault();
            setAbierta(false);
          }
        }}
      />

      {abierta && sugerencias.length > 0 ? (
        <ul className="max-h-40 divide-y overflow-y-auto rounded-lg border">
          {sugerencias.map((opcion) => (
            <li key={opcion}>
              <button
                type="button"
                className="w-full truncate px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                // Ver la cabecera: sin esto el blur del input cierra la lista
                // antes de que el click llegue aquí.
                onMouseDown={(evento) => evento.preventDefault()}
                onClick={() => elegir(opcion)}
              >
                {opcion}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* `aria-live` para que un lector de pantalla se entere de que la lista
          cambió. Ningún mensaje dice "no válido": lo que se escriba se guarda
          igual, y el texto tiene que dejarlo claro. */}
      <p
        id={`${id}-estado`}
        className="text-xs text-muted-foreground"
        aria-live="polite"
      >
        {!abierta
          ? ayuda
          : sugerencias.length === 0
            ? "Sin coincidencias: se guardará tal como lo escribas."
            : `${sugerencias.length} sugerencia${sugerencias.length === 1 ? "" : "s"}. Pulsa una para usarla.`}
      </p>
    </div>
  );
}
