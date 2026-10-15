# Instrucciones para GitHub Copilot — Ecosistema OLLIN (Arauto Express)

Autoridad: Tlayacanqui Sidharta Santiago. Responde en español, con viñetas cortas y negritas, sin muros de texto (perfil TDA).

## 1. Reglas inviolables
- **Tenant:** todo activo (Apps Script, Sheets, GCP, Netlify) vive bajo `sidharta.santiago@arauto.express`. Si `clasp`/`gcloud` muestran una cuenta `@gmail.com`, **detente** y pide la cuenta corporativa. Nunca mezclar con el universo clínico (`psic.liliana.lopez@arauto.express`).
- **Ley de la Doble J:** rampa/AppSheet/Netlify usan `JJD...`; Sheets/Bóveda/Facturación guardan `JD...`.
  ```js
  function sanitizarPIDParaBoveda(pidRaw) {
    var p = pidRaw.toString().trim().toUpperCase();
    return p.indexOf("JJD") === 0 ? "JD" + p.substring(3) : p;
  }
  ```
- **VALIDACIÓN_QRO_2025:** prohibido reordenar o desplazar columnas sin autorización expresa.
  - Esquema vigente (v84): 15 columnas — Guia, PID, CP, Checkpoint, Receptor, Firma, Foto_Fachada, Audio_Teoyolotl, GPS, Pochteca, Fecha_Entrega, Aprobacion_Auditor, Motivo_Rechazo, Auditor_Validador, Marca_Tiempo.
  - Existe una regla legada de 25 columnas (`.agents/rules/ollin-esquema-v77.md`: KEY en Col Q/idx 16, Telefono en Col U/idx 20). **Si un cambio toca esta hoja, pregunta cuál esquema aplica antes de escribir.**
- **Secretos:** nunca commitear API keys ni tokens. Usa Script Properties / variables de entorno. En worktrees, reemplaza claves por `ENV_..._PROTECTED`.
- **Sandbox de la Sala de Guerra:** fail-closed. Python se rechaza; JS solo en Docker `--network none` o AppContainer. No reintroducir fallbacks sin aislamiento.

## 2. Reglas y agentes de referencia
- `GEMINI.md` (raíz): reglas maestras.
- `.agents/rules/`: `ollin-esquema-v77.md`, `rampa_pids.md`, `ollin-seguridad-appsheet.md`, `ollin-diccionario-nahuatl.md`.
- `.agents/skills/`: `ollin-clasp-deploy`, `prudencia-sheets-corrector`, `triada`, `ollin-teoyolotl-mic-v3`, `appsheet-editor`, `last-mile-dashboard`, `gcp-enterprise-setup`.
- Memoria técnica (Amoxcalli): `G:\Mi unidad\Fuentes_NotebookLM_Amoxcalli_AE\AMOXCALLI_BITACORA_MAESTRA_SISTEMAS_Y_OPERACIONES.md`. **Al cerrar cada hito, agrega una entrada breve ahí** (decisión, causa raíz, archivos).

## 3. Mapa del proyecto Apps Script
- `scriptId`: `1OPEYOE5qQPz-Jn5998dtGvMXexLyrPBuTNQVlDmZdHybg7Jh78OkSMjB` (`.clasp.json`, `rootDir: "."`).
- `Code.gs`: router `doGet`/`doPost` (acciones por `?action=`/`?accion=`); delega webhooks a `Receptor_PU.js`.
- `Resumen_Ruta_LEN.gs`: resumen FD por usuario/día de la hoja "Ruta LEN" (BD `1Qu9q7LCBIY5PcWYqKwroIRX9b57NCOwmvbP-cQJ_hGQ`).
  - `enviarResumenDiarioRutaLEN()` → correo + WhatsApp.
  - `enviarResumenDiarioRutaLENSoloWhatsApp()` → solo WhatsApp.
- Despliegue: `clasp push -f`. Deployment `@HEAD`: `AKfycbyfyurFyz6WDKbcGp2F0Ay6hc5tGCggtcktu1FbO08`. Web App `executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS`.
- Mesh Tailscale: Calpixqui PC-B `100.107.18.69` (exec en `:8088`), Tlacuilo `100.88.199.126`, Chikahua `100.116.189.87`, laptop `100.69.207.81`.

## 4. Pendientes abiertos (en orden)
1. **Seguridad — URGENTE:** `Code.gs` expone `?action=resumen_len_wa` sin autenticación en una Web App `ANYONE_ANONYMOUS`. Antes de publicar una versión numerada, exige `token` comparado contra la Script Property `OLLIN_RUN_TOKEN` y responde 403 si no coincide.
2. **WhatsApp por modelo "pull" (outbox):** Apps Script **no puede** llegar a IPs de Tailscale (`UrlFetchApp` → `Bad request`).
   - Apps Script escribe el mensaje en una hoja outbox (`OUTBOX_WA`: id, creado, destino, mensaje, estado=`PENDIENTE`).
   - Calpixqui hace polling (Web App con token o Sheets API), envía por el gateway local y marca `ENVIADO`/`ERROR`.
   - Reutiliza el patrón outbox que ya existe en Calpixqui.
3. **Google Chat como canal principal:** webhook de León ya existe en `Code.gs` (`GOOGLE_CHAT_WEBHOOK_URL_LEN`). Moverlo a Script Property en vez de dejarlo en el código.
4. **`clasp run`:** requiere vincular el script a un proyecto GCP estándar del tenant (ver sección 5). Hasta entonces, ejecuta vía Web App con token.

## 5. Habilitar `clasp run` (lo hace Sidharta, una sola vez)
1. Google Cloud Console (cuenta `@arauto.express`): crear/elegir proyecto, habilitar **Apps Script API**, pantalla de consentimiento OAuth tipo **Interno**, crear **ID de cliente OAuth → App de escritorio**, descargar el JSON.
2. Apps Script → ⚙️ Configuración del proyecto → **Proyecto de Google Cloud → Cambiar proyecto** → pegar el **número** del proyecto.
3. Terminal: `clasp login --creds <ruta_al_json>` y luego `clasp run enviarResumenDiarioRutaLENSoloWhatsApp`.
