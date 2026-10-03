/**
 * 🏛️ TLACHIALONI & AMOXCALLI QRO - AUTOMATIZACIONES Y CONTROL (v70.0 PROD)
 * Ecosistema OLLIN - Arauto Express Querétaro
 * 
 * SCRIPT PRINCIPAL DE RESPALDO Y MONITOREO DE RAMPA Y CALLE
 * Alojar en: Google Apps Script de VALIDACIÓN_QRO_2025
 */

// IDs de Infraestructura del Ecosistema OLLIN
var ID_BD_APP_RUTA_2025 = ID_BD_APP_RUTA_2025 || "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w"; // Base de AppSheet / Pochtecas
// const ID_BOVEDA_BATCH_MAESTRO = "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw"; // Ya declarado en CONTROL_FACTURACION_QRO_2026
const ID_VALIDACION_QRO_2025 = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M"; // Matriz Canónica 25 Columnas
// const ID_BD_CENTRAL_2023 = "1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8"; // Declarado en Code.gs

const EMAIL_ADMIN_IRVIN = "irvin.reyes@arauto.express";

// Diccionario de Mapeo Inteligente (Idéntico al de LEN)
const DICCIONARIO_MAPEO_V6 = {
  "hwb no": ["hwb no", "hwb", "guia", "search", "waybill", "airbill", "guía", "hawb"],
  "piece id": ["piece id", "pid", "piece_id", "pieceid", "piece id/ship id"],
  "piece no": ["piece no", "pieces", "bultos", "piezas", "piece_no", "piece count"],
  "receiver name": ["receiver name", "consignee name", "destinatario", "nombre_recibe", "receiver contact name"],
  "rcvr addr 1": ["rcvr addr 1", "receiver address 1", "address 1", "rcvr addr1", "rcvr_addr_1", "direccion 1", "dirección 1"],
  "rcvr addr 2": ["rcvr addr 2", "receiver address 2", "address 2", "rcvr addr2", "rcvr_addr_2", "direccion 2", "dirección 2"],
  "rcvr addr 3": ["rcvr addr 3", "receiver address 3", "address 3", "rcvr addr3", "rcvr_addr_3", "direccion 3", "dirección 3"],
  "rcvr postcode": ["rcvr postcode", "receiver postcode", "rcvr postal code", "postal code", "cp", "postcode", "rcvr_postcode", "c.p."],
  "shpr tel": ["shpr tel", "shipper tel", "shipper telephone", "shpr_tel"],
  "rcvr tel": ["rcvr tel", "receiver tel", "receiver telephone", "rcvr_tel", "recipient tel", "recipient phone", "phone", "tel", "telefono"]
};

/**
 * 🌐 SERVIDOR DE INTERFAZ WEB (TLACHIALONI QRO)
 * Sirve la Consola Unificada (v70.0 PROD - Rampa e Incidencias Sierra Gorda)
 */
function _doGet_old(e) {
  let role = "irvin"; // default
  if (e && e.parameter && e.parameter.role) {
    role = e.parameter.role.toLowerCase();
  } else {
    try {
      const email = Session.getActiveUser().getEmail().toLowerCase();
      if (email.indexOf("daniel") !== -1 || email.indexOf("jesus") !== -1 || email.indexOf("oscher") !== -1) {
        role = "daniel";
      }
    } catch(err) {
      // Ignorar si no está autenticado o no se puede obtener el correo
    }
  }
  
  const template = HtmlService.createTemplateFromFile('Index');
  template.role = role;
  
  return template.evaluate()
    .setTitle('Tlachialoni QRO - Consola de Operación v70.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 1️⃣ SECCIÓN BATCH: PROCESAR REPORTES DE GMAIL CON ESCUDO DE REBOTE Y CRUCE ATÓMICO
 */
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
  const mapCP_TipoServicio = {};
  try {
    const hojaMatriz = boveda.getSheetByName("MATRIZ_CP");
    if (hojaMatriz) {
      const datosMatriz = hojaMatriz.getDataRange().getValues();
      const cabMatriz = datosMatriz[0].map(h => String(h).toLowerCase().trim());

      let colCP = cabMatriz.findIndex(h => h === "c.p." || h === "cp" || h.includes("postal"));
      if (colCP === -1) colCP = 0;

      let colChofer = cabMatriz.findIndex(h => h.includes("chofer") || h.includes("operador") || h.includes("pochteca") || h.includes("correo"));
      if (colChofer === -1) colChofer = 1;

      let colServicio = -1;
      for (let c = 0; c < cabMatriz.length; c++) {
        const h = cabMatriz[c];
        if (h.indexOf("servicio") !== -1 || h.indexOf("tipo") !== -1 || h.indexOf("cobertura") !== -1 || h.indexOf("zona") !== -1) {
          colServicio = c;
          break;
        }
      }
      if (colServicio === -1 && datosMatriz[0].length >= 3) {
        colServicio = 2;
      }

      for (let m = 1; m < datosMatriz.length; m++) {
        const cpKey = String(datosMatriz[m][colCP] || "").trim();
        const choferVal = String(datosMatriz[m][colChofer] || "").trim();
        const servicioVal = colServicio !== -1 ? String(datosMatriz[m][colServicio] || "").trim() : "";
        if (cpKey) {
          mapCP_Chofer[cpKey] = choferVal || "sin_asignar@arauto.express";
          if (servicioVal) {
            mapCP_TipoServicio[cpKey] = servicioVal;
          }
        }
      }
      log("🗺️ Cache Matriz CP cargada con éxito: " + Object.keys(mapCP_Chofer).length + " zonas de chofer y " + Object.keys(mapCP_TipoServicio).length + " tipos de servicio en memoria RAM.");
    } else {
      log("⚠️ Advertencia: No se encontró la pestaña 'MATRIZ_CP' en la Bóveda.");
    }
  } catch(errCP) {
    log("⚠️ Advertencia de red al cargar Matriz CP: " + errCP.message);
  }


  // Conectar con la base de datos de Operación Histórica (BD_CENTRAL_2023)
  let baseCentral, hojaBatchAWBCentral, hojaBatchPieceCentral, hojaRutaCentral;
  try {
    baseCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    hojaBatchAWBCentral = baseCentral.getSheetByName("Batch AWB");
    hojaBatchPieceCentral = baseCentral.getSheetByName("Batch Piece");
    hojaRutaCentral = baseCentral.getSheetByName("RUTA");
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
  const datosPiece = hojaPiece.getDataRange().getValues();
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
  const datosShipment = hojaShipment.getDataRange().getValues();
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
      // Consolidar cuerpo y adjuntos de todos los mensajes del hilo
      let combinedHtml = "";
      let combinedPlain = "";
      let allAttachments = [];
      const msgs = hilosQuery[h].getMessages();
      msgs.forEach(msg => {
         combinedHtml += "\n" + msg.getBody();
         combinedPlain += "\n" + msg.getPlainBody();
         allAttachments = allAttachments.concat(msg.getAttachments());
      });
      
      const contactosDeHilo = extraerContactosDeQuery(combinedHtml, combinedPlain);
      log("⚙️ Revisando " + allAttachments.length + " adjuntos en todo el hilo de correo...");
      allAttachments.forEach(att => {
        log("   ↳ Adjunto: " + att.getName());
        if (att.getName().toLowerCase().endsWith(".csv")) {
          try {
            const csvTexto = att.getDataAsString('UTF-8');
            const csvData = Utilities.parseCsv(csvTexto);
            if (csvData.length > 0) {
              const headers = csvData[0].map(h => String(h).toLowerCase().trim()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, ""));
              let idxGuia = -1;
              let idxTel = -1;
              for (let c = 0; c < headers.length; c++) {
                const h = headers[c];
                if (h.includes("guia") || h.includes("hwb") || h.includes("waybill")) {
                  if (idxGuia === -1) idxGuia = c;
                }
                if (h.includes("tel") || h.includes("phone") || h.includes("movil") || h.includes("celular")) {
                  if (idxTel === -1) idxTel = c;
                }
              }
              
              if (idxGuia !== -1 && idxTel !== -1) {
                log("⚙️ CSV Detectado en cruce Batch: " + att.getName());
                for (let r = 1; r < csvData.length; r++) {
                  const numGuia = String(csvData[r][idxGuia]).trim();
                  let rawTel = csvData[r][idxTel];
                  let numTel = sanitizarTelefonoReal(rawTel);
                  
                  if (numTel === "HIDDEN" && rawTel) {
                    log("⚠️ Guía " + numGuia + ": tel inválido o con dígitos perdidos (" + rawTel + "). Requiere captura manual.");
                  }
                  
                  if (numGuia && numTel !== "HIDDEN") {
                    contactosDeHilo[numGuia] = numTel;
                  }
                }
              }
            }
          } catch(e) { log("⚠️ Error fatal parseando CSV: " + e.message); }
        }
      });

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
  const rowsRutaCentral = [];
  const rowsGuiasApp = [];
  const rowsRawPiece = [];
  const rowsBatchPieceCentral = [];
  const rowsPiezasApp = [];
  const rowsMesaAsignacion = [];

  // ==========================================
  // MAPEO INTELIGENTE DE COLUMNAS (ALINEACIÓN DINÁMICA)
  // ==========================================
  let headersDestino = [];
  let headersOrigen = datosShipment[busquedaShipment.filaHeader].map(h => String(h).toLowerCase().trim());
  if (hojaBatchAWBCentral) {
    // Leemos hasta la columna AW (49) para no tocar las fórmulas que empiezan en AX
    headersDestino = hojaBatchAWBCentral.getRange(1, 1, 1, 49).getValues()[0].map(h => String(h).toLowerCase().trim());
  }

  let mapIndicesTarget = [];
  for (let c = 0; c < headersDestino.length; c++) {
    const hDest = headersDestino[c];
    if (!hDest) {
      mapIndicesTarget.push(-1);
      continue;
    }
    
    // Intento 1: Coincidencia exacta
    let idx = headersOrigen.indexOf(hDest);
    
    // Intento 2: Búsqueda en Diccionario de Mapeo
    if (idx === -1) {
      for (const key in DICCIONARIO_MAPEO_V6) {
        if (DICCIONARIO_MAPEO_V6[key].includes(hDest)) {
          idx = indicesShipment[key] !== undefined ? indicesShipment[key] : -1;
          break;
        }
      }
    }
    mapIndicesTarget.push(idx);
  }

  log("✨ Mapeo Inteligente de Columnas completado. " + mapIndicesTarget.filter(i => i !== -1).length + " columnas alineadas de 49.");



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
    let celdaTelRaw = idxTel !== undefined ? fila[idxTel] : "";
    let telOriginal = sanitizarTelefonoReal(celdaTelRaw);
    
    // El teléfono final prioriza el Query, sino usa el original del archivo
    let telFinal = telQuery || telOriginal;
    
    // Si la celda original no estaba vacía y la limpieza falló, no inyectamos "HIDDEN"
    // artificialmente sobre datos que DHL envió, mantenemos la data cruda del Excel
    if (telFinal === "HIDDEN" && String(celdaTelRaw).trim() !== "") {
       telFinal = String(celdaTelRaw).trim(); 
    }

    // REEMPLAZO EN RAM FÍSICO
    if (idxTel !== undefined) {
      fila[idxTel] = telFinal;
    }

    // ALINEACIÓN DINÁMICA DE COLUMNAS (Evita desplazar fórmulas si DHL agrega columnas)
    let filaModificada = [];
    if (headersDestino.length > 0) {
      filaModificada = new Array(headersDestino.length).fill("");
      for (let c = 0; c < mapIndicesTarget.length; c++) {
        if (mapIndicesTarget[c] !== -1 && fila[mapIndicesTarget[c]] !== undefined) {
          filaModificada[c] = fila[mapIndicesTarget[c]];
        }
      }
    } else {
      filaModificada = [...fila]; // Fallback
    }


    // Declarar pidsDeGuia preventivamente al inicio del cruce para evitar errores de secuencia temporal
    const pidsDeGuia = dictPIDs[guia] || [];

    // A. Guardar en RAW_SHIPMENT (Bóveda Almacén) y Batch AWB (BD Central histórica)
    rowsRawShipment.push(filaModificada);
    if (hojaBatchAWBCentral) {
      rowsBatchAWBCentral.push(filaModificada);
    }
    
    const idxEdd = indicesShipment["edd"];
    const rawEdd = idxEdd !== undefined ? fila[idxEdd] : "";
    const eddVal = formatearFechaEDD(rawEdd);

    // D. Acumular preasignaciones para la Mesa de Asignacion en Bóveda
    if (hojaMesaAsignacion) {
      const timestamp_registro = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-6", "dd/MM/yyyy HH:mm:ss");
      rowsMesaAsignacion.push([
        guia,
        pidsDeGuia.length || 1,
        cp,
        direccionCompleta,
        telFinal,
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

    if (hojaRutaCentral) {
      const fechaHoyStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-6", "dd/MM/yyyy");
      const fechaHoraStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-6", "dd/MM/yyyy HH:mm:ss");
      const llaveUnica = Utilities.getUuid().substring(0, 8);
      const interEstatus = (origCtry !== "MX" && origCtry !== "") ? "Inter" : "";
      const tipoServicio = mapCP_TipoServicio[cp] || ((cp.startsWith("760") || cp.startsWith("761")) ? "Local" : "Foraneo");
      const idxAddr1 = indicesShipment["rcvr addr 1"];
      const idxAddr2 = indicesShipment["rcvr addr 2"];
      const idxAddr3 = indicesShipment["rcvr addr 3"];
      const addr1 = idxAddr1 !== undefined ? String(fila[idxAddr1]).trim() : "";
      const addr2 = idxAddr2 !== undefined ? String(fila[idxAddr2]).trim() : "";
      const addr3 = idxAddr3 !== undefined ? String(fila[idxAddr3]).trim() : "";
      const filaRuta = new Array(21).fill("");
      filaRuta[0] = guia;                                                    // Col A: Guia
      filaRuta[1] = pidsDeGuia.length > 0 ? formatearPidDobleJ(pidsDeGuia[0].pid) : ""; // Col B: PID
      filaRuta[2] = cp;                                                      // Col C: C.P.
      filaRuta[3] = pidsDeGuia.length || 1;                                  // Col D: Piezas
      filaRuta[4] = addr1;                                                   // Col E: Rcvr Addr 1
      filaRuta[5] = addr2;                                                   // Col F: Rcvr Addr 2
      filaRuta[6] = addr3;                                                   // Col G: Rcvr Addr 3
      filaRuta[7] = destinatario;                                            // Col H: Receiver Name
      filaRuta[9] = "PRE_ASIGNADO";                                          // Col J: Checkpoint
      filaRuta[11] = fechaHoraStr;                                           // Col L: Fecha asignacion
      filaRuta[14] = telChofer;                                              // Col O: ID correo (Pochteca)
      filaRuta[15] = eddVal;                                                 // Col P: EDD (d/M/yyyy)
      filaRuta[16] = "";                                                     // Col Q: Actualizacion (VACÍA según regla)
      filaRuta[17] = llaveUnica;                                             // Col R: KEY
      filaRuta[18] = tipoServicio;                                           // Col S: Tipo de servicio (MATRIZ_CP)
      filaRuta[19] = interEstatus;                                           // Col T: Inter
      filaRuta[20] = telFinal;                                               // Col U: Telefono
      rowsRutaCentral.push(filaRuta);
    }

    const finalDestinatario = esInternacional ? (destinatario + " [INTER]") : destinatario;

    // B. Acumular datos para la app móvil de los choferes (BD_APP_RUTA_2025)
    // 8-column strict mapping to align perfectly with GUIAS_ASIGNADAS sheet & prevent shifting
    // Concentrates C.P. into DireccionCompleta to support Ollinqui App without schema modification
    const dirConCP = cp ? (direccionCompleta + " (C.P. " + cp + ")") : direccionCompleta;
    rowsGuiasApp.push([
      guia,                   // Col A: Guia
      finalDestinatario,      // Col B: Destinatario (Con tag [INTER] si aplica)
      dirConCP,               // Col C: DireccionCompleta + C.P.
      eddVal,                 // Col D: EDD (d/M/yyyy)
      telChofer,              // Col E: Chofer
      pidsDeGuia.length || 1, // Col F: Total_Piezas
      telFinal,               // Col G: Telefono
      "PRE_ASIGNADO"          // Col H: Estatus_Guia
    ]);

    // C. Mapear PIDs de la guía
    pidsDeGuia.forEach(item => {
      const rawRowPiece = [...item.row];
      const pidBoveda = formatearPidUnaJ(item.pid);
      if (indicesPiece["piece id"] !== undefined) {
        rawRowPiece[indicesPiece["piece id"]] = pidBoveda;
      }
      rowsRawPiece.push(rawRowPiece);
      if (hojaBatchPieceCentral) {
        rowsBatchPieceCentral.push(rawRowPiece);
      }

      const pidAppSheet = formatearPidDobleJ(item.pid);
      const pieceDesc = item.desc || "N/A";
      rowsPiezasApp.push([
        guia,          // Col A: Guia
        pidAppSheet,   // Col B: PID
        pieceDesc,     // Col C: Descripcion
        "PRE_ASIGNADO",// Col D: Estatus_PID
        "SIN_CARGAR"   // Col E: Escaneo_Validacion
      ]);
    });
  }

  // 5. Escritura masiva síncrona de seguridad (Bulk Write)
  if (rowsRawShipment.length > 0) {
    const lastRow = hojaRawShipment.getLastRow();
    hojaRawShipment.getRange("AJ:AJ").setNumberFormat("@");
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
    hojaBatchAWBCentral.getRange("AJ:AJ").setNumberFormat("@");
    hojaBatchAWBCentral.getRange(lastRow + 1, 1, rowsBatchAWBCentral.length, rowsBatchAWBCentral[0].length).setValues(rowsBatchAWBCentral);
    log("🏛️ BD CENTRAL 'Batch AWB': " + rowsBatchAWBCentral.length + " guías actualizadas.");
  }

  if (hojaRutaCentral && rowsRutaCentral.length > 0) {
    const lastRow = hojaRutaCentral.getLastRow();
    hojaRutaCentral.getRange(lastRow + 1, 1, rowsRutaCentral.length, rowsRutaCentral[0].length).setValues(rowsRutaCentral);
    log("🏛️ BD CENTRAL 'RUTA' (Vieja Aplicación): " + rowsRutaCentral.length + " registros inyectados con estatus Inter.");
  }

  if (rowsGuiasApp.length > 0) {
    const lastRow = hojaGuiasApp.getLastRow();
    hojaGuiasApp.getRange("G:G").setNumberFormat("@");
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

/**
 * 2️⃣ SECCIÓN QUERIES: ACTUALIZAR TELÉFONOS EN CALIENTE PARA REGISTROS EN APP
 */
function procesarQueriesQRO() {
  const executionLogs = [];
  function log(msg) {
    const time = new Date().toLocaleTimeString("es-MX");
    executionLogs.push("[" + time + "] " + msg);
  }

  log("⚙️ [CANON SUPREMO] Iniciando Ingesta Expandida de Queries ('01_QUERY_QRO')...");
  const labelQuery = obtenerEtiquetaPorNombre("01_QUERY_QRO");
  if (!labelQuery) {
    log("⚠️ No se localizó la etiqueta '01_QUERY_QRO' en tu buzón.");
    return { exito: false, error: "La etiqueta de Queries no existe.", logs: executionLogs };
  }

  const hilos = labelQuery.getThreads(0, 15);
  if (hilos.length === 0) {
    log("📭 No hay correos de Queries no leídos en la etiqueta '01_QUERY_QRO'.");
    return { exito: false, mensaje: "No hay Queries pendientes en Gmail.", logs: executionLogs };
  }

  // =========================================================================
  // 1. EXTRACCIÓN Y PARSEO VECTORIZADO EN RAM (CERO RETENCIÓN DE CERROJO)
  // =========================================================================
  const registrosTelemetriaTotal = [];
  const contactosTotal = {};
  const hilosValidados = [];

  hilos.forEach(thread => {
    const msgs = thread.getMessages();
    const lastMsg = msgs[msgs.length - 1];
    const htmlBody = lastMsg.getBody();
    const plainTextBody = lastMsg.getPlainBody();
    const subject = thread.getFirstMessageSubject();

    const resultadoParseo = extraerTelemetriaExpandidaQuery(htmlBody, plainTextBody);
    const contactos = resultadoParseo.contactos;
    const telemetria = resultadoParseo.telemetria;

    // Adjuntos CSV (Extracción fallback de teléfonos)
    const adjuntos = lastMsg.getAttachments();
    adjuntos.forEach(att => {
      if (att.getName().toLowerCase().endsWith(".csv")) {
        try {
          const csvTexto = att.getDataAsString('UTF-8');
          const csvData = Utilities.parseCsv(csvTexto);
          if (csvData.length > 0) {
            const headers = csvData[0].map(h => String(h).toLowerCase().trim()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, ""));
            let idxGuia = -1, idxTel = -1;
            for (let c = 0; c < headers.length; c++) {
              if (headers[c].includes("guia") || headers[c].includes("hwb") || headers[c].includes("waybill")) idxGuia = c;
              if (headers[c].includes("tel") || headers[c].includes("phone") || headers[c].includes("movil")) idxTel = c;
            }
            if (idxGuia !== -1 && idxTel !== -1) {
              for (let r = 1; r < csvData.length; r++) {
                const numGuia = String(csvData[r][idxGuia]).trim();
                const rawTel = csvData[r][idxTel];
                const numTel = limpiarYValidarTelefono_QRO(rawTel);
                if (numGuia && numTel) {
                  contactos[numGuia] = numTel;
                }
              }
            }
          }
        } catch(eCsv) {
          log("⚠️ Error parseando CSV de Query: " + eCsv.message);
        }
      }
    });

    Object.assign(contactosTotal, contactos);
    telemetria.forEach(t => {
      t.asunto = subject;
      registrosTelemetriaTotal.push(t);
    });
    hilosValidados.push(thread);
  });

  log("📊 Telemetría extraída en RAM: " + registrosTelemetriaTotal.length + " eventos de telemetría, " + Object.keys(contactosTotal).length + " teléfonos recuperados.");

  // =========================================================================
  // 2. ADQUISICIÓN DE CERROJO PARA INYECCIÓN ATÓMICA (< 3s DE RETENCIÓN)
  // =========================================================================
  const lock = LockService.getScriptLock();
  let totalActualizados = 0;
  try {
    if (!lock.tryLock(30000)) {
      log("❌ No se pudo adquirir el bloqueo de red (LockService ocupado). Reintentando en próximo ciclo.");
      return { exito: false, error: "Sistema ocupado. Reintentando en próximo ciclo.", logs: executionLogs };
    }

    // A. Enriquecer GUIAS_ASIGNADAS en BD_APP_RUTA_2025 (Eliminar 'HIDDEN' de la app móvil)
    const baseApp = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    const hojaGuiasApp = baseApp.getSheetByName("GUIAS_ASIGNADAS") || baseApp.getSheetByName("RECOLECCIONES_ASIGNADAS");
    if (hojaGuiasApp) {
      const datosGuias = hojaGuiasApp.getDataRange().getValues();
      const cabGuias = datosGuias[0].map(h => String(h).trim().toLowerCase());
      let colTelIdx = cabGuias.indexOf("tel_destinatario");
      if (colTelIdx === -1) colTelIdx = cabGuias.indexOf("telefono");
      if (colTelIdx === -1) colTelIdx = 6; // Col G por defecto

      for (let j = 1; j < datosGuias.length; j++) {
        const guiaSheet = normalizarAwb_QRO(datosGuias[j][0]);
        if (contactosTotal[guiaSheet]) {
          const telNuevo = contactosTotal[guiaSheet];
          const telViejo = String(datosGuias[j][colTelIdx] || "").trim();
          if (telViejo !== telNuevo) {
            hojaGuiasApp.getRange(j + 1, colTelIdx + 1).setNumberFormat("@").setValue(telNuevo);
            totalActualizados++;
          }
        }
      }
      log("✅ " + totalActualizados + " teléfonos saneados e inyectados en GUIAS_ASIGNADAS (Cero 'HIDDEN').");
    }

    // B. Resguardar en 'HISTORICO_QUERIES' en VALIDACIÓN_QRO_2025 (Blindando la hoja activa de 25 cols)
    try {
      const ssVal = SpreadsheetApp.openById(ID_VALIDACION_QRO_2025);
      let hojaHistQuery = ssVal.getSheetByName("HISTORICO_QUERIES");
      if (!hojaHistQuery) {
        hojaHistQuery = ssVal.insertSheet("HISTORICO_QUERIES");
      }
      if (hojaHistQuery.getLastRow() === 0) {
        hojaHistQuery.appendRow([
          "Marca de Tiempo", "Guia", "PID", "Telefono Sanitizado",
          "Receiver Name", "Receiver Ctc", "Rcvr Addr 1", "Rcvr Addr 2",
          "Rcvr City", "Rcvr State", "Rcvr Postcode", "Shipper Name",
          "Shipper Phone", "Shipper Ubicacion", "Peso Declarado",
          "Peso Real RW", "Dimensiones RW", "Timestamp Evento AR",
          "Timestamp Evento FD", "Horas Retencion AR_FD", "Asunto", "Estatus Auditoria"
        ]);
      }

      if (registrosTelemetriaTotal.length > 0) {
        const rowsHist = registrosTelemetriaTotal.map(t => [
          Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-6", "yyyy-MM-dd HH:mm:ss"),
          t.guia,
          t.pid,
          t.telefono,
          t.receiver_name,
          t.receiver_ctc,
          t.rcvr_addr1,
          t.rcvr_addr2,
          t.rcvr_city,
          t.rcvr_state,
          t.rcvr_postcode,
          t.shipper_name,
          t.shipper_phone,
          t.shipper_city_state,
          t.peso_declarado,
          t.peso_real_rw,
          t.dimensiones_rw,
          t.timestamp_ar,
          t.timestamp_fd,
          t.horas_retencion_ar_fd,
          t.asunto || "",
          "INGESTA_QUERY_OK"
        ]);

        const startRow = hojaHistQuery.getLastRow() + 1;
        hojaHistQuery.getRange(startRow, 1, rowsHist.length, rowsHist[0].length).setValues(rowsHist);
        log("🏛️ " + rowsHist.length + " eventos de telemetría completa resguardados en 'HISTORICO_QUERIES' (VALIDACIÓN_QRO_2025).");
      }
    } catch(eHist) {
      log("⚠️ Advertencia resguardando en HISTORICO_QUERIES: " + eHist.message);
    }

    // C. Resguardar en 'RAW_SHIPMENT' en BOVEDA_BATCH_MAESTRO
    try {
      const boveda = SpreadsheetApp.openById(ID_BOVEDA_BATCH_MAESTRO);
      let hojaRaw = boveda.getSheetByName("RAW_SHIPMENT") || boveda.getSheetByName("RAW_PIECE");
      if (hojaRaw && registrosTelemetriaTotal.length > 0) {
        const rowsRaw = registrosTelemetriaTotal.map(t => [
          Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-6", "yyyy-MM-dd HH:mm:ss"),
          t.guia,
          t.pid,
          t.peso_real_rw,
          t.timestamp_ar,
          t.timestamp_fd,
          t.horas_retencion_ar_fd,
          "01_QUERY_QRO"
        ]);
        const startRowBov = hojaRaw.getLastRow() + 1;
        hojaRaw.getRange(startRowBov, 1, rowsRaw.length, rowsRaw[0].length).setValues(rowsRaw);
        log("🏛️ " + rowsRaw.length + " eventos RAW sincronizados en Bóveda Batch Maestro.");
      }
    } catch(eBov) {
      log("⚠️ Advertencia resguardando en RAW Bóveda: " + eBov.message);
    }

    // Registrar en LOG_TRAZABILIDAD
    registrarTrazabilidadQRO("CRUCE QUERIES EXPANDIDO", "Multi-Guia", totalActualizados, "GMAIL", "TELEMETRIA_RESGUARDADA");

  } catch(err) {
    log("❌ ERROR crítico durante la inyección de Query: " + err.message);
    return { exito: false, error: err.message, logs: executionLogs };
  } finally {
    lock.releaseLock();
    log("🔓 Cerrojo LockService liberado exitosamente (< 3s).");
  }

  // =========================================================================
  // 3. DES-ETIQUETADO DE GMAIL (FUERA DEL CERROJO)
  // =========================================================================
  hilosValidados.forEach(thread => {
    try {
      thread.markRead();
      thread.removeLabel(labelQuery);
      log("🧹 Hilo de Query marcado como leído y des-etiquetado.");
    } catch(eLabel) {
      log("⚠️ Advertencia des-etiquetando hilo: " + eLabel.message);
    }
  });

  return {
    exito: true,
    telemetrias_procesadas: registrosTelemetriaTotal.length,
    telefonos_inyectados: totalActualizados,
    mensaje: "Se procesaron " + registrosTelemetriaTotal.length + " telemetrías y se actualizaron " + totalActualizados + " teléfonos.",
    logs: executionLogs
  };
}

/**
 * 🚀 FUNCIÓN GLOBAL UNIFICADA (v70.0 PROD - BOTÓN ÚNICO)
 */
function ejecutarProcesamientoUnificadoQRO() {
  const executionLogs = [];
  function log(msg) {
    const time = new Date().toLocaleTimeString("es-MX");
    executionLogs.push("[" + time + "] " + msg);
  }

  log("⚙️ [v81.2 PROD] Iniciando Procesamiento Unificado QRO...");
  
  let resultadoBatch;
  try {
    resultadoBatch = procesarBatchQRO();
    if (resultadoBatch.logs) {
      resultadoBatch.logs.forEach(l => executionLogs.push(l));
    }
  } catch (e) {
    log("❌ Error crítico en procesamiento de Batch: " + e.message);
    resultadoBatch = { exito: false, mensaje: e.message };
  }

  let resultadoQueries;
  try {
    resultadoQueries = procesarQueriesQRO();
    if (resultadoQueries.logs) {
      resultadoQueries.logs.forEach(l => executionLogs.push(l));
    }
  } catch (e) {
    log("❌ Error crítico en procesamiento de Queries: " + e.message);
    resultadoQueries = { exito: false, mensaje: e.message };
  }

  // 🛡️ REGLA DE NEGOCIO INQUEBRANTABLE v81.2 PROD: RESPETO ABSOLUTO A LA CUSTODIA FÍSICA
  // 1. Las piezas nuevas inyectadas desde el Excel Batch nacen y permanecen en "SIN_CARGAR".
  // 2. Si un Pochteca/Painani ya escaneó un bulto físicamente en rampa como "A_BORDO", ese estatus es SAGRADO.
  // 3. La rutina de higiene NUNCA regresa "A_BORDO" a "SIN_CARGAR"; únicamente corrige anomalías residuales fuera de catálogo.
  try {
    const baseApp = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    const hojaPiezas = baseApp.getSheetByName("PIEZAS_PID");
    if (hojaPiezas && hojaPiezas.getLastRow() > 1) {
      const datosP = hojaPiezas.getDataRange().getValues();
      const cabP = datosP[0].map(h => String(h).trim().toLowerCase());
      const colVIdx = cabP.indexOf("escaneo_validacion") !== -1 ? cabP.indexOf("escaneo_validacion") : cabP.indexOf("validacion");
      const colEIdx = cabP.indexOf("estatus_pid") !== -1 ? cabP.indexOf("estatus_pid") : cabP.indexOf("estatus");
      let sanitizados = 0;
      for (let p = 1; p < datosP.length; p++) {
        let cambiado = false;
        if (colVIdx !== -1) {
          const vActual = String(datosP[p][colVIdx]).trim();
          // Si ya es A_BORDO, SIN_CARGAR, BYPASS_TLACHIXQUI o RECHAZADO: RESPETAR INTACTO
          if (vActual === "A_BORDO_CONFIRMADO") {
            datosP[p][colVIdx] = "A_BORDO";
            cambiado = true;
          } else if (vActual === "FALTANTE_DHL_NO_INGRESADO" || vActual === "") {
            datosP[p][colVIdx] = "SIN_CARGAR";
            cambiado = true;
          }
        }
        if (colEIdx !== -1) {
          const eActual = String(datosP[p][colEIdx]).trim();
          if (eActual === "FALTANTE_DHL") {
            datosP[p][colEIdx] = "PRE_ASIGNADO";
            cambiado = true;
          }
        }
        if (cambiado) sanitizados++;
      }
      if (sanitizados > 0) {
        hojaPiezas.getRange(1, 1, datosP.length, datosP[0].length).setValues(datosP);
        log("🧹 [v81.2 PROD] Higiene de Rampa: " + sanitizados + " anomalías normalizadas. Escaneos 'A_BORDO' existentes respetados.");
      }
    }
  } catch (eSan) {
    log("⚠️ Advertencia en higiene de rampa: " + eSan.message);
  }

  const exitoGlobal = resultadoBatch.exito || resultadoQueries.exito;
  let mensajeGlobal = "";
  if (resultadoBatch.exito && resultadoQueries.exito) {
    mensajeGlobal = "Éxito total: " + resultadoBatch.mensaje + " e " + resultadoQueries.mensaje;
  } else if (resultadoBatch.exito) {
    mensajeGlobal = "Éxito parcial de Batch: " + resultadoBatch.mensaje + " | Queries: " + (resultadoQueries.mensaje || "Sin cambios");
  } else if (resultadoQueries.exito) {
    mensajeGlobal = "Éxito parcial de Queries: " + resultadoQueries.mensaje + " | Batch: " + (resultadoBatch.mensaje || "Sin cambios");
  } else {
    mensajeGlobal = "No se procesaron registros nuevos (" + (resultadoBatch.mensaje || "Batch sin cambios") + " / " + (resultadoQueries.mensaje || "Queries sin cambios") + ")";
  }

  mensajeGlobal += " | 🔒 Rampa v81.2: Piezas blindadas en 'SIN_CARGAR' a la espera de escaneo físico.";

  log("🏁 [v81.2 PROD] Ejecución unificada de rampa finalizada con éxito.");

  return {
    exito: exitoGlobal,
    mensaje: mensajeGlobal,
    logs: executionLogs
  };
}

/**
 * 🛡️ CONCILIACIÓN DE BLINDAJE: CRUCE PAINANI (RAMPA FÍSICA) VS. BATCH DIGITAL DHL
 * Compara los bultos bipiados físicamente en el andén contra lo que DHL prealertó en el Excel.
 * Identifica:
 * 1. Faltantes de DHL (Prealertados en Excel pero NO recibidos físicamente -> ¡Blindaje contra cobro de pérdida!).
 * 2. Excedentes físicos (En andén pero no en Excel).
 * 3. Bultos confirmados y asignación de EDD físico real.
 */
function conciliarRampaConBatchQRO() {
  const executionLogs = [];
  function log(msg) {
    const time = new Date().toLocaleTimeString("es-MX");
    executionLogs.push("[" + time + "] " + msg);
  }

  log("🛡️ Iniciando Conciliación de Blindaje: Rampa Painani vs. Batch Digital...");

  try {
    const boveda = SpreadsheetApp.openById(ID_BOVEDA_BATCH_MAESTRO);
    const hojaRampa = boveda.getSheetByName("RECEPCION_RAMPA");

    if (!hojaRampa || hojaRampa.getLastRow() <= 1) {
      log("ℹ️ No hay escaneos físicos registrados en 'RECEPCION_RAMPA' para conciliar.");
      return { exito: true, mensaje: "Sin escaneos de rampa pendientes de conciliar.", logs: executionLogs };
    }

    const datosRampa = hojaRampa.getDataRange().getValues();
    const cabRampa = datosRampa[0].map(h => String(h).trim().toLowerCase());
    const colCodigo = cabRampa.indexOf("codigo_original");
    const colPidSanitizado = cabRampa.indexOf("pid_sanitizado_boveda");
    const colEddFis = cabRampa.indexOf("edd_fisico");

    // Mapear escaneos físicos de rampa
    const setFisicos = new Set();
    const dictEddFisico = {};
    for (let r = 1; r < datosRampa.length; r++) {
      const codOrig = colCodigo !== -1 ? String(datosRampa[r][colCodigo]).trim().toUpperCase() : "";
      const codSan = colPidSanitizado !== -1 ? String(datosRampa[r][colPidSanitizado]).trim().toUpperCase() : "";
      const edd = colEddFis !== -1 ? String(datosRampa[r][colEddFis]).trim() : "";

      if (codOrig && !codOrig.includes("---")) {
        setFisicos.add(codOrig);
        if (edd) dictEddFisico[codOrig] = edd;
      }
      if (codSan && !codSan.includes("---")) {
        setFisicos.add(codSan);
        if (edd) dictEddFisico[codSan] = edd;
      }
    }

    log("📦 Bultos físicos en memoria de rampa: " + setFisicos.size + " códigos registrados.");

    // Conectar a la base de App (PIEZAS_PID)
    const baseApp = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    const hojaPiezas = baseApp.getSheetByName("PIEZAS_PID");

    let confirmadosFisicos = 0;
    let faltantesDhlBlindados = 0;

    if (hojaPiezas && hojaPiezas.getLastRow() > 1) {
      const datosPiezas = hojaPiezas.getDataRange().getValues();
      const cabPiezas = datosPiezas[0].map(h => String(h).trim().toLowerCase());
      
      const colPidIdx = cabPiezas.indexOf("pid_codigo") !== -1 ? cabPiezas.indexOf("pid_codigo") : cabPiezas.indexOf("pid");
      const colValIdx = cabPiezas.indexOf("escaneo_validacion") !== -1 ? cabPiezas.indexOf("escaneo_validacion") : cabPiezas.indexOf("validacion");
      const colEstPidIdx = cabPiezas.indexOf("estatus_pid") !== -1 ? cabPiezas.indexOf("estatus_pid") : cabPiezas.indexOf("estatus");

      if (colPidIdx !== -1 && colValIdx !== -1) {
        let huboCambios = false;
        for (let p = 1; p < datosPiezas.length; p++) {
          const pidFila = String(datosPiezas[p][colPidIdx]).trim().toUpperCase();
          const pidSan = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(pidFila) : pidFila;

          const estuvoEnRampa = setFisicos.has(pidFila) || setFisicos.has(pidSan);

          if (estuvoEnRampa) {
            // Rampa: A_BORDO (Catálogo CAT_CHECKPOINTS)
            if (datosPiezas[p][colValIdx] !== "A_BORDO") {
              datosPiezas[p][colValIdx] = "A_BORDO";
              huboCambios = true;
            }
            // Ruta: Restaurar a PRE_ASIGNADO si se había inyectado OK o FALTANTE_DHL indebidamente
            if (colEstPidIdx !== -1) {
              const estPidActual = String(datosPiezas[p][colEstPidIdx]).trim();
              if (estPidActual === "FALTANTE_DHL") {
                datosPiezas[p][colEstPidIdx] = "PRE_ASIGNADO";
                huboCambios = true;
              }
            }
            confirmadosFisicos++;
          } else {
            // Si viene en Batch pero NO fue bipiado en rampa:
            // Rampa: Mantener en SIN_CARGAR (Catálogo CAT_CHECKPOINTS)
            const estActual = String(datosPiezas[p][colValIdx]).trim();
            if (estActual === "A_BORDO_CONFIRMADO") {
              datosPiezas[p][colValIdx] = "A_BORDO";
              huboCambios = true;
            } else if (estActual === "FALTANTE_DHL_NO_INGRESADO" || estActual === "" || (estActual !== "A_BORDO" && estActual !== "BYPASS_TLACHIXQUI" && estActual !== "RECHAZADO")) {
              if (datosPiezas[p][colValIdx] !== "SIN_CARGAR") {
                datosPiezas[p][colValIdx] = "SIN_CARGAR";
                huboCambios = true;
              }
            }
            // Ruta: Se mantiene como PRE_ASIGNADO (prohibido degradar OK)
            if (colEstPidIdx !== -1) {
              const estPidActual = String(datosPiezas[p][colEstPidIdx]).trim();
              if (estPidActual === "FALTANTE_DHL") {
                datosPiezas[p][colEstPidIdx] = "PRE_ASIGNADO";
                huboCambios = true;
              }
            }
            faltantesDhlBlindados++;
          }
        }

        if (huboCambios) {
          hojaPiezas.getRange(1, 1, datosPiezas.length, datosPiezas[0].length).setValues(datosPiezas);
          log("🧹 Normalización de CAT_CHECKPOINTS aplicada con éxito a PIEZAS_PID.");
        }
      }
    }

    log("✅ Blindaje de Rampa ejecutado: " + confirmadosFisicos + " confirmados físicamente en patio | 🚨 " + faltantesDhlBlindados + " Faltantes de DHL blindados contra cobro.");

    return {
      exito: true,
      confirmados: confirmadosFisicos,
      faltantes: faltantesDhlBlindados,
      mensaje: "Conciliación Rampa: " + confirmadosFisicos + " confirmados físicamente, " + faltantesDhlBlindados + " faltantes DHL blindados.",
      logs: executionLogs
    };
  } catch (err) {
    log("⚠️ Error en conciliación de rampa: " + err.message);
    return { exito: false, error: err.message, logs: executionLogs };
  }
}

/**
 * Obtiene un objeto GmailLabel buscando por coincidencia de nombre exacto o ruta anidada.
 */
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

/**
 * Descodifica cadenas codificadas en Quoted-Printable (Limpieza de caracteres de escape QP de red)
 */
function decodeQuotedPrintable(str) {
  if (!str) return "";
  // Unificar saltos de línea suaves de transferencia de red (DHL cortes de línea con '=')
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  str = str.replace(/=\n/g, "");
  // Reemplazar códigos de escape hexadecimales QP (=3D, =20, =09, etc.)
  return str.replace(/=([0-9A-F]{2})/gi, function(match, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

/**
 * Desencriptador maestro de transferencias MIME (Base64 y Quoted-Printable)
 */
function desencriptarQueryText(htmlBody, plainTextBody) {
  let textoBody = (plainTextBody || htmlBody || "").toString();
  
  // Detectar e interpretar si el texto completo viaja encriptado en Base64 puro
  if (/^[A-Za-z0-9+/=\s\r\n]{40,}$/.test(textoBody.trim().replace(/[\r\n\s]/g, ""))) {
    try {
      const decodedBytes = Utilities.base64Decode(textoBody.trim());
      textoBody = Utilities.newBlob(decodedBytes).getDataAsString("UTF-8");
    } catch(e) {
      // Si falla, conservar texto original para procesamiento fallback
    }
  }
  
  // Siempre procesar descodificación Quoted-Printable de forma preventiva
  textoBody = decodeQuotedPrintable(textoBody);
  
  return textoBody;
}

/**
 * Elimina las etiquetas HTML de un texto de manera robusta,
 * conservando los saltos de línea para el parser estructurado.
 */
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ");
}

/**
 * 🏛️ INGESTA EXPANDIDA DE QUERY (v84.0 PROD - CANON SUPREMO & OPENCODE ZDR)
 * Extrae la telemetría completa de DHL para auditoría interna y enriquecimiento:
 * a) Teléfono Sanitizado (10 dígitos, destruyendo 'HIDDEN').
 * b) Timestamp del Evento 'AR' (Arrival at Service Center) en nodo 'QRO-QRO'.
 * c) Nombre del Consignatario ('Receiver Name' / 'Ctc Nm').
 * d) Dirección Completa de Entrega ('Rcvr Addr 1, 2, 3' y 'Rcvr Postcode').
 * e) Datos del Remitente y Peso Real ('RW').
 * f) PID Sanitizado bajo la Ley Doble J (JJD -> JD).
 */
function extraerTelemetriaExpandidaQuery(htmlBody, plainTextBody) {
  var cuerpoDecodificado = desencriptarQueryText(htmlBody, plainTextBody);
  var textoLimpio = cuerpoDecodificado;
  if (!plainTextBody && htmlBody) {
    textoLimpio = stripHtml(cuerpoDecodificado);
  }
  textoLimpio = textoLimpio.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  var mapaContactos = {};
  var listaTelemetria = [];
  
  var bloques = textoLimpio.split(/(?:A\s*W\s*B\s*:|H\s*W\s*B\s*:|W\s*a\s*y\s*b\s*i\s*l\s*l\s*:|G\s*u\s*í\s*a\s*:|G\s*u\s*i\s*a\s*:|\bAWB\b|\bHWB\b)/i);
  if (bloques.length <= 1) {
    return { contactos: mapaContactos, telemetria: listaTelemetria };
  }
  
  bloques.shift(); // Quitar encabezado previo al primer AWB
  
  bloques.forEach(function(bloque) {
    var guiaMatch = bloque.match(/^[^0-9]*(\d{10})/);
    if (!guiaMatch) return;
    var guia = normalizarAwb_QRO(guiaMatch[1]);
    
    // Parseo columnar horizontal Shipper / Receiver
    var shpr = {}, rcvr = {};
    var lineas = bloque.split("\n");
    
    lineas.forEach(function(linea) {
      var nameMatch = linea.match(/^Name\s*:\s*(.*?)(?:\s{2,}Name\s*:\s*(.*))?$/i);
      if (nameMatch) {
        shpr.name = (nameMatch[1] || "").trim();
        rcvr.name = (nameMatch[2] || "").trim();
      }
      var ctcMatch = linea.match(/^Ctc Nm\s*:\s*(.*?)(?:\s{2,}Ctc Nm\s*:\s*(.*))?$/i);
      if (ctcMatch) {
        shpr.ctc = (ctcMatch[1] || "").trim();
        rcvr.ctc = (ctcMatch[2] || "").trim();
      }
      var addr1Match = linea.match(/^Addr 1\s*:\s*(.*?)(?:\s{2,}Addr 1\s*:\s*(.*))?$/i);
      if (addr1Match) {
        shpr.addr1 = (addr1Match[1] || "").trim();
        rcvr.addr1 = (addr1Match[2] || "").trim();
      }
      var addr2Match = linea.match(/^Addr 2\s*:\s*(.*?)(?:\s{2,}Addr 2\s*:\s*(.*))?$/i);
      if (addr2Match) {
        shpr.addr2 = (addr2Match[1] || "").trim();
        rcvr.addr2 = (addr2Match[2] || "").trim();
      }
      var cityMatch = linea.match(/^City\s*:\s*(.*?)(?:\s{2,}City\s*:\s*(.*))?$/i);
      if (cityMatch) {
        shpr.city = (cityMatch[1] || "").trim();
        rcvr.city = (cityMatch[2] || "").trim();
      }
      var stateMatch = linea.match(/^State\s*:\s*(.*?)(?:\s{2,}State\s*:\s*(.*))?$/i);
      if (stateMatch) {
        shpr.state = (stateMatch[1] || "").trim();
        rcvr.state = (stateMatch[2] || "").trim();
      }
      var zipMatch = linea.match(/^Zip\s*:\s*(.*?)(?:\s{2,}Zip\s*:\s*(.*))?$/i);
      if (zipMatch) {
        shpr.zip = (zipMatch[1] || "").trim();
        rcvr.zip = (zipMatch[2] || "").trim();
      }
      var phoneMatch = linea.match(/^Phone\s*:\s*(.*?)(?:\s{2,}Phone\s*:\s*(.*))?$/i);
      if (phoneMatch) {
        shpr.phone = (phoneMatch[1] || "").trim();
        rcvr.phone = (phoneMatch[2] || "").trim();
      }
    });
    
    // a) Sanitizar Teléfono de Destinatario (10 dígitos, cero HIDDEN)
    var telSanitizado = "";
    if (rcvr.phone && rcvr.phone.toUpperCase() !== "NOT SUPPLIED" && rcvr.phone.toUpperCase() !== "HIDDEN") {
      telSanitizado = limpiarYValidarTelefono_QRO(rcvr.phone);
    }
    if (!telSanitizado) {
      // Regex fallback
      var regexTel = /(?:P\s*h\s*o\s*n\s*e|T\s*e\s*l|C\s*o\s*n\s*t\s*a\s*c\s*t|M\s*o\s*b\s*i\s*l)[^0-9\+]*([\+\d][\d\s\-]{6,})/gi;
      var matchTel;
      var listaTels = [];
      while ((matchTel = regexTel.exec(bloque)) !== null) {
        var tCandidate = matchTel[1].trim().split(/\s{2,}/)[0];
        if (tCandidate.toUpperCase() !== "NOT SUPPLIED" && tCandidate.toUpperCase() !== "HIDDEN") {
          var cleanT = limpiarYValidarTelefono_QRO(tCandidate);
          if (cleanT && cleanT !== guia) listaTels.push(cleanT);
        }
      }
      if (listaTels.length >= 2) {
        telSanitizado = listaTels[1];
      } else if (listaTels.length === 1) {
        telSanitizado = listaTels[0];
      }
    }
    
    // b) Timestamp del Evento 'AR' (Arrival at Service Center) en nodo 'QRO-QRO'
    var arDtm = "", arNodo = "";
    var arMatch = bloque.match(/(?:QRO-QRO[^\n]*?\bAR\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})|\bAR\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})[^\n]*?QRO)/i);
    if (arMatch) {
      arDtm = arMatch[1] || arMatch[2];
      arNodo = "QRO-QRO";
    }
    
    // Evento 'FD' (Salida a ruta) para cálculo de retención interna
    var fdDtm = "";
    var fdMatch = bloque.match(/\bFD\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/i);
    if (fdMatch) fdDtm = fdMatch[1];
    
    var horasRetencion = "";
    if (arDtm && fdDtm) {
      try {
        var dAR = new Date(arDtm.replace(" ", "T"));
        var dFD = new Date(fdDtm.replace(" ", "T"));
        var diffMs = dFD.getTime() - dAR.getTime();
        if (!isNaN(diffMs) && diffMs >= 0) {
          horasRetencion = (diffMs / (1000 * 3600)).toFixed(2);
        }
      } catch(_) {}
    }
    
    // e) Datos del Remitente y Peso Real ('RW')
    var rwKilos = "", rwDims = "";
    var rwMatch = bloque.match(/\bRW\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})[^\n]*?<([\d\.]+)>(?:[^\n]*?<([^>]+)>)?/i);
    if (rwMatch) {
      rwKilos = rwMatch[2] || "";
      rwDims = rwMatch[3] || "";
    }
    
    var declaredKilos = "";
    var kilosMatch = bloque.match(/\b(\d+\.\d{2})\b[^\n]*?Description of Goods/i);
    if (kilosMatch) declaredKilos = kilosMatch[1];
    
    // f) PID Sanitizado con Ley Doble J
    var pidMatch = bloque.match(/\b(JJD\d{10,20}|JD\d{10,20})\b/i);
    var pidClean = pidMatch ? sanitizarPIDParaBoveda(pidMatch[1]) : "";
    
    if (telSanitizado && !mapaContactos[guia]) {
      mapaContactos[guia] = telSanitizado;
    }
    
    listaTelemetria.push({
      guia: guia,
      pid: pidClean,
      telefono: telSanitizado,
      receiver_name: rcvr.name || "",
      receiver_ctc: rcvr.ctc || "",
      rcvr_addr1: rcvr.addr1 || "",
      rcvr_addr2: rcvr.addr2 || "",
      rcvr_city: rcvr.city || "",
      rcvr_state: rcvr.state || "",
      rcvr_postcode: rcvr.zip || "",
      shipper_name: shpr.name || "",
      shipper_phone: shpr.phone || "",
      shipper_city_state: (shpr.city || "") + (shpr.state ? ", " + shpr.state : ""),
      peso_declarado: declaredKilos,
      peso_real_rw: rwKilos,
      dimensiones_rw: rwDims,
      timestamp_ar: arDtm,
      nodo_ar: arNodo,
      timestamp_fd: fdDtm,
      horas_retencion_ar_fd: horasRetencion
    });
  });
  
  return { contactos: mapaContactos, telemetria: listaTelemetria };
}

function extraerContactosDeQuery(htmlBody, plainTextBody) {
  var res = extraerTelemetriaExpandidaQuery(htmlBody, plainTextBody);
  return res.contactos;
}

/**
 * Formateador estricto de fechas EDD al formato d/M/yyyy (ej: 22/9/2026)
 */
function formatearFechaEDD(val) {
  if (!val) return "";
  if (val instanceof Date && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT-6", "d/M/yyyy");
  }
  const str = String(val).trim();
  if (!str || str === "N/A") return "";

  // Si viene como Date string largo de JS (ej: "Tue Sep 22 2026 00:59:00...")
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime()) && str.length > 10) {
    return Utilities.formatDate(parsedDate, Session.getScriptTimeZone() || "GMT-6", "d/M/yyyy");
  }

  // Si viene en formato ISO YYYY-MM-DD
  const matchIso = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchIso) {
    return parseInt(matchIso[3], 10) + "/" + parseInt(matchIso[2], 10) + "/" + matchIso[1];
  }

  // Si viene en formato DD/MM/YYYY
  const matchLat = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchLat) {
    return parseInt(matchLat[1], 10) + "/" + parseInt(matchLat[2], 10) + "/" + matchLat[3];
  }

  return str;
}

/**
 * Sanitizador de teléfonos para Querétaro (Asegura longitud de 10 dígitos)
 */
function limpiarYValidarTelefono_QRO(tel) {
  if (!tel) return null;
  var clean = tel.toString().replace(/[^0-9]/g, "");
  if (clean.length === 12 && clean.indexOf("52") === 0) {
    clean = clean.substring(2);
  }
  if (clean.length > 10) {
    clean = clean.substring(0, 10);
  }
  return (clean.length === 10) ? clean : null;
}

function sanitizarTelefonoReal(val) {
  if (val === undefined || val === null || String(val).trim() === "") return "HIDDEN";
  
  // Si viene como número float/raw de Google Sheets
  if (typeof val === 'number') {
    val = val.toFixed(0); // Evita exponentes y mantiene los dígitos exactos
  }
  
  let str = String(val).trim();
  // Procesamiento String puro como solicitó Tlayacanqui
  let limpio = str.replace(/\D/g, '');
  
  // Validar que tenga entre 10 y 13 dígitos
  if (limpio.length >= 10 && limpio.length <= 13) {
    return limpio;
  }
  
  // Si no cumple longitud, devolver la cadena cruda original
  return str || "HIDDEN";
}

function normalizarAwb_QRO(awb) {
  if (!awb) return "";
  return awb.toString().replace(/\D/g, "");
}

function formatearPidUnaJ(pid) {
  if (!pid) return "";
  var str = pid.toString().trim().replace(/[\s-]/g, "");
  if (/^J/i.test(str)) {
    return "J" + str.substring(1).toUpperCase();
  }
  return "J" + str.toUpperCase();
}

function formatearPidDobleJ(pid) {
  if (!pid) return "";
  var str = pid.toString().trim().replace(/[\s-]/g, "");
  if (/^JJD/i.test(str)) return str.toUpperCase();
  if (/^JD/i.test(str)) {
    return "J" + str.toUpperCase();
  }
  return "JJD" + str.toUpperCase();
}

function encontrarFilaHeaderYIndices(valores) {
  for (let r = 0; r < Math.min(valores.length, 10); r++) {
    const indices = obtenerIndicesColumnas(valores[r]);
    if (indices["hwb no"] !== undefined) {
      return { filaHeader: r, indices: indices };
    }
  }
  return null;
}

function obtenerIndicesColumnas(filaCabecera) {
  const indices = {};
  for (let i = 0; i < filaCabecera.length; i++) {
    const cabeceraStr = String(filaCabecera[i]).toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    if (!cabeceraStr) continue;
    if (cabeceraStr.indexOf("hwb") !== -1 || cabeceraStr.indexOf("waybill") !== -1 || cabeceraStr.indexOf("guia") !== -1 || cabeceraStr.indexOf("airbill") !== -1) {
      indices["hwb no"] = i;
    } else if (cabeceraStr.indexOf("piece id") !== -1 || cabeceraStr === "pid" || cabeceraStr === "pieceid" || cabeceraStr.indexOf("piece id ship id") !== -1 || cabeceraStr === "piece_id") {
      indices["piece id"] = i;
    } else if (cabeceraStr.indexOf("piece no") !== -1 || cabeceraStr.indexOf("pieces") !== -1 || cabeceraStr.indexOf("bultos") !== -1 || cabeceraStr.indexOf("piezas") !== -1 || cabeceraStr.indexOf("piece count") !== -1) {
      indices["piece no"] = i;
    } else if (cabeceraStr.indexOf("receiver name") !== -1 || cabeceraStr.indexOf("consignee name") !== -1 || cabeceraStr.indexOf("destinatario") !== -1 || cabeceraStr.indexOf("nombre recibe") !== -1 || cabeceraStr.indexOf("receiver contact name") !== -1) {
      indices["receiver name"] = i;
    } else if (cabeceraStr.indexOf("rcvr addr 1") !== -1 || cabeceraStr.indexOf("receiver address 1") !== -1 || cabeceraStr.indexOf("address 1") !== -1 || cabeceraStr.indexOf("rcvr addr1") !== -1 || cabeceraStr.indexOf("rcvr_addr_1") !== -1 || cabeceraStr.indexOf("direccion 1") !== -1) {
      indices["rcvr addr 1"] = i;
    } else if (cabeceraStr.indexOf("rcvr addr 2") !== -1 || cabeceraStr.indexOf("receiver address 2") !== -1 || cabeceraStr.indexOf("address 2") !== -1 || cabeceraStr.indexOf("rcvr addr2") !== -1 || cabeceraStr.indexOf("rcvr_addr_2") !== -1 || cabeceraStr.indexOf("direccion 2") !== -1) {
      indices["rcvr addr 2"] = i;
    } else if (cabeceraStr.indexOf("rcvr addr 3") !== -1 || cabeceraStr.indexOf("receiver address 3") !== -1 || cabeceraStr.indexOf("address 3") !== -1 || cabeceraStr.indexOf("rcvr addr3") !== -1 || cabeceraStr.indexOf("rcvr_addr_3") !== -1 || cabeceraStr.indexOf("direccion 3") !== -1) {
      indices["rcvr addr 3"] = i;
    } else if (cabeceraStr.indexOf("postcode") !== -1 || cabeceraStr.indexOf("postal code") !== -1 || cabeceraStr === "cp" || cabeceraStr === "c p" || cabeceraStr.indexOf("post code") !== -1) {
      indices["rcvr postcode"] = i;
    } else if (cabeceraStr.indexOf("rcvr tel") !== -1 || cabeceraStr.indexOf("receiver tel") !== -1 || cabeceraStr.indexOf("recipient tel") !== -1 || cabeceraStr.indexOf("recipient phone") !== -1 || cabeceraStr === "phone" || cabeceraStr === "tel" || cabeceraStr === "telefono" || cabeceraStr === "teléfono") {
      indices["rcvr tel"] = i;
    } else if (cabeceraStr.indexOf("edd") !== -1 || cabeceraStr.indexOf("delivery date") !== -1 || cabeceraStr.indexOf("fecha estimada") !== -1 || cabeceraStr.indexOf("fecha de entrega") !== -1 || cabeceraStr === "edd") {
      indices["edd"] = i;
    } else if (cabeceraStr.indexOf("desc") !== -1 || cabeceraStr.indexOf("det") !== -1 || cabeceraStr.indexOf("merc") !== -1) {
      indices["description"] = i;
    } else if (cabeceraStr.indexOf("orig ctry") !== -1 || cabeceraStr.indexOf("origin country") !== -1 || cabeceraStr.indexOf("pais origen") !== -1 || cabeceraStr === "orig_ctry" || cabeceraStr === "origin_country") {
      indices["orig ctry"] = i;
    } else if (cabeceraStr.indexOf("dest ctry") !== -1 || cabeceraStr.indexOf("destination country") !== -1 || cabeceraStr.indexOf("pais destino") !== -1 || cabeceraStr === "dest_ctry" || cabeceraStr === "destination_country") {
      indices["dest ctry"] = i;
    } else if (cabeceraStr.indexOf("prod") !== -1 || cabeceraStr.indexOf("product") !== -1 || cabeceraStr === "product_code" || cabeceraStr === "product code" || cabeceraStr === "producto") {
      indices["product"] = i;
    }
  }
  return indices;
}

/**
 * 3️⃣ SECCIÓN COMÚN: AUTO-ASIGNACIÓN DE POCHTECA POR CP
 */
function autoAsignarPochtecaPorCP(cp) {
  if (!cp) return "sin_asignar@arauto.express";
  try {
    const boveda = SpreadsheetApp.openById(ID_BOVEDA_BATCH_MAESTRO);
    const hojaMatriz = boveda.getSheetByName("MATRIZ_CP");
    if (!hojaMatriz) return "sin_asignar@arauto.express";
    const datos = hojaMatriz.getDataRange().getValues();
    for (let i = 1; i < datos.length; i++) {
      if (String(datos[i][0]).trim() === cp.toString().trim()) {
        const chofer = String(datos[i][1]).trim();
        return chofer || "sin_asignar@arauto.express";
      }
    }
  } catch(e) {
    Logger.log("Error en lectura de Matriz CP: " + e.message);
  }
  return "sin_asignar@arauto.express";
}

/**
 * 4️⃣ SECCIÓN COMÚN: CATÁLOGO DE POCHTECAS MÓVIL
 */
function obtenerChoferesQRO() {
  try {
    const baseApp = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    const hojaChoferes = baseApp.getSheetByName("CAT_USUARIOS");
    if (hojaChoferes) {
      const datos = hojaChoferes.getDataRange().getValues();
      const lista = [];
      for (let i = 1; i < datos.length; i++) {
        const correo = datos[i][0];
        const nombre = datos[i][1];
        const rol = datos[i][2];
        if (correo && nombre && String(rol).toUpperCase() === "POCHTECA") {
          lista.push({ nombre: nombre.trim(), correo: correo.trim() });
        }
      }
      if (lista.length > 0) return lista;
    }
  } catch(e) {
    Logger.log("Error al obtener choferes: " + e.message);
  }
  return [];
}

/**
 * 5️⃣ SECCIÓN COMÚN: MONITOR CALLE EN VIVO (Últimos 150 Registros de Validación)
 * Esta función es la que alimenta la consola web unificada en caliente.
 */
function obtenerEntregasActivasQRO() {
  try {
    const libroLocal = SpreadsheetApp.getActiveSpreadsheet();
    const hojaValidacion = libroLocal.getSheets()[0]; // Índice 0: Validación
    
    // A. Leemos VALIDACIÓN_QRO_2025 (las que ya han sido visitadas o cargadas físicamente)
    let datosVal = [];
    if (hojaValidacion && hojaValidacion.getLastRow() > 1) {
      const vLast = hojaValidacion.getLastRow();
      const vStart = Math.max(2, vLast - 299); // Leemos las últimas 300 para mayor visibilidad en pruebas
      const vTotal = vLast - vStart + 1;
      datosVal = hojaValidacion.getRange(vStart, 1, vTotal, 25).getValues();
    }
    
    // B. Leemos BD_APP_RUTA_2025 - GUIAS_ASIGNADAS (las preasignaciones de rampa del día en AppSheet)
    let datosApp = [];
    let mapGuiaPIDs = {};
    try {
      const baseApp = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
      const hojaApp = baseApp.getSheetByName("GUIAS_ASIGNADAS");
      if (hojaApp && hojaApp.getLastRow() > 1) {
        const aLast = hojaApp.getLastRow();
        const aStart = Math.max(2, aLast - 299);
        const aTotal = aLast - aStart + 1;
        datosApp = hojaApp.getRange(aStart, 1, aTotal, 8).getValues(); // 8 columnas
      }
      
      const hojaPiezas = baseApp.getSheetByName("PIEZAS_PID");
      if (hojaPiezas && hojaPiezas.getLastRow() > 1) {
        const pLast = hojaPiezas.getLastRow();
        const pStart = Math.max(2, pLast - 499); // Leemos las últimas 500 piezas para asociar PIDs preasignados
        const pTotal = pLast - pStart + 1;
        const datosPiezas = hojaPiezas.getRange(pStart, 1, pTotal, 2).getValues(); // Columnas A (Guia) y B (PID)
        datosPiezas.forEach(function(pRow) {
          const g = String(pRow[0]).trim();
          const p = String(pRow[1]).trim();
          if (g && p) {
            if (!mapGuiaPIDs[g]) {
              mapGuiaPIDs[g] = [];
            }
            mapGuiaPIDs[g].push(p);
          }
        });
      }
    } catch(errApp) {
      Logger.log("Error al leer preasignaciones/PIDs de App: " + errApp.message);
    }
    
    const mapUnificado = {};
    
    // C. Registrar preasignaciones de AppSheet como base del mapa
    datosApp.forEach(function(row) {
      const guia = String(row[0]).trim(); // Col A: Guía
      let destinatario = String(row[1]).trim(); // Col B: Destinatario
      const direccion = String(row[2]).trim(); // Col C: DireccionCompleta (que incluye C.P. concatenado en v61+)
      const edd = String(row[3]).trim(); // Col D: EDD
      const operador = String(row[4]).trim(); // Col E: Chofer
      const piezas = String(row[5]).trim(); // Col F: Total_Piezas
      const telefono = String(row[6]).trim(); // Col G: Teléfono
      const checkpoint = String(row[7]).trim(); // Col H: Estatus_Guia (Checkpoint "PENDIENTE")
      
      // Extraer C.P. de la dirección de forma robusta
      const cpMatch = direccion.match(/\(C\.P\.\s*(\d{5})\)/) || direccion.match(/\b\d{5}\b/);
      const cp = cpMatch ? cpMatch[1] : "S/CP";
      
      // Detectar si es internacional mediante el tag [INTER]
      let isInter = false;
      if (destinatario.indexOf("[INTER]") !== -1) {
        isInter = true;
        destinatario = destinatario.replace(" [INTER]", "").trim(); // Limpiar el nombre para que se vea limpio
      }
      
      // Obtenemos los PIDs asociados si existen en la hoja PIEZAS_PID de AppSheet
      const pidsAsociados = mapGuiaPIDs[guia] || [];
      const pidStr = pidsAsociados.length > 0 ? pidsAsociados.join(", ") : "";
      
      if (guia && guia !== "" && guia !== "Guia") {
        mapUnificado[guia] = {
          guia: guia,
          pid: pidStr, // Inyectamos la cadena unificada de PIDs reales asociados
          cp: cp,
          piezas: piezas || "1",
          destinatario: destinatario,
          checkpoint: checkpoint || "PRE_ASIGNADO",
          comentarios: "",
          fecha_asignacion: edd, // Usamos EDD o dejamos vacío
          fecha_en_ruta: "", // Se queda vacío en rampa hasta que sea validada físicamente
          imagen_fachada: "",
          operador: operador || "sin_asignar@arauto.express",
          inter: isInter ? "Inter" : "", // ¡Aquí se guarda el estatus de internacional!
          telefono: telefono || "", // ¡Mapeado seguro de teléfono de contacto!
          firma: "",
          timestamp: "",
          origen: "PREASIGNADO"
        };
      }
    });
    
    // D. Fusionar y sobreescribir con las guías procesadas en Validación real (calle/campo)
    datosVal.forEach(function(row) {
      const guia = String(row[0]).trim(); // Col A
      const pid = String(row[1]).trim();  // Col B
      const cp = String(row[2]).trim();   // Col C
      const piezas = String(row[3]).trim(); // Col D
      const destinatario = String(row[7]).trim(); // Col H
      const checkpoint = String(row[9]).trim();   // Col J
      const comentarios = String(row[10]).trim(); // Col K
      const fecha_asignacion = String(row[11]).trim(); // Col L
      const fecha_en_ruta = String(row[12]).trim(); // Col M
      const imagen_fachada = convertirRutaAppSheet(String(row[13]).trim()); // Col N
      const operador = String(row[14]).trim();    // Col O
      const firma = convertirRutaAppSheet(String(row[19]).trim()); // Col T
      const fotoIne = convertirRutaAppSheet(String(row[20]).trim()); // Col U 
      const audioEvidencia = convertirRutaAppSheet(String(row[21]).trim()); // Col V
      const propuestoIA = String(row[22]).trim(); // Col W
      const inter = ""; // Disabled to use Col T for Firma
      const timestamp = String(row[24]).trim();   // Col Y
      
      let isInterVal = (inter && (inter.toUpperCase() === "I" || inter.toUpperCase().indexOf("INTER") !== -1));

      if (guia && guia !== "" && guia !== "Guia") {
        mapUnificado[guia] = {
          guia: guia,
          pid: pid || (mapUnificado[guia] ? mapUnificado[guia].pid : ""),
          cp: cp,
          piezas: piezas,
          destinatario: destinatario,
          checkpoint: checkpoint || "PRE_ASIGNADO",
          comentarios: comentarios,
          fecha_asignacion: fecha_asignacion || (mapUnificado[guia] ? mapUnificado[guia].fecha_asignacion : ""),
          fecha_en_ruta: fecha_en_ruta, // Fecha en ruta rellenada significa VALIDADA FÍSICAMENTE
          imagen_fachada: imagen_fachada,
          fotoIne: fotoIne,
          audioEvidencia: audioEvidencia,
          propuestoIA: propuestoIA,
          operador: operador || (mapUnificado[guia] ? mapUnificado[guia].operador : "sin_asignar@arauto.express"),
          inter: "",
          telefono: (typeof telefonoVal !== 'undefined' ? telefonoVal : "") || (mapUnificado[guia] ? mapUnificado[guia].telefono : ""), 
          firma: firma,
          timestamp: timestamp,
          origen: mapUnificado[guia] ? "AMBOS" : "VALIDACION"
        };
      }
    });
    
    // E. Convertir el mapa unificado en la lista final de retorno
    const lista = [];
    for (let k in mapUnificado) {
      lista.push(mapUnificado[k]);
    }
    return lista;
  } catch(e) {
    Logger.log("Error en obtenerEntregasActivasQRO: " + e.message);
    return [];
  }
}

function obtenerPickupsActivosQRO() {
  try {
    const libroLocal = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPU = libroLocal.getSheetByName("RECOLECCIONES_VALIDACION");
    if (!hojaPU) return [];
    const ultimaFila = hojaPU.getLastRow();
    if (ultimaFila < 2) return [];
    const filaInicio = Math.max(2, ultimaFila - 49);
    const totalFilas = ultimaFila - filaInicio + 1;
    const datos = hojaPU.getRange(filaInicio, 1, totalFilas, 18).getValues();
    const lista = [];
    for (let i = datos.length - 1; i >= 0; i--) {
      const fila = datos[i];
      if (fila && String(fila[0]).trim() !== "") {
        lista.push({
          id_pu: String(fila[0]),
          id_booking: String(fila[1]),
          remitente: String(fila[2]),
          direccion: String(fila[3]),
          cp: String(fila[4]),
          chofer: String(fila[5]),
          estatus: String(fila[6]),
          hora_llegada: String(fila[14])
        });
      }
    }
    return lista;
  } catch(e) {
    Logger.log("Error en obtenerPickups: " + e.message);
  }
  return [];
}

/**
 * 6️⃣ INTERFAZ WEB AUXILIAR: BUSCAR RECIENTES PROCESADOS EN GMAIL (Soporte Dual)
 */
function buscarCorreosBatchQRO() {
  try {
    const lista = [];
    const processedThreadIds = {};
    
    // Usamos GmailApp.search para evadir el caché del objeto de etiqueta y obtener resultados 100% en tiempo real
    const threads = GmailApp.search("label:02_REPORTE_QRO OR label:01_QUERY_QRO", 0, 15);
    threads.forEach(function(t) {
      const lastMsg = t.getMessages().pop();
      const tId = t.getId();
      if (!processedThreadIds[tId]) {
        processedThreadIds[tId] = true;
        const labels = t.getLabels().map(function(l) { return l.getName(); });
        
        let tipo = "REPORTE";
        let tieneEtiquetaActiva = false;
        labels.forEach(function(l) {
          const uLabel = l.toUpperCase();
          if (uLabel.indexOf("01_QUERY_QRO") !== -1) {
            tipo = "QUERY";
            tieneEtiquetaActiva = true;
          }
          if (uLabel.indexOf("02_REPORTE_QRO") !== -1) {
            tipo = "REPORTE";
            tieneEtiquetaActiva = true;
          }
        });

        // Solo agregar si la etiqueta sigue físicamente activa en el correo para evitar correos procesados huérfanos
        if (tieneEtiquetaActiva) {
          lista.push({
            subject: lastMsg.getSubject(),
            sender: lastMsg.getFrom().split("<")[0].replace(/"/g, "").trim(),
            date: lastMsg.getDate().toLocaleDateString("es-MX"),
            isUnread: t.isUnread(),
            tipo: tipo,
            id: lastMsg.getId()
          });
        }
      }
    });
    
    return lista.slice(0, 15);
  } catch(e) {
    Logger.log("Error en buscarCorreosBatchQRO: " + e.message);
    return [];
  }
}

/**
 * 7️⃣ RECEPCIÓN IA: DESPACHAR BOOKINGS EXTRAÍDOS HACIA CAMPO (Inyección Dual Atómica)
 */
function ejecutarDespachoBookingACampo(payloadJson) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) throw new Error("No se pudo obtener el bloqueo de red. Intenta de nuevo.");
    
    const datos = JSON.parse(payloadJson);
    const idBookingLimpio = String(datos.id_booking).trim();
    const idPU = "PU-" + Math.random().toString(36).substr(2, 8).toUpperCase();
    const fechaHoy = new Date();
    const horaServidor = fechaHoy.toLocaleTimeString();
    
    const libroLocal = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPU = libroLocal.getSheetByName("RECOLECCIONES_VALIDACION");
    if (!hojaPU) throw new Error("No se encontró la hoja 'RECOLECCIONES_VALIDACION'.");
    
    hojaPU.appendRow([
      idPU,
      idBookingLimpio,
      datos.remitente,
      datos.direccion,
      datos.cp,
      datos.chofer,
      "SIN_CARGAR",
      datos.piezas_estimadas,
      0, "", "", "", "", "",
      horaServidor,
      false, "",
      fechaHoy
    ]);
    
    const libroApp = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    const hojaAppPU = libroApp.getSheetByName("RECOLECCIONES_ASIGNADAS");
    if (!hojaAppPU) throw new Error("No se encontró la pestaña 'RECOLECCIONES_ASIGNADAS' en la base de la App.");
    
    hojaAppPU.appendRow([
      idPU,
      idBookingLimpio,
      datos.remitente,
      datos.direccion,
      datos.cp,
      "08:00",
      "17:00",
      datos.chofer,
      "PRE_ASIGNADO",
      datos.piezas_estimadas,
      "", "", "", "", "", ""
    ]);
    
    // Registrar evento en LOG_TRAZABILIDAD
    registrarTrazabilidadQRO("DESPACHO RECOLECCION", idBookingLimpio, datos.piezas_estimadas, datos.chofer, "PRE_ASIGNADO");
    
    return { exito: true, id_pu: idPU };
  } catch(err) {
    return { exito: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Forzar actualización de permisos y variables de rampa unificada
 */
function forzarPermisosBasicos() {
  const ssName = SpreadsheetApp.getActiveSpreadsheet().getName();
  Logger.log("Iniciando permisos unificados para: " + ssName);
}


/**
 * 8️⃣ AUDITORÍA DE OPERACIONES: REGISTRAR EN LOG_TRAZABILIDAD (BOVEDA_BATCH_MAESTRO)
 * Inyecta una fila de auditoría inmutable cada vez que ocurre un evento clave en el sistema.
 */
function registrarTrazabilidadQRO(accion, guia, piezas, chofer, estatus) {
  try {
    const boveda = SpreadsheetApp.openById(ID_BOVEDA_BATCH_MAESTRO);
    const hojaLog = boveda.getSheetByName("LOG_TRAZABILIDAD");
    if (!hojaLog) {
      Logger.log("No se encontró la pestaña 'LOG_TRAZABILIDAD' en BOVEDA_BATCH_MAESTRO.");
      return;
    }
    
    const fechaHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-6", "dd/MM/yyyy HH:mm:ss");
    const usuario = Session.getActiveUser().getEmail() || EMAIL_ADMIN_IRVIN;
    
    hojaLog.appendRow([
      fechaHora,     // Col A: Fecha y Hora
      usuario,       // Col B: Usuario operador
      accion,        // Col C: Acción ejecutada
      guia || "",    // Col D: Guía HWB
      piezas || 0,   // Col E: Cantidad de piezas/PIDs
      chofer || "",  // Col F: Chofer asignado
      estatus || ""  // Col G: Estatus operativo
    ]);
    Logger.log("✅ Registro de trazabilidad añadido: " + accion);
  } catch(e) {
    Logger.log("⚠️ Error de trazabilidad: " + e.message);
  }
}

/**
 * Convierte rutas relativas de AppSheet o File IDs de Drive a URLs sirvientes
 */
function _convertirRutaAppSheet_old(ruta) {
  if (!ruta) return "";
  if (ruta.match(/^https?:\/\//)) return ruta;
  var fileIdMatch = ruta.match(/([a-zA-Z0-9_-]{33})/);
  if (fileIdMatch) {
    return "https://drive.google.com/uc?id=" + fileIdMatch[1];
  }
  return ruta;
}

function inyectarCatalogo_V8014() {
  var id = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
  var hoja = SpreadsheetApp.openById(id).getSheetByName("CAT_CHECKPOINTS");
  if (!hoja) {
    Logger.log("No se encontro CAT_CHECKPOINTS");
    return "Error: No CAT_CHECKPOINTS";
  }
  
  hoja.insertRowAfter(1);
  hoja.getRange(2, 1, 1, 6).setValues([[
    "PRE_ASIGNADO",
    "RUTA",
    "Registrado en sistema, pendiente de escaneo físico en rampa",
    "PRE_0",
    0,
    true
  ]]);
  return "Exito!";
}

