import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AvatarIniciales } from "@/core/components/avatar-iniciales";
import { Dato, ListaDatos } from "@/core/vista-detalle";
import { actualizarPerfil } from "@/modules/ajustes-usuario/actions";
import { FormularioPerfil } from "@/modules/ajustes-usuario/components/formulario-perfil";
import { obtenerPerfil } from "@/modules/ajustes-usuario/queries";

export const metadata = { title: "Ajustes de usuario" };

/**
 * Ajustes del usuario en sesión. Hoy solo el perfil; el alcance de cada etapa
 * está en AGENTS.md ("Módulo de ajustes de usuario"). Cuando llegue el cambio
 * de contraseña será otra tarjeta en esta misma página, no otra ruta.
 *
 * Se entra desde el bloque del usuario al pie de la barra lateral.
 */
export default async function PaginaAjustes() {
  const perfil = await obtenerPerfil();

  // Sesión viva pero cuenta borrada por fuera: no hay perfil que editar.
  if (!perfil) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Ajustes de usuario
        </h1>
        <p className="text-sm text-muted-foreground">
          Tus datos de perfil en la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>
            El DNI y el teléfono son opcionales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            {/* El tamaño es el preset `lg` del Avatar de shadcn, sin clases de
                tamaño encima: su variante va con selector de atributo
                (`data-[size=lg]:size-10`), más específico que un `size-14`
                suelto, así que agrandarlo desde fuera no surte efecto. Si
                hiciera falta más grande, es un tamaño nuevo en
                components/ui/avatar.tsx. */}
            <AvatarIniciales nombre={perfil.nombre} size="lg" />
            <p className="min-w-0 truncate text-lg font-medium">
              {perfil.nombre}
            </p>
          </div>

          {/* El correo es la identidad de acceso: se muestra como dato de
              solo lectura, FUERA del formulario (ni siquiera un input
              deshabilitado), y no se puede cambiar desde aquí. */}
          <ListaDatos>
            <Dato
              etiqueta="Correo (no editable)"
              valor={perfil.email}
              className="sm:col-span-2 [&_dd]:break-all"
            />
          </ListaDatos>

          <Separator />

          {/* `key` con los valores guardados: tras `router.refresh()` el
              formulario se REMONTA con los nuevos `defaultValue` en vez de
              recibirlos sobre inputs ya montados, que es lo que hace avisar a
              `useControlled` de Base UI (ver la skill de convenciones,
              "Fila clicable", punto 6). */}
          <FormularioPerfil
            key={`${perfil.nombre}|${perfil.dni ?? ""}|${perfil.telefono ?? ""}`}
            guardarAction={actualizarPerfil}
            perfil={perfil}
          />
        </CardContent>
      </Card>
    </div>
  );
}
