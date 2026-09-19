"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Aviso } from "../constantes";

const MENSAJES: Record<Aviso, string> = {
  creada: "Orden de trabajo creada.",
  editada: "Cambios guardados.",
};

/**
 * Las Server Actions terminan en `redirect()`, así que el toast no se puede
 * disparar desde el formulario: para cuando la acción responde, el componente
 * ya se está desmontando. El aviso viaja en la URL
 * (`/ordenes-trabajo?aviso=creada`) y se muestra aquí al montar.
 *
 * `destino` es la misma URL sin el parámetro `aviso`, calculada en el servidor
 * — se reemplaza para que un refresh no repita el mensaje. No se usa
 * `useSearchParams` a propósito: así el componente no obliga a envolver la
 * página en un Suspense.
 */
export function AvisoToast({
  aviso,
  destino,
}: {
  aviso?: Aviso;
  destino: string;
}) {
  const router = useRouter();
  const yaMostrado = useRef(false);

  useEffect(() => {
    if (!aviso || yaMostrado.current) return;

    yaMostrado.current = true;
    toast.success(MENSAJES[aviso]);
    router.replace(destino, { scroll: false });
  }, [aviso, destino, router]);

  return null;
}
