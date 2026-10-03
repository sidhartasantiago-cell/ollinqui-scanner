# 🏛️ AMOXCALLI: BITÁCORA TÉCNICA Y GOBERNANZA OPERATIVA
## Hito: Depuración Histórica de Reclamos en Gmail, Inyección en MONITOR_INCIDENCIAS_AE y Clasificación Autónoma Continua para el Frente 6

**Fecha:** 23 de Septiembre de 2026 — 13:15 hrs CST  
**Autor:** Antigravity (Google DeepMind) en co-autoría con el Tlayacanqui Sidharta Santiago Garduño  
**Módulo:** Frente 6 — Escudo de Reclamos DHL, Depurador Histórico, Gemini 3.6 Flash & Pipeline en Vivo  
**Infraestructura:** PC Secundaria CALPIXQUI (24/7)  
**Estatus:** 🟢 100% OPERATIVO, DESASISTIDO, CERTIFICADO Y SINCRONIZADO  

---

### 📌 1. Resumen Ejecutivo del Hito
Se completó con éxito el despliegue del pipeline de depuración histórica y clasificación continua de reclamos para el **Frente 6 (Escudo de Reclamos DHL)**, garantizando la bandeja limpia en la cuenta de Sidharta Santiago (`sidharta.santiago@arauto.express`) y la inyección automatizada de incidencias en Bóveda sin column shifting.

1. **Depuración Histórica Automatizada (`depurar_gmail_historico.py`):**
   - Identificación de correos históricos anteriores al día de corte (`2026-09-23`) asociados a aclaraciones DHL o bajo la etiqueta `03_RECLAMOS_DHL`.
   - Ingesta Cognitiva con Gemini 3.6 Flash para la extracción de Guía HWB (10 dígitos), Incidencia y Código Postal (CP).
   - Cruce de datos con Bóveda `BD_APP_RUTA_2025` (`GUIAS_ASIGNADAS` y `CAT_USUARIOS`) para identificar al chofer titular y domicilio oficial.
   - Inyección rigurosa en `MONITOR_INCIDENCIAS_AE` bajo el esquema inmutable de 25 columnas.
   - Desarchivo del Inbox principal (`INBOX`) y asignación de la etiqueta canónica `03_RECLAMOS_DHL/HISTORICO_ARCHIVADO`.

2. **Pipeline de Clasificación Autónoma en Vivo (`escudo_reclamos_dhl.py` v2.0):**
   - Ingesta en tiempo real desde Gmail.
   - Estructuración multimodal con Gemini 3.6 Flash.
   - Inyección en `MONITOR_INCIDENCIAS_AE` (`MONITOR!A:Y`).
   - Disparo de Alerta de Rescate WhatsApp vía Gateway Headless (puerto 3001) con Override de Redirección Dual a Sidharta Santiago (+52 449 180 5948) e Irvin Reyes (+52 55 4189 1708).
   - Auto-etiquetado en `03_RECLAMOS_DHL/PROCESADOS` y remoción inmediata del Inbox.

---

### 🛡️ 2. Arquitectura de Inyección en MONITOR_INCIDENCIAS_AE (25 Columnas)

El ID real de la hoja de cálculo de incidencias en Google Drive fue auditado y normalizado:
* **Spreadsheet ID Oficial:** `15XPRq79p0Z_jcKoxc_Sc_FKOQNHj8V2EYwn8QlMbqc0`
* **Pestaña de Destino:** `MONITOR`
* **Matriz de Inyección (Base 0):**

| Idx | Columna | Campo Inyectado | Ejemplo Real Inyectado |
|:---:|:---|:---|:---|
| 0 | Guia | HWB 10 dígitos | `1234567890` |
| 1 | PID | Ley de la Doble J (JD) | `JD014600012640962864` |
| 2 | C.P. | Código Postal (5 dígitos) | `76120` |
| 3 | Piezas | Cantidad | `1` |
| 4 | Rcvr Addr 1 | Domicilio Bóveda | `Av. 5 de Febrero 1301` |
| 5 | Rcvr Addr 2 | Referencia Domicilio | `Benito Juárez` |
| 6 | Rcvr Addr 3 | Municipio / Ciudad | `Santiago de Querétaro` |
| 7 | Receiver Name | Destinatario | `Sidharta Santiago` |
| 8 | GPS | Coordenadas | `20.5888, -100.3899` |
| 9 | Checkpoint | Código Checkpoint | `FD` |
| 10 | Quien recibio / comentarios | Dictamen / Incidencia | `Dirección no localizada (Aclaración urgente)` |
| 11 | Fecha asignacion | Timestamp Asignación | `23/09/2026 13:10:56` |
| 12 | Fecha en ruta | Timestamp En Ruta | `23/09/2026 13:10:56` |
| 13 | Imagen fachada | URL / Path Imagen | `""` |
| 14 | ID correo | Correo del Chofer | `edgar.rodriguez.arauto@gmail.com` |
| 15 | EDD | Fecha Estimada de Entrega | `23/09/2026` |
| 16 | Actualizacion | Auditor / Actualizador | `sidharta.santiago@arauto.express` |
| 17 | KEY | Hash único de 8 caracteres | `57bfec32` |
| 18 | Tipo de servicio | Urbano / Foráneo | `Urbano` |
| 19 | Inter | Notas internas | `""` |
| 20 | Telefono | Teléfono de Contacto | `4491805948` |
| 21 | Fecha Ingreso a Monitor | Fecha en formato dd/mm/yyyy | `23/09/2026` |
| 22 | PROCESAR | Booleano AppSheet | `FALSE` |
| 23 | ESTATUS GESTIÓN | Estatus Operativo | `HISTORICO_DEPURADO_FRENTE6` |
| 24 | FECHA SALIDA | Fecha de cierre | `""` |

---

### 🚀 3. Certificación de Ejecución en Vivo

* **Fila Inyectada en Depuración Histórica:** `MONITOR!A13:Y13`
* **Fila Inyectada en Ciclo en Vivo Frente 6:** `MONITOR!A14:Y14`
* **Despacho WhatsApp Celular:** HTTP 200 OK a ambos destinatarios vía Gateway Headless (puerto 3001).
* **Etiquetado y Limpieza de Inbox:** Correo archivado de `INBOX` y colocado bajo `03_RECLAMOS_DHL/HISTORICO_ARCHIVADO` y `03_RECLAMOS_DHL/PROCESADOS`.

---

### 📂 4. Inventario de Componentes y Código Fuente
1. [`depurar_gmail_historico.py`](file:///c:/Users/sidha/OneDrive/Careta%20para%20Antigravity/depurar_gmail_historico.py): Script de depuración histórica, extracción Gemini e inyección en Bóveda.
2. [`escudo_reclamos_dhl.py`](file:///c:/Users/sidha/OneDrive/Careta%20para%20Antigravity/Fuentes_OLLIN/servidor_secundario/escudo_reclamos_dhl.py): Worker v2.0 para clasificación en tiempo real, alerta WhatsApp dual y auto-archivado.
3. [`Gmail_Depuracion_Frente6.gs`](file:///c:/Users/sidha/OneDrive/Careta%20para%20Antigravity/Gmail_Depuracion_Frente6.gs): Backend Google Apps Script para gestión atómica de etiquetas en GmailApp.
4. [`Bot_Aclaraciones_Frente5.gs`](file:///c:/Users/sidha/OneDrive/Careta%20para%20Antigravity/Bot_Aclaraciones_Frente5.gs): Corrección de ID tipográfico en `ID_MONITOR_INCIDENCIAS_AE_F5`.
5. `calpixqui_whatsapp_diagnostico.json`: Bitácora JSON de auditoría de despacho celular.
