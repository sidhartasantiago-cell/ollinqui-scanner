const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwcqW3I9jAJUaHfl_n3DNAhnBtW1ZGbatYSTbp8OSORaBdcIoOdWmQgnlaGAttU-yUH4Q/exec';
const MAX_REQUEST_BYTES = 5 * 1024 * 1024;

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST', 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ success: false, message: 'Método no permitido.' })
    };
  }

  const body = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');
  if (!body || Buffer.byteLength(body, 'utf8') > MAX_REQUEST_BYTES) {
    return {
      statusCode: 413,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ success: false, message: 'La solicitud excede el tamaño permitido.' })
    };
  }

  try {
    const upstream = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      redirect: 'follow'
    });
    const responseBody = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      },
      body: responseBody
    };
  } catch (error) {
    console.error('Error enviando registro al receptor Apps Script:', error);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ success: false, message: 'No fue posible conectar con el receptor de solicitudes.' })
    };
  }
};
