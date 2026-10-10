#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const XLSX = require("xlsx");

const SHARED_UTILS_PATH = path.join(__dirname, "..", "libros_extracted", "shared", "utils.gs");
const CANONICAL_HEADERS = [
  "Guia", "PID", "C.P.", "Piezas", "Rcvr Addr 1", "Rcvr Addr 2", "Rcvr Addr 3",
  "Receiver Name", "GPS", "Checkpoint", "Comentarios", "Fecha asignación",
  "Fecha en ruta", "Imagen fachada", "ID correo", "EDD", "KEY", "Tipo de servicio",
  "Inter", "Firma", "Telefono", "Hora de llegada", "Aprobación Auditor",
  "Motivo de Rechazo", "Marca de Tiempo"
];

const ALIASES = new Map();
const KNOWN_DHL_EXTRA_HEADERS = new Set([
  "orig ctry", "origin country", "orig_ctry", "pais origen",
  "description", "descripcion", "content", "commodity description",
  "description of goods", "formulas", "fórmulas", "formula", "fórmula", "ax",
  "dest ctry", "destination country", "dest_ctry"
].map(normalizeHeader));

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function registerAliases(canonical, aliases = []) {
  for (const alias of [canonical, ...aliases]) {
    ALIASES.set(normalizeHeader(alias), canonical);
  }
}

registerAliases("Guia", [
  "Guía", "hwb no", "hwb", "awb", "awb no", "search", "waybill", "airbill", "hawb"
]);
registerAliases("PID", [
  "piece id", "piece_id", "pieceid", "pieza id", "barcode", "piece no real"
]);
registerAliases("C.P.", [
  "cp", "postcode", "rcvr postcode", "receiver postcode", "rcvr postal code",
  "postal code", "rcvr_postcode"
]);
registerAliases("Piezas", [
  "pieces", "bultos", "piece no", "piece_no", "piece count", "piece number", "numero pieza"
]);
registerAliases("Rcvr Addr 1", [
  "receiver address 1", "address 1", "rcvr addr1", "rcvr_addr_1", "direccion 1"
]);
registerAliases("Rcvr Addr 2", [
  "receiver address 2", "address 2", "rcvr addr2", "rcvr_addr_2", "direccion 2"
]);
registerAliases("Rcvr Addr 3", [
  "receiver address 3", "address 3", "rcvr addr3", "rcvr_addr_3", "direccion 3"
]);
registerAliases("Receiver Name", [
  "receiver", "consignee", "receiver_name", "consignee name", "destinatario",
  "nombre_recibe", "nombre"
]);
registerAliases("GPS", ["gps", "coordenadas"]);
registerAliases("Checkpoint", ["checkpoint", "estatus", "status"]);
registerAliases("Comentarios", ["comments", "comment", "observaciones"]);
registerAliases("Fecha asignación", ["fecha asignacion", "assignment date"]);
registerAliases("Fecha en ruta", ["fecha en ruta", "route date"]);
registerAliases("Imagen fachada", ["front image", "fachada"]);
registerAliases("ID correo", ["mail id", "email id"]);
registerAliases("EDD", ["estimated delivery", "fecha estimada", "estimated_delivery_date"]);
registerAliases("KEY", ["key"]);
registerAliases("Tipo de servicio", ["service type", "tipo servicio"]);
registerAliases("Inter", ["inter"]);
registerAliases("Firma", ["signature", "firma"]);
registerAliases("Telefono", [
  "rcvr tel", "receiver phone", "receiver tel", "tel", "phone", "rcvr_tel",
  "shipper tel", "shipper phone"
]);
registerAliases("Hora de llegada", ["arrival time", "hora llegada"]);
registerAliases("Aprobación Auditor", ["aprobacion auditor", "auditor approval"]);
registerAliases("Motivo de Rechazo", ["rejection reason", "motivo rechazo"]);
registerAliases("Marca de Tiempo", ["timestamp", "marca tiempo"]);

const sharedUtils = (() => {
  const sandbox = {};
  const source = fs.readFileSync(SHARED_UTILS_PATH, "utf8");
  vm.runInNewContext(source, sandbox, { filename: SHARED_UTILS_PATH });
  for (const name of ["safeJsonParse", "sanitizarPIDParaBoveda", "getColumnIndexes"]) {
    if (typeof sandbox[name] !== "function") {
      throw new Error(`No se pudo cargar ${name} desde libros_extracted/shared/utils.gs.`);
    }
  }
  return sandbox;
})();

function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function parseCsv(text) {
  const firstLine = String(text).split(/\r?\n/, 1)[0] || "";
  const delimiter = [",", ";", "\t"].map((candidate) => {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < firstLine.length; i += 1) {
      if (firstLine[i] === '"') {
        if (quoted && firstLine[i + 1] === '"') i += 1;
        else quoted = !quoted;
      } else if (!quoted && firstLine[i] === candidate) {
        count += 1;
      }
    }
    return { candidate, count };
  }).sort((a, b) => b.count - a.count)[0].candidate;

  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  let afterQuote = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        cell += char;
      }
    } else if (afterQuote && char !== delimiter && char !== "\n" && char !== "\r" && !/\s/.test(char)) {
      throw new Error("CSV inválido: hay texto después de cerrar un campo entre comillas.");
    } else if (char === '"' && cell === "" && !afterQuote) {
      quoted = true;
    } else if (char === '"' && !afterQuote) {
      throw new Error("CSV inválido: comilla inesperada dentro de un campo sin comillas.");
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
      afterQuote = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      afterQuote = false;
    } else {
      if (!afterQuote) cell += char;
    }
  }
  if (quoted) throw new Error("CSV inválido: campo entre comillas sin cerrar.");
  row.push(cell);
  if (row.some((value) => value !== "") || rows.length === 0) rows.push(row);
  return rows;
}

function toCellString(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((item) => item.text || "").join("");
    if (value.text !== undefined) return String(value.text);
    if (value.result !== undefined) return String(value.result);
    return JSON.stringify(value);
  }
  return String(value);
}

function jsonSheet(name, headers, rows) {
  return { name, matrix: [headers, ...rows] };
}

function parseJsonSheets(value) {
  const fromRecords = (name, records) => {
    if (!records.length || !records.every((record) => record && typeof record === "object" && !Array.isArray(record))) {
      throw new Error(`La hoja JSON "${name}" debe ser un arreglo de objetos.`);
    }
    const headers = [...new Set(records.flatMap((record) => Object.keys(record)))];
    return jsonSheet(name, headers, records.map((record) => headers.map((header) => record[header] ?? "")));
  };
  const fromMatrix = (name, matrix) => {
    if (!matrix.length || !Array.isArray(matrix[0])) {
      throw new Error(`La hoja JSON "${name}" debe iniciar con una fila de encabezados.`);
    }
    return { name, matrix };
  };
  const parseOne = (name, content) => {
    if (Array.isArray(content)) {
      if (!content.length) throw new Error(`La hoja JSON "${name}" está vacía.`);
      return Array.isArray(content[0])
        ? fromMatrix(name, content)
        : fromRecords(name, content);
    }
    if (content && typeof content === "object" && Array.isArray(content.headers) && Array.isArray(content.rows)) {
      const rows = content.rows.map((row) => Array.isArray(row)
        ? row
        : content.headers.map((header) => row?.[header] ?? ""));
      return jsonSheet(name, content.headers, rows);
    }
    throw new Error(`Estructura JSON no compatible en "${name}". Use un arreglo de objetos o { headers, rows }.`);
  };

  if (Array.isArray(value)) return [parseOne("JSON", value)];
  if (value && typeof value === "object" && Array.isArray(value.sheets)) {
    return value.sheets.map((sheet, index) => parseOne(sheet.name || `Hoja ${index + 1}`, sheet));
  }
  if (value && typeof value === "object" && Array.isArray(value.headers) && Array.isArray(value.rows)) {
    return [parseOne("JSON", value)];
  }
  throw new Error("El JSON debe ser un arreglo de objetos o contener { headers, rows }.");
}

function excelCellRows(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true, raw: false });
  return workbook.SheetNames.map((name) => ({
    name,
    matrix: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      defval: "",
      raw: false,
      blankrows: true
    })
  }));
}

function loadInputFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (![".csv", ".tsv", ".txt", ".json", ".xls", ".xlsx", ".xlsm"].includes(extension)) {
    throw new Error(`Formato no soportado: ${extension || "(sin extensión)"}. Use CSV, TSV, XLS, XLSX, XLSM o JSON.`);
  }
  if (extension === ".xls" || extension === ".xlsx" || extension === ".xlsm") {
    return { sheets: excelCellRows(filePath), corruptEncoding: false };
  }

  const buffer = fs.readFileSync(filePath);
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  if (extension === ".json") {
    const parsed = sharedUtils.safeJsonParse(text);
    if (!parsed.ok) throw new Error(`JSON inválido: ${parsed.error}`);
    return { sheets: parseJsonSheets(parsed.value), corruptEncoding: text.includes("\uFFFD") };
  }
  return {
    sheets: [{ name: path.basename(filePath), matrix: parseCsv(text) }],
    corruptEncoding: text.includes("\uFFFD")
  };
}

function makeSheetAdapter(headers) {
  return {
    getLastColumn: () => headers.length,
    getRange: () => ({ getValues: () => [headers] })
  };
}

function findHeaderRow(matrix) {
  const limit = Math.min(matrix.length, 15);
  let best = { index: 0, score: -1 };
  for (let index = 0; index < limit; index += 1) {
    const row = Array.from(matrix[index] || [], toCellString);
    const recognized = row.filter((cell) => ALIASES.has(normalizeHeader(cell))).length;
    if (recognized > best.score) best = { index, score: recognized };
    if (recognized >= 2 && recognized === row.filter((cell) => !isEmpty(cell)).length) {
      return { index, score: recognized };
    }
  }
  return best;
}

function addFinding(findings, severity, code, message, sheet, row) {
  findings.push({ severity, code, message, sheet, row });
}

function analyzeSheet(sheet, findings, stats, allGuideOccurrences, allPidOccurrences) {
  const matrix = sheet.matrix || [];
  if (!matrix.length || matrix.every((row) => !row || Array.from(row).every(isEmpty))) return;
  const { index: headerRowIndex, score } = findHeaderRow(matrix);
  const rawHeaders = Array.from(matrix[headerRowIndex] || [], toCellString);
  if (score < 1 || rawHeaders.every(isEmpty)) {
    addFinding(findings, "error", "HEADER_NOT_FOUND", "No se encontraron encabezados reconocibles.", sheet.name);
    return;
  }
  rawHeaders.forEach((header, index) => {
    if (isEmpty(header)) {
      addFinding(findings, "error", "EMPTY_HEADER", `Falta el encabezado de la columna ${index + 1}.`, sheet.name, headerRowIndex + 1);
    }
  });

  const canonicalized = rawHeaders.map((header) => ALIASES.get(normalizeHeader(header)) || "");
  const canonicalMatches = canonicalized.filter(Boolean).length;
  const strictCandidate = rawHeaders.length === CANONICAL_HEADERS.length && canonicalMatches >= 20;
  const isCanonical = rawHeaders.length === CANONICAL_HEADERS.length &&
    rawHeaders.every((header, index) => normalizeHeader(header) === normalizeHeader(CANONICAL_HEADERS[index]));

  if (strictCandidate && !isCanonical) {
    addFinding(
      findings,
      "error",
      "CANONICAL_SCHEMA_MISMATCH",
      "El esquema de 25 columnas difiere del contrato VALIDACIÓN_QRO_2025 o su orden fue alterado.",
      sheet.name,
      headerRowIndex + 1
    );
  }
  if (isCanonical) stats.canonicalSheets += 1;
  else stats.dhlSheets += 1;

  const unknownHeaders = [];
  const normalizedHeaders = rawHeaders.map((header) => {
    const canonical = ALIASES.get(normalizeHeader(header));
    if (!canonical && !KNOWN_DHL_EXTRA_HEADERS.has(normalizeHeader(header)) && !isEmpty(header)) {
      unknownHeaders.push(header);
    }
    return canonical || String(header).trim();
  });
  for (const header of unknownHeaders) {
    addFinding(
      findings,
      "error",
      "UNKNOWN_HEADER",
      `Encabezado no reconocido en el esquema canónico ni en los alias DHL: "${header}".`,
      sheet.name,
      headerRowIndex + 1
    );
  }

  let indexes;
  try {
    indexes = sharedUtils.getColumnIndexes(makeSheetAdapter(normalizedHeaders), CANONICAL_HEADERS);
  } catch (error) {
    addFinding(findings, "error", "DUPLICATE_HEADER", error.message, sheet.name, headerRowIndex + 1);
    return;
  }

  const hasGuide = indexes.Guia !== -1;
  const hasPid = indexes.PID !== -1;
  if (!hasGuide && !hasPid) {
    addFinding(findings, "error", "MISSING_KEY_HEADERS", "Se requiere al menos una columna Guia/HWB o PID.", sheet.name, headerRowIndex + 1);
  }
  if (hasGuide && indexes["C.P."] === -1) {
    addFinding(findings, "warning", "MISSING_POSTCODE_HEADER", "No hay una columna reconocida para validar códigos postales.", sheet.name, headerRowIndex + 1);
  }
  for (const [canonical, index] of Object.entries(indexes)) {
    if (index === -1) continue;
    const matches = normalizedHeaders.filter((header) => normalizeHeader(header) === normalizeHeader(canonical));
    if (matches.length > 1) {
      addFinding(findings, "error", "DUPLICATE_HEADER", `La columna lógica "${canonical}" aparece más de una vez.`, sheet.name, headerRowIndex + 1);
    }
  }

  const guideOccurrences = new Map();
  const pidOccurrences = new Map();
  const dataRows = matrix.slice(headerRowIndex + 1);
  dataRows.forEach((values, offset) => {
    const rowNumber = headerRowIndex + offset + 2;
    const extraValues = (values || []).slice(rawHeaders.length);
    if (extraValues.some((value) => !isEmpty(toCellString(value)))) {
      addFinding(findings, "error", "ROW_WIDTH_MISMATCH", "La fila contiene datos más allá de la última columna con encabezado.", sheet.name, rowNumber);
    }
    const cells = Array.from({ length: rawHeaders.length }, (_, index) => toCellString(values?.[index]));
    if (cells.every(isEmpty)) return;
    stats.dataRows += 1;

    for (const cell of cells) {
      if (cell.includes("\uFFFD")) {
        addFinding(findings, "error", "CORRUPT_CHARACTER", "Se detectó el carácter de reemplazo � en los datos.", sheet.name, rowNumber);
      }
      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(cell)) {
        addFinding(findings, "error", "CONTROL_CHARACTER", "Se detectó un carácter de control no permitido.", sheet.name, rowNumber);
        break;
      }
      if (/[\u00C3\u00C2]\S|â€|ðŸ/.test(cell)) {
        addFinding(findings, "warning", "MOJIBAKE", "Posible texto mal decodificado; revise los caracteres de esta fila.", sheet.name, rowNumber);
        break;
      }
    }

    const guide = hasGuide ? cells[indexes.Guia].trim() : "";
    const pid = hasPid ? cells[indexes.PID].trim() : "";
    if (hasGuide && !guide) {
      addFinding(findings, "error", "EMPTY_GUIDE", "Falta la guía/HWB en una fila con datos.", sheet.name, rowNumber);
    } else if (guide) {
      const normalizedGuide = guide.toUpperCase();
      guideOccurrences.set(normalizedGuide, (guideOccurrences.get(normalizedGuide) || 0) + 1);
      const guideEntries = allGuideOccurrences.get(normalizedGuide) || [];
      guideEntries.push({ sheet: sheet.name, row: rowNumber });
      allGuideOccurrences.set(normalizedGuide, guideEntries);
    }

    if (hasPid && !pid) {
      addFinding(findings, "error", "EMPTY_PID", "Falta el PID en una fila con datos.", sheet.name, rowNumber);
    } else if (pid) {
      const upperPid = pid.toUpperCase();
      if (upperPid.startsWith("JJD")) stats.jjdCount += 1;
      else if (upperPid.startsWith("JD")) stats.jdCount += 1;
      else addFinding(findings, "warning", "PID_PREFIX", `PID "${pid}" no inicia con JJD ni JD.`, sheet.name, rowNumber);
      if ((upperPid.startsWith("JJD") && upperPid.length === 3) ||
          (upperPid.startsWith("JD") && upperPid.length === 2)) {
        addFinding(findings, "warning", "PID_FORMAT", `PID "${pid}" no contiene identificador después del prefijo.`, sheet.name, rowNumber);
      }

      const normalizedPid = sharedUtils.sanitizarPIDParaBoveda(pid);
      pidOccurrences.set(normalizedPid, (pidOccurrences.get(normalizedPid) || 0) + 1);
      const pidEntries = allPidOccurrences.get(normalizedPid) || [];
      pidEntries.push({ sheet: sheet.name, row: rowNumber });
      allPidOccurrences.set(normalizedPid, pidEntries);
    }

    if (indexes["C.P."] !== -1 && guide && isEmpty(cells[indexes["C.P."]])) {
      addFinding(findings, "warning", "EMPTY_POSTCODE", "La guía no tiene código postal.", sheet.name, rowNumber);
    }
    if (indexes.Piezas !== -1) {
      const pieces = cells[indexes.Piezas].trim();
      if (!pieces || !Number.isFinite(Number(pieces)) || Number(pieces) <= 0) {
        addFinding(findings, "error", "INVALID_PIECES", "Piezas debe contener un número mayor que cero.", sheet.name, rowNumber);
      }
    }
  });

  for (const [guide, count] of guideOccurrences) {
    if (count > 1) {
      addFinding(findings, "warning", "DUPLICATE_GUIDE", `La guía "${guide}" aparece ${count} veces; confirme que sean piezas/filas distintas.`, sheet.name);
    }
  }
  for (const [pid, count] of pidOccurrences) {
    if (count > 1) {
      addFinding(findings, "error", "DUPLICATE_PID", `El PID "${pid}" aparece ${count} veces (incluye equivalencias JJD/JD).`, sheet.name);
    }
  }
}

function analyzeManifest(input) {
  const findings = [];
  const stats = { canonicalSheets: 0, dhlSheets: 0, dataRows: 0, jjdCount: 0, jdCount: 0 };
  const allGuideOccurrences = new Map();
  const allPidOccurrences = new Map();
  const sheetNames = new Set();
  for (const sheet of input.sheets) {
    if (sheetNames.has(sheet.name)) {
      addFinding(findings, "error", "DUPLICATE_SHEET_NAME", `Nombre de hoja duplicado: "${sheet.name}".`);
    }
    sheetNames.add(sheet.name);
  }
  if (input.corruptEncoding) {
    addFinding(findings, "error", "INVALID_ENCODING", "El archivo contiene bytes inválidos para UTF-8 (carácter de reemplazo �).");
  }
  for (const sheet of input.sheets) {
    analyzeSheet(sheet, findings, stats, allGuideOccurrences, allPidOccurrences);
  }
  if (stats.dataRows === 0) {
    addFinding(findings, "error", "NO_DATA_ROWS", "El archivo no contiene filas de datos para validar.");
  }
  for (const [guide, entries] of allGuideOccurrences) {
    if (new Set(entries.map((entry) => entry.sheet)).size > 1) {
      addFinding(findings, "warning", "DUPLICATE_GUIDE_ACROSS_SHEETS", `La guía "${guide}" aparece en varias hojas.`, entries.map((entry) => entry.sheet).join(", "));
    }
  }
  for (const [pid, entries] of allPidOccurrences) {
    if (new Set(entries.map((entry) => entry.sheet)).size > 1) {
      addFinding(findings, "error", "DUPLICATE_PID_ACROSS_SHEETS", `El PID "${pid}" aparece en varias hojas (incluye equivalencias JJD/JD).`, entries.map((entry) => entry.sheet).join(", "));
    }
  }
  if (stats.jjdCount > 0 && stats.jdCount > 0) {
    addFinding(findings, "warning", "MIXED_PID_FORMAT", "El manifiesto mezcla PID de calle/rampa JJD y formato de Bóveda JD.");
  }
  return {
    findings,
    stats,
    errors: findings.filter((finding) => finding.severity === "error").length,
    warnings: findings.filter((finding) => finding.severity === "warning").length,
    exitCode: findings.some((finding) => finding.severity === "error") ? 1 : 0
  };
}

function color(text, code, enabled) {
  return enabled ? `\u001b[${code}m${text}\u001b[0m` : text;
}

function formatReport(result, colorEnabled = true) {
  const lines = [
    color("Pre-vuelo de manifiesto DHL", "1;36", colorEnabled),
    `Filas revisadas: ${result.stats.dataRows} | Esquema canónico: ${result.stats.canonicalSheets} | Hojas DHL/alias: ${result.stats.dhlSheets}`,
    `PID: JJD ${result.stats.jjdCount} | JD ${result.stats.jdCount}`,
    color(`✅ Válidos: ${result.exitCode === 0 ? "Sí" : "No"}`, result.exitCode === 0 ? "1;32" : "31", colorEnabled),
    color(`❌ Errores bloqueantes: ${result.errors}`, result.errors ? "1;31" : "32", colorEnabled),
    color(`⚠️ Advertencias: ${result.warnings}`, result.warnings ? "33" : "32", colorEnabled)
  ];
  const visibleFindings = result.findings.slice(0, 30);
  for (const finding of visibleFindings) {
    const icon = finding.severity === "error" ? "❌" : "⚠️";
    const location = [finding.sheet, finding.row ? `fila ${finding.row}` : ""].filter(Boolean).join(", ");
    const text = `${icon} ${finding.message}${location ? ` (${location})` : ""}`;
    lines.push(color(text, finding.severity === "error" ? "31" : "33", colorEnabled));
  }
  if (result.findings.length > visibleFindings.length) {
    lines.push(`... ${result.findings.length - visibleFindings.length} hallazgo(s) adicional(es).`);
  }
  lines.push(result.exitCode === 0
    ? color("✅ APTO: no se encontraron errores bloqueantes.", "1;32", colorEnabled)
    : color("❌ NO APTO: corrija los errores bloqueantes antes de procesar.", "1;31", colorEnabled));
  return lines.join("\n");
}

function printHelp(write = console.log) {
  write([
    "Uso: node tools/validar_manifiesto.js [--no-color] <archivo>",
    "",
    "Formatos: CSV, TSV, XLS, XLSX, XLSM y JSON.",
    "JSON: arreglo de objetos, arreglo de filas con encabezado o { headers, rows }.",
    "Código de salida: 0 apto (puede haber advertencias); 1 errores o archivo inválido."
  ].join("\n"));
}

function main(argv = process.argv.slice(2), io = console) {
  const args = argv.filter((arg) => arg !== "--no-color");
  const colorEnabled = !argv.includes("--no-color") && Boolean(io.stdout?.isTTY) && !process.env.NO_COLOR;
  if (args.includes("--help") || args.includes("-h")) {
    printHelp(io.log);
    return 0;
  }
  if (args.length !== 1) {
    io.error("Indique exactamente un archivo de entrada. Use --help para ver los formatos.");
    return 1;
  }
  try {
    const filePath = path.resolve(args[0]);
    const result = analyzeManifest(loadInputFile(filePath));
    io.log(formatReport(result, colorEnabled));
    return result.exitCode;
  } catch (error) {
    io.error(`No se pudo validar el manifiesto: ${error.message}`);
    return 1;
  }
}

module.exports = {
  analyzeManifest,
  formatReport,
  loadInputFile,
  main,
  parseCsv,
  parseJsonSheets
};

if (require.main === module) process.exitCode = main();
