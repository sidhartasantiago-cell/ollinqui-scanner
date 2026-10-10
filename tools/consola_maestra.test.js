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
      getItem: () => null,
      setItem() {}
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
  return { context, elements, document };
}

test("las cinco pestañas existentes tienen botón, panel y entrada en ALL_TABS", () => {
  const { context } = loadConsole();
  const buttons = [...HTML.matchAll(/id="tab-([a-z]+)-btn"/g)].map(match => match[1]);
  const panels = [...HTML.matchAll(/id="tab-([a-z]+)-content"/g)].map(match => match[1]);
  const tabs = Array.from(vm.runInContext("ALL_TABS", context));

  const declaredIds = new Set([...HTML.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const referencedIds = [...HTML.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(match => match[1]);
  const unresolvedIds = [...new Set(referencedIds.filter(id =>
    !declaredIds.has(id) && id !== "console-toast-region" && !id.includes("${")
  ))];
  assert.deepEqual(buttons, tabs);
  assert.deepEqual(panels, tabs);
  assert.equal(tabs.length, 5);
  assert.equal(HTML.includes("tab-nomina-btn"), false);
  assert.equal(HTML.includes("tab-aclaraciones-btn"), false);
  assert.deepEqual(unresolvedIds, []);
  assert.equal(typeof context.switchTab, "function");
  const inlineScripts = [...HTML.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(inlineScripts.length >= 2);
  inlineScripts.forEach((match, index) => {
    const source = match[1].replace('const CURRENT_ROLE = "<?= role ?>";', 'const CURRENT_ROLE = "todos";');
    assert.doesNotThrow(() => new vm.Script(source), `el script inline ${index + 1} debe ser JavaScript válido`);
  });
});

test("switchTab activa solo el panel elegido y carga cada pestaña al entrar", async () => {
  const { context, elements } = loadConsole();
  const calls = [];
  context.calls = calls;
  vm.runInContext(`
    ALL_TABS.forEach(tab => {
      TAB_LOADERS[tab] = [() => {
        calls.push(tab);
        return Promise.resolve(true);
      }];
    });
  `, context);

  for (const tab of vm.runInContext("ALL_TABS", context)) {
    assert.equal(context.switchTab(tab), true);
    await context.cargarDatosDePestana(tab);
    assert.equal(elements.get(`tab-${tab}-content`).classList.contains("hidden"), false);
    for (const otherTab of vm.runInContext("ALL_TABS", context)) {
      if (otherTab !== tab) {
        assert.equal(elements.get(`tab-${otherTab}-content`).classList.contains("hidden"), true);
      }
    }
  }

  assert.deepEqual(calls, Array.from(vm.runInContext("ALL_TABS", context)));
  assert.equal(context.switchTab("nomina"), false);
});

test("los datos compartidos de pickups se consultan una sola vez entre pestañas", async () => {
  const { context } = loadConsole();
  let calls = 0;
  context.loadSharedPickups = () => {
    calls++;
    return new Promise(resolve => setTimeout(() => resolve(true), 5));
  };

  const [first, second] = await Promise.all([
    context.cargarDatoCompartido("test-pickups", context.loadSharedPickups),
    context.cargarDatoCompartido("test-pickups", context.loadSharedPickups)
  ]);
  assert.equal(first, true);
  assert.equal(second, true);
  assert.equal(calls, 1);
});

test("el rol de Irvin y Daniel conserva su mapeo y abre la pestaña correspondiente", () => {
  const { context } = loadConsole();
  const calls = [];
  context.calls = calls;
  vm.runInContext(`
    TAB_LOADERS.rampa = [() => { calls.push('rampa'); return Promise.resolve(true); }];
    TAB_LOADERS.sierra = [() => { calls.push('sierra'); return Promise.resolve(true); }];
  `, context);

  assert.equal(vm.runInContext('CONSOLE_SUPERVISORS["irvin.reyes@arauto.express"].role', context), "irvin");
  assert.equal(vm.runInContext('CONSOLE_SUPERVISORS["xichudaniel@gmail.com"].role', context), "daniel");

  context.aplicarSesionConsola("irvin.reyes@arauto.express", "irvin", "Irvin Reyes");
  assert.equal(vm.runInContext("activeTab", context), "rampa");
  assert.deepEqual(calls, ["rampa"]);
  context.aplicarSesionConsola("xichudaniel@gmail.com", "daniel", "Daniel Juárez");
  assert.equal(vm.runInContext("activeTab", context), "sierra");
  assert.deepEqual(calls, ["rampa", "sierra"]);
});

test("un RPC de lectura reintenta tras timeout y acepta la segunda respuesta", async () => {
  let calls = 0;
  const { context } = loadConsole({
    onRpc(method, _args, handlers) {
      calls++;
      if (method === "obtenerPickupsActivosQRO" && calls === 2) {
        setTimeout(() => handlers.success([{ id_pu: "PU-1" }]), 0);
      }
    }
  });

  const response = await context.llamarAppsScript(
    "obtenerPickupsActivosQRO",
    [],
    { timeoutMs: 5 }
  );
  assert.deepEqual(Array.from(response), [{ id_pu: "PU-1" }]);
  assert.equal(calls, 2);
});

test("una mutación con timeout no se reintenta y activa el callback de error", async () => {
  let calls = 0;
  let failure;
  const { context } = loadConsole({
    onRpc() {
      calls++;
    }
  });
  context.captureFailure = error => { failure = error; };

  await vm.runInNewContext(`
    crearRunnerAppsScript({}, { timeoutMs: 5, reintentos: 0 })
      .withFailureHandler(captureFailure)
      .ejecutarDespachoBookingACampo({ id_booking: "BOOK-1" });
  `, context);

  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(calls, 1);
  assert.match(failure.message, /Tiempo de espera agotado/);
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

test("el renderizado por lotes divide cientos de filas y conserva el orden", async () => {
  const { context } = loadConsole();
  const table = makeElement("table-body");
  const rows = Array.from({ length: 95 }, (_, index) => `<tr>${index}</tr>`);

  await context.renderizarFilasEnLotes(table, rows, "");

  assert.equal(table.chunks.length, 3);
  assert.match(table.chunks[0], /^<tr>0<\/tr>/);
  assert.match(table.chunks[2], /<tr>94<\/tr>$/);
});
