/**
 * =======================================================================
 * SISTEMA DE RECLUTAMIENTO Y EVALUACIÓN POCHTECAS v2.0 (PROD) - BACKEND
 * TENANT EXCLUSIVO: @ARAUTO.EXPRESS (UNIVERSO 2 - CORPORATIVO OLLIN)
 * 
 * - Expediente Digital en Google Drive (INE, Comprobante, Foto Unidad)
 * - Sin restricción excluyente por año de vehículo (Todos permitidos)
 * - Evaluación de Dominio Territorial, Señal Celular y Protocolo Cliente Ausente
 * - Esquema de 19 Columnas en pestaña RECLUTAMIENTO_POCHTECAS
 * - Alerta Instantánea 24/7 vía Google Chat y Calpixqui (WhatsApp)
 * =======================================================================
 */

// ⚙️ CONFIGURACIÓN GLOBAL Y BÓVEDAS CORPORATIVAS (@arauto.express)
const SPREADSHEET_ID_PRIMARY = "1Qu9q7LCBIY5PcWYqKwroIRX9b57NCOwmvbP-cQJ_hGQ"; // Sheet Principal indicado en especificación v2.0
const SPREADSHEET_ID_MIRROR  = "1atR5hEHEbT8Ke-vzSPFYtce100IahIjpZVc1FO-Ayco"; // Bóveda Dedicada ARAUTO_RECLUTAMIENTO_POCHTECAS_2026
const HOJA_CANDIDATOS        = "RECLUTAMIENTO_POCHTECAS";
const DRIVE_FOLDER_NAME      = "EXPEDIENTES_RECLUTAMIENTO_POCHTECAS_AE";

// 📋 ESQUEMA OFICIAL v2.0 PROD (19 COLUMNAS)
const HEADERS_V2 = [
  "Timestamp",
  "Nombre",
  "Telefono",
  "Correo",
  "INE_Url",
  "Comprobante_Domicilio_Url",
  "Tipo_Vehiculo",
  "Marca_Modelo",
  "Año_Unidad",
  "Foto_Vehiculo_Url",
  "Equipo_Seguridad",
  "Comunidades_Preferencia",
  "Conocimiento_Carreteras",
  "Orientacion_Navegacion",
  "Experiencia_Milla",
  "Proc_Cliente_Ausente",
  "Evidencias_Manejo",
  "Estatus_Filtro",
  "Comentarios_IA"
];

// 📡 CANALES DE NOTIFICACIÓN Y MESA DE CONTROL
const DESTINATARIOS_CALPIXQUI = [
  "524491805948@c.us", // Sidharta Santiago (Tlayacanqui)
  "525541891708@c.us"  // Irvin Reyes (Tlachixqui)
];

/**
 * 🌐 Servidor del Formulario Móvil v2.0 (Web App GET)
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Reclutamiento y Evaluación Pochtecas v2.0 - Arauto Express')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

/**
 * 📥 Endpoint REST para envíos externos vía POST (Web App POST)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (errJson) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const resultado = registrarAspirantePochteca(payload);
    return ContentService.createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Error en endpoint doPost v2.0: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 📁 Obtiene o crea la carpeta corporativa en Google Drive para alojar los expedientes
 */
function obtenerCarpetaExpedientesDrive_(subcarpetaNombre) {
  const props = PropertiesService.getScriptProperties();
  let mainFolder = null;
  const cachedFolderId = props.getProperty("DRIVE_EXPEDIENTES_FOLDER_ID");

  if (cachedFolderId) {
    try {
      mainFolder = DriveApp.getFolderById(cachedFolderId);
    } catch (e) {
      mainFolder = null;
    }
  }

  if (!mainFolder) {
    const iter = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    if (iter.hasNext()) {
      mainFolder = iter.next();
    } else {
      mainFolder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
    }
    props.setProperty("DRIVE_EXPEDIENTES_FOLDER_ID", mainFolder.getId());
  }

  if (subcarpetaNombre) {
    const subIter = mainFolder.getFoldersByName(subcarpetaNombre);
    if (subIter.hasNext()) {
      return subIter.next();
    }
    return mainFolder.createFolder(subcarpetaNombre);
  }

  return mainFolder;
}

/**
 * ☁️ Sube un archivo codificado en Base64 a la carpeta de Drive corporativa y retorna su URL
 */
function guardarArchivoEnDrive_(fileObj, prefijoDoc, carpetaDestino) {
  if (!fileObj || !fileObj.base64 || !carpetaDestino) {
    return "";
  }
  try {
    let base64Data = String(fileObj.base64);
    if (base64Data.indexOf(",") !== -1) {
      base64Data = base64Data.split(",")[1];
    }
    const mimeType = String(fileObj.mimeType || "image/jpeg").toLowerCase();
    const extensionByMime = {
      "application/pdf": ".pdf",
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/heic": ".heic",
      "image/heif": ".heif"
    };
    if (!extensionByMime[mimeType] || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data) ||
        base64Data.length === 0 || base64Data.length % 4 !== 0 ||
        base64Data.length > 7 * 1024 * 1024) {
      console.warn("Adjunto omitido por formato o tamaño no válido (" + prefijoDoc + ").");
      return "";
    }

    const decoded = Utilities.base64Decode(base64Data);
    if (!decoded || decoded.length > 5 * 1024 * 1024) {
      console.warn("Adjunto omitido por exceder 5 MB (" + prefijoDoc + ").");
      return "";
    }
    const cleanName = prefijoDoc + "_" + Utilities.formatDate(new Date(), "America/Mexico_City", "yyyyMMdd_HHmmss") + extensionByMime[mimeType];
    const blob = Utilities.newBlob(decoded, mimeType, cleanName);
    const file = carpetaDestino.createFile(blob);

    return file.getUrl();
  } catch (errUp) {
    console.error("Error subiendo archivo (" + prefijoDoc + "):", errUp);
    return "";
  }
}

/**
 * 📊 Prepara la hoja RECLUTAMIENTO_POCHTECAS asegurando las 19 columnas de v2.0 PROD
 */
function prepararHojaDestino_(ss) {
  let sheet = ss.getSheetByName(HOJA_CANDIDATOS);
  if (!sheet) {
    sheet = ss.insertSheet(HOJA_CANDIDATOS);
    sheet.appendRow(HEADERS_V2);
  } else {
    const lastCol = sheet.getLastColumn();
    if (lastCol < HEADERS_V2.length) {
      sheet.getRange(1, 1, 1, HEADERS_V2.length).setValues([HEADERS_V2]);
    }
  }
  const headerRange = sheet.getRange(1, 1, 1, HEADERS_V2.length);
  headerRange.setFontWeight("bold").setBackground("#18181b").setFontColor("#f4f4f5");
  sheet.setFrozenRows(1);
  return sheet;
}

/**
 * 🧠 MOTOR POKA-YOKE DE EVALUACIÓN INTEGRAL v2.0
 * - Todos los años de unidad son permitidos (sin exclusión por antigüedad).
 * - Evalúa completitud de expediente (INE + Comprobante).
 * - Evalúa protocolo de cliente ausente / manejo de evidencias y experiencia previa.
 */
function evaluarCandidatoPokaYokeV2_(datos) {
  const observaciones = [];
  let tieneExpedienteCompleto = false;

  // 1. Verificación de Expediente Digital (INE + Comprobante)
  const ineOk = datos.ineUrl && datos.ineUrl.indexOf("http") === 0;
  const compOk = datos.comprobanteUrl && datos.comprobanteUrl.indexOf("http") === 0;
  if (ineOk && compOk) {
    tieneExpedienteCompleto = true;
    observaciones.push("Expediente digital completo (INE + Comprobante verificados).");
  } else {
    const faltantes = [];
    if (!ineOk) faltantes.push("INE");
    if (!compOk) faltantes.push("Comprobante de domicilio");
    observaciones.push("Expediente incompleto: Falta " + faltantes.join(" y ") + ".");
  }

  // 2. Evaluación de Protocolo de Cliente Ausente y Evidencias
  const textoProtocolo = (String(datos.procClienteAusente || "") + " " + String(datos.evidenciasManejo || "")).toLowerCase();
  const mencionaContacto = /llam|tel|whats|contact|avis|timbr|toc/.test(textoProtocolo);
  const mencionaFoto     = /foto|fachada|inmueble|domicilio|casa|evidencia|imagen|camara|cámara/.test(textoProtocolo);
  const mencionaRegistro = /voz|audio|nota|cod|cód|sistema|app|estatus|report|registr|ubicaci/.test(textoProtocolo);

  const puntajeProtocolo = (mencionaContacto ? 1 : 0) + (mencionaFoto ? 1 : 0) + (mencionaRegistro ? 1 : 0);
  const protocoloCorrecto = puntajeProtocolo >= 2 || textoProtocolo.trim().length >= 25;

  if (puntajeProtocolo === 3) {
    observaciones.push("Dominio sobresaliente de protocolo de ausencia (Contacto + Foto Fachada + Audio/Código).");
  } else if (protocoloCorrecto) {
    observaciones.push("Conoce protocolo básico de evidencias y cliente ausente.");
  } else {
    observaciones.push("Respuesta breve en protocolo de cliente ausente; reforzar regla de Foto Fachada + Audio Teoyolotl.");
  }

  // 3. Evaluación de Experiencia en Última Milla y Capacitación Ollinqui PWA
  const textoExp = String(datos.experienciaMilla || "").toLowerCase().trim();
  const sinExperiencia = textoExp.length < 5 ||
    /\b(ninguna|no tengo|sin experiencia|primera vez|nunca|nada|cero)\b/.test(textoExp);

  if (sinExperiencia) {
    observaciones.push("Perfil sin experiencia previa en última milla: Requiere capacitación relámpago en el uso de la PWA Ollinqui.");
  } else {
    observaciones.push("Cuenta con experiencia operativa en ruta/paquetería.");
  }

  // 4. Información de Unidad (Sin restricción de año)
  if (datos.anoUnidad) {
    observaciones.push("Unidad " + datos.tipoVehiculo + " (" + (datos.marcaModelo || "S/M") + " Mod. " + datos.anoUnidad + ") registrada sin restricción de año.");
  }

  // Dictamen Final Poka-Yoke:
  // APTO: Expediente completo (INE + Comprobante), responde adecuadamente procedimiento de evidencias y cuenta con experiencia.
  // EVALUACIÓN: Perfiles sin experiencia previa que requieran capacitación relámpago en PWA Ollinqui, o con expediente/protocolo por completar.
  let estatusFiltro = "EVALUACIÓN";
  if (tieneExpedienteCompleto && protocoloCorrecto && !sinExperiencia) {
    estatusFiltro = "APTO";
  }

  return {
    estatus: estatusFiltro,
    comentarios: observaciones.join(" | ")
  };
}

/**
 * ✍️ API PRINCIPAL DE REGISTRO Y EVALUACIÓN v2.0 (POKA-YOKE)
 */
function registrarAspirantePochteca(form) {
  let registroPrincipalGuardado = false;
  try {
    if (!form || !form.nombre || !form.telefono) {
      return {
        success: false,
        message: "Datos incompletos: Nombre y Teléfono son obligatorios."
      };
    }

    const timestamp = new Date();
    const nombreLimpio = String(form.nombre || "").trim().toUpperCase();
    const telefonoLimpio = String(form.telefono || "").replace(/\D/g, '').slice(-10);
    const correoLimpio = String(form.correo || "").trim().toLowerCase();

    const tipoVehiculo = String(form.tipoVehiculo || form.tipo_vehiculo || "").trim();
    const marcaModelo = String(form.marcaModelo || "").trim();
    const anoUnidad = String(form.anoUnidad || form.modelo_ano || "").trim();

    // Equipo de seguridad (puede venir como array o string separado por comas)
    let equipoSeguridadStr = "Ninguno seleccionado";
    if (Array.isArray(form.equipoSeguridad) && form.equipoSeguridad.length > 0) {
      equipoSeguridadStr = form.equipoSeguridad.join(", ");
    } else if (typeof form.equipoSeguridad === "string" && form.equipoSeguridad.trim() !== "") {
      equipoSeguridadStr = form.equipoSeguridad.trim();
    }

    const comunidadesPreferencia = String(form.comunidadesPreferencia || form.zona_interes || "").trim();
    const conocimientoCarreteras = String(form.conocimientoCarreteras || "").trim();
    const orientacionNavegacion  = String(form.orientacionNavegacion || "").trim();
    const experienciaMilla       = String(form.experienciaMilla || "").trim();
    const procClienteAusente     = String(form.procClienteAusente || "").trim();
    const evidenciasManejo       = String(form.evidenciasManejo || "").trim();
    let fotoVehiculoUrl = String(form.foto_url || form.fotoVehiculoUrl || "");

    const filaNueva = [
      timestamp,
      nombreLimpio,
      "'" + telefonoLimpio,
      correoLimpio,
      "Pendiente por WhatsApp",
      "Pendiente por WhatsApp",
      tipoVehiculo,
      marcaModelo || "No especificado",
      anoUnidad || "No especificado",
      fotoVehiculoUrl || "Sin foto de unidad",
      equipoSeguridadStr,
      comunidadesPreferencia,
      conocimientoCarreteras,
      orientacionNavegacion,
      experienciaMilla,
      procClienteAusente,
      evidenciasManejo,
      "EVALUACIÓN",
      "Registro recibido; expediente en verificación. Solicitar por WhatsApp cualquier adjunto faltante."
    ];

    // Persistir primero los datos básicos: Drive nunca debe impedir guardar al candidato.
    const spreadsheetPrincipal = SpreadsheetApp.openById(SPREADSHEET_ID_PRIMARY);
    const hojaPrincipal = prepararHojaDestino_(spreadsheetPrincipal);
    hojaPrincipal.appendRow(filaNueva);
    registroPrincipalGuardado = true;
    const filaPrincipal = hojaPrincipal.getLastRow();

    let ineUrl = form.ineUrl ? String(form.ineUrl) : "";
    let comprobanteUrl = form.comprobanteUrl ? String(form.comprobanteUrl) : "";
    let carpetaCandidato = null;
    let carpetaUrl = "";
    const hayArchivos = [form.ineFile, form.comprobanteFile, form.vehiculoFile].some(function(file) {
      return file && file.base64;
    });

    if (hayArchivos) {
      try {
        const carpetaNombreCandidato = nombreLimpio.replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, "_") + "_" + telefonoLimpio;
        carpetaCandidato = obtenerCarpetaExpedientesDrive_(carpetaNombreCandidato);
        carpetaUrl = carpetaCandidato.getUrl();
      } catch (eDriveFolder) {
        console.error("No se pudo preparar la carpeta de adjuntos; se conserva el registro:", eDriveFolder);
      }
    }

    if (form.ineFile && form.ineFile.base64) {
      ineUrl = carpetaCandidato ? guardarArchivoEnDrive_(form.ineFile, "INE_" + telefonoLimpio, carpetaCandidato) : "";
    }
    if (form.comprobanteFile && form.comprobanteFile.base64) {
      comprobanteUrl = carpetaCandidato ? guardarArchivoEnDrive_(form.comprobanteFile, "COMPROBANTE_" + telefonoLimpio, carpetaCandidato) : "";
    }
    if (form.vehiculoFile && form.vehiculoFile.base64) {
      fotoVehiculoUrl = carpetaCandidato ? guardarArchivoEnDrive_(form.vehiculoFile, "UNIDAD_" + telefonoLimpio, carpetaCandidato) : "";
    }

    const dictamen = evaluarCandidatoPokaYokeV2_({
      ineUrl: ineUrl,
      comprobanteUrl: comprobanteUrl,
      tipoVehiculo: tipoVehiculo,
      marcaModelo: marcaModelo,
      anoUnidad: anoUnidad,
      experienciaMilla: experienciaMilla,
      procClienteAusente: procClienteAusente,
      evidenciasManejo: evidenciasManejo
    });
    const estatusFiltro = dictamen.estatus;
    let comentariosIa = dictamen.comentarios;
    if (!ineUrl || !comprobanteUrl) {
      comentariosIa += " | Solicitar por WhatsApp: " +
        [!ineUrl ? "INE/identificación" : "", !comprobanteUrl ? "comprobante de domicilio" : ""]
          .filter(String).join(" y ") + ".";
    }
    if ((form.vehiculoFile && form.vehiculoFile.base64) && !fotoVehiculoUrl) {
      comentariosIa += " | Foto de unidad pendiente por falla o formato del adjunto.";
    }

    hojaPrincipal.getRange(filaPrincipal, 5, 1, 2).setValues([[
      ineUrl || "Pendiente por WhatsApp",
      comprobanteUrl || "Pendiente por WhatsApp"
    ]]);
    hojaPrincipal.getRange(filaPrincipal, 10).setValue(fotoVehiculoUrl || "Sin foto de unidad");
    hojaPrincipal.getRange(filaPrincipal, 18, 1, 2).setValues([[estatusFiltro, comentariosIa]]);
    try {
      const celdaEstatus = hojaPrincipal.getRange(filaPrincipal, 18);
      if (estatusFiltro === "APTO") {
        celdaEstatus.setBackground("#dcfce7").setFontColor("#15803d").setFontWeight("bold");
      } else {
        celdaEstatus.setBackground("#fef9c3").setFontColor("#a16207").setFontWeight("bold");
      }
    } catch (eStyle) {
      console.warn("No se pudo aplicar el formato de estatus; el registro sí está guardado:", eStyle);
    }

    const mirrorIds = [SPREADSHEET_ID_MIRROR];
    const customId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (customId && customId !== SPREADSHEET_ID_PRIMARY && mirrorIds.indexOf(customId) === -1) {
      mirrorIds.push(customId);
    }
    mirrorIds.forEach(function(idSheet) {
      if (!idSheet || idSheet === SPREADSHEET_ID_PRIMARY) return;
      try {
        const mirrorSheet = prepararHojaDestino_(SpreadsheetApp.openById(idSheet));
        mirrorSheet.appendRow(filaNueva.map(function(value, index) {
          if (index === 4) return ineUrl || "Pendiente por WhatsApp";
          if (index === 5) return comprobanteUrl || "Pendiente por WhatsApp";
          if (index === 9) return fotoVehiculoUrl || "Sin foto de unidad";
          if (index === 17) return estatusFiltro;
          if (index === 18) return comentariosIa;
          return value;
        }));
      } catch (eMirror) {
        console.warn("No se pudo actualizar la hoja espejo " + idSheet + "; el registro principal sí está guardado:", eMirror);
      }
    });

    // 5. Notificación Instantánea 24/7 a Mesa de Control (Google Chat + Calpixqui)
    try {
      despacharAlertaReclutamientoV2_({
        nombre: nombreLimpio,
        telefono: telefonoLimpio,
        correo: correoLimpio,
        ineUrl: ineUrl,
        comprobanteUrl: comprobanteUrl,
        tipoVehiculo: tipoVehiculo,
        marcaModelo: marcaModelo,
        anoUnidad: anoUnidad,
        fotoVehiculoUrl: fotoVehiculoUrl,
        equipoSeguridad: equipoSeguridadStr,
        comunidadesPreferencia: comunidadesPreferencia,
        conocimientoCarreteras: conocimientoCarreteras,
        experienciaMilla: experienciaMilla,
        procClienteAusente: procClienteAusente,
        estatusFiltro: estatusFiltro,
        comentarios: comentariosIa,
        carpetaUrl: carpetaUrl
      });
    } catch (eNotify) {
      console.error("No se pudo despachar la notificación; el registro sí está guardado:", eNotify);
    }

    const primerNombre = nombreLimpio.split(" ")[0];
    return {
      success: true,
      estatus: estatusFiltro,
      message: "¡Solicitud recibida, " + primerNombre + "! Guardamos tus datos y evaluación. " +
        ((!ineUrl || !comprobanteUrl) ? "Si faltó algún documento, te lo pediremos por WhatsApp. " : "") +
        "Te contactaremos por WhatsApp a la brevedad."
    };

  } catch (err) {
    console.error("Error en registrarAspirantePochteca v2.0:", err);
    if (registroPrincipalGuardado) {
      return {
        success: true,
        estatus: "EVALUACIÓN",
        message: "Tu solicitud quedó registrada. Estamos completando el expediente; si falta algún archivo, te lo pediremos por WhatsApp."
      };
    }
    return {
      success: false,
      message: "Error al procesar el registro en Bóveda Corporativa: " + err.toString()
    };
  }
}

/**
 * 🚀 DESPACHO DE ALERTA 24/7 v2.0 (GOOGLE CHAT + CALPIXQUI WHATSAPP)
 */
function despacharAlertaReclutamientoV2_(c) {
  const waLink = "https://wa.me/52" + c.telefono;
  const badge = c.estatusFiltro === "APTO" ? "✅ *APTO (EXPEDIENTE Y PROTOCOLO OK)*" : "🟡 *EVALUACIÓN (CAPACITACIÓN OLLINQUI PWA)*";

  // 1. Google Chat Webhook (Espacio Mesa de Control Sidharta & Irvin)
  try {
    const chatWebhook = PropertiesService.getScriptProperties().getProperty("GOOGLE_CHAT_WEBHOOK");
    if (chatWebhook && chatWebhook.startsWith("http")) {
      const textoChat = "🚨 *NUEVO EXPEDIENTE POCHTECA v2.0 RECIBIDO* 🚚📋\n\n" +
        "🏷️ *Dictamen Poka-Yoke:* " + badge + "\n" +
        "👤 *Candidato:* " + c.nombre + "\n" +
        "📱 *WhatsApp:* " + c.telefono + " ( " + waLink + " )\n" +
        "✉️ *Correo:* " + (c.correo || "N/A") + "\n" +
        "🚐 *Unidad:* " + c.tipoVehiculo + " — " + (c.marcaModelo || "S/M") + " (Año: " + (c.anoUnidad || "N/E") + ")\n" +
        "🦺 *Equipo Seguridad:* " + c.equipoSeguridad + "\n" +
        "🗺️ *Comunidades Preferencia:* " + (c.comunidadesPreferencia || "N/E") + "\n" +
        "🛣️ *Carreteras y Dominio:* " + (c.conocimientoCarreteras || "N/E") + "\n" +
        "📦 *Experiencia Última Milla:* " + (c.experienciaMilla || "N/E") + "\n" +
        "🚪 *Protocolo Cliente Ausente:* " + (c.procClienteAusente || "N/E") + "\n" +
        "📁 *Carpeta Expediente Drive:* " + (c.carpetaUrl || "En Drive Corporativo") + "\n" +
        "🪪 *INE:* " + (c.ineUrl || "Pendiente") + " | 🏠 *Comprobante:* " + (c.comprobanteUrl || "Pendiente") + "\n" +
        "🧠 *Diagnóstico IA:* " + c.comentarios + "\n\n" +
        "_Atención: Sidharta Santiago (+52 449 180 5948) | Irvin Reyes (+52 55 4189 1708)_";

      UrlFetchApp.fetch(chatWebhook, {
        method: "POST",
        contentType: "application/json; charset=UTF-8",
        payload: JSON.stringify({ text: textoChat }),
        muteHttpExceptions: true
      });
    } else {
      console.warn("GOOGLE_CHAT_WEBHOOK no está configurado en Script Properties.");
    }
  } catch (errChat) {
    console.error("Error al despachar a Google Chat:", errChat.toString());
  }

  // 2. Calpixqui WhatsApp Gateway (si está configurado en ScriptProperties)
  try {
    const calpixquiUrl = PropertiesService.getScriptProperties().getProperty("CALPIXQUI_GATEWAY_URL");
    if (calpixquiUrl && calpixquiUrl.startsWith("http")) {
      const msgWa = "🚨 *EXPEDIENTE POCHTECA v2.0 (" + c.estatusFiltro + ")* 🚚\n\n" +
        "👤 *Nombre:* " + c.nombre + "\n" +
        "📱 *Tel:* " + c.telefono + "\n" +
        "🚐 *Unidad:* " + c.tipoVehiculo + " " + (c.marcaModelo || "") + " (" + (c.anoUnidad || "") + ")\n" +
        "🗺️ *Comunidades:* " + (c.comunidadesPreferencia || "") + "\n" +
        "🧠 *Dictamen:* " + c.comentarios;

      DESTINATARIOS_CALPIXQUI.forEach(function(dest) {
        try {
          UrlFetchApp.fetch(calpixquiUrl.replace(/\/+$/, '') + "/send-message", {
            method: "POST",
            contentType: "application/json; charset=UTF-8",
            payload: JSON.stringify({ to: dest, message: msgWa }),
            muteHttpExceptions: true
          });
        } catch (eDest) {}
      });
    }
  } catch (errCalpixqui) {}
}

/**
 * 🧪 FUNCIÓN DE PRUEBA ADMINISTRATIVA v2.0
 */
function testReclutamientoV2() {
  const res = registrarAspirantePochteca({
    nombre: "JUAN PRUEBA POCHTECA V2",
    telefono: "4429876543",
    correo: "juan.pochteca@ejemplo.com",
    ineUrl: "https://drive.google.com/file/d/ine_demo_v2/view",
    comprobanteUrl: "https://drive.google.com/file/d/comp_demo_v2/view",
    fotoVehiculoUrl: "https://drive.google.com/file/d/unidad_demo_v2/view",
    tipoVehiculo: "Van",
    marcaModelo: "Ford Transit",
    anoUnidad: "2018",
    equipoSeguridad: ["Botas de casquillo", "Chaleco reflejante", "Cargador continuo"],
    comunidadesPreferencia: "Santa Rosa Jáuregui, Montenegro, Buenavista, Puerto de Aguirre",
    conocimientoCarreteras: "Carretera Federal 57, Libramiento Norponiente, Estatal 100 a Bernal y caminos a San Miguel",
    orientacionNavegacion: "Descargo mapas offline en Google Maps / Organic Maps antes de salir de rampa y pregunto referencias locales",
    experienciaMilla: "3 años entregando paquetería en rutas rurales y semiurbanas de Querétaro",
    procClienteAusente: "Llamar al destinatario dos veces, tomar foto clara de la fachada del domicilio y registrar código con nota de voz explicando referencias",
    evidenciasManejo: "Manejo diario de apps de reparto, captura de foto de fachada, firma en pantalla, foto de INE y notas de voz"
  });
  console.log("Resultado Test v2.0:", JSON.stringify(res));
}