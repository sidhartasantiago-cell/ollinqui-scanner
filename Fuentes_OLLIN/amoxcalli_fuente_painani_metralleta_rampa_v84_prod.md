# 🏛️ AMOXCALLI — BITÁCORA TÉCNICA Y DE OPERACIONES (ECOSISTEMA OLLIN)
## FUENTE CANÓNICA: REINGENIERÍA PAINANI v84.0 PROD — BLINDAJE DE RAMPA QRO
### Rechazo Anti-AWB ("Ley J de Oro"), Captura de Etiqueta Ilegible con Visión IA Asíncrona (Teoyolotl Vision) y Aislamiento Absoluto de AppSheet en Bóveda Batch Maestro

---

## 📌 FICHA TÉCNICA DEL DESPLIEGUE
- **Versión:** Painani v84.0 PROD / Receptor_PU.js v84.0
- **Fecha de Despliegue:** 24 de Septiembre de 2026
- **Entorno de Aplicación:** Andén de Recepción Querétaro (Rampa DHL Express ➔ Arauto Express)
- **Script ID (Clasp):** `1OPEYOE5qQPz-Jn5998dtGvMXexLyrPBuTNQVlDmZdHybg7Jh78OkSMjB`
- **ID Bóveda Batch Maestro:** `1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw`
- **Hojas Involucradas:** `RECEPCION_RAMPA` (12 columnas rígidas), `LOG_TRAZABILIDAD` (8 columnas)
- **ID BD App Ruta (AppSheet Choferes):** `1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w` (**AISLADA / BLOQUEADA PARA ESCRITURA DE RAMPA**)
- **Modelo de Visión Artificial:** `gemini-3.6-flash` (con cascada a `gemini-3.7-flash`, `gemini-3.5-flash`)
- **Carpeta de Google Drive:** `PAINANI_INCIDENCIAS_RAMPA`

---

## 🎯 OBJETIVOS DE LA REINGENIERÍA v84.0 PROD

1. **Rechazo AWB Tajante ("Ley J de Oro"):**
   - Eliminar cualquier posibilidad de que un operador sume accidentalmente una guía maestra AWB (10 dígitos numéricos puros) al conteo físico notarial.
   - Disparo sonoro de error y pantalla roja bloqueante al detectar un código de 10 dígitos. Solo se aceptan bultos físicos con prefijos `JJD` o `JD` (> 10 dígitos) o folios auxiliares de incidencia.

2. **Módulo "📸 Foto Etiqueta Ilegible":**
   - Otorgar a los auditores en andén un mecanismo Poka-Yoke para bultos con etiquetas rotas, desgarradas, mojadas o manchadas que no leen con la pistola láser.
   - Generación de folio notarial auxiliar `PID_INC_XXXX` que suma de inmediato **+1** al odómetro físico de piezas recibidas en rampa.
   - Captura directa por cámara (`capture="environment"`), compresión en canvas (1280px, JPEG 0.72) y almacenamiento en Google Drive.

3. **Lectura Asíncrona IA (Teoyolotl Vision):**
   - El webhook `Receptor_PU.js` procesa la fotografía en segundo plano utilizando el modelo canónico `gemini-3.6-flash`.
   - Extracción de metadatos críticos para aclaraciones con DHL:
     * PID detectado (formato `JJD` / `JD`).
     * Guía AWB detectada (10 dígitos).
     * Código Postal (5 dígitos).
     * Nombre del destinatario y dirección visible.
     * Dictamen de integridad de la etiqueta.
   - Inyección de los resultados en la columna K (`Estatus_Conciliacion`) de `RECEPCION_RAMPA` y registro inmutable en `LOG_TRAZABILIDAD`.

4. **Aislamiento Total de AppSheet (`BD_APP_RUTA_2025`):**
   - Toda la data de rampa debe residir exclusivamente en `BOVEDA_BATCH_MAESTRO`.
   - Queda estrictamente prohibida la escritura en `BD_APP_RUTA_2025` desde el canal de rampa, protegiendo a los choferes de calle contra datos preliminares no auditados.

---

## 🏗️ ARQUITECTURA DE DATOS Y FLUJO OPERATIVO

### 1. Interfaz de Escaneo y Rechazo AWB (PWA Painani)
```
[Pistola Láser / Zebra]
        │
        ▼
   parsearDisparo(raw)
        │
   ┌────┴──────────────────────────┐
   ▼                               ▼
[10 dígitos numéricos]    [(JJD|JD) + >10 car.]
   │                               │
   ▼                               ▼
❌ RECHAZO AWB               ✅ PID VÁLIDO
• Audio: Tono grave de error  • Audio: Bip agudo de éxito
• Flash: Rojo (#3b0000)       • Flash: Verde neón (#00290e)
• Odómetro: +0 (Bloqueado)    • Odómetro: +1
• Status: Alerta restrictiva  • Sincronización a Bóveda
```

### 2. Flujo de Foto Etiqueta Ilegible
```
[Operador detecta etiqueta dañada]
        │
        ▼
Pulsar botón '📸 Foto Etiqueta Ilegible (+1 PZA Notarial)'
        │
        ▼
Captura de cámara móvil / pistola Android
        │
        ▼
Compresión en Canvas (1280px máx, calidad 0.72 JPEG)
        │
        ▼
Generación de Folio Auxiliar: PID_INC_XXXX
        │
        ▼
Actualización UI inmediata (+1 pieza notarial, badge [📸 ILEGIBLE])
        │
        ▼
POST Webhook Receptor_PU.js (subtipo: "REGISTRAR_INCIDENCIA_FOTO")
        │
        ├─────────────────────────────────────┐
        ▼                                     ▼
DriveApp.createFolder()            Gemini 3.6 Flash (Vision)
Guardar imagen en                  Extraer PID, AWB, CP, Destinatario
'PAINANI_INCIDENCIAS_RAMPA'        y dictamen de estado físico
        │                                     │
        └──────────────────┬──────────────────┘
                           ▼
           BOVEDA_BATCH_MAESTRO
           ├─ RECEPCION_RAMPA (12 columnas con URL y dictamen IA)
           └─ LOG_TRAZABILIDAD (Auditoría inmutable)
```

---

## 📐 ESQUEMA RÍGIDO DE 12 COLUMNAS (`RECEPCION_RAMPA`)

| Columna | Nombre de Cabecera | Tipo de Dato | Descripción en v84.0 PROD |
|:---:|:---|:---|:---|
| **A** | `ID_Recepcion` | Texto | Folio del ciclo de rampa (ej. `REC-20260924-01`). |
| **B** | `Timestamp_Escaneo` | Fecha/Hora | Marca temporal ISO/Local del escaneo o foto. |
| **C** | `Codigo_Original` | Texto | Código escaneado o folio auxiliar `PID_INC_XXXX`. |
| **D** | `PID_Sanitizado_Boveda` | Texto | PID transformado a `JD` (Doble J) o PID recuperado por IA. |
| **E** | `Tipo_Codigo` | Texto | `PID`, `PID_INC_FOTO`, `CP` o `CIERRE`. |
| **F** | `EDD_Fisico` | Fecha | Fecha prometida activa seleccionada en rampa. |
| **G** | `Auditor_Arauto` | Texto | Nombre del auditor responsable en andén (ej. Irvin Reyes). |
| **H** | `Asistente_DHL` | Texto | Chofer o custodio de DHL Express que entrega la carga. |
| **I** | `Piezas_Declaradas_DHL`| Número | Total de piezas reportadas en la guía o manifiesto de DHL. |
| **J** | `Conteo_Acumulado` | Número | Número ordinal del bulto físico verificado (+1). |
| **K** | `Estatus_Conciliacion` | Texto | Dictamen operativo, URL de foto en Drive y lectura IA. |
| **L** | `Marca_Tiempo_Servidor`| Fecha/Hora | Timestamp generado por el servidor de Google Apps Script. |

---

## 🔒 POLÍTICA DE AISLAMIENTO: APPSHEET vs BÓVEDA

- **Bóveda Batch Maestro (`1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw`):**
  * Es el único repositorio autorizado para almacenar los registros brutos de rampa (`RECEPCION_RAMPA`), logs de trazabilidad (`LOG_TRAZABILIDAD`) y tablas DHL (`RAW_SHIPMENT`, `RAW_PIECE`).
- **BD App Ruta 2025 (`1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w`):**
  * Base de datos productiva de AppSheet para los repartidores en calle.
  * **CANDADO:** El canal de rampa no realiza ninguna inyección ni mutación en esta hoja hasta que exista una instrucción explícita del Tlayacanqui Sidharta Santiago y un proceso de asignación consolidado.

---

## 🧪 VALIDACIÓN Y CERTIFICACIÓN TÉCNICA
1. **Suite de Pruebas Unitarias (`scratch/test_painani_v84.js`):**
   - Test 1 (Anti-AWB): 10 dígitos numéricos rechazados estrictamente con error sonoro y pantalla roja sin sumar piezas.
   - Test 2 (Ley J de Oro): PIDs mayores a 10 caracteres (`JJD` / `JD`) admitidos exitosamente.
   - Test 3 (Doble J): Sanitización a `JD` y preservación de folios auxiliares `PID_INC_XXXX`.
   - Test 4 (Foto Incidencia): Folio auxiliar generado, suma +1 notarial y genera registro enriquecido.
   - Test 5 (Esquema de 12 Columnas): Alineación perfecta de campos en `RECEPCION_RAMPA`.
   - **Resultado:** 5/5 tests superados con éxito (100%).

2. **Despliegue a Producción (Clasp):**
   - Ejecutado con éxito vía `npx @google/clasp push -f` en Script ID `1OPEYOE5qQPz-Jn5998dtGvMXexLyrPBuTNQVlDmZdHybg7Jh78OkSMjB`.
   - 15 archivos sincronizados sin colisiones.
