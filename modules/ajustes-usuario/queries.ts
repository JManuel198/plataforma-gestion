import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { exigirSesion } from "@/core/sesion";

/**
 * El perfil del usuario EN SESIÓN. No recibe ningún id a propósito: no existe
 * forma de pedir el perfil de otra cuenta a través de esta función.
 *
 * Se lee de la base, no de `sesion.user`: `dni` lleva `returned: false` en
 * lib/auth.ts, así que la sesión de Better Auth no lo trae.
 *
 * `nombre` sale de `nombre_completo`, la fuente de verdad del nombre (`name`
 * es solo su copia para Better Auth — ver docs/spec/entidades.md).
 */
export async function obtenerPerfil() {
  const sesion = await exigirSesion();

  const [perfil] = await db
    .select({
      nombre: user.nombre_completo,
      email: user.email,
      dni: user.dni,
      telefono: user.telefono,
    })
    .from(user)
    .where(eq(user.id, sesion.user.id))
    .limit(1);

  // Sesión válida pero sin fila: la cuenta se borró por fuera mientras la
  // sesión seguía viva. `session` tiene ON DELETE CASCADE sobre `user`, así
  // que es una carrera estrecha, pero no se asume imposible.
  return perfil ?? null;
}

export type Perfil = NonNullable<Awaited<ReturnType<typeof obtenerPerfil>>>;
