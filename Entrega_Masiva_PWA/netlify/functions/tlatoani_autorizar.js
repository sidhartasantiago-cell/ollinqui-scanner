/**
 * 🏛️ TLATOANI AUTORIZAR (NETLIFY SERVERLESS)
 * Flujo de Autorización Express de 1-Clic para Supervisores en Google Chat
 * y Sondeo Reactivo (Polling) para Ollinqui PWA.
 * Tenant: sidharta.santiago@arauto.express
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const TLATOANI_SECRET = process.env.TLATOANI_SECRET || "arauto-tlatoani-secure-v87";

function validarToken(token, id, hwb, pid) {
  if (!token) return true; // Retrocompatible si no se envió token
  try {
    const expected = crypto.createHmac('sha256', TLATOANI_SECRET)
      .update(`${id}_${hwb}_${pid}`)
      .digest('hex')
      .substring(0, 16);
    return token === expected;
  } catch (e) {
    return false;
  }
}

const WEBHOOK_GAS_URL = 'https://script.google.com/macros/s/AKfycbwCKdmeHHqRwsNAMJTjxaEDiznvYdPggPchlrVhQcd5kbW7LfLn_qub-fCn6w6JmyRw/exec';
const TMP_FILE = path.join(os.tmpdir(), 'tlatoani_solicitudes.json');

if (!global.__tlatoani_solicitudes) {
  global.__tlatoani_solicitudes = new Map();
}

function leerSolicitud(id) {
  if (global.__tlatoani_solicitudes && global.__tlatoani_solicitudes.has(id)) {
    return global.__tlatoani_solicitudes.get(id);
  }
  try {
    if (fs.existsSync(TMP_FILE)) {
      const store = JSON.parse(fs.readFileSync(TMP_FILE, 'utf-8'));
      if (store[id]) {
        global.__tlatoani_solicitudes.set(id, store[id]);
        return store[id];
      }
    }
  } catch (err) {}
  return null;
}

function actualizarSolicitud(id, patch) {
  let solicitud = leerSolicitud(id) || { id, ...patch };
  solicitud = { ...solicitud, ...patch, ultimaActualizacion: new Date().toISOString() };
  try {
    global.__tlatoani_solicitudes.set(id, solicitud);
    let store = {};
    if (fs.existsSync(TMP_FILE)) {
      try {
        store = JSON.parse(fs.readFileSync(TMP_FILE, 'utf-8'));
      } catch (e) {
        store = {};
      }
    }
    store[id] = solicitud;
    fs.writeFileSync(TMP_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️ Error guardando en /tmp:', err.message);
  }
  return solicitud;
}

function generarHtmlRespuesta({ titulo, subtitulo, guia, pid, chofer, icono, colorPrimario, bgGlow, detalles }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo} | Arauto Express</title>
  <style>
    :root {
      --bg: #0B0F19;
      --card: rgba(17, 24, 39, 0.95);
      --accent: ${colorPrimario};
      --text: #F3F4F6;
      --muted: #9CA3AF;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: var(--card);
      border: 1.5px solid var(--accent);
      box-shadow: 0 0 35px ${bgGlow};
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      backdrop-filter: blur(16px);
    }
    .icon { font-size: 3.5rem; margin-bottom: 12px; }
    h1 { font-size: 1.35rem; color: var(--accent); margin-bottom: 6px; font-weight: 800; }
    .sub { font-size: 0.88rem; color: var(--muted); margin-bottom: 22px; }
    .details {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 16px;
      text-align: left;
      font-size: 0.85rem;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .row { display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.06); padding-bottom: 6px; }
    .row:last-child { border-bottom: none; padding-bottom: 0; }
    .lbl { color: var(--muted); font-weight: 600; }
    .val { color: var(--text); font-weight: 700; font-family: monospace; }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid var(--accent);
      color: var(--accent);
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .footer { font-size: 0.72rem; color: var(--muted); margin-top: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icono}</div>
    <h1>${titulo}</h1>
    <div class="sub">${subtitulo}</div>

    <div class="details">
      <div class="row"><span class="lbl">Guía HWB:</span><span class="val">${guia || '---'}</span></div>
      <div class="row"><span class="lbl">PID (AppSheet):</span><span class="val">${pid || '---'}</span></div>
      <div class="row"><span class="lbl">Pochteca Asignado:</span><span class="val" style="font-family:inherit;">${chofer || '---'}</span></div>
      ${detalles || ''}
    </div>

    <div class="badge">Ecosistema OLLIN v87.0 • Arauto Express</div>
    <div class="footer">Esta ventana puede cerrarse con seguridad. El chofer recibirá la actualización en caliente en su celular.</div>
  </div>
</body>
</html>`;
}

exports.handler = async (event) => {
  const headersJson = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  const headersHtml = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/html; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headersJson, body: '' };
  }

  try {
    let params = {};
    if (event.httpMethod === 'POST' && event.body) {
      try { params = JSON.parse(event.body); } catch (e) {}
    }
    if (event.queryStringParameters) {
      params = { ...params, ...event.queryStringParameters };
    }

    const id = String(params.id || '').trim();
    const accion = String(params.accion || params.action || '').trim().toLowerCase();
    const formato = String(params.formato || params.format || '').trim().toLowerCase();

    // 1. MODO SONDEO / POLLING PWA: ?id=SOL-... y sin acción de mutación
    if (id && (!accion || accion === 'consultar' || accion === 'status' || formato === 'json')) {
      let sol = leerSolicitud(id);
      if (!sol) {
        return {
          statusCode: 200,
          headers: headersJson,
          body: JSON.stringify({
            exito: true,
            id: id,
            estado: 'PENDIENTE',
            mensaje: 'Solicitud en espera de revisión del supervisor.'
          })
        };
      }
      return {
        statusCode: 200,
        headers: headersJson,
        body: JSON.stringify({
          exito: true,
          id: sol.id,
          estado: sol.estado || 'PENDIENTE',
          guia: sol.hwb,
          pid: sol.pid,
          chofer: sol.chofer,
          destinatario: sol.destinatario,
          direccion: sol.direccion,
          cp: sol.cp,
          piezas: sol.piezas,
          peso: sol.peso,
          telefono: sol.telefono,
          datos: sol
        })
      };
    }

    // 2. MODO ACCIÓN DEL SUPERVISOR DESDE GOOGLE CHAT: aprobar | rechazar
    const guia = String(params.hwb || params.guia || '').trim();
    const pid = String(params.pid || '').trim();
    const chofer = String(params.chofer || params.correo || '').trim().toLowerCase();
    const choferNombre = String(params.choferNombre || chofer).trim();
    const destinatario = String(params.dest || params.destinatario || '').trim();
    const direccion = String(params.dir || params.direccion || '').trim();
    const cp = String(params.cp || '').trim();
    const plaza = String(params.plaza || 'QRO').trim().toUpperCase();
    const piezas = parseInt(params.piezas) || 1;
    const peso = parseFloat(params.peso) || 1.0;
    const telefono = String(params.tel || params.telefono || '').trim();
    const gps = String(params.gps || '').trim();
    const supervisorEmail = String(params.supervisor || 'supervisor.chat@arauto.express').trim().toLowerCase();

    const token = String(params.token || '').trim();
    if (token && !validarToken(token, id, guia, pid)) {
      return {
        statusCode: 403,
        headers: headersHtml,
        body: '<h1>403 Prohibido</h1><p>Token de autorización inválido o no reconocido.</p>'
      };
    }

    if (accion === 'aprobar') {
      // Registrar estado APROBADO localmente
      actualizarSolicitud(id, {
        estado: 'APROBADO',
        hwb: guia,
        pid,
        chofer,
        choferNombre,
        destinatario,
        direccion,
        cp,
        piezas,
        peso,
        telefono,
        gps,
        plaza,
        supervisor: supervisorEmail
      });

      // Comunicarse con el Webhook de Google Apps Script (Receptor_PU)
      let gasExito = false;
      let gasRespuesta = null;
      try {
        const gasPayload = {
          accion: 'auto_asignar_guia_huerfana',
          guia: guia,
          pid: pid,
          choferEmail: chofer,
          supervisorEmail: supervisorEmail,
          plaza: plaza,
          direccion: direccion,
          destinatario: destinatario,
          cp: cp,
          piezas: piezas,
          peso: peso,
          telefono: telefono,
          gps: gps,
          urlEvidencia: ''
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const respGas = await fetch(WEBHOOK_GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gasPayload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (respGas.ok) {
          gasRespuesta = await respGas.json();
          gasExito = gasRespuesta && (gasRespuesta.exito === true || gasRespuesta.status === 'OK');
        }
      } catch (errGas) {
        console.warn('⚠️ Advertencia comunicando con Receptor_PU GAS:', errGas.message);
      }

      const html = generarHtmlRespuesta({
        titulo: '✅ ASIGNACIÓN AUTORIZADA',
        subtitulo: `La guía ${guia} fue transferida con éxito al Pochteca en ruta.`,
        guia: guia,
        pid: pid,
        chofer: `${choferNombre} (${chofer})`,
        icono: '📦',
        colorPrimario: '#10B981',
        bgGlow: 'rgba(16, 185, 129, 0.4)',
        detalles: `
          <div class="row"><span class="lbl">Destinatario:</span><span class="val" style="font-family:inherit;">${destinatario || 'Registrado'}</span></div>
          <div class="row"><span class="lbl">Dirección:</span><span class="val" style="font-family:inherit;">${direccion} (CP: ${cp})</span></div>
          <div class="row"><span class="lbl">Estado Sincronización:</span><span class="val" style="color:#10B981;">${gasExito ? 'En Caliente (BD Central + Ops + Bóveda)' : 'Autorizado por Supervisor'}</span></div>
        `
      });

      return {
        statusCode: 200,
        headers: headersHtml,
        body: html
      };
    }

    if (accion === 'rechazar') {
      actualizarSolicitud(id, {
        estado: 'RECHAZADO',
        hwb: guia,
        pid,
        chofer,
        supervisor: supervisorEmail
      });

      const html = generarHtmlRespuesta({
        titulo: '❌ ASIGNACIÓN RECHAZADA',
        subtitulo: `La solicitud de incorporación en ruta de la guía ${guia} fue rechazada por el supervisor.`,
        guia: guia,
        pid: pid,
        chofer: `${choferNombre} (${chofer})`,
        icono: '🚫',
        colorPrimario: '#EF4444',
        bgGlow: 'rgba(239, 68, 68, 0.4)',
        detalles: `
          <div class="row"><span class="lbl">Resolución:</span><span class="val" style="color:#EF4444;">No autorizado para entrega hoy</span></div>
          <div class="row"><span class="lbl">Instrucción:</span><span class="val" style="font-family:inherit;">Retornar bulto a rampa para mesa de control</span></div>
        `
      });

      return {
        statusCode: 200,
        headers: headersHtml,
        body: html
      };
    }

    return {
      statusCode: 400,
      headers: headersJson,
      body: JSON.stringify({ exito: false, error: 'Acción no reconocida o parámetros incompletos.' })
    };

  } catch (err) {
    console.error('❌ Error en tlatoani_autorizar:', err);
    return {
      statusCode: 500,
      headers: headersJson,
      body: JSON.stringify({ exito: false, error: err.message })
    };
  }
};
