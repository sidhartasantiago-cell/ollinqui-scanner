function determinarTelefonoValido(awb, rcvrTel, shipperTel, mapaRescatados) {
  var cleanAwb = normalizarAwb(awb);
  if (mapaRescatados && cleanAwb && mapaRescatados[cleanAwb]) {
    var telRescatado = limpiarYValidarTelefono(mapaRescatados[cleanAwb]);
    if (telRescatado) {
      return telRescatado;
    }
  }
 
  var rcvrLimpio = limpiarYValidarTelefono(rcvrTel);
  if (rcvrLimpio) {
    return rcvrLimpio;
  }
 
  var shipperLimpio = limpiarYValidarTelefono(shipperTel);
  if (shipperLimpio) {
    return shipperLimpio;
  }
 
  return "";
}

function limpiarYValidarTelefono(telRaw) {
  if (!telRaw) return "";
  var str = String(telRaw).replace(/\D/g, "").trim();
 
  if (str.length < 10) return "";
 
  if (str.length > 10) {
    str = str.substring(str.length - 10);
  }
 
  var numerosProhibidos = [
    "5591384100",
    "5591384101",
    "5591384102",
    "0180076563"
  ];
 
  if (numerosProhibidos.indexOf(str) !== -1) {
    return "";
  }
 
  return str;
}

function extenderFormulasColumnaAX(sheet, startRow) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
 
  var startExtendRow = (startRow && startRow > 2) ? startRow : 2;
  if (startExtendRow > lastRow) return;
 
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var formulaIndexes = getColumnIndexesFromHeaders_(headers, ["formulas"]);
  if (formulaIndexes.formulas === -1) {
    throw new Error("No se encontró el encabezado de fórmulas para extender.");
  }
  var colAXIndex = formulaIndexes.formulas + 1;

  if (lastCol >= colAXIndex) {
    var formulaRange = sheet.getRange(2, colAXIndex, 1, lastCol - colAXIndex + 1);
    var targetRange = sheet.getRange(startExtendRow, colAXIndex, lastRow - startExtendRow + 1, lastCol - colAXIndex + 1);
    formulaRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
    Logger.log("⚡ Formulas extendidas para nuevas filas.");
  }
}

function columnToLetter(column) {
  var temp, letter = "";
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

// ==========================================
// 📡 NATIVE EMAIL DECODER Fallback
// ==========================================

function decodificarCuerpoEmail(bodyRaw) {
  if (!bodyRaw) return "";
  try {
    if (bodyRaw.indexOf("=?utf-8?B?") !== -1 || bodyRaw.indexOf("=?UTF-8?B?") !== -1) {
      return bodyRaw;
    }
  } catch(e) {}
  return bodyRaw;
}

function obtenerEtiquetaPorNombre(nombreLabel) {
  var labels = GmailApp.getUserLabels();
  for (var i = 0; i < labels.length; i++) {
    var labelName = labels[i].getName();
    if (labelName === nombreLabel || labelName.indexOf("/" + nombreLabel) !== -1) {
      return labels[i];
    }
  }
  return null;
}

function normalizarAwb(awbVal) {
  if (!awbVal) return "";
  var str = String(awbVal).trim();
  if (str.indexOf("e") !== -1 || str.indexOf("E") !== -1) {
    var num = Number(str);
    if (!isNaN(num)) {
      str = num.toFixed(0);
    }
  }
  if (str.indexOf(".") !== -1) {
    str = str.split(".")[0];
  }
  return str.replace(/\D/g, "");
}

// ==========================================
// 🗂️ 4. MOTOR DE CRUZADOR Y DESPACHADOR (Original de Modulo A con Cola Asíncrona)
// ==========================================

function normalizarCabecera(header) {
  var h = header ? String(header).toLowerCase().trim().replace(/\s+/g, " ") : "";
  if (h === "") return "";
  var claveBuscada = h.replace(/[^a-z0-9áéíóúñ]/g, "");
  var MAPEO = {
    "hwb no": ["hwb no", "hwb", "awb", "awb no", "guia", "search", "waybill", "airbill", "hawb", "guía"],
    "piece id": ["piece id", "pid", "piece_id", "pieceid", "pieza id", "barcode", "piece no real"],
    "piece no": ["piece no", "pieces", "bultos", "piezas", "piece_no", "piece count", "piece number", "numero pieza"],
    "rcvr postcode": ["rcvr postcode", "receiver postcode", "rcvr postal code", "postal code", "cp", "postcode", "rcvr_postcode", "c.p."],
    "receiver name": ["receiver name", "receiver", "consignee", "receiver_name", "consignee name", "destinatario", "nombre_recibe", "nombre"],
    "rcvr addr 1": ["rcvr addr 1", "receiver address 1", "address 1", "rcvr addr1", "rcvr_addr_1", "direccion 1"],
    "rcvr addr 2": ["rcvr addr 2", "receiver address 2", "address 2", "rcvr addr2", "rcvr_addr_2", "direccion 2"],
    "rcvr addr 3": ["rcvr addr 3", "receiver address 3", "address 3", "rcvr addr3", "rcvr_addr_3", "direccion 3"],
    "rcvr tel": ["rcvr tel", "receiver phone", "receiver tel", "tel", "telefono", "phone", "rcvr_tel", "teléfono"],
    "edd": ["edd", "estimated delivery", "fecha estimada", "estimated_delivery_date"],
    "orig ctry": ["orig ctry", "origin country", "orig_ctry", "pais origen"],
    "description": ["description", "descripcion", "content", "commodity description", "description of goods"],
    "formulas": ["formulas", "fórmulas", "formula", "fórmula", "ax"]
  };
  for (var colMaestra in MAPEO) {
    var alias = MAPEO[colMaestra];
    if (colMaestra.replace(/[^a-z0-9áéíóúñ]/g, "") === claveBuscada) {
      return colMaestra;
    }
    for (var i = 0; i < alias.length; i++) {
      if (alias[i].replace(/[^a-z0-9áéíóúñ]/g, "") === claveBuscada) {
        return colMaestra;
      }
    }
  }
  return h;
}

function formatearFechaSimple(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "GMT-6", "yyyy-MM-dd");
  }
  var str = val.toString().trim();
  if (str === "") return "";
 
  try {
    var parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      return Utilities.formatDate(new Date(parsed), "GMT-6", "yyyy-MM-dd");
    }
  } catch(e) {}
 
  var matchDate = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchDate) {
    var day = parseInt(matchDate[1], 10);
    var month = parseInt(matchDate[2], 10);
    var year = parseInt(matchDate[3], 10);
    return year + "-" + (month < 10 ? "0" + month : month) + "-" + (day < 10 ? "0" + day : day);
  }
 
  return str;
}

function formatearFechaSimpleDDMMYYYY(val) {
  if (!val) return "";
  var dateObj = null;
  if (val instanceof Date) {
    dateObj = val;
  } else {
    var str = val.toString().trim();
    if (str === "") return "";
    try {
      var parsed = Date.parse(str);
      if (!isNaN(parsed)) {
        dateObj = new Date(parsed);
      }
    } catch(e) {}
    if (!dateObj) {
      var matchDate = str.match(/(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
      if (matchDate) {
        var y = parseInt(matchDate[1], 10);
        var m = parseInt(matchDate[2], 10) - 1;
        var d = parseInt(matchDate[3], 10);
        dateObj = new Date(y, m, d);
      }
    }
    if (!dateObj) {
      var matchDate2 = str.match(/(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})/);
      if (matchDate2) {
        var d = parseInt(matchDate2[1], 10);
        var m = parseInt(matchDate2[2], 10) - 1;
        var y = parseInt(matchDate2[3], 10);
        dateObj = new Date(y, m, d);
      }
    }
  }
  if (dateObj) {
    return Utilities.formatDate(dateObj, "GMT-6", "dd-MM-yyyy");
  }
  return val.toString().trim();
}

function limpiarYFormatearPid(pidRaw) {
  if (!pidRaw) return "";
  var clean = String(pidRaw).trim();
  if (clean.length === 10 && !isNaN(clean)) {
    clean = "JD" + clean;
  }
  return sanitizarPIDParaBoveda(clean);
}

function formatearPIDParaCampo(pidRaw) {
  var pidBoveda = limpiarYFormatearPid(pidRaw);
  return pidBoveda.indexOf("JD") === 0
    ? "JJD" + pidBoveda.substring(2)
    : pidBoveda;
}

function getColumnIndexesFromHeaders_(headers, requestedHeaders) {
  if (!Array.isArray(headers)) {
    throw new TypeError("Los encabezados deben ser un arreglo.");
  }

  var canonicalHeaders = headers.map(normalizarCabecera);
  var headerSheet = {
    getLastColumn: function() {
      return canonicalHeaders.length;
    },
    getRange: function() {
      return {
        getValues: function() {
          return [canonicalHeaders];
        }
      };
    }
  };
  return getColumnIndexes(headerSheet, requestedHeaders);
}
