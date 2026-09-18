"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADOS_SERVICIO, type EstadoServicio } from "../constantes";

const TODOS = "todos";

/**
 * El estado elegido viaja en la URL (`/servicios?estado=Facturado`) y el
 * filtrado ocurre en la consulta del servidor — este componente solo navega.
 */
export function FiltroEstado({ estado }: { estado?: EstadoServicio }) {
  const router = useRouter();
  const [navegando, iniciarNavegacion] = useTransition();

  const opciones = [
    { label: "Todos los estados", value: TODOS },
    ...ESTADOS_SERVICIO.map((valor) => ({ label: valor, value: valor })),
  ];

  function filtrarPor(valor: string | null) {
    const destino =
      valor && valor !== TODOS
        ? `/servicios?estado=${encodeURIComponent(valor)}`
        : "/servicios";

    iniciarNavegacion(() => router.push(destino));
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="filtro-estado">Estado</Label>
      <Select
        value={estado ?? TODOS}
        onValueChange={filtrarPor}
        items={opciones}
        disabled={navegando}
      >
        <SelectTrigger id="filtro-estado" className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((opcion) => (
            <SelectItem key={opcion.value} value={opcion.value}>
              {opcion.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
