"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CalendarIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MensajeError } from "@/core/components/mensaje-error";
import {
  actualizarOportunidad,
  listarContactosParaSelectorAction,
} from "../actions";
import type { ContactoSeleccionable } from "../queries";
import { BotonAccionFila } from "@/core/components/boton-accion-fila";
import { DialogoAccion } from "./dialogo-accion";

// Los tres lápices de "Información general" (sección 7 de la spec). Cada uno
// manda a `actualizarOportunidad` SOLO la clave de su campo; la acción
// compara con el valor actual, escribe la entrada `edicion` del historial si
// cambió de verdad y no hace nada si no (sección 4). Solo se montan con la
// oportunidad abierta: cerrada, los lápices se ocultan (sección 7), y la
// acción la rechaza igual si llega de una pestaña desactualizada.
//
// Cada lápiz abre un `DialogoAccion` (el diálogo común del detalle). El
// formulario manda SOLO la clave de su campo: en `oportunidadEditarSchema` una
// clave ausente es "no se toca", así que editar la fecha nunca borra el
// contacto.

/** El valor de un campo del formulario como texto ("" si no viene). */
function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}

/** El lápiz (o el calendario) que abre la edición de un campo. */
function lapiz(etiqueta: string, icono: ReactNode) {
  return function Disparador(abrir: () => void) {
    return (
      <BotonAccionFila etiqueta={etiqueta} onClick={abrir}>
        {icono}
      </BotonAccionFila>
    );
  };
}

/** Título: obligatorio, hasta 200 caracteres (lo valida el servidor). */
export function EditarTitulo({ id, titulo }: { id: string; titulo: string }) {
  return (
    <DialogoAccion
      disparador={lapiz("Editar título", <PencilIcon />)}
      titulo="Editar título"
      accion={(formData) => actualizarOportunidad(id, formData)}
      exito="Título actualizado."
      // El servidor recorta los espacios (Zod `.trim()`): "Título " es el mismo.
      sinCambios={(formData) => texto(formData, "titulo").trim() === titulo}
      campos={({ errores }) => (
        <div className="space-y-2">
          <Label htmlFor="titulo">Título</Label>
          <Input
            id="titulo"
            name="titulo"
            defaultValue={titulo}
            required
            autoFocus
            aria-invalid={Boolean(errores.titulo)}
          />
          <MensajeError errores={errores.titulo} />
        </div>
      )}
    />
  );
}

/**
 * Fecha estimada de cierre: `<input type="date">` (envía `YYYY-MM-DD`, lo que
 * guarda la columna `date`). Puede quedar vacía [por defecto en la spec]:
 * "Quitar fecha" manda la clave vacía, que el servidor guarda como `null`.
 */
export function EditarFechaCierre({
  id,
  fecha,
}: {
  id: string;
  fecha: string | null;
}) {
  return (
    <DialogoAccion
      disparador={lapiz("Cambiar fecha estimada de cierre", <CalendarIcon />)}
      titulo="Fecha estimada de cierre"
      descripcion="Opcional: puedes dejar la oportunidad sin fecha."
      accion={(formData) => actualizarOportunidad(id, formData)}
      exito="Fecha estimada de cierre actualizada."
      // Vacío = sin fecha, igual que en el servidor.
      sinCambios={(formData) =>
        (texto(formData, "fecha_cierre_estimada") || null) === fecha
      }
      campos={({ errores, enviar, pendiente }) => (
        <div className="space-y-2">
          <Label htmlFor="fecha_cierre_estimada">
            Fecha estimada de cierre
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="fecha_cierre_estimada"
              name="fecha_cierre_estimada"
              type="date"
              defaultValue={fecha ?? ""}
              className="sm:max-w-56"
              aria-invalid={Boolean(errores.fecha_cierre_estimada)}
            />
            {fecha ? (
              <Button
                type="button"
                variant="ghost"
                disabled={pendiente}
                onClick={() => {
                  const formData = new FormData();
                  formData.set("fecha_cierre_estimada", "");
                  enviar(formData);
                }}
              >
                Quitar fecha
              </Button>
            ) : null}
          </div>
          <MensajeError errores={errores.fecha_cierre_estimada} />
        </div>
      )}
    />
  );
}

/**
 * Contacto: el mismo selector que el modal de creación —los contactos
 * ACTIVOS de la empresa de la oportunidad, que no cambia nunca, más "Sin
 * contacto" para quitarlo (sección 3)—. La lista la trae
 * `listarContactosParaSelectorAction`; que el elegido siga activo y sea de
 * esa empresa lo vuelve a comprobar la acción al guardar.
 */
export function EditarContacto({
  id,
  empresaId,
  contactoActual,
}: {
  id: string;
  empresaId: string;
  /** El contacto asignado hoy; `activo: false` si se dio de baja después. */
  contactoActual: { id: string; nombre: string; activo: boolean } | null;
}) {
  return (
    <DialogoAccion
      disparador={lapiz("Cambiar contacto", <PencilIcon />)}
      titulo="Contacto"
      descripcion="Contactos activos de la empresa de la oportunidad."
      accion={(formData) => actualizarOportunidad(id, formData)}
      exito="Contacto actualizado."
      // Vacío = sin contacto, igual que en el servidor.
      sinCambios={(formData) =>
        (texto(formData, "contacto_id") || null) ===
        (contactoActual?.id ?? null)
      }
      campos={({ errores }) => (
        <SelectorContacto
          empresaId={empresaId}
          contactoActual={contactoActual}
          errores={errores}
        />
      )}
    />
  );
}

type EstadoContactos =
  | { tipo: "cargando" }
  | { tipo: "error" }
  | { tipo: "listo"; contactos: ContactoSeleccionable[] };

/**
 * Se monta al abrir el diálogo y pide la lista una vez. Controlado, como el
 * del modal de creación: el valor viaja en un input oculto propio, vacío =
 * sin contacto.
 *
 * Si el contacto actual se dio de baja, no está en la lista de activos: se
 * añade como opción propia, marcada "(de baja)", para que el selector muestre
 * lo que la oportunidad tiene de verdad en vez de "Sin contacto". Dejarlo
 * elegido no cambia nada (la acción no escribe si el valor es el mismo);
 * elegir otro o "Sin contacto" sí.
 */
function SelectorContacto({
  empresaId,
  contactoActual,
  errores,
}: {
  empresaId: string;
  contactoActual: { id: string; nombre: string; activo: boolean } | null;
  errores: Record<string, string[] | undefined>;
}) {
  const [estado, setEstado] = useState<EstadoContactos>({ tipo: "cargando" });
  const [contactoId, setContactoId] = useState<string | null>(
    contactoActual?.id ?? null,
  );

  // Una sola carga por apertura: el componente se monta al abrir el diálogo y
  // se desmonta al cerrarlo. Los `setEstado` ocurren al volver la promesa, no
  // en el cuerpo del efecto. `vigente` descarta la respuesta si el diálogo se
  // cerró antes de que llegara.
  useEffect(() => {
    let vigente = true;

    listarContactosParaSelectorAction(empresaId)
      .then((contactos) => {
        if (vigente) setEstado({ tipo: "listo", contactos });
      })
      .catch((error: unknown) => {
        if (!vigente) return;
        // El fallo se enseña: una lista vacía por un error de red se leería
        // como "esta empresa no tiene contactos".
        console.error(
          "[Oportunidades] no se pudieron cargar los contactos",
          error,
        );
        setEstado({ tipo: "error" });
      });

    return () => {
      vigente = false;
    };
  }, [empresaId]);

  const activos = estado.tipo === "listo" ? estado.contactos : [];
  const actualDeBaja =
    contactoActual && !activos.some((c) => c.id === contactoActual.id)
      ? contactoActual
      : null;

  const opciones = [
    { value: null as string | null, label: "Sin contacto" },
    ...(actualDeBaja
      ? [{ value: actualDeBaja.id, label: `${actualDeBaja.nombre} (de baja)` }]
      : []),
    ...activos.map((c) => ({ value: c.id, label: c.nombre })),
  ];

  return (
    <div className="space-y-2">
      <Label htmlFor="contacto">Contacto</Label>
      <input type="hidden" name="contacto_id" value={contactoId ?? ""} />
      <Select
        // Se monta de nuevo cuando llega la lista: así arranca con sus
        // opciones y el valor actual, sin cambiar sus `items` bajo un Select
        // ya montado.
        key={estado.tipo}
        value={contactoId}
        onValueChange={(valor) => setContactoId(valor as string | null)}
        items={opciones}
        disabled={estado.tipo !== "listo"}
      >
        <SelectTrigger
          id="contacto"
          className="w-full"
          aria-invalid={Boolean(errores.contacto_id)}
        >
          <SelectValue
            placeholder={
              estado.tipo === "cargando"
                ? "Cargando contactos…"
                : "Sin contacto"
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>Sin contacto</SelectItem>
          {actualDeBaja ? (
            <SelectItem value={actualDeBaja.id}>
              {actualDeBaja.nombre}
              <span className="text-muted-foreground"> (de baja)</span>
            </SelectItem>
          ) : null}
          {activos.map((contacto) => (
            <SelectItem key={contacto.id} value={contacto.id}>
              {contacto.nombre}
              {contacto.cargo ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {contacto.cargo}
                </span>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {estado.tipo === "error" ? (
        <p className="text-xs text-destructive" role="alert">
          No se pudieron cargar los contactos. Cierra y vuelve a abrir para
          reintentar.
        </p>
      ) : null}
      {estado.tipo === "listo" && activos.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          La empresa no tiene contactos activos.
        </p>
      ) : null}
      <MensajeError errores={errores.contacto_id} />
    </div>
  );
}
