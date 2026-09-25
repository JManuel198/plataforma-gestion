import { z } from "zod";
import type { EmpresaDatosInput } from "./schema";

// Cliente de la API de Decolecta para consultar un RUC en SUNAT.
//
// SOLO SE IMPORTA DESDE actions.ts (servidor). Lee `DECOLECTA_API_KEY`, que no
// lleva prefijo `NEXT_PUBLIC_` y por tanto nunca llega al navegador; aun así,
// importarlo desde un Client Component sería un error — la llamada tiene que
// salir del servidor, que es quien tiene la key.
//
// Vive en el módulo y no en core/ porque hoy solo lo usa Clientes. Si Contactos
// necesita consultar DNI (el mismo proveedor lo ofrece), la parte común —la
// petición autenticada y la clasificación de errores— se mueve a core/ en ese
// momento, nunca un import cruzado entre módulos.
//
// CONTRATO DE LA API (documentación de Decolecta, consultada el 2026-09-25 en
// decolecta.gitbook.io/docs/servicios/integrations):
//   GET https://api.decolecta.com/v1/sunat/ruc/full?numero=<ruc>
//   Authorization: Bearer <token>
//   200 → { razon_social, numero_documento, estado, condicion, direccion,
//           distrito, provincia, departamento, tipo, actividad_economica, … }
//   422 → { "message": "ruc no valido" }
//   400 → { "error": "Invalid request" }
// Se usa `/ruc/full` y no `/ruc` porque solo la avanzada trae `tipo` (el tipo
// de contribuyente, ej. "SOCIEDAD ANONIMA CERRADA") y `actividad_economica`.
// Según el plan contratado puede costar más por consulta; si eso importa, pasar
// a `/ruc` es cambiar la URL y aceptar esos dos campos en `null`.
//
// LO QUE LA DOCUMENTACIÓN NO DICE, y aquí se asume:
// - Cómo responde a un RUC bien formado que no existe. Se tratan 404 y 422
//   como "no encontrado": el formato ya se validó antes de llamar, así que un
//   "ruc no valido" sobre 11 dígitos es SUNAT diciendo que no lo conoce (o que
//   el dígito verificador no cuadra, que para el usuario es lo mismo).
// - Los códigos de key inválida y cuota agotada. Se tratan 401/403 como
//   credencial y 429 como cuota, que es lo estándar; cualquier otro código es
//   falla del servicio. Confirmar con una key real y ajustar aquí si difiere.
//
// NADA DE ESTO NOMBRA NI LOGUEA LA KEY: va solo en la cabecera, nunca en la
// URL (Decolecta también la acepta como `?token=`, que acabaría en logs de
// acceso), y los `console.error` registran estado y cuerpo de la respuesta,
// nunca la petición.

const URL_CONSULTA_RUC = "https://api.decolecta.com/v1/sunat/ruc/full";

/**
 * Tope de espera. Una Server Action colgada deja el botón «Consultar» girando
 * sin respuesta; mejor un error claro a los 8 s y que el usuario reintente o
 * llene a mano.
 */
const TIEMPO_MAXIMO_MS = 8_000;

/**
 * Los campos del formulario que la consulta puede sugerir. Son las MISMAS
 * claves que `empresaDatosSchema` (snake_case, las de la columna y del
 * FormData), no una forma paralela: así la UI puede volcarlas en los inputs por
 * `name` sin una tabla de traducción que pueda desincronizarse.
 */
export type DatosRuc = Pick<
  EmpresaDatosInput,
  | "razon_social"
  | "nombre_comercial"
  | "tipo_contribuyente"
  | "descripcion_rubro"
  | "estado"
  | "condicion"
  | "direccion"
  | "distrito"
  | "provincia"
  | "departamento"
>;

/**
 * Resultado de `consultarRuc`. Nunca una excepción: los tres fallos llegan
 * como dato, con `motivo` para que la UI pueda distinguirlos (p. ej. marcar el
 * campo RUC solo en `formato_invalido`) y `mensaje` listo para mostrar.
 */
export type ResultadoConsultaRuc =
  | { ok: true; datos: DatosRuc }
  | {
      ok: false;
      motivo: "formato_invalido" | "no_encontrado" | "falla_api";
      mensaje: string;
    };

export const MENSAJE_RUC_FORMATO = "El RUC debe tener exactamente 11 dígitos.";
const MENSAJE_NO_ENCONTRADO =
  "SUNAT no tiene registrado ese RUC. Revisa el número o llena los datos a mano.";
const MENSAJE_FALLA_API =
  "No se pudo consultar SUNAT en este momento. Intenta de nuevo en unos minutos o llena los datos a mano.";
const MENSAJE_CUOTA =
  "Se agotó el límite de consultas de RUC por ahora. Llena los datos a mano o intenta más tarde.";
const MENSAJE_TIEMPO =
  "SUNAT tardó demasiado en responder. Intenta de nuevo o llena los datos a mano.";

const fallaApi = (mensaje = MENSAJE_FALLA_API): ResultadoConsultaRuc => ({
  ok: false,
  motivo: "falla_api",
  mensaje,
});

const noEncontrado: ResultadoConsultaRuc = {
  ok: false,
  motivo: "no_encontrado",
  mensaje: MENSAJE_NO_ENCONTRADO,
};

/**
 * SUNAT rellena con "-" los componentes vacíos del domicilio, y la dirección
 * llega con espacios de cola. Todo eso es "sin dato" → `null`, igual que un
 * campo dejado en blanco en el formulario. Una clave ausente, también: así un
 * 200 con `{}` llega como "sin razón social" (→ no encontrado) en vez de como
 * respuesta rota.
 */
const textoSunat = z
  .unknown()
  .optional()
  .transform((valor) => {
    if (typeof valor !== "string") return null;
    const limpio = valor.replace(/\s+/g, " ").trim();
    return limpio === "" || limpio === "-" ? null : limpio;
  });

/**
 * La respuesta de un tercero es input no confiable, igual que un FormData: se
 * valida antes de usarla. Solo se declaran los campos que se usan; `z.object`
 * descarta el resto.
 */
const respuestaRucSchema = z.object({
  razon_social: textoSunat,
  estado: textoSunat,
  condicion: textoSunat,
  direccion: textoSunat,
  distrito: textoSunat,
  provincia: textoSunat,
  departamento: textoSunat,
  tipo: textoSunat,
  actividad_economica: textoSunat,
});

/**
 * Consulta un RUC ya validado en formato (11 dígitos). No escribe nada.
 *
 * Quien llama es responsable de validar el formato ANTES: así una entrada mal
 * escrita no gasta una consulta de la cuota.
 */
export async function consultarRucEnDecolecta(
  ruc: string,
): Promise<ResultadoConsultaRuc> {
  const apiKey = process.env.DECOLECTA_API_KEY;

  if (!apiKey) {
    console.error(
      "[Clientes] DECOLECTA_API_KEY no está configurada: la consulta de RUC no puede funcionar",
    );
    return fallaApi();
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${URL_CONSULTA_RUC}?${new URLSearchParams({ numero: ruc })}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        // Un dato de SUNAT cambia (estado, domicilio): cada clic consulta de
        // verdad, nunca una respuesta guardada.
        cache: "no-store",
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      },
    );
  } catch (error) {
    // `AbortSignal.timeout` rechaza con un DOMException "TimeoutError".
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error("[Clientes] Decolecta no respondió a tiempo");
      return fallaApi(MENSAJE_TIEMPO);
    }

    console.error("[Clientes] no se pudo conectar con Decolecta", error);
    return fallaApi();
  }

  if (respuesta.status === 404 || respuesta.status === 422) {
    return noEncontrado;
  }

  if (!respuesta.ok) {
    // Solo estado y cuerpo de la RESPUESTA: la petición lleva la key en la
    // cabecera y no se registra. El cuerpo se recorta por si llega una página
    // de error entera.
    const cuerpo = (await respuesta.text().catch(() => "")).slice(0, 500);

    if (respuesta.status === 401 || respuesta.status === 403) {
      console.error(
        `[Clientes] Decolecta rechazó la credencial (HTTP ${respuesta.status}): revisa DECOLECTA_API_KEY`,
        cuerpo,
      );
      return fallaApi();
    }

    if (respuesta.status === 429) {
      console.error("[Clientes] Decolecta: cuota agotada (HTTP 429)", cuerpo);
      return fallaApi(MENSAJE_CUOTA);
    }

    console.error(
      `[Clientes] Decolecta respondió HTTP ${respuesta.status}`,
      cuerpo,
    );
    return fallaApi();
  }

  let json: unknown;

  try {
    json = await respuesta.json();
  } catch (error) {
    console.error("[Clientes] Decolecta devolvió un cuerpo que no es JSON", error);
    return fallaApi();
  }

  const leido = respuestaRucSchema.safeParse(json);

  if (!leido.success) {
    console.error(
      "[Clientes] respuesta de Decolecta con forma inesperada",
      z.flattenError(leido.error),
    );
    return fallaApi();
  }

  const sunat = leido.data;

  // Un 200 sin razón social no sirve de sugerencia: se trata como "no
  // encontrado" en vez de rellenar el formulario con un registro vacío.
  if (!sunat.razon_social) {
    return noEncontrado;
  }

  return {
    ok: true,
    datos: {
      razon_social: sunat.razon_social,
      // Decolecta NO devuelve nombre comercial en ninguna de sus dos
      // consultas de RUC. La clave se mantiene (siempre `null`) para que la UI
      // trate todos los campos igual; con `null`, no hay nada que sugerir y
      // lo que el usuario haya escrito se queda.
      nombre_comercial: null,
      tipo_contribuyente: sunat.tipo,
      descripcion_rubro: sunat.actividad_economica,
      estado: sunat.estado,
      condicion: sunat.condicion,
      direccion: sunat.direccion,
      distrito: sunat.distrito,
      provincia: sunat.provincia,
      departamento: sunat.departamento,
    },
  };
}
