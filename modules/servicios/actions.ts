"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { servicio } from "@/db/schema/servicio";
import type { EstadoFormulario } from "./estado-formulario";
import { servicioCrearSchema, servicioEditarSchema } from "./schema";

/**
 * Una Server Action se puede invocar con un POST directo, sin pasar por la
 * pantalla — así que la sesión se verifica aquí dentro, no solo en el layout.
 */
async function exigirSesion() {
  const sesion = await auth.api.getSession({ headers: await headers() });

  if (!sesion) {
    redirect("/login");
  }

  return sesion;
}

export async function crearServicio(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = servicioCrearSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!resultado.success) {
    return {
      mensaje: "Revisa los campos marcados.",
      errores: z.flattenError(resultado.error).fieldErrors,
    };
  }

  // `fecha` no se envía: la pone la base de datos (DEFAULT now()) al insertar.
  await db.insert(servicio).values(resultado.data);

  revalidatePath("/servicios");
  // El aviso viaja en la URL: el toast se muestra ya en el listado, después
  // de la navegación (ver components/aviso-toast.tsx).
  redirect("/servicios?aviso=creado");
}

export async function editarServicio(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await exigirSesion();

  const resultado = servicioEditarSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!resultado.success) {
    return {
      mensaje: "Revisa los campos marcados.",
      errores: z.flattenError(resultado.error).fieldErrors,
    };
  }

  const { id, ...campos } = resultado.data;

  // `fecha` queda como se registró al crear: editar un servicio no lo vuelve
  // a fechar. `updatedAt` sí se actualiza sola ($onUpdate en el esquema).
  const actualizadas = await db
    .update(servicio)
    .set(campos)
    .where(eq(servicio.id, id))
    .returning({ id: servicio.id });

  if (actualizadas.length === 0) {
    return { mensaje: "Ese servicio ya no existe." };
  }

  revalidatePath("/servicios");
  revalidatePath(`/servicios/${id}/editar`);
  redirect("/servicios?aviso=editado");
}
