import { Badge } from "@/components/ui/badge";
import { ETIQUETAS_TIPO_EMPRESA, type TipoEmpresa } from "../constantes";

/**
 * Un tono distinto por tipo, con el mismo `Badge` y el mismo recurso que
 * `BadgeEstado` de Órdenes de Trabajo: un mapa de variantes con un solo dueño,
 * porque el tipo se pinta en la tabla y en la vista y no puede verse de dos
 * maneras.
 *
 * Las tres variantes se eligen para NO arrastrar un significado que el tipo no
 * tiene: `success` y `destructive` quedan fuera (en OT son "cobrado" y
 * "cancelado", y aquí ningún tipo es mejor ni peor que otro).
 * - `cliente` → `info` (azul): el caso más frecuente, con color propio.
 * - `proveedor` → `default` (el gris oscuro de `--chip-neutral`).
 * - `cliente_y_proveedor` → `outline`: sin relleno, para que no se lea como
 *   un tercer color que compita con los otros dos sino como "los dos".
 *
 * Sin `"use client"`: es marcado y nada más.
 */
const variantePorTipo: Record<TipoEmpresa, "info" | "default" | "outline"> = {
  cliente: "info",
  proveedor: "default",
  cliente_y_proveedor: "outline",
};

export function BadgeTipo({ tipo }: { tipo: TipoEmpresa }) {
  return (
    <Badge variant={variantePorTipo[tipo]}>{ETIQUETAS_TIPO_EMPRESA[tipo]}</Badge>
  );
}
