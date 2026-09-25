"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { SearchIcon } from "lucide-react";
import { esRedireccionDeNext } from "@/lib/redireccion";
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
import { consultarRuc } from "../actions";
import {
  ETIQUETAS_TIPO_EMPRESA,
  PATRON_RUC,
  TIPOS_EMPRESA,
} from "../constantes";
import type { DatosRuc, ResultadoConsultaRuc } from "../decolecta";
import { PAIS_POR_DEFECTO } from "../paises";
import type { FilaEmpresa } from "../queries";
import { CampoPais } from "./campo-pais";

type Props = {
  /** Errores por campo que devolvió el servidor, ya aplanados con Zod. */
  errores: Record<string, string[] | undefined>;
  /** Empresa existente: se está editando. */
  empresa?: FilaEmpresa;
};

/**
 * Los valores con los que arrancan los campos, como texto (lo que lleva un
 * input). Sale de la empresa al editar, y del propio formulario tras una
 * consulta de RUC (ver `aplicarConsulta`).
 */
type Valores = Record<string, string>;

function valoresDe(empresa?: FilaEmpresa): Valores {
  if (!empresa) return { pais: PAIS_POR_DEFECTO };

  const valores: Valores = {};
  for (const [clave, valor] of Object.entries(empresa)) {
    if (typeof valor === "string") valores[clave] = valor;
  }
  return valores;
}

/**
 * Los campos que la consulta de RUC puede escribir y que el usuario puede
 * seguir editando después. Si SUNAT no trae un valor para uno (`null`), lo que
 * hubiera en el campo se queda: "sin dato" no es un dato que deba borrar lo
 * que el usuario tecleó. Nombre comercial está aquí aunque Decolecta hoy
 * nunca lo devuelva (ver decolecta.ts): si algún día lo trae, se aplica solo.
 */
const EDITABLES_DESDE_SUNAT = [
  "razon_social",
  "nombre_comercial",
  "tipo_contribuyente",
  "descripcion_rubro",
  "direccion",
  "distrito",
  "provincia",
  "departamento",
] as const satisfies readonly (keyof DatosRuc)[];

/**
 * Los dos campos de solo lectura que SOLO llena la consulta. Van siempre con
 * lo que diga SUNAT, también si es `null`: describen el RUC recién consultado,
 * y dejar el estado de una consulta anterior junto a otro RUC sería peor que
 * dejarlos vacíos.
 */
const SOLO_SUNAT = ["estado", "condicion"] as const satisfies readonly (keyof DatosRuc)[];

/**
 * Lo que queda en el formulario tras una consulta con éxito. Parte de lo que
 * el formulario tiene AHORA (leído del DOM, no del estado inicial), así que
 * RUC, tipo, país, nombre corto y todo lo que SUNAT no toca se conserva tal
 * cual. Sobre eso, los datos de SUNAT pisan sin preguntar: son más fiables que
 * lo tecleado antes de consultar (decisión del encargo, Parte 4).
 */
function aplicarConsulta(actuales: Valores, datos: DatosRuc): Valores {
  const resultado = { ...actuales };

  for (const campo of EDITABLES_DESDE_SUNAT) {
    const valor = datos[campo];
    if (valor !== null) resultado[campo] = valor;
  }
  for (const campo of SOLO_SUNAT) {
    resultado[campo] = datos[campo] ?? "";
  }

  return resultado;
}

const MENSAJE_CONSULTA_FALLIDA =
  "No se pudo consultar SUNAT en este momento. Intenta de nuevo en unos minutos o llena los datos a mano.";

/**
 * Los campos de una empresa, sin `<form>` ni botones de guardar alrededor.
 * Mismo reparto que `CamposPersona`: el modal decide cómo se envía y qué pasa
 * después; aquí solo viven los campos.
 *
 * CAMPOS NO CONTROLADOS, COMO EN EL RESTO DEL PROYECTO, TAMBIÉN CON LA
 * CONSULTA DE RUC. Rellenar desde SUNAT no convierte cada input en
 * controlado: al volver la consulta se lee lo que el formulario tiene en ese
 * momento (`new FormData(form)`), se le aplican los datos de SUNAT y se
 * VUELVEN A MONTAR los campos con esos valores como `defaultValue` (cambia la
 * `key`). Así lo que el usuario escribió en los campos que SUNAT no toca
 * sobrevive, los campos siguen siendo editables después, y el `Select` y el
 * combobox de Base UI arrancan limpios con su nuevo valor en vez de avisar de
 * un `defaultValue` que cambia bajo un componente montado.
 *
 * El RUC es la única excepción parcial: su texto se copia a un estado en cada
 * `onChange`, pero solo para habilitar el botón (11 dígitos) y para descartar
 * una respuesta que llegue cuando el RUC ya cambió. Lo que se envía sigue
 * saliendo del DOM.
 */
export function CamposEmpresa({ empresa, errores }: Props) {
  const [valores, setValores] = useState<Valores>(() => valoresDe(empresa));
  const [version, setVersion] = useState(0);
  const [ruc, setRuc] = useState(valores.ruc ?? "");
  // La misma cifra que `ruc`, pero legible dentro de la transición sin
  // quedarse con el valor del render en que empezó.
  const rucActual = useRef(ruc);
  const [consulta, setConsulta] = useState<{
    ok: boolean;
    mensaje: string;
  } | null>(null);
  const [consultando, iniciarConsulta] = useTransition();

  // Mismo patrón que el Zod del servidor (`PATRON_RUC`), para que el botón no
  // se habilite con algo que el servidor rechazaría por formato.
  const rucCompleto = PATRON_RUC.test(ruc.trim());

  function consultar(formulario: HTMLFormElement | null) {
    if (!formulario) return;

    const rucPedido = ruc.trim();
    setConsulta(null);

    iniciarConsulta(async () => {
      let resultado: ResultadoConsultaRuc;

      try {
        resultado = await consultarRuc(rucPedido);
      } catch (error) {
        // El `redirect()` a /login de `exigirSesion()` es navegación.
        if (esRedireccionDeNext(error)) throw error;

        console.error("[Clientes] fallo inesperado al consultar el RUC", error);
        resultado = {
          ok: false,
          motivo: "falla_api",
          mensaje: MENSAJE_CONSULTA_FALLIDA,
        };
      }

      // El usuario cambió el RUC mientras se consultaba: esta respuesta es de
      // otro número y no debe rellenar nada.
      if (rucActual.current.trim() !== rucPedido) return;

      if (!resultado.ok) {
        // Los tres motivos traen su propio mensaje desde el servidor
        // (formato, no encontrado, falla de la API). No se bloquea nada: el
        // formulario sigue entero para llenarlo a mano.
        setConsulta({ ok: false, mensaje: resultado.mensaje });
        return;
      }

      const actuales: Valores = {};
      for (const [clave, valor] of new FormData(formulario)) {
        if (typeof valor === "string") actuales[clave] = valor;
      }

      setValores(aplicarConsulta(actuales, resultado.datos));
      setVersion((anterior) => anterior + 1);
      setConsulta({
        ok: true,
        mensaje:
          "Datos cargados desde SUNAT. Revísalos y corrígelos si hace falta antes de guardar.",
      });
    });
  }

  return (
    <div key={version} className="grid gap-4 sm:grid-cols-2">
      <Campo id="razon_social" etiqueta="Razón social" errores={errores} ancho>
        <Input
          id="razon_social"
          name="razon_social"
          defaultValue={valores.razon_social ?? ""}
          required
          aria-invalid={Boolean(errores.razon_social)}
        />
      </Campo>

      <Campo id="nombre_comercial" etiqueta="Nombre comercial" errores={errores}>
        <Input
          id="nombre_comercial"
          name="nombre_comercial"
          defaultValue={valores.nombre_comercial ?? ""}
          aria-invalid={Boolean(errores.nombre_comercial)}
        />
      </Campo>

      <Campo id="nombre_corto" etiqueta="Nombre corto" errores={errores}>
        <Input
          id="nombre_corto"
          name="nombre_corto"
          defaultValue={valores.nombre_corto ?? ""}
          aria-invalid={Boolean(errores.nombre_corto)}
        />
      </Campo>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="ruc">RUC</Label>
        <div className="flex gap-2">
          {/* Texto y no número: el RUC es un identificador. La comprobación
              real de los 11 dígitos es la del servidor (`rucSchema`). */}
          <Input
            id="ruc"
            name="ruc"
            inputMode="numeric"
            maxLength={11}
            placeholder="11 dígitos"
            defaultValue={valores.ruc ?? ""}
            onChange={(evento) => {
              rucActual.current = evento.target.value;
              setRuc(evento.target.value);
              setConsulta(null);
            }}
            aria-invalid={Boolean(errores.ruc)}
            aria-describedby="ruc-consulta"
          />
          <Button
            type="button"
            variant="outline"
            disabled={!rucCompleto || consultando}
            onClick={(evento) => consultar(evento.currentTarget.form)}
          >
            <SearchIcon />
            {consultando ? "Consultando…" : "Consultar RUC"}
          </Button>
        </div>
        <MensajeError errores={errores.ruc} />
        {/* Una región viva para que un lector de pantalla anuncie el
            resultado de la consulta, que llega sin que cambie el foco. */}
        <div id="ruc-consulta" aria-live="polite">
          {consulta && !consulta.ok ? (
            <MensajeError errores={[consulta.mensaje]} />
          ) : null}
          {consulta?.ok ? (
            <p className="text-sm text-muted-foreground">{consulta.mensaje}</p>
          ) : null}
        </div>
      </div>

      {/* Campo automático: se muestra y no se escribe. Sin `name`, así que
          no viaja en el FormData — y aunque alguien lo añadiera a mano, el
          Zod no declara `codigo` y lo descartaría. */}
      <div className="space-y-2">
        <Label htmlFor="codigo">Código interno</Label>
        <Input
          id="codigo"
          disabled
          value={empresa?.codigo ?? ""}
          placeholder="Se asignará al guardar"
          readOnly
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo</Label>
        <Select
          name="tipo"
          defaultValue={valores.tipo ?? null}
          items={TIPOS_EMPRESA.map((tipo) => ({
            label: ETIQUETAS_TIPO_EMPRESA[tipo],
            value: tipo,
          }))}
        >
          <SelectTrigger
            id="tipo"
            className="w-full"
            aria-invalid={Boolean(errores.tipo)}
          >
            <SelectValue placeholder="Elige el tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_EMPRESA.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>
                {ETIQUETAS_TIPO_EMPRESA[tipo]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MensajeError errores={errores.tipo} />
      </div>

      <Campo
        id="tipo_contribuyente"
        etiqueta="Tipo de contribuyente"
        errores={errores}
      >
        <Input
          id="tipo_contribuyente"
          name="tipo_contribuyente"
          defaultValue={valores.tipo_contribuyente ?? ""}
          aria-invalid={Boolean(errores.tipo_contribuyente)}
        />
      </Campo>

      <Campo
        id="descripcion_rubro"
        etiqueta="Descripción del rubro"
        errores={errores}
      >
        <Input
          id="descripcion_rubro"
          name="descripcion_rubro"
          defaultValue={valores.descripcion_rubro ?? ""}
          aria-invalid={Boolean(errores.descripcion_rubro)}
        />
      </Campo>

      {/* Datos EXTERNOS de SUNAT: solo lectura, los escribe la consulta de
          RUC. `readOnly` y no `disabled`, porque un campo deshabilitado no
          viaja en el FormData y el valor se perdería al guardar. No son la
          baja lógica — esa es `activo`, y se cambia desde el listado. */}
      <Campo id="estado" etiqueta="Estado (SUNAT)" errores={errores}>
        <Input
          id="estado"
          name="estado"
          readOnly
          defaultValue={valores.estado ?? ""}
          placeholder="Se llena al consultar el RUC"
          className="bg-muted"
        />
      </Campo>

      <Campo id="condicion" etiqueta="Condición (SUNAT)" errores={errores}>
        <Input
          id="condicion"
          name="condicion"
          readOnly
          defaultValue={valores.condicion ?? ""}
          placeholder="Se llena al consultar el RUC"
          className="bg-muted"
        />
      </Campo>

      <Campo id="direccion" etiqueta="Dirección" errores={errores} ancho>
        <Input
          id="direccion"
          name="direccion"
          defaultValue={valores.direccion ?? ""}
          aria-invalid={Boolean(errores.direccion)}
        />
      </Campo>

      <Campo id="distrito" etiqueta="Distrito" errores={errores}>
        <Input
          id="distrito"
          name="distrito"
          defaultValue={valores.distrito ?? ""}
          aria-invalid={Boolean(errores.distrito)}
        />
      </Campo>

      <Campo id="provincia" etiqueta="Provincia" errores={errores}>
        <Input
          id="provincia"
          name="provincia"
          defaultValue={valores.provincia ?? ""}
          aria-invalid={Boolean(errores.provincia)}
        />
      </Campo>

      <Campo id="departamento" etiqueta="Departamento" errores={errores}>
        <Input
          id="departamento"
          name="departamento"
          defaultValue={valores.departamento ?? ""}
          aria-invalid={Boolean(errores.departamento)}
        />
      </Campo>

      <Campo id="pais" etiqueta="País" errores={errores}>
        <CampoPais
          id="pais"
          name="pais"
          codigoInicial={valores.pais ?? PAIS_POR_DEFECTO}
          invalido={Boolean(errores.pais)}
        />
      </Campo>
    </div>
  );
}

/** Etiqueta + control + error, el bloque que se repite en cada campo. */
function Campo({
  id,
  etiqueta,
  errores,
  ancho = false,
  children,
}: {
  id: string;
  etiqueta: string;
  errores: Record<string, string[] | undefined>;
  /** Ocupa las dos columnas. */
  ancho?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={ancho ? "space-y-2 sm:col-span-2" : "space-y-2"}>
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      <MensajeError errores={errores[id]} />
    </div>
  );
}
