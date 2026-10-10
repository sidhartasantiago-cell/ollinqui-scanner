const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = vm.createContext({});
const sourceFiles = [
  path.join(__dirname, "..", "shared", "utils.gs"),
  path.join(__dirname, "00_config.gs"),
  path.join(__dirname, "04_queries_qro.gs")
];

for (const file of sourceFiles) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

function createSheet(headers, name) {
  return {
    getLastColumn: () => headers.length,
    getName: () => name,
    getRange: () => ({ getValues: () => [headers] })
  };
}

test("la pestaña operativa conserva el esquema y orden canónico de 25 columnas", () => {
  const headers = vm.runInContext("VALIDACION_QRO_HEADERS", context);
  const indexes = context.obtenerIndicesEsquema_(
    createSheet(headers, "VALIDACIÓN_QRO_2025"),
    headers
  );

  assert.equal(headers.length, 25);
  assert.equal(indexes.KEY, 16);
  assert.equal(indexes.Telefono, 20);
  assert.equal(indexes["Aprobación Auditor"], 22);
  assert.equal(indexes["Marca de Tiempo"], 24);
});

test("el esquema de recolecciones se valida de forma independiente", () => {
  const headers = vm.runInContext("RECOLECCIONES_VALIDACION_HEADERS", context);
  const indexes = context.obtenerIndicesEsquema_(
    createSheet(headers, "RECOLECCIONES_VALIDACION"),
    headers
  );

  assert.equal(headers.length, 18);
  assert.equal(indexes["Aprobación Auditor"], 15);
  assert.equal(indexes["Motivo de Rechazo"], 16);
});

test("rechaza columnas extra y cualquier desplazamiento del esquema", () => {
  const headers = vm.runInContext("VALIDACION_QRO_HEADERS", context);

  assert.throws(
    () => context.obtenerIndicesEsquema_(
      createSheet(headers.slice(1), "VALIDACIÓN_QRO_2025"),
      headers
    ),
    /exactamente 25 columnas/
  );

  const shiftedHeaders = headers.slice();
  [shiftedHeaders[16], shiftedHeaders[17]] = [shiftedHeaders[17], shiftedHeaders[16]];
  assert.throws(
    () => context.obtenerIndicesEsquema_(
      createSheet(shiftedHeaders, "VALIDACIÓN_QRO_2025"),
      headers
    ),
    /orden de columnas/
  );
});

test("la escritura de campo normaliza PID a JJD usando la utilidad compartida", () => {
  assert.equal(context.formatearPidParaCampo_("JJD123"), "JJD123");
  assert.equal(context.formatearPidParaCampo_("JD123"), "JJD123");
  assert.equal(context.formatearPidParaCampo_("123"), "JJD123");
  assert.equal(context.sanitizarPIDParaBoveda("JJD123"), "JD123");
});

test("el webhook preserva aprobación y rechazo en sus columnas, no en las de piezas y firma", () => {
  const pickupHeaders = vm.runInContext("RECOLECCIONES_VALIDACION_HEADERS", context);
  const row = [
    "PU-1", "BOOK-1", "Remitente", "Dirección", "76000", "chofer@arauto.express",
    "PENDIENTE", 3, 2, "firma-anterior", "foto-anterior", "motivo-anterior",
    "GPS", "timestamp", "hora", true, "Rechazo previo", new Date("2026-01-01T00:00:00Z")
  ];
  let updatedRow;
  const sheet = {
    getLastColumn: () => pickupHeaders.length,
    getLastRow: () => 2,
    getName: () => "RECOLECCIONES_VALIDACION",
    getRange: (startRow, startColumn, rowCount, columnCount) => ({
      getValues: () => startRow === 1
        ? [pickupHeaders]
        : [row.slice(startColumn - 1, startColumn - 1 + (columnCount || 1))],
      getValue: () => row[startColumn - 1],
      setValues: values => { updatedRow = values[0]; }
    })
  };
  const receptorContext = vm.createContext({
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    },
    LockService: {
      getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} })
    },
    Utilities: { formatDate: () => "09/10/2026 12:00:00" },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: content => ({
        content,
        setMimeType: () => ({ content })
      })
    }
  });
  for (const file of [
    path.join(__dirname, "..", "shared", "utils.gs"),
    path.join(__dirname, "00_config.gs"),
    path.join(__dirname, "01_receptor_pu.gs")
  ]) {
    vm.runInContext(fs.readFileSync(file, "utf8"), receptorContext, { filename: file });
  }

  const response = receptorContext.doPost({
    postData: {
      contents: JSON.stringify({
        id_pu: "PU-1",
        piezas_estimadas: 4,
        piezas_reales: 3,
        firma: "firma-nueva",
        estatus: "RECIBIDA"
      })
    }
  });
  const result = JSON.parse(response.content);

  assert.equal(result.exito, true);
  assert.equal(updatedRow[7], 4);
  assert.equal(updatedRow[8], 3);
  assert.equal(updatedRow[9], "firma-nueva");
  assert.equal(updatedRow[15], true);
  assert.equal(updatedRow[16], "Rechazo previo");
});
