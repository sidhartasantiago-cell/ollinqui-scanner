// Convierte e integra reportes de DHL en las hojas operativas.
function procesarBatchQRO(messageId) {
  const executionLogs = [];
  function log(msg) {
    const time = new Date().toLocaleTimeString("es-MX");
    executionLogs.push("[" + time + "] " + msg);
  }

  log("🚀 Iniciando procesamiento del Batch de DHL...");
  const boveda = SpreadsheetApp.openById(ID_BOVEDA_BATCH_MAESTRO);
  const hojaRawShipment = boveda.getSheetByName("RAW_SHIPMENT");
  const hojaRawPiece = boveda.getSheetByName("RAW_PIECE");
  const hojaMesaAsignacion = boveda.getSheetByName("MESA_ASIGNACION");

  // ==========================================
  // 🗺️ OPTIMIZACIÓN LOGÍSTICA DE RAMPA (CACHE MATRIZ CP)
  // Carga Matriz CP en memoria RAM para evitar SpreadsheetApp.openById repetidos en bucles
  // ==========================================
  const mapCP_Chofer = {};
  try {
    const hojaMatriz = boveda.getSheetByName("MATRIZ_CP");
    if (hojaMatriz) {
      const datosMatriz = hojaMatriz.getDataRange().getValues();
      for (let m = 1; m < datosMatriz.length; m++) {
        const cpKey = String(datosMatriz[m][0]).trim();
        const choferVal = String(datosMatriz[m][1]).trim();
        if (cpKey) {
          mapCP_Chofer[cpKey] = choferVal || "sin_asignar@arauto.express";
        }
      }
      log("🗺️ Cache Matriz CP cargada con éxito. " + Object.keys(mapCP_Chofer).length + " zonas de rampa en memoria RAM.");
    } else {
      log("⚠️ Advertencia: No se encontró la pestaña 'MATRIZ_CP' en la Bóveda.");
    }
  } catch(errCP) {
    log("⚠️ Advertencia de red al cargar Matriz CP: " + errCP.message);
  }


  // Conectar con la base de datos de Operación Histórica (BD_CENTRAL_2023)
  let baseCentral, hojaBatchAWBCentral, hojaBatchPieceCentral;
  try {
    baseCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    hojaBatchAWBCentral = baseCentral.getSheetByName("Batch AWB");
    hojaBatchPieceCentral = baseCentral.getSheetByName("Batch Piece");
    log("🏛️ Conectado con éxito a la base de datos histórica BD CENTRAL 2023.");
  } catch (e) {
    log("⚠️ Advertencia de infraestructura: No se pudo conectar a BD CENTRAL 2023: " + e.message);
  }

  // Conectar con la base de App (BD_APP_RUTA_2025)
  const baseApp = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
  const hojaGuiasApp = baseApp.getSheetByName("GUIAS_ASIGNADAS") || baseApp.getSheetByName("RECOLECCIONES_ASIGNADAS");
  const hojaPiezasApp = baseApp.getSheetByName("PIEZAS_PID");

  let guiasInyectadas = 0;
  let pidsInyectados = 0;
  let queriesCruzadasCount = 0;

  // Buscar el correo con reporte de Excel de DHL
  let thread, message, file;
  if (messageId) {
    message = GmailApp.getMessageById(messageId);
    if (message) {
      thread = message.getThread();
      const attachments = message.getAttachments();
      for (let a = 0; a < attachments.length; a++) {
        if (attachments[a].getName().toLowerCase().indexOf(".xlsx") !== -1) {
          file = attachments[a];
          break;
        }
      }
    }
  } else {
    // Escaneo normal de carpeta de etiquetas "02_REPORTE_QRO" (Optimizado v64 para barrer hilos completos)
    const etiquetaReporte = obtenerEtiquetaPorNombre("02_REPORTE_QRO");
    if (etiquetaReporte) {
      const threads = etiquetaReporte.getThreads(0, 15); // Ampliamos a 15 hilos para evitar saltarnos correos viejos
      for (let t = 0; t < threads.length; t++) {
        const msgs = threads[t].getMessages();
        // Recorrer los mensajes del hilo de atrás para adelante (más reciente al más antiguo)
        // Esto previene fallas si un hilo tiene respuestas de conversación posteriores que no traen el Excel adjunto
        for (let m = msgs.length - 1; m >= 0; m--) {
          const msgActual = msgs[m];
          const attachments = msgActual.getAttachments();
          for (let a = 0; a < attachments.length; a++) {
            if (attachments[a].getName().toLowerCase().indexOf(".xlsx") !== -1) {
              file = attachments[a];
              message = msgActual;
              thread = threads[t];
              break;
            }
          }
          if (file) break;
        }
        if (file) break;
      }
    }
  }

  if (!file) {
    log("📭 No se encontró ningún archivo Excel (.xlsx) pendiente de procesar en Gmail.");
    return { exito: false, mensaje: "No hay reportes de Excel pendientes en Gmail.", logs: executionLogs };
  }

  const nameFile = file.getName();
  log("📦 Reporte de DHL localizado: " + nameFile);

  const replyTo = message.getFrom();
  let tempFileJson;
  try {
    const resource = {
      title: "Temp_QRO_" + Utilities.formatDate(new Date(), "GMT-6", "yyyyMMdd_HHmmss"),
      mimeType: MimeType.GOOGLE_SHEETS
    };
    tempFileJson = Drive.Files.insert(resource, file.copyBlob());
    log("🔄 Conversión de Excel en memoria RAM exitosa. ID temporal de Google Sheets: " + tempFileJson.id);
  } catch (err) {
    log("❌ ERROR crítico de plataforma en Google Drive: " + err.message);
    return { exito: false, error: err.message, logs: executionLogs };
  }

  let spreadsheetTemp;
  let excelSheets;
  try {
    spreadsheetTemp = SpreadsheetApp.openById(tempFileJson.id);
    excelSheets = spreadsheetTemp.getSheets().map(s => s.getName());
    log("✅ Estructura de pestañas de DHL detectada: " + excelSheets.join(", "));
  } catch (errOpen) {
    log("❌ ERROR al abrir el archivo temporal de Sheets: " + errOpen.message);
    Drive.Files.remove(tempFileJson.id);
    return { exito: false, error: errOpen.message, logs: executionLogs };
  }

  // 1. Validar la integridad de las pestañas
  const sheetsObj = {};
  excelSheets.forEach(n => {
    sheetsObj[n.toLowerCase().trim()] = n;
  });

  const nombreHojaPiece = sheetsObj["piece"];
  const nombreHojaShipment = sheetsObj["shipment"];

  if (!nombreHojaPiece || !nombreHojaShipment) {
    log("❌ ERROR: El archivo de DHL no cuenta con las pestañas estructuradas obligatorias ('Shipment' o 'Piece').");
    Drive.Files.remove(tempFileJson.id);
   
    // Escudo de Rebote: Correo automático de rechazo
    GmailApp.sendEmail(replyTo, "❌ [Arauto Express] RECHAZO DE INTEGRACIÓN: " + nameFile,
      "ATENCIÓN / RECHAZO DE PROCESAMIENTO:\n\n" +
      "No se pudo integrar el reporte de DHL '" + nameFile + "' debido a que el archivo está dañado o no contiene las pestañas requeridas ('Shipment' y 'Piece').\n\n" +
      "Por favor, revisa el archivo original y reenvía una versión válida de control.\n\n" +
      "Atentamente,\n" +
      "Arauto Express QRO - Ecosistema OLLIN"
    );
    log("📧 Correo de rebote de seguridad enviado a: " + replyTo);
   
    if (thread) {
      try {
        const labelObj = obtenerEtiquetaPorNombre("02_REPORTE_QRO");
        if (labelObj) thread.removeLabel(labelObj);
        thread.markRead();
      } catch(e) {}
    }
    return { exito: false, mensaje: "Reporte de DHL rechazado por falta de estructura de pestañas.", logs: executionLogs };
  }

  // 2. Procesamiento de PIDs
  log("📖 Leyendo datos de la pestaña 'Piece'...");
  const hojaPiece = spreadsheetTemp.getSheetByName(nombreHojaPiece);
  const datosPiece = hojaPiece.getDataRange().getDisplayValues();
  const busquedaPiece = encontrarFilaHeaderYIndices(datosPiece);
  if (!busquedaPiece) {
    Drive.Files.remove(tempFileJson.id);
    throw new Error("No se pudo localizar la fila de cabeceras en 'Piece'.");
  }
  const indicesPiece = busquedaPiece.indices;

  const dictPIDs = {};
  for (let i = busquedaPiece.filaHeader + 1; i < datosPiece.length; i++) {
    const fila = datosPiece[i];
    const guia = String(fila[indicesPiece["hwb no"]]).trim();
    const pid = String(fila[indicesPiece["piece id"]]).trim();
    const descPiece = indicesPiece["description"] !== undefined ? String(fila[indicesPiece["description"]]).trim() : "N/A";
    if (guia && pid) {
      if (!dictPIDs[guia]) dictPIDs[guia] = [];
      dictPIDs[guia].push({ pid: pid, desc: descPiece, row: fila });
    }
  }
  log("🧩 " + Object.keys(dictPIDs).length + " Guías con sus respectivos PIDs mapeados en RAM.");

  // 3. Procesamiento de Shipment
  log("📖 Leyendo datos de la pestaña 'Shipment'...");
  const hojaShipment = spreadsheetTemp.getSheetByName(nombreHojaShipment);
  const datosShipment = hojaShipment.getDataRange().getDisplayValues();
  const busquedaShipment = encontrarFilaHeaderYIndices(datosShipment);
  if (!busquedaShipment) {
    Drive.Files.remove(tempFileJson.id);
    throw new Error("No se pudo localizar la fila de cabeceras en 'Shipment'.");
  }
  const indicesShipment = busquedaShipment.indices;

  // Escudo anti-duplicados en la hoja de Ruta de la App
  const guiasExistentesApp = {};
  if (hojaGuiasApp.getLastRow() > 0) {
    const dataExistente = hojaGuiasApp.getRange(1, 1, hojaGuiasApp.getLastRow(), 1).getValues();
    for (let r = 1; r < dataExistente.length; r++) {
      const g = String(dataExistente[r][0]).trim();
      if (g) guiasExistentesApp[g] = true;
    }
  }

  // 4. Buscar Queries en caliente (is:unread)
  log("📞 Escaneando en caliente Gmail buscando Queries de soporte pendientes de cruzarse...");
  const labelQuery = obtenerEtiquetaPorNombre("01_QUERY_QRO");
  const hilosQueryAProcesar = [];
  const mapQueries = {};

  if (labelQuery) {
    const hilosQuery = labelQuery.getThreads(0, 15);
    log("📊 Encontrados " + hilosQuery.length + " hilos de Query para barrer en el buzón.");
   
    for (let h = 0; h < hilosQuery.length; h++) {
      const msgs = hilosQuery[h].getMessages();
      const lastMsg = msgs[msgs.length - 1];
      const htmlBody = lastMsg.getBody();
      const plainTextBody = lastMsg.getPlainBody();
     
      const contactosDeHilo = extraerContactosDeQuery(htmlBody, plainTextBody);
      const llaves = Object.keys(contactosDeHilo);
      if (llaves.length > 0) {
        hilosQueryAProcesar.push(hilosQuery[h]);
        llaves.forEach(guia => {
          mapQueries[guia] = contactosDeHilo[guia];
        });
      }
    }
  }

  // Listas de acumulación para inyección masiva
  const rowsRawShipment = [];
  const rowsBatchAWBCentral = [];
  const rowsGuiasApp = [];
  const rowsRawPiece = [];
  const rowsBatchPieceCentral = [];
  const rowsPiezasApp = [];
  const rowsMesaAsignacion = [];

  log("⏳ Analizando e integrando " + (datosShipment.length - 1 - busquedaShipment.filaHeader) + " registros en la RAM de rampa...");
  for (let i = busquedaShipment.filaHeader + 1; i < datosShipment.length; i++) {
    const fila = datosShipment[i];
    const guia = String(fila[indicesShipment["hwb no"]]).trim();
    if (!guia) continue;

    // Evitar duplicados individuales en la misma tanda en AppSheet
    if (guiasExistentesApp[guia]) continue;

        const cp = String(fila[indicesShipment["rcvr postcode"]]).trim().replace(/[^0-9]/g, "");
    const idxReceiver = indicesShipment["receiver name"];
    const destinatario = idxReceiver !== undefined ? String(fila[idxReceiver]).trim() : "N/A";
   
    const addr1 = indicesShipment["rcvr addr 1"] !== undefined ? String(fila[indicesShipment["rcvr addr 1"]]).trim() : "";
    const addr2 = indicesShipment["rcvr addr 2"] !== undefined ? String(fila[indicesShipment["rcvr addr 2"]]).trim() : "";
    const addr3 = indicesShipment["rcvr addr 3"] !== undefined ? String(fila[indicesShipment["rcvr addr 3"]]).trim() : "";
    const direccionCompleta = [addr1, addr2, addr3].filter(Boolean).join(", ");

    const telChofer = mapCP_Chofer[cp] || "sin_asignar@arauto.express";

    // CRUCE DE TELÉFONO EN CALIENTE DESDE LA MEMORIA RAM
    let telQuery = "";
    if (mapQueries[guia]) {
      telQuery = mapQueries[guia];
      queriesCruzadasCount++;
      log("🔗 Guía " + guia + " cruzada asíncronamente con el teléfono de Query: " + telQuery);
    }

    // Extraer y sanitizar el teléfono original de destinatario desde el excel si existe (Columna AJ)
    const idxTel = indicesShipment["rcvr tel"];
    let telOriginal = "";
    if (idxTel !== undefined) {
      telOriginal = String(fila[idxTel]).trim().replace(/[^0-9]/g, "");
      if (telOriginal.length === 12 && telOriginal.indexOf("52") === 0) {
        telOriginal = telOriginal.substring(2);
      }
      if (telOriginal.length > 10) {
        telOriginal = telOriginal.substring(0, 10);
      }
    }
    const telDestinatario = telQuery || telOriginal || "";

    // REEMPLAZO EN RAM FÍSICO DE LA PALABRA "HIDDEN" ANTES DE GUARDAR
    const filaModificada = [...fila];
    if (telDestinatario && idxTel !== undefined) {
      filaModificada[idxTel] = telDestinatario;
    }

    // Declarar pidsDeGuia preventivamente al inicio del cruce para evitar errores de secuencia temporal
    const pidsDeGuia = dictPIDs[guia] || [];

    // A. Guardar en RAW_SHIPMENT (Bóveda Almacén) y Batch AWB (BD Central histórica)
    rowsRawShipment.push(filaModificada);
    if (hojaBatchAWBCentral) {
      rowsBatchAWBCentral.push(filaModificada);
    }
   
    const idxEdd = indicesShipment["edd"];
    const eddVal = idxEdd !== undefined ? String(fila[idxEdd]).trim() : "N/A";

    // D. Acumular preasignaciones para la Mesa de Asignacion en Bóveda
    if (hojaMesaAsignacion) {
      const timestamp_registro = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-6", "dd/MM/yyyy HH:mm:ss");
      rowsMesaAsignacion.push([
        guia,
        pidsDeGuia.length || 1,
        cp,
        direccionCompleta,
        telDestinatario,
        telChofer,
        eddVal,
        destinatario,
        timestamp_registro // Col I: Timestamp de registro de la preasignación teórica
      ]);
    }

    // DETECTAR ENVIOS INTERNACIONALES (A base de Orig Ctry, Dest Ctry, y Prod Code)
    const idxOrig = indicesShipment["orig ctry"];
    const idxDest = indicesShipment["dest ctry"];
    const idxProd = indicesShipment["product"];
    const origCtry = idxOrig !== undefined ? String(fila[idxOrig]).trim().toUpperCase() : "MX";
    const destCtry = idxDest !== undefined ? String(fila[idxDest]).trim().toUpperCase() : "MX";
    const prodCode = idxProd !== undefined ? String(fila[idxProd]).trim().toUpperCase() : "G";
    const esInternacional = (origCtry !== "MX" || destCtry !== "MX" || ["P", "U", "D", "K", "T", "I"].includes(prodCode));

    const finalDestinatario = esInternacional ? (destinatario + " [INTER]") : destinatario;

    // B. Acumular datos para la app móvil de los choferes (BD_APP_RUTA_2025)
    // 8-column strict mapping to align perfectly with GUIAS_ASIGNADAS sheet & prevent shifting
    // Concentrates C.P. into DireccionCompleta to support Ollinqui App without schema modification
    const dirConCP = cp ? (direccionCompleta + " (C.P. " + cp + ")") : direccionCompleta;
    rowsGuiasApp.push([
      guia,                   // Col A: Guia
      finalDestinatario,      // Col B: Destinatario (Con tag [INTER] si aplica)
      dirConCP,               // Col C: DireccionCompleta + C.P.
      eddVal,                 // Col D: EDD
      telChofer,              // Col E: Chofer
      pidsDeGuia.length || 1, // Col F: Total_Piezas
      telDestinatario,        // Col G: Telefono
      "PENDIENTE"             // Col H: Estatus_Guia
    ]);

    // C. Mapear PIDs de la guía
    pidsDeGuia.forEach(item => {
      const rawRowPiece = [...item.row];
      const pidBoveda = sanitizarPIDParaBoveda(item.pid);
      if (indicesPiece["piece id"] !== undefined) {
        rawRowPiece[indicesPiece["piece id"]] = pidBoveda;
      }
      rowsRawPiece.push(rawRowPiece);
      if (hojaBatchPieceCentral) {
        rowsBatchPieceCentral.push(rawRowPiece);
      }

      const pidAppSheet = formatearPidParaCampo_(item.pid);
      const pieceDesc = item.desc || "N/A";
      rowsPiezasApp.push([
        guia,          // Col A: Guia
        pidAppSheet,   // Col B: PID
        pieceDesc,     // Col C: Descripcion
        "PENDIENTE",   // Col D: Estatus_PID
        ""             // Col E: Timestamp (Se deja en blanco para que AppSheet lo llene en el escaneo fisico en ruta)
      ]);
    });
  }

  // 5. Escritura masiva síncrona de seguridad (Bulk Write)
  if (rowsRawShipment.length > 0) {
    const lastRow = hojaRawShipment.getLastRow();
    hojaRawShipment.getRange(lastRow + 1, 1, rowsRawShipment.length, rowsRawShipment[0].length).setValues(rowsRawShipment);
    guiasInyectadas = rowsRawShipment.length;
    log("💾 RAW_SHIPMENT: " + guiasInyectadas + " registros nuevos inyectados.");
  }

  if (hojaMesaAsignacion && rowsMesaAsignacion.length > 0) {
    const lastRow = hojaMesaAsignacion.getLastRow();
    hojaMesaAsignacion.getRange(lastRow + 1, 1, rowsMesaAsignacion.length, rowsMesaAsignacion[0].length).setValues(rowsMesaAsignacion);
    log("💾 MESA_ASIGNACION: " + rowsMesaAsignacion.length + " preasignaciones de rampa guardadas en la Bóveda.");
  }

  if (hojaBatchAWBCentral && rowsBatchAWBCentral.length > 0) {
    const lastRow = hojaBatchAWBCentral.getLastRow();
    hojaBatchAWBCentral.getRange(lastRow + 1, 1, rowsBatchAWBCentral.length, rowsBatchAWBCentral[0].length).setValues(rowsBatchAWBCentral);
    log("🏛️ BD CENTRAL 'Batch AWB': " + rowsBatchAWBCentral.length + " guías actualizadas.");
  }

  if (rowsGuiasApp.length > 0) {
    const lastRow = hojaGuiasApp.getLastRow();
    hojaGuiasApp.getRange(lastRow + 1, 1, rowsGuiasApp.length, rowsGuiasApp[0].length).setValues(rowsGuiasApp);
    log("🚚 GUIAS_ASIGNADAS (AppSheet): " + rowsGuiasApp.length + " guías inyectadas a campo.");
  }

  if (rowsRawPiece.length > 0) {
    const lastRow = hojaRawPiece.getLastRow();
    hojaRawPiece.getRange(lastRow + 1, 1, rowsRawPiece.length, rowsRawPiece[0].length).setValues(rowsRawPiece);
  }

  if (hojaBatchPieceCentral && rowsBatchPieceCentral.length > 0) {
    const lastRow = hojaBatchPieceCentral.getLastRow();
    hojaBatchPieceCentral.getRange(lastRow + 1, 1, rowsBatchPieceCentral.length, rowsBatchPieceCentral[0].length).setValues(rowsBatchPieceCentral);
  }

  if (rowsPiezasApp.length > 0) {
    const lastRow = hojaPiezasApp.getLastRow();
    hojaPiezasApp.getRange(lastRow + 1, 1, rowsPiezasApp.length, rowsPiezasApp[0].length).setValues(rowsPiezasApp);
    pidsInyectados = rowsPiezasApp.length;
    log("🧩 PIEZAS_PID (AppSheet): " + pidsInyectados + " piezas validadas e inyectadas.");
  }

  // Copiar fórmulas de arrastre automático en la hoja central histórica de Batch AWB
  if (hojaBatchAWBCentral && guiasInyectadas > 0) {
    try {
      const lastRow = hojaBatchAWBCentral.getLastRow();
      const startRow = lastRow - guiasInyectadas + 1;
      const startCol = 50; // AX
      const maxCols = hojaBatchAWBCentral.getMaxColumns();
      const numCols = maxCols - startCol + 1;
      if (startRow > 2 && numCols > 0) {
        const sourceRange = hojaBatchAWBCentral.getRange(2, startCol, 1, numCols);
        const targetRange = hojaBatchAWBCentral.getRange(startRow, startCol, guiasInyectadas, numCols);
        sourceRange.copyTo(targetRange);
        log("✅ Fórmulas logísticas de 'Batch AWB' auto-propagadas.");
      }
    } catch(errFormulas) {
      log("⚠️ Advertencia al copiar fórmulas: " + errFormulas.message);
    }
  }

  // Marcar hilos de Query como leídos
  if (hilosQueryAProcesar.length > 0) {
    log("🧹 Limpiando " + hilosQueryAProcesar.length + " hilos de Query resueltos en Gmail...");
    hilosQueryAProcesar.forEach(thread => {
      thread.markRead();
      try {
        const labelQuery = obtenerEtiquetaPorNombre("01_QUERY_QRO");
        if (labelQuery) thread.removeLabel(labelQuery);
      } catch(eLabel) {}
    });
  }

  // Remover archivo temporal
  Drive.Files.remove(tempFileJson.id);
  log("🗑️ Archivo temporal de RAM eliminado.");

  // Envío de correo de éxito a Irvin Reyes
  try {
    const subject = "✅ [Ecosistema OLLIN] INGESTIÓN EXITOSA: " + nameFile;
    const body = "REPORTE DE INGESTIÓN INTEGRAL DE RAMPA:\n\n" +
      "Se ha procesado exitosamente el archivo Excel de DHL en la rampa de Querétaro.\n\n" +
      "📊 Métricas de Carga de Rampa:\n" +
      "📦 Guías de embarques integradas: " + guiasInyectadas + "\n" +
      "🏷️ Piezas/PIDs validadas con Doble \"J\": " + pidsInyectados + "\n" +
      "📞 Contactos de Queries cruzados en caliente: " + queriesCruzadasCount + "\n\n" +
      "El lote completo ya se encuentra pre-asignado y listo para visualización y despacho a campo en tu consola TLACHIALONI.\n\n" +
      "Atentamente,\n" +
      "Cerebro Asíncrono OLLIN";
    MailApp.sendEmail(EMAIL_ADMIN_IRVIN, subject, body);
  } catch(eMail) {
    log("⚠️ No se pudo enviar el correo de confirmación de éxito.");
  }

  if (thread) {
    try {
      const labelObj = obtenerEtiquetaPorNombre("02_REPORTE_QRO");
      if (labelObj) thread.removeLabel(labelObj);
      thread.markRead();
    } catch(e) {}
  }

  // Registrar evento en LOG_TRAZABILIDAD
  registrarTrazabilidadQRO("INGESTA BATCH", nameFile, guiasInyectadas + " guias / " + pidsInyectados + " pids", "SISTEMA", "EXITOSO");
 
  return { exito: true, mensaje: "Se integraron " + guiasInyectadas + " guías y " + pidsInyectados + " piezas.", logs: executionLogs };
}
