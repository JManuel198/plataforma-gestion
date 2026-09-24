"use client";

import { useEffect, useRef, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MensajeError } from "@/core/components/mensaje-error";

/** El tope confirmado. También lo valida el servidor (ver ../schema.ts). */
const MAXIMO = 3;

/**
 * Una línea del editor.
 *
 * `guardada` distingue las dos formas de quitar una característica, que es la
 * única diferencia de comportamiento entre ellas:
 *
 * - `false` — se está escribiendo ahora mismo (alta, o una añadida durante
 *   esta edición). Quitarla es inmediato: no hay nada real que perder.
 * - `true` — ya existe en la base porque venía cargada al abrir el modal.
 *   Quitarla pide confirmación, y lo que se confirma es solo marcarla como
 *   quitada AQUÍ: el DELETE contra la base lo hace la Server Action cuando se
 *   guarda el modal entero. Si el usuario cierra sin guardar, la fila sigue
 *   intacta.
 *
 * El dato no necesita el `id` de la fila: el servidor reescribe la lista
 * completa del material dentro de la transacción del guardado, así que lo
 * único que viaja es el texto y su posición (ver `editarMaterialEnModal`).
 */
type Linea = { texto: string; guardada: boolean };

/**
 * Las características técnicas de un material, dentro del formulario del modal.
 *
 * ES ESPECÍFICO DE MATERIALES, a propósito: vive en este módulo y NO en
 * `core/`, y no está documentado en la skill de convenciones como patrón a
 * heredar. Los demás catálogos no tienen nada parecido y no deben copiarlo sin
 * que alguien lo pida — a diferencia de la fila clicable, que sí es estándar.
 *
 * CÓMO SE CUENTA CUÁNTOS CAMPOS SE VEN, que es toda la lógica de aquí:
 *
 * Se ven las líneas activas más UN "fantasma" —un campo deshabilitado con un
 * "+"— mientras el total no llegue a 3. El fantasma es una invitación, no una
 * característica: no se envía, no cuenta, y al pulsarlo se convierte en una
 * línea activa y vacía.
 *
 * La regla de negocio es "las que tienen texto, más un fantasma, mientras el
 * total sea menor a 3", y el estado de reposo cumple eso exactamente. Lo que
 * lo sostiene es el colapso por `blur`: una línea activa que pierde el foco
 * sin nada escrito **se elimina**, así que en cuanto el usuario deja de
 * escribir no quedan líneas vacías contando. Mientras el cursor está dentro de
 * una línea recién abierta sí hay, transitoriamente, una línea vacía además de
 * las llenas — y tiene que ser así, o el campo donde se está a punto de
 * escribir desaparecería bajo el cursor.
 *
 * Al llegar a 3 líneas no se pinta nada más: ni cuarta línea ni fantasma.
 *
 * SOBRE LA PROPAGACIÓN DE CLICS: este componente monta un `AlertDialog`, que
 * se porta a `document.body`. No necesita su propio `SinPropagacion` porque ya
 * viaja dentro del que la fila pone alrededor del modal entero
 * (`fila-material.tsx`) — los eventos de React burbujean por el árbol de
 * componentes, y ese envoltorio está por encima de este componente. Si algún
 * día esto se montara fuera del modal, habría que revisarlo (ver la convención
 * sobre propagación de clics en AGENTS.md).
 */
export function CaracteristicasMaterial({
  iniciales,
  errores,
}: {
  /** Las que ya están guardadas, en su orden de entrada. */
  iniciales: string[];
  /** Errores por campo que devolvió el servidor, ya aplanados con Zod. */
  errores?: string[];
}) {
  const [lineas, setLineas] = useState<Linea[]>(() =>
    iniciales.map((texto) => ({ texto, guardada: true })),
  );
  // Un material que ya tiene características se abre con ellas a la vista: el
  // botón sería un paso de más para algo que ya está ahí. Solo se empieza
  // cerrado cuando no hay ninguna.
  const [abierto, setAbierto] = useState(iniciales.length > 0);
  // Índice de la línea guardada que se está quitando, o `null`. Es lo único
  // que distingue "el usuario pulsó la equis" de "el usuario lo confirmó".
  const [porQuitar, setPorQuitar] = useState<number | null>(null);

  const campos = useRef<(HTMLInputElement | null)[]>([]);
  // Qué campo enfocar después del próximo render. Es un ref y no estado
  // porque no debe provocar un render por sí mismo — solo acompaña al que ya
  // dispara `setLineas`.
  const aEnfocar = useRef<number | null>(null);

  // Enfocar no es estado derivado, es un efecto sobre el DOM: hay que esperar
  // a que el campo nuevo exista. Sin `setState` dentro, así que no choca con
  // `react-hooks/set-state-in-effect` (la regla que ya obligó a `useTransition`
  // en los modales de este proyecto).
  useEffect(() => {
    if (aEnfocar.current === null) return;

    campos.current[aEnfocar.current]?.focus();
    aEnfocar.current = null;
  });

  const hayFantasma = lineas.length < MAXIMO;

  function abrir() {
    setAbierto(true);
    setLineas([{ texto: "", guardada: false }]);
    aEnfocar.current = 0;
  }

  /** El fantasma se convierte en una línea activa y vacía. */
  function activarFantasma() {
    aEnfocar.current = lineas.length;
    setLineas((previas) => [...previas, { texto: "", guardada: false }]);
  }

  function escribir(indice: number, texto: string) {
    setLineas((previas) =>
      previas.map((linea, i) => (i === indice ? { ...linea, texto } : linea)),
    );
  }

  function quitar(indice: number) {
    setLineas((previas) => previas.filter((_, i) => i !== indice));
  }

  /**
   * Una línea que pierde el foco sin nada escrito no cuenta: se elimina y el
   * fantasma vuelve a ocupar su sitio. Es lo que hace que abrir un campo y
   * arrepentirse no deje rastro ni revele un slot de más.
   *
   * Solo aplica a las que no están guardadas: vaciar una guardada y salir del
   * campo NO la borra sola — para eso está la equis, con su confirmación.
   */
  function alSalir(indice: number) {
    const linea = lineas[indice];

    if (!linea || linea.guardada || linea.texto.trim() !== "") return;

    quitar(indice);
  }

  if (!abierto) {
    return (
      <div className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={abrir}>
          <PlusIcon />
          Agregar características técnicas
        </Button>
        <MensajeError errores={errores} />
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="caracteristica-0">Características técnicas</Label>

      <div className="space-y-2">
        {lineas.map((linea, indice) => (
          <div key={indice} className="flex items-center gap-2">
            {/* El `name` SOLO cuando hay texto: así un campo abierto y todavía
                vacío no viaja en el envío, y el servidor nunca ve una cadena
                vacía que tendría que rechazar. Es la otra mitad de la garantía
                del Zod, que también lo rechaza por si llega un POST directo. */}
            <Input
              id={`caracteristica-${indice}`}
              ref={(elemento) => {
                campos.current[indice] = elemento;
              }}
              name={linea.texto.trim() ? "caracteristicas" : undefined}
              value={linea.texto}
              onChange={(evento) => escribir(indice, evento.target.value)}
              onBlur={() => alSalir(indice)}
              placeholder={`Característica ${indice + 1}`}
              aria-invalid={Boolean(errores?.length)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Quitar"
              onClick={() =>
                linea.guardada ? setPorQuitar(indice) : quitar(indice)
              }
            >
              <XIcon />
              <span className="sr-only">
                Quitar característica {indice + 1}
              </span>
            </Button>
          </div>
        ))}

        {/* El fantasma: visible, deshabilitado y con un "+". No lleva `name`
            —no podría enviarse aunque lo llevara, los campos deshabilitados no
            se envían— y no es una línea del estado: existe solo como
            invitación. El botón de al lado es lo que se pulsa; el input está
            ahí para que se vea el hueco que va a ocupar. */}
        {hayFantasma ? (
          <div className="flex items-center gap-2">
            <Input
              value=""
              readOnly
              disabled
              placeholder={`Característica ${lineas.length + 1}`}
              tabIndex={-1}
              // El input fantasma no es un control real: quien navega con
              // teclado o lector de pantalla llega al botón de al lado, que sí
              // dice lo que hace.
              aria-hidden
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Agregar otra característica"
              onClick={activarFantasma}
            >
              <PlusIcon />
              <span className="sr-only">Agregar otra característica</span>
            </Button>
          </div>
        ) : null}
      </div>

      <MensajeError errores={errores} />

      {/* Quitar una característica YA GUARDADA se confirma; quitar una que se
          está escribiendo ahora, no. Mismo criterio asimétrico que inactivar
          frente a reactivar en el listado: se pone un aviso delante de lo que
          destruye algo, y no delante de lo que no, para que el aviso siga
          significando algo.

          Lo que confirma este diálogo es solo sacarla del formulario. El
          DELETE contra la base ocurre al guardar el modal, con el resto de los
          cambios — si se cierra sin guardar, la característica sigue ahí. */}
      <AlertDialog
        open={porQuitar !== null}
        onOpenChange={(abriendo) => {
          if (!abriendo) setPorQuitar(null);
        }}
      >
        {porQuitar !== null ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Quitar esta característica?</AlertDialogTitle>
              <AlertDialogDescription>
                «{lineas[porQuitar]?.texto}» se eliminará del material cuando
                guardes los cambios. Si cierras el modal sin guardar, se queda
                como está.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  const indice = porQuitar;
                  setPorQuitar(null);
                  quitar(indice);
                }}
              >
                Quitar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </div>
  );
}
