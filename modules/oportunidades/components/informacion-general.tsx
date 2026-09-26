import type { ReactNode } from "react";
import dayjs from "dayjs";
import { Building2Icon, CalendarIcon } from "lucide-react";
import { AvatarIniciales } from "@/core/components/avatar-iniciales";
import { formatearMonto } from "@/core/dinero";
import { formatearFecha } from "@/lib/fecha";
import type { DetalleOportunidad } from "../queries";
import { EditarContacto, EditarFechaCierre } from "./ediciones-oportunidad";
import { PanelDetalle } from "./panel-detalle";

const NOMBRE_MONEDA = { USD: "Dólares", PEN: "Soles" } as const;

/**
 * "Información general" del detalle (sección 7): una sola columna, en el
 * orden de la spec. Solo lectura salvo el lápiz del Contacto y el ícono de
 * fecha de "Cierre est." (Parte 10), que solo aparecen con la oportunidad
 * abierta: perdida o anulada, los lápices se ocultan (sección 7). El lápiz del
 * título va junto al título de la cabecera, como dice la spec.
 *
 * "Creado" es un `timestamptz` y se muestra en hora de Lima
 * (`formatearFecha`). "Cierre est." es una columna `date` que llega como
 * `YYYY-MM-DD` literal: se formatea tal cual, sin zona horaria, porque nunca
 * tuvo hora (regla invariable 10).
 */
export function InformacionGeneral({
  oportunidad,
}: {
  oportunidad: DetalleOportunidad;
}) {
  const { empresa, contacto, asesor } = oportunidad;
  const abierta = oportunidad.situacion === "abierta";

  return (
    <PanelDetalle titulo="Información general">
      <dl className="divide-y text-sm">
        <Fila etiqueta="Código">
          <span className="font-mono">{oportunidad.codigo}</span>
        </Fila>

        <Fila etiqueta="Empresa">
          <span className="flex items-start gap-2">
            <Building2Icon
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <span className="min-w-0">
              <span className="block">
                {empresa.razon_social}
                {empresa.activo ? null : <DeBaja />}
              </span>
              <span className="block text-xs text-muted-foreground">
                {empresa.nombre_comercial
                  ? `${empresa.nombre_comercial} · `
                  : null}
                {/* `ruc` es opcional (empresas del extranjero): mismo "Sin RUC"
                    que el selector de empresa del modal de alta. */}
                {empresa.ruc ? (
                  <span className="font-mono">RUC {empresa.ruc}</span>
                ) : (
                  "Sin RUC"
                )}
              </span>
            </span>
          </span>
        </Fila>

        <Fila
          etiqueta="Contacto"
          accion={
            abierta ? (
              <EditarContacto
                id={oportunidad.id}
                empresaId={oportunidad.empresa_id}
                contactoActual={contacto}
              />
            ) : null
          }
        >
          {contacto ? (
            <span className="block min-w-0">
              <span className="block">
                {contacto.nombre}
                {contacto.cargo ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {contacto.cargo}
                  </span>
                ) : null}
                {contacto.activo ? null : <DeBaja />}
              </span>
              {contacto.correo || contacto.celular ? (
                <span className="block text-xs text-muted-foreground">
                  {[contacto.correo, contacto.celular]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-muted-foreground">Sin contacto</span>
          )}
        </Fila>

        <Fila etiqueta="Asesor">
          <span className="flex items-center gap-2">
            <AvatarIniciales nombre={asesor.nombre} size="sm" />
            {asesor.nombre}
          </span>
        </Fila>

        <Fila etiqueta="Moneda">
          {oportunidad.moneda} · {NOMBRE_MONEDA[oportunidad.moneda]}
        </Fila>

        <Fila etiqueta="Valor">
          <span className="font-mono font-semibold tabular-nums">
            {formatearMonto(oportunidad.valor_estimado, oportunidad.moneda)}
          </span>
        </Fila>

        <Fila etiqueta="Probabilidad">
          <span className="font-mono tabular-nums">
            {oportunidad.probabilidad}%
          </span>
        </Fila>

        <Fila etiqueta="Creado">
          <span className="tabular-nums">
            {formatearFecha(oportunidad.createdAt)}
          </span>
        </Fila>

        <Fila etiqueta="Cierre est.">
          <span className="flex items-center gap-2">
            {abierta ? (
              // El mismo ícono de fecha, ahora pulsable (sección 7).
              <span className="-my-1.5 -ml-1.5">
                <EditarFechaCierre
                  id={oportunidad.id}
                  fecha={oportunidad.fecha_cierre_estimada}
                />
              </span>
            ) : (
              <CalendarIcon
                aria-hidden
                className="size-4 text-muted-foreground"
              />
            )}
            {oportunidad.fecha_cierre_estimada ? (
              <span className="tabular-nums">
                {dayjs(oportunidad.fecha_cierre_estimada).format("DD/MM/YYYY")}
              </span>
            ) : (
              <span className="text-muted-foreground">Sin fecha</span>
            )}
          </span>
        </Fila>
      </dl>
    </PanelDetalle>
  );
}

/** Una fila etiqueta/valor; `accion` es el lápiz, a la derecha del valor. */
function Fila({
  etiqueta,
  accion,
  children,
}: {
  etiqueta: string;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">{children}</div>
        {accion ? <div className="-my-1 shrink-0">{accion}</div> : null}
      </dd>
    </div>
  );
}

/**
 * Una empresa o un contacto dados de baja DESPUÉS de asociarse siguen
 * mostrándose (la oportunidad sigue siendo válida), pero con el aviso a la
 * vista, para que nadie los tome por vigentes.
 */
function DeBaja() {
  return (
    <span className="ml-1.5 text-xs text-muted-foreground">(de baja)</span>
  );
}
