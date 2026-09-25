import { notFound } from "next/navigation";
import { exigirSesion } from "@/core/sesion";

/**
 * TEMPORAL — ocultar a usuarios concretos los módulos del CRM que siguen en
 * construcción (decidido el 2026-09-25). Hoy son Contactos y Embudo de
 * oportunidades; Clientes ya es visible para todos. Qué enlaces se ocultan lo
 * marca `ocultableTemporalmente` en MENU (components/barra-lateral.tsx), y qué
 * pantallas, las que llaman a `exigirCrmVisible`. Se retira entero cuando los
 * módulos estén terminados, presentados y aprobados: el procedimiento de
 * limpieza está en AGENTS.md, "Excepción en curso — CRM".
 *
 * La lista sale de la variable de entorno `CRM_OCULTO_PARA` (correos separados
 * por comas) y NO del código: así el correo de una persona no queda en el
 * repositorio, y volver a mostrarle esos módulos es vaciar la variable en Vercel
 * y redesplegar, sin tocar código. Sin la variable, todo el CRM es visible para
 * todos.
 *
 * Es ocultar, NO un permiso: oculta los enlaces del menú, las migas de pan y
 * las pantallas marcadas, nada más. Si algún día hace falta restringir de
 * verdad, eso es un sistema de roles, que está fuera de alcance por decisión
 * explícita (AGENTS.md, "Módulo de ajustes de usuario").
 */
export function crmOcultoPara(correo: string): boolean {
  const ocultos = (process.env.CRM_OCULTO_PARA ?? "")
    .split(",")
    .map((valor) => valor.trim().toLowerCase())
    .filter(Boolean);

  return ocultos.includes(correo.trim().toLowerCase());
}

/**
 * Para las pantallas ocultas del CRM: a quien las tiene ocultas le responde
 * como si la ruta no existiera (404), en vez de un "no tienes acceso" que
 * anunciaría que hay algo ahí. Se llama al principio de la página, antes de cualquier consulta.
 */
export async function exigirCrmVisible(): Promise<void> {
  const sesion = await exigirSesion();

  if (crmOcultoPara(sesion.user.email)) {
    notFound();
  }
}
