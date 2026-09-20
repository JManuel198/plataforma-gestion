"use client";

import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { SidebarMenuButton } from "@/components/ui/sidebar";

/**
 * Cerrar sesión, en el pie de la barra lateral.
 *
 * Se renderiza como `SidebarMenuButton` y no como `Button` porque vive dentro
 * de la barra: así se colapsa a icono con el resto cuando la barra se estrecha
 * y muestra su nombre en un tooltip, sin clases a medida para imitar ese
 * comportamiento. Aquí sí es un `<button>` de verdad (no lleva `render`), que
 * es lo que corresponde: no navega a ninguna parte, dispara una acción.
 *
 * La lógica de salida sigue viviendo solo aquí, que es lo que importa si algún
 * día hay un segundo sitio desde donde cerrar sesión.
 */
export function BotonCerrarSesion() {
  const router = useRouter();

  async function cerrarSesion() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <SidebarMenuButton onClick={cerrarSesion} tooltip="Cerrar sesión">
      <LogOutIcon />
      <span>Cerrar sesión</span>
    </SidebarMenuButton>
  );
}
