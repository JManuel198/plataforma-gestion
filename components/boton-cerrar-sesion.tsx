"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function BotonCerrarSesion() {
  const router = useRouter();

  async function cerrarSesion() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={cerrarSesion}>
      Cerrar sesión
    </Button>
  );
}
