const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('node:vm');

const visionHandler = require('./netlify/functions/tlatoani_vision.js').handler;
const autorizarHandler = require('./netlify/functions/tlatoani_autorizar.js').handler;
const chatHandler = require('./netlify/functions/tlatoani_chat.js').handler;
const registrarEnBuzonAprendizaje = require('./netlify/functions/tlatoani_chat.js').registrarEnBuzonAprendizaje;

function createElement() {
  const node = {
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    dataset: {}, children: [], options: [], files: [], value: '', innerHTML: '', textContent: '',
    setAttribute() {}, addEventListener() {},
    appendChild(child) {
      this.children.push(child);
      if (child && child.innerHTML) this.innerHTML += child.innerHTML;
      if (child && child.textContent) this.textContent += child.textContent;
    },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
    },
    focus() {}, click() {},
    play() { return Promise.resolve(); }, pause() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 320, height: 240, left: 0, top: 0 }; },
    getContext() {
      return {
        scale() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        set strokeStyle(value) {}, set lineWidth(value) {}
      };
    },
    closest() { return null; }
  };
  return new Proxy(node, {
    get(target, key) { if (key in target) return target[key]; return () => {}; },
    set(target, key, value) { target[key] = value; return true; }
  });
}

function createAppContext() {
  const elements = new Map();
  const localValues = new Map();
  const document = {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement());
      return elements.get(id);
    },
    querySelector() { return createElement(); },
    querySelectorAll() { return []; },
    createElement() { return createElement(); },
    addEventListener() {},
    body: createElement()
  };
  const window = { addEventListener() {}, AudioContext: class {} };
  const navigator = { onLine: true, vibrate() {}, geolocation: { getCurrentPosition() {} } };
  const localStorage = {
    getItem(key) { return localValues.get(key) || null; },
    setItem(key, value) { localValues.set(key, String(value)); },
    removeItem(key) { localValues.delete(key); }
  };
  const context = {
    window, document, navigator, localStorage,
    console: { log() {}, warn() {}, error() {} },
    URLSearchParams, URL,
    location: { search: '', origin: 'https://local.test', pathname: '/' },
    setTimeout(cb) { return setImmediate(cb); },
    clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    confirm() { return true; }, alert() {},
    fetch() { return Promise.reject(new Error('offline test')); },
    AudioContext: class {},
    Html5Qrcode: class { constructor() {} async start() {} async stop() {} async clear() {} static async getCameras() { return []; } },
    Html5QrcodeSupportedFormats: {},
    IDBKeyRange: { lowerBound() {} }
  };
  context.globalThis = context;
  const appPath = path.resolve(__dirname, 'app.js');
  vm.runInNewContext(fs.readFileSync(appPath, 'utf8'), context, { filename: appPath });
  return { context, document, navigator, elements };
}

test('TLATOANI: Base de Conocimiento Tier 1 es válida y completa con 14 procedimientos', () => {
  const p = path.resolve(__dirname, 'conocimiento_procedimientos.json');
  assert.ok(fs.existsSync(p), 'El archivo conocimiento_procedimientos.json debe existir');
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  assert.ok(Array.isArray(data.procedimientos), 'Debe tener un array de procedimientos');
  assert.ok(data.procedimientos.length >= 14, 'Debe contener al menos 14 procedimientos');
  
  const ids = data.procedimientos.map(x => x.id);
  assert.ok(ids.some(id => id.includes('BA')), 'Debe incluir procedimiento BA');
  assert.ok(ids.some(id => id.includes('NH')), 'Debe incluir procedimiento NH');
  assert.ok(ids.some(id => id.includes('CA')), 'Debe incluir procedimiento CA');
  assert.ok(ids.some(id => id.includes('ADUANA')), 'Debe incluir procedimiento Aduana');
  assert.ok(ids.some(id => id.includes('VECINO')), 'Debe incluir procedimiento Vecino');
  assert.ok(ids.some(id => id.includes('30_UMAS')), 'Debe incluir procedimiento 30 UMAs');

  // Validar los 6 nuevos procedimientos
  assert.ok(ids.includes('FLUJO_ENTREGA_REGULAR_PID'), 'Debe incluir FLUJO_ENTREGA_REGULAR_PID');
  assert.ok(ids.includes('CARGA_A_BORDO_MATUTINA'), 'Debe incluir CARGA_A_BORDO_MATUTINA');
  assert.ok(ids.includes('PAQUETES_MULTIPIEZA'), 'Debe incluir PAQUETES_MULTIPIEZA');
  assert.ok(ids.includes('PAQUETES_DANADOS_VIOLADOS'), 'Debe incluir PAQUETES_DANADOS_VIOLADOS');
  assert.ok(ids.includes('MODO_OFFLINE_SIN_RED'), 'Debe incluir MODO_OFFLINE_SIN_RED');
  assert.ok(ids.includes('PAGO_TRANSFERENCIA_CHEQUE'), 'Debe incluir PAGO_TRANSFERENCIA_CHEQUE');

  const regularProc = data.procedimientos.find(x => x.id === 'FLUJO_ENTREGA_REGULAR_PID');
  assert.ok(regularProc.advertencia.includes('NUNCA entregues el paquete físico'), 'Debe contener la regla de oro Poka-Yoke');
  assert.equal(regularProc.pasos.length, 5, 'Debe contener 5 pasos');
});

test('TLATOANI: Búsqueda heurística encuentra FLUJO_ENTREGA_REGULAR_PID para "Que debo hacer primero antes de entregar un PID?"', () => {
  const { context } = createAppContext();
  const procs = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'conocimiento_procedimientos.json'), 'utf-8')).procedimientos;
  const match = context.buscarProcedimientoHeuristico('Que debo hacer primero antes de entregar un PID?', procs);
  assert.ok(match, 'Debe encontrar un procedimiento');
  assert.equal(match.id, 'FLUJO_ENTREGA_REGULAR_PID');
  assert.ok(match.titulo.includes('Procedimiento de Entrega de un PID'));
  assert.ok(match.advertencia.includes('NUNCA entregues el paquete físico'));
});

test('TLATOANI: Búsqueda heurística encuentra procedimientos por palabras clave parciales', () => {
  const { context } = createAppContext();
  const procs = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'conocimiento_procedimientos.json'), 'utf-8')).procedimientos;

  const matchRampa = context.buscarProcedimientoHeuristico('como subir bultos rampa camioneta en la manana', procs);
  assert.ok(matchRampa);
  assert.equal(matchRampa.id, 'CARGA_A_BORDO_MATUTINA');

  const matchMulti = context.buscarProcedimientoHeuristico('paquete multipieza 1 de 2 falta una caja', procs);
  assert.ok(matchMulti);
  assert.equal(matchMulti.id, 'PAQUETES_MULTIPIEZA');

  const matchDanado = context.buscarProcedimientoHeuristico('paquete roto aplastado o con cinta violada', procs);
  assert.ok(matchDanado);
  assert.equal(matchDanado.id, 'PAQUETES_DANADOS_VIOLADOS');

  const matchOffline = context.buscarProcedimientoHeuristico('no hay red ni senal celular offline', procs);
  assert.ok(matchOffline);
  assert.equal(matchOffline.id, 'MODO_OFFLINE_SIN_RED');

  const matchPago = context.buscarProcedimientoHeuristico('pago de aduana con cheque o transferencia', procs);
  assert.ok(matchPago);
  assert.equal(matchPago.id, 'PAGO_TRANSFERENCIA_CHEQUE');
});

test('TLATOANI Offline: Enviar pregunta sin conexión y sin match exacto avisa de falta de señal celular', async () => {
  const { context, document } = createAppContext();
  context.navigator.onLine = false;

  const chatInput = document.getElementById('tlatoani-chat-input');
  const chatMessages = document.getElementById('tlatoani-chat-messages');
  const addedBubbles = [];
  chatMessages.appendChild = (el) => addedBubbles.push(el);

  chatInput.value = 'pregunta_completamente_desconocida_xyz_sin_coincidencias';
  await context.window.enviarPreguntaTlatoani();

  assert.ok(
    addedBubbles.some(b => b.innerHTML && b.innerHTML.includes('Sin señal celular en esta zona')),
    'Debe emitir el aviso amigable de sin señal celular'
  );
});

test('TLATOANI Chat: Buzón de Aprendizaje Continuo registra preguntas en fallback a os.tmpdir()', () => {
  const buzonPath = path.join(os.tmpdir(), 'tlatoani_buzon_aprendizaje.json');
  const testDuda = `Duda de prueba automatizada ${Date.now()}`;
  const registro = registrarEnBuzonAprendizaje({
    pochteca: 'edgar.rodriguez.arauto@gmail.com',
    plaza: 'QRO',
    pregunta: testDuda,
    motivo: 'test_fallback'
  });

  assert.ok(registro, 'Debe retornar el registro');
  assert.equal(registro.pregunta, testDuda);
  assert.equal(registro.plaza, 'QRO');
  assert.ok(fs.existsSync(buzonPath), 'El archivo de buzón en os.tmpdir() debe existir');

  const contenido = JSON.parse(fs.readFileSync(buzonPath, 'utf-8'));
  assert.ok(Array.isArray(contenido), 'El buzón debe ser un array');
  assert.ok(contenido.some(r => r.pregunta === testDuda), 'Debe contener la duda registrada');
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
