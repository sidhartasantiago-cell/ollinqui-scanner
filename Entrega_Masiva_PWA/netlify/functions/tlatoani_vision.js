/**
 * 🏛️ TLATOANI VISION (NETLIFY SERVERLESS)
 * Ingesta In-Route por Visión IA de Guías Físicas Huérfanas de DHL Express.
 * Ecosistema OLLIN (Arauto Express) - Tenant: sidharta.santiago@arauto.express
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY no configurada en las variables de entorno de Netlify.");
}

const WEBHOOK_QRO = "https://chat.googleapis.com/v1/spaces/AAQAEoaLlMQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=C3nlfauF5BX4ywmc4xnQWDbr8B5qdJINL-SUbhHw3PI";
const WEBHOOK_LEN = "https://chat.googleapis.com/v1/spaces/AAQAfglmxgU/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=b_yjbJt9WnlrbBFHfWKs1dM26EzK-KUnYhhigT6sghI";

const TMP_FILE = path.join(os.tmpdir(), 'tlatoani_solicitudes.json');

// Memoria compartida del proceso lambda
if (!global.__tlatoani_solicitudes) {
  global.__tlatoani_solicitudes = new Map();
}

function guardarSolicitud(solicitud) {
  try {
    global.__tlatoani_solicitudes.set(solicitud.id, solicitud);
    let store = {};
    if (fs.existsSync(TMP_FILE)) {
      try {
        store = JSON.parse(fs.readFileSync(TMP_FILE, 'utf-8'));
      } catch (e) {
        store = {};
      }
    }
    store[solicitud.id] = solicitud;
    fs.writeFileSync(TMP_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️ Advertencia guardando solicitud en /tmp:', err.message);
  }
}

function sanitizarPIDParaPWA(pidRaw, hwb) {
  let pid = String(pidRaw || '').trim().toUpperCase();
  if (pid.startsWith('JJD')) {
    return pid;
  }
  if (pid.startsWith('JD')) {
    return 'J' + pid;
  }
  if (pid.length > 0) {
    return 'JJD' + pid;
  }
  const cleanHwb = String(hwb || '').replace(/\D/g, '');
  return 'JJD00' + (cleanHwb || '00000000');
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ exito: false, error: 'Método no permitido. Use POST.' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { image, pochteca, pochtecaNombre, plaza, gps } = payload;

    if (!image) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ exito: false, error: 'Se requiere la imagen base64 de la guía física.' })
      };
    }

    const choferEmail = String(pochteca || '').trim().toLowerCase();
    const choferNombre = String(pochtecaNombre || choferEmail.split('@')[0] || 'Pochteca en Ruta').trim();
    const plazaOp = String(plaza || 'QRO').trim().toUpperCase();
    const gpsCoords = String(gps || '').trim();

    // Extraer base64 y mimeType
    let base64Data = image;
    let mimeType = 'image/jpeg';
    if (image.includes(';base64,')) {
      const parts = image.split(';base64,');
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch) mimeType = mimeMatch[1];
      base64Data = parts[1];
    }

    // 1. Invocar Gemini Flash Vision con Prompt Canónico de DHL
    const promptVision = `Eres el Ojo IA de Ruta del Ecosistema OLLIN (Arauto Express / DHL Express).
Analiza esta imagen de una etiqueta física de envío o paquete de DHL y extrae con máxima precisión los siguientes campos en formato JSON estricto:

{
  "hwb": "número de guía HWB de 10 dígitos (ej. 1234567890). Solo dígitos.",
  "pid": "código de pieza PID con formato Doble J: 'JJD...' (ej. JJD0146000123456789). Si en la etiqueta aparece como JD o números, asegúrate de anteponer la Doble J para formato AppSheet.",
  "destinatario": "nombre completo del cliente o persona que recibe",
  "direccion": "dirección completa de entrega (calle, número exterior/interior, colonia, municipio)",
  "cp": "código postal de 5 dígitos (ej. 76000)",
  "peso": 1.0,
  "piezas": 1,
  "telefono": "número telefónico del destinatario si viene impreso, o vacío",
  "observaciones": "observaciones visibles en la etiqueta (ej. 'Frágil', 'Cobro COD', 'Ocurre')"
}
Responde ÚNICAMENTE el objeto JSON sin bloques de texto adicionales.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: promptVision },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    let geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    // Si gemini-flash-latest responde error, intentar con gemini-pro-latest como fallback
    if (!geminiResp.ok) {
      console.warn('⚠️ Reintentando con gemini-pro-latest...');
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${GEMINI_API_KEY}`;
      geminiResp = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      });
    }

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      throw new Error(`Error en Gemini Flash Vision (${geminiResp.status}): ${errText}`);
    }

    const geminiResult = await geminiResp.json();
    const rawContent = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(rawContent);
    } catch (parseErr) {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) parsedData = JSON.parse(match[0]);
      else throw new Error('No se pudo estructurar el JSON de la etiqueta.');
    }

    // Sanitizaciones canónicas
    let hwb = String(parsedData.hwb || '').replace(/\D/g, '');
    if (hwb.length > 10) hwb = hwb.substring(0, 10);
    const pid = sanitizarPIDParaPWA(parsedData.pid, hwb);
    const destinatario = String(parsedData.destinatario || 'Destinatario DHL').trim();
    const direccion = String(parsedData.direccion || 'Dirección en sistema').trim();
    const cp = String(parsedData.cp || '').trim();
    const peso = parseFloat(parsedData.peso) || 1.0;
    const piezas = parseInt(parsedData.piezas) || 1;
    const telefono = String(parsedData.telefono || '').trim();

    // Generar Solicitud Única
    const timestampNow = Date.now();
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const solicitudId = `SOL-${timestampNow}-${randSuffix}`;

    // Construir URLs dinámicas de autorización
    const host = event.headers['x-forwarded-host'] || event.headers.host || 'ollinqui.netlify.app';
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${proto}://${host}/.netlify/functions/tlatoani_autorizar`;

    const crypto = require('crypto');
    const TLATOANI_SECRET = process.env.TLATOANI_SECRET || "arauto-tlatoani-secure-v87";
    const authToken = crypto.createHmac('sha256', TLATOANI_SECRET)
      .update(`${solicitudId}_${hwb}_${pid}`)
      .digest('hex')
      .substring(0, 16);

    const queryParams = new URLSearchParams({
      id: solicitudId,
      token: authToken,
      hwb: hwb,
      pid: pid,
      chofer: choferEmail,
      choferNombre: choferNombre,
      dest: destinatario,
      dir: direccion,
      cp: cp,
      plaza: plazaOp,
      piezas: String(piezas),
      peso: String(peso),
      tel: telefono,
      gps: gpsCoords
    });

    const urlAprobar = `${baseUrl}?accion=aprobar&${queryParams.toString()}`;
    const urlRechazar = `${baseUrl}?accion=rechazar&${queryParams.toString()}`;

    // Guardar solicitud en estado pendiente
    const solicitudObj = {
      id: solicitudId,
      estado: 'PENDIENTE',
      fechaCreacion: new Date().toISOString(),
      hwb,
      pid,
      destinatario,
      direccion,
      cp,
      peso,
      piezas,
      telefono,
      gps: gpsCoords,
      chofer: choferEmail,
      choferNombre,
      plaza: plazaOp
    };
    guardarSolicitud(solicitudObj);

    // 2. Despachar Tarjeta Interactiva a Google Chat
    const chatWebhook = (plazaOp === 'LEN') ? WEBHOOK_LEN : WEBHOOK_QRO;
    const fallbackText = `📦 *SOLICITUD DE ASIGNACIÓN EN RUTA (TLATOANI)*\n` +
      `👤 *Pochteca:* ${choferNombre} (${choferEmail})\n` +
      `🏢 *Plaza:* ${plazaOp} | 📍 *GPS:* ${gpsCoords || 'No reportado'}\n` +
      `📄 *Guía HWB:* ${hwb || 'No detectada'} | 🏷️ *PID:* ${pid}\n` +
      `👤 *Destinatario:* ${destinatario}\n` +
      `🏠 *Dirección:* ${direccion} (CP: ${cp})\n` +
      `📞 *Teléfono:* ${telefono || 'Sin teléfono'}\n` +
      `📦 *Piezas:* ${piezas} | ⚖️ *Peso:* ${peso} kg\n\n` +
      `👉 *[ ✅ AUTORIZAR ASIGNACIÓN ]:* ${urlAprobar}\n` +
      `👉 *[ ❌ RECHAZAR ]:* ${urlRechazar}`;

    const cardGoogleChat = {
      text: fallbackText,
      cardsV2: [
        {
          cardId: `card_${solicitudId}`,
          card: {
            header: {
              title: "📦 SOLICITUD DE ASIGNACIÓN EN RUTA (TLATOANI)",
              subtitle: `Pochteca: ${choferNombre} (${plazaOp})`,
              imageUrl: "https://img.icons8.com/fluency/96/delivery-box.png",
              imageType: "CIRCLE"
            },
            sections: [
              {
                header: `Folio: ${solicitudId}`,
                widgets: [
                  {
                    decoratedText: {
                      topLabel: "Guía HWB (10 Dígitos)",
                      text: `<b>${hwb || 'NO_DETECTADA'}</b>`,
                      startIcon: { knownIcon: "DESCRIPTION" }
                    }
                  },
                  {
                    decoratedText: {
                      topLabel: "PID (Doble J AppSheet)",
                      text: `<b>${pid}</b>`,
                      startIcon: { knownIcon: "TICKET" }
                    }
                  },
                  {
                    decoratedText: {
                      topLabel: "Destinatario",
                      text: destinatario,
                      startIcon: { knownIcon: "PERSON" }
                    }
                  },
                  {
                    decoratedText: {
                      topLabel: "Dirección de Entrega y C.P.",
                      text: `${direccion} (CP: ${cp})`,
                      startIcon: { knownIcon: "MAP_PIN" }
                    }
                  },
                  {
                    decoratedText: {
                      topLabel: "Teléfono / Piezas / Peso",
                      text: `📞 ${telefono || 'N/A'} • 📦 ${piezas} pza(s) • ⚖️ ${peso} kg`,
                      startIcon: { knownIcon: "PHONE" }
                    }
                  },
                  {
                    decoratedText: {
                      topLabel: "Ubicación GPS Chofer",
                      text: gpsCoords || "Coordenadas no disponibles",
                      startIcon: { knownIcon: "FLIGHT_DEPARTURE" }
                    }
                  },
                  {
                    buttonList: {
                      buttons: [
                        {
                          text: "✅ AUTORIZAR ASIGNACIÓN",
                          color: { red: 0.06, green: 0.72, blue: 0.5, alpha: 1 },
                          onClick: {
                            openLink: {
                              url: urlAprobar
                            }
                          }
                        },
                        {
                          text: "❌ RECHAZAR",
                          color: { red: 0.93, green: 0.26, blue: 0.26, alpha: 1 },
                          onClick: {
                            openLink: {
                              url: urlRechazar
                            }
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    };

    let chatResp = await fetch(chatWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardGoogleChat)
    });

    if (!chatResp.ok) {
      console.warn('⚠️ Google Chat devolvió status', chatResp.status, await chatResp.text());
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        exito: true,
        solicitudId: solicitudId,
        datos: {
          hwb,
          pid,
          destinatario,
          direccion,
          cp,
          peso,
          piezas,
          telefono,
          gps: gpsCoords,
          chofer: choferEmail,
          plaza: plazaOp
        },
        mensaje: "Guía física procesada por Visión IA y despachada a Google Chat para visto bueno del supervisor."
      })
    };

  } catch (err) {
    console.error('❌ Error en tlatoani_vision:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        exito: false,
        error: err.message || 'Error procesando visión de guía huérfana.'
      })
    };
  }
};
