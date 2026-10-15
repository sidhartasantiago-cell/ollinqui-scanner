const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const visionHandler = require('./netlify/functions/tlatoani_vision.js').handler;
const autorizarHandler = require('./netlify/functions/tlatoani_autorizar.js').handler;
const chatHandler = require('./netlify/functions/tlatoani_chat.js').handler;

test('TLATOANI: Base de Conocimiento Tier 1 es válida y completa', () => {
  const p = path.resolve(__dirname, 'conocimiento_procedimientos.json');
  assert.ok(fs.existsSync(p), 'El archivo conocimiento_procedimientos.json debe existir');
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  assert.ok(Array.isArray(data.procedimientos), 'Debe tener un array de procedimientos');
  
  const ids = data.procedimientos.map(x => x.id);
  assert.ok(ids.some(id => id.includes('BA')), 'Debe incluir procedimiento BA');
  assert.ok(ids.some(id => id.includes('NH')), 'Debe incluir procedimiento NH');
  assert.ok(ids.some(id => id.includes('CA')), 'Debe incluir procedimiento CA');
  assert.ok(ids.some(id => id.includes('ADUANA')), 'Debe incluir procedimiento Aduana');
  assert.ok(ids.some(id => id.includes('VECINO')), 'Debe incluir procedimiento Vecino');
  assert.ok(ids.some(id => id.includes('30_UMAS')), 'Debe incluir procedimiento 30 UMAs');
});

test('TLATOANI Vision: valida métodos HTTP y cuerpo requerido', async () => {
  // OPTIONS
  const optRes = await visionHandler({ httpMethod: 'OPTIONS', headers: {} });
  assert.equal(optRes.statusCode, 200);

  // GET no permitido
  const getRes = await visionHandler({ httpMethod: 'GET', headers: {} });
  assert.equal(getRes.statusCode, 405);

  // POST sin imagen
  const postSinImg = await visionHandler({
    httpMethod: 'POST',
    headers: { host: 'localhost:8888' },
    body: JSON.stringify({ pochteca: 'edgar.rodriguez.arauto@gmail.com' })
  });
  assert.equal(postSinImg.statusCode, 400);
});

test('TLATOANI Autorizar: maneja sondeo GET ?id=SOL- y acciones de supervisor', async () => {
  const testId1 = `SOL-TEST-${Date.now()}-1`;
  const testId2 = `SOL-TEST-${Date.now()}-2`;

  // 1. Sondeo de solicitud inexistente
  const pollRes = await autorizarHandler({
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: { id: testId1 }
  });
  assert.equal(pollRes.statusCode, 200);
  const pollData = JSON.parse(pollRes.body);
  assert.equal(pollData.estado, 'PENDIENTE');

  // 2. Acción de rechazar
  const rejRes = await autorizarHandler({
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: {
      id: testId1,
      accion: 'rechazar',
      hwb: '1234567890',
      pid: 'JJD014600000000',
      chofer: 'edgar.rodriguez.arauto@gmail.com'
    }
  });
  assert.equal(rejRes.statusCode, 200);
  assert.ok(rejRes.body.includes('RECHAZADA'), 'Debe devolver HTML de rechazo');

  // 3. Sondeo posterior debe mostrar RECHAZADO
  const pollRej = await autorizarHandler({
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: { id: testId1 }
  });
  const dataRej = JSON.parse(pollRej.body);
  assert.equal(dataRej.estado, 'RECHAZADO');

  // 4. Acción de aprobar
  const aprRes = await autorizarHandler({
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: {
      id: testId2,
      accion: 'aprobar',
      hwb: '9876543210',
      pid: 'JJD014699999999',
      chofer: 'fernando.maestro.1991@gmail.com',
      dest: 'Juan Pérez',
      dir: 'Av. Constituyentes 100',
      cp: '76000'
    }
  });
  assert.equal(aprRes.statusCode, 200);
  assert.ok(aprRes.body.includes('AUTORIZADA'), 'Debe devolver HTML de autorización');

  // 5. Sondeo posterior debe mostrar APROBADO
  const pollApr = await autorizarHandler({
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: { id: testId2 }
  });
  const dataApr = JSON.parse(pollApr.body);
  assert.equal(dataApr.estado, 'APROBADO');
  assert.equal(dataApr.guia, '9876543210');
  assert.equal(dataApr.pid, 'JJD014699999999');
});

test('TLATOANI Chat: responde OPTIONS y valida métodos', async () => {
  const optRes = await chatHandler({ httpMethod: 'OPTIONS', headers: {} });
  assert.equal(optRes.statusCode, 200);

  const getRes = await chatHandler({ httpMethod: 'GET', headers: {} });
  assert.equal(getRes.statusCode, 405);
});
