# BOVEDA_BATCH_MAESTRO — módulos locales

Separación del snapshot incluido en `libros_extracted/Scrip BOVEDA_BATCH_MAESTRO.docx`. No representa una lectura en vivo de Apps Script ni se desplegó; verifica los IDs y esquemas contra la fuente corporativa antes de cualquier integración.

## Módulos

- `00_config.gs`: IDs y etiquetas extraídos del snapshot, propiedad requerida del webhook y parámetros UMA 2026.
- `01_webapp_ui.gs`: endpoints de la Web App y menú; `doGet` renderiza la interfaz desacoplada.
- `02_motor_ingestion.gs`: importación de reportes/Excel y guardado de lotes.
- `03_consultas_kpis.gs`: normalización de alias, fechas, teléfonos, PID y búsqueda dinámica de encabezados.
- `04_motor_despacho.gs`: generación de mesa, despacho dual, cola y alertas.
- `05_liquidacion.gs`: reservado/documentado; el snapshot no contiene funciones de liquidación independientes.
- `Index.html`: interfaz separada. Los KPIs del snapshot se calculan en el navegador y parte de su información es de respaldo; no hay endpoints de consulta/KPI dedicados en el backend original.
- `..\shared\utils.gs`: dependencias compartidas: `safeJsonParse`, `sanitizarPIDParaBoveda` y `getColumnIndexes`.

Apps Script compila los `.gs` del proyecto en un ámbito global; conserva los nombres de archivo y añade `shared\utils.gs` al mismo proyecto. `doGet` requiere `Index.html`.

## Reglas aplicadas

- La ingesta normaliza los PIDs a formato de Bóveda `JD...`; el despacho a AppSheet usa formato de campo `JJD...`.
- Los encabezados de hojas y archivos Excel se resuelven con `getColumnIndexes` mediante el adaptador de encabezados; alias DHL se normalizan antes de la búsqueda. No se usa un índice fijo como sustituto silencioso si falta el encabezado del PID o la guía.
- Los parámetros UMA/30 UMA se mantienen en `00_config.gs` y se inyectan como números a la plantilla `Index.html`.
- El webhook no se copia del DOCX: se obtiene de Script Properties con la clave `GOOGLE_CHAT_WEBHOOK_V6`. No añadas el valor al repositorio.

## Pruebas y seguridad operativa

Ejecuta `node --test libros_extracted/shared/utils.test.js libros_extracted/BOVEDA_BATCH_MAESTRO_modular/boveda_batch_maestro.test.js`. Las pruebas cargan los módulos en un contexto aislado y no llaman Gmail, Sheets, Drive, UrlFetch ni `procesarColaBot`.

Las funciones operativas originales conservan escrituras y limpiezas de hojas; no las ejecutes contra producción como parte de las pruebas. Antes de cualquier despliegue, confirma explícitamente la cuenta corporativa `@arauto.express`, la titularidad de cada recurso y los IDs del snapshot. Esta entrega no modifica hojas ni despliega cambios.
