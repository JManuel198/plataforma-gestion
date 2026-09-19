import { z } from "zod";
import type { OrdenTrabajo } from "@/db/schema/orden-trabajo";
import { AVISOS, ESTADOS_OT } from "./constantes";

// Nada que venga de un formulario toca la base de datos sin pasar por aquí
// (regla 1 de AGENTS.md: la validación y el cálculo viven en el backend).

const textoObligatorio = (etiqueta: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${etiqueta} es obligatorio.`)
    .max(max, `${etiqueta} no puede pasar de ${max} caracteres.`);

// Un campo de texto vacío llega como "" desde FormData, no como undefined:
// se normaliza a null para que la columna quede nula y no con cadena vacía.
const textoOpcional = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `No puede pasar de ${max} caracteres.`)
    .transform((valor) => (valor === "" ? null : valor));

export const estadoOtSchema = z.enum(ESTADOS_OT, {
  error: "Selecciona uno de los estados válidos.",
});

// Chequeo en tiempo de compilación, con un alcance concreto — cubre una sola
// dirección, aunque a primera vista parezcan dos:
//
// - SÍ detecta un estado de más aquí: si constantes.ts inventa un valor que el
//   enum de PostgreSQL no tiene, el build falla.
// - NO detecta lo contrario: si el enum de PostgreSQL gana un valor y
//   constantes.ts no, esto compila en silencio, y ese estado queda
//   inseleccionable en el formulario e inválido al validar.
//
// O sea: protege contra inventar estados en el código, no contra olvidarse de
// uno que ya existe en la base. Al agregar un valor al enum, agrégalo aquí a
// mano — el compilador no te va a avisar.
const _estadoCoincide: z.ZodType<OrdenTrabajo["estado"]> = estadoOtSchema;
void _estadoCoincide;

/**
 * Campos que el usuario llena a mano.
 *
 * No aparecen a propósito, y no deben aparecer nunca:
 * - `codigo_ot` — lo genera el servidor (OT.CCM.AAAA.NNNN).
 * - `fecha_creacion` — la pone la base de datos al insertar.
 * - `servicio_id` — viaja fuera del formulario, atado a la Server Action con
 *   `.bind()`, para que no se pueda cambiar desde el navegador.
 *
 * Los campos que se ven repetidos respecto al Servicio (cotización, OC,
 * cliente) se escriben a mano y NO se sincronizan — decisión cerrada del
 * alcance v2.
 */
export const otCrearSchema = z.object({
  codigo_cotizacion: textoObligatorio("El código de cotización", 50),
  asunto: textoObligatorio("El asunto", 300),
  codigo_oc: textoOpcional(100),
  cliente: textoObligatorio("El cliente", 200),
  estado: estadoOtSchema,
  responsable: textoOpcional(200),
});

/**
 * Al editar tampoco viajan `servicio_id` ni `codigo_ot`: el origen de una OT
 * y su número no cambian una vez emitida.
 */
export const otEditarSchema = otCrearSchema.extend({
  id: z.string().trim().min(1, "Falta el identificador de la orden de trabajo."),
});

export const idServicioSchema = z
  .string()
  .trim()
  .min(1, "Falta el servicio de origen.");

export const filtroEstadoSchema = estadoOtSchema.optional().catch(undefined);

// `?aviso=` es input del cliente como cualquier otro: si viene inventado o
// repetido se ignora, no se muestra un toast con lo que diga la URL.
export const avisoSchema = z.enum(AVISOS).optional().catch(undefined);

export type OtCrearInput = z.infer<typeof otCrearSchema>;
export type OtEditarInput = z.infer<typeof otEditarSchema>;
