"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BanknoteIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  HardHatIcon,
  HomeIcon,
  PackageIcon,
  TagsIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { BotonCerrarSesion } from "@/components/boton-cerrar-sesion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

type Enlace = {
  href: string;
  etiqueta: string;
  Icono: LucideIcon;
};

export type Seccion = {
  /**
   * Encabezado visual del grupo. Opcional: sin él los enlaces van sueltos
   * arriba, que es como aparecen Inicio y Órdenes de Trabajo. Cuando lo hay,
   * el encabezado es además el botón que pliega y despliega la sección.
   */
  encabezado?: string;
  enlaces: readonly Enlace[];
};

/**
 * El menú de la barra. Agregar una entrada es agregarla aquí: ni el layout ni
 * el resto de este componente cambian de forma.
 *
 * ETIQUETA Y RUTA VAN DESACOPLADAS — DECISIÓN DELIBERADA (Bloque 11).
 * `encabezado` es SOLO texto que agrupa enlaces en el menú; jamás forma parte
 * de una URL. Por eso Personal sigue en `/personal` (no `/ssoma/personal`) y
 * los catálogos son rutas planas de nivel superior (`/materiales`,
 * `/lista-precios`, `/servicios`, `/tarifario-personal`, `/epps`), no
 * `/catalogos-maestros/...`. Ningún `href` se deriva del texto del encabezado.
 *
 * El motivo: "SSOMA" es un nombre temporal y es probable que cambie. Con la
 * etiqueta fuera de la URL, renombrarlo es editar el string de abajo y nada
 * más — cero rutas afectadas, cero enlaces guardados o compartidos rotos.
 *
 * El mismo principio cubre el plegado de cada sección (ver `SeccionBarra`):
 * abrir o cerrar un grupo es estado puramente visual y no toca la URL — nada
 * de `?ssoma=abierto` ni de rutas distintas según el estado. Si mañana se
 * quiere que el plegado sobreviva a una recarga, el sitio es una cookie o
 * `localStorage`, nunca el `searchParams`.
 *
 * SI ALGÚN DÍA SE QUIERE LO CONTRARIO (URLs más descriptivas, del tipo
 * `/catalogos-maestros/materiales`): la decisión de ahora está tomada a
 * sabiendas, no por descuido. Revertirla es mover las carpetas de
 * `app/(protegido)/<ruta>/` a `app/(protegido)/<grupo>/<ruta>/`, actualizar
 * los `href` de esta lista y dejar redirecciones desde las rutas viejas
 * (`next.config.ts`) para no romper lo que ya esté enlazado. Está anotado en
 * la sección de Convenciones de AGENTS.md.
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
export const MENU: readonly Seccion[] = [
  {
    enlaces: [
      { href: "/", etiqueta: "Inicio", Icono: HomeIcon },
      {
        href: "/ordenes-trabajo",
        etiqueta: "Órdenes de Trabajo",
        Icono: ClipboardListIcon,
      },
    ],
  },
  {
    // Nombre provisional: ver el bloque de arriba antes de tocarlo (cambiarlo
    // es seguro justamente porque no hay ninguna ruta que dependa de él).
    encabezado: "SSOMA",
    enlaces: [{ href: "/personal", etiqueta: "Personal", Icono: UsersIcon }],
  },
  {
    encabezado: "Catálogos maestros",
    enlaces: [
      { href: "/materiales", etiqueta: "Materiales", Icono: PackageIcon },
      { href: "/lista-precios", etiqueta: "Lista de precios", Icono: TagsIcon },
      { href: "/servicios", etiqueta: "Servicios", Icono: WrenchIcon },
      {
        href: "/tarifario-personal",
        etiqueta: "Tarifario de personal",
        Icono: BanknoteIcon,
      },
      { href: "/epps", etiqueta: "EPPs", Icono: HardHatIcon },
    ],
  },
];

/**
 * Si `pathname` cae dentro de la ruta de un enlace del menú.
 *
 * `startsWith` además de la igualdad para que las pantallas hijas
 * (/ordenes-trabajo/nueva, /ordenes-trabajo/x/editar) sigan marcando su
 * sección. El `/` del final evita que "/ordenes-trabajo-x" se dé por activo —
 * y de paso deja a Inicio marcándose solo en "/" exacto, porque ningún
 * pathname empieza por "//".
 *
 * Exportada porque las migas de pan (components/migas-de-pan.tsx) tienen que
 * decidir la sección con la MISMA regla que la barra: si divergieran, la
 * cabecera diría una sección y la barra resaltaría otra.
 */
export function esEnlaceActivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Las iniciales que hacen de avatar en el pie de la barra: la primera letra de
 * las dos primeras palabras del nombre ("Ana Ramírez" → "AR").
 *
 * Las dos PRIMERAS y no la primera y la última: con nombres peruanos del tipo
 * "Juan Pérez García", la última palabra es el apellido materno, y lo habitual
 * es identificarse por nombre y apellido paterno. Con un nombre compuesto
 * ("Ana María Ramírez") da "AM", que es un compromiso aceptable para algo que
 * solo decora: el nombre completo está escrito al lado.
 */
function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join("");
}

/**
 * Una sección del menú. Si tiene `encabezado`, el encabezado es el disparador
 * que la pliega y despliega; si no, los enlaces van sueltos y no hay nada que
 * plegar.
 *
 * El estado abierto/cerrado vive aquí, en cada sección, y por eso cada una es
 * independiente: abrir SSOMA no toca Catálogos maestros. Arranca abierta y no
 * se persiste — cada carga vuelve a empezar abierta.
 *
 * LOS DOS EJES DE COLAPSO NO SON EL MISMO. El de la barra entera
 * (`collapsible="icon"`, la franja de iconos) ya existía; este, por sección,
 * es nuevo. Se cruzan en un punto y hay que tratarlo: en modo icono el
 * encabezado se desvanece (`SidebarGroupLabel` lleva
 * `group-data-[collapsible=icon]:opacity-0`), así que una sección cerrada
 * dejaría sus enlaces inalcanzables — sin encabezado visible que tocar para
 * reabrirla. Por eso en modo icono el panel se fuerza abierto (`modoIcono ||
 * abierta`) y el encabezado se marca `inert`, que lo saca del tabulador y del
 * árbol de accesibilidad: invisible y además no enfocable, en vez de un botón
 * fantasma. `disabled` no serviría: el trigger de Base UI usa
 * `focusableWhenDisabled: true`.
 *
 * Lo que eligió el usuario no se pierde en el cruce: `abierta` se conserva
 * mientras la barra está en modo icono, así que al volver a expandirla la
 * sección reaparece como la había dejado.
 *
 * En móvil no aplica: la barra se renderiza dentro de un `Sheet` y ahí nunca
 * hay `data-collapsible="icon"` — de ahí el `&& !isMobile`.
 */
function SeccionBarra({
  seccion,
  pathname,
}: {
  seccion: Seccion;
  pathname: string;
}) {
  const { state, isMobile } = useSidebar();
  const modoIcono = state === "collapsed" && !isMobile;
  const [abierta, setAbierta] = useState(true);

  const enlaces = (
    <SidebarMenu>
      {seccion.enlaces.map(({ href, etiqueta, Icono }) => {
        const activo = esEnlaceActivo(pathname, href);

        return (
          <SidebarMenuItem key={href}>
            {/* `render={<Link/>}` es correcto AQUÍ, aunque la convención del
                proyecto lo prohíba para `Button`: lo que inyecta
                `role="button"` y rompe la semántica del enlace es `useButton`,
                que usa el `ButtonPrimitive` de Base UI envuelto en
                components/ui/button.tsx. `SidebarMenuButton` usa solo
                `useRender`, sin `useButton`, así que esto renderiza un `<a>`
                limpio. No lo "corrijas" a una clase suelta sobre el Link:
                perderías el tooltip de la barra colapsada, que lo pone este
                componente. */}
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
  );

  if (!seccion.encabezado) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>{enlaces}</SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <Collapsible open={modoIcono || abierta} onOpenChange={setAbierta}>
        {/* `render={<CollapsibleTrigger/>}` sí está bien: `SidebarGroupLabel`
            es `useRender` puro y el trigger de Base UI renderiza un `<button>`
            nativo con `nativeButton` en true, que es el caso en que el flag y
            el elemento coinciden — solo añade `type="button"`. */}
        <SidebarGroupLabel
          render={<CollapsibleTrigger />}
          inert={modoIcono || undefined}
          className="group/encabezado w-full cursor-pointer hover:text-sidebar-foreground"
        >
          <span>{seccion.encabezado}</span>
          {/* El trigger lleva `data-panel-open` mientras la sección está
              abierta; cerrada no lleva atributo, de ahí que la rotación
              en reposo sea la de cerrado. */}
          <ChevronDownIcon className="ml-auto -rotate-90 transition-transform duration-200 group-data-[panel-open]/encabezado:rotate-0" />
        </SidebarGroupLabel>

        <CollapsibleContent>
          <SidebarGroupContent>{enlaces}</SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

/**
 * Barra lateral del layout protegido: los enlaces en columna agrupados bajo
 * sus encabezados, la marca arriba y el usuario con su correo abajo.
 *
 * Es Client Component solo por `usePathname()`, que es lo que marca la sección
 * en la que está el usuario. La sesión NO se lee aquí: llega por prop desde el
 * Server Component del layout, que es quien la verifica.
 *
 * Responsive, resuelto por el propio `Sidebar`: por debajo de 768px
 * (`useIsMobile`) se renderiza dentro de un `Sheet`, o sea un cajón que entra
 * sobre el contenido y no ocupa ancho; de ahí para arriba es fija y
 * `collapsible="icon"` la deja en una franja de iconos con el nombre en un
 * tooltip.
 *
 * Los encabezados se agrupan con `SidebarGroup` + `SidebarGroupLabel` y no con
 * `SidebarMenuSub`: el submenú lleva `group-data-[collapsible=icon]:hidden`, o
 * sea que al colapsar la barra desaparecerían Personal y los cinco catálogos.
 * Con grupos, lo que se desvanece es solo el encabezado y los iconos siguen
 * siendo accesibles.
 */
export function BarraLateral({
  nombreUsuario,
  correoUsuario,
}: {
  nombreUsuario: string;
  correoUsuario: string;
}) {
  const pathname = usePathname();

  return (
    // El `TooltipProvider` va aquí y no en el layout raíz porque los únicos
    // tooltips del proyecto son los de esta barra cuando está colapsada. Base
    // UI no lo exige (`Tooltip.Root` funciona suelto); se pone porque es lo
    // que fija el retardo de apertura en 0 (ver components/ui/tooltip.tsx).
    <TooltipProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          {/* Sin logo todavía (la marca gráfica no está definida): solo el
              nombre de la empresa y el de la plataforma, como en el mockup de
              docs/diseno/. Se oculta entero en modo icono — en 3rem no cabe
              nada legible, y un recorte a dos letras parecería un logo que no
              lo es. Cuando haya logo, es el que debe quedarse visible ahí.

              "CCM" está escrito aquí a sabiendas, igual que `CODIGO_EMPRESA`
              en modules/ordenes-trabajo/constantes.ts: la marca de cliente
              pertenece a config/clientes/*.json, que hoy no tiene ningún
              archivo (ver AGENTS.md). No se importa esa constante: es el
              código del correlativo de OT, no el nombre que se muestra, y que
              hoy coincidan es casualidad. */}
          <div className="grid px-2 py-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold tracking-tight">
              CCM
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Plataforma de gestión
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {MENU.map((seccion) => (
            // Sin `encabezado` la clave es la del primer enlace: las secciones
            // son una constante, no una lista que se reordene en runtime. La
            // clave tiene que ser estable: es lo que conserva el estado
            // abierto/cerrado de cada sección entre renders.
            <SeccionBarra
              key={seccion.encabezado ?? seccion.enlaces[0].href}
              seccion={seccion}
              pathname={pathname}
            />
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              {/* No es un botón: hoy no hay perfil ni menú de cuenta al que
                  llevar, así que es solo información. En modo icono queda
                  únicamente el cuadro de iniciales, centrado en la franja
                  (`px-0` + `justify-center`); nombre y correo se ocultan en vez
                  de truncarse. Las iniciales van con `aria-hidden` porque el
                  nombre completo ya se lee al lado, y en modo icono lo dice
                  el `title`. */}
              <div
                className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                title={nombreUsuario}
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold"
                >
                  {iniciales(nombreUsuario)}
                </span>
                <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-medium">
                    {nombreUsuario}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {correoUsuario}
                  </span>
                </div>
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
