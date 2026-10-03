# 📜 AMOXCALLI: BARRIDO MASIVO DE BANDEJA GMAIL A INBOX ZERO E INGESTA HISTÓRICA DHL

**Fecha:** 2026-09-23  
**Bandeja Depurada:** `sidharta.santiago@arauto.express`  
**Autor:** Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)  
**Módulo Operativo:** Frente 6 — Depuración Masiva y Clasificación Autónoma  
**Certificación:** 🟢 INBOX ZERO ALCANZADO (0 correos anteriores a 2026-09-23)

---

## 1. Contexto Operativo y Problema Raíz
La bandeja de entrada principal de Sidharta Santiago (`sidharta.santiago@arauto.express`) acumulaba **18,645 correos históricos** entre aclaraciones de entrega DHL, manifiestos de ruta, hojas de cobro, reportes y alertas del andén de Querétaro y León.

Esta saturación impedía una supervisión ágil de las incidencias del Frente 6 en tiempo real y aumentaba el riesgo de extravío de solicitudes de aclaración urgentes.

---

## 2. Decisiones de Arquitectura e Implementación

### A. Habilitación de Gmail REST API & OAuth2 Scopes
* Se utilizó la identidad corporativa Workspace `Profile 2` (`sidharta.santiago@arauto.express`) en Google Cloud Console para habilitar la **Gmail API** bajo el proyecto oficial `658565429526` (`arauto-express-qro`).
* El token central en `.agents/google_token.json` cuenta con el alcance maestro `https://mail.google.com/`, `https://www.googleapis.com/auth/spreadsheets` y `https://www.googleapis.com/auth/drive`.

### B. Etiquetas Canónicas Estructuradas
Se aseguraron y crearon vía API las etiquetas maestras:
* `03_RECLAMOS_DHL/HISTORICO_ARCHIVADO` (ID: `Label_30`): Para todas las aclaraciones, reclamos de HWB, direcciones no localizadas y entregas no reconocidas anteriores al 2026-09-23.
* `DHL_OPERATIVO_HISTORICO` (ID: `Label_31`): Para manifiestos, reportes de corte, notificaciones operativas generales y facturación.

### C. Pipeline de Depuración por Lotes (`depurar_gmail_masivo.py`)
* **Fase 1 (Reclamos DHL):** Barrido de la consulta `in:inbox before:2026/09/23 (Aclaración OR Reclamo OR HWB OR "Dirección no localizada" OR "Entrega no reconocida" OR label:03_RECLAMOS_DHL)`. Procesó **2,486 correos**, asignando `03_RECLAMOS_DHL/HISTORICO_ARCHIVADO` y desarchivándolos del Inbox.
* **Fase 2 (Barrido Operativo General):** Barrido masivo de la consulta `in:inbox before:2026/09/23` en lotes de 500 correos vía `batchModify` asignando `DHL_OPERATIVO_HISTORICO` y removiendo `INBOX`.
* **Protección de Datos:** Ningún correo fue destruido ni enviado a la papelera. Todo el acervo documental reside intacto y categorizado en `[Gmail]/Todos` bajo sus respectivas etiquetas de auditoría.

---

## 3. Métricas Oficiales de Certificación

| Parámetro | Valor Certificado |
|---|---|
| **Total de correos desarchivados** | **18,645** |
| **Lotes de batchModify ejecutados** | **33 lotes** |
| **Correos de Reclamos DHL categorizados** | **2,486** |
| **Correos Operativos archivados** | **16,159** |
| **Correos remanentes antes de 2026-09-23** | **0 (Cero absoluto)** |
| **Estatus Final de Inbox** | 🟢 **INBOX ZERO CERTIFICADO** |

---

## 4. Estado Actual del Frente 6
1. La bandeja de entrada cuenta únicamente con los correos del día presente (26 correos activos).
2. El demonio de escucha `escudo_reclamos_dhl.py` v2.0 PROD opera en vivo:
   - Detecta reclamos nuevos en tiempo real.
   - Aplica extracción cognitiva con Gemini 3.6 Flash.
   - Inyecta la incidencia en `MONITOR_INCIDENCIAS_AE` (esquema rígido de 25 columnas, Ley Doble J `JD`).
   - Envía alertas push duales vía Calpixqui WhatsApp a Sidharta e Irvin Reyes.
   - Etiqueta como `03_RECLAMOS_DHL/PROCESADOS` y archiva de Inbox para mantener el Inbox Zero permanentemente.
