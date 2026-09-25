"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFiltrosListado } from "@/core/use-filtros-listado";
import { ETIQUETAS_TIPO_EMPRESA, TIPOS_EMPRESA } from "../constantes";
import { urlListado, type FiltrosEmpresas } from "../filtros";

const TODOS = "todos";

/**
 * El tipo elegido viaja en la URL (`/clientes?tipo=cliente`) y el filtrado
 * ocurre en la consulta del servidor — este componente solo navega. Mismo
 * patrón que `FiltroCategoria` de Servicios y `FiltroEstado` de OT.
 *
 * EL FILTRO ES INCLUSIVO, y lo decide el servidor, no este selector: «Cliente»
 * trae también las que son cliente y proveedor (ver `TIPOS_POR_FILTRO` en
 * ../queries.ts). Las etiquetas de las opciones son las del tipo tal cual; la
 * de ambos se lee como "solo las que son las dos cosas", que es lo que hace.
 */
export function FiltroTipo({ filtros }: { filtros: FiltrosEmpresas }) {
  const { navegar, navegando } = useFiltrosListado(filtros, urlListado);

  const opciones = [
    { label: "Todos los tipos", value: TODOS },
    ...TIPOS_EMPRESA.map((valor) => ({
      label: ETIQUETAS_TIPO_EMPRESA[valor],
      value: valor,
    })),
  ];

  function filtrarPor(valor: string | null) {
    // `TODOS` no es un tipo: es la ausencia de filtro, y por eso sale de la
    // URL en vez de escribirse en ella.
    navegar({
      tipo:
        valor && valor !== TODOS
          ? TIPOS_EMPRESA.find((tipo) => tipo === valor)
          : undefined,
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="filtro-tipo" className="sr-only">
        Tipo
      </Label>
      <Select
        value={filtros.tipo ?? TODOS}
        onValueChange={filtrarPor}
        items={opciones}
        disabled={navegando}
      >
        <SelectTrigger id="filtro-tipo" className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((opcion) => (
            <SelectItem key={opcion.value} value={opcion.value}>
              {opcion.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
