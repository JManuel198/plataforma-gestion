/**
 * Pantalla de relleno para las secciones que ya figuran en el menú pero
 * todavía no están construidas (los cinco catálogos maestros del Bloque 11).
 *
 * Existe para que el enlace del menú lleve a algún sitio en vez de a un 404,
 * no como base de la pantalla definitiva: cuando una sección se implemente,
 * su `page.tsx` deja de importar esto y escribe su propio contenido. El día
 * que ya no la importe nadie, este archivo se borra.
 */
export function PantallaProximamente({ titulo }: { titulo: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
      <p className="text-sm text-muted-foreground">
        Esta sección todavía no está disponible. Próximamente.
      </p>
    </div>
  );
}
