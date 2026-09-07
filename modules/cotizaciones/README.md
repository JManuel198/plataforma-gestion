# modules/cotizaciones/

El módulo más crítico del proyecto: creación, edición, versionado y
aprobación de cotizaciones para clientes.

No debe contener: el motor de precios en sí (vive en `core/`, este módulo
solo lo consume) ni configuración específica de un cliente
(`config/clientes/`).
