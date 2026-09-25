import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * La sesión del usuario que hace la petición, o redirección a /login.
 *
 * Una Server Action se puede invocar con un POST directo, sin pasar por la
 * pantalla — así que la sesión se verifica dentro de cada acción, no solo en
 * el layout.
 *
 * `redirect()` funciona lanzando: quien llame a esto lo hace FUERA de su
 * `try`, o el catch se comería la navegación
 * (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md).
 *
 * VIVE EN core/ DESDE 2026-09-24. Hasta entonces había siete copias idénticas
 * (mismo texto byte a byte) en los actions.ts de ordenes-trabajo, personal,
 * materiales, lista-precios, servicios, tarifario-personal y epps. El módulo
 * de ajustes de usuario, que habría sido la octava, fue el primero en usar
 * esta. Las siete se retiraron después, el mismo día, tras comprobar que
 * seguían idénticas a esta: hoy todos los módulos la importan de aquí.
 */
export async function exigirSesion() {
  const sesion = await auth.api.getSession({ headers: await headers() });

  if (!sesion) {
    redirect("/login");
  }

  return sesion;
}
