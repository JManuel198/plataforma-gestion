"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { PAISES, type Pais } from "../paises";

/**
 * Selector de país con buscador, sobre la lista fija de `../paises.ts`.
 *
 * Vive en el módulo junto con su lista, por el mismo motivo que ella (ver la
 * cabecera de ../paises.ts): se mueve a core/ con el segundo consumidor.
 *
 * NO ES `CampoListaSugerida`, aunque las dos listas sean fijas y vivan en el
 * código: allí el valor es TEXTO LIBRE (se puede guardar "rollo" como unidad)
 * y la lista solo sugiere; aquí el valor TIENE que ser un país de la lista,
 * porque lo que se guarda es su código ISO. Por eso es un combobox de verdad
 * (Base UI, instalado con shadcn): el usuario escribe "per" para filtrar, pero
 * lo que entra en el formulario es siempre el código del país elegido, nunca
 * lo tecleado. La validación real sigue en el Zod del módulo (regla 1), que
 * comprueba el código contra la misma lista.
 *
 * Publica su propio `<input type="hidden" name={name}>` con el CÓDIGO
 * (`itemToStringValue`), así que funciona dentro de un `<form>` no controlado
 * como el resto de campos. El texto visible es el nombre
 * (`itemToStringLabel`), que es también por lo que filtra el buscador.
 *
 * La lista se porta a `document.body` (a diferencia de `CampoListaSugerida`,
 * que se pinta en el flujo): con 249 países, empujar el formulario hacia abajo
 * no es opción, y el portal evita que el `overflow-y-auto` del modal la
 * recorte.
 */
export function CampoPais({
  id,
  name,
  codigoInicial,
  invalido,
}: {
  id: string;
  name: string;
  /** Código ISO con el que arranca (`"PE"`); `null` = sin país elegido. */
  codigoInicial: string | null;
  invalido?: boolean;
}) {
  const inicial =
    PAISES.find((pais) => pais.codigo === codigoInicial) ?? null;

  return (
    <Combobox<Pais>
      name={name}
      items={PAISES}
      defaultValue={inicial}
      itemToStringLabel={(pais) => pais.nombre}
      itemToStringValue={(pais) => pais.codigo}
      isItemEqualToValue={(a, b) => a.codigo === b.codigo}
      // Al filtrar, la primera coincidencia queda resaltada, así que Enter la
      // ELIGE. Sin esto, escribir "chi" + Enter no resaltaba nada y Enter
      // hacía lo de siempre en un `<form>`: enviarlo (visto en el navegador,
      // 2026-09-25). Misma regla que `CampoListaSugerida`: Enter con la lista
      // abierta no envía.
      autoHighlight
    >
      <ComboboxInput
        id={id}
        placeholder="Busca un país"
        className="w-full"
        aria-invalid={invalido}
      />
      <ComboboxContent>
        <ComboboxEmpty>Ningún país coincide.</ComboboxEmpty>
        <ComboboxList>
          {(pais: Pais) => (
            <ComboboxItem key={pais.codigo} value={pais}>
              {pais.nombre}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
