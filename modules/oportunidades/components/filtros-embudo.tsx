"use client";

import { KanbanIcon, TableIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BuscadorListado } from "@/core/components/buscador-listado";
import { LimpiarFiltros } from "@/core/components/limpiar-filtros";
import { useFiltrosListado } from "@/core/use-filtros-listado";
import {
  CLAVES_RANGO_VALOR,
  OPCIONES_RAPIDAS,
  type OpcionRapida,
  type RangoValor,
} from "../constantes";
import {
  contarFiltros,
  urlListado,
  type FiltrosOportunidades,
} from "../filtros";

/**
 * La URL del Embudo con estos filtros. `urlListado` del módulo recibe además
 * la vista; los controles la necesitan con un solo argumento, y una función no
 * puede llegar como prop desde el Server Component de la página.
 */
const urlEmbudo = (filtros: FiltrosOportunidades) =>
  urlListado(filtros, "embudo");

/** "Todas" / "Todos": la ausencia del filtro, que no viaja en la URL. */
const TODAS = "todas";
const TODOS = "todos";

const ETIQUETAS_RAPIDAS: Record<OpcionRapida | typeof TODAS, string> = {
  todas: "Todas",
  "sin-mover": "Sin mover ≥7d",
  "mas-50k": ">$50k",
};

const ETIQUETAS_VALOR: Record<RangoValor, string> = {
  "menos-10k": "Menos de $10k",
  "10k-50k": "$10k a menos de $50k",
  "50k-200k": "$50k a menos de $200k",
  "200k-o-mas": "$200k o más",
};

type EmpresaDelFiltro = { id: string; razon_social: string };

/**
 * La barra de filtros del Embudo (sección 5 de la spec): búsqueda, opciones
 * rápidas, Cliente, Valor, «Limpiar filtros» y el conmutador Embudo / Tabla.
 * Todo vive en la URL y se combina; la consulta la hace el servidor al leerla.
 *
 * UNA SOLA EXCLUSIÓN, y es de la interfaz (decidida en la Parte 8, ver la
 * sección 5 de la spec): elegir un rango en Valor quita ">$50k", y activar
 * ">$50k" devuelve Valor a "Todos". Los dos filtran por importe en dólares y,
 * combinados, casi siempre dan una lista vacía. La consulta los sigue
 * combinando con AND si llegan juntos en una URL escrita a mano; esto solo
 * evita que la interfaz los ponga juntos. Valor se sigue combinando con todo
 * lo demás (Cliente, búsqueda, "Sin mover ≥7d").
 */
export function FiltrosEmbudo({
  filtros,
  empresas,
}: {
  filtros: FiltrosOportunidades;
  /** Las del desplegable Cliente: `listarEmpresasConOportunidades`. */
  empresas: EmpresaDelFiltro[];
}) {
  const { navegar, navegando } = useFiltrosListado(filtros, urlEmbudo);

  function elegirRapida(valor: OpcionRapida | undefined) {
    navegar({
      rapido: valor,
      // Activar ">$50k" deja Valor en "Todos" (ver la cabecera).
      ...(valor === "mas-50k" ? { valor: undefined } : {}),
    });
  }

  function elegirValor(valor: RangoValor | undefined) {
    navegar({
      valor,
      // Elegir un rango quita ">$50k" si estaba puesto; "Sin mover ≥7d" se
      // queda, porque no filtra por importe.
      ...(valor && filtros.rapido === "mas-50k" ? { rapido: undefined } : {}),
    });
  }

  const opcionesCliente = [
    { value: TODOS, label: "Todos" },
    ...empresas.map((empresa) => ({
      value: empresa.id,
      label: empresa.razon_social,
    })),
  ];
  // Un `?cliente=` que no está en la lista (la URL vieja de una empresa que ya
  // no tiene oportunidades) se muestra como tal en vez de un id pelado.
  if (
    filtros.cliente &&
    !opcionesCliente.some((opcion) => opcion.value === filtros.cliente)
  ) {
    opcionesCliente.push({
      value: filtros.cliente,
      label: "Empresa sin oportunidades",
    });
  }

  const opcionesValor = [
    { value: TODOS, label: "Todos" },
    ...CLAVES_RANGO_VALOR.map((clave) => ({
      value: clave,
      label: ETIQUETAS_VALOR[clave],
    })),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <BuscadorListado
          filtros={filtros}
          urlListado={urlEmbudo}
          placeholder="Buscar código, título o empresa"
        />

        {/* Selección única: un clic en la opción activa la desmarca, y eso
            vale como "Todas". */}
        <ToggleGroup
          variant="outline"
          size="sm"
          spacing={0}
          aria-label="Opciones rápidas"
          value={[filtros.rapido ?? TODAS]}
          onValueChange={(valores) => {
            const elegida = OPCIONES_RAPIDAS.find(
              (opcion) => opcion === valores[0],
            );
            elegirRapida(elegida);
          }}
          disabled={navegando}
        >
          {([TODAS, ...OPCIONES_RAPIDAS] as const).map((opcion) => (
            <ToggleGroupItem
              key={opcion}
              value={opcion}
              title={
                opcion === "mas-50k"
                  ? "Oportunidades en dólares de US$ 50,000 o más"
                  : opcion === "sin-mover"
                    ? "7 días o más sin cambiar de etapa"
                    : undefined
              }
            >
              {ETIQUETAS_RAPIDAS[opcion]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <FiltroSelect
          id="filtro-cliente"
          prefijo="Cliente"
          valor={filtros.cliente ?? TODOS}
          opciones={opcionesCliente}
          disabled={navegando}
          className="w-64"
          onCambiar={(valor) =>
            navegar({ cliente: valor === TODOS ? undefined : valor })
          }
        />

        <FiltroSelect
          id="filtro-valor"
          prefijo="Valor"
          valor={filtros.valor ?? TODOS}
          opciones={opcionesValor}
          disabled={navegando}
          className="w-60"
          titulo="Solo oportunidades en dólares"
          onCambiar={(valor) =>
            elegirValor(CLAVES_RANGO_VALOR.find((clave) => clave === valor))
          }
        />

        <LimpiarFiltros href={urlEmbudo({})} cantidad={contarFiltros(filtros)} />
      </div>

      <AlternarVista />
    </div>
  );
}

/**
 * Un desplegable de filtro con su nombre delante del valor ("Cliente: Todos"),
 * como en el mockup. El nombre también va en un `<Label>` para lectores de
 * pantalla.
 */
function FiltroSelect({
  id,
  prefijo,
  valor,
  opciones,
  disabled,
  className,
  titulo,
  onCambiar,
}: {
  id: string;
  prefijo: string;
  valor: string;
  opciones: { value: string; label: string }[];
  disabled: boolean;
  className: string;
  titulo?: string;
  onCambiar: (valor: string) => void;
}) {
  return (
    <div className="flex items-center">
      <Label htmlFor={id} className="sr-only">
        {prefijo}
      </Label>
      <Select
        value={valor}
        onValueChange={(nuevo) => {
          if (typeof nuevo === "string") onCambiar(nuevo);
        }}
        items={opciones}
        disabled={disabled}
      >
        <SelectTrigger id={id} className={className} title={titulo}>
          <span aria-hidden className="text-muted-foreground">
            {prefijo}:
          </span>
          <SelectValue className="truncate" />
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

/**
 * Embudo / Tabla (sección 9 de la spec: se guardará en la URL como
 * `?vista=tabla`). La Tabla llega en la Parte 12 del plan: hasta entonces su
 * botón se ve, para que el conmutador ya ocupe su sitio, pero está
 * deshabilitado — un enlace a una vista que no existe llevaría a la misma
 * pantalla y parecería roto.
 */
function AlternarVista() {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Vista"
      value={["embudo"]}
    >
      <ToggleGroupItem value="embudo">
        <KanbanIcon aria-hidden />
        Embudo
      </ToggleGroupItem>
      <ToggleGroupItem value="tabla" disabled title="Próximamente">
        <TableIcon aria-hidden />
        Tabla
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
