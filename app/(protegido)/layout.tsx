import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { BotonCerrarSesion } from "@/components/boton-cerrar-sesion";

export default async function LayoutProtegido({
  children,
}: {
  children: ReactNode;
}) {
  const sesion = await auth.api.getSession({ headers: await headers() });

  if (!sesion) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/ordenes-trabajo"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Órdenes de Trabajo
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {sesion.user.nombre_completo}
          </span>
          <BotonCerrarSesion />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
      <Toaster />
    </div>
  );
}
