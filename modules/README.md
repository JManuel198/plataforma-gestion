# modules/

Módulos de negocio de la plataforma, cada uno en su propia carpeta (`crm`,
`cotizaciones`, `proyectos`, `logistica`, `asistencias`). Código específico
de un dominio funcional.

No debe contener: código transversal reutilizable entre módulos (eso va en
`core/`) ni configuración particular de un cliente (eso va en
`config/clientes/`).
