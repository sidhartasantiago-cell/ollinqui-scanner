# 📜 AMOXCALLI: Especificación de Arquitectura y Fuente Técnica — PAINANI v82.5 PROD
## Metralleta de Blindaje de Rampa, Acta Notarial Física y Alerta Google Chat
**Documento Técnico de Referencia para el Amoxcalli y Fuente Maestra para NotebookLM**  
*Plaza Querétaro (QRO) — Arauto Express*  
*Fecha de Certificación: Septiembre 2026*

---

> [!IMPORTANT]
> **Estatus:** Desplegado, Validado y Operativo en Producción.  
> **URL Producción PWA:** `https://painani.arauto.express/`  
> **Backend Webhook:** `Receptor_PU.js` (Canal D: `RECEPCION_RAMPA`)  
> **Alerta Automática:** Google Chat Space `AAQA-NmGVf0` (Bot: `AE_Bot_QRO 🤺`)  
> **Destino Bóveda Almacén:** ID `1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw` (`RECEPCION_RAMPA`)  
> **Autoridad:** Tlayacanqui Sidharta Santiago / Auditor en Rampa Irvin Reyes.  
> **Axioma Supremo OLLIN:** *"La información digital propone, pero la acción física dispone."*

---

## 🧭 1. GÉNESIS Y JUSTIFICACIÓN DE NEGOCIO (EL "POR QUÉ" DE PAINANI)

En la logística de última milla de Arauto Express para DHL Express, existe una brecha crítica de vulnerabilidad financiera y operativa:

1. **La Asimetría Temporal del Query/Batch:**  
   DHL descarga sus camiones en el andén de Querétaro a primera hora de la mañana, pero el archivo digital (*Query / Batch Maestro*) se envía o procesa **horas después**.
2. **El Riesgo Financiero por Falsos Faltantes:**  
   Históricamente, el chofer o asistente de DHL declaraba verbalmente una cantidad (ej. *"te entrego 300 piezas"*). Si físicamente solo entregaban 298 piezas o escaneaban en sus terminales bultos que nunca bajaron de la unidad, al procesar el Query en sistema aparecía que Arauto había recibido 300 paquetes. Esas 2 piezas faltantes se cobraban como pérdidas atribuibles a Arauto Express.
3. **Optimización de Rutas por EDD Físico:**  
   Los paquetes traen físicamente adherida una etiqueta con el **EDD más reciente** (Estimated Delivery Date). Capturar esta fecha física en el andén antes del cruce digital permite programar el circuito de rutas con máxima precisión territorial.

**La Solución PAINANI:**  
Una Progressive Web App (PWA) de ráfaga y ultra-baja latencia con odómetro gigante, offline-first, que certifica notarialmente la custodia material bulto por bulto, emite actas para WhatsApp, alerta a la dirección en Google Chat y concilia contra el Batch de DHL.

---

## 🏛️ 2. ARQUITECTURA TÉCNICA DEL ECOSISTEMA

```
 [ PISTOLA LÁSER / CELULAR ]
        │ (Disparo continuo)
        ▼
 ┌────────────────────────────────────────────────────────┐
 │   PAINANI PWA (painani.arauto.express)                 │
 │   - AMOLED Black puro (#000000) & Oro DHL (#f2a900)    │
 │   - Odómetro Gigante & Comparador de Faltantes/Exceso  │
 │   - Cache Local (localStorage) + Service Worker (sw.js)│
 │   - Edición en caliente (Asistente, Auditor, EDD)      │
 └───────────────────────┬────────────────────────────────┘
                         │ 
                         │ Fetch POST (Asíncrono cada 5s / Batch)
                         ▼
 ┌────────────────────────────────────────────────────────┐
 │   GOOGLE APPS SCRIPT (Receptor_PU.js - Canal D)        │
 │   - Endpoint Web App con CORS y auto-sanitización      │
 │   - Aplicación de la LEY DE LA DOBLE J (JJD -> JD)     │
 └──────────────┬─────────────────────────┬───────────────┘
                │                         │
                ▼                         ▼
 ┌──────────────────────────────┐  ┌──────────────────────────────────┐
 │ BÓVEDA ALMACÉN (Amoxcalli)   │  │ GOOGLE CHAT BOT (AE_Bot_QRO)     │
 │ Hoja: RECEPCION_RAMPA        │  │ Space: AAQA-NmGVf0               │
 │ 12 Columnas Rígidas          │  │ Alerta de Cierre Notarial        │
 │ Bulto por bulto + Cierre     │  │ Dictamen de Faltantes/Excedente  │
 └──────────────┬───────────────┘  └──────────────────────────────────┘
                │
                ▼
 ┌────────────────────────────────────────────────────────┐
 │   CONCILIADOR MAESTRO (LectorIA_Pickups.js)            │
 │   - Función: conciliarRampaConBatchQRO()               │
 │   - Cruce: Query DHL vs RECEPCION_RAMPA                │
 │   - Veredicto: Marca FALTANTE_DHL_NO_INGRESADO         │
 └────────────────────────────────────────────────────────┘
```

---

## 📜 3. ESQUEMA RÍGIDO DE 12 COLUMNAS EN `RECEPCION_RAMPA`

Ubicado en el libro de Bóveda Maestro (`1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw`):

| Col | Nombre de Columna | Tipo | Descripción y Regla de Negocio |
|:---:|:---|:---:|:---|
| **A** | `ID_Recepcion` | Texto | Folio único del camión (ej. `REC-QRO-20260912-8821`). |
| **B** | `Timestamp_Escaneo` | Fecha/Hora | Marca atómica del escaneo con segundo exacto. |
| **C** | `Codigo_Original` | Texto | Código leído por el escáner (ej. `JJD014800012823954742`). |
| **D** | `PID_Sanitizado_Boveda` | Texto | Código transformado bajo la Ley de la Doble J (`JD...`). |
| **E** | `Tipo_Codigo` | Texto | `PID` (pieza) o `AWB` (guía maestra de 10 dígitos). |
| **F** | `EDD_Fisico` | Fecha | Fecha estimada de entrega impresa en la etiqueta física. |
| **G** | `Auditor_Arauto` | Texto | Responsable en andén (ej. *Irvin Reyes*). |
| **H** | `Asistente_DHL` | Texto | Chofer o asistente de entrega (ej. *Juan Pérez - Ruta 4*). |
| **I** | `Piezas_Declaradas_DHL` | Número | Total de piezas que el chofer manifestó transportar. |
| **J** | `Conteo_Acumulado` | Número | Contador secuencial del bulto (1, 2, 3... N). |
| **K** | `Estatus_Conciliacion` | Texto | `RECIBIDO_EN_RAMPA` o `DICTAMEN: EXACTO / FALTANTE_X`. |
| **L** | `Marca_Tiempo_Servidor` | Fecha/Hora | Sello de tiempo inmutable generado en la nube. |

### La Ley de la Doble J
Todo código escaneado con prefijo `JJD` (estándar de etiqueta de rampa y AppSheet) se convierte a formato `JD` al persistir en la columna D:
```javascript
function sanitizarPIDParaBoveda(pidRaw) {
  var pidClean = pidRaw.toString().trim().toUpperCase();
  if (pidClean.indexOf("JJD") === 0) {
    pidClean = "JD" + pidClean.substring(3);
  }
  return pidClean;
}
```

---

## 🤖 4. INTEGRACIÓN DE ALERTA A GOOGLE CHAT (AE_BOT_QRO)

### Endpoint Oficial del Webhook
* **URL:** `https://chat.googleapis.com/v1/spaces/AAQA-NmGVf0/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ml4k0Mmpx8c3vGco583llDQGEGJf3OY7LUMKlJjJIsY`
* **Espacio:** `AE Bot` | **Nombre del Webhook:** `AE_Bot_QRO 🤺`

### Implementación en `Receptor_PU.js`
Al disparar el subtipo `CIERRE_RECEPCION`, el servidor calcula la discrepancia numérica y formatea la tarjeta:

```javascript
// Receptor_PU.js (Líneas 84-121)
if (subtipo === "CIERRE_RECEPCION") {
  var totalRecibidas = parseInt(datos.total_recibidas) || 0;
  var diferencia = totalRecibidas - declaradasDhl;
  var estatusDictamen = diferencia < 0 ? ("FALTANTE_" + Math.abs(diferencia)) : (diferencia === 0 ? "EXACTO" : ("EXCEDENTE_" + diferencia));

  // Inyección de Fila de Cierre Notarial en Bóveda
  var filaCierre = [
    idRecepcion,
    horaServidor,
    "--- CIERRE DE PROCESO EN RAMPA ---",
    "--- CIERRE ---",
    "CIERRE",
    "---",
    auditor,
    asistenteDhl,
    declaradasDhl,
    totalRecibidas,
    "DICTAMEN: " + estatusDictamen,
    fechaHoy
  ];
  hojaRampa.appendRow(filaCierre);

  // Despacho de Alerta a Google Chat (AE_Bot_QRO)
  try {
    var urlGoogleChat = "https://chat.googleapis.com/v1/spaces/AAQA-NmGVf0/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ml4k0Mmpx8c3vGco583llDQGEGJf3OY7LUMKlJjJIsY";
    var emojiDictamen = diferencia < 0 ? "🚨 FALTANTE DETECTADO" : (diferencia === 0 ? "✅ CONCILIACIÓN EXACTA" : "⚠️ EXCEDENTE EN ANDÉN");
    var detalleDiff = "";
    if (diferencia < 0) {
      detalleDiff = "🚨 *Faltan " + Math.abs(diferencia) + " piezas* que DHL declaró pero *NO* ingresaron físicamente.";
    } else if (diferencia === 0) {
      detalleDiff = "✅ Las *" + declaradasDhl + " piezas declaradas* ingresaron íntegras al 100%.";
    } else {
      detalleDiff = "⚠️ Se recibieron *" + diferencia + " piezas físicas excedentes* no declaradas.";
    }

    var msgChat = 
      "🏁 *PAINANI — CIERRE DE PROCESO EN RAMPA (QRO)*\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "📋 *Folio Recepción:* `" + idRecepcion + "`\n" +
      "🕒 *Fecha / Hora:* " + horaServidor + "\n" +
      "👤 *Auditor Arauto:* " + auditor + "\n" +
      "🚚 *Asistente / Unidad DHL:* " + asistenteDhl + "\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "📊 *BALANCE DE CARGA FÍSICA:*\n" +
      "• Declaradas por DHL: *" + declaradasDhl + " pzs*\n" +
      "• Bipiadas en Rampa: *" + totalRecibidas + " bultos*\n" +
      "• Dictamen: *" + emojiDictamen + "*\n" +
      detalleDiff + "\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
      "🛡️ _Acta Notarial y marcas de tiempo registradas en Bóveda Central._";

    UrlFetchApp.fetch(urlGoogleChat, {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({ text: msgChat })
    });
  } catch (eChat) {
    Logger.log("Error al notificar Google Chat: " + eChat.message);
  }

  return ContentService.createTextOutput(JSON.stringify({
    exito: true,
    status: "OK",
    mensaje: "✅ Cierre de proceso en rampa registrado exitosamente.",
    id_recepcion: idRecepcion,
    total_declaradas: declaradasDhl,
    total_recibidas: totalRecibidas,
    diferencia: diferencia
  })).setMimeType(ContentService.MimeType.JSON);
}
```

---

## 📱 5. ESPECIFICACIÓN FRONTEND PWA (`painani.arauto.express`)

### Características de Interfaz y Usabilidad
1. **Foco Forzado a Prueba de Errores (Focus Lock):**  
   Intervalo activo (`focusLockInterval`, cada 600 ms) que re-enfoca automáticamente la caja de texto tras cualquier toque involuntario en pantalla, garantizando que el escáner láser de mano (Zebra/Honeywell) nunca pierda el hilo de captura.
2. **Audio-Feedback Multifrecuencia (Web Audio API):**  
   - Éxito: Tono sinusoidal limpio a 900 Hz (80 ms).
   - Error de Formato: Tono en diente de sierra a 130 Hz (350 ms).
   - Duplicado: Tono triangular dual a 450 Hz (100 ms + 100 ms).
3. **Edición en Caliente Sin Pérdida de Datos:**  
   Permite al auditor cambiar en cualquier momento:
   - Chofer/Asistente de DHL.
   - Cantidad de piezas declaradas.
   - Nombre del Auditor Arauto.
   - EDD físico activo.  
   Conserva el 100% de los escaneos previos en memoria y `localStorage`.
4. **PWA Instalable (Standalone):**  
   - `manifest.json`: Configurado con `display: standalone`, `theme_color: #f2a900`, e íconos `icon-192.png` y `icon-512.png`.
   - `sw.js`: Pre-cachea recursos para arranque instantáneo incluso en modo avión o pérdida total de cobertura celular en rampa.
   - Botón `📲 Guardar App en Pantalla`: Despliega el instalador nativo en Android Chrome o el instructivo guiado para iOS Safari.

---

## 🛡️ 6. CONCILIACIÓN AUTOMÁTICA EN BATCH MAESTRO (`LectorIA_Pickups.js`)

Cuando la Torre de Control ejecuta `ejecutarProcesamientoUnificadoQRO()`, se invoca la función de enlace:

```javascript
function conciliarRampaConBatchQRO() {
  const boveda = SpreadsheetApp.openById(CONFIG_QRO.ID_BOVEDA_BATCH_MAESTRO);
  const hojaRampa = boveda.getSheetByName("RECEPCION_RAMPA");
  const hojaBatch = boveda.getSheetByName("RAW_PIECE");

  // 1. Cargar en RAM todos los PIDs bipiados en rampa
  const dataRampa = hojaRampa.getDataRange().getValues();
  const setPidsEnRampa = new Set();
  for (let r = 1; r < dataRampa.length; r++) {
    const pid = String(dataRampa[r][3] || "").trim().toUpperCase(); // Col D: PID_Sanitizado
    if (pid && !pid.startsWith("---")) setPidsEnRampa.add(pid);
  }

  // 2. Cruce contra RAW_PIECE de DHL
  const dataBatch = hojaBatch.getDataRange().getValues();
  for (let b = 1; b < dataBatch.length; b++) {
    const pidBatch = String(dataBatch[b][1] || "").trim().toUpperCase();
    if (pidBatch && !setPidsEnRampa.has(pidBatch)) {
      // Marcar discrepancia notarial
      hojaBatch.getRange(b + 1, 11).setValue("🚨 FALTANTE_DHL_NO_INGRESADO");
    }
  }
}
```

---

## 🚀 7. GUÍA DE MANTENIMIENTO Y DESPLIEGUE

### Despliegue en Netlify
El sitio estático reside en `painini-ollin-ae` (ID: `8800a840-23ad-4f84-81b8-c541f004a840`), enlazado al dominio personalizado `https://painani.arauto.express/`.
Para sincronizar cambios:
```bash
python scratch/deploy_netlify.py
```
> **Nota de Headers:** El archivo `_headers` debe declarar explícitamente `application/manifest+json` para `manifest.json`, `image/png` para los íconos y `application/javascript` para `sw.js`.

### Despliegue en Google Apps Script
Para actualizar el backend en la nube:
```bash
npx @google/clasp push -f
```
Posteriormente, en el editor web de Google Apps Script:
1. Clic en **Implementar** ➔ **Administrar implementaciones**.
2. Seleccionar la versión activa del Webhook (`AKfycbwCKdme...`).
3. Clic en el icono de lápiz (✏️) ➔ Versión: **Nueva versión** ➔ **Implementar**.

---

## 📌 8. HISTORIAL DE VERSIONES Y CERTIFICACIÓN

* **v80.0:** Definición conceptual de Painani Rampa y diseño base.
* **v82.0:** Despliegue de Canal D (`RECEPCION_RAMPA`) en Bóveda, regla Doble J y frontend AMOLED dark en Netlify.
* **v82.5 PROD:**
  - Integración nativa de alerta a Google Chat en el espacio `AE Bot` (`AE_Bot_QRO 🤺`).
  - Adición de modal de edición en caliente de recepción sin pérdida de datos.
  - Implementación completa de PWA instalable con ícono distintivo negro y oro.
  - Cambio de nomenclatura oficial a "Cierre de Proceso en Rampa".
