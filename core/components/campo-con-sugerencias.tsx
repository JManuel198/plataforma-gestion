"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusquedaRemota } from "./busqueda-remota";

/**
 * Un campo de TEXTO LIBRE que sugiere lo que ya se escribió antes.
 *
 * ── QUÉ LO DISTINGUE DE `BuscadorSeleccion`, QUE ES SU VECINO ───────────────
 *
 * Los dos se parecen en pantalla y comparten el motor de búsqueda
 * (`useBusquedaRemota`), pero significan cosas opuestas:
 *
 * | | `BuscadorSeleccion` | este |
 * | --- | --- | --- |
 * | Qué vale como valor | solo un registro existente | lo que el usuario escriba |
 * | Si no hay resultados | no se puede continuar | se guarda lo tecleado |
 * | Qué se envía | la clave del elegido, en un input oculto | el texto mismo |
 * | Su caso | Material (existe o no existe) | Proveedor |
 *
 * EL CASO QUE LO HIZO NECESARIO: Proveedor no tiene tabla. Es una columna de
 * texto de `lista_precios`, así que el "catálogo de proveedores" no es más que
 * lo ya escrito en otras ofertas. El día que se crea la primera oferta no hay
 * nada que sugerir y el campo TIENE que dejar escribir a pelo; en cuanto hay
 * unas cuantas, repetir el nombre a mano invita a que "Ferretería Lima" y
 * "ferreteria lima" convivan como si fueran dos proveedores. Sugerir resuelve
 * lo segundo sin impedir lo primero.
 *
 * Por eso NO se reusó `BuscadorSeleccion` tal cual: allí, sin resultados, el
 * usuario se queda sin forma de rellenar el campo. Y por eso tampoco se copió
 * su código: lo que de verdad cuesta (la pausa de tecleo, el turno de cada
 * consulta, el fallo visible) está en `busqueda-remota.ts` y lo usan los dos.
 *
 * ── EL INPUT VA CONTROLADO, A PROPÓSITO ─────────────────────────────────────
 *
 * La convención del proyecto es campos NO controlados (`defaultValue`, sin
 * `value`), y aquí se rompe con motivo: pulsar una sugerencia tiene que
 * escribir en la caja, y eso exige que su valor salga del estado. Lo que NO
 * cambia es dónde está el valor que se envía: este input lleva el `name`, así
 * que es él quien viaja en el `FormData`. No hay input oculto que pueda
 * desincronizarse de lo que se ve — a diferencia de `BuscadorSeleccion`, donde
 * lo visible es la búsqueda y lo enviado es la clave del registro elegido.
 *
 * SIGUE SIN TOCAR LA URL, igual que su vecino: esto vive dentro de un modal y
 * navegar lo cerraría.
 */

type Props = {
  /** `id` del input, para atarlo a su `<Label>`. Único en la pantalla. */
  id: string;
  /** `name` con el que el texto entra en el `FormData`. */
  name: string;
  etiqueta: string;
  placeholder?: string;
  /**
   * Valor de partida: el que ya tenía el registro que se está editando.
   *
   * Se comporta como un `defaultValue`, no como un `value`: solo se lee al
   * montar. Eso basta porque el modal desmonta sus campos al cerrarse (ver
   * `dialogo-lista-precio.tsx`), así que abrir otra fila monta un campo nuevo.
   * Si algún día este componente viviera en algo que NO se desmonta, cambiar
   * de registro dejaría el texto anterior.
   */
  valorInicial?: string;
  /**
   * Server Action que devuelve los valores ya usados que casan con el texto.
   * Viene acotada con un `LIMIT`: la lista se pinta entera.
   */
  buscarAction: (texto: string) => Promise<string[]>;
  /** Marca el campo en rojo cuando el servidor devolvió un error para él. */
  invalido?: boolean;
  requerido?: boolean;
  /**
   * La línea de ayuda cuando no hay nada escrito. Dice qué se espera del
   * campo, no "escribe para buscar": aquí buscar es lo secundario.
   */
  ayuda?: string;
};

export function CampoConSugerencias({
  id,
  name,
  etiqueta,
  placeholder,
  valorInicial = "",
  buscarAction,
  invalido,
  requerido,
  ayuda = "Escribe el valor. Si ya lo usaste antes, aparecerá debajo.",
}: Props) {
  const busqueda = useBusquedaRemota<string>(buscarAction, valorInicial);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      {/* Sin icono de lupa, al revés que `BuscadorSeleccion`: una lupa promete
          que hay que encontrar algo, y aquí escribir algo nuevo es un final
          igual de válido. Es un campo de texto que además ayuda. */}
      <Input
        id={id}
        name={name}
        value={busqueda.texto}
        placeholder={placeholder}
        // `off` para que no se solapen dos listas de sugerencias: las del
        // navegador (lo que se tecleó en este equipo) sobre las nuestras (lo
        // que hay de verdad en la base). Las nuestras son las que valen.
        autoComplete="off"
        required={requerido}
        aria-invalid={invalido}
        aria-describedby={`${id}-estado`}
        onChange={(evento) => busqueda.escribir(evento.target.value)}
        onKeyDown={(evento) => {
          // Enter busca ya, sin esperar la pausa — y sobre todo NO envía el
          // formulario, que es lo que haría por defecto viviendo dentro de un
          // `<form>`. Mismo criterio que `BuscadorSeleccion`.
          if (evento.key === "Enter") {
            evento.preventDefault();
            busqueda.buscarAhora();
          }
        }}
      />

      {/* Botones normales en una lista, no un `listbox` con `role="option"`:
          un listbox de verdad exige navegación con flechas y
          `aria-activedescendant`, y anunciarlo sin implementarlo es peor que
          no anunciarlo. Ver el mismo razonamiento en `BuscadorSeleccion`. */}
      {busqueda.resultados && busqueda.resultados.length > 0 ? (
        <ul className="max-h-40 divide-y overflow-y-auto rounded-lg border">
          {busqueda.resultados.map((sugerencia) => (
            <li key={sugerencia}>
              <button
                type="button"
                className="w-full truncate px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                onClick={() => busqueda.cerrar(sugerencia)}
              >
                {sugerencia}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* `aria-live` para que un lector de pantalla se entere de que la lista
          cambió. Ninguno de estos mensajes dice "no existe": lo que se escriba
          se guarda igual, y el texto tiene que dejarlo claro para que nadie se
          quede esperando a encontrar algo. */}
      <p
        id={`${id}-estado`}
        className="text-xs text-muted-foreground"
        aria-live="polite"
      >
        {busqueda.fallo
          ? "No se pudieron cargar sugerencias. Puedes escribirlo igualmente."
          : busqueda.buscando
            ? "Buscando…"
            : busqueda.resultados === null
              ? ayuda
              : busqueda.resultados.length === 0
                ? "Sin coincidencias: se guardará tal como lo escribas."
                : `${busqueda.resultados.length} sugerencia${busqueda.resultados.length === 1 ? "" : "s"}. Pulsa una para usarla.`}
      </p>
    </div>
  );
}
