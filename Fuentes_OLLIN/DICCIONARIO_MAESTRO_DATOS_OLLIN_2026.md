# Diccionario Maestro de Datos del Ecosistema OLLIN — 2026

**Versión:** 1.0  
**Fecha:** 2026-10-09  
**Alcance:** Contratos de datos operativos de QRO para rampa, ruta, auditoría y preparación de facturación.  
**Estado:** Canoniza los esquemas disponibles; identifica expresamente los esquemas financieros que aún requieren una fuente autorizada.

> **Principio de autoridad:** este diccionario sintetiza los encabezados canónicos compartidos y las reglas técnicas halladas en snapshots y documentación local. No afirma ser un volcado en vivo de Google Sheets/AppSheet. Un campo marcado como “por confirmar” no debe convertirse en una columna, validación financiera o requisito de despliegue sin aprobación del dueño del esquema.

## 1. Convenciones y fuentes

- **PID de campo/rampa:** `JJD...`. **PID de Bóveda/facturación:** `JD...`. La normalización cambia solo el prefijo inicial `JJD` a `JD`, en mayúsculas y sin espacios exteriores.
- **Origen** identifica el proceso que aporta o valida principalmente el dato: `Rampa`, `Calle`, `Auditoría`, o una combinación. Los datos de manifiesto DHL se reciben en la ingesta de rampa; se indican como `Rampa (manifiesto DHL)`.
- **Obligatoriedad** describe el uso operativo observado, no una validación de celda garantizada por todos los sistemas. `Condicional` significa que aplica solo cuando ocurre el evento indicado. `Por confirmar` significa que no se encontró una regla autorizada.
- **Esquema inmutable:** `VALIDACIÓN_QRO_2025` conserva exactamente 25 columnas, de A a Y. No reordenar, insertar ni eliminar columnas para acomodar cambios.

**Fuentes locales consultadas:** `libros_extracted/VALIDACION_QRO_2025_modular/00_config.gs`, `03_batch_import_qro.gs`, `05_dashboard_qro.gs`; `libros_extracted/BOVEDA_BATCH_MAESTRO_modular/00_config.gs`, `02_motor_ingestion.gs`, `04_motor_despacho.gs`; `libros_extracted/BD_APP_RUTA_2025_modular/`; `Fuentes_OLLIN/amoxcalli_ciclo_vida_envio_jjd_a_facturacion_jd.md`; y la regla de estados de `Fuentes_OLLIN/AMOXCALLI_BITACORA_MAESTRA_SISTEMAS_Y_OPERACIONES.md`.

## 2. `VALIDACIÓN_QRO_2025` — contrato canónico de 25 columnas

Índices base cero; letras de hoja base uno. Tipos describen el valor lógico esperado.

| Índice | Letra | Nombre canónico | Tipo de dato | Origen principal | Obligatoriedad operativa | Descripción / regla |
|---:|:---:|---|---|---|---|---|
| 0 | A | Guia | Texto | Rampa / Calle | Requerida | Guía madre DHL (HWB/AWB); identifica el envío y relaciona sus piezas. Conservar como texto para no perder dígitos. |
| 1 | B | PID | Texto | Rampa / Calle | Requerida por pieza | Identificador de bulto. Se persiste en forma canónica `JD...`; conservar la lectura `JJD...` en el registro/dispositivo de campo cuando aplique. |
| 2 | C | C.P. | Texto o número | Rampa / Calle | Condicional | Código postal del destino. Preferir texto para conservar ceros iniciales. |
| 3 | D | Piezas | Número | Rampa | Requerida | Cantidad declarada o asociada a la guía. No sustituye el conteo físico de piezas escaneadas. |
| 4 | E | Rcvr Addr 1 | Texto | Rampa / Calle | Condicional | Primera línea de dirección del destinatario recibida del manifiesto o validada en ruta. |
| 5 | F | Rcvr Addr 2 | Texto | Rampa / Calle | Condicional | Segunda línea de dirección; complemento, colonia u otra referencia del manifiesto. |
| 6 | G | Rcvr Addr 3 | Texto | Rampa / Calle | Condicional | Tercera línea de dirección cuando existe. |
| 7 | H | Receiver Name | Texto | Rampa / Calle | Condicional | Nombre de destinatario del manifiesto o de quien recibe. Para una entrega `OK`, contrastar y documentar a la persona receptora según la regla de evidencia vigente. |
| 8 | I | GPS | Texto | Calle | Condicional | Coordenadas o ubicación capturada durante una visita/evento; no inventar posición si el dispositivo no la obtuvo. |
| 9 | J | Checkpoint | Texto / código | Calle | Requerida al registrar evento | Resultado DHL de la visita, por ejemplo `OK`, `NH`, `BA`, `CA`, `RD` o `CM`. Usar el catálogo operativo vigente; `INCIDENCIA` es una categoría, no sustituye el código concreto. |
| 10 | K | Comentarios | Texto | Calle | Condicional | Nota contextual de la visita o incidencia. Mantenerla vinculada a la guía/pieza correcta. |
| 11 | L | Fecha asignación | Fecha | Rampa | Requerida al asignar | Fecha de asignación/preparación de ruta. No confundir con fecha de entrega ni con EDD. |
| 12 | M | Fecha en ruta | Fecha y hora | Calle | Condicional | Momento en que el registro queda validado físicamente/en ruta, cuando ese evento se captura. |
| 13 | N | Imagen fachada | URL de imagen | Calle | Condicional | Referencia a evidencia visual del domicilio cuando está disponible y es pertinente. No equivale por sí sola a prueba de entrega. |
| 14 | O | ID correo | Texto | Calle / Auditoría | Condicional | Identidad/correo del operador asociado al evento o registro, de acuerdo con la integración que lo alimenta. |
| 15 | P | EDD | Fecha | Rampa (manifiesto DHL) | Condicional | Fecha estimada de entrega comunicada por el manifiesto; no es fecha efectiva de visita. |
| 16 | Q | KEY | Texto | Rampa / sistema | Requerida para correlación cuando la integración la genera | Clave de correlación del registro. Posición inmutable Q/índice 16. No reutilizar como campo de actualización. |
| 17 | R | Tipo de servicio | Texto | Rampa (manifiesto DHL) | Condicional | Clasificación de servicio; puede derivarse de la matriz logística/código de producto. |
| 18 | S | Inter | Texto | Rampa (manifiesto DHL) | Condicional | Marca de envío internacional, por ejemplo `Inter`; vacío/no aplica para doméstico. |
| 19 | T | Firma | URL o referencia de imagen | Calle | Condicional | Evidencia de firma cuando la modalidad y las reglas de cuenta la requieren. Puede no requerirse para operadores con 7CA habilitado según configuración AppSheet vigente. |
| 20 | U | Telefono | Texto | Rampa / Calle | Condicional | Teléfono de contacto normalizado. Mantener como texto; índice 20/columna U no se desplaza ni se usa para firma. |
| 21 | V | Hora de llegada | Fecha y hora | Calle | Condicional | Hora de llegada/check-in de la visita, si la aplicación la captura. |
| 22 | W | Aprobación Auditor | Booleano / checkbox | Auditoría | Requerida como compuerta; valor inicial `false` | Aprobación explícita posterior a la visita. `true` habilita el registro para el proceso financiero vigente; no es, por sí sola, una factura ni un pago. |
| 23 | X | Motivo de Rechazo | Texto | Auditoría | Condicional | Explicación de rechazo. Obligatoria cuando la aprobación queda en falso por observación/rechazo; conservarla al actualizar otros datos. |
| 24 | Y | Marca de Tiempo | Fecha y hora | Sistema / Auditoría | Requerida al inyectar | Marca temporal de registro/inyección para trazabilidad. No sustituye las horas de evento en M o V. |

**Candados:** la columna `Actualización` está extinta; no reintroducirla. `KEY` permanece en Q (índice 16), `Telefono` en U (índice 20), `Aprobación Auditor` en W (índice 22), `Motivo de Rechazo` en X y `Marca de Tiempo` en Y.

**Límite sobre obligatoriedad:** el orden y nombres de las 25 columnas son contrato confirmado. La obligatoriedad de cada celda no está implementada como una validación uniforme en los módulos locales; donde se indica “condicional” debe prevalecer el flujo/catálogo de auditoría correspondiente.

## 3. `BOVEDA_BATCH_MAESTRO` y `FACTURADOS_PROD_2026`

### 3.1 Datos y reglas confirmados para la frontera de facturación

| Elemento | Tipo / representación | Regla documentada | Estado de evidencia |
|---|---|---|---|
| PID facturable | Texto | Canonizar `JJD...` a `JD...` con `sanitizarPIDParaBoveda`; no quitar ni reordenar otros caracteres. Conservar el PID de campo en su sistema de origen si hace falta traza de escaneo. | Confirmado en utilería compartida y módulos de ingesta. |
| Guía (HWB/AWB) | Texto | Clave madre que relaciona la entrega con una o más piezas/PID; conservar como texto. | Confirmado en mapas operativos; encabezados de `FACTURADOS_PROD_2026` no disponibles. |
| Checkpoint de entrega | Texto / código | Una entrega exitosa se registra como `OK`; fallos se conservan con su código operativo (p. ej., `NH`, `BA`, `CA`, `RD`, `CM`). | Confirmado como catálogo operativo; criterio financiero final por confirmar. |
| Aprobación de auditor | Booleano | La aprobación está en W/índice 22 de Validación. Solo los registros aprobados quedan disponibles para el proceso financiero vigente. | Compuerta confirmada; interfaz/tabla consumidora no identificada en el snapshot. |
| UMA 2026 | Número: MXN `108.57` por UMA | El snapshot de Bóveda calcula un indicador de exposición como 30 UMAs por bulto: `108.57 × 30 = 3,257.10 MXN`. | Valor y cálculo KPI aparecen en la UI de respaldo. **No está documentado como tarifa DHL, importe facturable, deducción ni fórmula de liquidación.** |

### 3.2 Esquema físico `FACTURADOS_PROD_2026`: pendiente de fuente

Los módulos extraídos y el DOCX disponible no contienen la fila de encabezados, tipos, claves, importes ni fórmula de `FACTURADOS_PROD_2026`. Por ello, no se atribuyen nombres ni posiciones de columna a esa hoja. Para cerrar este subdiccionario se necesita una exportación autorizada de encabezados y reglas del área de Facturación/Finanzas (sin datos personales o de clientes).

Hasta obtener esa fuente:

- No asumir que las 25 columnas de `VALIDACIÓN_QRO_2025` son idénticas a la estructura de `FACTURADOS_PROD_2026`.
- No convertir el KPI de 30 UMAs en importe a pagar/facturar ni en tarifa por pieza.
- No inferir liquidación semanal, deducciones, tarifas por checkpoint, reglas de parcial (`PD`) ni calendario de corte.
- Usar PID `JD...` y preservar una referencia trazable al HWB, al checkpoint aprobado y a la marca de tiempo; el mapeo a columnas financieras queda **por confirmar**.

## 4. `PIEZAS_PID` — claves de estado

Las claves operan en **dos dimensiones diferentes**, no como una sola secuencia intercambiable:

- `Estatus_PID`: estado de ruta/entrega de la pieza.
- `Escaneo_Validacion`: estado físico de carga en rampa.

| Clave | Dimensión habitual | Significado | Regla de transición / evidencia |
|---|---|---|---|
| `PRE_ASIGNADO` | `Estatus_PID` | Pieza incluida en el manifiesto y relacionada con una guía/chofer; aún no consta entrega. | Estado inicial de ruta. La ingesta digital no afirma carga física ni entrega. |
| `SIN_CARGAR` | `Escaneo_Validacion` | Pieza declarada en el manifiesto que todavía no fue escaneada físicamente a bordo. | Estado inicial de rampa. Ningún batch, conciliación o proceso automático lo eleva a `A_BORDO`. |
| `A_BORDO` | `Escaneo_Validacion` | Pieza leída físicamente durante la carga de rampa. | Solo el escaneo físico autorizado puede efectuar la transición ordinaria desde `SIN_CARGAR`. |
| `OK` | `Estatus_PID` | Entrega exitosa registrada en calle. | Requiere evento de entrega válido y evidencia aplicable. Es estado de calle, nunca resultado de escaneo/conciliación de rampa. |
| `INCIDENCIA` | Categoría descriptiva, no clave canónica única | Evento de entrega no exitosa que requiere conservar motivo/código. | Guardar el checkpoint específico del catálogo (p. ej. `NH`, `BA`, `CA`, `RD`, `CM`); no reemplazar esos valores por el texto genérico `INCIDENCIA`. |

**Otras claves observadas que no deben perderse:** `BYPASS_TLACHIXQUI` representa una autorización manual de carga por supervisor; `RECHAZADO` representa pieza dañada/no apta en rampa; `POR_ENTREGAR` es estado derivado de guía cuando las piezas están liberadas; `PD` indica parcial calculado en la guía. No forman parte de las cinco etiquetas solicitadas, pero son necesarias para interpretar el catálogo completo. La guía puede permanecer `PRE_ASIGNADO` mientras haya piezas `SIN_CARGAR`; el estado de una pieza no debe sobreescribir el de su guía madre.

**Esquema de columnas `PIEZAS_PID`:** la documentación confirma los campos lógicos `PID_Codigo`, `HWB_Guia`, `Estatus_PID` y `Escaneo_Validacion`; también aparecen descripción y evidencia/comentarios/timestamp en versiones posteriores. Los snapshots locales no concuerdan todos en orden y número de columnas. No se fija aquí una posición física; regenerar/validar el esquema de AppSheet autorizado antes de mapear columnas.

**Diferencia entre snapshots:** el código extraído de Bóveda escribe valores heredados como `PENDIENTE`/`EN RUTA` en lotes AppSheet; la regla de gobernanza posterior establece `PRE_ASIGNADO` y `SIN_CARGAR` como estados iniciales separados por dimensión. Para el diccionario prevalece la regla operativa posterior de Amoxcalli; el código heredado requiere conciliación antes de cualquier despliegue.

## 5. Matriz de transición: camión DHL a preparación de liquidación

| Etapa | Sistema / conjunto de datos | Dato que entra | Transformación o control | Salida y condición |
|---|---|---|---|---|
| 1. Recepción en andén | Acta/recepción de rampa | Camión, manifiesto, conteo declarado, auditor y escaneos físicos `JJD...` | Distinguir guía madre de PID; conciliar declaración y lectura física. Un AWB no es PID de bulto. | Evidencia de recepción y discrepancias; no equivale a entrega ni aprobación financiera. |
| 2. Ingesta del manifiesto | `BOVEDA_BATCH_MAESTRO` / datos RAW | HWB, PIDs, CP, dirección, piezas, EDD, teléfonos y servicio DHL | Resolver columnas por encabezado; filtrar duplicados según claves disponibles; PID persistido se normaliza a `JD...`. | Lote operativo preparado; los campos exactos de facturación todavía no quedan definidos. |
| 3. Preasignación de ruta | `GUIAS_ASIGNADAS` y `PIEZAS_PID` | Guía, chofer, destino, total de piezas y PIDs asociados | Relacionar cada PID con HWB. Estado de guía/pieza queda preasignado; la dimensión de rampa inicia en `SIN_CARGAR`. | Pieza visible para el flujo autorizado de carga; todavía no puede darse por abordada. |
| 4. Carga física | AppSheet / `PIEZAS_PID` | Lectura real de cada PID en rampa | El escaneo autorizado mueve `Escaneo_Validacion` de `SIN_CARGAR` a `A_BORDO`; mantener `Estatus_PID` sin marcarlo como `OK`. | Solo las piezas físicamente cargadas (o con bypass autorizado y trazado) liberan la guía para ruta. |
| 5. Entrega o intento | AppSheet / calle | Escaneo de pieza, operador, receptor, checkpoint, firma/evidencia, GPS y hora cuando aplique | `OK` para éxito; conservar códigos específicos de incidencia para intentos fallidos. Una apertura de parada no acredita entrega. | Estado de `PIEZAS_PID` y/o guía; las incidencias permanecen auditables y no se convierten en entregas exitosas. |
| 6. Consolidación de Validación | `VALIDACIÓN_QRO_2025` | Guía/PID, resultado, datos de visita y evidencia | Escribir en el contrato fijo de 25 columnas; PID en B (`JD...`), checkpoint en J, KEY en Q, firma en T, teléfono en U, auditoría en W/X y timestamp en Y. | Registro trazable para revisión; no reordenar columnas. |
| 7. Auditoría | `VALIDACIÓN_QRO_2025` | Registro y evidencias de la visita | Auditor confirma consistencia. Si rechaza, conservar W en falso y documentar causa en X. | Solo W verdadero satisface la compuerta de aprobación documentada. |
| 8. Integración financiera | `FACTURADOS_PROD_2026` (destino citado; esquema no disponible) | Registros aprobados y sus referencias operativas | Debe mapearse mediante contrato financiero autorizado; mantener HWB/PID `JD...`, checkpoint y vínculo al registro auditado. | Columnas, tarifas y criterios concretos están **por confirmar**; no inferirlos del KPI UMA. |
| 9. Liquidación semanal | Proceso/hoja financiera no identificados en fuentes | Base de registros facturados, periodo y reglas financieras | Requiere calendario, tarifas, tratamiento de parciales/incidencias, deducciones, moneda, impuestos y aprobación financiera documentados por Finanzas. | No hay fórmula canónica verificable en los snapshots consultados; completar al incorporar fuente autorizada. |

### Invariantes para cualquier integración

1. La pieza conserva su identidad: `JJD...` en captura de campo y `JD...` en Bóveda/facturación. La normalización no debe modificar la guía ni otros caracteres del PID.
2. La carga física (`A_BORDO`) y la entrega (`OK`) son hechos distintos y viven en dimensiones de estado diferentes.
3. No derivar `A_BORDO`, `OK` o aprobación financiera solo a partir de la existencia del manifiesto.
4. No tratar `INCIDENCIA` como checkpoint concreto ni borrar el código operativo original.
5. La regla de 25 columnas en Validación es inmutable; encontrar por encabezado no autoriza reordenar.
6. `Aprobación Auditor = true` habilita el proceso financiero vigente, pero no genera por sí misma factura, pago o liquidación.
7. `UMA 2026 = 108.57` y el límite KPI de 30 UMAs son una regla de indicador de riesgo observada; no son una tarifa de pago hasta que Finanzas lo confirme explícitamente.

## 6. Pendientes de cierre del diccionario

- Obtener encabezados y tipos vigentes de `FACTURADOS_PROD_2026`, mediante exportación autorizada sin filas de datos personales.
- Identificar el libro/hoja y responsable que ejecuta la liquidación semanal; documentar corte, fórmula y reglas de incidencias/parciales.
- Confirmar el orden físico actual de `PIEZAS_PID` y su versión de AppSheet antes de publicar un contrato posicional.
- Acordar campos universalmente obligatorios vs. condicionales en Validación con Operaciones y Auditoría; este catálogo no sustituye las reglas de cada flujo.
