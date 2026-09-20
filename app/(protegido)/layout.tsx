import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BarraLateral } from "@/components/barra-lateral";
import { Toaster } from "@/components/ui/sonner";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function LayoutProtegido({
  children,
}: {
  children: ReactNode;
}) {
  const sesion = await auth.api.getSession({ headers: await headers() });

  if (!sesion) {
    redirect("/login");
  }

  // La barra guarda ella sola si está abierta o colapsada en la cookie
  // `sidebar_state`. Leerla aquí y pasarla como `defaultOpen` evita que al
  // recargar se pinte abierta un instante antes de que el cliente la colapse.
  // `cookies()` es asíncrona en Next 16, igual que `headers()`.
  const cookieStore = await cookies();
  const barraAbierta = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    // `flex-1` porque el <body> del layout raíz es `flex flex-col`: sin esto
    // el contenedor de la barra no estira hasta el alto completo.
    <SidebarProvider defaultOpen={barraAbierta} className="flex-1">
      <BarraLateral nombreUsuario={sesion.user.nombre_completo} />
      <SidebarInset>
        {/* Cabecera mínima: solo el disparador de la barra. En móvil es la
            única forma de abrir el cajón; en escritorio es el botón de
            colapsar. Ya no lleva navegación ni sesión — las dos cosas se
            mudaron a la barra. */}
        <header className="flex h-12 shrink-0 items-center border-b px-4">
          <SidebarTrigger />
        </header>
        {/* `div` y no `main`: `SidebarInset` ya renderiza un <main>. */}
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
