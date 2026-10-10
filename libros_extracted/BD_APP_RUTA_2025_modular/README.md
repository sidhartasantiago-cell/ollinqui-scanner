# BD_APP_RUTA_2025 — módulos Apps Script

Separacion local del codigo `Código.gs` encontrado en `libros_extracted/Script BD_APP_RUTA_2025.docx`. El snapshot solo contiene el proxy de escaneo masivo para `PIEZAS_PID`; no incluye el proyecto completo de AppSheet.

## Modulos

- `00_config_ruta.gs`: nombre de hoja, aliases de encabezados y estado predeterminado.
- `01_proxy_escaneo.gs`: endpoints `doPost` y `doOptions`.
- `02_trazabilidad_entregas.gs`: localizacion del PID y actualizacion de columnas de escaneo/estatus.
- `03_asignacion_choferes.gs`: documenta que el snapshot no incluye funciones ni reglas de asignacion; no inventa comportamiento.
- `04_utilidades_ruta.gs`: seleccion dinamica de encabezados, conversion PID JD/JJD y respuestas JSON.
- `..\shared\utils.gs`: dependencias `safeJsonParse`, `sanitizarPIDParaBoveda` y `getColumnIndexes`.

Apps Script compila todos los `.gs` en un espacio global compartido. Copia `shared\utils.gs` al proyecto junto con estos modulos. El documento fuente no declara un ID de spreadsheet; el endpoint conserva el uso de `SpreadsheetApp.getActiveSpreadsheet()`.

## Reglas de datos

- Los PIDs entrantes y almacenados se comparan en forma canonica de Boveda (`JD...`) mediante `sanitizarPIDParaBoveda`; la respuesta presenta formato de campo (`JJD...`).
- Los indices se obtienen por alias dinamicos. Falta de encabezado requerido, aliases simultaneos ambiguos o PIDs duplicados producen error en lugar de una escritura incierta.
- Solo se actualizan las celdas de escaneo y, si existe, el estatus. No se agrega, limpia, mueve ni reordena ninguna columna.
- El snapshot intenta agregar encabezados CORS con `TextOutput.appendHeaders`, que no forma parte de la API de Apps Script, y define `doOptions`, que no es un trigger web soportado. El modulo no simula esa API. El endpoint no queda validado para solicitudes cross-origin; integrar un proxy que controle CORS antes de conectarlo a Netlify.
- La asignacion de choferes y la trazabilidad de entrega final no aparecen en el snapshot mas alla del escaneo/validacion del bulto; requieren otra fuente funcional para modularizarse.

## Pruebas

Ejecuta `node --test libros_extracted/BD_APP_RUTA_2025_modular/bd_app_ruta_helpers.test.js libros_extracted/shared/utils.test.js`. Son 16 pruebas conjuntas. Las pruebas usan mocks; no conectan con Sheets, AppSheet ni otros servicios.

La extraccion no despliega cambios ni modifica hojas. Antes de integrar/desplegar, confirma que la cuenta activa pertenezca al tenant corporativo `@arauto.express`, valida los encabezados actuales de `PIEZAS_PID` y resuelve el requisito CORS indicado arriba.
