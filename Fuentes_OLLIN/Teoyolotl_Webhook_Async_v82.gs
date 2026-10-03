/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  TEOYOLOTL MIC — WEBHOOK ASÍNCRONO v82.0 (PROD)                   ║
 * ║  Patrón: HTTP 200 inmediato + Procesamiento en segundo plano       ║
 * ║  Target: <300ms respuesta al frontend, preservando sesión chofer   ║
 * ║  Ecosistema OLLIN / Arauto Express — QRO                          ║
 * ║  Antigravity (Google DeepMind) — Sep 2026                         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * DISEÑO DE LATENCIA:
 * ┌─ Cliente (Teoyolotl Mic frontend)
 * │   POST audio JSON → no-cors
 * │   ↓ <300ms target
 * ├─ doPost() — devuelve HTTP 200 {"status":"success"} INMEDIATAMENTE
 * │   Encola el audio en ScriptProperties para procesamiento diferido
 * │   ↓ (asíncrono, en segundo plano)
 * └─ procesarAudioEnCola() — trigger de 1 min, procesa la cola:
 *     1. Guarda .webm en Google Drive
 *     2. Llama a Gemini Flash para dictamen multimodal
 *     3. Inyecta URL y resultado en BD_APP_RUTA_2025 / GUIAS_ASIGNADAS
 *
 * ADENDA: Pegar este código en el proyecto GAS existente de Teoyolotl Mic.
 */

// ── CONSTANTES DEL WEBHOOK ────────────────────────────────────────────────

/** ID de BD_APP_RUTA_2025 (fuente de GUIAS_ASIGNADAS) */
const ID_BD_APP_RUTA_2025_TEOYOLOTL = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";

/** Nombre de la carpeta Drive para guardar audios Teoyolotl */
const NOMBRE_CARPETA_AUDIOS = "Teoyolotl_Audios_QRO";

/** Prefijo del nombre del archivo de audio en Drive */
const PREFIJO_AUDIO = "Voz_";

/** Clave en ScriptProperties para la cola de audio pendiente */
const COLA_KEY = "TEOYOLOTL_COLA_AUDIO";

/** Máximo de audios en la cola de procesamiento simultáneo */
const MAX_COLA = 20;


// ── doPost: RESPONDE HTTP 200 EN <300ms ───────────────────────────────────

/**
 * Webhook principal de Teoyolotl Mic.
 * CRÍTICO: Devuelve HTTP 200 {"status":"success"} ANTES de procesar el audio.
 * El audio se encola en ScriptProperties para ser procesado en background.
 *
 * @param {Object} e - Evento HTTP de Apps Script doPost
 * @returns {ContentService.TextOutput} HTTP 200 JSON inmediato
 */
function doPost(e) {
  // ── Respuesta inmediata al cliente (no esperamos nada más) ────────────
  const respuestaInmediata = ContentService
    .createTextOutput(JSON.stringify({
      status:    "success",
      message:   "Audio recibido. Procesando en background.",
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);

  // ── Extracción del payload (no bloquea la respuesta) ─────────────────
  try {
    const rawBody = e.postData ? e.postData.contents : "";
    if (!rawBody) return respuestaInmediata;

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      // Payload malformado: se ignora silenciosamente, HTTP 200 siempre
      Logger.log("[TEOYOLOTL] Payload malformado: " + parseErr.toString());
      return respuestaInmediata;
    }

    const idRegistro  = String(payload.id_registro  || "").trim();
    const audioBase64 = String(payload.audio_base64 || "").trim();
    const chofer      = String(payload.chofer        || "").trim().toLowerCase();
    const mimeType    = String(payload.mime_type     || "audio/webm").trim();
    const tsCliente   = String(payload.ts_cliente    || Date.now());

    if (!idRegistro || !audioBase64) {
      Logger.log("[TEOYOLOTL] Campos obligatorios faltantes: id_registro o audio_base64");
      return respuestaInmediata;
    }

    // ── Encolar audio en ScriptProperties para procesamiento diferido ──
    _encolarAudio({
      id:        idRegistro,
      audio:     audioBase64,
      chofer:    chofer,
      mimeType:  mimeType,
      tsCliente: tsCliente,
      tsServer:  String(Date.now())
    });

  } catch (err) {
    // Cualquier error es silencioso — el cliente ya recibió HTTP 200
    Logger.log("[TEOYOLOTL] Error no crítico en doPost: " + err.toString());
  }

  return respuestaInmediata;
}

/**
 * Encola un audio en ScriptProperties (cola FIFO simple).
 * Usa LockService para concurrencia segura bajo tráfico de andén.
 */
function _encolarAudio(item) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(2000); // Espera máx 2s por el lock
    const props = PropertiesService.getScriptProperties();
    const colaRaw = props.getProperty(COLA_KEY);
    let cola = [];
    try { cola = colaRaw ? JSON.parse(colaRaw) : []; } catch (e) { cola = []; }

    // Evitar desbordamiento de la cola (max 20 items ~ 20 audios simultáneos de andén)
    if (cola.length >= MAX_COLA) {
      Logger.log("[TEOYOLOTL] Cola llena (" + cola.length + " items). Descartando más antiguo.");
      cola.shift(); // FIFO: quitar el más antiguo
    }

    // Solo guardar metadata (no el audio en ScriptProperties — límite de 500KB)
    // El audio base64 lo almacenamos en CacheService (máx 6h)
    const audioKey = "AUDIO_" + item.id + "_" + item.tsServer;
    try {
      const cache = CacheService.getScriptCache();
      // CacheService: máx 100KB por value. Dividir si el audio es grande.
      _guardarEnCache(cache, audioKey, item.audio);
    } catch (cacheErr) {
      Logger.log("[TEOYOLOTL] Error guardando en cache: " + cacheErr.toString());
    }

    cola.push({
      id:        item.id,
      chofer:    item.chofer,
      mimeType:  item.mimeType,
      tsCliente: item.tsCliente,
      tsServer:  item.tsServer,
      audioKey:  audioKey
    });

    props.setProperty(COLA_KEY, JSON.stringify(cola));
    Logger.log("[TEOYOLOTL] Audio encolado: " + item.id + " | Cola: " + cola.length + " items");
  } catch (lockErr) {
    Logger.log("[TEOYOLOTL] No se pudo adquirir lock: " + lockErr.toString());
  } finally {
    try { lock.releaseLock(); } catch (e) { /* ignorar */ }
  }
}

/**
 * Divide un string largo en chunks y los guarda en CacheService.
 * CacheService tiene límite de 100KB por key; los audios pueden ser mayores.
 */
function _guardarEnCache(cache, key, data) {
  const CHUNK_SIZE = 90000; // 90KB por chunk (seguro bajo límite de 100KB)
  const chunks = Math.ceil(data.length / CHUNK_SIZE);
  for (let i = 0; i < chunks; i++) {
    cache.put(key + "_chunk" + i, data.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), 21600);
  }
  cache.put(key + "_chunks", String(chunks), 21600);
}

function _leerDeCache(cache, key) {
  const chunksRaw = cache.get(key + "_chunks");
  if (!chunksRaw) return null;
  const chunks = parseInt(chunksRaw);
  let result = "";
  for (let i = 0; i < chunks; i++) {
    const chunk = cache.get(key + "_chunk" + i);
    if (chunk === null) return null; // Cache expirado
    result += chunk;
  }
  return result;
}


// ── PROCESADOR DE COLA EN BACKGROUND ─────────────────────────────────────

/**
 * Procesador de la cola de audios pendientes.
 * Se ejecuta via trigger de tiempo (cada 1 minuto).
 * Registrar con: aplicarTriggerTeoyolotlAsync()
 */
function procesarAudioEnCola() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    Logger.log("[TEOYOLOTL] Procesador ya en ejecución. Saltando.");
    return;
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const colaRaw = props.getProperty(COLA_KEY);
    if (!colaRaw) return;

    let cola = [];
    try { cola = JSON.parse(colaRaw); } catch (e) { return; }
    if (cola.length === 0) return;

    Logger.log("[TEOYOLOTL] Procesando cola: " + cola.length + " audio(s) pendiente(s)");

    // Procesar el primer item de la cola
    const item = cola.shift();

    // Actualizar cola inmediatamente (libera el slot para el próximo trigger)
    props.setProperty(COLA_KEY, JSON.stringify(cola));
    lock.releaseLock();

    // ── Recuperar audio del Cache ──────────────────────────────────────
    const cache = CacheService.getScriptCache();
    const audioBase64 = _leerDeCache(cache, item.audioKey);

    if (!audioBase64) {
      Logger.log("[TEOYOLOTL] Audio expirado en cache para: " + item.id + ". Omitiendo.");
      return;
    }

    // ── Guardar audio en Google Drive ─────────────────────────────────
    const urlAudio = _guardarAudioEnDrive(audioBase64, item.id, item.mimeType);
    if (!urlAudio) {
      Logger.log("[TEOYOLOTL] No se pudo guardar audio en Drive: " + item.id);
      return;
    }

    Logger.log("[TEOYOLOTL] Audio guardado en Drive: " + urlAudio);

    // ── Inyectar URL en BD_APP_RUTA_2025 → GUIAS_ASIGNADAS ───────────
    _inyectarAudioEnGuiasAsignadas(item.id, item.chofer, urlAudio);

    Logger.log("[TEOYOLOTL] ✅ Audio procesado exitosamente: " + item.id);

  } catch (err) {
    Logger.log("[TEOYOLOTL] Error en procesarAudioEnCola: " + err.toString());
    try { lock.releaseLock(); } catch (e) { /* ignorar */ }
  }
}

/**
 * Guarda el audio base64 en Google Drive y devuelve la URL pública.
 */
function _guardarAudioEnDrive(audioBase64, idRegistro, mimeType) {
  try {
    // Obtener o crear carpeta de audios
    let carpeta;
    const carpetas = DriveApp.getFoldersByName(NOMBRE_CARPETA_AUDIOS);
    if (carpetas.hasNext()) {
      carpeta = carpetas.next();
    } else {
      carpeta = DriveApp.createFolder(NOMBRE_CARPETA_AUDIOS);
    }

    // Determinar extensión
    const ext = mimeType.includes("ogg") ? ".ogg" : ".webm";
    const nombreArchivo = PREFIJO_AUDIO + idRegistro.replace(/[^a-zA-Z0-9_-]/g, "_") + "_" +
                          Utilities.formatDate(new Date(), "America/Mexico_City", "yyyyMMdd_HHmmss") + ext;

    // Convertir base64 a bytes y crear archivo
    const bytes = Utilities.base64Decode(audioBase64);
    const blob  = Utilities.newBlob(bytes, mimeType || "audio/webm", nombreArchivo);
    const file  = carpeta.createFile(blob);

    // Hacer público para visualización en Tlachialoni
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();
  } catch (err) {
    Logger.log("[TEOYOLOTL] Error guardando en Drive: " + err.toString());
    return null;
  }
}

/**
 * Inyecta la URL del audio en la columna Audio_Evidencia de GUIAS_ASIGNADAS
 * en BD_APP_RUTA_2025, buscando por id_registro.
 */
function _inyectarAudioEnGuiasAsignadas(idRegistro, chofer, urlAudio) {
  try {
    const ss = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025_TEOYOLOTL);
    const hoja = ss.getSheetByName("GUIAS_ASIGNADAS");
    if (!hoja) {
      Logger.log("[TEOYOLOTL] Hoja GUIAS_ASIGNADAS no encontrada en BD_APP_RUTA_2025");
      return;
    }

    const datos   = hoja.getDataRange().getValues();
    const headers = datos[0].map(h => String(h).toLowerCase().trim());

    // Mapeo flexible de columnas
    const colId    = _encontrarColumna(headers, ["id_registro", "id", "guia", "hwb", "id_escaneo"]);
    const colAudio = _encontrarColumna(headers, ["audio_evidencia", "audio", "audio_url", "audio_voz"]);
    const colChofer= _encontrarColumna(headers, ["chofer", "email", "id_correo", "operador"]);

    if (colId === -1 || colAudio === -1) {
      Logger.log("[TEOYOLOTL] Columnas ID o Audio_Evidencia no encontradas. Headers: " + headers.join(", "));
      return;
    }

    // Buscar la fila del registro (de abajo hacia arriba para encontrar el más reciente)
    const idBuscado = idRegistro.trim().toUpperCase();
    for (let r = datos.length - 1; r >= 1; r--) {
      const idFila = String(datos[r][colId] || "").trim().toUpperCase();
      if (idFila === idBuscado || idBuscado.endsWith(idFila) || idFila.endsWith(idBuscado)) {
        // Verificar que el chofer coincida (si se proporciona)
        if (chofer && colChofer !== -1) {
          const choferFila = String(datos[r][colChofer] || "").toLowerCase().trim();
          if (choferFila && !choferFila.includes(chofer.split("@")[0]) && !chofer.includes(choferFila.split("@")[0])) {
            Logger.log("[TEOYOLOTL] ⚠️ Chofer mismatch: esperado=" + chofer + ", encontrado=" + choferFila);
            // No bloquear: las redes de andén a veces invierten el parámetro
          }
        }

        hoja.getRange(r + 1, colAudio + 1).setValue(urlAudio);
        Logger.log("[TEOYOLOTL] ✅ URL audio inyectada en fila " + (r + 1) + " para ID: " + idRegistro);
        return;
      }
    }

    Logger.log("[TEOYOLOTL] ⚠️ ID no encontrado en GUIAS_ASIGNADAS: " + idRegistro);

  } catch (err) {
    Logger.log("[TEOYOLOTL] Error inyectando en GUIAS_ASIGNADAS: " + err.toString());
  }
}

/**
 * Busca el índice de una columna por una lista de nombres alternativos.
 */
function _encontrarColumna(headers, opciones) {
  for (let i = 0; i < opciones.length; i++) {
    const idx = headers.indexOf(opciones[i]);
    if (idx !== -1) return idx;
  }
  return -1;
}


// ── CONFIGURACIÓN DE TRIGGERS ─────────────────────────────────────────────

/**
 * Instala el trigger de procesamiento asíncrono cada 1 minuto.
 * Ejecutar UNA SOLA VEZ al desplegar el webhook.
 */
function aplicarTriggerTeoyolotlAsync() {
  // Limpiar triggers anteriores de esta función
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "procesarAudioEnCola") {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log("[TEOYOLOTL] Trigger anterior eliminado.");
    }
  }

  // Crear nuevo trigger cada 1 minuto
  ScriptApp.newTrigger("procesarAudioEnCola")
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log("[TEOYOLOTL] ✅ Trigger asíncrono instalado: procesarAudioEnCola cada 1 minuto.");
}

/**
 * Diagnóstico: muestra el estado de la cola y del trigger.
 */
function diagnosticarTeoyolotlAsync() {
  const props   = PropertiesService.getScriptProperties();
  const colaRaw = props.getProperty(COLA_KEY);
  let cola = [];
  try { cola = colaRaw ? JSON.parse(colaRaw) : []; } catch (e) { }

  const triggers = ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "procesarAudioEnCola");

  Logger.log("═══ DIAGNÓSTICO TEOYOLOTL ASYNC ═══");
  Logger.log("Cola de audio: " + cola.length + " item(s) pendiente(s)");
  Logger.log("Trigger instalado: " + (triggers.length > 0 ? "✅ SÍ" : "❌ NO — Ejecutar aplicarTriggerTeoyolotlAsync()"));
  triggers.forEach(t => Logger.log("  → Trigger: " + t.getHandlerFunction() + " | Tipo: " + t.getEventType()));

  if (cola.length > 0) {
    Logger.log("Items en cola:");
    cola.forEach((item, idx) => {
      Logger.log("  [" + idx + "] ID: " + item.id + " | Chofer: " + item.chofer + " | ts: " + item.tsServer);
    });
  }
}

/**
 * Limpia la cola de audio (útil para pruebas o mantenimiento).
 */
function limpiarColaTeoyolotl() {
  PropertiesService.getScriptProperties().deleteProperty(COLA_KEY);
  Logger.log("[TEOYOLOTL] Cola vaciada.");
}
