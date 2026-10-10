"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const INDEX_PATH = path.join(__dirname, "..", "Index.html");
const HTML = fs.readFileSync(INDEX_PATH, "utf8");
const CLIENT_SCRIPT_MARKER = "<!-- ================= CLIENT SIDE JAVASCRIPT ================= -->";

function makeElement(id = "") {
  const classes = new Set();
  return {
    id,
    className: "",
    innerHTML: "",
    innerText: "",
    textContent: "",
    style: {},
    children: [],
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
      contains: name => classes.has(name)
    },
    setAttribute() {},
    removeAttribute(name) {
      delete this[name];
    },
    addEventListener() {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    insertAdjacentHTML(_position, html) {
      this.chunks.push(html);
      this.innerHTML += html;
    },
    remove() {},
    pause() {},
    load() {},
    chunks: []
  };
}

function extractClientScript(role) {
  const markerIndex = HTML.indexOf(CLIENT_SCRIPT_MARKER);
  assert.notEqual(markerIndex, -1, "debe existir el bloque de JavaScript de la consola");
  const scriptStart = HTML.indexOf("<script>", markerIndex);
  const scriptEnd = HTML.indexOf("</script>", scriptStart);
  assert.notEqual(scriptStart, -1, "debe abrir el bloque de JavaScript");
  assert.notEqual(scriptEnd, -1, "debe cerrar el bloque de JavaScript");
  return HTML.slice(scriptStart + "<script>".length, scriptEnd)
    .replace('const CURRENT_ROLE = "<?= role ?>";', `const CURRENT_ROLE = ${JSON.stringify(role)};`);
}

function createRunner(onCall) {
  const handlers = { success: null, failure: null };
  return new Proxy({}, {
    get(_target, property) {
      if (property === "withSuccessHandler") {
        return callback => createRunnerWithHandlers(onCall, { ...handlers, success: callback });
      }
      if (property === "withFailureHandler") {
        return callback => createRunnerWithHandlers(onCall, { ...handlers, failure: callback });
      }
      if (typeof property !== "string") return undefined;
      return (...args) => onCall(property, args, handlers);
    }
  });
}

function createRunnerWithHandlers(onCall, handlers) {
  return new Proxy({}, {
    get(_target, property) {
      if (property === "withSuccessHandler") {
        return callback => createRunnerWithHandlers(onCall, { ...handlers, success: callback });
      }
      if (property === "withFailureHandler") {
        return callback => createRunnerWithHandlers(onCall, { ...handlers, failure: callback });
      }
      if (typeof property !== "string") return undefined;
      return (...args) => onCall(property, args, handlers);
    }
  });
}

function loadConsole({ role = "todos", onRpc = () => {} } = {}) {
  const elements = new Map();
  const storage = new Map();
  const getElementById = id => {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  };
  const document = {
    body: makeElement("body"),
    getElementById,
    createElement: tag => makeElement(tag),
    querySelectorAll: () => [],
    addEventListener() {}
  };
  const context = {
    document,
    window: {
      lucide: { createIcons() {} },
      requestAnimationFrame: callback => setTimeout(callback, 0)
    },
    lucide: { createIcons() {} },
    google: { script: { run: createRunner(onRpc) } },
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, value)
    },
    console,
    setTimeout(callback, delay, ...args) {
      const timer = setTimeout(callback, delay, ...args);
      if (delay >= 6000) timer.unref();
      return timer;
    },
    clearTimeout,
    alert() {},
    confirm: () => true,
    prompt: () => "",
    encodeURIComponent,
    URL,
    Date
  };
  vm.runInNewContext(extractClientScript(role), context, { filename: INDEX_PATH });

  const tabs = vm.runInContext("ALL_TABS", context);
  tabs.forEach(tab => {
    getElementById(`tab-${tab}-btn`);
    getElementById(`tab-${tab}-content`);
  });
  return { context, elements, document, storage };
}

test("las siete pestañas tienen botón, panel y entrada en ALL_TABS", () => {
  const { context } = loadConsole();
  const buttons = [...HTML.matchAll(/id="tab-([a-z]+)-btn"/g)].map(match => match[1]);
  const panels = [...HTML.matchAll(/id="tab-([a-z]+)-content"/g)].map(match => match[1]);
  const tabs = Array.from(vm.runInContext("ALL_TABS", context));

  assert.deepEqual(buttons, tabs);
  assert.deepEqual(panels, tabs);
  assert.deepEqual(tabs, ["rampa", "auditoria", "sierra", "teoyolotl", "pickups", "nomina", "aclaraciones"]);
  assert.equal(tabs.length, 7);
  assert.equal(HTML.includes("tab-nomina-btn"), true);
  assert.equal(HTML.includes("tab-aclaraciones-btn"), true);
  const declaredIds = new Set([...HTML.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const fichaReferences = [...HTML.matchAll(/getElementById\(['"]((?:ficha-360-|modal-ficha-pericial-360)[^'"]*)['"]\)/g)].map(match => match[1]);
  assert.ok(fichaReferences.length > 0);
  assert.deepEqual([...new Set(fichaReferences.filter(id => !declaredIds.has(id)))], []);
  assert.equal(typeof context.switchTab, "function");
  const inlineScripts = [...HTML.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(inlineScripts.length >= 2);
  inlineScripts.forEach((match, index) => {
    const source = match[1].replace('const CURRENT_ROLE = "<?= role ?>";', 'const CURRENT_ROLE = "todos";');
    assert.doesNotThrow(() => new vm.Script(source), `el script inline ${index + 1} debe ser JavaScript válido`);
  });
});

test("el backend resuelve campos 360° por encabezado canónico sin desplazar las 25 columnas", () => {
  const backend = fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8");
  const names = [
    "normalizarEncabezadoAclaracion_",
    "crearIndiceEncabezadosAclaracion_",
    "obtenerCampoAclaracion_",
    "normalizarCPAclaracion_",
    "construirDireccionAclaracion_",
    "enriquecerTicketPericial360_"
  ];
  const declarations = names.map(name => {
    const marker = `function ${name}(`;
    const start = backend.indexOf(marker);
    assert.notEqual(start, -1, `${name} debe existir en Code.gs`);
    const opening = backend.indexOf("{", start);
    let depth = 0;
    for (let i = opening; i < backend.length; i++) {
      if (backend[i] === "{") depth++;
      if (backend[i] === "}" && --depth === 0) return backend.slice(start, i + 1);
    }
    assert.fail(`No se encontró el cierre de ${name}`);
  });
  const context = {
    DIRECTORIO_CONTACTO_POCHTECAS: {
      "chofer@arauto.express": { nombre: "Pochteca Test", tel: "4421234567" },
      "supervisor@arauto.express": { nombre: "Supervisión Test", tel: "" }
    }
  };
  vm.runInNewContext(declarations.join("\n"), context);

  const headers = [
    "Guia", "PID", "C.P.", "Piezas", "Rcvr Addr 1", "Rcvr Addr 2", "Rcvr Addr 3",
    "Receiver Name", "GPS", "Checkpoint", "Comentarios", "Fecha asignación",
    "Fecha en ruta", "Imagen fachada", "ID correo", "EDD", "KEY",
    "Tipo de servicio", "Inter", "Firma", "Telefono", "Hora de llegada",
    "Aprobación Auditor", "Motivo de Rechazo", "Marca de Tiempo"
  ];
  const index = context.crearIndiceEncabezadosAclaracion_(headers);
  assert.equal(index.key, 16);
  assert.equal(index.telefono, 20);

  const row = Array(25).fill("");
  row[0] = "1234567890";
  row[1] = "JJD123";
  row[2] = "76000";
  row[4] = "Calle Uno 10";
  row[5] = "Colonia Centro";
  row[7] = "Receptor";
  row[8] = "20.5,-100.4";
  row[9] = "OK";
  row[10] = "Entregado en recepción";
  row[13] = "https://evidence.example/fachada.jpg";
  row[14] = "chofer@arauto.express";
  row[19] = "https://evidence.example/firma.jpg";
  row[20] = "4427654321";
  assert.equal(context.obtenerCampoAclaracion_(row, index, ["GPS"]), "20.5,-100.4");
  assert.equal(context.obtenerCampoAclaracion_(row, index, ["Checkpoint", "Estatus"], 3), "OK");
  assert.equal(context.obtenerCampoAclaracion_(row, index, ["Receiver Name"], 4), "Receptor");
  assert.equal(context.obtenerCampoAclaracion_(row, index, ["Audio"], 7), "");
  assert.equal(context.obtenerCampoAclaracion_(row, index, ["Firma"]), "https://evidence.example/firma.jpg");

  const ticket = { emailChofer: "chofer@arauto.express" };
  context.enriquecerTicketPericial360_(ticket, {
    cp: row[2], direccion1: row[4], direccion2: row[5], receptor: row[7],
    gps: row[8], chk: row[9], comentarios: row[10], foto: row[13],
    pochteca: row[14], firma: row[19], telefono: row[20]
  }, {}, {
    "76000": { municipio: "Querétaro", zona: "Zona Metropolitana", supervisor: "supervisor@arauto.express" }
  });
  assert.equal(ticket.direccionCompleta, "Calle Uno 10, Colonia Centro");
  assert.equal(ticket.comunidadMunicipio, "Querétaro · Zona Metropolitana");
  assert.equal(ticket.telefonoContacto, "4427654321");
  assert.equal(ticket.telefonoChofer, "4421234567");
  assert.equal(ticket.supervisor, "Supervisión Test");
  assert.equal(ticket.gps, "20.5,-100.4");
  assert.equal(ticket.fotoFachada, "https://evidence.example/fachada.jpg");
  assert.equal(ticket.firma, "https://evidence.example/firma.jpg");
  assert.equal(ticket.comentariosPOD, "Entregado en recepción");
});

test("la Ficha 360° muestra expediente y enlaces seguros sin interpretar el texto DHL como HTML", () => {
  const { context, elements } = loadConsole();
  vm.runInContext(`cacheAclaraciones = [{
    ticketId: "TK-360",
    guia: "1234567890",
    pid: "JD123",
    direccionCompleta: "Calle Uno 10",
    cp: "76000",
    comunidadMunicipio: "Querétaro · Zona Metropolitana",
    telefonoContacto: "4427654321",
    gps: "20.5,-100.4",
    pochteca: "Pochteca Test",
    supervisor: "Supervisión Test",
    telefonoChofer: "442 123 4567",
    fotoFachada: "https://evidence.example/fachada.jpg",
    firma: "https://evidence.example/firma.jpg",
    audioTeoyolotl: "https://evidence.example/audio.mp3",
    comentariosPOD: "Entregado con recepción",
    asunto: "Aclaración <urgente>",
    fechaSolicitud: "2026-10-10",
    checkpoint: "OK",
    textoOriginalDhl: "<img src=x onerror=alert(1)> Texto original",
    macros: { macro1: "Dictamen de prueba" }
  }];`, context);

  context.abrirFichaPericial360("TK-360");
  assert.equal(elements.get("modal-ficha-pericial-360").classList.contains("hidden"), false);
  assert.equal(elements.get("ficha-360-asunto").textContent, "Aclaración <urgente>");
  assert.equal(elements.get("ficha-360-tel-contacto").textContent, "4427654321");
  assert.equal(elements.get("ficha-360-texto-dhl").textContent, "<img src=x onerror=alert(1)> Texto original");
  assert.equal(elements.get("ficha-360-maps").href, "https://www.google.com/maps/search/?api=1&query=20.5%2C-100.4");
  assert.equal(elements.get("ficha-360-llamar").href, "tel:+4421234567");
  assert.equal(elements.get("ficha-360-whatsapp").href, "https://wa.me/524421234567");
  assert.equal(elements.get("ficha-360-foto").src, "https://evidence.example/fachada.jpg");
  assert.equal(elements.get("ficha-360-audio").src, "https://evidence.example/audio.mp3");
  context.renderizarAclaracionesDHL([{
    ticketId: 'TK-<img src=x onerror=alert(1)>',
    guia: "1234567890",
    pid: "JD123",
    categoria: "ACTUALIZACION_ESTATUS",
    estatus: "ABIERTO",
    detalleDhl: '<img src=x onerror=alert(1)>',
    fechaSolicitud: "2026-10-10"
  }]);
  assert.doesNotMatch(elements.get("aclaraciones-table-body").innerHTML, /<img src=x onerror=/);
  assert.match(elements.get("aclaraciones-table-body").innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  context.cerrarFichaPericial360();
  assert.equal(elements.get("modal-ficha-pericial-360").classList.contains("hidden"), true);
  assert.match(HTML, /id="modal-ficha-pericial-360"/);
  assert.match(HTML, /abrirFichaPericial360\(\$\{ticketIdArg\}\)/);
});

test("switchTab activa solo el panel elegido y carga cada pestaña al entrar", async () => {
  const { context, elements } = loadConsole();
  const calls = [];
  [
    "cargarBuzonGmail", "cargarMatrizMigracion", "cargarEntregasYMonitoreo",
    "restaurarCacheEDD", "cargarDatosSierra", "inicializarFechaD1",
    "cargarAuditoriasTeoyolotl", "cargarPickupsActivos", "cargarNominaPochtecas",
    "cargarAclaracionesDHL"
  ].forEach(name => { context[name] = () => calls.push(name); });

  const tabLoaders = {
    rampa: ["cargarBuzonGmail", "cargarMatrizMigracion"],
    auditoria: ["cargarEntregasYMonitoreo", "restaurarCacheEDD"],
    sierra: ["inicializarFechaD1", "cargarDatosSierra"],
    teoyolotl: ["cargarAuditoriasTeoyolotl"],
    pickups: ["cargarPickupsActivos"],
    nomina: ["cargarNominaPochtecas"],
    aclaraciones: ["cargarAclaracionesDHL"]
  };

  for (const [tab, expectedCalls] of Object.entries(tabLoaders)) {
    context.switchTab(tab);
    assert.equal(elements.get(`tab-${tab}-content`).classList.contains("hidden"), false);
    for (const otherTab of vm.runInContext("ALL_TABS", context)) {
      if (otherTab !== tab) {
        assert.equal(elements.get(`tab-${otherTab}-content`).classList.contains("hidden"), true);
      }
    }
    assert.deepEqual(calls.splice(0), expectedCalls);
  }
});

test("la pestaña Aclaraciones delega la carga al endpoint V2 sin duplicar su controlador", () => {
  const { context } = loadConsole();
  assert.equal(typeof context.cargarAclaracionesDHL, "function");
  assert.match(HTML, /function\s+cargarAclaracionesDHL\s*\(/);
  const backend = fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8");
  assert.match(backend, /function\s+obtenerAclaracionesAbiertasV2\s*\(/);
  assert.match(backend, /function\s+obtenerAclaracionesAbiertas\s*\(\)\s*\{\s*return obtenerAclaracionesAbiertasV2\(\)/);
});

test("Irvin conserva acceso global y Daniel queda limitado a Sierra Gorda", () => {
  const { context, storage } = loadConsole();
  assert.equal(vm.runInContext('CONSOLE_SUPERVISORS["irvin.reyes@arauto.express"].role', context), "irvin");
  assert.equal(vm.runInContext('CONSOLE_SUPERVISORS["xichudaniel@gmail.com"].role', context), "daniel");

  storage.set("ollin_console_role", "irvin");
  context.switchTab("auditoria");
  assert.equal(vm.runInContext("activeTab", context), "auditoria");

  storage.set("ollin_console_role", "daniel");
  context.switchTab("rampa");
  assert.equal(vm.runInContext("activeTab", context), "sierra");
});

test("las cargas lazy apuntan a funciones disponibles en el backend", () => {
  const appsScript = [
    fs.readFileSync(path.join(__dirname, "..", "Code.gs"), "utf8"),
    fs.readFileSync(path.join(__dirname, "..", "LectorIA_Pickups.js"), "utf8")
  ].join("\n");

  [
    "obtenerConsolaSierra",
    "obtenerAuditoriasTeoyolotl",
    "obtenerChoferesQRO",
    "obtenerPickupsActivosQRO",
    "obtenerEntregasActivasQRO",
    "buscarCorreosBatchQRO"
  ].forEach(method => {
    assert.match(appsScript, new RegExp(`function\\s+${method}\\s*\\(`), `${method} debe existir en Apps Script`);
  });
});
