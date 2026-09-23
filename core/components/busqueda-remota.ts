"use client";

import { useEffect, useRef, useState, useTransition } from "react";

/**
 * El motor compartido de los buscadores que viven DENTRO de un formulario:
 * `BuscadorSeleccion` (elige un registro) y `CampoConSugerencias` (escribe un
 * texto, con lo ya usado antes como sugerencia).
 *
 * POR QUÉ ESTÁ APARTE, Y NO COPIADO EN EL SEGUNDO: lo que los dos comparten no
 * es la pantalla —se ven distintos y significan cosas distintas— sino tres
 * detalles que cuesta acordarse de poner y que NO avisan cuando faltan:
 *
 * 1. La pausa de tecleo, para no lanzar una consulta por letra.
 * 2. El turno de cada búsqueda. Dos consultas en vuelo pueden volver en orden
 *    distinto al que salieron, y la respuesta lenta de "tal" pisaría la rápida
 *    de "taladro" que el usuario ya está leyendo. El retardo del punto 1 NO
 *    evita esto: son dos problemas distintos.
 * 3. El fallo de red visible. Un error mudo aquí es lo peor que puede pasar:
 *    el usuario leería "ningún resultado" y concluiría que lo que busca no
 *    existe, cuando lo que pasó es que la consulta no llegó.
 *
 * Los tres estaban ya resueltos en `buscador-seleccion.tsx`. Copiarlos al
 * campo de Proveedor habría sido la tercera copia del mismo patrón en este
 * repositorio — y las dos anteriores (`esUniqueViolado`, `patronParcial`)
 * acabaron divergiendo en silencio, que es justo lo que AGENTS.md manda no
 * repetir. Lo que cambia entre los dos buscadores es qué significa el texto y
 * cómo se pinta el resultado; eso se queda en cada componente.
 *
 * LA BÚSQUEDA LA HACE SIEMPRE EL SERVIDOR: `buscarAction` es una Server Action
 * y este hook nunca recibe el catálogo entero para filtrarlo en memoria
 * (regla 1 de AGENTS.md).
 */

/** Pausa de tecleo antes de consultar. Sin ella cada letra sería una consulta. */
const RETARDO_MS = 300;

export type BusquedaRemota<T> = {
  /** Lo que hay escrito ahora mismo en la caja. */
  texto: string;
  /** Teclear: el texto se ve al instante y la consulta sale tras la pausa. */
  escribir: (valor: string) => void;
  /** Enter: quien lo pulsa ya terminó de escribir, así que no espera la pausa. */
  buscarAhora: () => void;
  /**
   * Cierra la lista y deja la caja con `textoFinal` — lo que hace cada
   * buscador al elegir un resultado: `BuscadorSeleccion` la vacía (el elegido
   * pasa a una tarjeta) y `CampoConSugerencias` escribe en ella la sugerencia.
   */
  cerrar: (textoFinal: string) => void;
  /** `null` mientras no se haya buscado nada; `[]` es "no encontré". */
  resultados: T[] | null;
  buscando: boolean;
  fallo: boolean;
};

export function useBusquedaRemota<T>(
  buscarAction: (texto: string) => Promise<T[]>,
  textoInicial = "",
): BusquedaRemota<T> {
  const [texto, setTexto] = useState(textoInicial);
  const [resultados, setResultados] = useState<T[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [buscando, iniciarBusqueda] = useTransition();
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  // El turno del punto 2 de la cabecera: cada búsqueda se numera y solo la
  // última puede escribir el resultado.
  const ultimaBusqueda = useRef(0);

  function cancelarPendiente() {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
  }

  useEffect(() => cancelarPendiente, []);

  function buscar(valor: string) {
    cancelarPendiente();
    const limpio = valor.trim();
    const turno = ultimaBusqueda.current + 1;
    ultimaBusqueda.current = turno;

    if (limpio === "") {
      setResultados(null);
      setFallo(false);
      return;
    }

    iniciarBusqueda(async () => {
      try {
        const encontrados = await buscarAction(limpio);
        if (ultimaBusqueda.current !== turno) return;
        setResultados(encontrados);
        setFallo(false);
      } catch (error) {
        if (ultimaBusqueda.current !== turno) return;
        console.error("[busqueda-remota] falló la búsqueda", error);
        setResultados(null);
        setFallo(true);
      }
    });
  }

  return {
    texto,
    escribir(valor: string) {
      setTexto(valor);
      cancelarPendiente();
      temporizador.current = setTimeout(() => buscar(valor), RETARDO_MS);
    },
    buscarAhora() {
      buscar(texto);
    },
    cerrar(textoFinal: string) {
      cancelarPendiente();
      // El turno avanza para que una búsqueda en vuelo no repueble la lista
      // justo después de haber elegido.
      ultimaBusqueda.current += 1;
      setTexto(textoFinal);
      setResultados(null);
      setFallo(false);
    },
    resultados,
    buscando,
    fallo,
  };
}
