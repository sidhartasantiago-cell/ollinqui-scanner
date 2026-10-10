/**
 * Analiza texto JSON e informa errores sin ocultarlos.
 * @param {*} payload Texto JSON, como e.postData.contents.
 * @return {{ok: boolean, value: *, error: (string|undefined)}}
 */
function safeJsonParse(payload) {
  if (typeof payload !== "string") {
    return { ok: false, error: "El contenido JSON debe ser texto." };
  }

  try {
    return { ok: true, value: JSON.parse(payload) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/**
 * Normaliza un PID para la Bóveda: JJD... se convierte en JD...
 * @param {*} pid PID en formato de calle/rampa.
 * @return {string} PID en mayúsculas y formato de Bóveda.
 */
function sanitizarPIDParaBoveda(pid) {
  if (pid === null || pid === undefined) {
    throw new TypeError("El PID es requerido.");
  }

  let pidClean = String(pid).trim().toUpperCase();
  if (pidClean.indexOf("JJD") === 0) {
    pidClean = "JD" + pidClean.substring(3);
  }
  return pidClean;
}

/**
 * Mapea encabezados de la fila 1 a índices de columna JavaScript base cero.
 * Los encabezados ausentes devuelven -1; los duplicados generan un error.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Hoja que se va a inspeccionar.
 * @param {string[]} headersArray Nombres de encabezados que se van a localizar.
 * @return {!Object<string, number>} Encabezados asociados a índices base cero.
 */
function getColumnIndexes(sheet, headersArray) {
  if (!sheet || typeof sheet.getLastColumn !== "function" || typeof sheet.getRange !== "function") {
    throw new TypeError("Se requiere una hoja de cálculo válida.");
  }
  if (!Array.isArray(headersArray) || headersArray.some((header) => typeof header !== "string")) {
    throw new TypeError("headersArray debe ser un arreglo de nombres de columna.");
  }

  const requestedHeaders = new Set(headersArray.map((header) => header.trim().toLowerCase()));
  const headerIndexes = new Map();
  const lastColumn = sheet.getLastColumn();

  if (lastColumn > 0) {
    const sheetHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    sheetHeaders.forEach((header, index) => {
      const normalizedHeader = String(header).trim().toLowerCase();
      if (!requestedHeaders.has(normalizedHeader)) {
        return;
      }
      if (headerIndexes.has(normalizedHeader)) {
        throw new Error("Encabezado duplicado en la hoja: " + header);
      }
      headerIndexes.set(normalizedHeader, index);
    });
  }

  const columnIndexes = {};
  headersArray.forEach((header) => {
    const normalizedHeader = header.trim().toLowerCase();
    columnIndexes[header] = headerIndexes.has(normalizedHeader)
      ? headerIndexes.get(normalizedHeader)
      : -1;
  });
  return columnIndexes;
}
