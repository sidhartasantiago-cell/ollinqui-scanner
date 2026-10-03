# 🏛️ AMOXCALLI — MEMORIA TÉCNICA CANÓNICA
## AUDITORÍA, BLINDAJE Y OPTIMIZACIÓN: SISTEMA DE RECLUTAMIENTO POCHTECAS v1.0 PROD

**Fecha:** 24 de Septiembre de 2026  
**Módulo:** Reclutamiento de Socios Pochtecas / Front & Back End  
**Tenant Oficial:** `arauto.express`  
**Propietario Legal:** `sidharta.santiago@arauto.express`  
**Nuevo Script ID (Corporativo):** `1jD4E8u2TFhifdi1SBEoaCp2fMXvc3A0-00vUBOeDTEjYVA7myvathFu0`  
**Deployment ID:** `AKfycbwcqW3I9jAJUaHfl_n3DNAhnBtW1ZGbatYSTbp8OSORaBdcIoOdWmQgnlaGAttU-yUH4Q` (Versión 1)  
**URL de Producción Corporativa (/exec):**  
`https://script.google.com/macros/s/AKfycbwcqW3I9jAJUaHfl_n3DNAhnBtW1ZGbatYSTbp8OSORaBdcIoOdWmQgnlaGAttU-yUH4Q/exec`  
**Script ID Anterior (Deprecado por Regla de Tenant):** `1hV6T6BmD0uJxykSxwdrYl0FcmwyTVYt7uI6d5FSyTeCG7Fn8jmnk4KkH`  
**Autor:** Antigravity (Google DeepMind) & Sidharta Santiago (Tlayacanqui)

---

### 1. Diagnóstico Forense y Causa Raíz de Permisos

#### A. Hoja de Cálculo Vinculada
- **Spreadsheet ID configurado:** `1Qu9q7LCBIY5PcWYqKwroIRX9b57NCOwmvbP-cQJ_hGQ` (*LEN BD CENTRAL 2023*).
- **Propietario:** `sidharta.santiago@arauto.express`.
- **Permisos de Escritura:** Confirmados y vigentes para `sidharta.santiago@gmail.com` e `irvin.reyes@arauto.express`.
- **Hoja Destino:** `RECLUTAMIENTO_POCHTECAS` (creada automáticamente con formato ejecutivo dark mode y cabeceras frozen en caso de no existir).
- **Flexibilidad Dinámica:** Se integró fallback configurable vía `PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID")`.

#### B. Causa Raíz del Error HTTP 403 / "Necesitas Acceso"
- Al desplegar vía Clasp con `"executeAs": "USER_DEPLOYING"` y `"access": "ANYONE_ANONYMOUS"`, Google Apps Script requiere que la cuenta desplegadora (`sidharta.santiago@gmail.com`) autorice por primera vez los scopes OAuth (`spreadsheets` y `script.external_request`).
- Mientras no se otorgue el consentimiento en la interfaz web de Google, las peticiones anónimas reciben `403 Forbidden` ("Necesitas acceso") y la cuenta propietaria recibe la pantalla "Authorization needed".
- **Solución Poka-Yoke:** Con un solo clic de autorización desde el editor de Apps Script o abriendo el enlace `/exec` logueado con la cuenta propietaria, el formulario queda 100% abierto y público para cualquier aspirante.

---

### 2. Actualización de Zonas Operativas en Index.html

Se reestructuraron las opciones del menú desplegable (`#zona_interes`) y el subtítulo del encabezado para reflejar las plazas estratégicas de Querétaro:

1. `ZONA SRJ - Santa Rosa Jáuregui (Parques Industriales y Comunidades)`
2. `ZONA 5 - El Marqués / Oriente (La Cañada, La Griega, Chichimequillas)`
3. `Sierra Gorda (Daniel Juárez / Alta Montaña)`
4. `Todas las Zonas / Sin Preferencia (Disponibilidad Total)`

---

### 3. Alerta de Rescate 24/7 con Calpixqui & Google Chat

Se implementó el motor desacoplado `despacharAlertaAspiranteApto_(candidato)` en `Code.js`:

- **Criterio de Disparo:** Cada vez que el filtro Poka-Yoke califica a un candidato como **APTO** (vehículo modelo $\ge 2021$ y no sedán compacto).
- **Canal 1 (Google Chat Webhook):**
  - Espacio de Coordinación Mesa de Control (`AAQA-NmGVf0`).
  - Despacho inmediato y nativo nube-a-nube.
  - Alerta enriquecida con nombre, teléfono, enlace directo a WhatsApp (`wa.me/52...`), zona solicitada, tipo de unidad, año, foto y diagnóstico.
  - Notifica en tiempo real a **Sidharta Santiago** (+52 449 180 5948) e **Irvin Reyes** (+52 55 4189 1708).
- **Canal 2 (Calpixqui WhatsApp Gateway - Puerto 3001):**
  - Compatible con el gateway headless de Calpixqui (`/send-message`).
  - Si se define `CALPIXQUI_GATEWAY_URL` en Script Properties (túnel público o proxy), envía WhatsApp directo a `524491805948@c.us` y `525541891708@c.us`.
- **Endpoint Headless `doPost(e)`:**
  - Soporta envíos externos JSON/REST desde portales web (Netlify) o llamadas programáticas con protección CORS.

---

### 4. Checklist de Validación y Despliegue
- [x] Sincronización local-remoto vía Clasp: `npx @google/clasp push -f` (3 archivos: `appsscript.json`, `Code.js`, `Index.html`).
- [x] Creación de Versión Inmutable 2: `npx @google/clasp version "v1.1 - Optimizacion Zonas y Alerta 24/7"`.
- [x] Redespliegue de Producción: `npx @google/clasp deploy -i AKfycbw7dn_yT_J9Jfhrhe55RKBDrpQv1yv87AP9f51zxaaURPdgAH8KXDeMsVEIpdJZNZKdpg -V 2`.
- [x] Prueba de fuego de webhook Google Chat (Status 200 OK certificado).
- [x] Función de prueba administrativa integrada: `testNotificacionApto()`.
