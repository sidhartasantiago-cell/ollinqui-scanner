# Consola Maestra: carga diferida y resiliencia (2026)

## Alcance confirmado

`Index.html` implementa cinco pestañas con botón y panel: `rampa`, `auditoria`, `sierra`, `teoyolotl` y `pickups`. No existen vistas ni controles de `nomina` o `aclaraciones`; no se añadieron pestañas ni se inventaron endpoints para ellas.

## Carga por pestaña

La sesión ya no solicita datos de todas las secciones al inicio. `switchTab` valida el panel, muestra la pestaña activa y dispara sus cargas asíncronas una sola vez. Cada sección conserva estado `idle`, `loading`, `loaded` o `error`; las llamadas simultáneas comparten la promesa en vuelo. Las lecturas de pickups se comparten entre Rampa, Auditoría y Pickups.

| Pestaña | Cargas iniciales |
| --- | --- |
| Rampa | Catálogo de choferes, pickups y buzón de Gmail |
| Auditoría | Entregas y pickups compartidos |
| Sierra | Consola Sierra |
| Teoyolotl | Auditorías multimodales |
| Pickups | Lectura compartida de pickups |

Daniel entra a Sierra; Irvin y el rol `todos` entran a Rampa. Los roles y sus credenciales existentes no cambiaron.

## RPC de Apps Script

Los RPC del frontend pasan por el wrapper resiliente. Cada solicitud tiene timeout de 20 s y notificación visible; las lecturas idempotentes incluidas en la lista permitida reciben un reintento. Las escrituras y acciones mutantes no se reintentan automáticamente. El timeout solo deja de esperar en el navegador: no cancela una ejecución ya iniciada en Apps Script.

Las funciones de datos usadas por la carga diferida existen en `Code.gs` y `LectorIA_Pickups.js`. `Receptor_PU.js` atiende su propio enrutamiento de webhooks y no es el backend directo de estas llamadas `google.script.run`.

### Integraciones no resueltas detectadas

- El botón de “Puente Temporal” invoca `inyectarPuenteGuiasARuta`, pero no se encontró una función servidor con ese nombre en `Code.gs`, `LectorIA_Pickups.js` ni `Receptor_PU.js`. No se inventó una implementación ni se modificó el flujo del botón; mientras falte el endpoint, su solicitud terminará por error/timeout visible.
- El código de carga de incidencias Sierra referenciaba `obtenerIncidenciasSierraQRO`, que no existe en el backend, y un `incidencias-table-body` que no está en el DOM. Se retiró ese cargador muerto de la inicialización de Sierra; la pestaña usa `obtenerConsolaSierra`, que sí está implementada.

## Renderizado y correcciones de referencias

Las tablas de entregas, pickups y auditorías insertan un máximo de 40 filas por lote y continúan en el siguiente frame. Las consultas posteriores invalidan los lotes anteriores para impedir que una respuesta vieja reemplace la actualización más reciente. Los loops de tabla ya no concatenan repetidamente `innerHTML`.

Se eliminó un bloque heredado de recálculo Sierra que accedía a KPI inexistentes y podía lanzar una excepción al abrir Auditoría con el rol Daniel. La prueba de referencias DOM confirma que las llamadas literales a `getElementById` corresponden a elementos declarados; la región de toast se crea de forma dinámica.

## Verificación

`tools/consola_maestra.test.js` cubre:

- Correspondencia entre pestañas, botones y paneles, y confirma la ausencia actual de Nómina/Aclaraciones.
- Carga diferida, navegación, deduplicación de lecturas y roles Irvin/Daniel.
- Timeout, reintento de lecturas idempotentes, ausencia de reintentos para mutaciones y alertas de error.
- Renderizado por lotes y sintaxis de ambos bloques JavaScript inline.
- Disponibilidad en backend de los endpoints usados por las cargas diferidas.

Los cambios son de frontend y pruebas locales. No alteran hojas, datos de producción, contratos de endpoints ni despliegues.
