function procesarReportesDesdeEtiqueta02() {
  Logger.log("🚀 Iniciando Ingesta de Gmail (Ollin QRO v23.0 - Motor In-Memory SheetJS Base64)...");
 
  // --- FASE 1: APERTURA DE HOJAS Y PREPARACIÓN DE SEGURIDAD ---
  // Abrir la Bóveda de Almacén de forma nativa (Donde vive este script)
  var ssBoveda = SpreadsheetApp.getActiveSpreadsheet();
  var sheetRawShipment = ssBoveda.getSheetByName("RAW_SHIPMENT");
  var sheetRawPiece = ssBoveda.getSheetByName("RAW_PIECE");
 
  // Abrir BD CENTRAL 2023 (Almacén Operativo)
  var ssCentral = null;
  var sheetBatchAWB = null;
  var sheetBatchPiece = null;
  var existentesBatchAWB = {};
  var existentesBatchPiece = {};
 
  try {
    ssCentral = SpreadsheetApp.openById(SHEET_ID_BD_CENTRAL);
    sheetBatchAWB = ssCentral.getSheetByName("Batch AWB");
    sheetBatchPiece = ssCentral.getSheetByName("Batch Piece");
   
    // Cargar existentes de Batch AWB por encabezado.
    if (sheetBatchAWB) {
      var headersBatchAWB = sheetBatchAWB
        .getRange(1, 1, 1, sheetBatchAWB.getLastColumn())
        .getValues()[0];
      var awbIndexes = getColumnIndexesFromHeaders_(headersBatchAWB, ["hwb no"]);
      if (awbIndexes["hwb no"] === -1) {
        throw new Error("Falta el encabezado HWB/Guía en Batch AWB.");
      }
      var lastBatchAWBRow = sheetBatchAWB.getLastRow();
      var valoresAWB = lastBatchAWBRow > 1
        ? sheetBatchAWB.getRange(2, awbIndexes["hwb no"] + 1, lastBatchAWBRow - 1, 1).getValues()
        : [];
      for (var i = 0; i < valoresAWB.length; i++) {
        if (valoresAWB[i][0]) {
          existentesBatchAWB[normalizarAwb(valoresAWB[i][0])] = true;
        }
      }
    }
   
    // Cargar existentes de Batch Piece por encabezado.
    if (sheetBatchPiece) {
      var headersBatchPiece = sheetBatchPiece.getRange(1, 1, 1, sheetBatchPiece.getLastColumn()).getValues()[0];
      var pidIndexesBatchPiece = getColumnIndexesFromHeaders_(
        headersBatchPiece,
        ["piece id", "pid", "piece_id"]
      );
      var pidHeaderBatchPiece = ["piece id", "pid", "piece_id"].find(function(header) {
        return pidIndexesBatchPiece[header] !== -1;
      });
      if (!pidHeaderBatchPiece) {
        throw new Error("Falta el encabezado Piece ID/PID en Batch Piece.");
      }
      var lastBatchPieceRow = sheetBatchPiece.getLastRow();
      var valoresPiece = lastBatchPieceRow > 1
        ? sheetBatchPiece.getRange(
          2,
          pidIndexesBatchPiece[pidHeaderBatchPiece] + 1,
          lastBatchPieceRow - 1,
          1
        ).getValues()
        : [];
      for (var i = 0; i < valoresPiece.length; i++) {
        if (valoresPiece[i][0]) {
          existentesBatchPiece[limpiarYFormatearPid(valoresPiece[i][0])] = true;
        }
      }
    }
  } catch (e) {
    if (ssCentral) {
      throw e;
    }
    Logger.log("⚠️ Advertencia: No se pudo conectar a BD CENTRAL 2023: " + e.message);
  }
 
  if (!sheetRawShipment || !sheetRawPiece) {
    Logger.log("❌ Error crítico: No se encontraron las pestañas RAW_SHIPMENT o RAW_PIECE en la Bóveda.");
    return {
      exito: false,
      mensaje: "❌ Error crítico: Faltan pestañas RAW_SHIPMENT o RAW_PIECE en el archivo de la Bóveda."
    };
  }

  // --- FASE 2: PRE-DESCARGA Y MAQUEO DE AWBS DE DHL DEL DÍA ---
  var labelReporteObj = obtenerEtiquetaPorNombre(ETIQUETA_REPORTE);
  var hilosReporte = labelReporteObj ? labelReporteObj.getThreads(0, 10) : [];
 
  if (hilosReporte.length === 0) {
    Logger.log("☕ Sin nuevos reportes de DHL por procesar en Gmail.");
    return {
      exito: false,
      mensaje: "⚠️ No se encontraron nuevos correos con la etiqueta '02_REPORTE_QRO' en tu Gmail."
    };
  }

  var reportesExcelDelDia = [];
  var todosLosAWBsValidos = {};
 
  // Agregar también los AWBs históricos de Batch AWB como válidos
  for (var awbHist in existentesBatchAWB) {
    todosLosAWBsValidos[awbHist] = true;
  }

  // Buscador de cabecera con normalización alfanumérica robusta
  function encontrarColumnaDHL(headers, nombresPosibles, defaultIdx) {
    if (!headers || headers.length === 0) return defaultIdx;
    var aliases = nombresPosibles.map(normalizarCabecera);
    var indexes = getColumnIndexesFromHeaders_(headers, aliases);
    for (var n = 0; n < aliases.length; n++) {
      if (indexes[aliases[n]] !== -1) {
        return indexes[aliases[n]];
      }
    }
    return defaultIdx;
  }

  var ultimoErrorConversion = null;
  for (var k = 0; k < hilosReporte.length; k++) {
    var mensajesReporte = hilosReporte[k].getMessages();
    for (var m = 0; m < mensajesReporte.length; m++) {
      var attachments = mensajesReporte[m].getAttachments();
      for (var a = 0; a < attachments.length; a++) {
        var fileBlob = attachments[a];
        var fileNameClean = fileBlob.getName().toLowerCase();
        if (fileBlob.getContentType() === MimeType.MICROSOFT_EXCEL || fileNameClean.indexOf(".xlsx") !== -1 || fileNameClean.indexOf(".xls") !== -1) {
          Logger.log("📦 Pre-escaneando archivo adjunto de DHL para mapeo de guías: " + fileBlob.getName());
         
          // EJECUCIÓN DEL NUEVO MOTOR EN MEMORIA (v23.0 - SheetJS sin Drive API)
          var resTemporal = procesarExcelTemporal(fileBlob);
          if (resTemporal && resTemporal.exito) {
            var tempSheetData = resTemporal.data;
            if (tempSheetData && tempSheetData.shipment && tempSheetData.shipment.length > 0) {
              reportesExcelDelDia.push({
                shipment: tempSheetData.shipment,
                piece: tempSheetData.piece,
                shipmentHeaders: tempSheetData.shipmentHeaders,
                pieceHeaders: tempSheetData.pieceHeaders,
                message: mensajesReporte[m],
                thread: hilosReporte[k]
              });
             
              var colAwbTemp = encontrarColumnaDHL(tempSheetData.shipmentHeaders, ["hwb no", "hwb", "awb", "guia", "guía"], -1);
              if (colAwbTemp === -1) {
                throw new Error("No se encontró la columna HWB/AWB/Guía en el reporte DHL.");
              }
              for (var r = 0; r < tempSheetData.shipment.length; r++) {
                var rawG = tempSheetData.shipment[r][colAwbTemp];
                var cleanG = normalizarAwb(rawG);
                if (cleanG) {
                  todosLosAWBsValidos[cleanG] = true;
                }
              }
            }
          } else if (resTemporal && !resTemporal.exito) {
            ultimoErrorConversion = resTemporal.error;
          }
        }
      }
    }
  }
  Logger.log("🎯 Total de AWBs válidos del día e históricos cargados: " + Object.keys(todosLosAWBsValidos).length);

  // 🛡️ V21.0 SALIDA SEGURA ANTI-VACIADO DE BÓVEDA
  if (reportesExcelDelDia.length === 0) {
    Logger.log("☕ No se encontraron archivos de Excel válidos en los hilos de reporte.");
   
    var msgError = "⚠️ Se encontraron correos con la etiqueta '02_REPORTE_QRO', pero ninguno contenía un archivo Excel (.xlsx/.xls) de DHL válido.";
    if (ultimoErrorConversion) {
      msgError += " Detalle del error: " + ultimoErrorConversion;
    }
   
    return {
      exito: false,
      mensaje: msgError
    };
  }

  // --- FASE 3: RESCATE INTELIGENTE DE TELÉFONOS DESDE HISTORICO_QUERIES Y 01_QUERY_QRO ---
  var mapaTelefonosRescatados = {};
 
  // 3.1 Cargar teléfonos históricos desde la pestaña HISTORICO_QUERIES
  var ssVal = SpreadsheetApp.openById(SHEET_ID_VALIDACION_QRO);
  var sheetHistoricoQueries = ssVal.getSheetByName("HISTORICO_QUERIES");
  if (sheetHistoricoQueries) {
    var valoresQueries = sheetHistoricoQueries.getDataRange().getValues();
    for (var i = 1; i < valoresQueries.length; i++) {
      var rawGuia = valoresQueries[i][0] ? valoresQueries[i][0].toString().trim() : "";
      var guiaKey = normalizarAwb(rawGuia);
      var telVal = valoresQueries[i][1] ? valoresQueries[i][1].toString().trim() : "";
      if (guiaKey && telVal) {
        mapaTelefonosRescatados[guiaKey] = telVal;
      }
    }
    Logger.log("📜 Teléfonos históricos cargados desde HISTORICO_QUERIES: " + Object.keys(mapaTelefonosRescatados).length);
  }
 
  // 3.2 Escanear nuevos correos de Query usando segmentación por bloques de AWB
  var labelQueryObj = obtenerEtiquetaPorNombre(ETIQUETA_QUERY);
  var hilosQuery = labelQueryObj ? labelQueryObj.getThreads(0, 50) : [];
  var nuevasFilasQueries = [];
 
  for (var i = 0; i < hilosQuery.length; i++) {
    var mensajes = hilosQuery[i].getMessages();
    for (var m = 0; m < mensajes.length; m++) {
      var cuerpoMsg = mensajes[m].getPlainBody();
      if (!cuerpoMsg) cuerpoMsg = mensajes[m].getBody() || "";
      var cuerpoDecodificado = decodificarCuerpoEmail(cuerpoMsg);
     
      var textClean = cuerpoDecodificado.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      var bloques = textClean.split(/(?:A\s*W\s*B|H\s*W\s*B|W\s*a\s*y\s*b\s*i\s*l\s*l)/i);
      bloques.shift(); // Quitar texto antes del primer bloque
     
      bloques.forEach(function(bloque) {
        var guiaMatch = bloque.match(/^[^0-9]*(\d{10})/);
        if (guiaMatch) {
          var guia = normalizarAwb(guiaMatch[1]);
          var regexTel = /(?:P\s*h\s*o\s*n\s*e|T\s*e\s*l)[^0-9\+]*([\+\d][\d\s\-]{6,})/gi;
          var matchTel;
          var listaTels = [];
          while ((matchTel = regexTel.exec(bloque)) !== null) {
            var tel = matchTel[1].trim().split(/\s{2,}/)[0];
            if (tel.toUpperCase() !== "NOT SUPPLIED") {
              var cleanTel = limpiarYValidarTelefono(tel);
              if (cleanTel) listaTels.push(cleanTel);
            }
          }
         
          if (listaTels.length === 0) {
            var todosLosNumeros = bloque.match(/\b\d{10,12}\b/g) || [];
            for (var n = 0; n < todosLosNumeros.length; n++) {
              var numLimpio = normalizarAwb(todosLosNumeros[n]);
              if (numLimpio !== guia) {
                var cleanTelFallback = limpiarYValidarTelefono(numLimpio);
                if (cleanTelFallback) {
                  listaTels.push(cleanTelFallback);
                }
              }
            }
          }
         
          var finalTel = "";
          if (listaTels.length >= 2) finalTel = listaTels[1];
          else if (listaTels.length === 1) finalTel = listaTels[0];
         
          if (finalTel && guia) {
            if (!mapaTelefonosRescatados[guia]) {
              mapaTelefonosRescatados[guia] = finalTel;
              nuevasFilasQueries.push([guia, finalTel, new Date()]);
            }
          }
        }
      });
      mensajes[m].markRead();
    }
    if (labelQueryObj) {
      hilosQuery[i].removeLabel(labelQueryObj);
    }
  }
 
  // Guardar físicamente las nuevas consultas en HISTORICO_QUERIES
  if (sheetHistoricoQueries && nuevasFilasQueries.length > 0) {
    sheetHistoricoQueries.getRange(sheetHistoricoQueries.getLastRow() + 1, 1, nuevasFilasQueries.length, 3).setValues(nuevasFilasQueries);
    Logger.log("📥 " + nuevasFilasQueries.length + " nuevas consultas de teléfonos respaldadas de forma segura.");
  }
  Logger.log("📞 Total de teléfonos en memoria: " + Object.keys(mapaTelefonosRescatados).length);

  // --- FASE 4: INYECCIÓN DUAL ATÓMICA DE EXCEL A LA BÓVEDA Y BD CENTRAL ---
  var rowBeforeRawShipment = 2;
  var rowBeforeBatchAWB = sheetBatchAWB ? sheetBatchAWB.getLastRow() + 1 : 2;

  // Autolavado en Bóveda
  if (sheetRawShipment.getLastRow() > 1) {
    sheetRawShipment.getRange(2, 1, sheetRawShipment.getLastRow() - 1, sheetRawShipment.getLastColumn()).clearContent();
  }
  if (sheetRawPiece.getLastRow() > 1) {
    sheetRawPiece.getRange(2, 1, sheetRawPiece.getLastRow() - 1, sheetRawPiece.getLastColumn()).clearContent();
  }
  Logger.log("🧹 Autolavado completado en la Bóveda.");

  var totalGuiasInyectadas = 0;
  var totalBultosInyectados = 0;

  for (var i = 0; i < reportesExcelDelDia.length; i++) {
    var reporte = reportesExcelDelDia[i];
    var datosShipment = reporte.shipment;
    var datosPiece = reporte.piece;
    var headersShipment = reporte.shipmentHeaders;
    var headersPiece = reporte.pieceHeaders;

    if (datosShipment.length > 0) {
      var colAwb = encontrarColumnaDHL(headersShipment, ["hwb no", "hwb", "awb", "guia", "guía"], -1);
      if (colAwb === -1) {
        throw new Error("No se encontró la columna HWB/AWB/Guía en el reporte DHL.");
      }
      var colRcvrTel = encontrarColumnaDHL(headersShipment, ["rcvr tel", "receiver tel", "receiver phone", "telefono", "teléfono"], -1);
      var colShprTel = encontrarColumnaDHL(headersShipment, ["shipper tel", "shpr tel", "shipper phone"], -1);

      var datosShipmentFiltradosBoveda = [];
      var datosShipmentFiltradosBatch = [];

      for (var r = 0; r < datosShipment.length; r++) {
        var rawGuia = datosShipment[r][colAwb];
        var guiaAwb = normalizarAwb(rawGuia);
        var telDestinatarioExcel = colRcvrTel === -1 ? "" : datosShipment[r][colRcvrTel];
        var telRemitenteExcel = colShprTel === -1 ? "" : datosShipment[r][colShprTel];

        var telefonoFinal = determinarTelefonoValido(guiaAwb, telDestinatarioExcel, telRemitenteExcel, mapaTelefonosRescatados);
        if (colRcvrTel !== -1) {
          datosShipment[r][colRcvrTel] = telefonoFinal;
        }

        datosShipmentFiltradosBoveda.push(datosShipment[r]);

        if (guiaAwb && !existentesBatchAWB[guiaAwb]) {
          datosShipmentFiltradosBatch.push(datosShipment[r]);
          existentesBatchAWB[guiaAwb] = true;
        }
      }

      if (datosShipmentFiltradosBoveda.length > 0) {
        sheetRawShipment.getRange(sheetRawShipment.getLastRow() + 1, 1, datosShipmentFiltradosBoveda.length, datosShipmentFiltradosBoveda[0].length).setValues(datosShipmentFiltradosBoveda);
      }
      if (sheetBatchAWB && datosShipmentFiltradosBatch.length > 0) {
        sheetBatchAWB.getRange(sheetBatchAWB.getLastRow() + 1, 1, datosShipmentFiltradosBatch.length, datosShipmentFiltradosBatch[0].length).setValues(datosShipmentFiltradosBatch);
      }
      totalGuiasInyectadas += datosShipment.length;
    }

    if (datosPiece.length > 0) {
      var colPidExcel = encontrarColumnaDHL(headersPiece, ["piece id", "pid", "piece_id"], -1);
      if (colPidExcel === -1) {
        throw new Error("No se encontró la columna Piece ID/PID en el archivo DHL.");
      }

      var datosPieceFiltradosBoveda = [];
      var datosPieceFiltradosBatch = [];

      for (var p = 0; p < datosPiece.length; p++) {
        var pidVal = datosPiece[p][colPidExcel];
        if (!pidVal) continue;
       
        var pidClean = limpiarYFormatearPid(pidVal);
        if (!pidClean) continue;
        datosPiece[p][colPidExcel] = pidClean;

        datosPieceFiltradosBoveda.push(datosPiece[p]);

        if (!existentesBatchPiece[pidClean]) {
          datosPieceFiltradosBatch.push(datosPiece[p]);
          existentesBatchPiece[pidClean] = true;
        }
      }

      if (datosPieceFiltradosBoveda.length > 0) {
        sheetRawPiece.getRange(sheetRawPiece.getLastRow() + 1, 1, datosPieceFiltradosBoveda.length, datosPieceFiltradosBoveda[0].length).setValues(datosPieceFiltradosBoveda);
      }
      if (sheetBatchPiece && datosPieceFiltradosBatch.length > 0) {
        sheetBatchPiece.getRange(sheetBatchPiece.getLastRow() + 1, 1, datosPieceFiltradosBatch.length, datosPieceFiltradosBatch[0].length).setValues(datosPieceFiltradosBatch);
      }
      totalBultosInyectados += datosPiece.length;
    }

    var labelReporteObj = obtenerEtiquetaPorNombre(ETIQUETA_REPORTE);
    if (labelReporteObj) {
      reporte.thread.removeLabel(labelReporteObj);
    }
  }

  // --- FASE 5: RECALIBRADOR DINÁMICO DE COLUMNA AX ---
  extenderFormulasColumnaAX(sheetRawShipment, rowBeforeRawShipment);
  if (sheetBatchAWB) {
    extenderFormulasColumnaAX(sheetBatchAWB, rowBeforeBatchAWB);
  }

  // --- REPORTAR RESULTADOS EN GOOGLE CHAT DE CONTROL ---
  var msgAlerta = "🤖 *Arauto Bot - Integración BATCH Dual QRO (v23.0)*\n\n" +
                  "📊 *Corte de Ingesta Asíncrona (Gmail - SheetJS RAM):*\n" +
                  "• *BD CENTRAL 2023:* " + totalGuiasInyectadas + " guías y " + totalBultosInyectados + " bultos acumulados.\n" +
                  "• *BOVEDA_BATCH_MAESTRO:* " + totalGuiasInyectadas + " guías y " + totalBultosInyectados + " bultos inyectados.\n" +
                  "• *Teléfonos Rescatados:* " + Object.keys(mapaTelefonosRescatados).length + " números limpios guardados.\n\n" +
                  "🛡️ _¡Ingesta exitosa e in-memory sin tocar Google Drive API ni Google Cloud!_";
                 
  enviarAlertaGoogleChatBoveda(msgAlerta);
  Logger.log("🏁 Ingesta finalizada de forma exitosa sin duplicados.");
 
  return {
    exito: true,
    guias: totalGuiasInyectadas,
    bultos: totalBultosInyectados,
    telefonos: Object.keys(mapaTelefonosRescatados).length
  };
}

// ==========================================
// 🛠️ MOTOR DE CONVERSIÓN EN MEMORIA (SHEETJS) - EL CORAZÓN DE LA V22
// ==========================================

function procesarExcelTemporal(blob) {
  try {
    // 1. Descarga la librería SheetJS minificada desde el CDN estable de jsDelivr
    var cdnUrl = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    var response = UrlFetchApp.fetch(cdnUrl);
    var jsCode = response.getContentText();
   
    // 2. Ejecuta la librería en el contexto de Apps Script
    var context = this;
    eval(jsCode); // Expone el objeto global 'XLSX'
   
    // 3. Convertir el adjunto a Base64 para evitar el conflicto de bytes firmados en Apps Script (Unsupported ZIP Compression method)
    var base64Data = Utilities.base64Encode(blob.getBytes());
    var workbook = XLSX.read(base64Data, {type: 'base64'});
   
    var dataResult = {
      shipmentHeaders: [],
      shipment: [],
      piece: []
    };
   
    // 4. Analiza la primera hoja (RAW_SHIPMENT)
    if (workbook.SheetNames.length > 0) {
      var firstSheetName = workbook.SheetNames[0];
      var worksheet = workbook.Sheets[firstSheetName];
      var fullShipment = XLSX.utils.sheet_to_json(worksheet, {header: 1, defval: ""});
     
      var headerRowIdx = 0;
      var headerFound = false;
      for (var r = 0; r < Math.min(fullShipment.length, 15); r++) {
        var row = fullShipment[r];
        for (var c = 0; c < row.length; c++) {
          var valStr = String(row[c]).toLowerCase().trim();
          if (valStr === "hwb no" || valStr === "hwb" || valStr === "waybill" || valStr === "airbill" || valStr === "hawb" || valStr === "guia" || valStr === "guía") {
            headerRowIdx = r;
            headerFound = true;
            break;
          }
        }
        if (headerFound) break;
      }
      dataResult.shipmentHeaders = fullShipment[headerRowIdx];
      dataResult.shipment = fullShipment.slice(headerRowIdx + 1);
    }
   
    // 5. Analiza la segunda hoja (RAW_PIECE) si existe
    if (workbook.SheetNames.length > 1) {
      var secondSheetName = workbook.SheetNames[1];
      var worksheetPiece = workbook.Sheets[secondSheetName];
      var fullPiece = XLSX.utils.sheet_to_json(worksheetPiece, {header: 1, defval: ""});
     
      var pieceHeaderRowIdx = 0;
      var pieceHeaderFound = false;
      for (var r = 0; r < Math.min(fullPiece.length, 15); r++) {
        var row = fullPiece[r];
        for (var c = 0; c < row.length; c++) {
          var valStr = String(row[c]).toLowerCase().trim();
          if (valStr === "piece id" || valStr === "pid" || valStr === "piece_id" || valStr === "search") {
            pieceHeaderRowIdx = r;
            pieceHeaderFound = true;
            break;
          }
        }
        if (pieceHeaderFound) break;
      }
      dataResult.pieceHeaders = fullPiece[pieceHeaderRowIdx];
      dataResult.piece = fullPiece.slice(pieceHeaderRowIdx + 1);
    } else {
      dataResult.pieceHeaders = [];
      dataResult.piece = [];
    }
   
    return { exito: true, data: dataResult };
  } catch(e) {
    Logger.log("⚠️ Error en procesarExcelTemporal (Memoria - SheetJS): " + e.message);
    return { exito: false, error: e.message };
  }
}
