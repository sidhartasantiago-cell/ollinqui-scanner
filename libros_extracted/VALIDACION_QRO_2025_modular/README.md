# VALIDACIÓN_QRO_2025 — módulos Apps Script

Estos archivos son una separación funcional del código `Receptor_PU.gs` y `LectorIA_Pickups.gs` incluido en `Script en VALIDACIÓN_QRO_2025_.docx`. El documento original se conserva sin cambios.

## Archivos

- `00_config.gs`: IDs, encabezados canónicos y validación de esquemas.
- `01_receptor_pu.gs`: webhook `doPost` y escritura de recolecciones.
- `02_webapp_qro.gs`: endpoint `doGet` de la consola.
- `03_batch_import_qro.gs`: ingestión de reportes DHL.
- `04_queries_qro.gs`: cruce de Queries, extracción de contactos y normalización para el formato de campo.
- `05_dashboard_qro.gs`: lecturas del monitor, despacho de bookings y trazabilidad.
- `..\shared\utils.gs`: utilidades compartidas obligatorias (`safeJsonParse`, `sanitizarPIDParaBoveda` y `getColumnIndexes`).

Apps Script compila todos los archivos `.gs` del proyecto como un solo espacio global; los prefijos numéricos solo facilitan la navegación. Copia también `shared\utils.gs` al mismo proyecto y conserva el HTML `Index`, que sigue siendo requerido por `doGet`.

## Candados de esquema y PID

- El monitor valida las 25 columnas de `VALIDACIÓN_QRO_2025` por encabezado y posición antes de leer. No reordena ni modifica esa pestaña.
- `RECOLECCIONES_VALIDACION` conserva su esquema independiente de 18 columnas; sus índices se validan por encabezado.
- La ingesta usa `sanitizarPIDParaBoveda` para guardar el formato JD y deriva el formato JJD de campo desde esa misma normalización.
- El mapeador flexible de encabezados DHL se conserva: procesa alias de Excel antes de disponer de una hoja, por lo que no es sustituible por `getColumnIndexes(sheet, headersArray)`.

La conversión no despliega cambios ni modifica archivos de Google Sheets. `procesarBatchQRO` sigue requiriendo el servicio avanzado de Drive habilitado en el proyecto Apps Script.
