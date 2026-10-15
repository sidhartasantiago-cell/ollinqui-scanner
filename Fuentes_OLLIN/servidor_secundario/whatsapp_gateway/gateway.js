/**
 * ================================================================================
 * 🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
 * MÓDULO: GATEWAY HEADLESS WHATSAPP PARA AGENTE CALPIXQUI
 * ARCHIVO: whatsapp_gateway/gateway.js
 * VERSIÓN: 1.0.0 PROD
 * AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)
 * ================================================================================
 *
 * Gateway HTTP local (localhost:3001) que conecta CALPIXQUI con WhatsApp
 * de forma 100% programática y headless, sin depender de GUI ni pyautogui.
 *
 * FLUJO:
 *   1. whatsapp-web.js se conecta a la sesión de WhatsApp autenticada por QR.
 *   2. La sesión se persiste en ./session/ para reutilización (sin repetir QR).
 *   3. CALPIXQUI hace POST a http://localhost:3001/send-message con el payload.
 *   4. El gateway despacha el mensaje directamente a la red de WhatsApp.
 *
 * PAYLOAD ESPERADO:
 *   { "to": "524491805948@c.us", "message": "🏛️ CALPIXQUI..." }
 *
 * ENDPOINTS:
 *   GET  /health         -> Estatus del cliente y conexión
 *   GET  /resolve-group  -> Resolver un nombre exacto de grupo sin enviar
 *   POST /send-message   -> Enviar mensaje
 *   GET  /qr             -> Obtener el QR como texto en la consola (si no autenticado)
 *
 * POST /send-message acepta Idempotency-Key; las claves con resultado ambiguo
 * quedan persistidas y bloqueadas para impedir que un reintento duplique el envío.
 * ================================================================================
 */

'use strict';

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
let qrcode;
try {
  qrcode = require('qrcode');
} catch (_) {
  qrcode = null;
}
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('node:crypto');
const { createIdempotencyStore } = require('./idempotency_store');

// ── Configuración ──────────────────────────────────────────────────────────────
const GATEWAY_HOST = process.env.WHATSAPP_GATEWAY_HOST || '127.0.0.1';
const GATEWAY_PORT = parseInt(process.env.WHATSAPP_GATEWAY_PORT || '3001', 10);
const OLLIN_INTERNAL_SECRET = process.env.OLLIN_INTERNAL_SECRET || 'ollin_enterprise_calpixqui_secret_2026';
// ⚠️ Session FUERA de OneDrive para evitar conflictos EBUSY de SQLite durante sync
const SESSION_DIR  = process.env.WHATSAPP_SESSION_DIR || path.join(process.env.USERPROFILE || 'C:\\Users\\sidha', '.calpixqui_session');
const LOG_DIR      = process.env.WHATSAPP_GATEWAY_LOG_DIR || path.join(__dirname, '..', 'logs');
const IDEMPOTENCY_DIR = process.env.WHATSAPP_IDEMPOTENCY_DIR || path.join(LOG_DIR, 'send_idempotency');
const idempotencyStore = createIdempotencyStore(IDEMPOTENCY_DIR);

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
if (!fs.existsSync(LOG_DIR))     fs.mkdirSync(LOG_DIR,     { recursive: true });
if (!fs.existsSync(IDEMPOTENCY_DIR)) fs.mkdirSync(IDEMPOTENCY_DIR, { recursive: true });

// ── Logger simple con marca de tiempo ─────────────────────────────────────────
function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
function log(level, msg) {
  const line = `${ts()} [${level}] [WhatsAppGateway] ${msg}`;
  console.log(line);
  try {
    const logFile = path.join(LOG_DIR, `hermes_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.log`);
    fs.appendFileSync(logFile, line + '\n', 'utf8');
  } catch(_) {}
}

// ── Estado del Gateway ─────────────────────────────────────────────────────────
const state = {
  ready: false,
  qrCode: null,
  qrDataUrl: null,
  clientInfo: null,
  sentCount: 0,
  lastSent: null,
  errorCount: 0,
};

// ── Cliente WhatsApp ───────────────────────────────────────────────────────────
log('INFO', '🏛️ Iniciando Gateway Headless WhatsApp — Agente CALPIXQUI');
log('INFO', `📁 Directorio de sesión: ${SESSION_DIR}`);

// Resolver ruta de Chrome instalado por puppeteer (headless, sin GUI)
let chromePath;
try {
  chromePath = require('puppeteer').executablePath();
  log('INFO', `🔵 Chrome headless path: ${chromePath}`);
} catch (e) {
  log('WARN', `⚠️ No se pudo obtener executablePath de puppeteer: ${e.message}. Usando Chrome del sistema.`);
  chromePath = undefined;
}

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'calpixqui-arauto',
    dataPath: SESSION_DIR,
  }),
  puppeteer: {
    headless: true,
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled',
    ],
  },
});

client.on('qr', async (qr) => {
  state.qrCode = qr;
  state.ready = false;
  log('INFO', '');
  log('INFO', '════════════════════════════════════════════════════════════════');
  log('INFO', '📲 QR LISTO — ESCANEA CON WHATSAPP EN TU TELÉFONO:');
  log('INFO', '   Abre WhatsApp → Dispositivos vinculados → Vincular un dispositivo');
  log('INFO', '════════════════════════════════════════════════════════════════');
  qrcodeTerminal.generate(qr, { small: true });
  log('INFO', '════════════════════════════════════════════════════════════════');

  // Guardar archivo QR de texto y PNG
  try {
    fs.writeFileSync(path.join(SESSION_DIR, 'qr_data.txt'), qr, 'utf8');
    if (qrcode) {
      const qrPath = path.join(SESSION_DIR, 'qr_calpixqui.png');
      await qrcode.toFile(qrPath, qr, { width: 400 });
      state.qrDataUrl = await qrcode.toDataURL(qr, { width: 400 });
      log('INFO', `🖼️ Imagen QR guardada en: ${qrPath}`);
    }
  } catch (err) {
    log('WARN', `No se pudo guardar archivo QR PNG: ${err.message}`);
  }
});

client.on('authenticated', () => {
  log('INFO', '✅ Sesión autenticada correctamente. Guardando credenciales...');
  state.qrCode = null;
  state.qrDataUrl = null;
});

client.on('auth_failure', (msg) => {
  log('ERROR', `❌ Falla de autenticación: ${msg}`);
  state.ready = false;
});

client.on('ready', () => {
  state.ready = true;
  state.qrCode = null;
  state.qrDataUrl = null;
  state.clientInfo = client.info;
  log('INFO', '🟢 Cliente WhatsApp LISTO y CONECTADO.');
  log('INFO', `   Número vinculado: ${client.info?.wid?.user || 'desconocido'}`);
  log('INFO', `   Nombre del dispositivo: ${client.info?.pushname || 'desconocido'}`);
  log('INFO', `   Puerto HTTP: ${GATEWAY_PORT}`);
});

client.on('disconnected', (reason) => {
  state.ready = false;
  log('WARN', `⚠️ Cliente desconectado. Motivo: ${reason}`);
});

client.on('message_create', (msg) => {
  if (msg.fromMe) {
    log('INFO', `📤 Mensaje saliente confirmado → ${msg.to}`);
  }
});

const LID_TO_PHONE_CACHE = {
  '131284936487041@lid': '5661562361' // Diego (Sierra Gorda)
};

function resolvePhoneByPochtecaName(rawName) {
  if (!rawName) return '';
  const clean = String(rawName)
    .replace(/[~@#*()]/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase();
  if (!clean) return '';
  try {
    const dirPath = path.resolve(__dirname, '../data/directorio_pochtecas.json');
    if (fs.existsSync(dirPath)) {
      const dir = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
      for (const email in dir) {
        const p = dir[email];
        const pName = String(p.nombre || '')
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .trim().toLowerCase();
        if (pName && (clean === pName || clean.startsWith(pName + ' ') || clean.includes(' ' + pName))) {
          return String(p.telefono || '').replace(/\D/g, '');
        }
      }
    }
  } catch (errDir) {
    log('WARN', `Error consultando directorio_pochtecas.json para nombre "${rawName}": ${errDir.message}`);
  }
  return '';
}

function isValidMexicanPhone(numStr) {
  const d = String(numStr || '').replace(/\D/g, '');
  return d.length === 10 || (d.length === 12 && d.startsWith('52')) || (d.length === 13 && d.startsWith('521'));
}

async function resolveSenderPhone(cli, m) {
  const isGrp = (m.from || '').endsWith('@g.us');
  let sId = isGrp ? (m.author || m.from) : m.from;
  if (!sId) return '';

  if (LID_TO_PHONE_CACHE[sId]) {
    return LID_TO_PHONE_CACHE[sId];
  }

  if (sId.includes('@lid')) {
    const lidDigits = sId.replace(/\D/g, '');
    try {
      if (typeof cli.getContactLidAndPhone === 'function') {
        const lidInfo = await cli.getContactLidAndPhone([sId]);
        if (Array.isArray(lidInfo) && lidInfo[0] && lidInfo[0].pn) {
          const pnDigits = String(lidInfo[0].pn).replace(/\D/g, '');
          if (isValidMexicanPhone(pnDigits)) {
            LID_TO_PHONE_CACHE[sId] = pnDigits;
            log('INFO', `Mapped LID ${sId} via getContactLidAndPhone to: ${pnDigits}`);
            return pnDigits;
          }
        }
      }
    } catch (_) {}

    try {
      const contact = await cli.getContactById(sId);
      if (contact) {
        const cand = String(contact.number || '').replace(/\D/g, '');
        if (cand && cand !== lidDigits && isValidMexicanPhone(cand)) {
          LID_TO_PHONE_CACHE[sId] = cand;
          log('INFO', `Mapped LID ${sId} via contact.number to: ${cand}`);
          return cand;
        }
        const nameCand = (m._data && m._data.notifyName) || contact.pushname || contact.name || contact.shortName || '';
        const byName = resolvePhoneByPochtecaName(nameCand);
        if (byName) {
          LID_TO_PHONE_CACHE[sId] = byName;
          log('INFO', `Mapped LID ${sId} via notifyName "${nameCand}" to phone: ${byName}`);
          return byName;
        }
      }
    } catch (eLid) {
      log('WARN', `No se pudo resolver LID ${sId} a PN: ${eLid.message}`);
    }

    const fallbackName = (m._data && m._data.notifyName) || '';
    const byFallbackName = resolvePhoneByPochtecaName(fallbackName);
    if (byFallbackName) {
      LID_TO_PHONE_CACHE[sId] = byFallbackName;
      log('INFO', `Mapped LID ${sId} via fallback notifyName "${fallbackName}" to phone: ${byFallbackName}`);
      return byFallbackName;
    }
  }
  return sId;
}

const RE_COMANDO_ASIGNAR_JS = /\b(asigna|asignar|as[ií]gnamela|as[ií]gnamelo|as[ií]gnalas|as[ií]gnalos|asigname|as[ií]gname|m[ií]a|m[ií]o|cargo|cargan|cargar|c[aá]rgame|cargame|cargas|la\s+llevo|me\s+la\s+llevo|lo\s+llevo|yo\s+la\s+entrego|yo\s+lo\s+entrego|reparto|ruta|!asigna|\/asigna|#asigna)\b/i;

// ── Manejo de Mensajes Entrantes (Geolocalización Predictiva CALPIXQUI) ─────────
client.on('message', async (msg) => {
  try {
    const from = msg.from || '';
    // Normalizar número celular a 10 dígitos (elimina prefijos 52, 521, etc.)
    let digits = from.replace(/\D/g, '');
    if (digits.startsWith('521') && digits.length === 13) digits = digits.slice(3);
    else if (digits.startsWith('52') && digits.length === 12) digits = digits.slice(2);

    // CASO 1: El cliente envía un Pin de Ubicación
    if (msg.type === 'location' && msg.location) {
      const lat = parseFloat(msg.location.latitude);
      const lng = parseFloat(msg.location.longitude);
      log('INFO', `📍 UBICACIÓN RECIBIDA vía WhatsApp de ${digits}: [${lat}, ${lng}]`);

      const manifestPath = path.resolve(__dirname, '../../../Entrega_Masiva_PWA/manifiesto_activo.json');
      let actualizado = false;
      let nombreCliente = '';
      let guiaEncontrada = '';

      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          const pidsLookup = manifest.pids_lookup || {};

          for (const pidKey in pidsLookup) {
            const item = pidsLookup[pidKey];
            const itemTel = String(item.tel || '').replace(/\D/g, '');
            if (itemTel && (itemTel.endsWith(digits) || digits.endsWith(itemTel))) {
              item.lat = lat;
              item.lng = lng;
              item.geo_fuente = 'CALPIXQUI_WHATSAPP';
              item.geo_confianza = 'ALTA_PIN_CLIENTE';
              item.geo_timestamp = new Date().toISOString();
              actualizado = true;
              nombreCliente = item.destinatario || '';
              guiaEncontrada = item.hwb || '';
            }
          }

          if (actualizado) {
            for (const chofer in (manifest.choferes || {})) {
              for (const item of manifest.choferes[chofer]) {
                const itemTel = String(item.tel || '').replace(/\D/g, '');
                if (itemTel && (itemTel.endsWith(digits) || digits.endsWith(itemTel))) {
                  item.lat = lat;
                  item.lng = lng;
                  item.geo_fuente = 'CALPIXQUI_WHATSAPP';
                  item.geo_confianza = 'ALTA_PIN_CLIENTE';
                  item.geo_timestamp = new Date().toISOString();
                }
              }
            }
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
            log('INFO', `✅ Manifiesto actualizado con pin WhatsApp para guía ${guiaEncontrada} (${nombreCliente})`);
          }
        } catch(eMan) {
          log('ERROR', `Error actualizando manifiesto con pin: ${eMan.message}`);
        }
      }

      // Responder amablemente al cliente
      const saludoNombre = nombreCliente ? ` ${nombreCliente.split(' ')[0]}` : '';
      const respuesta = `✅ ¡Muchas gracias${saludoNombre}! Hemos recibido tu ubicación exacta en tiempo real. 📍\n\nNuestro Pochteca la tiene integrada en su hoja de ruta asistida para entregarte hoy. 🚚📦\n\n_Arauto Express para DHL Express México_`;
      await msg.reply(respuesta);
    }

    // CASO 2: Pochteca o Tlayacanqui envía imagen de Guía/PID para auto-asignación
    if (msg.hasMedia && (msg.type === 'image' || msg.type === 'document')) {
      const isGroup = from.endsWith('@g.us');
      const senderNumber = await resolveSenderPhone(client, msg);
      log('INFO', `📸 IMAGEN/MEDIA RECIBIDA para asignación: de ${senderNumber} en ${from} (Grupo: ${isGroup})`);


      // 1. Reacción táctil inmediata (<200ms)
      try {
        await msg.react('⏳');
      } catch (eReact) {
        log('WARN', `No se pudo emitir reacción ⏳: ${eReact.message}`);
      }

      // 2. Descargar imagen en base64 con reintento si falla por LID
      let media = null;
      try {
        const downloadPromise = msg.downloadMedia();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de 15s al descargar multimedia')), 15000));
        media = await Promise.race([downloadPromise, timeoutPromise]);
      } catch (errMedia) {
        log('WARN', `Primer intento de downloadMedia falló (${errMedia.message}). Reintentando tras breve pausa...`);
        try {
          await new Promise(r => setTimeout(r, 1200));
          media = await msg.downloadMedia();
        } catch (errMedia2) {
          log('ERROR', `Reintento de downloadMedia falló: ${errMedia2.message}`);
        }
      }

      const calpixquiWebhookUrl = process.env.CALPIXQUI_VISION_WEBHOOK || 'http://localhost:8088/webhook/whatsapp_imagen_asignacion';
      
      // Si se descargó la imagen, enviamos OCR completo; si falló la descarga pero hay texto en caption o cuerpo, mandamos fallback
      fetch(calpixquiWebhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-OLLIN-TOKEN': OLLIN_INTERNAL_SECRET 
        },
        body: JSON.stringify({
          message_id: (msg.id && (msg.id._serialized || msg.id.id)) || '',
          chat_id: msg.from,
          sender: senderNumber,
          is_group: isGroup,
          caption: msg.body || '',
          mimetype: (media && media.mimetype) || 'image/jpeg',
          image_base64: (media && media.data) || '',
          timestamp: msg.timestamp || Math.floor(Date.now() / 1000)
        })
      }).then(async (resp) => {
        if (resp.ok) {
          log('INFO', `✅ Media/Solicitud despachada exitosamente a Calpixqui (${calpixquiWebhookUrl})`);
        } else {
          log('WARN', `⚠️ Calpixqui respondió HTTP ${resp.status} al recibir media`);
        }
      }).catch((errFetch) => {
        log('ERROR', `❌ Error contactando worker Calpixqui: ${errFetch.message}`);
      });
    }

    // CASO 3: Mensaje de TEXTO (directo o citando/respondiendo a otro mensaje con guías o foto)
    if (!msg.hasMedia && msg.body && typeof msg.body === 'string') {
      const texto = msg.body.trim();
      const isGroup = from.endsWith('@g.us');
      let senderNumber = await resolveSenderPhone(client, msg);
      let textoEfectivo = texto;
      let quotedMedia = null;

      // Si el mensaje responde (cita) a un mensaje anterior (ej. "Me cargan esas porfavor" o "@Calpixqui asigna porfavor")
      if (msg.hasQuotedMsg && RE_COMANDO_ASIGNAR_JS.test(texto)) {
        try {
          const quotedMsg = await msg.getQuotedMessage();
          if (quotedMsg) {
            const quotedSender = await resolveSenderPhone(client, quotedMsg);
            // Si quien responde es un supervisor/compañero pidiendo asignar las guías del mensaje citado, asignar al autor de las guías
            if (quotedSender && isValidMexicanPhone(quotedSender)) {
              senderNumber = quotedSender;
            }
            if (quotedMsg.body) {
              textoEfectivo = `${texto}\n${quotedMsg.body}`;
            }
            if (quotedMsg.hasMedia && (quotedMsg.type === 'image' || quotedMsg.type === 'document')) {
              try {
                quotedMedia = await quotedMsg.downloadMedia();
              } catch (eQm) {
                log('WARN', `No se pudo descargar media del mensaje citado: ${eQm.message}`);
              }
            }
          }
        } catch (eQuote) {
          log('WARN', `No se pudo obtener mensaje citado: ${eQuote.message}`);
        }
      }

      const guiasEncontradas = [...new Set(textoEfectivo.match(/\b\d{10}\b/g) || [])];
      const tieneComandoAsignar = RE_COMANDO_ASIGNAR_JS.test(textoEfectivo);
      const baseMsgId = (msg.id && (msg.id._serialized || msg.id.id)) || `msg_${Date.now()}`;
      const calpixquiWebhookUrl = process.env.CALPIXQUI_VISION_WEBHOOK || 'http://localhost:8088/webhook/whatsapp_imagen_asignacion';

      // Subcaso 3A: Citó una imagen diciendo "asigna porfavor" / "me cargan esa"
      if (quotedMedia && tieneComandoAsignar) {
        log('INFO', `📸 IMAGEN CITADA RECIBIDA para asignación: para ${senderNumber} en ${from}`);
        try { await msg.react('⏳'); } catch (_) {}
        fetch(calpixquiWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-OLLIN-TOKEN': OLLIN_INTERNAL_SECRET
          },
          body: JSON.stringify({
            message_id: baseMsgId,
            chat_id: msg.from,
            sender: senderNumber,
            is_group: isGroup,
            caption: textoEfectivo,
            mimetype: quotedMedia.mimetype || 'image/jpeg',
            image_base64: quotedMedia.data || '',
            timestamp: msg.timestamp || Math.floor(Date.now() / 1000)
          })
        }).then(async (resp) => {
          if (resp.ok) log('INFO', `✅ Imagen citada despachada a Calpixqui`);
        }).catch(e => log('ERROR', `❌ Error despachando imagen citada: ${e.message}`));
      }
      // Subcaso 3B: Texto (directo o citado) con 1 o más guías de 10 dígitos
      else if (guiasEncontradas.length > 0 && (tieneComandoAsignar || !isGroup)) {
        log('INFO', `📝 TEXTO CON ${guiasEncontradas.length} GUÍA(S) RECIBIDO (${guiasEncontradas.join(', ')}): para ${senderNumber} en ${from}`);

        try {
          await msg.react('⏳');
        } catch (_) {}

        for (let idx = 0; idx < guiasEncontradas.length; idx++) {
          const guia = guiasEncontradas[idx];
          const subMsgId = guiasEncontradas.length > 1 ? `${baseMsgId}_${guia}` : baseMsgId;
          const captionPorGuia = `${guia} ${texto}`;
          fetch(calpixquiWebhookUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-OLLIN-TOKEN': OLLIN_INTERNAL_SECRET
            },
            body: JSON.stringify({
              message_id: subMsgId,
              chat_id: msg.from,
              sender: senderNumber,
              is_group: isGroup,
              caption: captionPorGuia,
              mimetype: 'text/plain',
              image_base64: '', // Sin imagen, se resolverá por número de guía puro
              timestamp: msg.timestamp || Math.floor(Date.now() / 1000)
            })
          }).then(async (resp) => {
            if (resp.ok) log('INFO', `✅ Comando de texto para guía ${guia} despachado a Calpixqui`);
          }).catch(e => log('ERROR', `❌ Error despachando texto (${guia}): ${e.message}`));
        }
      }
    }
  } catch (err) {
    log('ERROR', `Error en listener de mensajes: ${err.message}`);
  }
});

// Inicializar el cliente
client.initialize().catch((err) => {
  log('ERROR', `❌ Error al inicializar cliente WhatsApp: ${err.message}`);
});

// ── Servidor HTTP Express ──────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '25mb' }));

// Middleware de logging de peticiones
app.use((req, _res, next) => {
  log('INFO', `→ ${req.method} ${req.path}`);
  next();
});

/**
 * GET /health y GET /status
 * Retorna el estado del gateway y la conexión WhatsApp.
 */
const healthHandler = (_req, res) => {
  res.status(200).json({
    status: state.ready ? 'ONLINE' : 'CONNECTING',
    ready: state.ready,
    has_qr: !!state.qrCode,
    numero_vinculado: state.clientInfo?.wid?.user || null,
    pushname: state.clientInfo?.pushname || null,
    sent_count: state.sentCount,
    last_sent: state.lastSent,
    error_count: state.errorCount,
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/status', healthHandler);

async function getGroupSummaries() {
  try {
    const chats = await client.getChats();
    return {
      groups: chats
        .filter(chat => chat.isGroup)
        .map(chat => ({ name: chat.name || '', id: chat.id?._serialized || '' })),
      method: 'client.getChats',
    };
  } catch (getChatsError) {
    log('WARN', `getChats falló; consultando metadatos directos de grupos (${getChatsError?.message || getChatsError})`);
    try {
      const result = await client.pupPage.evaluate(() => {
        const models = window.require('WAWebCollections').Chat.getModelsArray();
        const groups = [];
        const errors = [];
        for (const chat of models) {
          try {
            if (!chat.groupMetadata) continue;
            const id = chat.id?._serialized || '';
            const name = chat.formattedTitle || chat.name || '';
            if (id && name) groups.push({ name, id });
          } catch (error) {
            errors.push(String(error?.message || error));
          }
        }
        return { groups, skipped: errors.length, errors: errors.slice(0, 5) };
      });
      return { ...result, method: 'raw_group_metadata' };
    } catch (fallbackError) {
      fallbackError.getChatsError = String(getChatsError?.stack || getChatsError);
      throw fallbackError;
    }
  }
}

app.get('/resolve-group', async (req, res) => {
  const wantedName = String(req.query.name || '').trim().toLocaleLowerCase();
  if (!wantedName) {
    return res.status(400).json({
      ok: false,
      error: 'Falta el parámetro name.',
      phase: 'validate',
      delivery_started: false,
    });
  }
  if (!state.ready) {
    return res.status(503).json({
      ok: false,
      error: 'Cliente WhatsApp aún no está listo.',
      phase: 'ready',
      delivery_started: false,
    });
  }
  try {
    const result = await getGroupSummaries();
    const matches = result.groups
      .filter(chat => String(chat.name || '').trim().toLocaleLowerCase() === wantedName);
    return res.status(200).json({
      ok: true,
      matches,
      lookup_method: result.method,
      skipped_chats: result.skipped || 0,
      lookup_warnings: result.errors || [],
    });
  } catch (err) {
    log('ERROR', `Fallo al consultar grupos (${err?.stack || err}; getChats=${err?.getChatsError || 'n/a'})`);
    return res.status(502).json({
      ok: false,
      code: 'GROUP_LIST_FAILED',
      error: String(err?.message || err),
      fallback_error: err?.getChatsError || null,
      phase: 'group_lookup',
      delivery_started: false,
    });
  }
});

/**
 * POST /send-message
 * Envía un mensaje de WhatsApp de forma headless.
 *
 * Body: { "to": "524491805948@c.us", "message": "texto..." }
 * Alternativas aceptadas: { "telefono": "524491805948", "mensaje": "texto..." }
 */
app.post('/send-message', async (req, res) => {
  const body = req.body || {};
  const idempotencyKey = String(req.get('Idempotency-Key') || body.idempotency_key || '').trim();
  let phase = 'validate';
  let deliveryStarted = false;
  let idempotencyReserved = false;

  // Normalizar número de destino
  let to = body.to || body.number || body.telefono || body.recipient || '';
  let message = body.message || body.mensaje || body.text || body.msg || '';

  if (!to || !message) {
    return res.status(400).json({
      ok: false,
      error: 'Faltan campos: to (número) y message (texto) son requeridos.',
      campos_recibidos: Object.keys(body),
      phase,
      delivery_started: false,
    });
  }
  if (idempotencyKey.length > 200) {
    return res.status(400).json({
      ok: false,
      error: 'Idempotency-Key excede 200 caracteres.',
      phase,
      delivery_started: false,
    });
  }

  // Normalizar destino al formato de chatId de WhatsApp (respetando grupos @g.us y chats directos @c.us)
  let targetChatId = '';
  let digits = '';

  if (to.endsWith('@g.us') || to.endsWith('@c.us')) {
    targetChatId = to;
  } else {
    digits = to.replace(/\D/g, '');
    if (digits.length === 10) {
      digits = `52${digits}`;
    } else if (digits.startsWith('521') && digits.length === 13) {
      digits = '52' + digits.slice(3);
    }
    targetChatId = digits ? `${digits}@c.us` : '';
  }

  log('INFO', `📱 Solicitud de envío → ${targetChatId || to}: "${message.slice(0, 80)}..."`);

  if (!state.ready) {
    log('WARN', '⏳ Cliente no listo. Retornando 503.');
    return res.status(503).json({
      ok: false,
      error: 'Cliente WhatsApp aún no está listo. Intenta en 10-30 segundos.',
      ready: false,
      has_qr: !!state.qrCode,
      phase: 'ready',
      delivery_started: false,
    });
  }

  try {
    if (!targetChatId) {
      phase = 'group_lookup';
      const wantedName = to.trim().toLocaleLowerCase();
      const result = await getGroupSummaries();
      const matches = result.groups.filter(chat =>
        String(chat.name || '').trim().toLocaleLowerCase() === wantedName
      );
      if (matches.length !== 1) {
        return res.status(matches.length ? 409 : 404).json({
          ok: false,
          code: matches.length ? 'GROUP_NAME_AMBIGUOUS' : 'GROUP_NOT_FOUND',
          error: matches.length ? 'Nombre de grupo ambiguo.' : 'No se encontró el grupo con nombre exacto.',
          phase,
          delivery_started: false,
        });
      }
      targetChatId = matches[0].id;
      log('INFO', `Grupo resuelto por nombre exacto: ${targetChatId}`);
    }

    // Intentar resolver el ID verificado de WhatsApp solo para números individuales
    if (!targetChatId.endsWith('@g.us') && digits) {
      try {
        const numberIdPromise = client.getNumberId(digits);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout determinando numberId en WhatsApp')), 10000));
        const numberId = await Promise.race([numberIdPromise, timeoutPromise]);
        if (numberId && numberId._serialized) {
          targetChatId = numberId._serialized;
        }
      } catch (_) {}
    }

    // Verificar si se solicitó adjuntar imagen/media
    let mediaPath = body.mediaPath || body.media_path || body.imagePath || body.image_path || '';
    let media = null;
    if (mediaPath && fs.existsSync(mediaPath)) {
      try {
        media = MessageMedia.fromFilePath(mediaPath);
        log('INFO', `📎 Adjuntando archivo multimedia: ${mediaPath}`);
      } catch (eMedia) {
        log('WARN', `⚠️ Error cargando archivo multimedia (${mediaPath}): ${eMedia.message}`);
      }
    }

    const fingerprint = crypto.createHash('sha256')
      .update(`${targetChatId}\0${message}`, 'utf8')
      .digest('hex');
    if (idempotencyKey) {
      const previous = idempotencyStore.reserve(idempotencyKey, {
        state: 'sending',
        fingerprint,
        target: targetChatId,
        created_at: new Date().toISOString(),
      });
      if (previous) {
        if (previous.fingerprint !== fingerprint) {
          return res.status(409).json({
            ok: false,
            code: 'IDEMPOTENCY_KEY_CONFLICT',
            error: 'La clave ya se usó con un destino o mensaje distinto.',
            phase: 'idempotency',
            delivery_started: previous.state !== 'sent',
          });
        }
        if (previous.state === 'sent') {
          return res.status(200).json({
            ok: true,
            duplicate: true,
            estatus: 'ENVIADO_HEADLESS_WHATSAPP',
            to: targetChatId,
            message_id: previous.message_id,
            timestamp: previous.timestamp,
          });
        }
        return res.status(409).json({
          ok: false,
          code: 'DELIVERY_OUTCOME_UNCERTAIN',
          error: 'Esta clave ya inició un envío; verifica WhatsApp antes de reintentar.',
          phase: 'idempotency',
          delivery_started: true,
        });
      }
      idempotencyReserved = true;
    }

    const sendWithTimeout = (target, content, options) => {
      const pSend = options ? client.sendMessage(target, content, options) : client.sendMessage(target, content);
      const pTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de 20s al despachar mensaje en Puppeteer')), 20000));
      return Promise.race([pSend, pTimeout]);
    };

    phase = 'send';
    deliveryStarted = true;

    let sentMsg;
    if (media) {
      sentMsg = await sendWithTimeout(targetChatId, media, { caption: message, sendMediaAsDocument: true });
    } else {
      sentMsg = await sendWithTimeout(targetChatId, message);
    }
    state.sentCount++;
    state.lastSent = new Date().toISOString();
    const msgId = (sentMsg && sentMsg.id && (sentMsg.id._serialized || sentMsg.id.id)) || 'ok_headless';
    if (idempotencyKey) {
      try {
        idempotencyStore.update(idempotencyKey, {
          state: 'sent',
          fingerprint,
          target: targetChatId,
          message_id: msgId,
          timestamp: state.lastSent,
          created_at: new Date().toISOString(),
        });
      } catch (persistErr) {
        log('ERROR', `Mensaje confirmado pero no se pudo persistir idempotencia (${persistErr?.stack || persistErr})`);
      }
    }

    log('INFO', `🚀 Mensaje entregado exitosamente. MsgID: ${msgId}`);
    return res.status(200).json({
      ok: true,
      estatus: 'ENVIADO_HEADLESS_WHATSAPP',
      to: targetChatId,
      message_id: msgId,
      timestamp: state.lastSent,
    });
  } catch (err) {
    state.errorCount++;
    if (idempotencyReserved) {
      try {
        const previous = idempotencyStore.read(idempotencyKey);
        idempotencyStore.update(idempotencyKey, {
          ...previous,
          state: 'uncertain',
          updated_at: new Date().toISOString(),
        });
      } catch (persistErr) {
        log('ERROR', `No se pudo persistir el resultado incierto (${persistErr?.stack || persistErr})`);
      }
    }
    log('ERROR', `❌ Error enviando mensaje durante ${phase} (${err?.stack || err})`);
    return res.status(500).json({
      ok: false,
      error: String(err?.message || err),
      estatus: 'ERROR_ENVIO',
      phase,
      fallback_error: err?.getChatsError || null,
      delivery_started: deliveryStarted,
    });
  }
});

/**
 * POST /capture-location
 * Inyecta una coordenada de ubicación de cliente directamente al manifiesto activo.
 * Payload esperado: { "tel": "4191087976", "lat": 20.598, "lng": -100.41, "hwb": "1133871690" }
 */
app.post('/capture-location', (req, res) => {
  const body = req.body || {};
  const lat = parseFloat(body.lat);
  const lng = parseFloat(body.lng);
  const tel = String(body.tel || '').replace(/\D/g, '');
  const hwb = String(body.hwb || '').trim();

  if (!lat || !lng || (!tel && !hwb)) {
    return res.status(400).json({ ok: false, error: 'Faltan parámetros: lat, lng y (tel o hwb) son requeridos.' });
  }

  const manifestPath = path.resolve(__dirname, '../../../Entrega_Masiva_PWA/manifiesto_activo.json');
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ ok: false, error: 'manifiesto_activo.json no existe.' });
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    let actualizado = false;
    let guiaMatch = '';

    const pidsLookup = manifest.pids_lookup || {};
    for (const pidKey in pidsLookup) {
      const item = pidsLookup[pidKey];
      const matchTel = tel && String(item.tel || '').replace(/\D/g, '').endsWith(tel.slice(-10));
      const matchHwb = hwb && String(item.hwb || '').trim() === hwb;
      if (matchTel || matchHwb) {
        item.lat = lat;
        item.lng = lng;
        item.geo_fuente = 'CALPIXQUI_WHATSAPP';
        item.geo_confianza = 'ALTA_PIN_CLIENTE';
        item.geo_timestamp = new Date().toISOString();
        actualizado = true;
        guiaMatch = item.hwb;
      }
    }

    if (actualizado) {
      for (const chofer in (manifest.choferes || {})) {
        for (const item of manifest.choferes[chofer]) {
          const matchTel = tel && String(item.tel || '').replace(/\D/g, '').endsWith(tel.slice(-10));
          const matchHwb = hwb && String(item.hwb || '').trim() === hwb;
          if (matchTel || matchHwb) {
            item.lat = lat;
            item.lng = lng;
            item.geo_fuente = 'CALPIXQUI_WHATSAPP';
            item.geo_confianza = 'ALTA_PIN_CLIENTE';
            item.geo_timestamp = new Date().toISOString();
          }
        }
      }
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      log('INFO', `✅ Ubicación inyectada exitosamente para guía ${guiaMatch} [${lat}, ${lng}]`);
      return res.status(200).json({ ok: true, guia: guiaMatch, lat: lat, lng: lng, fuente: 'CALPIXQUI_WHATSAPP' });
    } else {
      return res.status(404).json({ ok: false, error: 'No se encontró guía activa que coincida con tel/hwb proporcionado.' });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /react-message
 * Modifica la reacción emoji de un mensaje específico en WhatsApp.
 * Payload: { "messageId": "true_...@c.us_...", "reaction": "✅" }
 */
app.post('/react-message', async (req, res) => {
  const body = req.body || {};
  const messageId = body.messageId || body.message_id || '';
  const reaction = body.reaction || body.emoji || '✅';

  if (!messageId) {
    return res.status(400).json({ ok: false, error: 'messageId es requerido' });
  }

  try {
    const msg = await client.getMessageById(messageId);
    if (msg) {
      await msg.react(reaction);
      log('INFO', `✨ Reacción '${reaction}' aplicada a mensaje ${messageId}`);
      return res.json({ ok: true, messageId, reaction });
    } else {
      return res.status(404).json({ ok: false, error: 'Mensaje no encontrado para reaccionar' });
    }
  } catch (err) {
    log('WARN', `Error aplicando reacción a ${messageId}: ${err.message}`);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /qr-text
 * Devuelve el código QR en texto plano para logging externo.
 */
app.get('/qr-text', (_req, res) => {
  if (!state.qrCode) {
    return res.json({
      ok: false,
      message: state.ready ? 'Ya autenticado, no se necesita QR.' : 'QR aún no generado, espera unos segundos.',
      ready: state.ready,
    });
  }
  res.json({ ok: true, qr: state.qrCode });
});

/**
 * GET /qr-image
 * Devuelve la imagen QR en formato PNG o HTML para escaneo directo.
 */
app.get('/qr-image', (_req, res) => {
  const qrPath = path.join(SESSION_DIR, 'qr_calpixqui.png');
  if (fs.existsSync(qrPath)) {
    res.setHeader('Content-Type', 'image/png');
    return fs.createReadStream(qrPath).pipe(res);
  }
  if (state.ready) {
    return res.send('<html><body><h2>✅ Gateway ya autenticado. Dispositivo vinculado.</h2></body></html>');
  }
  res.status(404).send('<html><body><h2>⏳ Generando QR, refresca en 5 segundos...</h2></body></html>');
});

/**
 * GET /qr-html
 * Devuelve una página HTML limpia con el código QR para escanear en navegador.
 */
app.get('/qr-html', (_req, res) => {
  if (state.ready) {
    return res.send(`
      <html><body style="font-family:sans-serif; text-align:center; padding:50px;">
        <h1 style="color:green;">🟢 Calpixqui WhatsApp Gateway Activo</h1>
        <p>Número vinculado: <b>${state.clientInfo?.wid?.user || 'Vinculado'}</b></p>
        <p>Dispositivo: <b>${state.clientInfo?.pushname || 'Arauto Express'}</b></p>
      </body></html>
    `);
  }
  if (state.qrDataUrl) {
    return res.send(`
      <html><body style="font-family:sans-serif; text-align:center; padding:30px;">
        <h2>📲 Escanea este QR con WhatsApp:</h2>
        <p>Abre WhatsApp en tu celular → Menú ⋮ o Ajustes → Dispositivos vinculados → Vincular dispositivo</p>
        <img src="${state.qrDataUrl}" style="border: 4px solid #333; border-radius: 8px; margin: 20px auto; display:block;" />
        <script>setTimeout(() => location.reload(), 15000);</script>
      </body></html>
    `);
  }
  res.send('<html><body><h3>⏳ Esperando código QR... recarga en 3 segundos</h3><script>setTimeout(() => location.reload(), 3000);</script></body></html>');
});

// ── Inicio del Servidor ────────────────────────────────────────────────────────
app.listen(GATEWAY_PORT, GATEWAY_HOST, () => {
  log('INFO', `🏛️ Gateway HTTP CALPIXQUI escuchando en http://${GATEWAY_HOST}:${GATEWAY_PORT}`);
  log('INFO', '   Endpoints disponibles:');
  log('INFO', `   GET  http://localhost:${GATEWAY_PORT}/health`);
  log('INFO', `   POST http://localhost:${GATEWAY_PORT}/send-message`);
  log('INFO', `   GET  http://localhost:${GATEWAY_PORT}/qr-text`);
});

// ── Manejo de señales de cierre ────────────────────────────────────────────────
process.on('SIGINT', async () => {
  log('INFO', '🔴 Señal SIGINT recibida. Cerrando gateway...');
  try { await client.destroy(); } catch(_) {}
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('INFO', '🔴 Señal SIGTERM recibida. Cerrando gateway...');
  try { await client.destroy(); } catch(_) {}
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log('ERROR', `💥 Excepción no capturada: ${err.message}`);
  log('ERROR', err.stack || '');
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', `💥 Rechazo de promesa no capturado: ${reason}`);
  if (reason && reason.stack) log('ERROR', reason.stack);
});
