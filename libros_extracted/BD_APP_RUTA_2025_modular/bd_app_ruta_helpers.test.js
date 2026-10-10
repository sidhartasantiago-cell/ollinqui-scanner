"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const moduleDirectory = __dirname;
const context = vm.createContext({});
const sourceFiles = [
  path.join(moduleDirectory, "..", "shared", "utils.gs"),
  ...fs.readdirSync(moduleDirectory)
    .filter(file => file.endsWith(".gs"))
    .sort()
    .map(file => path.join(moduleDirectory, file))
];

for (const file of sourceFiles) {
  vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

function createSheet(headers, rows) {
  const values = [headers, ...rows];
  const writes = [];
  return {
    values,
    writes,
    getLastColumn: () => headers.length,
    getRange(row, column) {
      return {
        getValues: () => [values[row - 1].slice(column - 1)],
        setValue(value) {
          writes.push({ row, column, value });
          values[row - 1][column - 1] = value;
        }
      };
    },
    getDataRange: () => ({ getValues: () => values })
  };
}

function makeContentService() {
  return {
    MimeType: { JSON: "application/json", TEXT: "text/plain" },
    createTextOutput(content) {
      return {
        content,
        setMimeType(type) {
          this.mimeType = type;
          return this;
        }
      };
    }
  };
}

test("normaliza PID JJD a JD para comparar y lo presenta como JJD en ruta", () => {
  assert.equal(context.sanitizarPIDParaBoveda(" jjd123 "), "JD123");
  assert.equal(context.formatearPIDParaRuta_("jd123"), "JJD123");
  assert.equal(context.formatearPIDParaRuta_("JJD123"), "JJD123");
  assert.equal(context.formatearPIDParaRuta_("ABC123"), "ABC123");
});

test("resuelve aliases dinamicos sin depender del orden de columnas", () => {
  const sheet = createSheet(
    ["NOTAS", "Escaneo_Validation", "estatus", "Piece ID"],
    []
  );
  assert.equal(
    context.obtenerIndiceUnicoEncabezado_(sheet, ["PID_CODIGO", "PID", "Piece ID"], "PID"),
    3
  );
  assert.equal(
    context.obtenerIndiceUnicoEncabezado_(
      sheet,
      ["ESCANEO_VALIDACION", "ESCANEO_VALIDATION", "VALIDACION"],
      "Escaneo_Validacion"
    ),
    1
  );
  assert.equal(
    context.obtenerIndiceUnicoEncabezado_(sheet, ["ESTATUS_PID", "ESTATUS"], "Estatus_PID", false),
    2
  );
});

test("rechaza falta y ambiguedad de encabezados requeridos", () => {
  const missing = createSheet(["PID", "ESTATUS"], []);
  assert.throws(
    () => context.obtenerIndiceUnicoEncabezado_(missing, ["ESCANEO_VALIDACION", "VALIDACION"], "Escaneo"),
    /Falta el encabezado/
  );

  const ambiguous = createSheet(["PID", "Piece ID", "PID_CODIGO"], []);
  assert.throws(
    () => context.obtenerIndiceUnicoEncabezado_(ambiguous, ["PID", "Piece ID", "PID_CODIGO"], "PID"),
    /ambiguos/
  );
});

test("actualiza solo escaneo y estatus con encabezados desplazados", () => {
  const sheet = createSheet(
    ["ESTATUS", "NOTAS", "ESCANEO_VALIDATION", "Piece ID", "OTRO"],
    [["PENDIENTE", "conservar", "", "JD123", "sin cambio"]]
  );

  const result = context.actualizarEscaneoPID_(sheet, "JJD123", "A_BORDO");

  assert.equal(result.status, "success");
  assert.equal(result.pid, "JJD123");
  assert.equal(result.row, 2);
  assert.deepEqual(sheet.writes, [
    { row: 2, column: 3, value: "A_BORDO" },
    { row: 2, column: 1, value: "OK" }
  ]);
  assert.deepEqual(sheet.values[1], ["OK", "conservar", "A_BORDO", "JD123", "sin cambio"]);
});

test("no modifica filas cuando el PID no existe o aparece duplicado", () => {
  const headers = ["PID", "VALIDACION", "ESTATUS"];
  const missing = createSheet(headers, [["JD111", "", ""]]);
  assert.equal(context.actualizarEscaneoPID_(missing, "JJD999", "A_BORDO").status, "not_found");
  assert.equal(missing.writes.length, 0);

  const duplicate = createSheet(headers, [["JJD123", "", ""], ["JD123", "", ""]]);
  assert.equal(context.actualizarEscaneoPID_(duplicate, "JD123", "A_BORDO").status, "ambiguous");
  assert.equal(duplicate.writes.length, 0);
});

test("doPost rechaza JSON malformado, arreglos y PID ausente sin abrir Sheets", () => {
  let opened = false;
  context.ContentService = makeContentService();
  context.SpreadsheetApp = {
    getActiveSpreadsheet() {
      opened = true;
      throw new Error("No debería abrir Sheets en solicitudes inválidas.");
    }
  };

  for (const body of ["{", "[]", "{}", JSON.stringify({ pid: "  " })]) {
    const response = context.doPost({ postData: { contents: body } });
    assert.equal(JSON.parse(response.content).status, "error");
  }
  assert.equal(opened, false);
});

test("doPost procesa un escaneo con mocks y devuelve el PID de campo", () => {
  const sheet = createSheet(
    ["NOTAS", "PID_CODIGO", "ESTATUS_PID", "ESCANEO_VALIDACION"],
    [["nota", "JD456", "PENDIENTE", ""]]
  );
  context.ContentService = makeContentService();
  context.SpreadsheetApp = {
    getActiveSpreadsheet: () => ({
      getSheetByName: name => name === "PIEZAS_PID" ? sheet : null
    })
  };

  const response = context.doPost({
    postData: { contents: JSON.stringify({ pid: "jjd456", estatus: "EN_RUTA" }) }
  });
  const result = JSON.parse(response.content);

  assert.equal(response.mimeType, "application/json");
  assert.equal(result.status, "success");
  assert.equal(result.pid, "JJD456");
  assert.equal(result.fila, 2);
  assert.equal(sheet.values[1][3], "EN_RUTA");
  assert.equal(sheet.values[1][2], "OK");
});

test("doPost informa hoja ausente, PID inexistente y PID ambiguo", () => {
  context.ContentService = makeContentService();
  context.SpreadsheetApp = {
    getActiveSpreadsheet: () => ({ getSheetByName: () => null })
  };
  let result = JSON.parse(context.doPost({
    postData: { contents: JSON.stringify({ pid: "JD1" }) }
  }).content);
  assert.equal(result.status, "error");
  assert.match(result.message, /pestaña PIEZAS_PID/);

  for (const rows of [[["JD1", "", ""]], [["JD2", "", ""], ["JJD2", "", ""]]]) {
    const sheet = createSheet(["PID", "VALIDACION", "ESTATUS"], rows);
    context.SpreadsheetApp = {
      getActiveSpreadsheet: () => ({ getSheetByName: () => sheet })
    };
    result = JSON.parse(context.doPost({
      postData: { contents: JSON.stringify({ pid: rows.length === 1 ? "JD9" : "JD2" }) }
    }).content);
    assert.equal(result.status, rows.length === 1 ? "not_found" : "error");
    assert.equal(sheet.writes.length, 0);
  }
});

test("doOptions auxiliar devuelve texto sin invocar API no compatible de encabezados", () => {
  context.ContentService = makeContentService();
  const response = context.doOptions({});
  assert.equal(response.content, "");
  assert.equal(response.mimeType, "text/plain");
  assert.equal(response.headers, undefined);
});
