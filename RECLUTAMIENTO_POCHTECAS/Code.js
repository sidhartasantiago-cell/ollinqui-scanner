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
const GOOGLE_CHAT_WEBHOOK_DEFAULT = "https://chat.googleapis.com/v1/spaces/AAQA-NmGVf0/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ml4k0Mmpx8c3vGco583llDQGEGJf3OY7LUMKlJjJIsY";
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
  if (!fileObj || !fileObj.base64) {
    return "";
  }
  try {
    let base64Data = String(fileObj.base64);
    if (base64Data.indexOf(",") !== -1) {
      base64Data = base64Data.split(",")[1];
    }
    const mimeType = fileObj.mimeType || "image/jpeg";
    const ext = fileObj.fileName && fileObj.fileName.indexOf(".") !== -1
      ? fileObj.fileName.substring(fileObj.fileName.lastIndexOf("."))
      : (mimeType.indexOf("pdf") !== -1 ? ".pdf" : ".jpg");

    const cleanName = prefijoDoc + "_" + Utilities.formatDate(new Date(), "America/Mexico_City", "yyyyMMdd_HHmmss") + ext;
    const decoded = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decoded, mimeType, cleanName);
    const file = carpetaDestino.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eShare) {
      // Si la política del dominio restringe cambio explícito, el propietario y admins ya tienen acceso total
    }

    return file.getUrl();
  } catch (errUp) {
    console.error("Error subiendo archivo (" + prefijoDoc + "):", errUp);
    return "Error al subir: " + errUp.toString();
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

    // 1. Subir archivos adjuntos a carpeta corporativa de Google Drive
    const carpetaNombreCandidato = nombreLimpio.replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, "_") + "_" + telefonoLimpio;
    const carpetaCandidato = obtenerCarpetaExpedientesDrive_(carpetaNombreCandidato);

    let ineUrl = "";
    if (form.ineFile && form.ineFile.base64) {
      ineUrl = guardarArchivoEnDrive_(form.ineFile, "INE_" + telefonoLimpio, carpetaCandidato);
    } else if (form.ineUrl) {
      ineUrl = String(form.ineUrl);
    }

    let comprobanteUrl = "";
    if (form.comprobanteFile && form.comprobanteFile.base64) {
      comprobanteUrl = guardarArchivoEnDrive_(form.comprobanteFile, "COMPROBANTE_" + telefonoLimpio, carpetaCandidato);
    } else if (form.comprobanteUrl) {
      comprobanteUrl = String(form.comprobanteUrl);
    }

    let fotoVehiculoUrl = "";
    if (form.vehiculoFile && form.vehiculoFile.base64) {
      fotoVehiculoUrl = guardarArchivoEnDrive_(form.vehiculoFile, "UNIDAD_" + telefonoLimpio, carpetaCandidato);
    } else if (form.foto_url || form.fotoVehiculoUrl) {
      fotoVehiculoUrl = String(form.foto_url || form.fotoVehiculoUrl);
    }

    // 2. Ejecutar Evaluación Poka-Yoke v2.0
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
    const comentariosIa = dictamen.comentarios;

    // 3. Armar fila de 19 columnas exactas
    const filaNueva = [
      timestamp,
      nombreLimpio,
      "'" + telefonoLimpio,
      correoLimpio,
      ineUrl || "Sin adjuntar",
      comprobanteUrl || "Sin adjuntar",
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
      estatusFiltro,
      comentariosIa
    ];

    // 4. Inyectar en Sheet Principal (1Qu9q7LCBIY5PcWYqKwroIRX9b57NCOwmvbP-cQJ_hGQ) y Espejo Corporativo
    const sheetsIds = [SPREADSHEET_ID_PRIMARY, SPREADSHEET_ID_MIRROR];
    const customId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (customId && sheetsIds.indexOf(customId) === -1) {
      sheetsIds.push(customId);
    }

    let inyectadoEnAlMenosUno = false;
    sheetsIds.forEach(function(idSheet) {
      if (!idSheet) return;
      try {
        const ss = SpreadsheetApp.openById(idSheet);
        const sheet = prepararHojaDestino_(ss);
        sheet.appendRow(filaNueva);

        const ultimaFila = sheet.getLastRow();
        const celdaEstatus = sheet.getRange(ultimaFila, 18); // Columna 18 = Estatus_Filtro
        if (estatusFiltro === "APTO") {
          celdaEstatus.setBackground("#dcfce7").setFontColor("#15803d").setFontWeight("bold");
        } else {
          celdaEstatus.setBackground("#fef9c3").setFontColor("#a16207").setFontWeight("bold");
        }
        inyectadoEnAlMenosUno = true;
      } catch (eSheet) {
        console.warn("Aviso al escribir en Sheet ID " + idSheet + ":", eSheet.toString());
      }
    });

    if (!inyectadoEnAlMenosUno) {
      throw new Error("No se pudo abrir ninguna de las Bóvedas configuradas.");
    }

    // 5. Notificación Instantánea 24/7 a Mesa de Control (Google Chat + Calpixqui)
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
      carpetaUrl: carpetaCandidato.getUrl()
    });

    const primerNombre = nombreLimpio.split(" ")[0];
    return {
      success: true,
      estatus: estatusFiltro,
      message: "¡Expediente recibido con éxito, " + primerNombre + "! El Tlayacanqui Sidharta Santiago y la Mesa de Control de Arauto Express han recibido tu documentación y evaluación territorial. Te contactaremos por WhatsApp a la brevedad."
    };

  } catch (err) {
    console.error("Error en registrarAspirantePochteca v2.0:", err);
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
    const chatWebhook = PropertiesService.getScriptProperties().getProperty("GOOGLE_CHAT_WEBHOOK") || GOOGLE_CHAT_WEBHOOK_DEFAULT;
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