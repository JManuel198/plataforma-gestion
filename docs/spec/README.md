# docs/spec/

Especificación de negocio como fuente de verdad, escrita antes que el
código: `entidades.md`, `reglas-negocio.md`, `roles-permisos.md`,
`preguntas-abiertas.md` (se crean a medida que se define cada tema).
Los módulos con reglas propias extensas llevan su propio archivo: hoy,
`oportunidades.md` (Embudo de oportunidades del CRM).

No debe contener: código, ni decisiones de negocio aún no confirmadas —
para eso está `preguntas-abiertas.md`.

Única excepción, y tiene que ser explícita: `entidades.md` puede llevar
secciones de **BORRADOR** con campos todavía no confirmados, siempre que
estén marcadas como tales en su propio encabezado y digan que la tabla no
existe en `db/schema/`. Se permite porque la lista de campos de una entidad
futura no cabe con sentido en `preguntas-abiertas.md`, que es para dudas, no
para modelos. Las dudas que abre ese borrador sí van en
`preguntas-abiertas.md`, enlazadas desde el borrador.
