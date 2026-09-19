"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actualizarEstadoOrdenTrabajo } from "../actions";
import { ESTADOS_OT, type EstadoOt } from "../constantes";

/**
 * Un tono distinto por estado: con seis, dos que compartan variante dejan
 * de comunicar nada. El eje es cuánto peso visual merece cada punto del
 * ciclo, y `Facturado` no puede compartir tono con `Finalizada` — una es el
 * cierre técnico (el trabajo terminó) y la otra el cierre comercial (se
 * cobró), que es justo la distinción que el listado tiene que dejar ver.
 *
 * `dashed` y `success` se agregaron a components/ui/badge.tsx para esto: el
 * tema es monocromo (solo `destructive` tenía color), así que seis rellenos
 * de gris distinguibles no existían. `Pausada` pasa a distinguirse por
 * trazo punteado — lo interrumpido se lee mejor así que como un gris más — y
 * `Facturado` estrena el token `--success`, con el mismo patrón de tinte que
 * `destructive`.
 *
 * Vive aquí y ya no en tabla-ordenes-trabajo.tsx porque la celda dejó de ser
 * un Badge suelto: el color ahora se pinta dentro del disparador del Select,
 * que es lo único que queda de aquella celda.
 */
const variantePorEstado: Record<
  EstadoOt,
  "default" | "secondary" | "outline" | "destructive" | "dashed" | "success"
> = {
  Pendiente: "outline",
  "En ejecución": "default",
  Pausada: "dashed",
  Finalizada: "secondary",
  Facturado: "success",
  Cancelada: "destructive",
};

/**
 * Los dos estados que se confirman antes de aplicarse.
 *
 * Son los dos finales del ciclo, y los únicos que significan algo fuera de
 * esta pantalla: `Facturado` afirma que la OT ya se cobró y `Cancelada` la
 * cierra sin ejecutarla. Los otros cuatro son pasos del trabajo en curso —
 * moverse entre `Pendiente`, `En ejecución`, `Pausada` y `Finalizada` es
 * rutina diaria, y pedir confirmación en cada uno entrenaría al usuario a
 * aceptar sin leer, que es justo lo que haría inútil el aviso de estos dos.
 *
 * Ojo: esto es una defensa contra el clic accidental, no una regla de
 * negocio. Ninguno de los dos estados es irreversible hoy (supuesto 11 de
 * docs/spec/preguntas-abiertas.md: se permite cualquier transición), y la
 * Server Action no restringe nada. Si el negocio confirma que sí deben serlo,
 * la prohibición va en `actualizarEstadoOrdenTrabajo`, no aquí.
 */
const ESTADOS_A_CONFIRMAR: readonly EstadoOt[] = ["Facturado", "Cancelada"];

const opciones = ESTADOS_OT.map((estado) => ({
  label: estado,
  value: estado,
}));

/**
 * La celda de estado del listado: un Select que cambia el estado de esa OT sin
 * pasar por el formulario de edición.
 *
 * Llama a `actualizarEstadoOrdenTrabajo`, que escribe solo la columna
 * `estado` — no a `editarOrdenTrabajo`, que guarda el formulario entero y
 * desde aquí sobrescribiría campos que esta pantalla ni siquiera tiene.
 *
 * `useOptimistic` pinta el estado nuevo en cuanto se aplica y lo revierte solo
 * si la acción falla, así que no hay parpadeo mientras el servidor responde.
 * Al terminar, `router.refresh()` vuelve a pedir los Server Components de la
 * pantalla: la fila queda con el dato real de la base de datos, sin recargar
 * la página ni perder los filtros de la URL.
 *
 * Elegir `Facturado` o `Cancelada` no aplica nada todavía: abre un
 * AlertDialog y espera. Lo que hace posible revertirlo es que el Select está
 * **controlado** por `value`: en Base UI, `useControlled` ignora el setter
 * interno mientras `value` venga de fuera (`SelectRoot.js` → `useControlled`),
 * así que lo que se ve es siempre el estado confirmado y nunca el elegido.
 * Además `detalles.cancel()` le dice a Base UI que no aplique el cambio —
 * `setValue` lo comprueba antes de tocar su estado (`SelectRoot.js`), y el
 * cierre del desplegable no se ve afectado porque `SelectItem` crea un objeto
 * de evento distinto para `setValue` y para `setOpen`.
 */
export function SelectorEstadoFila({
  id,
  codigo,
  estado,
}: {
  id: string;
  /** Solo para el texto accesible y los mensajes: identifica la fila. */
  codigo: string;
  estado: EstadoOt;
}) {
  const router = useRouter();
  const [guardando, iniciarGuardado] = useTransition();
  const [estadoMostrado, mostrarOptimista] = useOptimistic(estado);
  // El estado elegido que todavía no se ha confirmado. `null` = sin diálogo
  // abierto. Es lo único que distingue "lo que el usuario acaba de tocar" de
  // "lo que la OT tiene de verdad"; el Select sigue enseñando lo segundo.
  const [porConfirmar, setPorConfirmar] = useState<EstadoOt | null>(null);

  function aplicarCambio(nuevoEstado: EstadoOt) {
    iniciarGuardado(async () => {
      mostrarOptimista(nuevoEstado);

      const resultado = await actualizarEstadoOrdenTrabajo(id, nuevoEstado);

      if (!resultado.ok) {
        // No hace falta deshacer nada a mano: al terminar la transición,
        // `useOptimistic` vuelve al valor que sigue teniendo la fila.
        toast.error(resultado.mensaje);
        return;
      }

      toast.success(`${codigo}: estado cambiado a ${nuevoEstado}.`);
      router.refresh();
    });
  }

  // `detalles` es el `SelectRootChangeEventDetails` de Base UI; aquí solo se
  // usa `cancel()`, así que se declara ese trozo en vez de importar el tipo de
  // la librería salteándose components/ui/.
  function alElegirEstado(
    valor: string | null,
    detalles: { cancel: () => void },
  ) {
    const nuevoEstado = ESTADOS_OT.find((opcion) => opcion === valor);

    if (!nuevoEstado || nuevoEstado === estadoMostrado) return;

    if (ESTADOS_A_CONFIRMAR.includes(nuevoEstado)) {
      // Nada se envía al servidor todavía: se guarda la intención y se abre el
      // diálogo. Si el usuario cancela, no hay nada que revertir porque nunca
      // llegó a cambiar nada.
      detalles.cancel();
      setPorConfirmar(nuevoEstado);
      return;
    }

    aplicarCambio(nuevoEstado);
  }

  function confirmar() {
    if (!porConfirmar) return;

    const nuevoEstado = porConfirmar;
    setPorConfirmar(null);
    aplicarCambio(nuevoEstado);
  }

  return (
    <>
      <Select
        value={estadoMostrado}
        onValueChange={alElegirEstado}
        items={opciones}
        disabled={guardando}
      >
        <SelectTrigger
          size="sm"
          className="w-40"
          aria-label={`Estado de ${codigo}`}
        >
          {/* El Badge se conserva dentro del disparador: los seis estados se
              siguen distinguiendo por color, que es lo que hacía legible el
              listado de un vistazo antes de que la celda fuera editable. */}
          <SelectValue>
            {(valor) => (
              <Badge variant={variantePorEstado[valor as EstadoOt]}>
                {valor as EstadoOt}
              </Badge>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ESTADOS_OT.map((opcion) => (
            <SelectItem key={opcion} value={opcion}>
              {opcion}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Cerrar por cualquier vía (botón Cancelar, Escape, clic fuera) es
          exactamente lo mismo: soltar la intención. El Select no se enteró de
          nada, así que vuelve a enseñar el estado confirmado él solo. */}
      <AlertDialog
        open={porConfirmar !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setPorConfirmar(null);
        }}
      >
        {porConfirmar ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {porConfirmar === "Cancelada"
                  ? "¿Cancelar esta orden de trabajo?"
                  : "¿Marcar esta orden como facturada?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {codigo} pasará de {estadoMostrado} a {porConfirmar}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                variant={
                  porConfirmar === "Cancelada" ? "destructive" : "default"
                }
                onClick={confirmar}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </>
  );
}
