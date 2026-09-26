"use client";

import { useRef, useState, type ReactNode } from "react";
import { LockIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BuscadorSeleccion } from "@/core/components/buscador-seleccion";
import { MensajeError } from "@/core/components/mensaje-error";
import { simboloMoneda } from "@/core/dinero";
import { MONEDAS, type Moneda } from "@/core/monedas";
import type { EmpresaSeleccionable } from "@/core/selector-empresas";
import {
  listarContactosParaSelectorAction,
  listarEmpresasParaSelectorAction,
} from "../actions";
import { ETAPAS_OPORTUNIDAD, ETIQUETAS_ETAPA } from "../constantes";
import type { ContactoSeleccionable } from "../queries";

type Props = {
  /** Errores por campo que devolvió el servidor, ya aplanados con Zod. */
  errores: Record<string, string[] | undefined>;
};

/**
 * La lista de contactos de la empresa elegida, en sus tres estados posibles.
 * `sin-empresa` es el de partida: el campo está deshabilitado hasta elegir
 * empresa (sección 8 de la spec).
 */
type EstadoContactos =
  | { tipo: "sin-empresa" }
  | { tipo: "cargando" }
  | { tipo: "error" }
  | { tipo: "listo"; contactos: ContactoSeleccionable[] };

/**
 * Los campos del modal "Nueva oportunidad", en el orden de la sección 8 de la
 * spec, sin `<form>` ni botones alrededor: el modal pone el envoltorio. Mismo
 * reparto que `CamposContacto`.
 *
 * Solo se usa para CREAR. La edición posterior (título, contacto, fecha) es
 * con lápiz desde el detalle (Parte 10), y empresa, moneda, valor y
 * probabilidad no se editan nunca.
 *
 * NINGUNA VALIDACIÓN VIVE AQUÍ (regla invariable 1). Los `required` y
 * `inputMode` son comodidad; lo que vale es el Zod de `crearOportunidad`, y sus
 * errores llegan por `errores` y se pintan bajo cada campo — también el de un
 * contacto que no es de la empresa elegida, que solo puede comprobar el
 * servidor.
 *
 * ESTADO LOCAL, solo donde hace falta:
 * - La empresa, porque la pinta `BuscadorSeleccion` y de ella depende el
 *   contacto.
 * - El contacto y su lista, porque se vacían cuando cambia la empresa.
 * - La moneda, solo para el símbolo del prefijo del valor.
 * El resto son campos no controlados (`name` + `defaultValue`).
 */
export function CamposOportunidad({ errores }: Props) {
  const [empresa, setEmpresa] = useState<EmpresaSeleccionable | null>(null);
  const [contactos, setContactos] = useState<EstadoContactos>({
    tipo: "sin-empresa",
  });
  const [contactoId, setContactoId] = useState<string | null>(null);
  const [moneda, setMoneda] = useState<Moneda>("USD");
  // Turno de la última carga de contactos: si el usuario cambia de empresa
  // dos veces seguidas, las dos respuestas pueden volver desordenadas, y solo
  // la de la última empresa puede escribir la lista. Mismo criterio que
  // `busqueda-remota.ts`.
  const turno = useRef(0);

  /**
   * Elegir (o quitar) empresa vacía SIEMPRE el contacto y recarga su lista
   * (sección 8: "se vacía si la empresa cambia"). Se hace aquí, en el evento,
   * y no en un efecto que mire la empresa: así no hay un render intermedio con
   * el contacto de la empresa anterior todavía elegido.
   */
  function elegirEmpresa(nueva: EmpresaSeleccionable | null) {
    setEmpresa(nueva);
    setContactoId(null);

    const miTurno = ++turno.current;

    if (!nueva) {
      setContactos({ tipo: "sin-empresa" });
      return;
    }

    setContactos({ tipo: "cargando" });

    listarContactosParaSelectorAction(nueva.id)
      .then((lista) => {
        if (miTurno !== turno.current) return;
        setContactos({ tipo: "listo", contactos: lista });
      })
      .catch((error: unknown) => {
        if (miTurno !== turno.current) return;
        // El fallo se enseña, no se traga: una lista vacía por un error de red
        // se leería como "esta empresa no tiene contactos".
        console.error("[Oportunidades] no se pudieron cargar los contactos", error);
        setContactos({ tipo: "error" });
      });
  }

  const listaContactos =
    contactos.tipo === "listo" ? contactos.contactos : [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* 1. Código: lo emite el servidor al guardar. Texto deshabilitado y
          sin `name`, como el correlativo del resto de formularios de alta. */}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="codigo">Código</Label>
        <div className="relative">
          <LockIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="codigo"
            value="Se asignará al guardar"
            disabled
            readOnly
            className="pl-8"
          />
        </div>
      </div>

      {/* 2. Título */}
      <Campo id="titulo" etiqueta="Título" errores={errores} ancho>
        <Input
          id="titulo"
          name="titulo"
          placeholder="Ej.: Automatización de línea de envasado"
          required
          aria-invalid={Boolean(errores.titulo)}
        />
      </Campo>

      {/* 3. Empresa: solo activas. La acción pide la variante sin inactivas
          de core/selector-empresas.ts, así que no hace falta `inactivoDe`. */}
      <div className="space-y-2 sm:col-span-2">
        <BuscadorSeleccion
          id="empresa"
          name="empresa_id"
          etiqueta="Empresa"
          placeholder="Buscar empresa..."
          buscarAction={listarEmpresasParaSelectorAction}
          claveDe={(encontrada) => encontrada.id}
          principalDe={(encontrada) => encontrada.razon_social}
          secundarioDe={(encontrada) =>
            encontrada.ruc ? `RUC ${encontrada.ruc}` : "Sin RUC"
          }
          seleccionado={empresa}
          onSeleccionar={elegirEmpresa}
          invalido={Boolean(errores.empresa_id)}
        />
        <MensajeError errores={errores.empresa_id} />
      </div>

      {/* 4. Contacto: opcional, se habilita al elegir empresa. El valor viaja
          en un input oculto propio, vacío = sin contacto (el Zod lo guarda
          como `null`). */}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="contacto">
          Contacto{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <input type="hidden" name="contacto_id" value={contactoId ?? ""} />
        <Select
          // Una lista nueva por empresa: el Select arranca limpio en vez de
          // conservar internamente la opción de la empresa anterior.
          key={empresa?.id ?? "sin-empresa"}
          value={contactoId}
          onValueChange={(valor) => setContactoId(valor as string | null)}
          items={[
            { value: null, label: "Sin contacto" },
            ...listaContactos.map((contacto) => ({
              value: contacto.id,
              label: contacto.nombre,
            })),
          ]}
          disabled={contactos.tipo !== "listo" || listaContactos.length === 0}
        >
          <SelectTrigger
            id="contacto"
            className="w-full"
            aria-invalid={Boolean(errores.contacto_id)}
          >
            <SelectValue placeholder={textoContactoVacio(contactos)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Sin contacto</SelectItem>
            {listaContactos.map((contacto) => (
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
        {contactos.tipo === "sin-empresa" ? (
          <p className="text-xs text-muted-foreground">
            Se habilita al elegir una empresa.
          </p>
        ) : null}
        {contactos.tipo === "error" ? (
          <p className="text-xs text-destructive" role="alert">
            No se pudieron cargar los contactos. Vuelve a elegir la empresa
            para reintentar.
          </p>
        ) : null}
        {contactos.tipo === "listo" && listaContactos.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Esta empresa no tiene contactos activos.
          </p>
        ) : null}
        {/* Aquí cae el rechazo del servidor si el contacto no es de la
            empresa, está de baja o ya no existe (`validarContacto`). */}
        <MensajeError errores={errores.contacto_id} />
      </div>

      {/* 5. Moneda: USD por defecto. */}
      <Campo id="moneda" etiqueta="Moneda" errores={errores}>
        <Select
          name="moneda"
          defaultValue="USD"
          items={MONEDAS.map((unaMoneda) => ({
            label: unaMoneda,
            value: unaMoneda,
          }))}
          // Solo para el símbolo del prefijo del valor; lo que se envía lo
          // pone el input oculto del propio Select.
          onValueChange={(valor) => setMoneda(valor as Moneda)}
        >
          <SelectTrigger
            id="moneda"
            className="w-full"
            aria-invalid={Boolean(errores.moneda)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONEDAS.map((unaMoneda) => (
              <SelectItem key={unaMoneda} value={unaMoneda}>
                {unaMoneda}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>

      {/* 6. Valor estimado: por defecto 0. El usuario escribe un monto normal
          ("150.50") y el servidor lo convierte a céntimos (regla 2). */}
      <Campo id="valor_estimado" etiqueta="Valor estimado" errores={errores}>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground"
          >
            {simboloMoneda(moneda)}
          </span>
          <Input
            id="valor_estimado"
            name="valor_estimado"
            inputMode="decimal"
            defaultValue="0"
            // El prefijo es más ancho con "US$" que con "S/".
            className={
              simboloMoneda(moneda).length > 2
                ? "pl-12 font-mono"
                : "pl-8 font-mono"
            }
            aria-invalid={Boolean(errores.valor_estimado)}
          />
        </div>
      </Campo>

      {/* 7. Probabilidad: entero de 0 a 100, por defecto 0. */}
      <Campo id="probabilidad" etiqueta="Probabilidad %" errores={errores}>
        <div className="relative">
          <Input
            id="probabilidad"
            name="probabilidad"
            inputMode="numeric"
            defaultValue="0"
            placeholder="0 – 100"
            className="pr-8 font-mono"
            aria-invalid={Boolean(errores.probabilidad)}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground"
          >
            %
          </span>
        </div>
      </Campo>

      {/* 8. Etapa inicial: cualquiera de las seis, Prospecto por defecto. */}
      <Campo id="etapa" etiqueta="Etapa inicial" errores={errores}>
        <Select
          name="etapa"
          defaultValue="prospecto"
          items={ETAPAS_OPORTUNIDAD.map((etapa) => ({
            label: ETIQUETAS_ETAPA[etapa],
            value: etapa,
          }))}
        >
          <SelectTrigger
            id="etapa"
            className="w-full"
            aria-invalid={Boolean(errores.etapa)}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ETAPAS_OPORTUNIDAD.map((etapa) => (
              <SelectItem key={etapa} value={etapa}>
                {ETIQUETAS_ETAPA[etapa]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>

      {/* 9. Fecha estimada de cierre: opcional. `type="date"` envía
          `YYYY-MM-DD`, que es lo que guarda la columna `date`. */}
      <Campo
        id="fecha_cierre_estimada"
        etiqueta="Fecha estimada de cierre"
        opcional
        errores={errores}
      >
        <Input
          id="fecha_cierre_estimada"
          name="fecha_cierre_estimada"
          type="date"
          className="sm:max-w-56"
          aria-invalid={Boolean(errores.fecha_cierre_estimada)}
        />
      </Campo>
    </div>
  );
}

function textoContactoVacio(estado: EstadoContactos): string {
  switch (estado.tipo) {
    case "sin-empresa":
      return "Primero elige una empresa";
    case "cargando":
      return "Cargando contactos…";
    case "error":
      return "Sin contacto";
    case "listo":
      return estado.contactos.length === 0
        ? "Sin contactos activos"
        : "Sin contacto";
  }
}

function Campo({
  id,
  etiqueta,
  errores,
  ancho = false,
  opcional = false,
  children,
}: {
  id: string;
  etiqueta: string;
  errores: Record<string, string[] | undefined>;
  /** Ocupa las dos columnas. */
  ancho?: boolean;
  opcional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={ancho ? "space-y-2 sm:col-span-2" : "space-y-2"}>
      <Label htmlFor={id}>
        {etiqueta}
        {opcional ? (
          <span className="font-normal text-muted-foreground">
            {" "}
            (opcional)
          </span>
        ) : null}
      </Label>
      {children}
      <MensajeError errores={errores[id]} />
    </div>
  );
}
