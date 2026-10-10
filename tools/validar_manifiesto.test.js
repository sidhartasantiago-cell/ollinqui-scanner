"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const XLSX = require("xlsx");

const validator = require("./validar_manifiesto");
const CANONICAL_HEADERS = [
  "Guia", "PID", "C.P.", "Piezas", "Rcvr Addr 1", "Rcvr Addr 2", "Rcvr Addr 3",
  "Receiver Name", "GPS", "Checkpoint", "Comentarios", "Fecha asignación",
  "Fecha en ruta", "Imagen fachada", "ID correo", "EDD", "KEY", "Tipo de servicio",
  "Inter", "Firma", "Telefono", "Hora de llegada", "Aprobación Auditor",
  "Motivo de Rechazo", "Marca de Tiempo"
];

function canonicalInput(overrides = {}) {
  const row = Array(CANONICAL_HEADERS.length).fill("");
  row[0] = "GUIDE-1";
  row[1] = "JJD123";
  row[2] = "76000";
  row[3] = "1";
  for (const [key, value] of Object.entries(overrides)) {
    row[CANONICAL_HEADERS.indexOf(key)] = value;
  }
  return { sheets: [{ name: "VALIDACION", matrix: [CANONICAL_HEADERS, row] }], corruptEncoding: false };
}

function tempDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ollin-manifiesto-"));
}

test("acepta el esquema canónico exacto y cuenta PID JJD", () => {
  const result = validator.analyzeManifest(canonicalInput());
  assert.equal(result.exitCode, 0);
  assert.equal(result.stats.canonicalSheets, 1);
  assert.equal(result.stats.jjdCount, 1);
  assert.equal(result.stats.jdCount, 0);
  assert.match(validator.formatReport(result, true), /\u001b\[/);
});

test("bloquea manifiestos sin filas de datos", () => {
  const result = validator.analyzeManifest({
    sheets: [{ name: "DHL", matrix: [["HWB No", "Piece ID"]] }],
    corruptEncoding: false
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some((finding) => finding.code === "NO_DATA_ROWS"));
});

test("bloquea alteraciones en el orden del esquema canónico", () => {
  const headers = [...CANONICAL_HEADERS];
  [headers[16], headers[20]] = [headers[20], headers[16]];
  const result = validator.analyzeManifest({
    sheets: [{ name: "VALIDACION", matrix: [headers, canonicalInput().sheets[0].matrix[1]] }],
    corruptEncoding: false
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some((finding) => finding.code === "CANONICAL_SCHEMA_MISMATCH"));
});

test("reconoce alias DHL, PID JD, y código postal", () => {
  const result = validator.analyzeManifest({
    sheets: [{
      name: "DHL",
      matrix: [
        ["HWB No", "Piece ID", "Rcvr Postcode", "Piece No"],
        ["HWB-1", "JD987", "76000", "2"]
      ]
    }],
    corruptEncoding: false
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stats.jdCount, 1);
  assert.equal(result.stats.dataRows, 1);
});

test("normaliza JD y JJD al detectar PID duplicado", () => {
  const result = validator.analyzeManifest({
    sheets: [{
      name: "DHL",
      matrix: [
        ["HWB No", "Piece ID"],
        ["HWB-1", "JJD123"],
        ["HWB-2", "JD123"]
      ]
    }],
    corruptEncoding: false
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some((finding) => finding.code === "DUPLICATE_PID"));
  assert.ok(result.findings.some((finding) => finding.code === "MIXED_PID_FORMAT"));
});

test("advierte guías sin CP sin bloquear la recepción", () => {
  const result = validator.analyzeManifest({
    sheets: [{
      name: "DHL",
      matrix: [["HWB No", "Piece ID", "CP"], ["HWB-1", "JD123", ""]]
    }],
    corruptEncoding: false
  });
  assert.equal(result.exitCode, 0);
  assert.ok(result.findings.some((finding) => finding.code === "EMPTY_POSTCODE"));
});

test("advierte si falta la columna CP y acepta alias DHL adicionales conocidos", () => {
  const result = validator.analyzeManifest({
    sheets: [{
      name: "DHL",
      matrix: [
        ["HWB No", "Piece ID", "Description", "Orig Ctry", "Formulas"],
        ["HWB-1", "JD123", "Ropa", "MX", "A+B"]
      ]
    }],
    corruptEncoding: false
  });
  assert.equal(result.exitCode, 0);
  assert.ok(result.findings.some((finding) => finding.code === "MISSING_POSTCODE_HEADER"));
  assert.equal(result.findings.some((finding) => finding.code === "UNKNOWN_HEADER"), false);
});

test("detecta PID duplicados entre hojas de un libro Excel/JSON", () => {
  const result = validator.analyzeManifest({
    sheets: [
      { name: "Parte 1", matrix: [["HWB No", "Piece ID"], ["HWB-1", "JJD123"]] },
      { name: "Parte 2", matrix: [["HWB No", "Piece ID"], ["HWB-2", "JD123"]] }
    ],
    corruptEncoding: false
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some((finding) => finding.code === "DUPLICATE_PID_ACROSS_SHEETS"));
});

test("ignora hojas vacías cuando el libro contiene datos válidos", () => {
  const result = validator.analyzeManifest({
    sheets: [
      { name: "DHL", matrix: [["HWB No", "Piece ID"], ["HWB-1", "JD123"]] },
      { name: "Hoja en blanco", matrix: [] }
    ],
    corruptEncoding: false
  });
  assert.equal(result.exitCode, 0);
});

test("bloquea campos clave vacíos y cantidades inválidas", () => {
  const result = validator.analyzeManifest({
    sheets: [{
      name: "DHL",
      matrix: [["HWB No", "Piece ID", "Piece No"], ["", "", "0"]]
    }],
    corruptEncoding: false
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some((finding) => finding.code === "EMPTY_GUIDE"));
  assert.ok(result.findings.some((finding) => finding.code === "EMPTY_PID"));
  assert.ok(result.findings.some((finding) => finding.code === "INVALID_PIECES"));
});

test("bloquea columnas sin encabezado y valores que exceden el ancho del esquema", () => {
  const result = validator.analyzeManifest({
    sheets: [{
      name: "DHL",
      matrix: [["HWB No", "Piece ID", ""], ["HWB-1", "JD123", "", "EXTRA"]]
    }],
    corruptEncoding: false
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some((finding) => finding.code === "EMPTY_HEADER"));
  assert.ok(result.findings.some((finding) => finding.code === "ROW_WIDTH_MISMATCH"));
});

test("detecta encabezados desconocidos, prefijos PID anómalos y mojibake", () => {
  const result = validator.analyzeManifest({
    sheets: [{
      name: "DHL",
      matrix: [["HWB No", "Piece ID", "Unexpected"], ["HWB-1", "XX1", "JosÃ©"]]
    }],
    corruptEncoding: false
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some((finding) => finding.code === "UNKNOWN_HEADER"));
  assert.ok(result.findings.some((finding) => finding.code === "PID_PREFIX"));
  assert.ok(result.findings.some((finding) => finding.code === "MOJIBAKE"));
});

test("bloquea caracteres inválidos de codificación y de control", () => {
  const result = validator.analyzeManifest({
    sheets: [{
      name: "DHL",
      matrix: [["HWB No", "Piece ID"], ["HWB-1", "JD12\u0001\uFFFD"]]
    }],
    corruptEncoding: true
  });
  assert.equal(result.exitCode, 1);
  assert.ok(result.findings.some((finding) => finding.code === "INVALID_ENCODING"));
  assert.ok(result.findings.some((finding) => finding.code === "CONTROL_CHARACTER"));
});

test("analiza CSV con comillas, comas y saltos de línea embebidos", () => {
  const rows = validator.parseCsv('HWB No,Piece ID,Receiver Name\r\nHWB-1,JD1,"Lopez, Ana\nPiso 2"\r\n');
  assert.deepEqual(rows[1], ["HWB-1", "JD1", "Lopez, Ana\nPiso 2"]);
  assert.throws(() => validator.parseCsv('HWB No,Piece ID\nHWB-1,"JD1'), /comillas sin cerrar/);
});

test("acepta JSON como objetos y rechaza JSON inválido", () => {
  const directory = tempDirectory();
  try {
    const jsonPath = path.join(directory, "manifest.json");
    fs.writeFileSync(jsonPath, JSON.stringify([{ "HWB No": "HWB-1", "Piece ID": "JD123" }]));
    assert.equal(validator.analyzeManifest(validator.loadInputFile(jsonPath)).exitCode, 0);

    fs.writeFileSync(jsonPath, "{");
    assert.throws(() => validator.loadInputFile(jsonPath), /JSON inválido/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("lee formatos XLS, XLSX y XLSM mediante SheetJS", () => {
  const directory = tempDirectory();
  try {
    for (const [extension, bookType] of [["xlsx", "xlsx"], ["xls", "xls"], ["xlsm", "xlsm"]]) {
      const filePath = path.join(directory, `manifest.${extension}`);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
        ["HWB No", "Piece ID", "CP"],
        ["HWB-1", "JD123", "76000"]
      ]), "DHL");
      fs.writeFileSync(filePath, XLSX.write(workbook, { type: "buffer", bookType }));
      assert.equal(validator.analyzeManifest(validator.loadInputFile(filePath)).exitCode, 0, extension);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("CLI devuelve 0 en un manifiesto apto y 1 con errores bloqueantes", () => {
  const directory = tempDirectory();
  try {
    const filePath = path.join(directory, "manifest.csv");
    const cliPath = path.join(__dirname, "validar_manifiesto.js");
    fs.writeFileSync(filePath, "HWB No,Piece ID,CP\nHWB-1,JD123,76000\n");
    const valid = spawnSync(process.execPath, [cliPath, "--no-color", filePath], { encoding: "utf8" });
    assert.equal(valid.status, 0, valid.stderr);
    assert.match(valid.stdout, /APTO/);

    fs.writeFileSync(filePath, "HWB No,Piece ID\nHWB-1,\n");
    const invalid = spawnSync(process.execPath, [cliPath, "--no-color", filePath], { encoding: "utf8" });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stdout, /NO APTO/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
