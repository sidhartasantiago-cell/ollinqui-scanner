"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const APP_PATH = path.join(__dirname, "app.js");

function createElement() {
  return new Proxy({
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    dataset: {},
    children: [],
    options: [],
    files: [],
    value: "",
    innerHTML: "",
    textContent: "",
    setAttribute() {},
    addEventListener() {},
    appendChild() {},
    removeChild() {},
    focus() {},
    click() {},
    play() { return Promise.resolve(); },
    pause() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 320, height: 240, left: 0, top: 0 }; },
    getContext() {
      return {
        scale() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        set strokeStyle(value) {}, set lineWidth(value) {}
      };
    },
    closest() { return null; }
  }, {
    get(target, key) {
      if (key in target) return target[key];
      return () => {};
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    }
  });
}

function createAppContext() {
  const elements = new Map();
  const localValues = new Map();
  const windowListeners = new Map();
  const documentListeners = new Map();
  const document = {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement());
      return elements.get(id);
    },
    querySelector() { return createElement(); },
    querySelectorAll() { return []; },
    createElement() { return createElement(); },
    addEventListener(name, callback) { documentListeners.set(name, callback); },
    body: createElement()
  };
  const window = {
    addEventListener(name, callback) { windowListeners.set(name, callback); },
    AudioContext: class {}
  };
  const navigator = {
    onLine: false,
    vibrate() {},
    geolocation: { getCurrentPosition() {} }
  };
  const localStorage = {
    getItem(key) { return localValues.get(key) || null; },
    setItem(key, value) { localValues.set(key, String(value)); },
    removeItem(key) { localValues.delete(key); }
  };
  const context = {
    window,
    document,
    navigator,
    localStorage,
    console: { log() {}, warn() {}, error() {} },
    URLSearchParams,
    URL,
    location: { search: "", origin: "https://local.test", pathname: "/" },
    setTimeout(callback, delay) {
      if (delay === 0) return setImmediate(callback);
      return 1;
    },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    confirm() { return true; },
    alert() {},
    fetch() { return Promise.reject(new Error("offline test")); },
    AudioContext: class {},
    Html5Qrcode: class {
      constructor(id) { this.id = id; this.isScanning = false; }
      async start(camera, config, onScan) {
        this.camera = camera;
        this.config = config;
        this.onScan = onScan;
        this.isScanning = true;
      }
      async stop() { this.isScanning = false; }
      async clear() {}
      static async getCameras() { return [{ id: "rear", label: "back camera" }]; }
    },
    Html5QrcodeSupportedFormats: {
      CODE_128: 1, CODE_39: 2, CODE_93: 3, EAN_13: 4, EAN_8: 5,
      ITF: 6, UPC_A: 7, UPC_E: 8, QR_CODE: 9
    },
    IDBKeyRange: {
      lowerBound(value, open) { return { lower: value, open }; }
    }
  };
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync(APP_PATH, "utf8"), context, { filename: APP_PATH });
  return { context, document, navigator, elements, windowListeners, documentListeners };
}

function createCursorDatabase(records, batchLengths) {
  return {
    transaction([storeName]) {
      let complete = false;
      const tx = {
        error: null,
        objectStore() {
          return {
            openCursor(range) {
              const request = { result: null, error: null };
              const sorted = [...records[storeName]]
                .filter((record) => !range || record.localId > range.lower)
                .sort((a, b) => a.localId - b.localId);
              let index = 0;
              let batchLength = 0;
              const finish = () => {
                if (complete) return;
                complete = true;
                batchLengths.push(batchLength);
                setImmediate(() => tx.oncomplete?.());
              };
              const read = () => {
                const record = sorted[index];
                if (!record) {
                  request.result = null;
                  request.onsuccess?.();
                  finish();
                  return;
                }
                let continued = false;
                request.result = {
                  key: record.localId,
                  value: record,
                  continue() {
                    continued = true;
                    batchLength += 1;
                    index += 1;
                    setImmediate(read);
                  }
                };
                request.onsuccess?.();
                if (!continued) finish();
              };
              setImmediate(read);
              return request;
            }
          };
        }
      };
      return tx;
    }
  };
}

test("el callback del escáner evita decodificaciones repetidas consecutivas", () => {
  const { context } = createAppContext();
  const decoded = [];
  let time = 1000;
  const onScan = vm.runInContext("crearCallbackEscaneoCamara", context)(
    (value) => decoded.push(value),
    () => time
  );

  onScan(" JJD12345678 ");
  time += 100;
  onScan("JJD12345678");
  onScan("JJD87654321");
  assert.deepEqual(decoded, ["JJD12345678", "JJD87654321"]);
});

test("el perfil de cámara reduce FPS y restringe formatos de lectura", () => {
  const { context } = createAppContext();
  const config = vm.runInContext("crearConfiguracionEscaner()", context);
  assert.equal(config.fps, 10);
  assert.equal(config.disableFlip, true);
  assert.equal(config.useBarCodeDetectorIfSupported, true);
  assert.ok(config.formatsToSupport.includes(context.Html5QrcodeSupportedFormats.CODE_128));
  assert.deepEqual(
    JSON.parse(JSON.stringify(config.qrbox(320, 240))),
    { width: 240, height: 120 }
  );
});

test("al apagar el escáner se detienen las pistas de video y se limpia el contenedor", async () => {
  const { context, document } = createAppContext();
  const container = document.getElementById("camera-reader");
  let tracksStopped = 0;
  const video = createElement();
  video.srcObject = { getTracks: () => [{ stop() { tracksStopped += 1; } }] };
  container.querySelector = () => video;
  let scannerStopped = 0;
  let scannerCleared = 0;
  const scanner = {
    isScanning: true,
    async stop() { scannerStopped += 1; this.isScanning = false; },
    async clear() { scannerCleared += 1; }
  };

  await vm.runInContext("liberarRecursosEscaner", context)(scanner, "camera-reader");
  assert.equal(scannerStopped, 1);
  assert.equal(scannerCleared, 1);
  assert.equal(tracksStopped, 1);
  assert.equal(video.srcObject, null);
  assert.equal(container.innerHTML, "");
});

test("al ocultar la aplicación durante un escaneo se libera la cámara", async () => {
  const { context, document, documentListeners } = createAppContext();
  document.getElementById("camera-frame-wrap").style.display = "none";
  await context.window.toggleCamaraPorToque();
  assert.equal(vm.runInContext("isCameraRunning", context), true);

  document.hidden = true;
  documentListeners.get("visibilitychange")();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(vm.runInContext("isCameraRunning", context), false);
  assert.equal(vm.runInContext("html5QrCode", context), null);
});

test("el escaneo conserva la transformación JJD→JD y bloquea estados duplicados del lote", () => {
  const { context } = createAppContext();
  vm.runInContext("userRol = 'TLAYACANQUI'; bultosLote = []; bultosABordo = [];", context);

  context.procesarCodigoEscaneado("JJD12345678");
  context.procesarCodigoEscaneado("JJD12345678");
  assert.equal(vm.runInContext("bultosLote.length", context), 1);
  assert.equal(vm.runInContext("bultosLote[0].pid", context), "JD12345678");
});

test("las pids hermanas se indexan una vez por guía y omiten alias duplicados", () => {
  const { context } = createAppContext();
  const manifest = {
    pids_lookup: {
      JD1: { pid: "JD1", hwb: "HWB-1" },
      JJD1: { pid: "JD1", hwb: "HWB-1" },
      JD2: { pid: "JD2", hwb: "HWB-1" },
      JD3: { pid: "JD3", hwb: "HWB-2" }
    }
  };
  const getSiblings = vm.runInContext("obtenerPidsDeGuiaMadre", context);
  assert.deepEqual(JSON.parse(JSON.stringify(getSiblings(manifest, " HWB-1 "))), ["JD1", "JD2"]);
  assert.deepEqual(JSON.parse(JSON.stringify(getSiblings(manifest, "HWB-2"))), ["JD3"]);
});

test("las consultas simultáneas de memoria de domicilio comparten la petición", async () => {
  const { context } = createAppContext();
  let requests = 0;
  context.fetch = async () => {
    requests += 1;
    await new Promise((resolve) => setImmediate(resolve));
    return { ok: true, json: async () => ({ encontrada: true }) };
  };
  const lookup = vm.runInContext("consultarMemoriaDomicilioRemota", context);
  const [first, second] = await Promise.all([lookup("JD123"), lookup("JD123")]);
  assert.equal(requests, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), { encontrada: true });
  assert.deepEqual(JSON.parse(JSON.stringify(second)), { encontrada: true });
});

test("una recarga forzada solicitada durante una carga normal no se descarta", async () => {
  const { context, navigator } = createAppContext();
  navigator.onLine = true;
  vm.runInContext("optimizarYGenerarHojaDeRuta = function() {};", context);
  const resolvers = [];
  let requests = 0;
  context.fetch = () => {
    requests += 1;
    return new Promise((resolve) => resolvers.push(resolve));
  };

  const loadNormal = vm.runInContext("cargarManifiestoOperativo(false)", context);
  await new Promise((resolve) => setImmediate(resolve));
  const loadForced = vm.runInContext("cargarManifiestoOperativo(true)", context);
  const response = {
    ok: true,
    async json() {
      return {
        exito: true,
        pids: [{ pid: "JD12345678", hwb: "1234567890", chofer: "driver@example.com" }]
      };
    }
  };
  resolvers[0](response);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 2);
  resolvers[1](response);
  await Promise.all([loadNormal, loadForced]);
});

test("la respuesta Poka-Yoke solo confirma HTTP 200 con JSON exito true", async () => {
  const { context } = createAppContext();
  const confirmed = vm.runInContext("respuestaSincronizacionConfirmada", context);
  assert.equal(await confirmed({ status: 200, json: async () => ({ exito: true }) }), true);
  assert.equal(await confirmed({ status: 201, json: async () => ({ exito: true }) }), false);
  assert.equal(await confirmed({ status: 200, json: async () => ({ exito: false }) }), false);
  assert.equal(await confirmed({ status: 200, json: async () => { throw new Error("invalid JSON"); } }), false);
});

test("la sincronización IndexedDB procesa por lotes y solo elimina registros confirmados", async () => {
  const { context, navigator } = createAppContext();
  navigator.onLine = true;
  const deliveries = Array.from({ length: 31 }, (_, index) => ({
    localId: index + 1,
    tipo: "ENTREGA"
  }));
  const records = { lotes_pendientes: deliveries };
  const batchLengths = [];
  const db = createCursorDatabase(records, batchLengths);
  const deleted = [];
  vm.runInContext(
    "deletePendingRecord = async (store, id) => { " +
    "globalThis.__deleted.push(id); " +
    "globalThis.__records[store] = globalThis.__records[store].filter((r) => r.localId !== id); " +
    "};",
    Object.assign(context, { __deleted: deleted, __records: records })
  );

  const sent = [];
  const synchronized = await vm.runInContext("sincronizarColaPorLotes", context)(
    db,
    "lotes_pendientes",
    async (record) => {
      sent.push(record.localId);
      return record.localId !== 2;
    }
  );

  assert.equal(synchronized, 30);
  assert.equal(sent.length, 31);
  assert.deepEqual(deleted, deliveries.filter((record) => record.localId !== 2).map((record) => record.localId));
  assert.deepEqual(records.lotes_pendientes.map((record) => record.localId), [2]);
  assert.ok(Math.max(...batchLengths) <= 25);
  assert.equal(batchLengths.length, 2);
});
