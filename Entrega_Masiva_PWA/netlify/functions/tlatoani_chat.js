/**
 * 🏛️ TLATOANI CHAT & ESCALAMIENTO A SUPERVISOR (NETLIFY SERVERLESS)
 * Consultor de Procedimientos de Ruta y Escalamiento a Google Chat en Tiempo Real.
 * Ecosistema OLLIN (Arauto Express) - Tenant: sidharta.santiago@arauto.express
 */

const os = require('os');
const path = require('path');
const fs = require('fs');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBaCHFMOkIA_L19Yo45q0yP82hXo4ALLgA";

const WEBHOOK_QRO = "https://chat.googleapis.com/v1/spaces/AAQAEoaLlMQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=C3nlfauF5BX4ywmc4xnQWDbr8B5qdJINL-SUbhHw3PI";
const WEBHOOK_LEN = "https://chat.googleapis.com/v1/spaces/AAQAfglmxgU/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=b_yjbJt9WnlrbBFHfWKs1dM26EzK-KUnYhhigT6sghI";

/**
 * Buzón de Aprendizaje Continuo para preguntas no resueltas o caídas en fallback
 */
function registrarEnBuzonAprendizaje({ pochteca, plaza, pregunta, motivo }) {
  try {
    const rutaBuzon = path.join(os.tmpdir(), 'tlatoani_buzon_aprendizaje.json');
    let lista = [];
    if (fs.existsSync(rutaBuzon)) {
      try {
        const contenido = fs.readFileSync(rutaBuzon, 'utf-8');
        lista = JSON.parse(contenido);
        if (!Array.isArray(lista)) lista = [];
      } catch (errJson) {
        lista = [];
      }
    }

    const nuevoRegistro = {
      timestamp: new Date().toISOString(),
      pochteca: String(pochteca || 'pochteca.ruta@arauto.express').trim().toLowerCase(),
      plaza: String(plaza || 'QRO').trim().toUpperCase(),
      pregunta: String(pregunta || '').trim(),
      motivo: motivo || 'fallback_no_resuelta'
    };

    lista.push(nuevoRegistro);
    fs.writeFileSync(rutaBuzon, JSON.stringify(lista, null, 2), 'utf-8');

    console.log('📬 [BUZÓN DE APRENDIZAJE CONTINUO TLATOANI] Pregunta registrada para extracción semanal:', JSON.stringify(nuevoRegistro));
    return nuevoRegistro;
  } catch (err) {
    console.warn('⚠️ No se pudo registrar en buzon_aprendizaje:', err.message);
    return null;
  }
}

exports.registrarEnBuzonAprendizaje = registrarEnBuzonAprendizaje;

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
    const { pregunta, pochteca, plaza, paqueteActivo, accion } = payload;

    const choferEmail = String(pochteca || 'pochteca.ruta@arauto.express').trim().toLowerCase();
    const plazaOp = String(plaza || 'QRO').trim().toUpperCase();
    const dudaTexto = String(pregunta || '').trim();
    const pkg = paqueteActivo || {};

    const chatWebhook = (plazaOp === 'LEN') ? WEBHOOK_LEN : WEBHOOK_QRO;

    // ==========================================================
    // 1. ESCALAMIENTO DIRECTO A SUPERVISOR EN GOOGLE CHAT
    // ==========================================================
    if (accion === 'escalar_supervisor') {
      const hwbStr = pkg.hwb || pkg.guia || pkg.ID_Guia || 'No especificada';
      const pidStr = pkg.pid || pkg.PID || pkg.ID_Pieza || 'N/A';
      const destStr = pkg.destinatario || pkg.nombre || pkg['Receiver Name'] || 'Cliente en ruta';
      const dirStr = pkg.direccion || pkg.domicilio || pkg['Rcvr Addr 1'] || 'Dirección activa';
      const cpStr = pkg.cp || pkg.CP || pkg['C.P.'] || 'N/A';
      const telStr = pkg.telefono || pkg['Telefono'] || 'Sin teléfono';

      const alertCard = {
        text: `🚨 *ESCALAMIENTO OPERATIVO DE CHOFER EN RUTA (TLATOANI)*\n` +
          `👤 *Pochteca:* ${choferEmail}\n` +
          `🏢 *Plaza:* ${plazaOp}\n` +
          `📦 *Paquete en Pantalla:* Guía ${hwbStr} | PID: ${pidStr}\n` +
          `👤 *Cliente:* ${destStr}\n` +
          `🏠 *Dirección:* ${dirStr} (CP ${cpStr})\n` +
          `💬 *Incidencia / Solicitud de Ayuda:* "${dudaTexto || 'El chofer solicita apoyo del supervisor para esta parada.'}"`,
        cardsV2: [
          {
            cardId: `alerta_incidencia_${Date.now()}`,
            card: {
              header: {
                title: "🚨 ESCALAMIENTO OPERATIVO EN RUTA",
                subtitle: `Pochteca: ${choferEmail} (${plazaOp})`,
                imageUrl: "https://img.icons8.com/fluency/96/alarm.png",
                imageType: "CIRCLE"
              },
              sections: [
                {
                  header: "Detalles del Incidente en Calle",
                  widgets: [
                    {
                      decoratedText: {
                        topLabel: "Consulta / Incidencia Reportada",
                        text: `<b>"${dudaTexto || 'Solicitud de apoyo en ruta'}"</b>`,
                        startIcon: { knownIcon: "DESCRIPTION" }
                      }
                    },
                    {
                      decoratedText: {
                        topLabel: "Guía HWB y PID",
                        text: `📄 <b>${hwbStr}</b> • 🏷️ <b>${pidStr}</b>`,
                        startIcon: { knownIcon: "TICKET" }
                      }
                    },
                    {
                      decoratedText: {
                        topLabel: "Destinatario y Teléfono",
                        text: `${destStr} • 📞 ${telStr}`,
                        startIcon: { knownIcon: "PERSON" }
                      }
                    },
                    {
                      decoratedText: {
                        topLabel: "Dirección y CP",
                        text: `${dirStr} (CP: ${cpStr})`,
                        startIcon: { knownIcon: "MAP_PIN" }
                      }
                    }
                  ]
                }
              ]
            }
          }
        ]
      };

      const respChat = await fetch(chatWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertCard)
      });

      if (!respChat.ok) {
        console.warn('⚠️ Google Chat error:', respChat.status, await respChat.text());
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          exito: true,
          mensaje: "🚨 Alerta e incidente escalados al supervisor en Google Chat con éxito."
        })
      };
    }

    // ==========================================================
    // 2. CONSULTA COGNITIVA A GEMINI FLASH (< 50 PALABRAS)
    // ==========================================================
    const promptChat = `Eres TLATOANI, el copiloto operativo inteligente de Arauto Express para choferes (Pochtecas) de DHL Express en ruta (Querétaro y León).
Responde de forma ejecutiva, directa y práctica en MENOS DE 50 PALABRAS.
Usa emojis útiles. Prioriza las directrices oficiales y el Glosario de Arauto Express / DHL:

📖 GLOSARIO DE ARAUTO EXPRESS / DHL:
- PID: Piece Identifier (bulto físico individual con código JJD...).
- HWB: House Waybill (guía madre de 10 dígitos).
- Checkpoints: OK (Entregado), BA (Dirección errónea), NH (Nadie en casa), CA (Rechazado), RD (Reintento de entrega), WC (En espera).
- Regla de Oro Poka-Yoke: Jamás soltar paquete sin firma digital. NUNCA entregues el paquete físico en manos del cliente sin haber capturado la firma en la pantalla.

📋 DIRECTRICES OPERATIVAS:
- BA (Dirección incorrecta): llamar al cliente; si no contesta, foto de fachada y audio Teoyolotl de 13s.
- NH (Nadie en casa): tocar timbre 2 veces, esperar 60s, llamar; foto obligatoria de fachada con número visible y audio.
- CA (Cancelado/Rechazado): pedir nombre y motivo exacto, foto y audio; nunca dejar el paquete abandonado.
- Aduana / COD: cobrar antes de entregar; si no pagan, no entregar y marcar RD/CA.
- Vecino: mayor de edad con identificación, nombre completo y firma obligatoria.
- Límite de responsabilidad: 30 UMAs ($3,257 MXN aprox).
- Cero bultos aventados o dejados sin firma.
- Si la duda está fuera de procedimiento o no puedes resolverla con certeza, responde exactamente: "⚠️ Consulta al supervisor en Google Chat para validar este caso."

Pregunta del chofer: "${dudaTexto}"
Paquete actual en pantalla (si aplica): ${JSON.stringify(pkg)}
Responde de inmediato con la solución concreta:`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const geminiPayload = {
      contents: [{ parts: [{ text: promptChat }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };

    let respuesta = '';
    let esFallback = false;

    try {
      let geminiResp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiPayload)
      });

      if (!geminiResp.ok) {
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`;
        geminiResp = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload)
        });
      }

      if (geminiResp.ok) {
        const geminiData = await geminiResp.json();
        respuesta = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      }
    } catch (apiErr) {
      console.warn('⚠️ Error al consultar API Gemini:', apiErr.message);
    }

    if (!respuesta || respuesta.includes('Consulta al supervisor en Google Chat') || respuesta.includes('no resuelta')) {
      esFallback = true;
      respuesta = respuesta || '⚠️ Consulta al supervisor en Google Chat para validar este caso.';
    }

    if (esFallback) {
      registrarEnBuzonAprendizaje({
        pochteca: choferEmail,
        plaza: plazaOp,
        pregunta: dudaTexto,
        motivo: 'pregunta_no_resuelta_fallback'
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        exito: true,
        respuesta: respuesta,
        fallback: esFallback
      })
    };

  } catch (err) {
    console.error('❌ Error en tlatoani_chat:', err);
    try {
      const payload = JSON.parse(event.body || '{}');
      if (payload.pregunta) {
        registrarEnBuzonAprendizaje({
          pochteca: payload.pochteca,
          plaza: payload.plaza,
          pregunta: payload.pregunta,
          motivo: 'error_excepcion_chat'
        });
      }
    } catch (eCatch) {}

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        exito: false,
        error: err.message || 'Error en consultor Tlatoani.'
      })
    };
  }
};
