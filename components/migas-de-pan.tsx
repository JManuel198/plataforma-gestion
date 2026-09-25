"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { esEnlaceActivo, menuVisible } from "@/components/barra-lateral";

/**
 * Migas de pan de la cabecera: "Catálogos maestros › Lista de precios".
 *
 * NO TIENEN FUENTE PROPIA: salen de `MENU` (components/barra-lateral.tsx), que
 * sigue siendo el único sitio que declara la relación etiqueta/ruta. Renombrar
 * "SSOMA" allí la renombra aquí también, sin tocar este archivo. La sección se
 * decide con `esEnlaceActivo`, la misma regla con la que la barra resalta su
 * enlace, para que cabecera y barra no puedan contradecirse.
 *
 * EL ENCABEZADO DE SECCIÓN NO ES UN ENLACE, y no por descuido. "SSOMA" y
 * "Catálogos maestros" son solo texto del menú: no existe ninguna ruta
 * `/catalogos-maestros` a la que llevar (convención de AGENTS.md, Bloque 11).
 * Hacerlo clicable obligaría a inventar esa ruta, que es justo el acoplamiento
 * etiqueta/URL que se decidió evitar.
 *
 * La miga de la pantalla es un enlace solo cuando se está en una pantalla hija
 * (/ordenes-trabajo/nueva, /ordenes-trabajo/x/editar): ahí lleva de vuelta al
 * listado. En la propia pantalla es texto con `aria-current="page"`, porque un
 * enlace a donde ya se está no lleva a ninguna parte. Las pantallas hijas no
 * añaden una miga propia: su nombre no está en `MENU` y no se inventa aquí.
 *
 * Hecho con Tailwind y no con el `breadcrumb` de shadcn porque ese componente
 * no está instalado (y el registro de shadcn no era accesible desde el entorno
 * en que se construyó esto). Es una lista ordenada con separadores y nada más;
 * si se instala `breadcrumb`, este es el sitio a cambiar.
 */
export function MigasDePan({
  ocultarCrm,
}: {
  /**
   * TEMPORAL: ver core/visibilidad-crm.ts. Sin esto, el 404 de /contactos
   * mostraría encima «CRM › Contactos» a quien no debe ver ese módulo.
   */
  ocultarCrm: boolean;
}) {
  const pathname = usePathname();

  for (const seccion of menuVisible(ocultarCrm)) {
    const enlace = seccion.enlaces.find(({ href }) =>
      esEnlaceActivo(pathname, href),
    );
    if (!enlace) continue;

    const enPantalla = pathname === enlace.href;

    return (
      <nav aria-label="Migas de pan" className="min-w-0">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          {seccion.encabezado ? (
            <>
              {/* En móvil se omite el grupo: la cabecera es angosta y lo que
                  orienta es el nombre de la pantalla. */}
              <li className="hidden truncate sm:block">{seccion.encabezado}</li>
              <li aria-hidden className="hidden sm:block">
                <ChevronRightIcon className="size-3.5" />
              </li>
            </>
          ) : null}
          <li className="truncate">
            {enPantalla ? (
              <span aria-current="page" className="font-medium text-foreground">
                {enlace.etiqueta}
              </span>
            ) : (
              <Link
                href={enlace.href}
                className="transition-colors hover:text-foreground"
              >
                {enlace.etiqueta}
              </Link>
            )}
          </li>
        </ol>
      </nav>
    );
  }

  // Una ruta que no está en el menú (no debería haber ninguna dentro del
  // layout protegido) se queda sin migas antes que con unas inventadas.
  return null;
}
