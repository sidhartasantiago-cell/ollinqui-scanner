function generarMesaAsignacion() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaRawShipment = ss.getSheetByName("RAW_SHIPMENT");
  var hojaMatrizCP = ss.getSheetByName("MATRIZ_CP");
  var hojaMesa = ss.getSheetByName("MESA_ASIGNACION");
 
  if (!hojaRawShipment || !hojaMatrizCP || !hojaMesa) {
    throw new Error("❌ Error: Faltan pestañas 'RAW_SHIPMENT', 'MATRIZ_CP' o 'MESA_ASIGNACION' en la Bóveda.");
  }
 
  var rawValores = hojaRawShipment.getDataRange().getValues();
  if (rawValores.length < 2) {
    throw new Error("⚠️ No hay datos crudos para procesar en RAW_SHIPMENT.");
  }
 
  var datosCP = hojaMatrizCP.getDataRange().getValues();
  var mapaCP = {};
  for (var c = 1; c < datosCP.length; c++) {
    if (datosCP[c][0]) {
      var cpKey = datosCP[c][0].toString().trim();
      mapaCP[cpKey] = {
        chofer: datosCP[c][1] ? datosCP[c][1].toString().trim() : "SIN ASIGNAR",
        tipo: datosCP[c][2] ? datosCP[c][2].toString().trim() : "Foraneo"
      };
    }
  }
 
  var columnIndexes = getColumnIndexesFromHeaders_(rawValores[0], [
    "hwb no", "piece no", "rcvr postcode", "rcvr addr 1", "rcvr addr 2",
    "rcvr addr 3", "rcvr tel", "receiver name", "edd"
  ]);
  var hwbIdx = columnIndexes["hwb no"];
  var piecesIdx = columnIndexes["piece no"];
  var cpIdx = columnIndexes["rcvr postcode"];
  var addr1Idx = columnIndexes["rcvr addr 1"];
  var addr2Idx = columnIndexes["rcvr addr 2"];
  var addr3Idx = columnIndexes["rcvr addr 3"];
  var telIdx = columnIndexes["rcvr tel"];
  var nameIdx = columnIndexes["receiver name"];
  var eddIdx = columnIndexes["edd"];
 
  if (hwbIdx === -1) {
    throw new Error("❌ Error: No se localizó la columna de Guías (hwb no) en RAW_SHIPMENT.");
  }
 
  var mapaMesaTemp = {};
  for (var r = 1; r < rawValores.length; r++) {
    var row = rawValores[r];
    var hwb = row[hwbIdx] ? row[hwbIdx].toString().replace(/\D/g, "").trim() : "";
    if (!hwb) continue;
   
    var piezas = piecesIdx === -1 ? 1 : parseInt(row[piecesIdx]) || 1;
    var cp = cpIdx !== -1 && row[cpIdx] ? row[cpIdx].toString().trim() : "S/N";
    var addr1 = addr1Idx === -1 ? "" : row[addr1Idx] || "";
    var addr2 = addr2Idx === -1 ? "" : row[addr2Idx] || "";
    var addr3 = addr3Idx === -1 ? "" : row[addr3Idx] || "";
    var dirFull = [addr1, addr2, addr3].filter(Boolean).join(" ").replace(/[\r\n]+/g, " ").trim();
    var tel = telIdx !== -1 && row[telIdx] ? row[telIdx].toString().replace(/[^0-9\+]/g, "").trim() : "S/N";
    var name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].toString().trim().toUpperCase() : "CLIENTE";
    var eddVal = eddIdx === -1 ? "" : row[eddIdx] || "";
    var eddFormatted = formatearFechaSimple(eddVal);
   
    if (mapaMesaTemp[hwb]) {
      mapaMesaTemp[hwb].piezas += piezas;
      if (mapaMesaTemp[hwb].cp === "S/N") mapaMesaTemp[hwb].cp = cp;
      if (mapaMesaTemp[hwb].dir === "") mapaMesaTemp[hwb].dir = dirFull;
      if (mapaMesaTemp[hwb].tel === "S/N" || mapaMesaTemp[hwb].tel === "") mapaMesaTemp[hwb].tel = tel;
      if (mapaMesaTemp[hwb].name === "CLIENTE" || mapaMesaTemp[hwb].name === "") mapaMesaTemp[hwb].name = name;
    } else {
      mapaMesaTemp[hwb] = {
        piezas: piezas,
        cp: cp,
        dir: dirFull,
        tel: tel,
        name: name,
        edd: eddFormatted
      };
    }
  }
 
  var filasParaMesa = [];
  for (var hwbKey in mapaMesaTemp) {
    var item = mapaMesaTemp[hwbKey];
    var cpInfo = mapaCP[item.cp] || { chofer: "SIN ASIGNAR", tipo: "Foraneo" };
    filasParaMesa.push([
      hwbKey,
      item.piezas,
      item.cp,
      item.dir,
      item.tel,
      cpInfo.chofer,
      item.edd,
      item.name
    ]);
  }
 
  if (filasParaMesa.length > 0) {
    var lastRowMesa = hojaMesa.getLastRow();
    if (lastRowMesa > 1) {
      hojaMesa.getRange(2, 1, lastRowMesa - 1, hojaMesa.getLastColumn()).clearContent();
    }
   
    if (hojaMesa.getMaxRows() < filasParaMesa.length + 5) {
      hojaMesa.insertRowsAfter(hojaMesa.getMaxRows(), (filasParaMesa.length + 5) - hojaMesa.getMaxRows());
    }
   
    hojaMesa.getRange(2, 1, filasParaMesa.length, 8).setValues(filasParaMesa);
    hojaMesa.getRange(2, 1, filasParaMesa.length, 1).setNumberFormat("@");
    hojaMesa.getRange(2, 7, filasParaMesa.length, 1).setNumberFormat("yyyy-mm-dd");
  }
}

// ==========================================
// 🚀 FUNCIÓN 2: ENVIAR A CELULARES (INYECCIÓN DUAL CON PIDs Y TRASPASO DIRECTO)
// ==========================================

function enviarCelularesYCentral() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaMesa = ss.getSheetByName("MESA_ASIGNACION");
  if (!hojaMesa || hojaMesa.getLastRow() < 2) {
    throw new Error("❌ Error: No hay datos para enviar en MESA_ASIGNACION.");
  }
 
  var datosMesa = hojaMesa.getRange(2, 1, hojaMesa.getLastRow() - 1, 8).getValues();
 
  // --- Cargar en Memoria Direcciones Segmentadas e Internacionales ---
  var hojaRawShipment = ss.getSheetByName("RAW_SHIPMENT");
  var mapaDetallesRaw = {};
  if (hojaRawShipment) {
    try {
      var valoresRaw = hojaRawShipment.getDataRange().getValues();
      var rawIndexes = getColumnIndexesFromHeaders_(valoresRaw[0], [
        "hwb no", "rcvr addr 1", "rcvr addr 2", "rcvr addr 3", "orig ctry"
      ]);
      var hwbIdxRaw = rawIndexes["hwb no"];
      var addr1Idx = rawIndexes["rcvr addr 1"];
      var addr2Idx = rawIndexes["rcvr addr 2"];
      var addr3Idx = rawIndexes["rcvr addr 3"];
      var origCtryIdx = rawIndexes["orig ctry"];
     
      if (hwbIdxRaw !== -1) {
        for (var r = 1; r < valoresRaw.length; r++) {
          var rawHwb = valoresRaw[r][hwbIdxRaw] ? valoresRaw[r][hwbIdxRaw].toString().replace(/\D/g, "").trim() : "";
          if (rawHwb) {
            var addr1 = addr1Idx !== -1 ? (valoresRaw[r][addr1Idx] || "") : "";
            var addr2 = addr2Idx !== -1 ? (valoresRaw[r][addr2Idx] || "") : "";
            var addr3 = addr3Idx !== -1 ? (valoresRaw[r][addr3Idx] || "") : "";
            var origCtry = origCtryIdx !== -1 ? (valoresRaw[r][origCtryIdx] || "").toString().trim().toUpperCase() : "MX";
            mapaDetallesRaw[rawHwb] = {
              addr1: addr1,
              addr2: addr2,
              addr3: addr3,
              inter: (origCtry !== "MX" && origCtry !== "") ? "Inter" : ""
            };
          }
        }
      }
    } catch(e) { Logger.log("⚠️ Error mapeando RAW_SHIPMENT: " + e.message); }
  }
 
  // --- Cargar en Memoria el Mapeo de PIDs desde RAW_PIECE ---
  var hojaRawPiece = ss.getSheetByName("RAW_PIECE");
  var mapaPidsCompleto = {};
  if (hojaRawPiece) {
    try {
      var valoresPiece = hojaRawPiece.getDataRange().getValues();
      var pieceIndexes = getColumnIndexesFromHeaders_(valoresPiece[0], [
        "hwb no", "piece id", "description"
      ]);
      var hwbIdxPiece = pieceIndexes["hwb no"];
      var pidIdxPiece = pieceIndexes["piece id"];
      var descIdxPiece = pieceIndexes["description"];
      if (hwbIdxPiece !== -1 && pidIdxPiece !== -1) {
        for (var r = 1; r < valoresPiece.length; r++) {
          var rawHwb = valoresPiece[r][hwbIdxPiece] ? valoresPiece[r][hwbIdxPiece].toString().replace(/\D/g, "").trim() : "";
          var rawPid = valoresPiece[r][pidIdxPiece] ? limpiarYFormatearPid(valoresPiece[r][pidIdxPiece]) : "";
          var rawDesc = descIdxPiece !== -1 ? (valoresPiece[r][descIdxPiece] || "Mapeado al vuelo") : "Mapeado al vuelo";
          if (rawHwb && rawPid) {
            if (!mapaPidsCompleto[rawHwb]) mapaPidsCompleto[rawHwb] = [];
            mapaPidsCompleto[rawHwb].push({
              pid: rawPid,
              pidCampo: formatearPIDParaCampo(rawPid),
              desc: rawDesc
            });
          }
        }
      }
    } catch(e) { Logger.log("⚠️ Error mapeando RAW_PIECE: " + e.message); }
  }

  // --- Cargar Matriz de CPs en memoria ---
  var hojaMatrizCP = ss.getSheetByName("MATRIZ_CP");
  var mapaCP = {};
  if (hojaMatrizCP) {
    try {
      var datosCP = hojaMatrizCP.getDataRange().getValues();
      for (var c = 1; c < datosCP.length; c++) {
        if (datosCP[c][0]) {
          var cpKey = datosCP[c][0].toString().trim();
          mapaCP[cpKey] = datosCP[c][2] ? datosCP[c][2].toString().trim() : "Foraneo";
        }
      }
    } catch(e) { Logger.log("⚠️ Error mapeando MATRIZ_CP: " + e.message); }
  }
 
  // --- PILAR 1: Conexión a AppSheet (BD_APP_RUTA_2025) ---
  var ssApp = null;
  var hojaAppGuias = null;
  var hojaAppPids = null;
  try {
    ssApp = SpreadsheetApp.openById(SHEET_ID_RUTA_APP_QRO);
    hojaAppGuias = ssApp.getSheetByName("GUIAS_ASIGNADAS");
    hojaAppPids = ssApp.getSheetByName("PIEZAS_PID");
  } catch(e) {
    Logger.log("⚠️ No se pudo acceder a BD_APP_RUTA_2025: " + e.message);
  }
 
  // --- PILAR 2: Conexión a RUTA Central (BD CENTRAL 2023) ---
  var ssCentral = null;
  var hojaRutaCentral = null;
  try {
    ssCentral = SpreadsheetApp.openById(SHEET_ID_BD_CENTRAL);
    hojaRutaCentral = ssCentral.getSheetByName("RUTA");
  } catch(e) {
    Logger.log("⚠️ No se pudo acceder a BD CENTRAL: " + e.message);
  }
 
  if (!hojaAppGuias && !hojaRutaCentral) {
    throw new Error("❌ Error crítico: No se pudo abrir ninguna de las dos bases de datos remotas.");
  }
 
  // Cargar existentes de AppSheet
  var mapaExistentesApp = {};
  if (hojaAppGuias) {
    var valoresAApp = hojaAppGuias.getRange("A:A").getValues();
    for (var i = 0; i < valoresAApp.length; i++) {
      if (valoresAApp[i][0]) mapaExistentesApp[valoresAApp[i][0].toString().trim()] = true;
    }
  }
 
  var mapaExistentesPidsApp = {};
  if (hojaAppPids) {
    var valoresPidsApp = hojaAppPids.getRange("A:A").getValues();
    for (var i = 0; i < valoresPidsApp.length; i++) {
      if (valoresPidsApp[i][0]) {
        mapaExistentesPidsApp[formatearPIDParaCampo(valoresPidsApp[i][0])] = true;
      }
    }
  }
 
  var mapaExistentesCentral = {};
  if (hojaRutaCentral) {
    var valoresACentral = hojaRutaCentral.getRange("A:A").getValues();
    for (var i = 0; i < valoresACentral.length; i++) {
      if (valoresACentral[i][0]) mapaExistentesCentral[valoresACentral[i][0].toString().trim()] = true;
    }
  }
 
  var nuevasGuiasApp = [];
  var nuevosPidsApp = [];
  var nuevasGuiasCentral = [];
  var fechaHoy = new Date();
 
  for (var k = 0; k < datosMesa.length; k++) {
    var row = datosMesa[k];
    var hwb = row[0].toString().trim();
    if (!hwb) continue;
   
    var piezas = parseInt(row[1]) || 1;
    var cp = row[2].toString().trim();
    var direccion = row[3].toString().trim();
    var telefono = row[4].toString().trim();
    var chofer = row[5].toString().trim();
    var eddRaw = row[6];
   
    var eddAppSheet = formatearFechaSimpleDDMMYYYY(eddRaw);
    var eddCentral = formatearFechaSimple(eddRaw);        
    var destinatario = row[7].toString().trim() || "CLIENTE";
   
    var r1 = "", r2 = "", r3 = "", interVal = "";
    if (mapaDetallesRaw[hwb]) {
      r1 = mapaDetallesRaw[hwb].addr1;
      r2 = mapaDetallesRaw[hwb].addr2;
      r3 = mapaDetallesRaw[hwb].addr3;
      interVal = mapaDetallesRaw[hwb].inter;
    } else {
      r1 = direccion;
    }
   
    var primerPid = "";
    if (mapaPidsCompleto[hwb] && mapaPidsCompleto[hwb].length > 0) {
      primerPid = mapaPidsCompleto[hwb][0].pid;
    }
   
    var tipoServicio = mapaCP[cp] || "Foraneo";
   
    // A. App de Pochtecas (AppSheet)
    if (hojaAppGuias && !mapaExistentesApp[hwb]) {
      nuevasGuiasApp.push([
        hwb,
        destinatario,
        direccion,
        eddAppSheet,
        chofer,
        piezas,
        telefono,
        "EN RUTA"
      ]);
    }
   
    // B. PIDs en AppSheet
    if (hojaAppPids && mapaPidsCompleto[hwb]) {
      var listaPids = mapaPidsCompleto[hwb];
      for (var pIdx = 0; pIdx < listaPids.length; pIdx++) {
        var pObj = listaPids[pIdx];
        if (!mapaExistentesPidsApp[pObj.pidCampo]) {
          nuevosPidsApp.push([
            pObj.pidCampo,
            hwb,            
            pObj.desc,      
            "PENDIENTE",    
            ""              
          ]);
          mapaExistentesPidsApp[pObj.pidCampo] = true;
        }
      }
    }
   
    // C. BD CENTRAL (Ruta Vieja)
    if (hojaRutaCentral && !mapaExistentesCentral[hwb]) {
      var keyUnica = Utilities.getUuid().substring(0, 8);
      nuevasGuiasCentral.push([
        hwb,            
        primerPid,      
        cp,              
        piezas,          
        r1,              
        r2,              
        r3,              
        destinatario,    
        "",              
        "Preasignado",  
        "Inyectado por Sistema",
        fechaHoy,        
        "",              
        "",              
        chofer,          
        eddCentral,      
        "",              
        keyUnica,        
        tipoServicio,    
        interVal,        
        telefono,        
        ""              
      ]);
    }
  }
 
  var msgResultado = "🎯 *Cierre de Envío Masivo OLLIN (v23)*:\n\n";
 
  if (nuevasGuiasApp.length > 0) {
    var targetRowApp = hojaAppGuias.getLastRow() + 1;
    if (hojaAppGuias.getMaxRows() < targetRowApp + nuevasGuiasApp.length + 5) {
      hojaAppGuias.insertRowsAfter(hojaAppGuias.getMaxRows(), (targetRowApp + nuevasGuiasApp.length + 5) - hojaAppGuias.getMaxRows());
    }
    hojaAppGuias.getRange(targetRowApp, 1, nuevasGuiasApp.length, 8).setValues(nuevasGuiasApp);
    hojaAppGuias.getRange(targetRowApp, 1, nuevasGuiasApp.length, 1).setNumberFormat("@");
    hojaAppGuias.getRange(targetRowApp, 4, nuevasGuiasApp.length, 1).setNumberFormat("dd-mm-yyyy");
    msgResultado += "📱 *AppSheet (Pochtecas)*: " + nuevasGuiasApp.length + " guías inyectadas.\n";
  } else {
    msgResultado += "📱 *AppSheet (Pochtecas)*: Sin guías nuevas.\n";
  }
 
  if (nuevosPidsApp.length > 0 && hojaAppPids) {
    var targetRowPidsApp = hojaAppPids.getLastRow() + 1;
    if (hojaAppPids.getMaxRows() < targetRowPidsApp + nuevosPidsApp.length + 5) {
      hojaAppPids.insertRowsAfter(hojaAppPids.getMaxRows(), (targetRowPidsApp + nuevosPidsApp.length + 5) - hojaAppPids.getMaxRows());
    }
    hojaAppPids.getRange(targetRowPidsApp, 1, nuevosPidsApp.length, 5).setValues(nuevosPidsApp);
    hojaAppPids.getRange(targetRowPidsApp, 1, nuevosPidsApp.length, 1).setNumberFormat("@");
    msgResultado += "🔫 *AppSheet (PIEZAS_PID)*: " + nuevosPidsApp.length + " bultos (PIDs) enraizados.\n";
  }
 
  if (nuevasGuiasCentral.length > 0) {
    var targetRowCentral = hojaRutaCentral.getLastRow() + 1;
    if (hojaRutaCentral.getMaxRows() < targetRowCentral + nuevasGuiasCentral.length + 5) {
      hojaRutaCentral.insertRowsAfter(hojaRutaCentral.getMaxRows(), (targetRowCentral + nuevasGuiasCentral.length + 5) - hojaRutaCentral.getMaxRows());
    }
    hojaRutaCentral.getRange(targetRowCentral, 1, nuevasGuiasCentral.length, 22).setValues(nuevasGuiasCentral);
    hojaRutaCentral.getRange(targetRowCentral, 1, nuevasGuiasCentral.length, 1).setNumberFormat("@");
    msgResultado += "🏛️ *BD Central (RUTA)*: " + nuevasGuiasCentral.length + " guías preasignadas.\n";
  }
 
  // Autolavado de MESA_ASIGNACION
  var lastRowMesa = hojaMesa.getLastRow();
  if (lastRowMesa > 1) {
    hojaMesa.getRange(2, 1, lastRowMesa - 1, hojaMesa.getLastColumn()).clearContent();
    msgResultado += "🧹 *MESA_ASIGNACION*: Autolavado completado con éxito.\n";
  }
 
  enviarAlertaGoogleChatBoveda(msgResultado);
}

function procesarColaBot() {
  var properties = PropertiesService.getScriptProperties();
  var accion = properties.getProperty("COLA_ACCION");
 
  if (!accion) {
    return;
  }
 
  if (accion === "procesando") {
    Logger.log("⏳ El bot ya se encuentra procesando una tarea. Esperando...");
    return;
  }
 
  try {
    if (accion === "generar_mesa") {
      properties.setProperty("COLA_ACCION", "procesando");
      generarMesaAsignacion();
     
      enviarAlertaGoogleChatBoveda("✅ *OLLIN Bot - Bóveda Central*\n¡Cruce de BATCH finalizado de forma exitosa! La *MESA_ASIGNACION* ya está lista en Sheets. Ejecuta `/enviar_celulares` en este chat para despachar.");
      properties.deleteProperty("COLA_ACCION");
     
    } else if (accion === "enviar_celulares") {
      properties.setProperty("COLA_ACCION", "procesando");
      enviarCelularesYCentral();
      properties.deleteProperty("COLA_ACCION");
    }
  } catch(e) {
    Logger.log("❌ Error procesando la cola: " + e.message);
    enviarAlertaGoogleChatBoveda("❌ *OLLIN Bot - Error en Cola*:\n" + e.message);
    properties.deleteProperty("COLA_ACCION");
  }
}

// ==========================================
// 🔔 6. ENVIAR ALERTAS POR WEBHOOK DE GOOGLE CHAT
// ==========================================

function enviarAlertaGoogleChatBoveda(texto) {
  var webhookUrl = PropertiesService.getScriptProperties()
    .getProperty(GOOGLE_CHAT_WEBHOOK_PROPERTY);
  if (!webhookUrl) {
    Logger.log("No se envió la alerta: falta la propiedad de Script GOOGLE_CHAT_WEBHOOK_V6.");
    return false;
  }
  var opciones = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify({"text": texto})
  };
  try {
    UrlFetchApp.fetch(webhookUrl, opciones);
    return true;
  } catch(e) {
    Logger.log("⚠️ Error al enviar alerta: " + e.message);
    return false;
  }
}

// ==========================================
// 🛠️ FUNCIÓN AUXILIAR DE ACCESO RÁPIDO (FORZAR PERMISOS NATIVOS)
// ==========================================

function forzarPermisosBasicos() {
  // Despierta los detectores de seguridad nativos para Gmail y Sheets (100% Libres de Google Cloud/GCP)
  var ssName = SpreadsheetApp.getActiveSpreadsheet().getName();
  var dummyFetch = UrlFetchApp.fetch("https://www.google.com");
  Logger.log("🔓 Permisos nativos de Gmail y Sheets autorizados con éxito para: " + ssName);
}
