import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "cn";

/**
 * Las iniciales que hacen de avatar: la primera letra de las dos primeras
 * palabras del nombre ("Ana Ramírez" → "AR").
 *
 * Las dos PRIMERAS y no la primera y la última: con nombres peruanos del tipo
 * "Juan Pérez García", la última palabra es el apellido materno, y lo habitual
 * es identificarse por nombre y apellido paterno. Con un nombre compuesto
 * ("Ana María Ramírez") da "AM", que es un compromiso aceptable para algo que
 * solo decora: el nombre completo está siempre escrito al lado.
 */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join("");
}

/**
 * El avatar del usuario: SOLO iniciales. No hay foto, ni subida de archivos,
 * ni storage externo (decisión del módulo de ajustes de usuario, AGENTS.md);
 * por eso se usa `AvatarFallback` sin `AvatarImage`. La columna `user.image`
 * de Better Auth existe pero no se usa.
 *
 * Vive en core/ porque lo pintan dos sitios que no pueden importarse entre
 * sí: el pie de la barra lateral (components/) y la pantalla de ajustes
 * (modules/ajustes-usuario/). Mismo cálculo en los dos, o dirían iniciales
 * distintas para la misma persona.
 *
 * `aria-hidden`: quien lo monta escribe siempre el nombre completo al lado,
 * así que leer "A R" antes sería ruido para un lector de pantalla.
 */
export function AvatarIniciales({
  nombre,
  size = "default",
  className,
}: {
  nombre: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} aria-hidden className={cn("shrink-0", className)}>
      <AvatarFallback className="font-semibold text-foreground">
        {iniciales(nombre)}
      </AvatarFallback>
    </Avatar>
  );
}
