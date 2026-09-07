# core/

Código transversal compartido por toda la plataforma: autenticación, roles y
permisos, catálogos maestros, motor de precios, generación de PDF y
auditoría. Nunca se bifurca ni se condiciona por cliente.

No debe contener: lógica específica de un módulo de negocio (eso va en
`modules/`) ni configuración particular de un cliente (eso va en
`config/clientes/`).
