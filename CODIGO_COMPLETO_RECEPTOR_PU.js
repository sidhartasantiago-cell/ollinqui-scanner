/**
 * 🏛️ CEREBRO DE RECEPCIÓN ASÍNCRONA UNIFICADA QRO (OLLIN v77.0 PROD - PARCHE ANTI-HOYOS)
 * 🚀 Webhook de Entrada PID-Level con Auto-Lookup Dinámico y Generador de KEY Fallback
 * 📋 Canaliza Pickups (18 columnas) y Deliveries (25 columnas rígidas) en VALIDACIÓN_QRO_2025
 */
function receptorPU_doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var accion = params.accion || params.action || "";

    if (accion === "ping") {
      return ContentService.createTextOutput(JSON.stringify({ status: "OK", timestamp: new Date().toISOString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (accion === "consultar_perfil_usuario") {
      var email = params.email || params.correo || params.chofer || "";
      var perfil = consultarPerfilUsuario_(email);
      return ContentService.createTextOutput(JSON.stringify(perfil))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (accion === "actualizar_pin_usuario") {
      var emailPin = params.email || params.correo || params.chofer || "";
      var nPin = params.nuevo_pin || params.pin || "";
      var resPin = actualizarPinUsuario_(emailPin, nPin);
      return ContentService.createTextOutput(JSON.stringify(resPin))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (accion === "consultar_usuarios_catalogo" || accion === "obtener_usuarios_catalogo") {
      var resUsers = consultarUsuariosCatalogo_();
      return ContentService.createTextOutput(JSON.stringify(resUsers))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (accion === "consultar_memoria_domicilio") {
      var guia = params.guia || "";
      var pid = params.pid || "";
      var direccion = params.direccion || "";
      var cp = params.cp || "";
      var memoria = consultarMemoriaDomicilio_(guia, pid, direccion, cp);
      return ContentService.createTextOutput(JSON.stringify(memoria))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (accion === "validar_sesion_usuario") {
      var emailSes = params.email || params.usuario || "";
      var devId = params.device_id || "";
      var override = params.master_override === "true" || params.master_override === true;
      var resSes = gestionarSesionUsuario_(emailSes, devId, override, "VALIDAR");
      return ContentService.createTextOutput(JSON.stringify(resSes)).setMimeType(ContentService.MimeType.JSON);
    }

    if (accion === "cerrar_sesion_usuario") {
      var emailClose = params.email || params.usuario || "";
      var devClose = params.device_id || "";
      var resClose = gestionarSesionUsuario_(emailClose, devClose, false, "CERRAR");
      return ContentService.createTextOutput(JSON.stringify(resClose)).setMimeType(ContentService.MimeType.JSON);
    }

    if (accion === "consultar_pids_asignados_chofer") {
      var choferQ = params.chofer || params.email || "";
      var resAsig = consultarPidsAsignadosChofer_(choferQ);
      return ContentService.createTextOutput(JSON.stringify(resAsig)).setMimeType(ContentService.MimeType.JSON);
    }

    if (accion === "consultar_pickups_asignados_chofer") {
      var choferPU = params.chofer || params.email || "";
      var resPickups = consultarPickupsAsignadosChofer_(choferPU);
      return ContentService.createTextOutput(JSON.stringify(resPickups)).setMimeType(ContentService.MimeType.JSON);
    }

    if (accion === "sincronizar_carga_a_bordo") {
      var payloadBordoGet = params.payload ? JSON.parse(params.payload) : params;
      var resBordoGet = procesarCargaABordo_(payloadBordoGet);
      return ContentService.createTextOutput(JSON.stringify(resBordoGet)).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "OK", mensaje: "🏛️ Webhook Receptor_PU Activo (OLLIN v77.0 PROD)" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ exito: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function receptorPU_doPost(e) {
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
    // CANAL PERFIL DE USUARIO (SWITCH 7CA Y METADATOS)
    // ==========================================
    if (datos && (datos.accion === "consultar_perfil_usuario" || datos.action === "consultar_perfil_usuario")) {
      var emailUser = datos.email || datos.correo || datos.chofer || "";
      var resPerfil = consultarPerfilUsuario_(emailUser);
      return ContentService.createTextOutput(JSON.stringify(resPerfil)).setMimeType(ContentService.MimeType.JSON);
    }

    if (datos && (datos.accion === "actualizar_pin_usuario" || datos.action === "actualizar_pin_usuario")) {
      var emailUserPin = datos.email || datos.correo || datos.chofer || "";
      var nPinPost = datos.nuevo_pin || datos.pin || "";
      var resPinPost = actualizarPinUsuario_(emailUserPin, nPinPost);
      return ContentService.createTextOutput(JSON.stringify(resPinPost)).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL MEMORIA DE DOMICILIO (REFERENCIAS ANTERIORES)
    // ==========================================
    if (datos && (datos.accion === "consultar_memoria_domicilio" || datos.action === "consultar_memoria_domicilio")) {
      var guiaMem = datos.guia || "";
      var pidMem = datos.pid || "";
      var dirMem = datos.direccion || "";
      var cpMem = datos.cp || "";
      var resMemoria = consultarMemoriaDomicilio_(guiaMem, pidMem, dirMem, cpMem);
      return ContentService.createTextOutput(JSON.stringify(resMemoria)).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL CANDADO DE SESIÓN ÚNICA (ANTI-CONCURRENCIA)
    // ==========================================
    if (datos && (datos.accion === "validar_sesion_usuario" || datos.action === "validar_sesion_usuario")) {
      var emailSesPost = datos.email || datos.usuario || "";
      var devIdPost = datos.device_id || "";
      var overridePost = datos.master_override === true || datos.master_override === "true";
      var resSesPost = gestionarSesionUsuario_(emailSesPost, devIdPost, overridePost, "VALIDAR");
      return ContentService.createTextOutput(JSON.stringify(resSesPost)).setMimeType(ContentService.MimeType.JSON);
    }

    if (datos && (datos.accion === "cerrar_sesion_usuario" || datos.action === "cerrar_sesion_usuario")) {
      var emailClosePost = datos.email || datos.usuario || "";
      var devClosePost = datos.device_id || "";
      var resClosePost = gestionarSesionUsuario_(emailClosePost, devClosePost, false, "CERRAR");
      return ContentService.createTextOutput(JSON.stringify(resClosePost)).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL CARGA A BORDO: CONSULTAR Y MUTAR A_BORDO (POKA-YOKE)
    // ==========================================
    if (datos && (datos.accion === "consultar_pids_asignados_chofer" || datos.action === "consultar_pids_asignados_chofer")) {
      var choferQPost = datos.chofer || datos.email || "";
      var resAsigPost = consultarPidsAsignadosChofer_(choferQPost);
      return ContentService.createTextOutput(JSON.stringify(resAsigPost)).setMimeType(ContentService.MimeType.JSON);
    }

    if (datos && (datos.accion === "sincronizar_carga_a_bordo" || datos.action === "sincronizar_carga_a_bordo")) {
      var resBordoPost = procesarCargaABordo_(datos.payload || datos);
      return ContentService.createTextOutput(JSON.stringify(resBordoPost)).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL RECOLECCIONES (PICKUPS PWA OFFLINE-FIRST)
    // ==========================================
    if (datos && (datos.accion === "sincronizar_recoleccion" || datos.action === "sincronizar_recoleccion")) {
      var resRec = procesarRecoleccionPWA_(datos.recoleccion || datos.payload || datos);
      return ContentService.createTextOutput(JSON.stringify(resRec)).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL PWA: SINCRONIZACIÓN OFFLINE DE ENTREGA MASIVA (POKA-YOKE)
    // ==========================================
    if (datos && (datos.accion === "sincronizar_entrega_masiva_offline" || datos.action === "sincronizar_entrega_masiva_offline" || datos.action === "guardar_entrega_masiva" || datos.accion === "guardar_entrega_masiva")) {
      var lotePayload = datos.lote || datos.payload || datos;
      var resSync = procesarSincronizacionEntregaMasivaOffline_(lotePayload);
      return ContentService.createTextOutput(JSON.stringify(resSync)).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL AUDITORÍA: INSPECCIÓN DINÁMICA DE ENCABEZADOS REALES
    // ==========================================
    if (datos && (datos.accion === "auditar_encabezados_bovedas" || datos.action === "auditar_encabezados_bovedas")) {
      var idVal = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M";
      var ssVal = SpreadsheetApp.openById(idVal);
      var shVal = ssVal.getSheetByName("VALIDACIÓN_QRO_2025") || ssVal.getSheets()[0];
      var headersVal = shVal ? shVal.getRange(1, 1, 1, shVal.getLastColumn()).getValues()[0] : [];
      
      var idRuta = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
      var ssRuta = SpreadsheetApp.openById(idRuta);
      var sheetsInfo = {};
      ["GUIAS_ASIGNADAS", "PIEZAS_PID", "ENTREGA_MASIVA", "PIEZAS_ESCANEADAS_MASIVAS", "COLA_TEOYOLOTL_AUDIOS_QRO"].forEach(function(nom) {
        var sh = ssRuta.getSheetByName(nom);
        sheetsInfo[nom] = sh ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : null;
      });
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "OK",
        validacionHeaders: headersVal,
        rutaHeaders: sheetsInfo
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL ADMIN: ASEGURAR COLUMNAS Y DIAGNÓSTICO MULTIMODAL
    // ==========================================
    // ==========================================
    // CANAL ADMIN: DIAGNÓSTICO DE CONEXIÓN GEMINI
    // ==========================================
    if (datos.accion === "list_models") {
      var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
      var version = datos.version || "v1beta";
      var url = "https://generativelanguage.googleapis.com/" + version + "/models?key=" + apiKey;
      var res = UrlFetchApp.fetch(url, { method: "get", muteHttpExceptions: true });
      return ContentService.createTextOutput(JSON.stringify({
        code: res.getResponseCode(),
        version: version,
        data: JSON.parse(res.getContentText())
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (datos.accion === "test_gemini") {
      var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
      var modeloSolicitado = datos.modelo || "gemini-1.5-flash";
      var version = datos.version || "v1beta";
      var url = "https://generativelanguage.googleapis.com/" + version + "/models/" + modeloSolicitado + ":generateContent?key=" + apiKey;
      var res = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          contents: [{ parts: [{ text: "Responde: OLLIN_GEMINI_ACTIVO" }] }]
        }),
        muteHttpExceptions: true
      });
      return ContentService.createTextOutput(JSON.stringify({
        exito: res.getResponseCode() === 200,
        code: res.getResponseCode(),
        raw: res.getContentText(),
        apiKeyLength: (apiKey || "").length,
        apiKeyPrefix: (apiKey || "").substring(0, 8),
        modelo: modeloSolicitado,
        version: version
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (datos.accion === "asegurar_columnas") {
      var idBdRutaAdmin = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
      var ssRutaAdmin = SpreadsheetApp.openById(idBdRutaAdmin);
      var columnasAgregadas = asegurarColumnasMultimodales_(ssRutaAdmin);
      var headersInfo = {};
      ["ENTREGA_MASIVA", "GUIAS_ASIGNADAS"].forEach(function(nom) {
        var sh = ssRutaAdmin.getSheetByName(nom);
        headersInfo[nom] = sh ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
      });
      return ContentService.createTextOutput(JSON.stringify({
        exito: true,
        status: "OK",
        mensaje: "✅ Columnas multimodales verificadas en BD_APP_RUTA_2025.",
        agregadas: columnasAgregadas,
        cabeceras: headersInfo
      })).setMimeType(ContentService.MimeType.JSON);
    }

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
          "--- CIERRE DE PROCESO EN RAMPA ---",
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

        // Notificación automática a Google Chat Space de Alertas Operativas (AE_Bot_QRO)
        try {
          var urlGoogleChat = "https://chat.googleapis.com/v1/spaces/AAQA-NmGVf0/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ml4k0Mmpx8c3vGco583llDQGEGJf3OY7LUMKlJjJIsY";
          var emojiDictamen = diferencia < 0 ? "🚨 FALTANTE DETECTADO" : (diferencia === 0 ? "✅ CONCILIACIÓN EXACTA" : "⚠️ EXCEDENTE EN ANDÉN");
          var detalleDiff = "";
          if (diferencia < 0) {
            detalleDiff = "🚨 *Faltan " + Math.abs(diferencia) + " piezas* que DHL declaró pero *NO* ingresaron físicamente.";
          } else if (diferencia === 0) {
            detalleDiff = "✅ Las *" + declaradasDhl + " piezas declaradas* ingresaron íntegras al 100%.";
          } else {
            detalleDiff = "⚠️ Se recibieron *" + diferencia + " piezas físicas excedentes* no declaradas.";
          }

          var modoOperativo = datos.modo === "INTERNACIONAL" ? "🌐 PILOTO INTERNACIONAL POR EDD" : "📦 MODO ESTÁNDAR";
          var awbAsoc = datos.awb_asociada ? ("\n📑 *AWB Asociada Maestra:* `" + datos.awb_asociada + "`") : "";

          // Construir desglose explícito de PIDs faltantes o sobrantes
          var bloqueDiscrepancia = "";
          if (datos.pids_faltantes && datos.pids_faltantes.length > 0) {
            bloqueDiscrepancia += "\n❌ *PIDs FALTANTES DECLARADOS NO ENTREGADOS (" + datos.pids_faltantes.length + " pzs):*\n";
            for (var f = 0; f < Math.min(datos.pids_faltantes.length, 8); f++) {
              bloqueDiscrepancia += " • `" + datos.pids_faltantes[f] + "` (NO FÍSICO)\n";
            }
            if (datos.pids_faltantes.length > 8) {
              bloqueDiscrepancia += " • _...y " + (datos.pids_faltantes.length - 8) + " PIDs más._\n";
            }
          }
          if (datos.pids_sobrantes && datos.pids_sobrantes.length > 0) {
            bloqueDiscrepancia += "\n⚠️ *PIDs SOBRANTES / EXCEDENTES EN ANDÉN (" + datos.pids_sobrantes.length + " pzs):*\n";
            for (var sb = 0; sb < Math.min(datos.pids_sobrantes.length, 8); sb++) {
              bloqueDiscrepancia += " • `" + datos.pids_sobrantes[sb] + "` (FÍSICO NO PREALERTADO)\n";
            }
            if (datos.pids_sobrantes.length > 8) {
              bloqueDiscrepancia += " • _...y " + (datos.pids_sobrantes.length - 8) + " PIDs más._\n";
            }
          }

          var msgChat = 
            "🏁 *PAINANI v83.0 — CIERRE NOTARIAL DE RAMPA (QRO)*\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "📋 *Folio Recepción:* `" + idRecepcion + "`\n" +
            "⚙️ *Modo:* " + modoOperativo + awbAsoc + "\n" +
            "🕒 *Fecha / Hora:* " + horaServidor + "\n" +
            "👤 *Auditor Arauto:* " + auditor + "\n" +
            "🚚 *Asistente / Chofer DHL:* " + asistenteDhl + "\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "📊 *BALANCE DE CARGA FÍSICA:*\n" +
            "• Declaradas por DHL: *" + declaradasDhl + " pzs*\n" +
            "• Bipiadas en Rampa: *" + totalRecibidas + " bultos*\n" +
            "• Dictamen: *" + emojiDictamen + "*\n" +
            detalleDiff + "\n" +
            bloqueDiscrepancia +
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "✍️ *Firma de Conformidad Chofer:* Solicitada en andén de rampa.\n" +
            "🛡️ _Acta Notarial y marcas de tiempo registradas en Bóveda Central._";

          UrlFetchApp.fetch(urlGoogleChat, {
            method: "post",
            contentType: "application/json",
            muteHttpExceptions: true,
            payload: JSON.stringify({ text: msgChat })
          });
        } catch (eChat) {
          Logger.log("Error al notificar Google Chat: " + eChat.message);
        }

        return ContentService.createTextOutput(JSON.stringify({
          exito: true,
          status: "OK",
          mensaje: "✅ Cierre de proceso en rampa registrado exitosamente.",
          id_recepcion: idRecepcion,
          total_declaradas: declaradasDhl,
          total_recibidas: totalRecibidas,
          diferencia: diferencia
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // =====================================================================
      // SUBTIPO C: REGISTRO DE FOTO DE ETIQUETA ILEGIBLE CON IA ASÍNCRONA (v84.0 PROD)
      // =====================================================================
      if (subtipo === "REGISTRAR_INCIDENCIA_FOTO") {
        var base64Img = datos.foto_base64 || "";
        var folioIncidencia = datos.folio_incidencia || ("PID_INC_" + Math.floor(1000 + Math.random() * 9000));
        var fileUrl = "";

        // 1. Guardar foto en Google Drive (Carpeta PAINANI_INCIDENCIAS_RAMPA)
        if (base64Img) {
          try {
            var base64Limpio = base64Img.replace(/^data:image\/\w+;base64,/, "");
            var decoded = Utilities.base64Decode(base64Limpio);
            var nombreArchivo = folioIncidencia + "_" + Utilities.formatDate(fechaHoy, "America/Mexico_City", "yyyyMMdd_HHmmss") + ".jpg";
            var blob = Utilities.newBlob(decoded, datos.foto_mime || "image/jpeg", nombreArchivo);

            var carpetas = DriveApp.getFoldersByName("PAINANI_INCIDENCIAS_RAMPA");
            var carpetaDestino = carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder("PAINANI_INCIDENCIAS_RAMPA");
            var archivoGuardado = carpetaDestino.createFile(blob);
            archivoGuardado.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            fileUrl = archivoGuardado.getUrl();
          } catch (errDrive) {
            Logger.log("⚠️ Error al guardar foto en Drive: " + errDrive.message);
            fileUrl = "ERROR_DRIVE: " + errDrive.message;
          }
        }

        // 2. Procesar con Gemini 3.6 Flash (Teoyolotl Vision)
        var lecturaIA = {
          pid_detectado: "",
          awb_detectada: "",
          cp_detectado: "",
          destinatario: "",
          direccion: "",
          dictamen_etiqueta: "SIN_PROCESAR",
          observaciones: ""
        };

        if (base64Img) {
          try {
            lecturaIA = analizarEtiquetaIlegibleConGeminiVision_(base64Img, datos.foto_mime || "image/jpeg");
          } catch (errIA) {
            Logger.log("⚠️ Error en análisis IA: " + errIA.message);
            lecturaIA.observaciones = "Fallo IA: " + errIA.message;
          }
        }

        // 3. Inyectar en RECEPCION_RAMPA (BOVEDA_BATCH_MAESTRO)
        var pidParaBoveda = lecturaIA.pid_detectado ? sanitizarPIDParaBoveda(lecturaIA.pid_detectado) : folioIncidencia;
        var estatusConciliacion = "INCIDENCIA_FOTO | URL: " + fileUrl + " | IA: " + (lecturaIA.pid_detectado ? ("RECUPERADO:" + lecturaIA.pid_detectado) : "ILEGIBLE");
        if (lecturaIA.awb_detectada) estatusConciliacion += " [AWB:" + lecturaIA.awb_detectada + "]";
        if (lecturaIA.cp_detectado) estatusConciliacion += " [CP:" + lecturaIA.cp_detectado + "]";

        var lastRowActual = hojaRampa.getLastRow();
        var filaIncidencia = [
          idRecepcion,                                     // Col A: ID_Recepcion
          datos.timestamp || horaServidor,                 // Col B: Timestamp_Escaneo
          folioIncidencia,                                 // Col C: Codigo_Original (PID_INC_XXXX)
          pidParaBoveda,                                   // Col D: PID_Sanitizado_Boveda
          "PID_INC_FOTO",                                  // Col E: Tipo_Codigo
          datos.edd_fisico || datos.edd_predominante || "",// Col F: EDD_Fisico
          auditor,                                         // Col G: Auditor_Arauto
          asistenteDhl,                                    // Col H: Asistente_DHL
          declaradasDhl,                                   // Col I: Piezas_Declaradas_DHL
          lastRowActual,                                   // Col J: Conteo_Acumulado (+1)
          estatusConciliacion,                             // Col K: Estatus_Conciliacion
          fechaHoy                                         // Col L: Marca_Tiempo_Servidor
        ];
        hojaRampa.appendRow(filaIncidencia);

        // 4. Registrar en LOG_TRAZABILIDAD de BOVEDA_BATCH_MAESTRO
        registrarEnLogTrazabilidadBoveda_(ssTarget, {
          idRecepcion: idRecepcion,
          folio: folioIncidencia,
          fileUrl: fileUrl,
          pidDetectado: lecturaIA.pid_detectado || "",
          awbDetectada: lecturaIA.awb_detectada || "",
          cpDetectado: lecturaIA.cp_detectado || "",
          dictamenIA: lecturaIA.dictamen_etiqueta || "ANALIZADO_IA",
          observaciones: lecturaIA.observaciones || "",
          asistenteDhl: asistenteDhl,
          usuario: auditor,
          fechaHora: horaServidor
        });

        return ContentService.createTextOutput(JSON.stringify({
          exito: true,
          status: "OK",
          mensaje: "✅ Incidencia fotográfica procesada por IA y guardada en Bóveda.",
          folio: folioIncidencia,
          file_url: fileUrl,
          ia_resultado: lecturaIA,
          pid_boveda: pidParaBoveda,
          conteo_servidor: lastRowActual
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
        var tipoCod = item.tipo || (codigoRaw.length === 10 && /^\d+$/.test(codigoRaw) ? "AWB" : (codigoRaw.indexOf("PID_INC_") === 0 ? "PID_INC_FOTO" : "PID"));
        var eddFis = item.edd || datos.edd_predominante || "";
        var tsEscaneo = item.timestamp || horaServidor;

        var estatusRec = (tipoCod === "PID_INC_FOTO" || codigoRaw.indexOf("PID_INC_") === 0) ? "INCIDENCIA_FOTO_LOTE" : "RECIBIDO_EN_RAMPA";
        if (item.awb_asociada) estatusRec += " [AWB:" + item.awb_asociada + "]";
        if (item.zona) estatusRec += " [" + item.zona.split('-')[0].trim() + "]";

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
          estatusRec,
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
    // CANAL E: ESCANEO SECUNDARIO DE INTERNACIONALES CON EDD FÍSICO (PAINANI v85.0 PROD)
    // Almacenamiento independiente en pestaña 'INTERNACIONALES_EDD' (BOVEDA_BATCH_MAESTRO)
    // ==========================================
    if (datos.tipo === "INTERNACIONAL_EDD_SECUNDARIO" || datos.accion === "registrar_internacionales_edd" || datos.canal === "INTERNACIONAL_EDD") {
      var idLoteInter = datos.id_lote_inter || ("INT-" + Utilities.formatDate(new Date(), "America/Mexico_City", "yyyyMMdd") + "-01");
      var idRecepcionOrigen = datos.id_recepcion_origen || "SIN_ACTA_VINCULADA";
      var auditor = datos.auditor || "Irvin Reyes";
      var subtipo = datos.subtipo || "LOTE_BATCH";
      var fechaHoy = new Date();
      var horaServidor = Utilities.formatDate(fechaHoy, "America/Mexico_City", "dd/MM/yyyy HH:mm:ss");

      // Conexión exclusiva a BOVEDA_BATCH_MAESTRO
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

      var hojaInter = ssTarget.getSheetByName("INTERNACIONALES_EDD");
      if (!hojaInter) {
        hojaInter = ssTarget.insertSheet("INTERNACIONALES_EDD");
        var cabecerasInter = [
          "ID_Lote_Inter",           // A (0)
          "Timestamp_Escaneo",      // B (1)
          "Codigo_Original",        // C (2)
          "PID_Sanitizado_Boveda",  // D (3)
          "EDD_Fisico_Asignado",    // E (4)
          "CP",                     // F (5)
          "Zona_Logistica",         // G (6)
          "Ruta_Sugerida",          // H (7)
          "Tlachixqui_Auditor",     // I (8)
          "ID_Recepcion_Origen",    // J (9)
          "Conteo_Acumulado_Lote",  // K (10)
          "Estatus_Clasificacion",  // L (11)
          "Marca_Tiempo_Servidor"   // M (12)
        ];
        hojaInter.appendRow(cabecerasInter);
        hojaInter.getRange(1, 1, 1, cabecerasInter.length).setFontWeight("bold").setBackground("#00385c").setFontColor("#38bdf8");
      }

      // --- SUBTIPO 1: CIERRE DEL LOTE INTERNACIONAL SECUNDARIO ---
      if (subtipo === "CIERRE_LOTE_INTER") {
        var totalClasificados = parseInt(datos.total_clasificados) || 0;
        var desgloseEdd = datos.desglose_edd || "";

        var filaCierre = [
          idLoteInter,
          horaServidor,
          "--- CIERRE DE LOTE INTERNACIONAL EDD ---",
          "--- CIERRE ---",
          "---",
          "---",
          "---",
          "---",
          auditor,
          idRecepcionOrigen,
          totalClasificados,
          "LOTE_CERRADO: " + totalClasificados + " PZS CLASIFICADAS",
          fechaHoy
        ];
        hojaInter.appendRow(filaCierre);

        // Notificación a Google Chat Space de Alertas Operativas (AE_Bot_QRO)
        try {
          var urlGoogleChat = "https://chat.googleapis.com/v1/spaces/AAQA-NmGVf0/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ml4k0Mmpx8c3vGco583llDQGEGJf3OY7LUMKlJjJIsY";
          var msgChat = 
            "🌐 *PAINANI v85.0 — CIERRE DE CLASIFICACIÓN INTERNACIONAL (EDD)*\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "📋 *Folio Lote:* `" + idLoteInter + "`\n" +
            "📦 *Acta Origen:* `" + idRecepcionOrigen + "`\n" +
            "🕒 *Fecha / Hora:* " + horaServidor + "\n" +
            "👤 *Tlachixqui Auditor:* " + auditor + "\n" +
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "📊 *BULTOS INTERNACIONALES CLASIFICADOS:* *" + totalClasificados + " piezas*\n" +
            (desgloseEdd ? ("\n📅 *Desglose por EDD Prometido:*\n" + desgloseEdd + "\n") : "") +
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
            "🛡️ _Registrado de forma independiente en Bóveda Central (Hoja 'INTERNACIONALES_EDD')._";

          UrlFetchApp.fetch(urlGoogleChat, {
            method: "post",
            contentType: "application/json",
            muteHttpExceptions: true,
            payload: JSON.stringify({ text: msgChat })
          });
        } catch (eChat) {
          Logger.log("Error al notificar Google Chat: " + eChat.message);
        }

        return ContentService.createTextOutput(JSON.stringify({
          exito: true,
          status: "OK",
          mensaje: "✅ Cierre de lote internacional registrado en hoja INTERNACIONALES_EDD.",
          id_lote_inter: idLoteInter,
          total_clasificados: totalClasificados
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // --- SUBTIPO 2: FOTO DE ETIQUETA ILEGIBLE INTERNACIONAL ---
      if (subtipo === "REGISTRAR_INCIDENCIA_FOTO") {
        var base64Img = datos.foto_base64 || "";
        var folioIncidencia = datos.folio_incidencia || ("PID_INC_INT_" + Math.floor(1000 + Math.random() * 9000));
        var fileUrl = "";

        if (base64Img) {
          try {
            var base64Limpio = base64Img.replace(/^data:image\/\w+;base64,/, "");
            var decoded = Utilities.base64Decode(base64Limpio);
            var nombreArchivo = folioIncidencia + "_" + Utilities.formatDate(fechaHoy, "America/Mexico_City", "yyyyMMdd_HHmmss") + ".jpg";
            var blob = Utilities.newBlob(decoded, datos.foto_mime || "image/jpeg", nombreArchivo);

            var carpetas = DriveApp.getFoldersByName("PAINANI_INCIDENCIAS_RAMPA");
            var carpetaDestino = carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder("PAINANI_INCIDENCIAS_RAMPA");
            var archivoGuardado = carpetaDestino.createFile(blob);
            archivoGuardado.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            fileUrl = archivoGuardado.getUrl();
          } catch (errDrive) {
            Logger.log("⚠️ Error al guardar foto internacional en Drive: " + errDrive.message);
            fileUrl = "ERROR_DRIVE: " + errDrive.message;
          }
        }

        var lecturaIA = {
          pid_detectado: "",
          awb_detectada: "",
          cp_detectado: "",
          destinatario: "",
          direccion: "",
          dictamen_etiqueta: "SIN_PROCESAR",
          observaciones: ""
        };

        if (base64Img) {
          try {
            lecturaIA = analizarEtiquetaIlegibleConGeminiVision_(base64Img, datos.foto_mime || "image/jpeg");
          } catch (errIA) {
            Logger.log("⚠️ Error en análisis IA: " + errIA.message);
            lecturaIA.observaciones = "Fallo IA: " + errIA.message;
          }
        }

        var pidParaBoveda = lecturaIA.pid_detectado ? sanitizarPIDParaBoveda(lecturaIA.pid_detectado) : folioIncidencia;
        var cpFinal = datos.cp || lecturaIA.cp_detectado || "";
        var zonaFinal = datos.zona || (cpFinal ? ("CP " + cpFinal) : "POR_RESOLVER");
        var rutaFinal = datos.ruta || "";
        var estatusClasif = "FOTO_INCIDENCIA_INTER | URL: " + fileUrl + " | IA: " + (lecturaIA.pid_detectado ? ("RECUPERADO:" + lecturaIA.pid_detectado) : "ILEGIBLE");

        var lastRowActual = hojaInter.getLastRow();
        var filaIncidenciaInter = [
          idLoteInter,
          datos.timestamp || horaServidor,
          folioIncidencia,
          pidParaBoveda,
          datos.edd_fisico || "SIN_FECHA",
          cpFinal,
          zonaFinal,
          rutaFinal,
          auditor,
          idRecepcionOrigen,
          lastRowActual,
          estatusClasif,
          fechaHoy
        ];
        hojaInter.appendRow(filaIncidenciaInter);

        // Registro de auditoría
        registrarEnLogTrazabilidadBoveda_(ssTarget, {
          idRecepcion: idLoteInter,
          folio: folioIncidencia,
          fileUrl: fileUrl,
          pidDetectado: lecturaIA.pid_detectado || "",
          awbDetectada: lecturaIA.awb_detectada || "",
          cpDetectado: cpFinal,
          dictamenIA: lecturaIA.dictamen_etiqueta || "FOTO_INTERNACIONAL_IA",
          observaciones: "Clasificación secundaria EDD: " + (datos.edd_fisico || "") + " | Origen: " + idRecepcionOrigen,
          asistenteDhl: "INTERNACIONAL_EDD",
          usuario: auditor,
          fechaHora: horaServidor
        });

        return ContentService.createTextOutput(JSON.stringify({
          exito: true,
          status: "OK",
          mensaje: "✅ Incidencia fotográfica internacional guardada en hoja INTERNACIONALES_EDD.",
          folio: folioIncidencia,
          file_url: fileUrl,
          ia_resultado: lecturaIA,
          pid_boveda: pidParaBoveda,
          conteo_servidor: lastRowActual
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // --- SUBTIPO 3: LOTE BATCH DE ESCANEOS INTERNACIONALES SECUNDARIOS ---
      var listaEscaneos = [];
      if (datos.escaneos && Array.isArray(datos.escaneos)) {
        listaEscaneos = datos.escaneos;
      } else if (datos.codigo) {
        listaEscaneos.push({
          codigo: datos.codigo,
          edd: datos.edd_fisico || datos.edd || "",
          cp: datos.cp || "",
          zona: datos.zona || "",
          ruta: datos.ruta || "",
          timestamp: datos.timestamp || horaServidor
        });
      }

      if (listaEscaneos.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          exito: false,
          status: "EMPTY",
          mensaje: "⚠️ No se recibieron bultos internacionales para registrar."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var filasParaInsertar = [];
      var conteoBase = Math.max(0, hojaInter.getLastRow() - 1);

      for (var s = 0; s < listaEscaneos.length; s++) {
        var item = listaEscaneos[s];
        var codigoRaw = String(item.codigo || "").trim().toUpperCase();
        var codigoSanitizado = sanitizarPIDParaBoveda(codigoRaw);
        var eddFis = item.edd || datos.edd_fisico || "SIN_FECHA";
        var cpVal = item.cp || "";
        var zonaVal = item.zona || "";
        var rutaVal = item.ruta || "";
        var tsEscaneo = item.timestamp || horaServidor;
        var estatusRec = (codigoRaw.indexOf("PID_INC_") === 0) ? "INCIDENCIA_FOTO_LOTE" : "CLASIFICADO_EDD";
        if (item.awb_asociada) estatusRec += " [AWB:" + item.awb_asociada + "]";

        filasParaInsertar.push([
          idLoteInter,
          tsEscaneo,
          codigoRaw,
          codigoSanitizado,
          eddFis,
          cpVal,
          zonaVal,
          rutaVal,
          auditor,
          idRecepcionOrigen,
          conteoBase + s + 1,
          estatusRec,
          fechaHoy
        ]);
      }

      var lastRowActual = hojaInter.getLastRow();
      hojaInter.getRange(lastRowActual + 1, 1, filasParaInsertar.length, filasParaInsertar[0].length).setValues(filasParaInsertar);

      return ContentService.createTextOutput(JSON.stringify({
        exito: true,
        status: "OK",
        mensaje: "✅ Registrados " + filasParaInsertar.length + " bultos internacionales en hoja INTERNACIONALES_EDD.",
        id_lote_inter: idLoteInter,
        conteo_servidor: lastRowActual + filasParaInsertar.length - 1
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL ADMIN: PROCESAMIENTO INMEDIATO DE COLA DE AUDIOS
    // ==========================================
    if (datos.accion === "procesar_cola_audio_now" || datos.action === "procesar_cola_audio_now") {
      var resCola = ejecutarColaGeminiSegundoPlano();
      return ContentService.createTextOutput(JSON.stringify({
        exito: true,
        status: "OK",
        resultado: resCola
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (datos.accion === "instalar_cron_cola_audio" || datos.action === "instalar_cron_cola_audio") {
      var resCron = instalarCronColaAudioTeoyolotl();
      return ContentService.createTextOutput(JSON.stringify({
        exito: true,
        status: "OK",
        resultado: resCron
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================
    // CANAL C: NOTAS DE VOZ & MOTOR IA MULTIMODAL (TEOYOLOTL MIC + GEMINI 3.6 FLASH)
    // ⚡ RESPUESTA OPTIMISTA ASÍNCRONA (<300ms)
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

      var tareaAudio = {
        idRegistro: idRegistro,
        fileAudioId: fileAudio.getId(),
        appSheetRelativePath: appSheetRelativePath,
        fileUrl: fileUrl,
        choferEmail: choferEmail,
        foto_fachada: datos.foto_fachada || datos.imagen || "",
        foto_base64: datos.foto_base64 || "",
        foto_mimetype: datos.foto_mimetype || "",
        audio_mimetype: datos.audio_mimetype || "audio/webm",
        timestamp: new Date().getTime()
      };

      // 🚀 Encolar y activar activador de segundo plano para Gemini 3.6 Flash y Bóveda
      encolarTareaAudioGemini_(tareaAudio);

      // ⚡ RESPUESTA OPTIMISTA INMEDIATA (<300ms)
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        exito: true,
        message: "✅ Audio recibido en <300ms. Procesamiento Gemini 3.6 Flash y Bóveda ejecutándose en segundo plano.",
        id_registro: idRegistro,
        archivo: appSheetRelativePath,
        url: fileUrl
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

/**
 * 👁️ TEOYOLOTL VISION: Lectura Asíncrona IA de Etiquetas DHL Ilegibles o Dañadas (v84.0 PROD)
 * Extrae AWB (10 dígitos), PID (JJD/JD), Código Postal (5 dígitos), Destinatario y Dirección.
 */
function analizarEtiquetaIlegibleConGeminiVision_(base64Image, mimeTypeImage) {
  var apiKey = "";
  try {
    apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  } catch (err) {
    Logger.log("⚠️ Error al leer GEMINI_API_KEY: " + err.message);
  }

  if (!apiKey) {
    return {
      pid_detectado: "",
      awb_detectada: "",
      cp_detectado: "",
      destinatario: "",
      direccion: "",
      dictamen_etiqueta: "ERROR_API_KEY",
      observaciones: "GEMINI_API_KEY no configurada en ScriptProperties."
    };
  }

  var prompt = 
    "Eres el perito auditor de visión artificial (Teoyolotl Vision) para la rampa de DHL Express en Querétaro (Arauto Express).\n" +
    "Analiza minuciosamente la fotografía de la etiqueta de paquetería de DHL adjunta. La etiqueta puede estar rota, manchada, arrugada o parcialmente ilegible.\n\n" +
    "Tu objetivo es recuperar la mayor cantidad de información oficial posible inspeccionando los códigos de barras, códigos Datamatrix o texto impreso.\n" +
    "Debes responder ÚNICA Y ESTRICTAMENTE con un objeto JSON válido con esta estructura exacta, sin bloques markdown ni texto adicional:\n" +
    "{\n" +
    '  "pid_detectado": "PID de pieza que comienza con JJD o JD seguido de letras/números (ej. JJD0149999999 o JD0149999999). Si es ilegible, cadena vacía.",\n' +
    '  "awb_detectada": "Número de guía o Waybill de exactamente 10 dígitos numéricos (ej. 4804831533). Si es ilegible, cadena vacía.",\n' +
    '  "cp_detectado": "Código Postal mexicano de 5 dígitos (ej. 76120). Si es ilegible, cadena vacía.",\n' +
    '  "destinatario": "Nombre completo de la persona o empresa receptora visible en la etiqueta. Si es ilegible, cadena vacía.",\n' +
    '  "direccion": "Dirección completa o colonia/ciudad visible. Si es ilegible, cadena vacía.",\n' +
    '  "dictamen_etiqueta": "RECUPERADA_TOTAL", "RECUPERADA_PARCIAL", "TOTALMENTE_ILEGIBLE", "ROTURA_SEVERA" o "MANCHADA",\n' +
    '  "observaciones": "Resumen conciso del estado de la etiqueta y qué datos se pudieron rescatar para aclaración con DHL."\n' +
    "}";

  var base64Limpio = String(base64Image || "").replace(/^data:image\/\w+;base64,/, "");
  var parts = [
    { text: prompt },
    {
      inlineData: {
        mimeType: mimeTypeImage || "image/jpeg",
        data: base64Limpio
      }
    }
  ];

  var payload = {
    contents: [{ parts: parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  // Jerarquía canónica de modelos (gemini-3.6-flash prioritario)
  var modelos = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-flash-latest"];
  var ultimoError = "";

  for (var m = 0; m < modelos.length; m++) {
    var modelo = modelos[m];
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":generateContent?key=" + apiKey;
    try {
      var options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      var res = UrlFetchApp.fetch(url, options);
      var code = res.getResponseCode();
      var raw = res.getContentText();

      if (code === 200) {
        var jsonRes = JSON.parse(raw);
        if (jsonRes.candidates && jsonRes.candidates.length > 0 && jsonRes.candidates[0].content && jsonRes.candidates[0].content.parts) {
          var rawText = jsonRes.candidates[0].content.parts[0].text;
          var cleanText = rawText.replace(/```json/gi, "").replace(/```/gi, "").trim();
          var parsedObj = JSON.parse(cleanText);
          parsedObj.modelo_utilizado = modelo;
          Logger.log("✅ Teoyolotl Vision: Lectura exitosa con " + modelo);
          return parsedObj;
        }
      } else {
        ultimoError = "HTTP " + code + " en " + modelo + ": " + raw.substring(0, 200);
        Logger.log("⚠️ Teoyolotl Vision: Falló con " + modelo + " (" + ultimoError + ")");
      }
    } catch (eMod) {
      ultimoError = "Excepción en " + modelo + ": " + eMod.message;
      Logger.log("⚠️ Teoyolotl Vision: " + ultimoError);
    }
  }

  return {
    pid_detectado: "",
    awb_detectada: "",
    cp_detectado: "",
    destinatario: "",
    direccion: "",
    dictamen_etiqueta: "ERROR_PROCESAMIENTO",
    observaciones: ultimoError || "Todos los modelos de Gemini fallaron."
  };
}

/**
 * 📝 Auditoría Inmutable en LOG_TRAZABILIDAD de BOVEDA_BATCH_MAESTRO (v84.0 PROD)
 */
function registrarEnLogTrazabilidadBoveda_(ssBoveda, p) {
  try {
    if (!ssBoveda) return;
    var hojaLog = ssBoveda.getSheetByName("LOG_TRAZABILIDAD");
    if (!hojaLog) {
      hojaLog = ssBoveda.insertSheet("LOG_TRAZABILIDAD");
      var headers = [
        "Fecha_Hora",
        "Usuario_Auditor",
        "Accion",
        "Folio_Guia_PID",
        "Piezas",
        "Chofer_Asistente",
        "Estatus",
        "Detalle_IA_URL"
      ];
      hojaLog.appendRow(headers);
      hojaLog.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#002b49").setFontColor("#ffffff");
    }

    hojaLog.appendRow([
      p.fechaHora || Utilities.formatDate(new Date(), "America/Mexico_City", "dd/MM/yyyy HH:mm:ss"),
      p.usuario || "Auditor Arauto",
      p.accion || "INCIDENCIA_FOTO_RAMPA",
      p.folio || p.pidDetectado || "",
      1,
      p.asistenteDhl || "",
      p.dictamenIA || "FOTO_INGESTADA",
      (p.fileUrl ? "URL: " + p.fileUrl + " | " : "") + (p.observaciones || "")
    ]);
  } catch (errLog) {
    Logger.log("⚠️ Error al registrar en LOG_TRAZABILIDAD: " + errLog.message);
  }
}


/**
 * 🛰️ Consumo de la API Oficial de Google Gemini Multimodal (Gemini 2.5 Flash con Fallback a 1.5 Flash)
 */
function llamarApiGeminiMultimodal_(base64Image, mimeTypeImage, base64Audio, mimeTypeAudio, contextoAuditoria) {
  var apiKey = "";
  try {
    apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  } catch (err) {
    Logger.log("⚠️ Error al leer GEMINI_API_KEY: " + err.message);
  }

  if (!apiKey) {
    Logger.log("❌ Error: GEMINI_API_KEY no encontrada en ScriptProperties.");
    return { error: "GEMINI_API_KEY no encontrada en ScriptProperties." };
  }

  var bloqueContexto = "";
  if (contextoAuditoria) {
    bloqueContexto = "\n\n--- 🏛️ CONTEXTO DE ENTREGA Y MEMORIA HISTÓRICA AMOXCALLI ---\n" +
      "• Destinatario Oficial Esperado: " + (contextoAuditoria.destinatario_esperado || "NO ESPECIFICADO") + "\n" +
      "• Nombre Reportado por Chofer (Quien Recibió): " + (contextoAuditoria.nombre_recibe || "NO ESPECIFICADO") + "\n" +
      "• Dirección Esperada: " + (contextoAuditoria.direccion_esperada || "N/A") + "\n" +
      "• C.P.: " + (contextoAuditoria.cp_esperado || "N/A") + "\n" +
      "• Checkpoint Reportado por Chofer: " + (contextoAuditoria.estatus_reportado || "OK") + "\n" +
      (contextoAuditoria.antecedentes_amoxcalli ? ("• Antecedentes Históricos Amoxcalli: " + JSON.stringify(contextoAuditoria.antecedentes_amoxcalli) + "\n") : "");
  }

  var prompt = 
    "Actúas como el auditor fiscalizador y perito logístico de Arauto Express para la plaza de Querétaro (operación DHL Express).\n" +
    "Analiza con rigor la fotografía de entrega logística adjunta (fachada, zaguán, número exterior, paquete o identificación INE) Y escucha minuciosamente la nota de voz grabada por el Pochteca/chofer en calle.\n" +
    bloqueContexto +
    "\nDebes responder ÚNICA Y ESTRICTAMENTE con un objeto JSON válido con esta estructura exacta, sin código markdown ni explicaciones adicionales:\n" +
    "{\n" +
    '  "estatus": "VALIDADA" o "INCIDENCIA",\n' +
    '  "categoria_incidencia": "DOMICILIO_CERRADO", "CLIENTE_AUSENTE", "RECHAZO_POR_DAÑO", "SIN_PAGO_ADUANA", "DIRECCION_INCORRECTA", "FUERA_DE_ZONA" o "NINGUNO",\n' +
    '  "transcripcion_audio": "Transcripción VERBATIM (exacta y literal) de lo que dice el chofer en el audio. Si no hay voz o hay silencio, escribe SIN_TESTIMONIO_DE_VOZ. No inventes palabras.",\n' +
    '  "nombre_recibe": "Nombre completo de quien recibe si se ve en una identificación física oficial (INE) en la foto o si el chofer lo dice claramente en el audio. De lo contrario dejar vacío.",\n' +
    '  "evaluacion_destinatario": "TITULAR_CONFIRMADO", "FAMILIAR_O_AUTORIZADO", "TERCERO_O_CASETA", "DISCREPANCIA_RECEPTOR" o "INCIDENCIA_REPORTADA",\n' +
    '  "score_confianza": 95 (Número entero de 0 a 100 indicando certeza de la entrega),\n' +
    '  "checkpoint_propuesto_ia": "OK", "NH", "BA", "RD" o "CA",\n' +
    '  "comentarios": "Síntesis cognitiva que unifica la evidencia visual de la foto, el testimonio oral del chofer y el cotejo del destinatario frente a Amoxcalli. Máximo 2 oraciones concisas y profesionales."\n' +
    "}\n\n" +
    "REGLAS SUPREMAS DE AUDITORÍA (POKA-YOKE LOGÍSTICO):\n" +
    "1. Prioridad del Testimonio Oral: Si el chofer indica verbalmente en el audio una incidencia (ej. 'está cerrado', 'no hay nadie', 'rechazaron paquete', 'no viven aquí'), el estatus DEBE ser 'INCIDENCIA' con su respectiva categoría, aun si la foto muestra una casa abierta.\n" +
    "2. Checkpoints Oficiales DHL:\n" +
    "   - 'OK': Entrega exitosa recibida en domicilio.\n" +
    "   - 'NH' (Not Home): Domicilio cerrado, cliente ausente, no contestan timbre/llamada.\n" +
    "   - 'BA' (Bad Address): Dirección incorrecta, calle o número no existe, colonia cambiada.\n" +
    "   - 'RD' (Refused Damage/Payment): Rechazo del paquete por daño físico o negativa a pagar impuestos aduanales.\n" +
    "   - 'CA' (Closed Agency): Negocio, oficina o taller cerrado por horario o día festivo.\n" +
    "3. Cotejo del Destinatario y Amoxcalli:\n" +
    "   - Si el nombre reportado coincide con el destinatario oficial esperado: 'TITULAR_CONFIRMADO'.\n" +
    "   - Si difiere pero en el audio o antecedentes se indica parentesco o familiar directo (apellidos compartidos, 'su esposa', 'su mamá'): 'FAMILIAR_O_AUTORIZADO'.\n" +
    "   - Si se entregó a vigilancia, recepción o caseta: 'TERCERO_O_CASETA'.\n" +
    "   - Si el nombre es un desconocido sin relación ni sustento en el audio: 'DISCREPANCIA_RECEPTOR'.\n" +
    "4. Si la foto es negra, borrosa, azul o no muestra evidencia válida de entrega ni fachada y no hay audio aclaratorio, marca estatus 'INCIDENCIA', categoria 'DOMICILIO_CERRADO' y checkpoint 'NH'.";

  var parts = [{ text: prompt }];

  if (base64Image) {
    parts.push({
      inlineData: {
        mimeType: mimeTypeImage || "image/jpeg",
        data: base64Image
      }
    });
  }

  if (base64Audio) {
    var audioMime = mimeTypeAudio || "audio/webm";
    if (audioMime === "application/octet-stream") audioMime = "audio/webm";
    // Poka-Yoke: Detección de cabeceras mágicas para evitar rechazos de formato en Gemini
    if (base64Audio.indexOf("UklGR") === 0) audioMime = "audio/wav";
    if (base64Audio.indexOf("SUQz") === 0) audioMime = "audio/mp3";

    parts.push({
      inlineData: {
        mimeType: audioMime,
        data: base64Audio
      }
    });
  }

  var payload = {
    contents: [{ parts: parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  // Jerarquía de modelos con fallback automático (Modelos activos 2026)
  var modelos = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest"];
  var ultimoError = "";

  for (var m = 0; m < modelos.length; m++) {
    var modelo = modelos[m];
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelo + ":generateContent?key=" + apiKey;
    try {
      var options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      var res = UrlFetchApp.fetch(url, options);
      var code = res.getResponseCode();
      var raw = res.getContentText();

      if (code === 200) {
        var jsonRes = JSON.parse(raw);
        if (jsonRes.candidates && jsonRes.candidates.length > 0 && jsonRes.candidates[0].content && jsonRes.candidates[0].content.parts) {
          var rawText = jsonRes.candidates[0].content.parts[0].text;
          var cleanText = rawText.replace(/```json/gi, "").replace(/```/gi, "").trim();
          var parsedObj = JSON.parse(cleanText);
          parsedObj.modelo_utilizado = modelo;
          Logger.log("✅ Respuesta exitosa de Gemini (" + modelo + ")");
          return parsedObj;
        }
      } else {
        ultimoError = "HTTP " + code + " en " + modelo + ": " + raw.substring(0, 300);
        Logger.log("⚠️ Fallo con modelo " + modelo + " (" + ultimoError + ")");
      }
    } catch (eMod) {
      ultimoError = "Excepción en " + modelo + ": " + eMod.message;
      Logger.log("⚠️ " + ultimoError);
    }
  }

  return { error: ultimoError || "Todos los modelos fallaron." };
}

/**
 * 🖼️ Helper para extraer la imagen desde Google Drive (Ruta AppSheet, ID o URL)
 */
function obtenerBlobImagenDesdeRuta_(rutaImagen) {
  if (!rutaImagen) return null;
  var rutaStr = String(rutaImagen).trim();
  if (!rutaStr) return null;

  try {
    var fileId = extraerFileIdDesdeUrl_(rutaStr);
    if (fileId) {
      var file = DriveApp.getFileById(fileId);
      return {
        base64: Utilities.base64Encode(file.getBlob().getBytes()),
        mimeType: file.getMimeType() || "image/jpeg"
      };
    }

    var nombreArchivo = rutaStr.indexOf("/") !== -1 ? rutaStr.split("/").pop() : rutaStr;
    var files = DriveApp.getFilesByName(nombreArchivo);
    if (files.hasNext()) {
      var f = files.next();
      return {
        base64: Utilities.base64Encode(f.getBlob().getBytes()),
        mimeType: f.getMimeType() || "image/jpeg"
      };
    }
  } catch (err) {
    Logger.log("⚠️ Error al obtener imagen (" + rutaImagen + "): " + err.message);
  }
  return null;
}

/**
 * 🔍 Extrae FileId de Google Drive desde varios formatos de URL o identificador crudo
 */
function extraerFileIdDesdeUrl_(url) {
  if (!url) return null;
  var urlStr = String(url).trim();
  var matchD = urlStr.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];
  var matchId = urlStr.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];
  if (/^[a-zA-Z0-9_-]{25,}$/.test(urlStr)) return urlStr;
  return null;
}

/**
 * 🛡️ Poka-Yoke: Garantiza columnas auxiliares en BD_APP_RUTA_2025 sin desfasar esquemas maestros
 */
function asegurarColumnasMultimodales_(ssRuta) {
  if (!ssRuta) return [];
  var columnasDeseadas = [
    { nombre: "Transcripcion_Voz", color: "#137333" },
    { nombre: "Dictamen_IA", color: "#1a73e8" },
    { nombre: "Checkpoint_Propuesto_IA", color: "#d93025" },
    { nombre: "Auditoria_Destinatario_IA", color: "#8e24aa" }
  ];

  var agregadasTotal = [];
  var nombresHojas = ["ENTREGA_MASIVA", "GUIAS_ASIGNADAS", "PIEZAS_PID"];

  for (var h = 0; h < nombresHojas.length; h++) {
    try {
      var hoja = ssRuta.getSheetByName(nombresHojas[h]);
      if (!hoja) continue;
      var lastCol = hoja.getLastColumn();
      if (lastCol < 1) continue;

      var cabeceras = hoja.getRange(1, 1, 1, lastCol).getValues()[0].map(function(c) {
        return String(c).trim().toLowerCase();
      });

      for (var c = 0; c < columnasDeseadas.length; c++) {
        var colInfo = columnasDeseadas[c];
        var colNom = colInfo.nombre;
        if (cabeceras.indexOf(colNom.toLowerCase()) === -1) {
          var nuevaColIdx = hoja.getLastColumn() + 1;
          var celda = hoja.getRange(1, nuevaColIdx);
          celda.setValue(colNom);
          celda.setFontWeight("bold");
          celda.setFontColor("#ffffff");
          celda.setBackground(colInfo.color);
          cabeceras.push(colNom.toLowerCase());
          agregadasTotal.push(nombresHojas[h] + " -> " + colNom);
          Logger.log("✅ Columna agregada a " + nombresHojas[h] + ": " + colNom + " en Col " + nuevaColIdx);
        }
      }
    } catch (eH) {
      Logger.log("⚠️ Error asegurando columnas en " + nombresHojas[h] + ": " + eH.message);
    }
  }
  return agregadasTotal;
}

// ====================================================================
// 🚀 ARQUITECTURA ASÍNCRONA TEOYOLOTL MIC: COLA Y EJECUCIÓN EN SEGUNDO PLANO
// ====================================================================

/**
 * 📥 Encola una tarea de audio en PropertiesService para ejecución en segundo plano
 */
function encolarTareaAudioGemini_(tarea) {
  var lock = LockService.getScriptLock();
  var gotLock = false;
  try {
    gotLock = lock.tryLock(5000);
    var props = PropertiesService.getScriptProperties();
    var colaRaw = props.getProperty("COLA_TEOYOLOTL_AUDIOS");
    var cola = [];
    if (colaRaw) {
      try { cola = JSON.parse(colaRaw); } catch(e) { cola = []; }
    }
    cola.push(tarea);
    props.setProperty("COLA_TEOYOLOTL_AUDIOS", JSON.stringify(cola));
  } catch(errCola) {
    Logger.log("⚠️ Error encolando tarea de audio: " + errCola.message);
  } finally {
    if (gotLock) {
      try { lock.releaseLock(); } catch(eL) {}
    }
  }

  // Disparar o verificar activador de segundo plano
  asegurarTriggerSegundoPlanoTeoyolotl_();
}

/**
 * ⚡ Asegura que exista un trigger para procesar la cola de audios en segundo plano
 */
function asegurarTriggerSegundoPlanoTeoyolotl_() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "ejecutarColaGeminiSegundoPlano") {
        return; // Ya existe trigger programado
      }
    }
    ScriptApp.newTrigger("ejecutarColaGeminiSegundoPlano")
      .timeBased()
      .after(100)
      .create();
  } catch (errTrig) {
    Logger.log("⚠️ Error asegurando trigger de segundo plano: " + errTrig.message);
  }
}

/**
 * 🧠 Ejecutor de la cola de procesamiento Gemini 3.6 Flash y Bóveda en segundo plano
 */
function ejecutarColaGeminiSegundoPlano() {
  // 1. Limpiar triggers temporales de 'ejecutarColaGeminiSegundoPlano'
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      var trig = triggers[i];
      if (trig.getHandlerFunction() === "ejecutarColaGeminiSegundoPlano" && trig.getEventType() === ScriptApp.EventType.CLOCK) {
        try { ScriptApp.deleteTrigger(trig); } catch(eD) {}
      }
    }
  } catch (eTrigs) {
    Logger.log("⚠️ Error limpiando triggers temporales: " + eTrigs.message);
  }

  // 2. Extraer tareas atómicamente de PropertiesService
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    Logger.log("⚠️ No se obtuvo lock para procesar cola de audios.");
    return { status: "LOCKED" };
  }

  var props = PropertiesService.getScriptProperties();
  var colaRaw = props.getProperty("COLA_TEOYOLOTL_AUDIOS");
  if (!colaRaw) {
    lock.releaseLock();
    return { status: "EMPTY" };
  }

  var cola = [];
  try {
    cola = JSON.parse(colaRaw);
  } catch(eParse) {
    Logger.log("⚠️ Error parseando cola: " + eParse.message);
  }

  props.deleteProperty("COLA_TEOYOLOTL_AUDIOS");
  lock.releaseLock();

  if (!cola || cola.length === 0) return { status: "EMPTY" };

  Logger.log("🎙️ [Segundo Plano] Procesando " + cola.length + " audios con Gemini 3.6 Flash...");

  var resultados = [];
  for (var c = 0; c < cola.length; c++) {
    try {
      var resItem = procesarAudioItemGemini_(cola[c]);
      resultados.push(resItem);
    } catch (errItem) {
      Logger.log("❌ Error procesando item " + cola[c].idRegistro + ": " + errItem.message);
      resultados.push({ idRegistro: cola[c].idRegistro, error: errItem.message });
    }
  }

  return { status: "OK", procesados: resultados.length, resultados: resultados };
}

/**
 * 🛠️ Procesa un elemento individual de audio en segundo plano:
 * - Invoca a Gemini 3.6 Flash con prompt multimodal de peritaje logístico
 * - Asienta resultados en ENTREGA_MASIVA, PIEZAS_PID, GUIAS_ASIGNADAS en BD_APP_RUTA_2025
 * - Asienta comentario en VALIDACIÓN_QRO_2025 (Col K, 25 columnas intactas)
 */
function procesarAudioItemGemini_(tarea) {
  var idRegistro = tarea.idRegistro || "";
  var choferEmail = tarea.choferEmail || "";
  var appSheetRelativePath = tarea.appSheetRelativePath || "";
  var fileUrl = tarea.fileUrl || "";
  var fotoEvidenciaRuta = tarea.foto_fachada || "";
  var base64Audio = "";
  var audioMime = tarea.audio_mimetype || "audio/webm";

  if (tarea.audio_base64) {
    var rawParts = String(tarea.audio_base64).split(",");
    base64Audio = rawParts.length > 1 ? rawParts[1] : rawParts[0];
  } else if (tarea.fileAudioId) {
    try {
      var fileAudio = DriveApp.getFileById(tarea.fileAudioId);
      base64Audio = Utilities.base64Encode(fileAudio.getBlob().getBytes());
      if (fileAudio.getMimeType()) {
        audioMime = fileAudio.getMimeType();
      }
    } catch(eFile) {
      Logger.log("⚠️ Error leyendo audio file desde Drive: " + eFile.message);
    }
  }

  if (!base64Audio && !tarea.foto_base64 && !fotoEvidenciaRuta) {
    Logger.log("ℹ️ Item sin audio ni foto multimodal para: " + idRegistro);
  }

  var actualizadoEnRuta = false;
  var pidsAsociados = [];
  var guiasAsociadas = [];
  var rowMasivaIdx = -1;
  var comentarioExistenteMasivo = "";
  var esMasivo = false;

  try {
    var idBdRuta = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
    var ssRuta = SpreadsheetApp.openById(idBdRuta);

    // Garantizar existencia de columnas auxiliares en BD_APP_RUTA_2025
    asegurarColumnasMultimodales_(ssRuta);

    // 1. CASO ENTREGA MASIVA (ID_Masivo)
    var hojaMasiva = ssRuta.getSheetByName("ENTREGA_MASIVA");
    var colMasId = -1, colMasAudio = -1, colMasFoto = -1, colMasComentarios = -1;
    var colMasTrans = -1, colMasDictamen = -1, colMasPropuesto = -1, colMasRecibe = -1;
    var dataMasiva = null;

    if (hojaMasiva && hojaMasiva.getLastRow() > 1) {
      dataMasiva = hojaMasiva.getDataRange().getValues();
      var cabMasiva = dataMasiva[0].map(function(h) { return String(h).trim().toLowerCase(); });
      colMasId = cabMasiva.indexOf("id_masivo");
      colMasAudio = cabMasiva.indexOf("audio_evidencia");
      colMasFoto = cabMasiva.indexOf("foto_fachada");
      if (colMasFoto === -1) colMasFoto = cabMasiva.indexOf("imagen_fachada");
      if (colMasFoto === -1) colMasFoto = cabMasiva.indexOf("foto_evidencia");
      if (colMasFoto === -1) colMasFoto = cabMasiva.indexOf("imagen");
      colMasComentarios = cabMasiva.indexOf("comentarios");
      colMasTrans = cabMasiva.indexOf("transcripcion_voz");
      colMasDictamen = cabMasiva.indexOf("dictamen_ia");
      colMasPropuesto = cabMasiva.indexOf("checkpoint_propuesto_ia");
      colMasRecibe = cabMasiva.indexOf("quien_recibe");
      if (colMasRecibe === -1) colMasRecibe = cabMasiva.indexOf("destinatario");

      if (colMasId !== -1) {
        for (var m = 1; m < dataMasiva.length; m++) {
          if (String(dataMasiva[m][colMasId]).trim() === String(idRegistro).trim()) {
            esMasivo = true;
            rowMasivaIdx = m + 1;
            if (!fotoEvidenciaRuta && colMasFoto !== -1) {
              fotoEvidenciaRuta = String(dataMasiva[m][colMasFoto] || "").trim();
            }
            if (colMasComentarios !== -1) {
              comentarioExistenteMasivo = String(dataMasiva[m][colMasComentarios] || "").trim();
            }
            if (colMasAudio !== -1) {
              hojaMasiva.getRange(rowMasivaIdx, colMasAudio + 1).setValue(appSheetRelativePath);
            }
            break;
          }
        }
      }
    }

    // Si fue masivo, rastrear todos los PIDs de ese ID_Masivo en PIEZAS_ESCANEADAS_MASIVAS
    if (esMasivo) {
      var hojaEscaneadas = ssRuta.getSheetByName("PIEZAS_ESCANEADAS_MASIVAS");
      if (hojaEscaneadas && hojaEscaneadas.getLastRow() > 1) {
        var dataEsc = hojaEscaneadas.getDataRange().getValues();
        var cabEsc = dataEsc[0].map(function(h) { return String(h).trim().toLowerCase(); });
        var colEscPid = cabEsc.indexOf("pid_codigo");
        if (colEscPid === -1) colEscPid = cabEsc.indexOf("pid");
        var colEscIdMas = cabEsc.indexOf("id_masivo");

        if (colEscPid !== -1 && colEscIdMas !== -1) {
          for (var eIdx = 1; eIdx < dataEsc.length; eIdx++) {
            if (String(dataEsc[eIdx][colEscIdMas]).trim() === String(idRegistro).trim()) {
              var pCode = String(dataEsc[eIdx][colEscPid]).trim();
              if (pCode && pidsAsociados.indexOf(pCode) === -1) {
                pidsAsociados.push(pCode);
              }
            }
          }
        }
      }
    } else {
      pidsAsociados.push(String(idRegistro).trim());
    }

    // 2. ACTUALIZAR EN PIEZAS_PID Y RASTREAR GUÍAS
    var hojaPids = ssRuta.getSheetByName("PIEZAS_PID");
    var dataPids = null;
    var colPidCod = -1, colPidHwb = -1, colPidAudio = -1, colPidComentarios = -1;

    if (hojaPids && hojaPids.getLastRow() > 1) {
      dataPids = hojaPids.getDataRange().getValues();
      var cabPids = dataPids[0].map(function(h) { return String(h).trim().toLowerCase(); });
      colPidCod = cabPids.indexOf("pid_codigo");
      if (colPidCod === -1) colPidCod = cabPids.indexOf("pid");
      colPidHwb = cabPids.indexOf("hwb_guia");
      if (colPidHwb === -1) colPidHwb = cabPids.indexOf("guia");
      colPidAudio = cabPids.indexOf("audio_evidencia_pid");
      if (colPidAudio === -1) colPidAudio = cabPids.indexOf("audio_evidencia");
      colPidComentarios = cabPids.indexOf("comentarios_chofer_pid");
      if (colPidComentarios === -1) colPidComentarios = cabPids.indexOf("comentarios_chofer");

      for (var p = 1; p < dataPids.length; p++) {
        var currPid = colPidCod !== -1 ? String(dataPids[p][colPidCod]).trim() : "";
        var currHwb = colPidHwb !== -1 ? String(dataPids[p][colPidHwb]).trim() : "";
        var idSanitizado = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(currPid) : currPid;

        var matchPid = false;
        if (currPid && pidsAsociados.indexOf(currPid) !== -1) matchPid = true;
        if (idSanitizado && pidsAsociados.indexOf(idSanitizado) !== -1) matchPid = true;
        if (currHwb && (pidsAsociados.indexOf(currHwb) !== -1 || String(idRegistro).trim() === currHwb)) matchPid = true;

        if (matchPid) {
          if (colPidAudio !== -1) {
            hojaPids.getRange(p + 1, colPidAudio + 1).setValue(appSheetRelativePath);
          }
          actualizadoEnRuta = true;
          if (currHwb && guiasAsociadas.indexOf(currHwb) === -1) {
            guiasAsociadas.push(currHwb);
          }
        }
      }
    }

    if (guiasAsociadas.length === 0 && !esMasivo) {
      guiasAsociadas.push(String(idRegistro).trim());
    }

    // 3. INSPECCIONAR GUIAS_ASIGNADAS PARA BUSCAR FOTO (SI NO SE ENCONTRÓ EN ENTREGA_MASIVA)
    var hojaGuias = ssRuta.getSheetByName("GUIAS_ASIGNADAS");
    var dataGuias = null;
    var colKey = -1, colHwb = -1, colAudio = -1, colFotoGuia = -1, colComentariosGuia = -1;
    var colTransGuia = -1, colDictamenGuia = -1, colPropuestoGuia = -1;

    if (hojaGuias && hojaGuias.getLastRow() > 1) {
      dataGuias = hojaGuias.getDataRange().getValues();
      var cabecerasGuias = dataGuias[0].map(function(h) { return String(h).trim().toLowerCase(); });
      colKey = cabecerasGuias.indexOf("key_ruta");
      colHwb = cabecerasGuias.indexOf("hwb_guia");
      colAudio = cabecerasGuias.indexOf("audio_evidencia");
      colFotoGuia = cabecerasGuias.indexOf("foto_fachada_paquete");
      if (colFotoGuia === -1) colFotoGuia = cabecerasGuias.indexOf("foto_fachada");
      if (colFotoGuia === -1) colFotoGuia = cabecerasGuias.indexOf("foto_evidencia");
      colComentariosGuia = cabecerasGuias.indexOf("comentarios_chofer");
      if (colComentariosGuia === -1) colComentariosGuia = cabecerasGuias.indexOf("comentarios");
      colTransGuia = cabecerasGuias.indexOf("transcripcion_voz");
      colDictamenGuia = cabecerasGuias.indexOf("dictamen_ia");
      colPropuestoGuia = cabecerasGuias.indexOf("checkpoint_propuesto_ia");

      if (!fotoEvidenciaRuta && colFotoGuia !== -1) {
        for (var g0 = 1; g0 < dataGuias.length; g0++) {
          var gKey0 = colKey !== -1 ? String(dataGuias[g0][colKey]).trim() : "";
          var gHwb0 = colHwb !== -1 ? String(dataGuias[g0][colHwb]).trim() : "";
          if (guiasAsociadas.indexOf(gHwb0) !== -1 || guiasAsociadas.indexOf(gKey0) !== -1 || gKey0 === String(idRegistro).trim() || gHwb0 === String(idRegistro).trim()) {
            var fCandidate = String(dataGuias[g0][colFotoGuia] || "").trim();
            if (fCandidate) {
              fotoEvidenciaRuta = fCandidate;
              break;
            }
          }
        }
      }
    }

    // ==========================================
    // 🧠 MOTOR MULTIMODAL GEMINI 3.6 FLASH (AUDIO + FOTO)
    // ==========================================
    var imgData = null;
    if (tarea.foto_base64) {
      imgData = {
        base64: tarea.foto_base64,
        mimeType: tarea.foto_mimetype || "image/jpeg"
      };
    } else if (fotoEvidenciaRuta) {
      imgData = obtenerBlobImagenDesdeRuta_(fotoEvidenciaRuta);
    }

    var contextoAuditoria = {
      destinatario_esperado: tarea.destinatario_esperado || "",
      nombre_recibe: tarea.nombre_recibe || "",
      direccion_esperada: tarea.direccion_esperada || "",
      cp_esperado: tarea.cp_esperado || "",
      estatus_reportado: tarea.estatus_reportado || "OK",
      antecedentes_amoxcalli: tarea.antecedentes_amoxcalli || null
    };

    var respuestaIA = null;
    var errorIA = "";
    try {
      var resObj = llamarApiGeminiMultimodal_(
        imgData ? imgData.base64 : null,
        imgData ? imgData.mimeType : null,
        base64Audio,
        audioMime,
        contextoAuditoria
      );
      if (resObj && resObj.error) {
        errorIA = resObj.error;
        Logger.log("⚠️ Fallo en Gemini: " + errorIA);
      } else {
        respuestaIA = resObj;
      }
    } catch (errGem) {
      errorIA = errGem.message;
      Logger.log("⚠️ Error en llamada a Gemini: " + errGem.message);
    }

    var transcripcion = "";
    var dictamen = "VALIDADA";
    var categoriaIncidencia = "NINGUNO";
    var checkpointPropuesto = "OK";
    var comentariosIA = "";
    var nombreRecibeIA = "";
    var evaluacionDestinatario = "TITULAR_CONFIRMADO";
    var scoreConfianza = 90;

    if (respuestaIA) {
      transcripcion = String(respuestaIA.transcripcion_audio || "").trim();
      var estatusIA = String(respuestaIA.estatus || "VALIDADA").trim().toUpperCase();
      categoriaIncidencia = String(respuestaIA.categoria_incidencia || "NINGUNO").trim().toUpperCase();
      if (categoriaIncidencia === "NINGUNO" || categoriaIncidencia === "NONE" || categoriaIncidencia === "N/A") {
        categoriaIncidencia = "";
      }
      evaluacionDestinatario = String(respuestaIA.evaluacion_destinatario || "TITULAR_CONFIRMADO").trim().toUpperCase();
      scoreConfianza = parseInt(respuestaIA.score_confianza) || 85;

      dictamen = (estatusIA === "VALIDADA" || estatusIA === "OK") ? "VALIDADA" : "INCIDENCIA";
      if (categoriaIncidencia) {
        dictamen += " [" + categoriaIncidencia + "]";
      } else if (evaluacionDestinatario) {
        dictamen += " [" + evaluacionDestinatario + "]";
      }
      checkpointPropuesto = String(respuestaIA.checkpoint_propuesto_ia || (dictamen.indexOf("INCIDENCIA") !== -1 ? "NH" : "OK")).trim().toUpperCase();
      comentariosIA = String(respuestaIA.comentarios || "").trim();
      nombreRecibeIA = String(respuestaIA.nombre_recibe || "").trim();
    } else {
      transcripcion = "[AUDIO REGISTRADO]";
      dictamen = "VALIDADA [SIN_IA]";
      checkpointPropuesto = "OK";
      evaluacionDestinatario = "PENDIENTE_AUDITORIA";
      comentariosIA = "Evidencia de voz grabada en Bóveda." + (errorIA ? " (" + errorIA + ")" : "");
    }

    var auditoriaDestinatarioTexto = evaluacionDestinatario + " (" + scoreConfianza + "%)";

    // 4. ASENTAR RESULTADOS EN ENTREGA_MASIVA
    if (esMasivo && rowMasivaIdx > 1 && hojaMasiva) {
      if (colMasTrans !== -1 && transcripcion) {
        hojaMasiva.getRange(rowMasivaIdx, colMasTrans + 1).setValue(transcripcion);
      }
      if (colMasDictamen !== -1 && dictamen) {
        hojaMasiva.getRange(rowMasivaIdx, colMasDictamen + 1).setValue(dictamen);
      }
      if (colMasPropuesto !== -1 && checkpointPropuesto) {
        hojaMasiva.getRange(rowMasivaIdx, colMasPropuesto + 1).setValue(checkpointPropuesto);
      }
      if (colMasComentarios !== -1) {
        var nuevoComentarioMas = comentarioExistenteMasivo;
        var apendiceMas = "";
        if (transcripcion && transcripcion !== "SIN_TESTIMONIO_DE_VOZ") {
          apendiceMas += " [VOZ]: " + transcripcion;
        }
        if (comentariosIA) {
          apendiceMas += " | [IA]: " + comentariosIA;
        }
        if (apendiceMas) {
          nuevoComentarioMas = nuevoComentarioMas ? (nuevoComentarioMas + " |" + apendiceMas) : apendiceMas.trim();
          hojaMasiva.getRange(rowMasivaIdx, colMasComentarios + 1).setValue(nuevoComentarioMas);
        }
      }
      if (colMasRecibe !== -1 && nombreRecibeIA && dataMasiva) {
        var recibeActual = String(dataMasiva[rowMasivaIdx - 1][colMasRecibe] || "").trim();
        if (!recibeActual) {
          hojaMasiva.getRange(rowMasivaIdx, colMasRecibe + 1).setValue(nombreRecibeIA);
        }
      }
      actualizadoEnRuta = true;
    }

    // 5. ASENTAR RESULTADOS EN GUIAS_ASIGNADAS
    if (hojaGuias && dataGuias && dataGuias.length > 1) {
      for (var g = 1; g < dataGuias.length; g++) {
        var rowKey = colKey !== -1 ? String(dataGuias[g][colKey]).trim() : "";
        var rowHwb = colHwb !== -1 ? String(dataGuias[g][colHwb]).trim() : "";

        var matchGuia = (guiasAsociadas.indexOf(rowHwb) !== -1 || guiasAsociadas.indexOf(rowKey) !== -1 ||
                         rowKey === String(idRegistro).trim() || rowHwb === String(idRegistro).trim());
        if (matchGuia) {
          if (colAudio !== -1) {
            hojaGuias.getRange(g + 1, colAudio + 1).setValue(appSheetRelativePath);
          }
          if (colTransGuia !== -1 && transcripcion) {
            hojaGuias.getRange(g + 1, colTransGuia + 1).setValue(transcripcion);
          }
          if (colDictamenGuia !== -1 && dictamen) {
            hojaGuias.getRange(g + 1, colDictamenGuia + 1).setValue(dictamen);
          }
          if (colPropuestoGuia !== -1 && checkpointPropuesto) {
            hojaGuias.getRange(g + 1, colPropuestoGuia + 1).setValue(checkpointPropuesto);
          }
          var colAuditDestG = cabecerasGuias.indexOf("auditoria_destinatario_ia");
          if (colAuditDestG !== -1 && auditoriaDestinatarioTexto) {
            hojaGuias.getRange(g + 1, colAuditDestG + 1).setValue(auditoriaDestinatarioTexto);
          }
          if (colComentariosGuia !== -1) {
            var comGuiaExist = String(dataGuias[g][colComentariosGuia] || "").trim();
            var apendiceGuia = "";
            if (transcripcion && transcripcion !== "SIN_TESTIMONIO_DE_VOZ") {
              apendiceGuia += " [VOZ]: " + transcripcion;
            }
            if (comentariosIA) {
              apendiceGuia += " | [IA]: " + comentariosIA;
            }
            if (apendiceGuia) {
              var comGuiaFinal = comGuiaExist ? (comGuiaExist + " |" + apendiceGuia) : apendiceGuia.trim();
              hojaGuias.getRange(g + 1, colComentariosGuia + 1).setValue(comGuiaFinal);
            }
          }
          actualizadoEnRuta = true;
        }
      }
    }

    // 6. ASENTAR COMENTARIOS EN PIEZAS_PID
    if (hojaPids && dataPids && dataPids.length > 1 && colPidComentarios !== -1 && transcripcion && transcripcion !== "SIN_TESTIMONIO_DE_VOZ") {
      for (var p2 = 1; p2 < dataPids.length; p2++) {
        var pCode2 = colPidCod !== -1 ? String(dataPids[p2][colPidCod]).trim() : "";
        var pHwb2 = colPidHwb !== -1 ? String(dataPids[p2][colPidHwb]).trim() : "";
        var pSan2 = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(pCode2) : pCode2;

        var matchPid2 = (pidsAsociados.indexOf(pCode2) !== -1 || (pSan2 && pidsAsociados.indexOf(pSan2) !== -1) ||
                         (pHwb2 && guiasAsociadas.indexOf(pHwb2) !== -1));
        if (matchPid2) {
          var comPidExist = String(dataPids[p2][colPidComentarios] || "").trim();
          var comPidFinal = comPidExist ? (comPidExist + " | [VOZ]: " + transcripcion) : ("[VOZ]: " + transcripcion);
          hojaPids.getRange(p2 + 1, colPidComentarios + 1).setValue(comPidFinal);
        }
      }
    }

  } catch(errRuta) {
    Logger.log("⚠️ Error al asentar en BD_APP_RUTA_2025: " + errRuta.message);
  }

  // 7. ACTUALIZAR EN VALIDACIÓN_QRO_2025 (COLUMNA K - ÍNDICE 10: COMENTARIOS)
  // 🛡️ REGLA MAESTRA: Esquema rígido de 25 columnas intacto. Prohibido agregar columnas.
  try {
    var libroVal = null;
    try {
      libroVal = SpreadsheetApp.openById("1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M");
    } catch(eOpenVal) {
      libroVal = SpreadsheetApp.getActiveSpreadsheet();
    }
    if (libroVal && libroVal.getSheetByName) {
      var hojaVal = libroVal.getSheetByName("VALIDACIÓN_QRO_2025") || libroVal.getSheets()[0];
      if (hojaVal && hojaVal.getLastRow() > 1) {
        var dataVal = hojaVal.getDataRange().getValues();
        var cabVal = dataVal[0].map(function(h) { return String(h).trim().toLowerCase(); });
        var colValGuia = cabVal.indexOf("guia");
        if (colValGuia === -1) colValGuia = cabVal.indexOf("guía");
        var colValPid = cabVal.indexOf("pid");
        var colValComentarios = cabVal.indexOf("comentarios");
        if (colValComentarios === -1) colValComentarios = 10; // Índice 10 = Columna K

        for (var v = 1; v < dataVal.length; v++) {
          var vGuia = colValGuia !== -1 ? String(dataVal[v][colValGuia]).trim() : "";
          var vPid = colValPid !== -1 ? String(dataVal[v][colValPid]).trim() : "";
          var idSanitizadoVal = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(vPid) : vPid;

          var coincide = false;
          if (vGuia && (guiasAsociadas.indexOf(vGuia) !== -1 || vGuia === String(idRegistro).trim())) {
            coincide = true;
          }
          if (vPid && (pidsAsociados.indexOf(vPid) !== -1 || (idSanitizadoVal && pidsAsociados.indexOf(idSanitizadoVal) !== -1))) {
            coincide = true;
          }

          if (coincide) {
            var comValExist = String(dataVal[v][colValComentarios] || "").trim();
            var apendiceVal = "";
            if (transcripcion && transcripcion !== "SIN_TESTIMONIO_DE_VOZ") {
              apendiceVal += " [VOZ]: " + transcripcion;
            }
            if (comentariosIA) {
              apendiceVal += " | [IA]: " + comentariosIA;
            }
            if (apendiceVal) {
              var comValFinal = comValExist ? (comValExist + " |" + apendiceVal) : apendiceVal.trim();
              hojaVal.getRange(v + 1, colValComentarios + 1).setValue(comValFinal);
            }
          }
        }
      }
    }
  } catch(errVal) {
    Logger.log("⚠️ Error al asentar en VALIDACIÓN_QRO_2025: " + errVal.message);
  }

  // 8. ASENTAR RESULTADOS EN OLLIN_OPERACIONES_2026 (RUTA_OLLINQUI)
  try {
    var ID_OLLIN_OPERACIONES_2026 = "1njJIZBtYVqwtyNS-1SkeTMxDh7y6RctH2yoL0vXltbk";
    var ssOllin2026 = SpreadsheetApp.openById(ID_OLLIN_OPERACIONES_2026);
    var shRutaOllin = ssOllin2026.getSheetByName("RUTA_OLLINQUI");
    if (shRutaOllin && shRutaOllin.getLastRow() > 1) {
      var maxCols = shRutaOllin.getLastColumn();
      if (maxCols < 13 || String(shRutaOllin.getRange(1, 13).getValue()).trim() === "") {
        shRutaOllin.getRange(1, 13).setValue("Transcripcion_Voz");
      }
      if (maxCols < 14 || String(shRutaOllin.getRange(1, 14).getValue()).trim() === "") {
        shRutaOllin.getRange(1, 14).setValue("Interpretacion_IA");
      }

      var oData = shRutaOllin.getDataRange().getValues();
      var oHeaders = oData[0].map(function(h) { return String(h).trim().toLowerCase(); });
      var idxOPid = getHeaderIndex_(oHeaders, "id_pieza", 1);
      var idxOGuia = getHeaderIndex_(oHeaders, "id_guia", 2);
      var idxOAudio = getHeaderIndex_(oHeaders, "url_audio_teoyolotl", 7);
      var idxOTrans = 12; // Col M
      var idxODictamen = 13; // Col N

      for (var rO = 1; rO < oData.length; rO++) {
        var rPid = idxOPid !== -1 ? String(oData[rO][idxOPid] || "").trim() : "";
        var rPidSan = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(rPid) : rPid;
        var rGuia = idxOGuia !== -1 ? String(oData[rO][idxOGuia] || "").trim() : "";
        var rAudio = idxOAudio !== -1 ? String(oData[rO][idxOAudio] || "").trim() : "";

        var matchOllin = false;
        if (appSheetRelativePath && rAudio && rAudio === appSheetRelativePath) {
          matchOllin = true;
        } else if (pidsAsociados.indexOf(rPid) !== -1 || (rPidSan && pidsAsociados.indexOf(rPidSan) !== -1)) {
          matchOllin = true;
        } else if (guiasAsociadas.indexOf(rGuia) !== -1 || (rGuia && rGuia === String(idRegistro).trim())) {
          matchOllin = true;
        }

        if (matchOllin) {
          if (transcripcion) {
            shRutaOllin.getRange(rO + 1, idxOTrans + 1).setValue(transcripcion);
          }
          var txtDictamen = dictamen + (comentariosIA ? (" - " + comentariosIA) : "");
          shRutaOllin.getRange(rO + 1, idxODictamen + 1).setValue(txtDictamen);
        }
      }
    }
  } catch(eOllinUpd) {
    Logger.log("⚠️ Error actualizando IA en RUTA_OLLINQUI: " + eOllinUpd.message);
  }

  SpreadsheetApp.flush();
  Logger.log("✅ [Segundo Plano] Audio procesado exitosamente para: " + idRegistro + " | Dictamen: " + dictamen);
  return {
    exito: true,
    idRegistro: idRegistro,
    transcripcion: transcripcion,
    dictamen: dictamen,
    checkpoint: checkpointPropuesto,
    actualizadoEnRuta: actualizadoEnRuta
  };
}

/**
 * 🛠️ Cron de seguridad para la cola de Teoyolotl Mic (cada 1 minuto)
 */
function instalarCronColaAudioTeoyolotl() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "ejecutarColaGeminiSegundoPlano" && triggers[i].getEventType() === ScriptApp.EventType.CLOCK) {
      return { status: "OK", message: "Trigger cron ya instalado previamente", triggerId: triggers[i].getUniqueId() };
    }
  }
  var t = ScriptApp.newTrigger("ejecutarColaGeminiSegundoPlano")
    .timeBased()
    .everyMinutes(1)
    .create();
  return { status: "OK", message: "Trigger cron de 1 minuto instalado exitosamente", triggerId: t.getUniqueId() };
}

/**
 * ====================================================================
 * 🚀 PROCESAMIENTO OFFLINE DE ENTREGA MASIVA (MINI-PWA OBSIDIANA v2.0)
 * Mapeo Dinámico de Encabezados / Teoyolotl Mic / Blindaje Poka-Yoke
 * ====================================================================
 */
function getHeaderIndex_(headers, name, fallbackIdx) {
  if (!headers || !headers.length) return fallbackIdx !== undefined ? fallbackIdx : -1;
  var target = String(name).trim().toLowerCase().replace(/[\s_\-\.\(\)]/g, "");
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).trim().toLowerCase().replace(/[\s_\-\.\(\)]/g, "");
    if (h === target) return i;
  }
  for (var j = 0; j < headers.length; j++) {
    var hj = String(headers[j]).trim().toLowerCase().replace(/[\s_\-\.\(\)]/g, "");
    if (hj.indexOf(target) !== -1 || target.indexOf(hj) !== -1) return j;
  }
  return fallbackIdx !== undefined ? fallbackIdx : -1;
}

function procesarSincronizacionEntregaMasivaOffline_(loteData) {
  var ID_BD_APP_RUTA_2025 = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
  var ss = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
  
  var idMasivo = String(loteData.idMasivo || ("MASIVO_" + Utilities.formatDate(new Date(), "America/Mexico_City", "yyyyMMdd_HHmmss"))).trim();
  var chofer = String(loteData.chofer || "").trim();
  var fechaHora = loteData.fechaHora ? new Date(loteData.fechaHora) : new Date();
  var nombreRecibe = String(loteData.nombreRecibe || "").trim();
  var rawPiezas = loteData.piezas || [];
  
  // 1. Guardar archivos de Firma, Foto y Audio en Drive si vienen en Base64 (Carpeta Canónica GUIAS_ASIGNADAS_Files)
  var firmaRelPath = "";
  var fotoRelPath = "";
  var audioRelPath = "";
  var fileAudioId = "";
  var fileAudioUrl = "";
  
  // Guardar Firma
  if (loteData.firma && String(loteData.firma).indexOf("data:image") !== -1) {
    try {
      var parts = String(loteData.firma).split(",");
      var base64Data = parts.length > 1 ? parts[1] : parts[0];
      var bytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(bytes, "image/png", "Firma_" + idMasivo + ".png");
      var carpeta = obtenerOCrearCarpetaDrive_("GUIAS_ASIGNADAS_Files");
      var file = carpeta.createFile(blob);
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e){}
      firmaRelPath = "GUIAS_ASIGNADAS_Files/" + file.getName();
    } catch(eFirma) {
      Logger.log("⚠️ Error guardando firma: " + eFirma);
    }
  }
  
  // Guardar Foto Fachada
  if (loteData.foto && String(loteData.foto).indexOf("data:image") !== -1) {
    try {
      var partsFoto = String(loteData.foto).split(",");
      var base64DataFoto = partsFoto.length > 1 ? partsFoto[1] : partsFoto[0];
      var bytesFoto = Utilities.base64Decode(base64DataFoto);
      var blobFoto = Utilities.newBlob(bytesFoto, "image/jpeg", "Foto_" + idMasivo + ".jpg");
      var carpetaFoto = obtenerOCrearCarpetaDrive_("GUIAS_ASIGNADAS_Files");
      var fileFoto = carpetaFoto.createFile(blobFoto);
      try { fileFoto.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e){}
      fotoRelPath = "GUIAS_ASIGNADAS_Files/" + fileFoto.getName();
    } catch(eFoto) {
      Logger.log("⚠️ Error guardando foto: " + eFoto);
    }
  }

  // Guardar Audio (Teoyolotl Mic)
  var rawAudio = loteData.audio || loteData.audio_base64 || "";
  if (rawAudio) {
    try {
      var audioParts = String(rawAudio).split(",");
      var audioBase64 = audioParts.length > 1 ? audioParts[1] : audioParts[0];
      var audioMime = "audio/webm";
      if (String(rawAudio).indexOf("audio/mp4") !== -1 || String(rawAudio).indexOf("audio/m4a") !== -1) audioMime = "audio/mp4";
      else if (String(rawAudio).indexOf("audio/wav") !== -1) audioMime = "audio/wav";
      
      var audioBytes = Utilities.base64Decode(audioBase64);
      var ext = audioMime.indexOf("mp4") !== -1 ? ".m4a" : (audioMime.indexOf("wav") !== -1 ? ".wav" : ".webm");
      var blobAudio = Utilities.newBlob(audioBytes, audioMime, "Audio_" + idMasivo + ext);
      var carpetaAudio = obtenerOCrearCarpetaDrive_("GUIAS_ASIGNADAS_Files");
      var fileAudio = carpetaAudio.createFile(blobAudio);
      try { fileAudio.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e){}
      audioRelPath = "GUIAS_ASIGNADAS_Files/" + fileAudio.getName();
      fileAudioId = fileAudio.getId();
      fileAudioUrl = fileAudio.getUrl();
    } catch(eAudio) {
      Logger.log("⚠️ Error guardando audio: " + eAudio);
    }
  }

  // 🏛️ FASE 1: DESACOPLAMIENTO TOTAL - TABLAS INTERMEDIAS ELIMINADAS (100% MEMORIA LOCAL -> SINCRONIZACIÓN ATÓMICA DIRECTA)
  // Las tablas 'ENTREGA_MASIVA' y 'PIEZAS_ESCANEADAS_MASIVAS' han sido desincorporadas de la arquitectura productiva.
  var pidsActualizados = [];
  rawPiezas.forEach(function(p, idx) {
    var pidSanitizado = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(p.pid || p.raw || "") : String(p.pid || p.raw || "");
    var estatus = String(p.estatus || "OK").trim().toUpperCase();
    pidsActualizados.push({ pid: pidSanitizado, estatus: estatus, raw: (p.raw || p.pid || "") });
  });

  // 4. Actualizar PIEZAS_PID (Mapeo Dinámico & Preservación Inmutable de Escaneo_Validacion = A_BORDO)
  var sheetPID = ss.getSheetByName("PIEZAS_PID");
  var guiasImpactadas = {};
  
  if (sheetPID && pidsActualizados.length > 0) {
    var pHeaders = sheetPID.getRange(1, 1, 1, sheetPID.getLastColumn()).getValues()[0];
    var idxHwbPID = getHeaderIndex_(pHeaders, "HWB_Guia", 0);
    var idxPidPID = getHeaderIndex_(pHeaders, "PID_Codigo", 1);
    var idxEstPID = getHeaderIndex_(pHeaders, "Estatus_PID", 3);
    var idxEscaneoPID = getHeaderIndex_(pHeaders, "Escaneo_Validacion", 4); // 🔒 CANDADO INMUTABLE
    var idxRcvrPID = getHeaderIndex_(pHeaders, "Nombre_Recibe_PID", 5);
    var idxFirmaPID = getHeaderIndex_(pHeaders, "Firma_Evidencia_PID", 6);
    var idxFotoPID = getHeaderIndex_(pHeaders, "Foto_Fachada_PID", 7);
    var idxTimePID = getHeaderIndex_(pHeaders, "Timestamp_Entrega_PID", 11);
    var idxAudioPID = getHeaderIndex_(pHeaders, "Audio_Evidencia_PID", 12);

    var dataPID = sheetPID.getDataRange().getValues();
    var pidMap = {};
    pidsActualizados.forEach(function(item) { pidMap[item.pid] = item.estatus; });
    
    for (var r = 1; r < dataPID.length; r++) {
      var pidEnFila = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(String(dataPID[r][idxPidPID] || "")) : String(dataPID[r][idxPidPID] || "");
      if (pidMap[pidEnFila]) {
        var estatusNuevo = pidMap[pidEnFila];
        var hwb = String(dataPID[r][idxHwbPID] || "").trim();
        if (hwb) guiasImpactadas[hwb] = true;
        
        // Actualizar Estatus_PID dinámico
        if (idxEstPID !== -1) sheetPID.getRange(r + 1, idxEstPID + 1).setValue(estatusNuevo);
        
        // 🛡️ REGLA INVIOLABLE: Escaneo_Validacion NUNCA se degrada ni sobreescribe
        // (idxEscaneoPID permanece intacto)

        if (nombreRecibe && (estatusNuevo === "OK" || estatusNuevo === "PD") && idxRcvrPID !== -1) {
          sheetPID.getRange(r + 1, idxRcvrPID + 1).setValue(nombreRecibe);
        }
        if (firmaRelPath && (estatusNuevo === "OK" || estatusNuevo === "PD") && idxFirmaPID !== -1) {
          sheetPID.getRange(r + 1, idxFirmaPID + 1).setValue(firmaRelPath);
        }
        if (fotoRelPath && idxFotoPID !== -1) {
          sheetPID.getRange(r + 1, idxFotoPID + 1).setValue(fotoRelPath);
        }
        if (idxTimePID !== -1) {
          sheetPID.getRange(r + 1, idxTimePID + 1).setValue(fechaHora);
        }
        if (audioRelPath && idxAudioPID !== -1) {
          sheetPID.getRange(r + 1, idxAudioPID + 1).setValue(audioRelPath);
        }
      }
    }
  }

  // 5. Recalcular Guías Madre en GUIAS_ASIGNADAS (Mapeo Dinámico Columna Nuevo_Estatus)
  var sheetGuias = ss.getSheetByName("GUIAS_ASIGNADAS");
  if (sheetGuias && Object.keys(guiasImpactadas).length > 0 && sheetPID) {
    var gHeaders = sheetGuias.getRange(1, 1, 1, sheetGuias.getLastColumn()).getValues()[0];
    var idxHwbG = getHeaderIndex_(gHeaders, "HWB_Guia", 0);
    var idxNuevoEstG = getHeaderIndex_(gHeaders, "Nuevo_Estatus", 9);
    var idxRcvrG = getHeaderIndex_(gHeaders, "Nombre_Recibe", 10);
    var idxFirmaG = getHeaderIndex_(gHeaders, "Firma_Evidencia", 11);
    var idxFotoG = getHeaderIndex_(gHeaders, "Foto_Fachada_Paquete", 12);
    var idxAudioG = getHeaderIndex_(gHeaders, "Audio_Evidencia", 20);

    var dataPIDAll = sheetPID.getDataRange().getValues();
    var dataGuias = sheetGuias.getDataRange().getValues();
    
    var hwbCounts = {};
    for (var rp = 1; rp < dataPIDAll.length; rp++) {
      var hwbP = String(dataPIDAll[rp][0] || "").trim();
      var st = String(dataPIDAll[rp][3] || "").trim().toUpperCase();
      if (!hwbCounts[hwbP]) {
        hwbCounts[hwbP] = { total: 0, ok: 0, incidencias: [] };
      }
      hwbCounts[hwbP].total++;
      if (st === "OK") {
        hwbCounts[hwbP].ok++;
      } else if (st && st !== "PRE_ASIGNADO" && st !== "SIN_CARGAR") {
        hwbCounts[hwbP].incidencias.push(st);
      }
    }
    
    for (var g = 1; g < dataGuias.length; g++) {
      var hwbGuia = String(dataGuias[g][idxHwbG] || "").trim();
      if (guiasImpactadas[hwbGuia] && hwbCounts[hwbGuia]) {
        var stats = hwbCounts[hwbGuia];
        var nuevoEst = "PENDIENTE";
        if (stats.ok === stats.total && stats.total > 0) {
          nuevoEst = "OK";
        } else if (stats.ok > 0) {
          nuevoEst = "PD";
        } else if (stats.incidencias.length > 0) {
          nuevoEst = stats.incidencias[0];
        }
        if (idxNuevoEstG !== -1) sheetGuias.getRange(g + 1, idxNuevoEstG + 1).setValue(nuevoEst);
        if (audioRelPath && idxAudioG !== -1) sheetGuias.getRange(g + 1, idxAudioG + 1).setValue(audioRelPath);
        if (fotoRelPath && idxFotoG !== -1) sheetGuias.getRange(g + 1, idxFotoG + 1).setValue(fotoRelPath);
        if (firmaRelPath && (nuevoEst === "OK" || nuevoEst === "PD") && idxFirmaG !== -1) sheetGuias.getRange(g + 1, idxFirmaG + 1).setValue(firmaRelPath);
        if (nombreRecibe && (nuevoEst === "OK" || nuevoEst === "PD") && idxRcvrG !== -1) sheetGuias.getRange(g + 1, idxRcvrG + 1).setValue(nombreRecibe);
      }
    }
  }

  // 6. Inyectar en COLA_TEOYOLOTL_AUDIOS_QRO y Encolar Mini-Auditoría Gemini con Contexto Destinatario
  if (audioRelPath || fotoRelPath) {
    try {
      var sheetCola = ss.getSheetByName("COLA_TEOYOLOTL_AUDIOS_QRO");
      if (sheetCola && audioRelPath) {
        var colaHeaders = sheetCola.getRange(1, 1, 1, sheetCola.getLastColumn()).getValues()[0];
        var newRowCola = new Array(colaHeaders.length).fill("");
        var setColaVal = function(colName, val) {
          var idx = getHeaderIndex_(colaHeaders, colName);
          if (idx !== -1) newRowCola[idx] = val;
        };
        setColaVal("Timestamp", new Date());
        setColaVal("ID_Registro", idMasivo);
        setColaVal("Tipo_ID", "MASIVO");
        setColaVal("Chofer", chofer);
        setColaVal("File_Audio_Id", fileAudioId);
        setColaVal("File_Url", fileAudioUrl);
        setColaVal("AppSheet_Path", audioRelPath);
        setColaVal("Estatus", "PENDIENTE");
        setColaVal("PID_Asociado", (pidsActualizados.length > 0 ? pidsActualizados[0].pid : ""));
        setColaVal("HWB_Asociado", (Object.keys(guiasImpactadas)[0] || ""));
        sheetCola.appendRow(newRowCola);
      }

      // 🧠 PREPARACIÓN DE TAREA MULTIMODAL CON IA (TEOYOLOTL + GEMINI 3.8 FLASH)
      var tareaAudio = {
        idRegistro: idMasivo,
        fileAudioId: fileAudioId,
        appSheetRelativePath: audioRelPath,
        fileUrl: fileAudioUrl,
        choferEmail: chofer,
        foto_fachada: fotoRelPath,
        foto_base64: loteData.foto || "",
        foto_mimetype: "image/jpeg",
        audio_base64: rawAudio || "",
        audio_mimetype: (audioRelPath && audioRelPath.indexOf(".m4a") !== -1) ? "audio/mp4" : "audio/webm",
        destinatario_esperado: loteData.destinatarioEsperado || "",
        nombre_recibe: nombreRecibe,
        direccion_esperada: loteData.direccionEsperada || "",
        cp_esperado: loteData.cpEsperado || "",
        antecedentes_amoxcalli: loteData.antecedentesAmoxcalli || null,
        estatus_reportado: (pidsActualizados.length > 0 ? pidsActualizados[0].estatus : "OK"),
        timestamp: new Date().getTime()
      };
      encolarTareaAudioGemini_(tareaAudio);
    } catch(eCola) {
      Logger.log("⚠️ Error encolando audio/foto Teoyolotl Gemini: " + eCola.message);
    }
  }

  // 7. Reflejo directo en VALIDACIÓN_QRO_2025 (Esquema Moderno Ollinqui PWA)
  try {
    var ssVal = SpreadsheetApp.openById("1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M");
    var sheetVal = ssVal.getSheetByName("Validación") || ssVal.getSheets()[0];
    if (sheetVal && pidsActualizados.length > 0) {
      var vHeaders = sheetVal.getRange(1, 1, 1, sheetVal.getLastColumn()).getValues()[0];
      var idxHwbV = getHeaderIndex_(vHeaders, "guia", 0);
      var idxPidV = getHeaderIndex_(vHeaders, "pid", 1);
      var idxCpV = getHeaderIndex_(vHeaders, "cp", 2);
      var idxChkVal = getHeaderIndex_(vHeaders, "checkpoint", 3);
      var idxRcvrName = getHeaderIndex_(vHeaders, "receptor", 4);
      var idxFirma = getHeaderIndex_(vHeaders, "firma", 5);
      var idxFachada = getHeaderIndex_(vHeaders, "foto_fachada", 6);
      var idxAudio = getHeaderIndex_(vHeaders, "audio_teoyolotl", 7);
      var idxGps = getHeaderIndex_(vHeaders, "gps", 8);
      var idxPochteca = getHeaderIndex_(vHeaders, "pochteca", 9);
      var idxFEntrega = getHeaderIndex_(vHeaders, "fecha_entrega", 10);
      var idxAuditor = getHeaderIndex_(vHeaders, "aprobacion_auditor", 11);
      var idxTimestamp = getHeaderIndex_(vHeaders, "marca_tiempo", 14);

      var vData = sheetVal.getLastRow() > 1 ? sheetVal.getDataRange().getValues() : [];
      var existingRowMap = {};
      for (var v = 1; v < vData.length; v++) {
        var pRaw = String(vData[v][idxPidV !== -1 ? idxPidV : 1] || "").trim().toUpperCase();
        if (pRaw) existingRowMap[pRaw] = v + 1;
      }

      var gpsCoordStr = String(loteData.gps || "").trim();
      var idGuiaMadre = Object.keys(guiasImpactadas)[0] || "";

      pidsActualizados.forEach(function(item) {
        var pidDobleJ = (typeof formatearPidDobleJ === "function") ? formatearPidDobleJ(item.raw || item.pid) : String(item.raw || item.pid);
        var pidSan = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(item.pid) : item.pid;
        var rowTarget = existingRowMap[pidDobleJ] || existingRowMap[pidSan];

        if (rowTarget) {
          // Actualizar fila existente
          if (idxChkVal !== -1) sheetVal.getRange(rowTarget, idxChkVal + 1).setValue(item.estatus);
          if (nombreRecibe && idxRcvrName !== -1) sheetVal.getRange(rowTarget, idxRcvrName + 1).setValue(nombreRecibe);
          if (firmaRelPath && idxFirma !== -1) sheetVal.getRange(rowTarget, idxFirma + 1).setValue(firmaRelPath);
          if (fotoRelPath && idxFachada !== -1) sheetVal.getRange(rowTarget, idxFachada + 1).setValue(fotoRelPath);
          if (audioRelPath && idxAudio !== -1) sheetVal.getRange(rowTarget, idxAudio + 1).setValue(audioRelPath);
          if (gpsCoordStr && idxGps !== -1) sheetVal.getRange(rowTarget, idxGps + 1).setValue(gpsCoordStr);
          if (idxFEntrega !== -1) sheetVal.getRange(rowTarget, idxFEntrega + 1).setValue(fechaHora);
          if (idxTimestamp !== -1) sheetVal.getRange(rowTarget, idxTimestamp + 1).setValue(new Date());
        } else {
          // Insertar fila nueva en VALIDACIÓN_QRO_2025
          var nuevaFilaVal = [
            idGuiaMadre || item.pid,               // 0: Guia
            pidDobleJ,                             // 1: PID (JJD)
            String(loteData.cp || "").trim(),      // 2: CP
            item.estatus,                          // 3: Checkpoint
            nombreRecibe || "CLIENTE",             // 4: Receptor
            firmaRelPath,                          // 5: Firma
            fotoRelPath,                           // 6: Foto_Fachada
            audioRelPath,                          // 7: Audio_Teoyolotl
            gpsCoordStr,                           // 8: GPS
            chofer || "sin_asignar@arauto.express",// 9: Pochteca
            fechaHora,                             // 10: Fecha_Entrega
            "PENDIENTE",                           // 11: Aprobacion_Auditor
            "",                                    // 12: Motivo_Rechazo
            "",                                    // 13: Auditor_Validador
            new Date()                             // 14: Marca_Tiempo
          ];
          sheetVal.appendRow(nuevaFilaVal);
        }
      });
    }
  } catch(eVal) {
    Logger.log("⚠️ Error sincronizando en VALIDACIÓN_QRO_2025: " + eVal.message);
  }

  // 8. Reflejo directo en OLLIN_OPERACIONES_2026 (Pestaña RUTA_OLLINQUI)
  try {
    var ID_OLLIN_OPERACIONES_2026 = "1njJIZBtYVqwtyNS-1SkeTMxDh7y6RctH2yoL0vXltbk";
    var ssOllin2026 = SpreadsheetApp.openById(ID_OLLIN_OPERACIONES_2026);
    var shRutaOllin = ssOllin2026.getSheetByName("RUTA_OLLINQUI");
    if (shRutaOllin && pidsActualizados.length > 0) {
      if (shRutaOllin.getLastRow() === 0) {
        shRutaOllin.appendRow([
          "ID_Evento", "ID_Pieza", "ID_Guia", "Checkpoint", "Nombre_Receptor",
          "URL_Firma", "URL_Foto_Fachada", "URL_Audio_Teoyolotl", "Lat_Long",
          "Pochteca_Ejecutor", "Timestamp_Local", "Marca_Tiempo_Servidor",
          "Transcripcion_Voz", "Interpretacion_IA"
        ]);
      } else {
        if (shRutaOllin.getLastColumn() < 13 || String(shRutaOllin.getRange(1, 13).getValue()).trim() === "") {
          shRutaOllin.getRange(1, 13).setValue("Transcripcion_Voz");
        }
        if (shRutaOllin.getLastColumn() < 14 || String(shRutaOllin.getRange(1, 14).getValue()).trim() === "") {
          shRutaOllin.getRange(1, 14).setValue("Interpretacion_IA");
        }
      }

      var filasOllin = [];
      var serverTime = new Date();
      var idGuiaMadre = Object.keys(guiasImpactadas)[0] || "";
      var gpsCoordStr = String(loteData.gps || "").trim();
      
      pidsActualizados.forEach(function(item) {
        var idEvento = "EVT_" + Utilities.getUuid().substring(0, 8).toUpperCase();
        filasOllin.push([
          idEvento,                         // 1: ID_Evento
          item.pid,                         // 2: ID_Pieza (JD)
          (idGuiaMadre || item.pid),        // 3: ID_Guia
          item.estatus,                     // 4: Checkpoint
          nombreRecibe,                     // 5: Nombre_Receptor
          firmaRelPath,                     // 6: URL_Firma
          fotoRelPath,                      // 7: URL_Foto_Fachada
          audioRelPath,                     // 8: URL_Audio_Teoyolotl
          gpsCoordStr,                      // 9: Lat_Long
          chofer,                           // 10: Pochteca_Ejecutor
          fechaHora,                        // 11: Timestamp_Local
          serverTime,                       // 12: Marca_Tiempo_Servidor
          (audioRelPath ? "[PROCESANDO_AUDIO]" : "[SIN_AUDIO]"), // 13: Transcripcion_Voz
          (audioRelPath ? "[AUDITORÍA_IA_EN_CURSO]" : "VALIDADA_SISTEMA") // 14: Interpretacion_IA
        ]);
      });
      if (filasOllin.length > 0) {
        shRutaOllin.getRange(shRutaOllin.getLastRow() + 1, 1, filasOllin.length, filasOllin[0].length).setValues(filasOllin);
      }
    }
  } catch(eOllin) {
    Logger.log("⚠️ Error reflejando en RUTA_OLLINQUI de OLLIN_OPERACIONES_2026: " + eOllin.message);
  }

  // 9. ⚡ PROCESAMIENTO INMEDIATO DE TEOYOLOTL IA (CERO LATENCIA OPERADOR)
  if (tareaAudio && (audioRelPath || fotoRelPath)) {
    try {
      procesarAudioItemGemini_(tareaAudio);
    } catch(eProcDir) {
      Logger.log("⚠️ Error en procesamiento síncrono Teoyolotl, cola de fondo lo resolverá: " + eProcDir.message);
    }
  }

  SpreadsheetApp.flush();

  return {
    status: "OK",
    idMasivo: idMasivo,
    piezasProcesadas: pidsActualizados.length,
    guiasAfectadas: Object.keys(guiasImpactadas).length,
    audioEvidencia: audioRelPath,
    timestamp: new Date().toISOString()
  };
}

/**
 * ====================================================================
 * 🛡️ POKA-YOKE SWITCH 7CA: CONSULTA DE PERFIL DE USUARIO
 * ====================================================================
 */
function consultarPerfilUsuario_(email) {
  var ID_BD_APP_RUTA_2025 = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
  var ssRuta = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
  var shUsers = ssRuta.getSheetByName("CAT_USUARIOS");
  if (!shUsers || shUsers.getLastRow() < 2) {
    return { encontrado: false, tiene_7ca: false, rol: "POCHTECA" };
  }

  var data = shUsers.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idxCorreo = getHeaderIndex_(headers, "correo", 0);
  var idxNombre = getHeaderIndex_(headers, "nombre", 1);
  var idxRol = getHeaderIndex_(headers, "rol", 2);
  var idx7CA = getHeaderIndex_(headers, "tiene_7ca", -1);
  if (idx7CA === -1) idx7CA = getHeaderIndex_(headers, "7ca", -1);
  var idxTel = getHeaderIndex_(headers, "telefono", -1);

  var idxPin = getHeaderIndex_(headers, "pin", -1);
  var targetEmail = String(email || "").trim().toLowerCase();
  for (var r = 1; r < data.length; r++) {
    var rowEmail = String(data[r][idxCorreo] || "").trim().toLowerCase();
    if (rowEmail === targetEmail && targetEmail !== "") {
      var val7CA = idx7CA !== -1 ? data[r][idx7CA] : false;
      var tiene7ca = (val7CA === true || String(val7CA).trim().toUpperCase() === "TRUE" || String(val7CA).trim() === "1");
      var pinGuardado = idxPin !== -1 ? String(data[r][idxPin] || "").trim() : "";
      return {
        encontrado: true,
        correo: data[r][idxCorreo],
        nombre: idxNombre !== -1 ? String(data[r][idxNombre] || "") : "",
        rol: idxRol !== -1 ? String(data[r][idxRol] || "") : "POCHTECA",
        tiene_7ca: tiene7ca,
        telefono: idxTel !== -1 ? String(data[r][idxTel] || "") : "",
        pin: pinGuardado,
        requiere_cambio_pin: (!pinGuardado || pinGuardado === "0000")
      };
    }
  }

  return { encontrado: false, tiene_7ca: false, rol: "POCHTECA", correo: email, pin: "", requiere_cambio_pin: true };
}

/**
 * 🔑 ACTUALIZAR PIN DE USUARIO EN CAT_USUARIOS (POKA-YOKE ACTIVACIÓN)
 */
function actualizarPinUsuario_(email, nuevoPin) {
  var ID_BD_APP_RUTA_2025 = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
  var ssRuta = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
  var shUsers = ssRuta.getSheetByName("CAT_USUARIOS");
  if (!shUsers || shUsers.getLastRow() < 2) {
    return { exito: false, error: "Hoja CAT_USUARIOS no encontrada" };
  }

  var cleanPin = String(nuevoPin || "").trim();
  if (!/^\d{4}$/.test(cleanPin)) {
    return { exito: false, error: "El PIN debe tener exactamente 4 dígitos numéricos" };
  }

  var data = shUsers.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idxCorreo = getHeaderIndex_(headers, "correo", 0);
  var idxPin = getHeaderIndex_(headers, "pin", -1);

  // Si la columna PIN aún no existe en CAT_USUARIOS, crearla automáticamente
  if (idxPin === -1) {
    idxPin = headers.length;
    shUsers.getRange(1, idxPin + 1).setValue("PIN");
  }

  var targetEmail = String(email || "").trim().toLowerCase();
  for (var r = 1; r < data.length; r++) {
    var rowEmail = String(data[r][idxCorreo] || "").trim().toLowerCase();
    if (rowEmail === targetEmail && targetEmail !== "") {
      shUsers.getRange(r + 1, idxPin + 1).setValue("'" + cleanPin);
      SpreadsheetApp.flush();
      return {
        exito: true,
        correo: targetEmail,
        mensaje: "PIN actualizado exitosamente en CAT_USUARIOS"
      };
    }
  }

  return { exito: false, error: "Usuario no encontrado en CAT_USUARIOS" };
}

/**
 * 👥 CONSULTAR LISTA COMPLETA DE USUARIOS DE CAT_USUARIOS
 */
function consultarUsuariosCatalogo_() {
  var ID_BD_APP_RUTA_2025 = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
  var ssRuta = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
  var shUsers = ssRuta.getSheetByName("CAT_USUARIOS");
  if (!shUsers || shUsers.getLastRow() < 2) {
    return { exito: false, usuarios: [] };
  }

  var data = shUsers.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idxCorreo = getHeaderIndex_(headers, "correo", 0);
  var idxNombre = getHeaderIndex_(headers, "nombre", 1);
  var idxRol = getHeaderIndex_(headers, "rol", 2);
  var idx7CA = getHeaderIndex_(headers, "tiene_7ca", -1);
  if (idx7CA === -1) idx7CA = getHeaderIndex_(headers, "7ca", -1);
  var idxTel = getHeaderIndex_(headers, "telefono", -1);
  var idxPin = getHeaderIndex_(headers, "pin", -1);

  // Asegurar que exista la columna de Telefono en la hoja si no existe
  if (idxTel === -1) {
    idxTel = headers.length;
    shUsers.getRange(1, idxTel + 1).setValue("Telefono");
  }

  var lista = [];
  for (var r = 1; r < data.length; r++) {
    var email = String(data[r][idxCorreo] || "").trim();
    if (!email) continue;
    var nombre = idxNombre !== -1 ? String(data[r][idxNombre] || "").trim() : "";
    var rol = idxRol !== -1 ? String(data[r][idxRol] || "").trim() : "Pochteca";
    var tel = idxTel !== -1 ? String(data[r][idxTel] || "").trim() : "";
    var val7CA = idx7CA !== -1 ? data[r][idx7CA] : false;
    var tiene7ca = (val7CA === true || String(val7CA).trim().toUpperCase() === "TRUE" || String(val7CA).trim() === "1");
    var pinVal = idxPin !== -1 ? String(data[r][idxPin] || "").trim() : "";

    lista.push({
      correo: email,
      nombre: nombre,
      rol: rol,
      telefono: tel,
      tiene_7ca: tiene7ca,
      requiere_cambio_pin: (!pinVal || pinVal === "0000")
    });
  }

  return {
    exito: true,
    total: lista.length,
    usuarios: lista
  };
}

/**
 * ====================================================================
 * 🏠 MEMORIA DE DOMICILIO: CONSULTA HISTÓRICA DE ENTREGAS PREVIAS
 * ====================================================================
 */
function consultarMemoriaDomicilio_(guia, pid, direccion, cp) {
  var cleanGuia = String(guia || "").trim().replace(/\D/g, "");
  var cleanPid = String(pid || "").trim().toUpperCase();
  if (typeof sanitizarPIDParaBoveda === "function" && cleanPid) {
    cleanPid = sanitizarPIDParaBoveda(cleanPid);
  }

  var resultado = {
    encontrada: false,
    hwb: cleanGuia || "",
    total_piezas: 1,
    pieza_index: 1,
    pids_asociados: cleanPid ? [cleanPid] : [],
    direccion: direccion || "",
    cp: cp || "",
    destinatario_habitual: "",
    notas_localizacion: "",
    foto_fachada_previa: "",
    fecha_previa: "",
    inter: "",
    monto_aduana: 0
  };

  var ID_BD_APP_RUTA_2025 = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
  var ID_OLLIN_OPERACIONES_2026 = "1njJIZBtYVqwtyNS-1SkeTMxDh7y6RctH2yoL0vXltbk";

  // 1. Si se escaneó un PID, resolver Guía Madre (HWB) y PIDs hermanos en PIEZAS_PID
  if (cleanPid) {
    try {
      var ssRutaPid = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
      var shPids = ssRutaPid.getSheetByName("PIEZAS_PID");
      if (shPids && shPids.getLastRow() > 1) {
        var pData = shPids.getDataRange().getValues();
        var pHeaders = pData[0].map(function(h) { return String(h).trim().toLowerCase(); });
        var colPid = pHeaders.indexOf("pid_codigo");
        if (colPid === -1) colPid = pHeaders.indexOf("pid");
        var colHwb = pHeaders.indexOf("hwb_guia");
        if (colHwb === -1) colHwb = pHeaders.indexOf("guia");

        if (colPid !== -1 && colHwb !== -1) {
          var hwbAsociada = "";
          for (var p = 1; p < pData.length; p++) {
            var rowPid = String(pData[p][colPid] || "").trim().toUpperCase();
            var rowSan = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(rowPid) : rowPid;
            if (rowPid === cleanPid || rowSan === cleanPid) {
              hwbAsociada = String(pData[p][colHwb] || "").trim().replace(/\D/g, "");
              break;
            }
          }

          if (hwbAsociada) {
            cleanGuia = hwbAsociada;
            resultado.hwb = hwbAsociada;
            var hermanos = [];
            for (var p2 = 1; p2 < pData.length; p2++) {
              var hwbRow2 = String(pData[p2][colHwb] || "").trim().replace(/\D/g, "");
              if (hwbRow2 === hwbAsociada) {
                var pidHermano = String(pData[p2][colPid] || "").trim().toUpperCase();
                if (pidHermano && hermanos.indexOf(pidHermano) === -1) {
                  hermanos.push(pidHermano);
                }
              }
            }
            if (hermanos.length > 0) {
              resultado.pids_asociados = hermanos;
              resultado.total_piezas = hermanos.length;
              var idxHermano = hermanos.indexOf(cleanPid);
              resultado.pieza_index = idxHermano !== -1 ? (idxHermano + 1) : 1;
            }
          }
        }
      }
    } catch(ePid) {
      Logger.log("⚠️ Error buscando PID en PIEZAS_PID: " + ePid.message);
    }
  }

  // 2. Si no hay dirección y se cuenta con Guía Madre, buscar en GUIAS_ASIGNADAS
  try {
    var ssRuta = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    var shGuias = ssRuta.getSheetByName("GUIAS_ASIGNADAS");
    if (shGuias && shGuias.getLastRow() > 1 && cleanGuia) {
      var gData = shGuias.getDataRange().getValues();
      var gHeaders = gData[0];
      var idxHwb = getHeaderIndex_(gHeaders, "hwb_guia", 0);
      var idxDir = getHeaderIndex_(gHeaders, "direccion_destino", -1);
      var idxCp = getHeaderIndex_(gHeaders, "cp", -1);
      var idxRcvr = getHeaderIndex_(gHeaders, "destinatario", -1);
      if (idxRcvr === -1) idxRcvr = getHeaderIndex_(gHeaders, "receiver_name", -1);
      var idxInter = getHeaderIndex_(gHeaders, "inter", -1);
      var idxAduana = getHeaderIndex_(gHeaders, "monto_aduana", -1);
      var idxPzasTot = getHeaderIndex_(gHeaders, "piezas", -1);
      if (idxPzasTot === -1) idxPzasTot = getHeaderIndex_(gHeaders, "total_piezas", -1);

      for (var g = 1; g < gData.length; g++) {
        var hwbVal = String(gData[g][idxHwb] || "").trim().replace(/\D/g, "");
        if (hwbVal === cleanGuia) {
          if (!resultado.direccion && idxDir !== -1) resultado.direccion = String(gData[g][idxDir] || "");
          if (!resultado.cp && idxCp !== -1) resultado.cp = String(gData[g][idxCp] || "").replace(/\D/g, "");
          if (!resultado.destinatario_habitual && idxRcvr !== -1) resultado.destinatario_habitual = String(gData[g][idxRcvr] || "");
          if (idxInter !== -1) resultado.inter = String(gData[g][idxInter] || "");
          if (idxAduana !== -1) resultado.monto_aduana = parseFloat(gData[g][idxAduana]) || 0;
          if (idxPzasTot !== -1 && parseInt(gData[g][idxPzasTot]) > 0) {
            resultado.total_piezas = Math.max(resultado.total_piezas, parseInt(gData[g][idxPzasTot]));
          }
          resultado.encontrada = true;
          break;
        }
      }
    }
  } catch(eG) {
    Logger.log("⚠️ Error buscando en GUIAS_ASIGNADAS: " + eG.message);
  }

  // 2. Buscar en RAW_SHIPMENT (Bóveda Almacén) si faltan datos
  if (!resultado.direccion || !resultado.inter) {
    try {
      var ssBoveda = SpreadsheetApp.openById("1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw");
      var shRaw = ssBoveda.getSheetByName("RAW_SHIPMENT");
      if (shRaw && shRaw.getLastRow() > 1) {
        var rData = shRaw.getDataRange().getValues();
        var rHeaders = rData[0].map(function(h) { return String(h).toLowerCase().trim(); });
        var colHwb = -1, colAddr = -1, colCp = -1, colOrig = -1, colAduana = -1;
        for (var c = 0; c < rHeaders.length; c++) {
          var h = rHeaders[c];
          if (h.indexOf("hwb") !== -1 || h.indexOf("guia") !== -1) colHwb = c;
          else if (h.indexOf("rcvr addr 1") !== -1 || h === "address 1") colAddr = c;
          else if (h.indexOf("postcode") !== -1 || h === "cp") colCp = c;
          else if (h.indexOf("orig ctry") !== -1) colOrig = c;
          else if (h.indexOf("aduana") !== -1 || h.indexOf("duty") !== -1) colAduana = c;
        }
        for (var rw = 1; rw < rData.length; rw++) {
          var hwbR = colHwb !== -1 ? String(rData[rw][colHwb] || "").trim().replace(/\D/g, "") : "";
          if (hwbR === cleanGuia && cleanGuia !== "") {
            if (!resultado.direccion && colAddr !== -1) resultado.direccion = String(rData[rw][colAddr] || "");
            if (!resultado.cp && colCp !== -1) resultado.cp = String(rData[rw][colCp] || "").replace(/\D/g, "");
            var origCtry = colOrig !== -1 ? String(rData[rw][colOrig] || "").trim().toUpperCase() : "MX";
            if (origCtry !== "MX" && origCtry !== "") resultado.inter = "Inter";
            if (colAduana !== -1) resultado.monto_aduana = parseFloat(rData[rw][colAduana]) || 0;
            break;
          }
        }
      }
    } catch(eRaw) {
      Logger.log("⚠️ Error buscando en RAW_SHIPMENT: " + eRaw.message);
    }
  }

  // 3. Consultar Memoria Histórica en VALIDACIÓN_QRO_2025
  try {
    var ssVal = SpreadsheetApp.openById("1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M");
    var shVal = ssVal.getSheetByName("VALIDACIÓN_QRO_2025") || ssVal.getSheets()[0];
    if (shVal && shVal.getLastRow() > 1) {
      var vData = shVal.getDataRange().getValues();
      var vHeaders = vData[0];
      var idxHwbV = getHeaderIndex_(vHeaders, "guia", 0);
      var idxCpV = getHeaderIndex_(vHeaders, "c.p.", 2);
      var idxAddrV = getHeaderIndex_(vHeaders, "rcvr addr 1", 4);
      var idxRcvrV = getHeaderIndex_(vHeaders, "receiver name", 7);
      var idxCpntV = getHeaderIndex_(vHeaders, "checkpoint", 9);
      var idxComV = getHeaderIndex_(vHeaders, "comentarios", 10);
      var idxFechaV = getHeaderIndex_(vHeaders, "fecha asignacion", 11);
      var idxFotoV = getHeaderIndex_(vHeaders, "imagen fachada", 13);
      var idxInterV = getHeaderIndex_(vHeaders, "inter", 18);

      var dirTargetNorm = normalizarCadenaBusqueda_(resultado.direccion);
      var cpTarget = String(resultado.cp || "").trim();
      var totalEntregasPrevias = 0;
      var receptoresSet = new Set();

      // Recorremos de abajo hacia arriba (los más recientes primero)
      for (var rowIdx = vData.length - 1; rowIdx >= 1; rowIdx--) {
        var row = vData[rowIdx];
        var cpRow = String(row[idxCpV] || "").trim();
        var addrRowNorm = normalizarCadenaBusqueda_(String(row[idxAddrV] || ""));
        var hwbRow = String(row[idxHwbV] || "").trim().replace(/\D/g, "");
        var checkpoint = String(row[idxCpntV] || "").trim().toUpperCase();

        var foto = String(row[idxFotoV] || "").trim();
        var receptor = String(row[idxRcvrV] || "").trim();
        var notas = String(row[idxComV] || "").trim();

        if (receptor.indexOf("$$CONCILIAR") !== -1) receptor = "";

        var matchGuia = (cleanGuia && hwbRow === cleanGuia);
        var matchDireccion = false;
        if (dirTargetNorm && addrRowNorm) {
          if (cpTarget && cpRow && cpTarget === cpRow) {
            if (addrRowNorm.indexOf(dirTargetNorm) !== -1 || dirTargetNorm.indexOf(addrRowNorm) !== -1) {
              matchDireccion = true;
            }
          } else if (dirTargetNorm.length > 8 && (addrRowNorm.indexOf(dirTargetNorm) !== -1 || dirTargetNorm.indexOf(addrRowNorm) !== -1)) {
            matchDireccion = true;
          }
        }

        var matchDestinatario = false;
        var rcvrTargetNorm = normalizarCadenaBusqueda_(resultado.destinatario_habitual);
        var rcvrRowNorm = normalizarCadenaBusqueda_(receptor);
        if (rcvrTargetNorm && rcvrRowNorm && rcvrTargetNorm.length > 3) {
          if (rcvrRowNorm.indexOf(rcvrTargetNorm) !== -1 || rcvrTargetNorm.indexOf(rcvrRowNorm) !== -1) {
            matchDestinatario = true;
          }
        }

        if (matchGuia || matchDireccion || matchDestinatario) {
          if (idxInterV !== -1 && !resultado.inter && String(row[idxInterV] || "").trim()) {
            resultado.inter = String(row[idxInterV] || "").trim();
          }

          if (checkpoint === "OK" || checkpoint === "PD" || matchGuia) {
            resultado.encontrada = true;
            totalEntregasPrevias++;

            if (receptor) {
              receptoresSet.add(receptor);
              if (!resultado.destinatario_habitual) resultado.destinatario_habitual = receptor;
            }
            if (notas && !resultado.notas_localizacion) resultado.notas_localizacion = notas;
            if (foto && !resultado.foto_fachada_previa) resultado.foto_fachada_previa = foto;
            if (idxFechaV !== -1 && !resultado.fecha_previa) resultado.fecha_previa = String(row[idxFechaV] || "");
            
            if (totalEntregasPrevias >= 5 && resultado.foto_fachada_previa && resultado.destinatario_habitual) {
              break;
            }
          }
        }
      }
      resultado.total_entregas_previas = totalEntregasPrevias;
      resultado.receptores_historicos = Array.from(receptoresSet).slice(0, 3);
      if (totalEntregasPrevias >= 3) {
        resultado.confianza_historica = "ALTA";
      } else if (totalEntregasPrevias >= 1) {
        resultado.confianza_historica = "MEDIA";
      } else {
        resultado.confianza_historica = "NUEVO_DESTINATARIO";
      }

      resultado.amoxcalli_resumen = totalEntregasPrevias > 0 
        ? ("🏛️ Amoxcalli: " + totalEntregasPrevias + " entrega(s) exitosa(s) previa(s). Habitual: " + (resultado.receptores_historicos.join(", ") || resultado.destinatario_habitual) + (resultado.notas_localizacion ? (" • " + resultado.notas_localizacion) : ""))
        : "Nuevo destinatario en ruta.";
    }
  } catch(eVal) {
    Logger.log("⚠️ Error en consulta histórica VALIDACIÓN: " + eVal.message);
  }

  return resultado;
}

function normalizarCadenaBusqueda_(str) {
  if (!str) return "";
  return String(str).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ====================================================================
 * 📦 MÓDULO DE RECOLECCIONES (PICKUPS PWA): RECOLECCIONES_VALIDACION
 * ====================================================================
 */
function procesarRecoleccionPWA_(datos) {
  var ID_BD_APP_RUTA_2025 = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
  var ssRuta = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
  var libroLocal = SpreadsheetApp.getActiveSpreadsheet();

  var hojaPU = libroLocal ? libroLocal.getSheetByName("RECOLECCIONES_VALIDACION") : null;
  if (!hojaPU) {
    try {
      var ssVal = SpreadsheetApp.openById("1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M");
      hojaPU = ssVal.getSheetByName("RECOLECCIONES_VALIDACION");
    } catch(e){}
  }
  if (!hojaPU && ssRuta) {
    hojaPU = ssRuta.getSheetByName("RECOLECCIONES_VALIDACION");
  }

  if (!hojaPU) {
    throw new Error("No se encontró la pestaña 'RECOLECCIONES_VALIDACION'.");
  }

  var idPU = String(datos.id_pu || ("PU_" + Date.now().toString(36).toUpperCase())).trim();
  var idBooking = String(datos.id_booking || "").trim();
  var remitente = String(datos.remitente || "").trim();
  var direccion = String(datos.direccion || "").trim();
  var cp = String(datos.cp || "").trim();
  var chofer = String(datos.chofer || "").trim();
  var estatus = String(datos.estatus || "PU").trim().toUpperCase();
  var pzsEstimadas = parseInt(datos.piezas_estimadas) || 0;
  var pzsReales = parseInt(datos.piezas_reales) || 0;
  var motivo = String(datos.motivo || "").trim();
  var gps = String(datos.gps || "").trim();
  var timestampPU = datos.timestamp ? String(datos.timestamp) : "";

  // Guardar archivos de Firma y Foto de Empaque en Drive si vienen en Base64
  var firmaUrl = String(datos.firma || "").trim();
  if (firmaUrl.indexOf("data:image") !== -1) {
    try {
      var partsF = firmaUrl.split(",");
      var b64F = partsF.length > 1 ? partsF[1] : partsF[0];
      var blobF = Utilities.newBlob(Utilities.base64Decode(b64F), "image/png", "Firma_PU_" + idPU + ".png");
      var carpetaF = obtenerOCrearCarpetaDrive_("RECOLECCIONES_Files");
      var fileF = carpetaF.createFile(blobF);
      try { fileF.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e){}
      firmaUrl = fileF.getUrl();
    } catch(errF) {
      Logger.log("⚠️ Error guardando firma PU: " + errF.message);
    }
  }

  var evidenciaUrl = String(datos.evidencia || datos.foto || "").trim();
  if (evidenciaUrl.indexOf("data:image") !== -1) {
    try {
      var partsE = evidenciaUrl.split(",");
      var b64E = partsE.length > 1 ? partsE[1] : partsE[0];
      var blobE = Utilities.newBlob(Utilities.base64Decode(b64E), "image/jpeg", "Evidencia_PU_" + idPU + ".jpg");
      var carpetaE = obtenerOCrearCarpetaDrive_("RECOLECCIONES_Files");
      var fileE = carpetaE.createFile(blobE);
      try { fileE.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e){}
      evidenciaUrl = fileE.getUrl();
    } catch(errE) {
      Logger.log("⚠️ Error guardando foto PU: " + errE.message);
    }
  }

  var fechaHoy = new Date();
  var horaServidor = Utilities.formatDate(fechaHoy, "America/Mexico_City", "dd/MM/yyyy HH:mm:ss");

  var filaPU = [
    idPU,            // 1: ID_PU
    idBooking,       // 2: ID_Booking
    remitente,       // 3: Remitente
    direccion,       // 4: Direccion
    cp,              // 5: C.P.
    chofer,          // 6: Chofer
    estatus,         // 7: Estatus (PU / Booking)
    pzsEstimadas,    // 8: Piezas Estimadas
    pzsReales,       // 9: Piezas Reales
    firmaUrl,        // 10: Firma Remitente
    evidenciaUrl,    // 11: Foto Evidencia / Empaque
    motivo,          // 12: Motivo
    gps,             // 13: GPS Check-in
    timestampPU,     // 14: Timestamp Celular
    horaServidor,    // 15: Timestamp Servidor
    false,           // 16: Aprobación Auditor
    "",              // 17: Motivo de Rechazo
    fechaHoy         // 18: Marca de Tiempo
  ];

  var ultimaFilaPU = hojaPU.getLastRow();
  var filaEncontradaPU = -1;
  if (ultimaFilaPU > 1) {
    var rangoIDsPU = hojaPU.getRange(2, 1, ultimaFilaPU - 1, 2).getValues();
    for (var i = 0; i < rangoIDsPU.length; i++) {
      var currIdPU = String(rangoIDsPU[i][0] || "").trim();
      var currIdBk = String(rangoIDsPU[i][1] || "").trim();
      if ((idPU && currIdPU === idPU) || (idBooking && currIdBk === idBooking)) {
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
    try {
      hojaPU.getRange(hojaPU.getLastRow(), 16).insertCheckboxes();
    } catch(eChk){}
    accionPU = "INYECTADA";
  }

  // ==========================================
  // 🔄 SINCRONIZACIÓN EN BD_APP_RUTA_2025 (RECOLECCIONES_ASIGNADAS)
  // Actualiza la fila original asignada al Pochteca para cerrar el ciclo en campo
  // ==========================================
  try {
    var hojaAsig = ssRuta ? ssRuta.getSheetByName("RECOLECCIONES_ASIGNADAS") : null;
    if (hojaAsig) {
      var ultAsig = hojaAsig.getLastRow();
      if (ultAsig > 1) {
        var idsAsig = hojaAsig.getRange(2, 1, ultAsig - 1, 2).getValues();
        var filaMatchAsig = -1;
        for (var k = 0; k < idsAsig.length; k++) {
          var kPU = String(idsAsig[k][0] || "").trim();
          var kBk = String(idsAsig[k][1] || "").trim();
          if ((idPU && kPU === idPU) || (idBooking && kBk === idBooking)) {
            filaMatchAsig = k + 2;
            break;
          }
        }

        if (filaMatchAsig !== -1) {
          // [0]ID_PU, [1]ID_Bk, [2]Remitente, [3]Dir, [4]CP, [5]H_Apertura, [6]H_Cierre, [7]Chofer,
          // [8]Estatus_PU, [9]Pzs_Est, [10]Pzs_Real, [11]Firma, [12]Foto, [13]Motivo, [14]GPS, [15]Timestamp
          hojaAsig.getRange(filaMatchAsig, 9).setValue(estatus);
          hojaAsig.getRange(filaMatchAsig, 11).setValue(pzsReales);
          if (firmaUrl) hojaAsig.getRange(filaMatchAsig, 12).setValue(firmaUrl);
          if (evidenciaUrl) hojaAsig.getRange(filaMatchAsig, 13).setValue(evidenciaUrl);
          if (motivo) hojaAsig.getRange(filaMatchAsig, 14).setValue(motivo);
          if (gps) hojaAsig.getRange(filaMatchAsig, 15).setValue(gps);
          hojaAsig.getRange(filaMatchAsig, 16).setValue(horaServidor);
          Logger.log("✅ RECOLECCIONES_ASIGNADAS actualizada en fila " + filaMatchAsig + " para PU " + idPU);
        } else {
          // Si no existía previa asignación (pickup al vuelo), insertar fila completa
          hojaAsig.appendRow([
            idPU, idBooking, remitente, direccion, cp, "08:00", "17:00",
            chofer, estatus, pzsEstimadas, pzsReales, firmaUrl, evidenciaUrl,
            motivo, gps, horaServidor
          ]);
        }
      }
    }
  } catch(eAsig) {
    Logger.log("⚠️ Error sincronizando en RECOLECCIONES_ASIGNADAS de BD_APP_RUTA_2025: " + eAsig.message);
  }

  // Reflejo directo en OLLIN_OPERACIONES_2026 (Pestaña RAMPA_PAINANI)
  try {
    var ID_OLLIN_OPERACIONES_2026 = "1njJIZBtYVqwtyNS-1SkeTMxDh7y6RctH2yoL0vXltbk";
    var ssOllin2026 = SpreadsheetApp.openById(ID_OLLIN_OPERACIONES_2026);
    var shRampa = ssOllin2026.getSheetByName("RAMPA_PAINANI");
    if (shRampa) {
      shRampa.appendRow([
        idPU,                                            // 1: ID_Pieza / Folio PU
        idBooking,                                       // 2: ID_Guia / Booking
        horaServidor,                                    // 3: Hora_Escaneo
        true,                                            // 4: Validado_Fisico
        fechaHoy,                                        // 5: EDD_Fisico
        chofer,                                          // 6: Pochteca_Asignado
        "QRO-SUR",                                       // 7: Zona_Ruta
        "AUDITOR_PWA",                                   // 8: Auditor_Rampa
        idBooking,                                       // 9: ID_Recepcion_Camion
        (motivo ? (estatus + " - " + motivo) : (estatus + " - " + remitente + " (" + pzsReales + " pzs)")), // 10: Observacion_Fisica
        fechaHoy                                         // 11: Marca_Tiempo_Servidor
      ]);
    }
  } catch(eRampa) {
    Logger.log("⚠️ Error reflejando en RAMPA_PAINANI de OLLIN_OPERACIONES_2026: " + eRampa.message);
  }

  return {
    status: "OK",
    exito: true,
    mensaje: "✅ Recolección " + idPU + " " + accionPU + " en RECOLECCIONES_VALIDACION.",
    id_pu: idPU,
    estatus: estatus,
    piezas_reales: pzsReales,
    firma: firmaUrl,
    evidencia: evidenciaUrl
  };
}

/**
 * 📦 CONSULTAR PICKUPS ASIGNADOS AL POCHTECA (BD_APP_RUTA_2025)
 * Devuelve las recolecciones que el despachador inyectó desde la Consola Maestra
 */
function consultarPickupsAsignadosChofer_(correoChofer) {
  try {
    var ID_BD_APP_RUTA_2025 = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
    var ssRuta = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    var hojaAsig = ssRuta.getSheetByName("RECOLECCIONES_ASIGNADAS");
    if (!hojaAsig) {
      return { exito: false, error: "Pestaña RECOLECCIONES_ASIGNADAS no encontrada", recolecciones: [] };
    }

    var lastRow = hojaAsig.getLastRow();
    if (lastRow < 2) {
      return { exito: true, total: 0, recolecciones: [] };
    }

    var choferClean = String(correoChofer || "").trim().toLowerCase();
    var esSupervisor = (choferClean.indexOf("sidharta") !== -1 || choferClean.indexOf("irvin") !== -1 || choferClean === "" || choferClean === "todos");
    
    // Leer rango A2:P (16 columnas)
    var datos = hojaAsig.getRange(2, 1, lastRow - 1, 16).getValues();
    var recolecciones = [];

    for (var i = 0; i < datos.length; i++) {
      var row = datos[i];
      var chofAsig = String(row[7] || "").trim().toLowerCase();
      var estatusPU = String(row[8] || "PRE_ASIGNADO").trim().toUpperCase();

      // Filtrar por chofer (a menos que sea supervisor)
      var pertenece = esSupervisor || (chofAsig === choferClean) || (chofAsig.indexOf(choferClean.split("@")[0]) !== -1);
      if (!pertenece) continue;

      // Devolver solo las que no estén completadas o devueltas en el turno (o las del día)
      recolecciones.push({
        id_pu: String(row[0] || "").trim(),
        id_booking: String(row[1] || "").trim(),
        remitente: String(row[2] || "").trim(),
        direccion: String(row[3] || "").trim(),
        cp: String(row[4] || "").trim(),
        horario_apertura: String(row[5] || "08:00").trim(),
        horario_cierre: String(row[6] || "17:00").trim(),
        chofer: String(row[7] || "").trim(),
        estatus: estatusPU,
        piezas_estimadas: parseInt(row[9]) || 1,
        piezas_reales: parseInt(row[10]) || 0,
        motivo: String(row[13] || "").trim(),
        check_in_gps: String(row[14] || "").trim(),
        timestamp_pu: String(row[15] || "").trim()
      });
    }

    return {
      exito: true,
      total: recolecciones.length,
      pendientes: recolecciones.filter(function(r) { return r.estatus === "PRE_ASIGNADO" || r.estatus === "PENDIENTE"; }).length,
      recolecciones: recolecciones
    };
  } catch(err) {
    Logger.log("❌ Error en consultarPickupsAsignadosChofer_: " + err.message);
    return { exito: false, error: err.message, recolecciones: [] };
  }
}

/**
 * ====================================================================
 * 🔒 CANDADO POKA-YOKE DE SESIÓN ÚNICA DIARIA (ANTI-CONCURRENCIA)
 * ====================================================================
 */
function gestionarSesionUsuario_(email, deviceId, override, operacion) {
  var cleanEmail = String(email || "").trim().toLowerCase();
  var cleanDevId = String(deviceId || "").trim();
  if (!cleanEmail) {
    return { status: "ERROR", autorizado: false, error: "EMAIL_REQUERIDO" };
  }

  var fechaHoy = Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd");
  var horaActual = Utilities.formatDate(new Date(), "America/Mexico_City", "HH:mm:ss");

  var ID_OLLIN_OPERACIONES_2026 = "1njJIZBtYVqwtyNS-1SkeTMxDh7y6RctH2yoL0vXltbk";
  try {
    var ssOllin = SpreadsheetApp.openById(ID_OLLIN_OPERACIONES_2026);
    var shSesiones = ssOllin.getSheetByName("CONTROL_SESIONES");

    if (!shSesiones) {
      shSesiones = ssOllin.insertSheet("CONTROL_SESIONES");
      var headers = ["Usuario", "Fecha", "Device_ID", "Hora_Inicio", "Ultimo_Ping", "Estatus_Sesion"];
      shSesiones.appendRow(headers);
      shSesiones.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
    }

    var data = shSesiones.getDataRange().getValues();
    var rowIndexActive = -1;
    var rowDeviceActive = "";

    for (var r = 1; r < data.length; r++) {
      var rUser = String(data[r][0] || "").trim().toLowerCase();
      var rFecha = String(data[r][1] || "").trim();
      var rDev = String(data[r][2] || "").trim();
      var rEst = String(data[r][5] || "").trim().toUpperCase();

      if (rUser === cleanEmail && rFecha === fechaHoy && rEst === "ACTIVA") {
        rowIndexActive = r + 1; // 1-indexed for Sheet Range
        rowDeviceActive = rDev;
        break;
      }
    }

    if (operacion === "CERRAR") {
      if (rowIndexActive !== -1 && (rowDeviceActive === cleanDevId || !cleanDevId)) {
        shSesiones.getRange(rowIndexActive, 6).setValue("CERRADA");
        shSesiones.getRange(rowIndexActive, 5).setValue(horaActual);
      }
      return { status: "OK", autorizado: true, mensaje: "Sesión cerrada correctamente" };
    }

    // OPERACION: VALIDAR
    if (rowIndexActive !== -1) {
      // Ya hay una sesión registrada hoy
      if (rowDeviceActive === cleanDevId || !rowDeviceActive) {
        // Mismo dispositivo: refrescar último ping
        shSesiones.getRange(rowIndexActive, 5).setValue(horaActual);
        return {
          status: "OK",
          autorizado: true,
          mensaje: "Sesión confirmada en este equipo"
        };
      } else {
        // DISPOSITIVO DISTINTO: Conflicto de concurrencia
        if (override === true) {
          // Master override: Marcar la sesión anterior como TRANSFERIDA
          shSesiones.getRange(rowIndexActive, 6).setValue("TRANSFERIDA");
          shSesiones.getRange(rowIndexActive, 5).setValue(horaActual);

          // Registrar la nueva sesión activa en este equipo
          shSesiones.appendRow([cleanEmail, fechaHoy, cleanDevId, horaActual, horaActual, "ACTIVA"]);
          return {
            status: "OK",
            autorizado: true,
            transferida: true,
            mensaje: "Sesión transferida exitosamente a este equipo"
          };
        } else {
          // Bloquear ingreso concurrente
          return {
            status: "BLOQUEADO",
            autorizado: false,
            error: "USUARIO_ACTIVO_OTRO_DISPOSITIVO",
            mensaje: "El usuario ya tiene un turno activo hoy en otro dispositivo. Por seguridad operativa, solo se permite un chofer a la vez.",
            deviceIdActivo: rowDeviceActive
          };
        }
      }
    } else {
      // Primera sesión del día para este usuario: Registrarla como ACTIVA
      shSesiones.appendRow([cleanEmail, fechaHoy, cleanDevId, horaActual, horaActual, "ACTIVA"]);
      return {
        status: "OK",
        autorizado: true,
        mensaje: "Turno iniciado correctamente"
      };
    }
  } catch(eSes) {
    Logger.log("⚠️ Error en gestionarSesionUsuario_: " + eSes.message);
    // En caso de fallo en BD, permitir acceso para no detener la operación en calle
    return {
      status: "OK",
      autorizado: true,
      mensaje: "Acceso autorizado en modo de contingencia",
      contingencia: true
    };
  }
}

/**
 * Consulta la lista de PIDs asignados al chofer en BD_APP_RUTA_2025 (PIEZAS_PID)
 * y en OLLIN_OPERACIONES_2026 (INGESTA_DIARIA / RUTA_OLLINQUI)
 */
function consultarPidsAsignadosChofer_(choferEmail) {
  var ID_BD_APP_RUTA_2025 = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
  var ID_OLLIN_OPERACIONES_2026 = "1njJIZBtYVqwtyNS-1SkeTMxDh7y6RctH2yoL0vXltbk";
  var cleanChofer = String(choferEmail || "").trim().toLowerCase();
  var pids = [];

  try {
    var ssRuta = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    var shPids = ssRuta.getSheetByName("PIEZAS_PID");
    var shGuias = ssRuta.getSheetByName("GUIAS_ASIGNADAS");

    var guiaInfoMap = {};
    if (shGuias && shGuias.getLastRow() > 1) {
      var gData = shGuias.getDataRange().getValues();
      var gHeaders = gData[0];
      var idxHwbG = getHeaderIndex_(gHeaders, "HWB_Guia", 0);
      var idxRcvrG = getHeaderIndex_(gHeaders, "Destinatario", 1);
      var idxDirG = getHeaderIndex_(gHeaders, "Direccion_Entrega", 2);
      var idxChoferG = getHeaderIndex_(gHeaders, "Chofer_Asignado", 4);
      var idxPzasG = getHeaderIndex_(gHeaders, "Total_Piezas", 5);

      for (var g = 1; g < gData.length; g++) {
        var hwb = String(gData[g][idxHwbG] || "").trim();
        if (hwb) {
          guiaInfoMap[hwb] = {
            destinatario: String(gData[g][idxRcvrG] || "").trim(),
            direccion: String(gData[g][idxDirG] || "").trim(),
            chofer: String(gData[g][idxChoferG] || "").trim().toLowerCase(),
            total_piezas: parseInt(gData[g][idxPzasG]) || 1
          };
        }
      }
    }

    if (shPids && shPids.getLastRow() > 1) {
      var pData = shPids.getDataRange().getValues();
      var pHeaders = pData[0];
      var idxHwbP = getHeaderIndex_(pHeaders, "HWB_Guia", 0);
      var idxPidP = getHeaderIndex_(pHeaders, "PID_Codigo", 1);
      var idxChoferP = getHeaderIndex_(pHeaders, "Chofer_Asignado", -1);
      if (idxChoferP === -1) idxChoferP = getHeaderIndex_(pHeaders, "Chofer", -1);
      var idxEstP = getHeaderIndex_(pHeaders, "Estatus_PID", 3);
      var idxEscValP = getHeaderIndex_(pHeaders, "Escaneo_Validacion", 4);

      for (var p = 1; p < pData.length; p++) {
        var pidRaw = String(pData[p][idxPidP] || "").trim();
        if (!pidRaw) continue;
        var pidSan = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(pidRaw) : pidRaw;
        var hwbRef = String(pData[p][idxHwbP] || "").trim();
        var estatusPid = String(pData[p][idxEstP] || "PRE_ASIGNADO").trim().toUpperCase();
        var escVal = String(pData[p][idxEscValP] || "SIN_CARGAR").trim().toUpperCase();

        var choferPid = idxChoferP !== -1 ? String(pData[p][idxChoferP] || "").trim().toLowerCase() : "";
        var gInfo = guiaInfoMap[hwbRef] || {};
        var choferFinal = choferPid || gInfo.chofer || "";

        var matchChofer = true;
        if (cleanChofer && cleanChofer !== "admin" && cleanChofer !== "todos") {
          var userAlias = cleanChofer.split("@")[0];
          matchChofer = !choferFinal || choferFinal.includes(cleanChofer) || choferFinal.includes(userAlias) || cleanChofer.includes(choferFinal);
        }

        if (matchChofer) {
          pids.push({
            pid: pidSan,
            hwb: hwbRef,
            estatus_pid: estatusPid,
            escaneo_validacion: escVal,
            a_bordo: escVal === "A_BORDO",
            destinatario: gInfo.destinatario || "",
            direccion: gInfo.direccion || ""
          });
        }
      }
    }

    return {
      status: "OK",
      exito: true,
      chofer: cleanChofer,
      total_asignados: pids.length,
      total_a_bordo: pids.filter(function(x) { return x.a_bordo; }).length,
      pids: pids
    };

  } catch(e) {
    Logger.log("⚠️ Error en consultarPidsAsignadosChofer_: " + e.message);
    return {
      status: "OK",
      exito: true,
      contingencia: true,
      error: e.message,
      total_asignados: 0,
      total_a_bordo: 0,
      pids: []
    };
  }
}

/**
 * Muta atómicamente el estado de los bultos a A_BORDO en PIEZAS_PID
 * y asienta la auditoría de carga en RAMPA_PAINANI de OLLIN_OPERACIONES_2026.
 */
function procesarCargaABordo_(payload) {
  var ID_BD_APP_RUTA_2025 = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
  var ID_OLLIN_OPERACIONES_2026 = "1njJIZBtYVqwtyNS-1SkeTMxDh7y6RctH2yoL0vXltbk";

  var chofer = String(payload.chofer || payload.email || "").trim();
  var devId = String(payload.device_id || "").trim();
  var lista = Array.isArray(payload.pids) ? payload.pids : [];
  var fechaHoy = new Date();
  var horaServidor = Utilities.formatDate(fechaHoy, "America/Mexico_City", "dd/MM/yyyy HH:mm:ss");
  var fechaIso = Utilities.formatDate(fechaHoy, "America/Mexico_City", "yyyy-MM-dd");

  if (lista.length === 0) {
    return { status: "EMPTY", exito: false, mensaje: "No se recibieron PIDs para marcar A_BORDO." };
  }

  var pidsABordo = [];
  lista.forEach(function(item) {
    var raw = typeof item === "string" ? item : (item.pid || item.raw || "");
    var san = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(raw) : raw.trim().toUpperCase();
    if (san) pidsABordo.push({ pid: san, raw: raw, hora: (item.hora || horaServidor) });
  });

  var actualizadosPidsPid = 0;
  var guiasMadreImpactadas = {};

  // 1. MUTAR A_BORDO EN PIEZAS_PID (BD_APP_RUTA_2025)
  try {
    var ssRuta = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    var shPids = ssRuta.getSheetByName("PIEZAS_PID");
    if (shPids && shPids.getLastRow() > 1) {
      var pData = shPids.getDataRange().getValues();
      var pHeaders = pData[0];
      var idxHwbP = getHeaderIndex_(pHeaders, "HWB_Guia", 0);
      var idxPidP = getHeaderIndex_(pHeaders, "PID_Codigo", 1);
      var idxChoferP = getHeaderIndex_(pHeaders, "Chofer_Asignado", -1);
      if (idxChoferP === -1) idxChoferP = getHeaderIndex_(pHeaders, "Chofer", -1);
      var idxEscValP = getHeaderIndex_(pHeaders, "Escaneo_Validacion", 4);

      var mapBordo = {};
      pidsABordo.forEach(function(x) { mapBordo[x.pid] = x; });

      for (var r = 1; r < pData.length; r++) {
        var rowPid = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(String(pData[r][idxPidP] || "")) : String(pData[r][idxPidP] || "");
        if (mapBordo[rowPid]) {
          if (idxEscValP !== -1) {
            shPids.getRange(r + 1, idxEscValP + 1).setValue("A_BORDO");
          }
          if (idxChoferP !== -1 && chofer) {
            var currentChofer = String(pData[r][idxChoferP] || "").trim();
            if (!currentChofer) {
              shPids.getRange(r + 1, idxChoferP + 1).setValue(chofer);
            }
          }
          var hwb = String(pData[r][idxHwbP] || "").trim();
          if (hwb) guiasMadreImpactadas[hwb] = true;
          actualizadosPidsPid++;
        }
      }
    }
  } catch(ePid) {
    Logger.log("⚠️ Error mutando en PIEZAS_PID: " + ePid.message);
  }

  // 2. REGISTRAR EN RAMPA_PAINANI (OLLIN_OPERACIONES_2026)
  var inyectadosRampa = 0;
  try {
    var ssOllin2026 = SpreadsheetApp.openById(ID_OLLIN_OPERACIONES_2026);
    var shRampa = ssOllin2026.getSheetByName("RAMPA_PAINANI");
    if (shRampa) {
      var filasRampa = [];
      pidsABordo.forEach(function(item) {
        filasRampa.push([
          item.pid,                                      // 1: ID_Pieza / PID (JD)
          "HWB_ABORDO",                                  // 2: ID_Guia
          item.hora,                                     // 3: Hora_Escaneo
          true,                                          // 4: Validado_Fisico
          fechaIso,                                      // 5: EDD_Fisico
          chofer,                                        // 6: Pochteca_Asignado
          "QRO-SUR",                                     // 7: Zona_Ruta
          "POCHTECA_PWA",                                // 8: Auditor_Rampa
          devId || "MOVIL_PWA",                          // 9: ID_Recepcion_Camion / Dispositivo
          "A_BORDO - Validado físicamente en rampa",     // 10: Observacion_Fisica
          fechaHoy                                       // 11: Marca_Tiempo_Servidor
        ]);
      });
      if (filasRampa.length > 0) {
        shRampa.getRange(shRampa.getLastRow() + 1, 1, filasRampa.length, filasRampa[0].length).setValues(filasRampa);
        inyectadosRampa = filasRampa.length;
      }
    }
  } catch(eRampa) {
    Logger.log("⚠️ Error registrando en RAMPA_PAINANI: " + eRampa.message);
  }

  SpreadsheetApp.flush();

  return {
    status: "OK",
    exito: true,
    mensaje: "✅ " + pidsABordo.length + " bultos pasados a A_BORDO exitosamente.",
    total_recibidos: pidsABordo.length,
    actualizados_piezas_pid: actualizadosPidsPid,
    registrados_rampa_painani: inyectadosRampa
  };
}


