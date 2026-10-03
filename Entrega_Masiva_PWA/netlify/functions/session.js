/**
 * 🏛️ CONTROL DE SESIÓN ÚNICA Y ANTI-CONCURRENCIA (NETLIFY SERVERLESS)
 * Tenant: sidharta.santiago@arauto.express
 * Persistencia: Google Sheets CONTROL_SESIONES en OLLIN_OPERACIONES_2026
 */

const SPREADSHEET_ID = '1njJIZBtYVqwtyNS-1SkeTMxDh7y6RctH2yoL0vXltbk';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }
  
  // Leer refresh_token del archivo local si existe o env var
  let rf = process.env.GOOGLE_REFRESH_TOKEN || REFRESH_TOKEN;
  try {
    const fs = require('fs');
    const path = require('path');
    const p = path.resolve(__dirname, '../../../../.agents/google_token.json');
    if (fs.existsSync(p)) {
      const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (d.refresh_token) rf = d.refresh_token;
    }
  } catch (e) {}

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: rf,
    grant_type: 'refresh_token'
  });

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: params
  });

  if (!resp.ok) {
    throw new Error('Error refreshing Google OAuth token: ' + resp.statusText);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

function getFechaYHoraMexico() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const nd = new Date(utc + (3600000 * -6)); // America/Mexico_City (UTC-6)
  
  const yyyy = nd.getFullYear();
  const mm = String(nd.getMonth() + 1).padStart(2, '0');
  const dd = String(nd.getDate()).padStart(2, '0');
  const fecha = `${yyyy}-${mm}-${dd}`;
  
  const hh = String(nd.getHours()).padStart(2, '0');
  const min = String(nd.getMinutes()).padStart(2, '0');
  const ss = String(nd.getSeconds()).padStart(2, '0');
  const hora = `${hh}:${min}:${ss}`;

  return { fecha, hora };
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

  try {
    let payload = {};
    if (event.httpMethod === 'POST' && event.body) {
      try {
        payload = JSON.parse(event.body);
      } catch (e) {
        payload = {};
      }
    } else if (event.queryStringParameters) {
      payload = event.queryStringParameters;
    }

    const accion = payload.accion || payload.action || 'ping';
    const email = String(payload.email || payload.usuario || '').trim().toLowerCase();
    const deviceId = String(payload.device_id || '').trim();
    const override = payload.master_override === true || payload.master_override === 'true';

    if (accion === 'ping') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() })
      };
    }

    if (!email) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'ERROR', autorizado: false, error: 'EMAIL_REQUERIDO' })
      };
    }

    const token = await getAccessToken();
    const { fecha, hora } = getFechaYHoraMexico();

    // 1. Leer filas actuales de CONTROL_SESIONES
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/CONTROL_SESIONES!A:F`;
    const readResp = await fetch(readUrl, { headers: { Authorization: `Bearer ${token}` } });
    const readData = await readResp.json();
    const rows = readData.values || [];

    let activeRowIndex = -1; // 1-indexed for Sheets
    let activeDeviceId = '';

    for (let i = 1; i < rows.length; i++) {
      const rUser = String(rows[i][0] || '').trim().toLowerCase();
      const rFecha = String(rows[i][1] || '').trim();
      const rDev = String(rows[i][2] || '').trim();
      const rStatus = String(rows[i][5] || '').trim().toUpperCase();

      if (rUser === email && rFecha === fecha && rStatus === 'ACTIVA') {
        activeRowIndex = i + 1;
        activeDeviceId = rDev;
        break;
      }
    }

    // A. CERRAR SESIÓN
    if (accion === 'cerrar_sesion_usuario') {
      if (activeRowIndex !== -1 && (activeDeviceId === deviceId || !deviceId)) {
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/CONTROL_SESIONES!E${activeRowIndex}:F${activeRowIndex}?valueInputOption=USER_ENTERED`;
        await fetch(updateUrl, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [[hora, 'CERRADA']] })
        });
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ status: 'OK', autorizado: true, mensaje: 'Sesión cerrada correctamente' })
      };
    }

    // B. PING DE SESIÓN (HEARTBEAT DESDE EL CELULAR CADA 30s)
    if (accion === 'ping_sesion') {
      if (activeRowIndex !== -1) {
        if (activeDeviceId === deviceId) {
          // Mismo celular: actualizar último ping
          const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/CONTROL_SESIONES!E${activeRowIndex}?valueInputOption=USER_ENTERED`;
          await fetch(updateUrl, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [[hora]] })
          });
          return { statusCode: 200, headers, body: JSON.stringify({ status: 'OK', activo: true }) };
        } else {
          // Fue transferido a otro equipo!
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              status: 'KICKED',
              activo: false,
              mensaje: '⛔ Tu sesión ha sido transferida a otro celular. Turno cerrado en este equipo.'
            })
          };
        }
      } else {
        // No hay sesión activa hoy
        return { statusCode: 200, headers, body: JSON.stringify({ status: 'OK', activo: false }) };
      }
    }

    // C. VALIDAR SESIÓN AL INICIAR TURNO (LOGIN)
    if (accion === 'validar_sesion_usuario') {
      if (activeRowIndex !== -1) {
        if (activeDeviceId === deviceId || !activeDeviceId) {
          // Mismo celular: Refrescar hora de ping y autorizar
          const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/CONTROL_SESIONES!E${activeRowIndex}?valueInputOption=USER_ENTERED`;
          await fetch(updateUrl, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [[hora]] })
          });
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: 'OK', autorizado: true, mensaje: 'Sesión confirmada en este equipo' })
          };
        } else {
          // DISPOSITIVO DISTINTO (OTRO CELULAR)
          if (override === true) {
            // Master override: Marcar la anterior como TRANSFERIDA y registrar la nueva
            const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/CONTROL_SESIONES!E${activeRowIndex}:F${activeRowIndex}?valueInputOption=USER_ENTERED`;
            await fetch(updateUrl, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: [[hora, 'TRANSFERIDA']] })
            });

            // Registrar nuevo dispositivo activo
            const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/CONTROL_SESIONES!A:F:append?valueInputOption=USER_ENTERED`;
            await fetch(appendUrl, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: [[email, fecha, deviceId, hora, hora, 'ACTIVA']] })
            });

            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                status: 'OK',
                autorizado: true,
                transferida: true,
                mensaje: 'Sesión transferida exitosamente a este equipo con PIN Maestro.'
              })
            };
          } else {
            // ⛔ BLOQUEO POKA-YOKE: CONFLICTO DE CONCURRENCIA
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                status: 'BLOQUEADO',
                autorizado: false,
                error: 'USUARIO_ACTIVO_OTRO_DISPOSITIVO',
                mensaje: '⛔ CANDADO DE SEGURIDAD OPERATIVA: Este usuario ya tiene un turno abierto en otro celular hoy. Solo se permite un equipo activo a la vez para evitar discrepancias operativas en ruta.',
                deviceIdActivo: activeDeviceId
              })
            };
          }
        }
      } else {
        // Primera sesión del día para este usuario
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/CONTROL_SESIONES!A:F:append?valueInputOption=USER_ENTERED`;
        await fetch(appendUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [[email, fecha, deviceId, hora, hora, 'ACTIVA']] })
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: 'OK', autorizado: true, mensaje: 'Turno iniciado con éxito' })
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'OK', mensaje: 'Acción no reconocida' })
    };

  } catch (err) {
    console.error('Error en session function:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ status: 'ERROR', error: err.message })
    };
  }
};
