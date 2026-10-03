# 📜 AMOXCALLI: Especificación de Arquitectura y Fuente Técnica — PAINANI v83.0 PROD
## Filtro Anti-AWB (Ley "J de Oro"), Piloto Internacional por EDD y Acta Notarial de Discrepancias
**Documento Técnico Canónico para el Amoxcalli y Fuente Maestra para NotebookLM**  
*Plaza Querétaro (QRO) — Arauto Express*  
*Fecha de Certificación: Septiembre 2026*

---

> [!IMPORTANT]
> **Estatus:** Desplegado, Certificado y Validado para Producción en Andén.  
> **URL Producción PWA:** `https://painani.arauto.express/`  
> **Backend Webhook:** `Receptor_PU.js` (Canal D: `RECEPCION_RAMPA` & `CIERRE_RECEPCION`)  
> **Alerta Automática:** Google Chat Space `AAQA-NmGVf0` (Bot: `AE_Bot_QRO 🤺`)  
> **Destino Bóveda Almacén:** ID `1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw` (`RECEPCION_RAMPA`)  
> **Autoridad:** Tlayacanqui Sidharta Santiago / Auditor de Rampa Irvin Reyes.  
> **Axioma Supremo OLLIN:** *"La información digital propone, pero la acción física dispone."*

---

## 🧭 1. GÉNESIS DE LA REINGENIERÍA v83.0

En la operación matutina de rampa de Arauto Express en el andén de Querétaro, se identificaron tres vectores de fricción y riesgo operativo que motivaron esta reingeniería:

1. **La Contaminación del Odómetro por Guías AWB:**  
   Los operadores escaneaban involuntariamente el código de barras de la guía de embarque (AWB de 10 dígitos) en lugar de la etiqueta de pieza individual (PID de 20 dígitos). Esto inflaba artificialmente el odómetro físico, provocando falsos "conteo exacto" cuando en realidad faltaban piezas físicas.
2. **La Rigidez de la Separación Física en Material Internacional:**  
   Los envíos internacionales llegaban en cargas mixtas de alta dispersión. Obligar a los estibadores a separar físicamente por rampas/chutes antes de registrar provocaba cuellos de botella y demoras de hasta 40 minutos en el andén.
3. **La Ausencia de Firma Notarial en Discrepancias:**  
   Cuando existía discrepancia numérica entre lo que el chofer de DHL decía transportar y lo que físicamente bajaba al andén, no se contaba con un desglose explícito de los PIDs específicos y un bloque formal para firma in situ del chofer, debilitando el blindaje legal de Arauto Express ante auditorías de DHL.

---

## 🏛️ 2. ESPECIFICACIÓN DE LAS TRES DIRECTRICES v83.0

### 2.1. FILTRO ANTI-AWB EN DISPARO DE RAMPA (LEY "J DE ORO")
- **Regla Estricta de Negocio:**  
  Solo se acumula y suma al odómetro físico (`odometerCount`) si el código bipiado inicia con el prefijo `"JJD"` (o `"JD"`) y tiene más de 10 caracteres (`length > 10`).
- **Detección de AWB (10 Dígitos Numéricos Puros):**  
  Si el código cumple `/^\d{10}$/`:
  - **Cero Impacto en Odómetro:** No suma al contador de bultos físicos.
  - **Audio Distinctivo ("Beep de Guía"):** Tono armónico dual (750 Hz + 1050 Hz) sintetizado mediante Web Audio API que notifica al auditor que se leyó una guía maestra y no una pieza física.
  - **Registro en `AWB_Asociada`:** Se almacena en la sesión activa y se proyecta en una barra secundaria dorada bajo el odómetro.
  - **Herencia en PIDs:** Todos los PIDs físicos escaneados posteriormente quedan formalmente vinculados a dicha `AWB_Asociada`.

### 2.2. PRUEBA PILOTO MATERIAL INTERNACIONAL POR FECHA (EDD)
- **Selector de Modo Operativo:**  
  Permite alternar entre `📦 Modo Estándar (Nacional)` y `🌐 Piloto Internacional por EDD` tanto en la apertura como en caliente durante el escaneo.
- **Agrupador Dinámico por Fecha Prometida (EDD):**  
  Chips de acceso táctil rápido (`[Hoy]`, `[Mañana]`, `[+2 Días]`, `[+3 Días]`) que cambian instantáneamente la fecha activa con haptic/visual feedback.
- **Resolución Automática de C.P. y Zona Logística:**  
  Motor cliente (offline-first) embebido con la matriz logística de Plaza Querétaro (Zonas 1 a 8) y Sierra Gorda Guanajuato (Zona 9 - Daniel Juárez).  
  Al escanear un C.P. (5 dígitos) o un composite, la pantalla proyecta en microsegundos:
  ```text
  📍 DESTINO: C.P. 76148 ➔ ZONA 3 - NORTE / JURIQUILLA (RUTA 03)
  ℹ️ Agrupado por EDD en pantalla — Sin requerir separación física por rampa
  ```
  Esto permite estibar por fecha directamente sobre tarimas sin caminar por el andén.

### 2.3. ACTA NOTARIAL DE DISCREPANCIA CON DHL
- **Desglose de Discrepancias:**  
  Si `Piezas_Declaradas_DHL != Piezas_Escaneadas_Reales`:
  - Se genera un texto formateado para WhatsApp y Google Chat.
  - Incluye herramienta de cruce con manifiesto DHL para identificar automáticamente:
    - `❌ PIDs Faltantes Declarados pero No Entregados`.
    - `⚠️ PIDs Sobrantes Físicos en Andén No Declarados`.
- **Bloque de Firma de Chofer de DHL:**  
  Genera el apartado de comparecencia legal:
  ```text
  ✍️ FIRMA DE CONFORMIDAD DEL ASISTENTE / CHOFER DHL:
  Nombre Asistente: [Nombre]
  Firma Chofer:     ______________________________
  Unidad / Ruta:    ______________________________
  Hora de Firma:    [HH:MM:SS]
  ```
- **Alerta Despachada a Google Chat (`AE_Bot_QRO 🤺`):**  
  Envío directo al espacio `AAQA-NmGVf0` conteniendo el dictamen, la diferencia numérica y la lista de PIDs para auditoría corporativa.

---

## 📱 3. ARQUITECTURA DE DATOS Y COMPATIBILIDAD CON BÓVEDA

### Esquema Rígido de 12 Columnas en `RECEPCION_RAMPA`
La inyección conserva de forma estricta las 12 columnas canónicas:
- **Col A:** `ID_Recepcion`
- **Col B:** `Timestamp_Escaneo`
- **Col C:** `Codigo_Original`
- **Col D:** `PID_Sanitizado_Boveda` (Ley Doble J: `JJD` ➔ `JD`)
- **Col E:** `Tipo_Codigo` (`PID` o `AWB`)
- **Col F:** `EDD_Fisico`
- **Col G:** `Auditor_Arauto`
- **Col H:** `Asistente_DHL`
- **Col I:** `Piezas_Declaradas_DHL`
- **Col J:** `Conteo_Acumulado`
- **Col K:** `Estatus_Conciliacion` (Enriquecido con `[AWB:...]` y `[ZONA:...]`)
- **Col L:** `Marca_Tiempo_Servidor`

---

## 🛡️ 4. INSTRUCTIVO DE DESPLIEGUE Y CERTIFICACIÓN

1. **Frontend PWA:** Actualizado en `Painani_Rampa_Frontend/index.html` y sincronizado a `Escaner-Listo/index.html`.
2. **Backend Webhook:** Sincronizado vía `clasp push -f` en `Receptor_PU.js` (Script ID: `1OPEYOE5qQPz-Jn5998dtGvMXexLyrPBuTNQVlDmZdHybg7Jh78OkSMjB`).
3. **Pruebas Unitarias:** 8 pruebas de suite ejecutadas y aprobadas al 100% (AWB 10d, PID JJD/JD, Ley J de Oro, CP 5d, Matriz CP local y rechazo de códigos truncados).
