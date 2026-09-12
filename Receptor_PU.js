/**
 * 🏛️ CEREBRO DE RECEPCIÓN ASÍNCRONA UNIFICADA QRO (OLLIN v77.0 PROD - PARCHE ANTI-HOYOS)
 * 🚀 Webhook de Entrada PID-Level con Auto-Lookup Dinámico y Generador de KEY Fallback
 * 📋 Canaliza Pickups (18 columnas) y Deliveries (25 columnas rígidas) en VALIDACIÓN_QRO_2025
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) {
      return ContentService.createTextOutput(JSON.stringify({ exito: false, error: "⚠️ Servidor ocupado." })).setMimeType(ContentService.MimeType.JSON);
    }
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ exito: false, error: "⚠️ Payload vacío." })).setMimeType(ContentService.MimeType.JSON);
    }
    var datos = JSON.parse(e.postData.contents);
    var libro = SpreadsheetApp.getActiveSpreadsheet();

    // ==========================================
    // CANAL D: RECEPCIÓN DE RAMPA (PAINANI - BLINDAJE LEGAL Y ACTA NOTARIAL)
    // ==========================================
    if (datos.tipo === "RECEPCION_RAMPA" || datos.accion === "registrar_rampa" || datos.canal === "RAMPA") {
      var idRecepcion = datos.id_recepcion || ("REC-" + Utilities.formatDate(new Date(), "America/Mexico_City", "yyyyMMdd") + "-01");
      var asistenteDhl = datos.asistente_dhl || "SIN ESPECIFICAR";
      var auditor = datos.auditor || "Irvin Reyes";
      var declaradasDhl = parseInt(datos.piezas_declaradas || datos.total_declaradas) || 0;
      var subtipo = datos.subtipo || "LOTE_BATCH";
      var fechaHoy = new Date();
      var horaServidor = Utilities.formatDate(fechaHoy, "America/Mexico_City", "dd/MM/yyyy HH:mm:ss");

      // Conectar a la Bóveda de Almacén (Amoxcalli) o BD Central como respaldo
      var ssTarget = null;
      try {
        ssTarget = SpreadsheetApp.openById("1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw"); // ID_BOVEDA_BATCH_MAESTRO
      } catch (eBov) {
        try {
          ssTarget = SpreadsheetApp.openById("1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8"); // ID_BD_CENTRAL_2023
        } catch (eCent) {
          ssTarget = libro;
        }
      }

      var hojaRampa = ssTarget.getSheetByName("RECEPCION_RAMPA");
      if (!hojaRampa) {
        hojaRampa = ssTarget.insertSheet("RECEPCION_RAMPA");
        var cabecerasRampa = [
          "ID_Recepcion",            // A
          "Timestamp_Escaneo",       // B
          "Codigo_Original",         // C
          "PID_Sanitizado_Boveda",   // D
          "Tipo_Codigo",             // E
          "EDD_Fisico",              // F
          "Auditor_Arauto",          // G
          "Asistente_DHL",           // H
          "Piezas_Declaradas_DHL",   // I
          "Conteo_Acumulado",        // J
          "Estatus_Conciliacion",    // K
          "Marca_Tiempo_Servidor"    // L
        ];
        hojaRampa.appendRow(cabecerasRampa);
        hojaRampa.getRange(1, 1, 1, cabecerasRampa.length).setFontWeight("bold").setBackground("#f2a900").setFontColor("#000000");
      }

      if (subtipo === "CIERRE_RECEPCION") {
        var totalRecibidas = parseInt(datos.total_recibidas) || 0;
        var diferencia = totalRecibidas - declaradasDhl;
        var estatusDictamen = diferencia < 0 ? ("FALTANTE_" + Math.abs(diferencia)) : (diferencia === 0 ? "EXACTO" : ("EXCEDENTE_" + diferencia));

        var filaCierre = [
          idRecepcion,
          horaServidor,
          "--- CIERRE DE CAMION ---",
          "--- CIERRE ---",
          "CIERRE",
          "---",
          auditor,
          asistenteDhl,
          declaradasDhl,
          totalRecibidas,
          "DICTAMEN: " + estatusDictamen,
          fechaHoy
        ];
        hojaRampa.appendRow(filaCierre);

        return ContentService.createTextOutput(JSON.stringify({
          exito: true,
          status: "OK",
          mensaje: "✅ Cierre de camión registrado exitosamente.",
          id_recepcion: idRecepcion,
          total_declaradas: declaradasDhl,
          total_recibidas: totalRecibidas,
          diferencia: diferencia
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Procesar escaneos (Individual o en Lote Batch)
      var listaEscaneos = [];
      if (datos.escaneos && Array.isArray(datos.escaneos)) {
        listaEscaneos = datos.escaneos;
      } else if (datos.codigo) {
        listaEscaneos.push({
          codigo: datos.codigo,
          tipo: datos.tipo_codigo || (String(datos.codigo).length === 10 ? "AWB" : "PID"),
          edd: datos.edd_fisico || "",
          timestamp: datos.timestamp || horaServidor
        });
      }

      if (listaEscaneos.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          exito: false,
          status: "EMPTY",
          mensaje: "⚠️ No se recibieron códigos para registrar en rampa."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var filasParaInsertar = [];
      var conteoBase = Math.max(0, hojaRampa.getLastRow() - 1); // Descontar cabecera

      for (var s = 0; s < listaEscaneos.length; s++) {
        var item = listaEscaneos[s];
        var codigoRaw = String(item.codigo || "").trim().toUpperCase();
        var codigoSanitizado = sanitizarPIDParaBoveda(codigoRaw);
        var tipoCod = item.tipo || (codigoRaw.length === 10 && /^\d+$/.test(codigoRaw) ? "AWB" : "PID");
        var eddFis = item.edd || datos.edd_predominante || "";
        var tsEscaneo = item.timestamp || horaServidor;

        filasParaInsertar.push([
          idRecepcion,
          tsEscaneo,
          codigoRaw,
          codigoSanitizado,
          tipoCod,
          eddFis,
          auditor,
          asistenteDhl,
          declaradasDhl,
          conteoBase + s + 1,
          "RECIBIDO_EN_RAMPA",
          fechaHoy
        ]);
      }

      // Inyección masiva ultra-eficiente en una sola operación de bloque
      var lastRowActual = hojaRampa.getLastRow();
      hojaRampa.getRange(lastRowActual + 1, 1, filasParaInsertar.length, filasParaInsertar[0].length).setValues(filasParaInsertar);

      return ContentService.createTextOutput(JSON.stringify({
        exito: true,
        status: "OK",
        mensaje: "✅ Registrados " + filasParaInsertar.length + " bultos en RECEPCION_RAMPA.",
        id_recepcion: idRecepcion,
        conteo_servidor: lastRowActual + filasParaInsertar.length - 1
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL C: NOTAS DE VOZ (TEOYOLOTL MIC - EVIDENCIA MULTIMODAL)
    // ==========================================
    if (datos.audio_base64 || datos.tipo === "AUDIO_TEOYOLOTL") {
      var idRegistro = datos.id_registro || datos.id || datos.guia || datos.pid || "";
      var base64Audio = datos.audio_base64 || "";
      var choferEmail = datos.chofer || "";

      if (!idRegistro || !base64Audio) {
        return ContentService.createTextOutput(JSON.stringify({ exito: false, status: "ERROR", message: "⚠️ id_registro y audio_base64 son obligatorios." }))
                             .setMimeType(ContentService.MimeType.JSON);
      }

      var audioBytes = Utilities.base64Decode(base64Audio);
      var safeId = idRegistro.toString().replace(/[^a-zA-Z0-9_-]/g, "_");
      var nombreArchivo = "Voz_" + safeId + "_" + Utilities.formatDate(new Date(), "America/Mexico_City", "yyyyMMdd_HHmmss") + ".webm";
      var audioBlob = Utilities.newBlob(audioBytes, "audio/webm", nombreArchivo);

      var carpetaAudio = obtenerOCrearCarpetaDrive_("GUIAS_ASIGNADAS_Files");
      var fileAudio = carpetaAudio.createFile(audioBlob);
      fileAudio.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileUrl = fileAudio.getUrl();
      var appSheetRelativePath = "GUIAS_ASIGNADAS_Files/" + fileAudio.getName();

      var actualizadoEnRuta = false;
      try {
        var idBdRuta = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
        var ssRuta = SpreadsheetApp.openById(idBdRuta);
        var hojaGuias = ssRuta.getSheetByName("GUIAS_ASIGNADAS");
        if (hojaGuias && hojaGuias.getLastRow() > 1) {
          var dataGuias = hojaGuias.getDataRange().getValues();
          var cabecerasGuias = dataGuias[0].map(function(h) { return String(h).trim().toLowerCase(); });
          
          var colKey = cabecerasGuias.indexOf("key_ruta");
          var colHwb = cabecerasGuias.indexOf("hwb_guia");
          var colAudio = cabecerasGuias.indexOf("audio_evidencia");
          
          if (colAudio !== -1) {
            for (var g = 1; g < dataGuias.length; g++) {
              var rowKey = colKey !== -1 ? String(dataGuias[g][colKey]).trim() : "";
              var rowHwb = colHwb !== -1 ? String(dataGuias[g][colHwb]).trim() : "";
              
              if (rowKey === String(idRegistro).trim() || rowHwb === String(idRegistro).trim()) {
                hojaGuias.getRange(g + 1, colAudio + 1).setValue(appSheetRelativePath);
                actualizadoEnRuta = true;
                break;
              }
            }
          }
        }
      } catch(errRuta) {
        Logger.log("⚠️ Error al asentar audio en GUIAS_ASIGNADAS: " + errRuta.message);
      }

      try {
        var hojaVal = libro.getSheetByName("VALIDACIÓN_QRO_2025") || libro.getSheets()[0];
        if (hojaVal && hojaVal.getLastRow() > 1) {
          var dataVal = hojaVal.getDataRange().getValues();
          var cabVal = dataVal[0].map(function(h) { return String(h).trim().toLowerCase(); });
          var colValGuia = cabVal.indexOf("guia");
          if (colValGuia === -1) colValGuia = cabVal.indexOf("guía");
          var colValPid = cabVal.indexOf("pid");
          var colValAudio = cabVal.indexOf("audio evidencia");
          if (colValAudio !== -1) {
            var idSanitizado = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(idRegistro) : String(idRegistro).trim();
            for (var v = 1; v < dataVal.length; v++) {
              var vGuia = colValGuia !== -1 ? String(dataVal[v][colValGuia]).trim() : "";
              var vPid = colValPid !== -1 ? String(dataVal[v][colValPid]).trim() : "";
              if (vGuia === String(idRegistro).trim() || vPid === idSanitizado) {
                hojaVal.getRange(v + 1, colValAudio + 1).setValue(appSheetRelativePath);
                break;
              }
            }
          }
        }
      } catch(errVal) {
        Logger.log("⚠️ Error al asentar audio en VALIDACIÓN_QRO_2025: " + errVal.message);
      }

      return ContentService.createTextOutput(JSON.stringify({
        exito: true,
        status: "OK",
        message: "✅ Audio grabado y vinculado exitosamente.",
        id_registro: idRegistro,
        archivo: appSheetRelativePath,
        url: fileUrl,
        actualizado_en_ruta: actualizadoEnRuta
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL A: RECOLECCIONES (PICKUPS - 18 COLUMNAS)
    // ==========================================
    if (datos.id_pu || datos.id_booking) {
      var hojaPU = libro.getSheetByName("RECOLECCIONES_VALIDACION");
      if (!hojaPU) throw new Error("No se encontró la pestaña 'RECOLECCIONES_VALIDACION'.");

      var idPU = datos.id_pu ? datos.id_pu.toString().trim() : "";
      var idBooking = datos.id_booking ? datos.id_booking.toString().trim() : "";
      var remitente = datos.remitente ? datos.remitente.toString().trim() : "";
      var direccion = datos.direccion ? datos.direccion.toString().trim() : "";
      var cp = datos.cp ? datos.cp.toString().trim() : "";
      var chofer = datos.chofer ? datos.chofer.toString().trim() : "";
      var estatus = datos.estatus ? datos.estatus.toString().trim() : "";
      var pzsEstimadas = datos.piezas_estimadas ? parseInt(datos.piezas_estimadas) || 0 : 0;
      var pzsReales = datos.piezas_reales ? parseInt(datos.piezas_reales) || 0 : 0;
      var firma = datos.firma ? datos.firma.toString().trim() : "";
      var evidencia = datos.evidencia ? datos.evidencia.toString().trim() : "";
      var motivo = datos.motivo ? datos.motivo.toString().trim() : "";
      var gps = datos.gps ? datos.gps.toString().trim() : "";
      var timestampPU = datos.timestamp ? datos.timestamp.toString().trim() : "";

      if (idPU === "") throw new Error("⚠️ ID_PU no especificado.");

      var fechaHoy = new Date();
      var horaServidor = Utilities.formatDate(fechaHoy, "America/Mexico_City", "dd/MM/yyyy HH:mm:ss");

      var filaPU = [
        idPU, idBooking, remitente, direccion, cp, chofer, estatus,
        pzsEstimadas, pzsReales, firma, evidencia, motivo, gps, timestampPU,
        horaServidor, false, "", fechaHoy
      ];

      var ultimaFilaPU = hojaPU.getLastRow();
      var filaEncontradaPU = -1;
      if (ultimaFilaPU > 1) {
        var rangoIDsPU = hojaPU.getRange(2, 1, ultimaFilaPU - 1, 1).getValues();
        for (var i = 0; i < rangoIDsPU.length; i++) {
          if (rangoIDsPU[i].toString().trim() === idPU) {
            filaEncontradaPU = i + 2;
            break;
          }
        }
      }

      var accionPU = "";
      if (filaEncontradaPU !== -1) {
        var aprobVal = hojaPU.getRange(filaEncontradaPU, 16).getValue();
        var motRech = hojaPU.getRange(filaEncontradaPU, 17).getValue();
        filaPU[15] = aprobVal;
        filaPU[16] = motRech;
        hojaPU.getRange(filaEncontradaPU, 1, 1, filaPU.length).setValues([filaPU]);
        accionPU = "SOBREESCRITA";
      } else {
        hojaPU.appendRow(filaPU);
        hojaPU.getRange(hojaPU.getLastRow(), 16).insertCheckboxes();
        accionPU = "INYECTADA";
      }
      return ContentService.createTextOutput(JSON.stringify({ exito: true, mensaje: "✅ PU " + idPU + " " + accionPU })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL B: ENTREGAS (DELIVERIES - PID-LEVEL 25 COLUMNAS RÍGIDAS)
    // ==========================================
    if (datos.pid || datos.guia) {
      var hojas = libro.getSheets();
      var hojaVal = hojas[0]; // Validación principal (Índice 0)
      var pid = datos.pid ? datos.pid.toString().trim() : "";
      var guia = datos.guia ? datos.guia.toString().trim() : "";

      if (!pid) throw new Error("⚠️ El parámetro PID es requerido para inyección individual.");

      // Variables Base con Fallbacks de Rampa
      var cp = datos.cp ? datos.cp.toString().trim() : "";
      var piezas = parseInt(datos.piezas) || 1;
      var addr1 = datos.direccion ? datos.direccion.toString().trim() : "";
      var addr2 = "";
      var addr3 = "";
      var idCorreo = "";
      var key = "";
      var tipoServicio = "Foraneo";
      var inter = "";
      var enBoveda = false;
      var fechaHoy = new Date();
      var horaServidor = Utilities.formatDate(fechaHoy, "America/Mexico_City", "dd/MM/yyyy HH:mm:ss");

      // 1. AUTO-LOOKUP DINÁMICO EN RAW_SHIPMENT (Bóveda Almacén) para traer datos teóricos
      try {
        var ssBoveda = SpreadsheetApp.openById("1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw");
        var sheetRaw = ssBoveda.getSheetByName("RAW_SHIPMENT");
        if (sheetRaw && sheetRaw.getLastRow() > 1) {
          var dataRaw = sheetRaw.getDataRange().getValues();
          var headersRaw = dataRaw[0].map(function(h) {
            return String(h).toLowerCase().trim().replace(/[\s_]+/g, " ");
          });
          var hwbCol = -1, addr1Col = -1, addr2Col = -1, addr3Col = -1;
          var cpCol = -1, idCorreoCol = -1, keyCol = -1, servCol = -1, origCtryCol = -1;

          for (var c = 0; c < headersRaw.length; c++) {
            var h = headersRaw[c];
            if (h.indexOf("hwb") !== -1 || h.indexOf("waybill") !== -1 || h.indexOf("guia") !== -1) hwbCol = c;
            else if (h.indexOf("rcvr addr 1") !== -1 || h.indexOf("receiver address 1") !== -1 || h === "address 1") addr1Col = c;
            else if (h.indexOf("rcvr addr 2") !== -1 || h.indexOf("receiver address 2") !== -1 || h === "address 2") addr2Col = c;
            else if (h.indexOf("rcvr addr 3") !== -1 || h.indexOf("receiver address 3") !== -1 || h === "address 3") addr3Col = c;
            else if (h.indexOf("postcode") !== -1 || h.indexOf("postal code") !== -1 || h === "cp") cpCol = c;
            else if (h.indexOf("id correo") !== -1 || h.indexOf("id_correo") !== -1 || h.indexOf("courier") !== -1 || h === "operador") idCorreoCol = c;
            else if (h === "key" || h === "key_unica") keyCol = c;
            else if (h.indexOf("service") !== -1 || h.indexOf("tipo de servicio") !== -1) servCol = c;
            else if (h.indexOf("orig ctry") !== -1 || h.indexOf("origin country") !== -1) origCtryCol = c;
          }

          for (var r = 1; r < dataRaw.length; r++) {
            var hwbRaw = hwbCol !== -1 && dataRaw[r][hwbCol] ? dataRaw[r][hwbCol].toString().replace(/\D/g, "").trim() : "";
            if (hwbRaw === guia) {
              if (addr1Col !== -1) addr1 = dataRaw[r][addr1Col] || "";
              if (addr2Col !== -1) addr2 = dataRaw[r][addr2Col] || "";
              if (addr3Col !== -1) addr3 = dataRaw[r][addr3Col] || "";
              if (cpCol !== -1 && dataRaw[r][cpCol]) cp = dataRaw[r][cpCol].toString().replace(/\D/g, "").trim();
              if (idCorreoCol !== -1) idCorreo = dataRaw[r][idCorreoCol] || "";
              var origCtry = origCtryCol !== -1 ? (dataRaw[r][origCtryCol] || "").toString().trim().toUpperCase() : "MX";
              inter = (origCtry !== "MX" && origCtry !== "") ? "Inter" : "";
              if (keyCol !== -1) key = dataRaw[r][keyCol] || "";
              if (servCol !== -1) tipoServicio = dataRaw[r][servCol] || "Foraneo";
              enBoveda = true;
              break;
            }
          }
        }
      } catch(errRaw) {
        Logger.log("⚠️ Fallback en RAW_SHIPMENT: " + errRaw.message);
      }

      // 🛡️ PARCHE ANTI-HOYOS: Si la guía fue creada manualmente y no existe en Bóveda, forzar valores consistentes
      if (!enBoveda) {
        var textToHash = guia + pid + horaServidor;
        var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, textToHash);
        var hexHash = "";
        for (var k = 0; k < Math.min(rawHash.length, 4); k++) {
          var byteValue = rawHash[k];
          if (byteValue < 0) byteValue += 256;
          var byteString = byteValue.toString(16);
          if (byteString.length == 1) byteString = "0" + byteString;
          hexHash += byteString;
        }
        key = "M-" + hexHash.toUpperCase();
        if (addr1 === "") addr1 = " $$REGISTRO MANUAL$$  " + (datos.direccion || "CONCILIAR DIRECCION");
        addr2 = " $$CONCILIAR BARRIO/COLONIA$$ ";
        addr3 = " $$MUNICIPIO QUERETARO$$ ";
        if (cp === "") cp = " $$SIN CP$$ ";
        idCorreo = " $$CARGA_MANUAL$$ ";
        tipoServicio = "Local";
        inter = "";
      }

      // 2. Extracción de Datos Dinámicos con Fallback a ENTREGA_MASIVA (Corte de Tubería)
      var destinatario = datos.receiver_name ? datos.receiver_name.toString().trim() : "";
      var gps = datos.gps ? datos.gps.toString().trim() : "";
      var checkpoint = datos.checkpoint ? datos.checkpoint.toString().trim() : "PENDIENTE";
      var comentarios = datos.quien_recibio ? (datos.quien_recibio.toString().trim() + (datos.comentarios ? " - " + datos.comentarios.toString().trim() : "")) : (datos.comentarios ? datos.comentarios.toString().trim() : "");
      var fechaAsignacion = datos.edd ? datos.edd.toString().trim() : "";
      var imagen = datos.foto_fachada ? datos.foto_fachada.toString().trim() : "";
      var telefono = datos.telefono ? datos.telefono.toString().trim() : "";
      var firma = datos.firma_evidencia ? datos.firma_evidencia.toString().trim() : (datos.firma ? datos.firma.toString().trim() : "");

      if (destinatario === "") destinatario = " $$CONCILIAR DESTINATARIO$$ ";

      // 🚀 PROTOCOLO DE RESCATE DE ENTREGA MASIVA (Evita Webhooks vacíos por red asíncrona)
      if (destinatario === " $$CONCILIAR DESTINATARIO$$ " || imagen === "" || gps === "") {
        try {
          var ssApp = SpreadsheetApp.openById("1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w");
          var sheetEscaneadas = ssApp.getSheetByName("PIEZAS_ESCANEADAS_MASIVAS");
          var sheetEntregaMasiva = ssApp.getSheetByName("ENTREGA_MASIVA");
          if (sheetEscaneadas && sheetEntregaMasiva && sheetEscaneadas.getLastRow() > 1) {
            var dataEscaneadas = sheetEscaneadas.getRange(2, 1, sheetEscaneadas.getLastRow() - 1, 4).getValues();
            var idMasivoEncontrado = "";
            for (var m = 0; m < dataEscaneadas.length; m++) {
              var pidEscaneado = dataEscaneadas[m][0].toString().trim();
              if (pidEscaneado === pid) {
                idMasivoEncontrado = dataEscaneadas[m][3].toString().trim(); // ID_Masivo (Columna D)
                break;
              }
            }
            if (idMasivoEncontrado !== "" && sheetEntregaMasiva.getLastRow() > 1) {
              var dataMasiva = sheetEntregaMasiva.getRange(2, 1, sheetEntregaMasiva.getLastRow() - 1, 9).getValues();
              for (var em = 0; em < dataMasiva.length; em++) {
                if (dataMasiva[em][0].toString().trim() === idMasivoEncontrado) {
                  if (destinatario === " $$CONCILIAR DESTINATARIO$$ " || destinatario === "") {
                    destinatario = dataMasiva[em][1] ? dataMasiva[em][1].toString().trim() : "";
                  }
                  if (firma === "") {
                    firma = dataMasiva[em][2] ? dataMasiva[em][2].toString().trim() : "";
                  }
                  if (imagen === "") {
                    imagen = dataMasiva[em][3] ? dataMasiva[em][3].toString().trim() : "";
                  }
                  if (gps === "") {
                    gps = dataMasiva[em][4] ? dataMasiva[em][4].toString().trim() : "";
                  }
                  if (comentarios === "") {
                    comentarios = dataMasiva[em][5] ? dataMasiva[em][5].toString().trim() : "";
                  }
                  break;
                }
              }
            }
          }
        } catch(errMasivo) {
          Logger.log("⚠️ Fallo en rescate masivo: " + errMasivo.message);
        }
      }

      // 🚨 --- NUEVA FILA v77.0 PROD (25 COLUMNAS MAESTRAS RIGIDAS) ---
      var nuevaFilaVal = [
        guia,             // A: Guia (Index 0)
        pid,              // B: PID (Index 1)
        cp,               // C: C.P. (Index 2)
        piezas,           // D: Piezas (Index 3)
        addr1,            // E: Rcvr Addr 1 (Index 4)
        addr2,            // F: Rcvr Addr 2 (Index 5)
        addr3,            // G: Rcvr Addr 3 (Index 6)
        destinatario,     // H: Receiver Name (Index 7)
        gps,              // I: GPS (Index 8)
        checkpoint,       // J: Checkpoint (Index 9)
        comentarios,      // K: Quien recibio o comentarios (Index 10)
        fechaAsignacion,  // L: Fecha asignacion (Index 11)
        horaServidor,     // M: Fecha en ruta (Timestamp de sincronía) (Index 12)
        imagen,           // N: Imagen fachada (Index 13)
        idCorreo,         // O: ID correo (Index 14)
        fechaAsignacion,  // P: EDD (Index 15)
        key,              // Q: KEY (Index 16) - ¡Antes era Col R, ahora es Col Q!
        tipoServicio,     // R: Tipo de servicio (Index 17) - ¡Antes Col S, ahora Col R!
        inter,            // S: Inter (Index 18) - ¡Antes Col T, ahora Col S!
        firma,            // T: Firma (Index 19) - ¡Antes omitida, ahora Col T Bautizada!
        telefono,         // U: Telefono (Index 20) - ¡Antes Col V, ahora recupera Col U!
        horaServidor,     // V: Hora de llegada a Validación (Index 21)
        false,            // W: Aprobación Auditor (Index 22) - Checkbox Col W
        "",               // X: Motivo de Rechazo (Index 23)
        fechaHoy          // Y: Marca de Tiempo (Index 24)
      ];

      var ultimaFilaVal = hojaVal.getLastRow();
      var filaEncontradaVal = -1;
      if (ultimaFilaVal > 1) {
        var rangoPIDsVal = hojaVal.getRange(2, 2, ultimaFilaVal - 1, 1).getValues(); // Validamos por PID ÚNICO (Columna B)
        for (var j = 0; j < rangoPIDsVal.length; j++) {
          if (rangoPIDsVal[j].toString().trim() === pid) {
            filaEncontradaVal = j + 2;
            break;
          }
        }
      }

      var accionVal = "";
      if (filaEncontradaVal !== -1) {
        var aprobValExistente = hojaVal.getRange(filaEncontradaVal, 23).getValue(); // Col W (Index 22)
        var rechazoValExistente = hojaVal.getRange(filaEncontradaVal, 24).getValue(); // Col X (Index 23)
        nuevaFilaVal[22] = aprobValExistente; // Preservamos aprobación existente
        nuevaFilaVal[23] = rechazoValExistente; // Preservamos motivo de rechazo existente
        hojaVal.getRange(filaEncontradaVal, 1, 1, nuevaFilaVal.length).setValues([nuevaFilaVal]);
        accionVal = "SOBREESCRITA";
      } else {
        hojaVal.appendRow(nuevaFilaVal);
        hojaVal.getRange(hojaVal.getLastRow(), 23).insertCheckboxes(); // Col W
        accionVal = "INYECTADA";
      }

      return ContentService.createTextOutput(JSON.stringify({
        exito: true,
        mensaje: "✅ PID " + pid + " " + accionVal + " exitosamente en VALIDACIÓN_QRO_2025.",
        detalles: { guia: guia, pid: pid, checkpoint: checkpoint, accion: accionVal }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("⚠️ Formato de payload no identificado por el receptor de rampa.");
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ exito: false, error: "❌ Error: " + error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 📁 Helper para localizar o crear la subcarpeta de almacenamiento en Drive
 */
function obtenerOCrearCarpetaDrive_(nombreCarpeta) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var ssFile = DriveApp.getFileById(ss.getId());
    var parentFolders = ssFile.getParents();
    var parentFolder = parentFolders.hasNext() ? parentFolders.next() : DriveApp.getRootFolder();
    
    var folders = parentFolder.getFoldersByName(nombreCarpeta);
    if (folders.hasNext()) {
      return folders.next();
    } else {
      return parentFolder.createFolder(nombreCarpeta);
    }
  } catch (e) {
    // Fallback si no tiene permisos de carpeta padre: buscar o crear en la raíz
    var rootFolders = DriveApp.getFoldersByName(nombreCarpeta);
    if (rootFolders.hasNext()) {
      return rootFolders.next();
    } else {
      return DriveApp.createFolder(nombreCarpeta);
    }
  }
}

/**
 * 🛡️ REGLA MAESTRA: LEY DE LA DOBLE J (Formato de PIDs para Bóveda OLLIN v77.0 PROD)
 * Transforma PIDs con prefijo JJD (campo/rampa) al estándar JD (Bóveda/Facturación).
 */
function sanitizarPIDParaBoveda(pidRaw) {
  if (!pidRaw) return "";
  var pidClean = pidRaw.toString().trim().toUpperCase();
  if (pidClean.indexOf("JJD") === 0) {
    pidClean = "JD" + pidClean.substring(3);
  }
  return pidClean;
}