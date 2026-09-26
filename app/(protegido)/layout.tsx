import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { crmOcultoPara } from "@/core/visibilidad-crm";
import { BarraLateral } from "@/components/barra-lateral";
import { MigasDePan, ProveedorMigas } from "@/components/migas-de-pan";
import { Separator } from "@/components/ui/separator";
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

  // TEMPORAL (2026-09-25): los módulos del CRM aún en construcción se ocultan a
  // los correos de `CRM_OCULTO_PARA`. Ver core/visibilidad-crm.ts.
  const ocultarCrm = crmOcultoPara(sesion.user.email);

  return (
    // `flex-1` porque el <body> del layout raíz es `flex flex-col`: sin esto
    // el contenedor de la barra no estira hasta el alto completo.
    <SidebarProvider defaultOpen={barraAbierta} className="flex-1">
      <BarraLateral
        nombreUsuario={sesion.user.nombre_completo}
        correoUsuario={sesion.user.email}
        ocultarCrm={ocultarCrm}
      />
      {/* El tercer nivel de las migas lo registra la página de detalle que lo
          tenga (hoy /oportunidades/[id]); ver components/migas-de-pan.tsx. */}
      <ProveedorMigas>
        <SidebarInset>
          {/* Cabecera: el disparador de la barra y las migas de pan. En móvil
            el disparador es la única forma de abrir el cajón; en escritorio
            es el botón de colapsar. La sesión no vive aquí: está en el pie de
            la barra. */}
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="data-vertical:h-4 data-vertical:self-center"
            />
            <MigasDePan ocultarCrm={ocultarCrm} />
          </header>
          {/* `div` y no `main`: `SidebarInset` ya renderiza un <main>. */}
          <div className="flex-1 p-6">{children}</div>
        </SidebarInset>
      </ProveedorMigas>
      <Toaster />
    </SidebarProvider>
  );
}
