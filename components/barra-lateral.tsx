"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardListIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { BotonCerrarSesion } from "@/components/boton-cerrar-sesion";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

type Modulo = {
  href: string;
  etiqueta: string;
  Icono: LucideIcon;
};

/**
 * Los módulos que se listan en la barra. Agregar uno es agregar una entrada
 * aquí: ni el layout ni este componente cambian de forma. Personal entró así
 * el 2026-09-20, sin tocar nada más.
 *
 * DÓNDE DEBERÍA VIVIR ESTO A LA LARGA: en `config/clientes/*.json`, que según
 * AGENTS.md es quien declara los "módulos activos" de cada cliente — no todos
 * contratan los mismos. Vive en el código a sabiendas y no por descuido:
 * `config/clientes/` no tiene todavía ningún `.json` (misma situación que
 * `CODIGO_EMPRESA` en modules/ordenes-trabajo/constantes.ts, anotada en la
 * deuda técnica de AGENTS.md). Al mover la lista allí, el icono no puede
 * viajar en el JSON tal cual: habrá que dejar en el archivo de cliente la
 * clave del icono y resolverla contra un mapa en el código.
 */
const MODULOS: readonly Modulo[] = [
  {
    href: "/ordenes-trabajo",
    etiqueta: "Órdenes de Trabajo",
    Icono: ClipboardListIcon,
  },
  {
    href: "/personal",
    etiqueta: "Personal",
    Icono: UsersIcon,
  },
];

/**
 * Barra lateral del layout protegido: los módulos en columna, la marca arriba
 * y la sesión abajo.
 *
 * Es Client Component solo por `usePathname()`, que es lo que marca el módulo
 * en el que está el usuario. La sesión NO se lee aquí: llega por prop desde el
 * Server Component del layout, que es quien la verifica.
 *
 * Responsive, resuelto por el propio `Sidebar`: por debajo de 768px
 * (`useIsMobile`) se renderiza dentro de un `Sheet`, o sea un cajón que entra
 * sobre el contenido y no ocupa ancho; de ahí para arriba es fija y
 * `collapsible="icon"` la deja en una franja de iconos con el nombre en un
 * tooltip.
 */
export function BarraLateral({ nombreUsuario }: { nombreUsuario: string }) {
  const pathname = usePathname();

  return (
    // El `TooltipProvider` va aquí y no en el layout raíz porque los únicos
    // tooltips del proyecto son los de esta barra cuando está colapsada. Base
    // UI no lo exige (`Tooltip.Root` funciona suelto); se pone porque es lo
    // que fija el retardo de apertura en 0 (ver components/ui/tooltip.tsx).
    <TooltipProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex h-8 items-center px-2 text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Plataforma de Gestión
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Módulos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MODULOS.map(({ href, etiqueta, Icono }) => {
                  // `startsWith` además de la igualdad para que las pantallas
                  // hijas (/ordenes-trabajo/nueva, /ordenes-trabajo/x/editar)
                  // sigan marcando su módulo. El `/` del final evita que
                  // "/ordenes-trabajo-x" se dé por activo.
                  const activo =
                    pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <SidebarMenuItem key={href}>
                      {/* `render={<Link/>}` es correcto AQUÍ, aunque la
                          convención del proyecto lo prohíba para `Button`: lo
                          que inyecta `role="button"` y rompe la semántica del
                          enlace es `useButton`, que usa el `ButtonPrimitive`
                          de Base UI envuelto en components/ui/button.tsx.
                          `SidebarMenuButton` usa solo `useRender`, sin
                          `useButton`, así que esto renderiza un `<a>` limpio.
                          No lo "corrijas" a una clase suelta sobre el Link:
                          perderías el tooltip de la barra colapsada, que lo
                          pone este componente. */}
                      <SidebarMenuButton
                        isActive={activo}
                        tooltip={etiqueta}
                        render={<Link href={href} />}
                      >
                        <Icono />
                        <span>{etiqueta}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              {/* El nombre se oculta al colapsar en vez de truncarse a dos
                  letras: en 3rem no cabe nada legible, y el icono de cerrar
                  sesión de abajo ya deja claro que la fila es la del usuario. */}
              <div className="truncate px-2 py-1 text-sm font-medium group-data-[collapsible=icon]:hidden">
                {nombreUsuario}
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <BotonCerrarSesion />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        {/* El borde arrastrable que colapsa la barra en escritorio, para no
            depender solo del botón de la cabecera. */}
        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  );
}
