"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EstadoFormulario } from "@/core/estado-formulario";
import type { ResultadoAccion } from "@/core/resultado-accion";
import { esRedireccionDeNext } from "@/lib/redireccion";

/** Por qué no se pudo: el mensaje general y, si los hay, los errores por campo. */
export type FalloAccion = {
  mensaje: string;
  errores?: Record<string, string[] | undefined>;
};

const MENSAJE_FALLO_INESPERADO = "No se pudo completar. Intenta de nuevo.";

/**
 * Cómo ejecuta el detalle de una oportunidad sus acciones (Parte 10): editar,
 * cambiar de etapa, actividad, perder, anular y reabrir. Es el MISMO remate
 * para todas, y por eso vive en un solo sitio:
 *
 * 1. `try/catch` que deja pasar el `redirect()` de sesión vencida
 *    (convención de AGENTS.md) y traduce cualquier otro fallo en un mensaje.
 * 2. ÉXITO: aviso y `router.refresh()`. La página es un Server Component: el
 *    refresh vuelve a pedirla y trae la información general, la cabecera, la
 *    línea de etapas y la línea de tiempo YA escritas por el servidor, sin
 *    recargar la página ni perder el estado de los componentes cliente. Nada
 *    se pinta de forma optimista: lo que se ve es siempre lo que la base
 *    guardó (regla invariable 1).
 * 3. FALLO SIN ERRORES DE CAMPO (la oportunidad ya estaba cerrada, ya no
 *    existe, otra pestaña la movió…): aviso de error Y `router.refresh()`,
 *    para que la pantalla refleje lo que de verdad pasó en el servidor en vez
 *    de quedarse con una foto vieja. Si el refresh trae la oportunidad cerrada,
 *    los botones que ya no aplican desaparecen solos —y con ellos su diálogo—;
 *    el aviso explica por qué.
 * 4. FALLO CON ERRORES DE CAMPO (el motivo vacío, un contacto dado de baja):
 *    solo `alFallar`, que los pinta bajo su campo con el diálogo abierto y lo
 *    escrito intacto. No hay nada que refrescar: el servidor no escribió nada.
 *
 * `pendiente` dura hasta que termina también el refresh (va dentro de la
 * transición), así que los botones siguen deshabilitados hasta que la pantalla
 * ya muestra el resultado.
 */
export function useAccionOportunidad() {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  function ejecutar(
    llamada: () => Promise<ResultadoAccion | EstadoFormulario>,
    {
      exito,
      alTerminarBien,
      alFallar,
    }: {
      /** El texto del aviso de éxito. */
      exito: string;
      alTerminarBien?: () => void;
      alFallar?: (fallo: FalloAccion) => void;
    },
  ) {
    iniciar(async () => {
      let resultado: ResultadoAccion | EstadoFormulario;

      try {
        resultado = await llamada();
      } catch (error) {
        if (esRedireccionDeNext(error)) throw error;

        console.error("[Oportunidades] fallo inesperado en el detalle", error);
        resultado = { ok: false, mensaje: MENSAJE_FALLO_INESPERADO };
      }

      const fallo = falloDe(resultado);

      if (fallo) {
        alFallar?.(fallo);

        if (!fallo.errores) {
          toast.error(fallo.mensaje);
          router.refresh();
        }
        return;
      }

      alTerminarBien?.();
      toast.success(exito);
      router.refresh();
    });
  }

  return { ejecutar, pendiente };
}

/**
 * Las dos formas de respuesta de las acciones del módulo, en una: un
 * `ResultadoAccion` (argumentos sueltos) o un `EstadoFormulario` (FormData).
 */
function falloDe(
  resultado: ResultadoAccion | EstadoFormulario,
): FalloAccion | null {
  if (resultado.ok === true) return null;

  if ("errores" in resultado && resultado.errores) {
    return {
      mensaje: resultado.mensaje ?? "Revisa los campos marcados.",
      errores: resultado.errores,
    };
  }

  return { mensaje: resultado.mensaje ?? MENSAJE_FALLO_INESPERADO };
}
