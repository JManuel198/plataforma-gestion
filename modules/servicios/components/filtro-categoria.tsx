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
import { CATEGORIAS_SERVICIO, capitalizarCategoria } from "../constantes";
import { urlListado, type FiltrosServicios } from "../filtros";

const TODAS = "todas";

/**
 * La categoría elegida viaja en la URL (`/servicios?categoria=alquiler`) y el
 * filtrado ocurre en la consulta del servidor — este componente solo navega.
 * Mismo patrón exacto que `FiltroEstado` de Órdenes de Trabajo, que es la
 * referencia de "filtro de lista cerrada por URL" del proyecto (ver
 * .claude/skills/shadcn-conventions/SKILL.md).
 *
 * Recibe los filtros completos, no solo el suyo, porque la URL que construye
 * tiene que conservar la búsqueda: los dos filtros se aplican juntos.
 *
 * NO ES `CampoListaSugerida` ni texto libre, a diferencia del campo Unidad del
 * formulario: `categoria` es la lista CERRADA de este catálogo (ver
 * `categoriaSchema` en ../schema.ts), así que su filtro es un `Select` de
 * verdad, con las mismas cinco opciones y ninguna otra.
 *
 * `capitalizarCategoria` SOLO se aplica a las cinco categorías reales, nunca a
 * la etiqueta "Todas las categorías": esa es la lección de
 * `capitalizarCategoria` en ../constantes.ts — una transformación de CSS
 * (`className="capitalize"`) mayusculiza cada palabra, así que aplicada aquí
 * habría dejado esa etiqueta como "Todas Las Categorías". Al calcular la
 * mayúscula en JS y solo sobre el valor real, la etiqueta de "sin filtro" se
 * queda exactamente como se escribió.
 */
export function FiltroCategoria({ filtros }: { filtros: FiltrosServicios }) {
  const { navegar, navegando } = useFiltrosListado(filtros, urlListado);

  const opciones = [
    { label: "Todas las categorías", value: TODAS },
    ...CATEGORIAS_SERVICIO.map((valor) => ({
      label: capitalizarCategoria(valor),
      value: valor,
    })),
  ];

  function filtrarPor(valor: string | null) {
    // `TODAS` no es una categoría: es la ausencia de filtro, y por eso sale de
    // la URL en vez de escribirse en ella.
    navegar({
      categoria:
        valor && valor !== TODAS
          ? CATEGORIAS_SERVICIO.find((categoria) => categoria === valor)
          : undefined,
    });
  }

  return (
    // La etiqueta es solo para lectores de pantalla, igual que la del
    // buscador: la opción «Todas las categorías» ya dice qué filtra.
    <div className="flex items-center gap-2">
      <Label htmlFor="filtro-categoria" className="sr-only">
        Categoría
      </Label>
      <Select
        value={filtros.categoria ?? TODAS}
        onValueChange={filtrarPor}
        items={opciones}
        disabled={navegando}
      >
        <SelectTrigger id="filtro-categoria" className="w-56">
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
