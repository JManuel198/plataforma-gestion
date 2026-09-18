import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm font-medium">
          {sesion.user.nombre_completo}
        </span>
        <BotonCerrarSesion />
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
