"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import type { EstadoFormulario } from "@/core/estado-formulario";
import { esUniqueViolado } from "@/core/errores-postgres";
import { exigirSesion } from "@/core/sesion";
import { perfilEditarSchema } from "./schema";

/** Nombre generado por Drizzle; está en db/migrations/0017_clammy_black_bolt.sql. */
const CONSTRAINT_DNI = "user_dni_unique";

const MENSAJE_FALLO_GUARDADO = "No se pudo guardar. Intenta de nuevo.";

const ERROR_DNI_DUPLICADO = {
  errores: { dni: ["Ya hay otra cuenta registrada con ese DNI."] },
} satisfies EstadoFormulario;

/**
 * Actualiza nombre, DNI y teléfono del usuario EN SESIÓN.
 *
 * El usuario sale de la sesión y de ningún otro sitio: no se lee ningún id
 * del formulario, así que no hay forma de editar otra cuenta con esta acción.
 *
 * `email` no se escribe bajo ninguna circunstancia. El esquema no lo declara
 * (Zod lo descarta si llega) y el `.set()` nombra sus columnas una a una.
 * No cambies ese `.set()` por un spread de `resultado.data`: el día que
 * alguien añada un campo al esquema, se escribiría sin que nadie lo decida.
 *
 * El nombre se escribe en `nombre_completo` (fuente de verdad) y en `name`
 * (copia para Better Auth) en el MISMO UPDATE, para que nunca diverjan. Ver
 * docs/spec/entidades.md, sección Usuario.
 */
export async function actualizarPerfil(
  formData: FormData,
): Promise<EstadoFormulario> {
  // Fuera del `try`: `redirect()` funciona lanzando.
  const sesion = await exigirSesion();

  const resultado = perfilEditarSchema.safeParse(Object.fromEntries(formData));

  if (!resultado.success) {
    return {
      mensaje: "Revisa los campos marcados.",
      errores: z.flattenError(resultado.error).fieldErrors,
    };
  }

  const { nombre, dni, telefono } = resultado.data;

  try {
    const actualizadas = await db
      .update(user)
      .set({ nombre_completo: nombre, name: nombre, dni, telefono })
      .where(eq(user.id, sesion.user.id))
      .returning({ id: user.id });

    if (actualizadas.length === 0) {
      return { mensaje: "Tu cuenta ya no existe." };
    }
  } catch (error) {
    // Mismo criterio que Personal: el UNIQUE de la base es la garantía, y
    // traducir el choque es lo único libre de carreras.
    if (esUniqueViolado(error, CONSTRAINT_DNI)) {
      return ERROR_DNI_DUPLICADO;
    }

    console.error("[Ajustes de usuario] fallo inesperado al guardar el perfil", error);
    return { mensaje: MENSAJE_FALLO_GUARDADO };
  }

  // El nombre se pinta en la barra lateral de TODAS las pantallas protegidas
  // (app/(protegido)/layout.tsx), así que se invalida el layout raíz, no una
  // sola ruta.
  revalidatePath("/", "layout");

  return { ok: true };
}
