# Validador de manifiestos OLLIN

Valida archivos de entrada antes de procesarlos. Es una herramienta local de solo lectura: no se conecta a Google Sheets, Apps Script, Netlify ni modifica libros de producción.

## Uso

```powershell
node tools\validar_manifiesto.js ruta\al\manifiesto.xlsx
node tools\validar_manifiesto.js --no-color ruta\al\manifiesto.csv
node tools\validar_manifiesto.js --help
```

Admite CSV, TSV, XLS, XLSX, XLSM y JSON. Para Excel lee todas las hojas. JSON puede ser un arreglo de objetos, un arreglo bidimensional cuya primera fila contenga encabezados, o un objeto `{ "headers": [...], "rows": [...] }`.

El esquema exacto `VALIDACIÓN_QRO_2025` se valida contra sus 25 encabezados en orden. Para exportaciones DHL se aceptan los nombres alternos conocidos; encabezados desconocidos/vacíos, columnas lógicas duplicadas, filas que exceden el ancho declarado, filas sin guía/PID y cantidades inválidas son errores bloqueantes. Guías sin código postal, prefijos PID no reconocidos, mezcla de formatos JJD/JD y posibles anomalías de mojibake se presentan como advertencias. PIDs duplicados (también entre hojas) y caracteres de control/decodificación inválida bloquean el archivo.

Los PIDs se cuentan según su valor de entrada (`JJD` calle/rampa y `JD` Bóveda). Para detectar duplicados se aplica la misma transformación de `shared/utils.gs`; por tanto, `JJD123` y `JD123` colisionan como un PID. La validación no altera el archivo.

Código de salida `0`: no hay errores bloqueantes (puede haber advertencias). Código `1`: hay errores bloqueantes o no se puede leer/interpretar el archivo.

## Pruebas

```powershell
npm test
```
