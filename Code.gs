/**
 * 🏛️ CONSOLA DE TRANSICIÓN MAESTRA - SIERRA GORDA (v1.0 PROD)
 * 🚀 Conecta directo a la hoja RUTA para dar visibilidad inmediata a Daniel Juárez
 * 👤 Desarrollado para el Ecosistema OLLIN - Arauto Express
 */

// IDs Canónicos del Ecosistema OLLIN (Seguridad de ámbito global con var)
var ID_BD_CENTRAL_2023 = typeof ID_BD_CENTRAL_2023 !== 'undefined' ? ID_BD_CENTRAL_2023 : "1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8"; // BD CENTRAL (Ruta vieja)
var ID_BOVEDA_BATCH_MAESTRO = typeof ID_BOVEDA_BATCH_MAESTRO !== 'undefined' ? ID_BOVEDA_BATCH_MAESTRO : "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw"; // BOVEDA BATCH MAESTRO (MATRIZ_CP)
var ID_OLLIN_OPERACIONES_2026 = typeof ID_OLLIN_OPERACIONES_2026 !== 'undefined' ? ID_OLLIN_OPERACIONES_2026 : "1njJIZBtYVqwtyNS-1SkeTMxDh7y6RctH2yoL0vXltbk"; // OLLIN_OPERACIONES_2026 (Sesiones y Telemetría)
var VALOR_UMA_2026 = typeof VALOR_UMA_2026 !== 'undefined' ? VALOR_UMA_2026 : 108.57; // Valor oficial de la UMA 2026

// Webhook Google Chat Alertas Sierra Gorda
var WEBHOOK_CHAT_SIERRA = typeof WEBHOOK_CHAT_SIERRA !== 'undefined' ? WEBHOOK_CHAT_SIERRA : "https://chat.googleapis.com/v1/spaces/AAQAEoaLlMQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=C3nlfauF5BX4ywmc4xnQWDbr8B5qdJINL-SUbhHw3PI";

// Correos autorizados base para el Grupo Sierra Gorda de Daniel
var GRUPO_DANIEL = typeof GRUPO_DANIEL !== 'undefined' ? GRUPO_DANIEL : [
  "xichudaniel@gmail.com",
  "diegovv21mar@gmail.com",
  "victor18amadorm@gmail.com",
  "fmsanluispaq@gmail.com",
  "fmpaqueteriatvsm@gmail.com",
  "yesigonzg1827@gmail.com"
];

/**
 * 🌐 Servidor de Interfaz Web (Levanta Tlachialoni QRO o Consola Sierra Gorda)
 */
function doGet(e) {
  var page = (e && e.parameter && (e.parameter.view || e.parameter.page || e.parameter.v)) || '';
  var roleParam = (e && e.parameter && e.parameter.role) ? e.parameter.role.toLowerCase() : '';

  const OLLIN_FAVICON_URL = 'https://raw.githubusercontent.com/sidhartasantiago-cell/ollinqui-scanner/master/ollin-icon-192.png';

  // 1. Delegación a Receptor_PU para webhooks de AppSheet / Ollinqui PWA
  var accionPU = (e && e.parameter && (e.parameter.accion || e.parameter.action)) || '';
  if (accionPU && typeof receptorPU_doGet === 'function') {
    var accionesLocales = ['auditar_duplicados', 'procesar_aclaraciones', 'escanear_reclamos_gmail', 'depurar_gmail_historico', 'escanear_reclamos_en_vivo', 'clasificar_y_archivar_gmail', 'consulta_historica', 'inyectar_referencias_previas'];
    if (accionesLocales.indexOf(accionPU.toLowerCase()) === -1 && !page) {
      return receptorPU_doGet(e);
    }
  }

  if (page.toLowerCase() === 'auditar_duplicados' || (e && e.parameter && e.parameter.action === 'auditar_duplicados')) {
    return ContentService.createTextOutput(JSON.stringify(auditarDuplicadosSemana37()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'procesar_aclaraciones' || (e && e.parameter && e.parameter.action === 'procesar_aclaraciones')) {
    return ContentService.createTextOutput(JSON.stringify(procesarAclaracionesGmail()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'escanear_reclamos_gmail' || (e && e.parameter && e.parameter.action === 'escanear_reclamos_gmail')) {
    return ContentService.createTextOutput(JSON.stringify(escanearReclamosGmailRaw()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'depurar_gmail_historico' || (e && e.parameter && e.parameter.action === 'depurar_gmail_historico')) {
    return ContentService.createTextOutput(JSON.stringify(depurarReclamosHistoricosGmail(e && e.parameter)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'escanear_reclamos_en_vivo' || (e && e.parameter && e.parameter.action === 'escanear_reclamos_en_vivo')) {
    return ContentService.createTextOutput(JSON.stringify(obtenerReclamosEnVivoFrente6()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'clasificar_y_archivar_gmail' || (e && e.parameter && e.parameter.action === 'clasificar_y_archivar_gmail')) {
    var threadIdParam = (e && e.parameter && e.parameter.thread_id) || '';
    return ContentService.createTextOutput(JSON.stringify(clasificarYArchivarReclamoGmail(threadIdParam, e && e.parameter)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'consulta_historica' || (e && e.parameter && e.parameter.action === 'consulta_historica')) {
    var payloadConsulta = {
      direccion: (e && e.parameter && (e.parameter.direccion || e.parameter.query)) || '',
      cp: (e && e.parameter && e.parameter.cp) || '',
      destinatario: (e && e.parameter && e.parameter.destinatario) || '',
      modo_dispersion: (e && e.parameter && (e.parameter.modo_dispersion === 'true' || e.parameter.dispersion === 'true'))
    };
    return ContentService.createTextOutput(JSON.stringify(procesarConsultaHistoricaGAS(payloadConsulta)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'inyectar_referencias_previas' || (e && e.parameter && e.parameter.action === 'inyectar_referencias_previas')) {
    return ContentService.createTextOutput(JSON.stringify(inyectarReferenciasPreviasGuiasAsignadas()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // =========================================================================
  // 🔀 ENDPOINTS REST: CONVIVENCIA HÍBRIDA & MATRIZ DE MIGRACIÓN (v84.5 PROD)
  // =========================================================================
  if (page.toLowerCase() === 'obtener_matriz_migracion' || (e && e.parameter && e.parameter.action === 'obtener_matriz_migracion')) {
    return ContentService.createTextOutput(JSON.stringify(obtenerMatrizMigracionRutas()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'actualizar_modo_pochteca' || (e && e.parameter && e.parameter.action === 'actualizar_modo_pochteca')) {
    var pCor = (e && e.parameter && e.parameter.correo) || '';
    var pMdo = (e && e.parameter && e.parameter.modo) || '';
    var pOpr = (e && e.parameter && e.parameter.operador) || 'API_GET';
    return ContentService.createTextOutput(JSON.stringify(actualizarModoPochteca(pCor, pMdo, pOpr)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'conciliar_eventos_hibridos' || (e && e.parameter && e.parameter.action === 'conciliar_eventos_hibridos')) {
    return ContentService.createTextOutput(JSON.stringify(conciliarEventosHibridos(e && e.parameter)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'instalar_triggers_hibridos' || (e && e.parameter && e.parameter.action === 'instalar_triggers_hibridos')) {
    return ContentService.createTextOutput(JSON.stringify(instalarTriggersHibridos()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'obtener_aclaraciones_v2' || (e && e.parameter && e.parameter.action === 'obtener_aclaraciones_v2')) {
    return ContentService.createTextOutput(JSON.stringify(obtenerAclaracionesAbiertasV2()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (page.toLowerCase() === 'legacy_sierra') {
    var templateSierra = HtmlService.createTemplateFromFile('Index_Sierra');
    templateSierra.role = roleParam || 'daniel';
    templateSierra.user = (e && e.parameter && e.parameter.user) || 'xichudaniel@gmail.com';
    return templateSierra
      .evaluate()
      .setTitle('OLLIN - Consola Sierra Gorda (Legacy)')
      .setFaviconUrl(OLLIN_FAVICON_URL)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  var template = HtmlService.createTemplateFromFile('Index');
  var roleNormalized = roleParam;
  if (page.toLowerCase() === 'sierra' || roleParam === 'sierra' || roleParam === 'daniel') {
    roleNormalized = 'daniel';
  }
  template.role = roleNormalized ? roleNormalized : '';
  template.user = (e && e.parameter && (e.parameter.user || e.parameter.email)) || '';
  return template
    .evaluate()
    .setTitle('OLLIN - Centro de Mando Operativo Megapulpo (v84.5 PROD)')
    .setFaviconUrl(OLLIN_FAVICON_URL)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 🌐 Servidor de Peticiones POST (Webhooks de AppSheet y Calpixqui)
 */
function doPost(e) {
  try {
    var rawBody = e && e.postData ? e.postData.contents : "";
    var payload = {};
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody);
      } catch (errParse) {
        payload = (e && e.parameter) || {};
      }
    } else {
      payload = (e && e.parameter) ? e.parameter : {};
    }

    var action = String(payload.action || (e && e.parameter && e.parameter.action) || "").toLowerCase();

    if (action === "consulta_historica") {
      return ContentService.createTextOutput(JSON.stringify(procesarConsultaHistoricaGAS(payload)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "inyectar_referencias_previas") {
      return ContentService.createTextOutput(JSON.stringify(inyectarReferenciasPreviasGuiasAsignadas()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "procesar_aclaraciones") {
      return ContentService.createTextOutput(JSON.stringify(procesarAclaracionesGmail()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "escanear_reclamos_gmail") {
      return ContentService.createTextOutput(JSON.stringify(escanearReclamosGmailRaw()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "depurar_gmail_historico") {
      return ContentService.createTextOutput(JSON.stringify(depurarReclamosHistoricosGmail(payload)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "escanear_reclamos_en_vivo") {
      return ContentService.createTextOutput(JSON.stringify(obtenerReclamosEnVivoFrente6()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "clasificar_y_archivar_gmail") {
      var threadIdPost = payload.thread_id || (e && e.parameter && e.parameter.thread_id) || "";
      return ContentService.createTextOutput(JSON.stringify(clasificarYArchivarReclamoGmail(threadIdPost, payload)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "obtener_matriz_migracion") {
      return ContentService.createTextOutput(JSON.stringify(obtenerMatrizMigracionRutas()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "actualizar_modo_pochteca") {
      var pCorP = payload.correo || (e && e.parameter && e.parameter.correo) || '';
      var pMdoP = payload.modo || (e && e.parameter && e.parameter.modo) || '';
      var pOprP = payload.operador || (e && e.parameter && e.parameter.operador) || 'API_POST';
      return ContentService.createTextOutput(JSON.stringify(actualizarModoPochteca(pCorP, pMdoP, pOprP)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "conciliar_eventos_hibridos") {
      return ContentService.createTextOutput(JSON.stringify(conciliarEventosHibridos(payload)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "instalar_triggers_hibridos") {
      return ContentService.createTextOutput(JSON.stringify(instalarTriggersHibridos()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "obtener_aclaraciones_v2") {
      return ContentService.createTextOutput(JSON.stringify(obtenerAclaracionesAbiertasV2()))
        .setMimeType(ContentService.MimeType.JSON);
    }


    // Delegación a Receptor_PU para webhooks POST de AppSheet / Ollinqui PWA
    if (typeof receptorPU_doPost === 'function') {
      return receptorPU_doPost(e);
    }

    return ContentService.createTextOutput(JSON.stringify({
      exito: true,
      mensaje: "Webhook POST recibido por Consola OLLIN",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (errPost) {
    return ContentService.createTextOutput(JSON.stringify({
      exito: false,
      error: errPost.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 🛠️ Traduce "dd/MM/yyyy" a un formato de alta legibilidad en español
 */
function formatearFechaEspanol(fechaInput) {
  if (!fechaInput) return "Sin Fecha";
  var str = String(fechaInput).trim();
  if (str === "" || str === "null" || str === "undefined") return "Sin Fecha";
  
  var matchDmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchDmy) {
    var dia = parseInt(matchDmy[1], 10);
    var mes = parseInt(matchDmy[2], 10) - 1;
    var anio = parseInt(matchDmy[3], 10);
    return formatParts(dia, mes, anio);
  }
  
  var parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    return formatParts(parsedDate.getDate(), parsedDate.getMonth(), parsedDate.getFullYear());
  }
  
  return str;
}

function formatParts(dia, mes, anio) {
  var dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  var meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  
  var tempDate = new Date(anio, mes, dia);
  var diaSemana = dias[tempDate.getDay()];
  var mesNombre = meses[mes];
  
  return diaSemana + " " + dia + " de " + mesNombre;
}

/**
 * 🏔️ CONSOLA DE MONITOREO Y REASIGNACIÓN EN CALIENTE - SIERRA GORDA (OLLIN v82.0 PROD)
 * VINCULADA EXCLUSIVAMENTE A LA HOJA 'Ruta' DE 'BD CENTRAL 2023' (1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8)
 * Y 'COURIER' PARA EL CATÁLOGO DE OPERADORES.
 * CERO CONEXIÓN A BD_APP_RUTA_2025.
 */
function obtenerConsolaSierra(paramUser, paramRole) {
  try {
    var userEmail = String(paramUser || "xichudaniel@gmail.com").trim().toLowerCase();
    var role = String(paramRole || "daniel").trim().toLowerCase();

    // 1. Catálogo base de Pochtecas Grupo Daniel (Sierra Gorda) con zonas y teléfonos
    var pochtecasSierraMap = {
      "fmsanluispaq@gmail.com": { nombre: "Gregorio Adonai Sánchez", zona: "San Luis de la Paz", tel: "+524681395455" },
      "fmpaqueteriatvsm@gmail.com": { nombre: "Lyonnet Ramírez", zona: "Jalpan / San José Iturbide", tel: "+524411158571" },
      "yesigonzg1827@gmail.com": { nombre: "Maria Rosi", zona: "Pinal de Amoles", tel: "+524411077704" },
      "xichudaniel@gmail.com": { nombre: "Daniel Juárez", zona: "Xichú / Sierra Gorda", tel: "+524191005625" },
      "victor18amadorm@gmail.com": { nombre: "Víctor Amador (Comodín)", zona: "Comodín Sierra / Doctor Mora", tel: "+524191266463" },
      "diegovv21mar@gmail.com": { nombre: "Diego Rivera", zona: "Tierra Blanca", tel: "+524191002361" }
    };

    var emailsGrupoDaniel = Object.keys(pochtecasSierraMap);

    // 2. Conectar a BD CENTRAL 2023
    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);

    // Cargar nombres de choferes desde pestaña COURIER si existe
    var hojaCourier = ssCentral.getSheetByName("COURIER");
    var couriersMap = {};
    if (hojaCourier) {
      var datosC = hojaCourier.getDataRange().getValues();
      for (var c = 1; c < datosC.length; c++) {
        var emailC = String(datosC[c][3] || "").trim().toLowerCase();
        var nombreC = String(datosC[c][1] || "").trim();
        var telC = String(datosC[c][4] || "").trim();
        if (emailC) {
          couriersMap[emailC] = { nombre: nombreC || emailC, telefono: telC };
          if (pochtecasSierraMap[emailC] && nombreC) {
            pochtecasSierraMap[emailC].nombre = nombreC;
            if (telC) pochtecasSierraMap[emailC].tel = telC;
          }
        }
      }
    }

    // 3. Conectar a OLLIN_OPERACIONES_2026 para CONTROL_SESIONES y RUTA_OLLINQUI
    var sesionesMap = {};
    var eventosMap = {};
    try {
      var ssOllin = SpreadsheetApp.openById(ID_OLLIN_OPERACIONES_2026);
      var hojaSes = ssOllin.getSheetByName("CONTROL_SESIONES");
      if (hojaSes) {
        var dSes = hojaSes.getDataRange().getValues();
        var hoyStr = Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd");
        for (var s = 1; s < dSes.length; s++) {
          var uMail = String(dSes[s][0] || "").trim().toLowerCase();
          var uFecha = String(dSes[s][1] || "").trim();
          var uDev = String(dSes[s][2] || "").trim();
          var uInicio = String(dSes[s][3] || "").trim();
          var uPing = String(dSes[s][4] || "").trim();
          var uStatus = String(dSes[s][5] || "").trim().toUpperCase();
          if (uFecha === hoyStr || !uFecha) {
            sesionesMap[uMail] = {
              fecha: uFecha,
              deviceId: uDev,
              horaInicio: uInicio,
              ultimoPing: uPing,
              estatus: uStatus
            };
          }
        }
      }

      var hojaRutaOllin = ssOllin.getSheetByName("RUTA_OLLINQUI");
      if (hojaRutaOllin) {
        var dEve = hojaRutaOllin.getDataRange().getValues();
        for (var e = 1; e < dEve.length; e++) {
          var eChofer = String(dEve[e][9] || "").trim().toLowerCase();
          var eChk = String(dEve[e][3] || "").trim().toUpperCase();
          var eTs = dEve[e][10] || dEve[e][11];
          var eGps = String(dEve[e][8] || "").trim();

          if (!eventosMap[eChofer]) {
            eventosMap[eChofer] = { total: 0, oks: 0, incidencias: 0, ultimoTs: null, ultimoGps: "" };
          }
          eventosMap[eChofer].total++;
          if (eChk === "OK" || eChk === "FD" || eChk === "ENTREGADO") eventosMap[eChofer].oks++;
          else eventosMap[eChofer].incidencias++;

          var parsedTs = eTs ? new Date(eTs).getTime() : 0;
          if (!eventosMap[eChofer].ultimoTs || parsedTs > eventosMap[eChofer].ultimoTs) {
            eventosMap[eChofer].ultimoTs = parsedTs;
            eventosMap[eChofer].ultimoGps = eGps;
          }
        }
      }
    } catch(errOllin) {
      Logger.log("[Consola Sierra] Advertencia al leer OLLIN_OPERACIONES_2026: " + errOllin.toString());
    }

    // Determinar privilegios
    var esSuper = (role === "todos" || role === "irvin" || role === "tlayacanqui" || 
                   userEmail === "sidharta.santiago@arauto.express" || userEmail === "irvin.reyes@arauto.express");

    // 4. MATRIZ_CP: Leer 9 columnas de BOVEDA_BATCH_MAESTRO
    var cpInfoMap = {};
    var municipiosSet = {};
    try {
      var ssBoveda = SpreadsheetApp.openById(ID_BOVEDA_BATCH_MAESTRO);
      var hojaMatriz = ssBoveda.getSheetByName("MATRIZ_CP");
      if (hojaMatriz) {
        var datosMatriz = hojaMatriz.getDataRange().getValues();
        for (var m = 1; m < datosMatriz.length; m++) {
          var rowM = datosMatriz[m];
          var cpM = String(rowM[0] || "").trim();
          var munM = String(rowM[1] || "").trim();
          var zonaM = String(rowM[2] || "").trim();
          var titularM = String(rowM[3] || "").trim().toLowerCase();
          var supervisorM = String(rowM[5] || "").trim().toLowerCase();
          var overrideM = String(rowM[7] || "").trim().toLowerCase();
          var expOverrideM = String(rowM[8] || "").trim();

          if (cpM) {
            var esSierraCP = (supervisorM.indexOf("daniel") !== -1 || 
                              munM === "Xichú" || munM === "Victoria" || munM === "Atarjea" ||
                              munM === "Doctor Mora" || munM === "Santa Catarina" ||
                              munM === "San Luis de la Paz" || munM === "San Luis de la Paz / Sierra Gto" ||
                              munM === "Peñamiller" || munM === "San Joaquín" ||
                              munM === "Pinal de Amoles" || munM === "Arroyo Seco" ||
                              munM === "Jalpan de Serra" || munM === "Landa de Matamoros");

            cpInfoMap[cpM] = {
              cp: cpM,
              municipio: munM,
              zona: zonaM,
              titular: titularM,
              supervisor: supervisorM,
              overrideActivo: overrideM,
              fechaExpiracion: expOverrideM,
              esSierra: esSierraCP
            };

            if (esSierraCP || esSuper) {
              if (!municipiosSet[munM]) {
                municipiosSet[munM] = { nombre: munM, cps: [], countGuias: 0, esSierra: esSierraCP };
              }
              municipiosSet[munM].cps.push(cpM);
            }
          }
        }
      }
    } catch(errMatriz) {
      Logger.log("[Sierra Backend] Advertencia al leer MATRIZ_CP: " + errMatriz.toString());
    }

    // 5. Leer Hoja RUTA en BD CENTRAL 2023
    var hojaRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
    if (!hojaRuta) throw new Error("No se encontró la pestaña 'Ruta' en BD CENTRAL 2023.");

    var datosRuta = hojaRuta.getDataRange().getValues();
    if (datosRuta.length <= 1) {
      return {
        exito: true,
        kpis: { total: 0, ok: 0, pendientes: 0, internacionales: 0, huerfanas: 0 },
        guias: [],
        guiasHuerfanas: [],
        pochtecas: [],
        alertas: [],
        municipios: [],
        codigosPostales: [],
        usuario: { email: userEmail, esSuper: esSuper, grupo: esSuper ? "Todos" : "Daniel" }
      };
    }

    var cabeceras = datosRuta[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });
    var colGuia = cabeceras.indexOf("guia");
    if (colGuia === -1) colGuia = cabeceras.indexOf("guía");
    var colPid = cabeceras.indexOf("pid");
    var colCp = cabeceras.indexOf("c.p.");
    if (colCp === -1) colCp = cabeceras.indexOf("cp");
    var colPiezas = cabeceras.indexOf("piezas");
    var colAddr1 = cabeceras.indexOf("rcvr addr 1");
    var colAddr2 = cabeceras.indexOf("rcvr addr 2");
    var colAddr3 = cabeceras.indexOf("rcvr addr 3");
    var colName = cabeceras.indexOf("receiver name");
    var colChk = cabeceras.indexOf("checkpoint");
    var colComentarios = cabeceras.indexOf("quien recibio o comentarios");
    if (colComentarios === -1) colComentarios = cabeceras.indexOf("comentarios");
    var colFechaAsig = cabeceras.indexOf("fecha asignacion");
    var colCorreo = cabeceras.indexOf("id correo");
    var colEdd = cabeceras.indexOf("edd");
    var colServicio = cabeceras.indexOf("tipo de servicio");
    var colInter = cabeceras.indexOf("inter");
    var colTel = cabeceras.indexOf("telefono");

    var guiasList = [];
    var guiasHuerfanas = [];
    var kpis = {
      total: 0, ok: 0, pendientes: 0, internacionales: 0, huerfanas: 0,
      sierra: { total: 0, ok: 0, pendientes: 0, internacionales: 0, huerfanas: 0 },
      metropoli: { total: 0, ok: 0, pendientes: 0, internacionales: 0, huerfanas: 0 }
    };
    var pochtecasStats = {};

    function initPochtecaStats(em, equipoParam) {
      if (!em || pochtecasStats[em]) return pochtecasStats[em];
      var isSierra = (equipoParam === "SIERRA") || (pochtecasSierraMap[em] !== undefined);
      var pConf = pochtecasSierraMap[em] || couriersMap[em] || {};
      var nom = pConf.nombre || em.split("@")[0].toUpperCase();
      var z = pConf.zona || (isSierra ? "Sierra Gorda" : "Querétaro Metrópoli");
      var t = pConf.tel || pConf.telefono || "";
      var eq = isSierra ? "SIERRA" : "METROPOLI";

      pochtecasStats[em] = {
        email: em,
        nombre: nom,
        zona: z,
        equipo: eq,
        telefono: t,
        total: 0,
        ok: 0,
        pendientes: 0,
        incidencias: 0,
        internacionales: 0,
        horaInicio: "---",
        ultimoPing: "---",
        estadoSesion: "OFFLINE",
        minutosInactivo: 0,
        semaforo: "VERDE",
        sph: "0.0",
        avancePorcentaje: 0
      };

      if (sesionesMap[em]) {
        pochtecasStats[em].horaInicio = sesionesMap[em].horaInicio || "---";
        pochtecasStats[em].ultimoPing = sesionesMap[em].ultimoPing || "---";
        pochtecasStats[em].estadoSesion = (sesionesMap[em].estatus === "ACTIVA") ? "ONLINE" : "STANDBY";
      }

      if (eventosMap[em]) {
        pochtecasStats[em].ok = eventosMap[em].oks;
        pochtecasStats[em].incidencias = eventosMap[em].incidencias;
      }
      return pochtecasStats[em];
    }

    // Inicializar stats de todos los pochtecas del grupo Daniel
    emailsGrupoDaniel.forEach(function(em) {
      initPochtecaStats(em, "SIERRA");
    });

    // Si es superusuario (Sidharta / Irvin), registrar también operadores metropolitanos conocidos
    if (esSuper) {
      for (var cMail in couriersMap) {
        if (!pochtecasSierraMap[cMail]) {
          initPochtecaStats(cMail, "METROPOLI");
        }
      }
    }

    for (var r = 1; r < datosRuta.length; r++) {
      var row = datosRuta[r];
      var correoChofer = colCorreo !== -1 ? String(row[colCorreo] || "").trim().toLowerCase() : "";
      var cpVal = colCp !== -1 ? String(row[colCp] || "").trim() : "";
      var servicioVal = colServicio !== -1 ? String(row[colServicio] || "").trim() : "";

      var cpInfo = cpInfoMap[cpVal] || {};
      var esSierraCP = cpInfo.esSierra || (servicioVal && servicioVal.toLowerCase().indexOf("sierra") !== -1);
      var esHuerfana = (!correoChofer || correoChofer === "sin_asignar" || correoChofer === "sin_asignar@arauto.express" || correoChofer === "s/a");
      var esHuerfanaSierra = esSierraCP && esHuerfana;
      var esDelGrupoDaniel = pochtecasSierraMap[correoChofer] !== undefined;

      var equipoFila = (esDelGrupoDaniel || esSierraCP) ? "SIERRA" : "METROPOLI";

      // Poka-Yoke Estricto: Si el usuario es Daniel Juárez, filtrar estrictamente la Sierra
      if (!esSuper) {
        if (!esDelGrupoDaniel && !esHuerfanaSierra) {
          continue;
        }
      }

      var hwb = colGuia !== -1 ? String(row[colGuia] || "").trim() : "";
      var pidVal = colPid !== -1 ? String(row[colPid] || "").trim() : "";
      var piezasVal = colPiezas !== -1 ? (parseInt(row[colPiezas]) || 1) : 1;
      var destinatario = colName !== -1 ? String(row[colName] || "").trim() : "";
      var chkVal = colChk !== -1 ? String(row[colChk] || "").trim().toUpperCase() : "PRE_ASIGNADO";
      var comentarios = colComentarios !== -1 ? String(row[colComentarios] || "").trim() : "";
      var fechaAsignacion = colFechaAsig !== -1 ? String(row[colFechaAsig] || "").trim() : "";
      var eddVal = colEdd !== -1 ? String(row[colEdd] || "").trim() : "";
      var interVal = colInter !== -1 ? String(row[colInter] || "").trim().toUpperCase() : "";
      var telVal = colTel !== -1 ? String(row[colTel] || "").trim() : "";

      var dirParts = [];
      if (colAddr1 !== -1 && row[colAddr1]) dirParts.push(String(row[colAddr1]).trim());
      if (colAddr2 !== -1 && row[colAddr2]) dirParts.push(String(row[colAddr2]).trim());
      if (colAddr3 !== -1 && row[colAddr3]) dirParts.push(String(row[colAddr3]).trim());
      var direccion = dirParts.join(", ");

      // Determinar municipio
      var municipio = cpInfo.municipio || (servicioVal.indexOf("Sierra Gorda") !== -1 ? servicioVal.replace("Sierra Gorda - ", "") : (equipoFila === "SIERRA" ? "Sierra Gorda" : "Querétaro"));

      // Bandera Internacional
      var esInter = (interVal === "INTER" || interVal === "SI" || interVal === "1" || interVal === "TRUE" || 
                     servicioVal.toUpperCase().indexOf("INTER") !== -1 || pidVal.toUpperCase().indexOf("[INTER]") !== -1);

      // Normalizar Estatus (solo marcar OK si efectivamente fue entregado en campo)
      var estatusNormalizado = "PENDIENTE";
      if (chkVal === "OK" || chkVal === "ENTREGADO" || chkVal === "FD") {
        estatusNormalizado = "OK";
        kpis.ok++;
        if (equipoFila === "SIERRA") kpis.sierra.ok++; else kpis.metropoli.ok++;
      } else if (chkVal === "NH" || chkVal === "BA" || chkVal === "INCIDENCIA" || chkVal === "RECHAZADO") {
        estatusNormalizado = "INCIDENCIA";
        kpis.pendientes++;
        if (equipoFila === "SIERRA") kpis.sierra.pendientes++; else kpis.metropoli.pendientes++;
      } else {
        estatusNormalizado = "PENDIENTE";
        kpis.pendientes++;
        if (equipoFila === "SIERRA") kpis.sierra.pendientes++; else kpis.metropoli.pendientes++;
      }

      kpis.total++;
      if (equipoFila === "SIERRA") kpis.sierra.total++; else kpis.metropoli.total++;

      if (esInter) {
        kpis.internacionales++;
        if (equipoFila === "SIERRA") kpis.sierra.internacionales++; else kpis.metropoli.internacionales++;
      }

      // Nombre del chofer
      var nombreChofer = esHuerfana ? "⚠️ Sin Asignar" : (pochtecasSierraMap[correoChofer] ? pochtecasSierraMap[correoChofer].nombre : (couriersMap[correoChofer] ? couriersMap[correoChofer].nombre : correoChofer));

      if (esHuerfana) {
        kpis.huerfanas++;
        if (equipoFila === "SIERRA") kpis.sierra.huerfanas++; else kpis.metropoli.huerfanas++;
        guiasHuerfanas.push({
          guia: hwb,
          pid: pidVal,
          destinatario: destinatario,
          cp: cpVal || "S/CP",
          municipio: municipio,
          piezas: piezasVal,
          esInternacional: esInter,
          equipo: equipoFila,
          corredor: equipoFila,
          fila: r + 1
        });
      } else {
        if (!pochtecasStats[correoChofer]) {
          initPochtecaStats(correoChofer, equipoFila);
        }
        if (pochtecasStats[correoChofer]) {
          pochtecasStats[correoChofer].total++;
          if (estatusNormalizado === "OK") pochtecasStats[correoChofer].ok++;
          else if (estatusNormalizado === "INCIDENCIA") pochtecasStats[correoChofer].incidencias++;
          else pochtecasStats[correoChofer].pendientes++;
          if (esInter) pochtecasStats[correoChofer].internacionales++;
        }
      }

      // Conteo por municipio
      if (municipiosSet[municipio]) {
        municipiosSet[municipio].countGuias++;
      }

      guiasList.push({
        guia: hwb,
        pid: pidVal,
        destinatario: destinatario,
        direccion: direccion,
        cp: cpVal || "S/CP",
        municipio: municipio,
        chofer: correoChofer || "sin_asignar",
        choferNombre: nombreChofer,
        edd: formatearFechaEspanol(eddVal),
        estatus: estatusNormalizado,
        esInternacional: esInter,
        piezas: piezasVal,
        equipo: equipoFila,
        corredor: equipoFila,
        rowNumber: r + 1
      });
    }

    // 6. Centinela de Telemetría: Cálculo de Alertas en Vivo
    var now = new Date();
    var nowMs = now.getTime();
    var hoy830Ms = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0).getTime();
    var alertasActivas = [];

    for (var kMail in pochtecasStats) {
      var st = pochtecasStats[kMail];
      if (st.total === 0) continue;

      // Alerta A: Inicio Tardío (>08:30 hrs)
      var noHaIniciado = (st.horaInicio === "---" || st.estadoSesion === "OFFLINE");
      if (noHaIniciado && nowMs > hoy830Ms) {
        alertasActivas.push({
          tipo: "INICIO_TARDIO",
          nivel: "CRITICO",
          pochteca: st.nombre,
          email: st.email,
          telefono: st.telefono,
          zona: st.zona,
          equipo: st.equipo,
          mensaje: "Sin inicio de sesión en Ollinqui PWA tras las 08:30 hrs (" + st.total + " guías asignadas)."
        });
      }

      // Alerta B: Tiempos Prolongados entre Entregas (>45 min Sierra / >35 min Metrópoli)
      var umbralInactividad = (st.equipo === "SIERRA") ? 45 : 35;
      var ultimoTs = (eventosMap[kMail] && eventosMap[kMail].ultimoTs) ? eventosMap[kMail].ultimoTs : null;
      var minutosSinAvance = 0;
      if (ultimoTs) {
        minutosSinAvance = Math.max(0, Math.floor((nowMs - ultimoTs) / 60000));
      } else if (st.horaInicio !== "---") {
        var partesH = st.horaInicio.split(":");
        if (partesH.length >= 2) {
          var horaLoginDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(partesH[0]), parseInt(partesH[1]), 0);
          minutosSinAvance = Math.max(0, Math.floor((nowMs - horaLoginDate.getTime()) / 60000));
        }
      }

      st.minutosInactivo = minutosSinAvance;

      if (st.pendientes > 0) {
        if (minutosSinAvance >= umbralInactividad) {
          st.semaforo = "ROJO";
          alertasActivas.push({
            tipo: "INACTIVIDAD_PROLONGADA",
            nivel: "CRITICO",
            pochteca: st.nombre,
            email: st.email,
            telefono: st.telefono,
            zona: st.zona,
            equipo: st.equipo,
            minutos: minutosSinAvance,
            mensaje: minutosSinAvance + " min sin registrar entregas en " + st.zona + " (Umbral: " + umbralInactividad + " min)."
          });
        } else if (minutosSinAvance >= 20) {
          st.semaforo = "AMARILLO";
        } else {
          st.semaforo = "VERDE";
        }
      }

      if (st.total > 0) {
        st.avancePorcentaje = Math.round((st.ok / st.total) * 100);
      }
      if (st.horaInicio !== "---" && st.ok > 0) {
        var hPartes = st.horaInicio.split(":");
        var dInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hPartes[0]), parseInt(hPartes[1]), 0);
        var horasTranscurridas = Math.max(0.5, (nowMs - dInicio.getTime()) / 3600000);
        st.sph = (st.ok / horasTranscurridas).toFixed(1);
      }
    }

    // Armar lista de municipios para dropdown
    var municipiosLista = [];
    for (var mNom in municipiosSet) {
      municipiosLista.push({
        nombre: mNom,
        countGuias: municipiosSet[mNom].countGuias,
        totalCPs: municipiosSet[mNom].cps.length,
        cps: municipiosSet[mNom].cps,
        esSierra: !!municipiosSet[mNom].esSierra
      });
    }
    municipiosLista.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });

    // Armar lista de pochtecas para selectores
    var pochtecasLista = [];
    for (var pKey in pochtecasStats) {
      pochtecasLista.push(pochtecasStats[pKey]);
    }
    pochtecasLista.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });

    // Lista de CPs para selector
    var cpsLista = [];
    for (var cpK in cpInfoMap) {
      if (esSuper || cpInfoMap[cpK].esSierra) {
        cpsLista.push({
          cp: cpK,
          municipio: cpInfoMap[cpK].municipio,
          titular: cpInfoMap[cpK].titular,
          override: cpInfoMap[cpK].overrideActivo,
          expiracion: cpInfoMap[cpK].fechaExpiracion,
          esSierra: !!cpInfoMap[cpK].esSierra
        });
      }
    }
    cpsLista.sort(function(a, b) { return a.cp.localeCompare(b.cp); });

    return {
      exito: true,
      kpis: kpis,
      guias: guiasList,
      guiasHuerfanas: guiasHuerfanas,
      pochtecas: pochtecasLista,
      alertas: alertasActivas,
      municipios: municipiosLista,
      codigosPostales: cpsLista,
      usuario: {
        email: userEmail,
        esSuper: esSuper,
        grupo: esSuper ? "Todos" : "Daniel"
      },
      timestamp: new Date().toISOString()
    };

  } catch(err) {
    return {
      exito: false,
      error: err.toString()
    };
  }
}

/**
 * 🔄 Wrapper de compatibilidad para Index_Sierra y Tab 3 de Index
 */
function obtenerDatosRutaSierra() {
  return obtenerConsolaSierra("xichudaniel@gmail.com", "sierra");
}

/**
 * 🚚 REASIGNACIÓN EN LOTE CHOFER A CHOFER (OLLIN v82.0 PROD)
 * Actualiza atómicamente la Columna O (ID correo) en la hoja RUTA de BD CENTRAL 2023.
 */
function reasignarChoferAChofer(origenEmail, destinoEmail, usuarioEmail, role) {
  try {
    var uEmail = String(usuarioEmail || "xichudaniel@gmail.com").trim().toLowerCase();
    var orig = String(origenEmail || "").trim().toLowerCase();
    var dest = String(destinoEmail || "").trim().toLowerCase();

    if (!dest) throw new Error("Debes seleccionar un Pochteca Destino.");
    if (orig === dest) throw new Error("El Pochteca Origen y Destino no pueden ser el mismo.");

    var pochtecasSierraMap = {
      "fmsanluispaq@gmail.com": true,
      "fmpaqueteriatvsm@gmail.com": true,
      "yesigonzg1827@gmail.com": true,
      "xichudaniel@gmail.com": true,
      "victor18amadorm@gmail.com": true,
      "diegovv21mar@gmail.com": true
    };

    var esSuper = (role === "todos" || role === "irvin" || role === "tlayacanqui" || 
                   uEmail === "sidharta.santiago@arauto.express" || uEmail === "irvin.reyes@arauto.express");

    if (!esSuper && !pochtecasSierraMap[dest]) {
      throw new Error("El Pochteca Destino (" + dest + ") no pertenece al Grupo Daniel.");
    }

    // Abrir hoja RUTA en BD CENTRAL 2023
    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    var hojaRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
    if (!hojaRuta) throw new Error("No se encontró la pestaña 'Ruta' en BD CENTRAL 2023.");

    var lastRow = hojaRuta.getLastRow();
    if (lastRow <= 1) return { exito: true, totalReasignadas: 0, mensaje: "No hay guías en la hoja Ruta." };

    var datosR = hojaRuta.getDataRange().getValues();
    var cabeceras = datosR[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });
    var colCorreo = cabeceras.indexOf("id correo");
    if (colCorreo === -1) colCorreo = 14; // Default Col O
    var colChk = cabeceras.indexOf("checkpoint");
    if (colChk === -1) colChk = 9; // Default Col J

    var reasignadasCount = 0;
    var esSinAsignar = (orig === "sin_asignar" || orig === "sin_asignar@arauto.express" || orig === "");

    // Rango de la columna ID Correo (1-indexed)
    var rangeCorreos = hojaRuta.getRange(2, colCorreo + 1, lastRow - 1, 1);
    var valoresCorreos = rangeCorreos.getValues();

    for (var r = 1; r < datosR.length; r++) {
      var choferActual = String(datosR[r][colCorreo] || "").trim().toLowerCase();
      var chkActual = String(datosR[r][colChk] || "").trim().toUpperCase();

      // No reasignar si ya está entregado (OK / FD)
      if (chkActual === "OK" || chkActual === "ENTREGADO" || chkActual === "FD") continue;

      var matchOrigen = false;
      if (esSinAsignar) {
        matchOrigen = (choferActual === "" || choferActual === "sin_asignar@arauto.express" || choferActual === "sin_asignar");
      } else {
        matchOrigen = (choferActual === orig);
      }

      if (matchOrigen) {
        valoresCorreos[r - 1][0] = dest;
        reasignadasCount++;
      }
    }

    if (reasignadasCount > 0) {
      rangeCorreos.setValues(valoresCorreos);
      SpreadsheetApp.flush();

      // Notificación en vivo vía Webhook Google Chat
      var alertText = "🔄 *[REASIGNACIÓN EN LOTE - SIERRA GORDA]*\n" +
                      "👤 Supervisor: " + uEmail + "\n" +
                      "📦 Guías transferidas en BD Central: *" + reasignadasCount + "*\n" +
                      "📤 Origen: " + (esSinAsignar ? "Sin Asignar" : orig) + "\n" +
                      "📥 Destino: *" + dest + "*\n" +
                      "⏰ " + new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
      notificarGoogleChatSierra(alertText);
    }

    return {
      exito: true,
      totalReasignadas: reasignadasCount,
      mensaje: "Se transfirieron exitosamente " + reasignadasCount + " guías a " + dest + " en BD Central."
    };

  } catch(err) {
    return {
      exito: false,
      error: err.toString()
    };
  }
}

/**
 * 🗺️ REASIGNACIÓN POR CP O MUNICIPIO (OLLIN v82.0 PROD)
 * Actualiza Columna O (ID correo) en la hoja RUTA de BD CENTRAL 2023.
 * Opcionalmente actualiza Columna H (Override_Activo) en MATRIZ_CP de BOVEDA_BATCH_MAESTRO.
 */
function reasignarPorUbicacion(tipo, valor, destinoEmail, fechaExpiracion, usuarioEmail, role) {
  try {
    var uEmail = String(usuarioEmail || "xichudaniel@gmail.com").trim().toLowerCase();
    var dest = String(destinoEmail || "").trim().toLowerCase();
    var t = String(tipo || "municipio").trim().toLowerCase();
    var val = String(valor || "").trim();
    var fExp = String(fechaExpiracion || "").trim();

    if (!dest) throw new Error("Debes seleccionar un Pochteca Destino.");
    if (!val) throw new Error("Debes indicar un Municipio o Código Postal válido.");

    if (!fExp) {
      var d = new Date();
      d.setDate(d.getDate() + 1);
      fExp = Utilities.formatDate(d, "America/Mexico_City", "yyyy-MM-dd");
    }

    // Paso 1: Actualizar MATRIZ_CP en BOVEDA_BATCH_MAESTRO
    var cpsAfectados = {};
    var countCpsActualizados = 0;
    try {
      var ssBoveda = SpreadsheetApp.openById(ID_BOVEDA_BATCH_MAESTRO);
      var hojaMatriz = ssBoveda.getSheetByName("MATRIZ_CP");
      if (hojaMatriz) {
        var datosM = hojaMatriz.getDataRange().getValues();
        var numRowsM = datosM.length - 1;
        var rangeOverrides = hojaMatriz.getRange(2, 8, numRowsM, 2);
        var valoresOverrides = rangeOverrides.getValues();

        for (var i = 1; i < datosM.length; i++) {
          var cpRow = String(datosM[i][0] || "").trim();
          var munRow = String(datosM[i][1] || "").trim();

          var match = false;
          if (t === "municipio") {
            match = (munRow.toLowerCase() === val.toLowerCase());
          } else if (t === "cp") {
            match = (cpRow === val);
          }

          if (match) {
            valoresOverrides[i - 1][0] = dest; // Col H: Override_Activo
            valoresOverrides[i - 1][1] = fExp; // Col I: Fecha_Expiracion_Override
            cpsAfectados[cpRow] = true;
            countCpsActualizados++;
          }
        }

        if (countCpsActualizados > 0) {
          rangeOverrides.setValues(valoresOverrides);
        }
      }
    } catch(errM) {
      Logger.log("[Matriz CP Override Error]: " + errM.toString());
    }

    // Si tipo es CP, aseguramos que el CP esté en cpsAfectados
    if (t === "cp") {
      cpsAfectados[val] = true;
    }

    // Paso 2: Actualizar hoja RUTA en BD CENTRAL 2023
    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    var hojaRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
    if (!hojaRuta) throw new Error("No se encontró la pestaña 'Ruta' en BD CENTRAL 2023.");

    var lastRowR = hojaRuta.getLastRow();
    var countGuiasReasignadas = 0;

    if (lastRowR > 1) {
      var datosR = hojaRuta.getDataRange().getValues();
      var cabeceras = datosR[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });
      var colCp = cabeceras.indexOf("c.p.");
      if (colCp === -1) colCp = 2;
      var colCorreo = cabeceras.indexOf("id correo");
      if (colCorreo === -1) colCorreo = 14;
      var colChk = cabeceras.indexOf("checkpoint");
      if (colChk === -1) colChk = 9;
      var colServicio = cabeceras.indexOf("tipo de servicio");
      if (colServicio === -1) colServicio = 18;

      var rangeCorreosR = hojaRuta.getRange(2, colCorreo + 1, lastRowR - 1, 1);
      var valoresCorreosR = rangeCorreosR.getValues();

      for (var g = 1; g < datosR.length; g++) {
        var cpFila = String(datosR[g][colCp] || "").trim();
        var servicioFila = String(datosR[g][colServicio] || "").trim().toLowerCase();
        var chkFila = String(datosR[g][colChk] || "").trim().toUpperCase();

        if (chkFila === "OK" || chkFila === "ENTREGADO" || chkFila === "FD") continue;

        var coincidencia = false;
        if (cpsAfectados[cpFila]) {
          coincidencia = true;
        } else if (t === "municipio" && servicioFila.indexOf(val.toLowerCase()) !== -1) {
          coincidencia = true;
        }

        if (coincidencia) {
          valoresCorreosR[g - 1][0] = dest;
          countGuiasReasignadas++;
        }
      }

      if (countGuiasReasignadas > 0) {
        rangeCorreosR.setValues(valoresCorreosR);
        SpreadsheetApp.flush();
      }
    }

    // Notificación en vivo vía Webhook Google Chat
    var alertText = "🗺️ *[REASIGNACIÓN POR UBICACIÓN - SIERRA GORDA]*\n" +
                    "👤 Supervisor: " + uEmail + "\n" +
                    "📍 " + (t === "municipio" ? "Municipio: *" + val + "*" : "C.P.: *" + val + "*") + "\n" +
                    "📦 Guías reasignadas en BD Central: *" + countGuiasReasignadas + "*\n" +
                    "📥 Pochteca Asignado: *" + dest + "*\n" +
                    "📅 Vencimiento Override: " + fExp + "\n" +
                    "⏰ " + new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
    notificarGoogleChatSierra(alertText);

    return {
      exito: true,
      totalGuiasReasignadas: countGuiasReasignadas,
      totalCPsActualizados: countCpsActualizados,
      mensaje: "Se reasignaron " + countGuiasReasignadas + " guías a " + dest + " en BD Central."
    };

  } catch(err) {
    return {
      exito: false,
      error: err.toString()
    };
  }
}

/**
 * 📣 Notificador de Alertas a Google Chat para Sierra Gorda
 */
function notificarGoogleChatSierra(mensajeTexto) {
  try {
    if (!WEBHOOK_CHAT_SIERRA) return;
    var payload = JSON.stringify({ text: mensajeTexto });
    UrlFetchApp.fetch(WEBHOOK_CHAT_SIERRA, {
      method: "post",
      contentType: "application/json",
      payload: payload,
      muteHttpExceptions: true
    });
  } catch(e) {
    Logger.log("[Webhook Chat Error]: " + e.toString());
  }
}

/**
 * Convierte rutas relativas de AppSheet o File IDs de Drive a URLs sirvientes
 */
function convertirRutaAppSheet(ruta, tabla) {
  if (!ruta) return "";
  if (ruta.match(/^https?:\/\//)) return ruta;
  
  var fileIdMatch = ruta.match(/([a-zA-Z0-9_-]{33})/);
  if (fileIdMatch) {
    return "https://drive.google.com/uc?id=" + fileIdMatch[1];
  }
  
  // Convertir rutas relativas de AppSheet (ej. GUIAS_ASIGNADAS_Images/123.jpg)
  // Utilizando el appName de Ollinqui
  var appName = "Ollinqui-4781977";
  var tableName = tabla || "GUIAS_ASIGNADAS";
  return "https://www.appsheet.com/template/gettablefileurl?appName=" + encodeURIComponent(appName) + "&tableName=" + encodeURIComponent(tableName) + "&fileName=" + encodeURIComponent(ruta);
}



// ==========================================
// EXTRACTOR GCA7 - PARCHE DE EMERGENCIA
// ==========================================

const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "TU_API_KEY_AQUI";

/**
 * Función para sanitizar el PID según la Ley de la Doble J
 */
function sanitizarPIDParaBoveda(pidRaw) {
  var pidClean = pidRaw.toString().trim().toUpperCase();
  if (pidClean.indexOf("JJD") === 0) {
    pidClean = "JD" + pidClean.substring(3);
  }
  return pidClean;
}

/**
 * Enviar captura a Gemini 1.5 Flash para extraer JSON con guía y teléfono
 */
function analizarImagenGCA7ConIA(base64Image, mimeType) {
  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;
    
    const promptText = `Extrae de esta imagen la guía (suele ser alfanumérica o numérica larga) o PID, y el número de teléfono (10 dígitos).
Devuelve ÚNICAMENTE un objeto JSON válido con las llaves "guia_o_pid" y "telefono". 
Limpia el teléfono para que solo sean 10 dígitos numéricos (sin espacios ni guiones).
Si es un PID, devuélvelo tal cual aparece.
Ejemplo de salida:
{"guia_o_pid": "1234567890", "telefono": "4421234567"}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType || "image/png",
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    if (json.error) {
      throw new Error(json.error.message);
    }

    const textResult = json.candidates[0].content.parts[0].text;
    let extractedData;
    try {
        extractedData = JSON.parse(textResult);
    } catch(e) {
        // En caso de que haya markdown json \`\`\`json ... \`\`\`
        const cleanText = textResult.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        extractedData = JSON.parse(cleanText);
    }

    return {
      exito: true,
      datos: extractedData
    };
  } catch (error) {
    return {
      exito: false,
      error: error.toString()
    };
  }
}

/**
 * Inyectar el teléfono extraído en la BD CENTRAL 2023, pestaña RUTA
 */
function inyectarTelefonoEnRutaCentral(guiaOPid, telefono) {
  try {
    const idBuscado = sanitizarPIDParaBoveda(guiaOPid);
    const telefonoLimpio = String(telefono).replace(/\D/g, '').substring(0, 10);
    
    if (telefonoLimpio.length !== 10) {
      throw new Error("El teléfono no tiene 10 dígitos válidos: " + telefonoLimpio);
    }

    const ss = SpreadsheetApp.openById("1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8");
    const hojaRuta = ss.getSheetByName("RUTA");
    
    if (!hojaRuta) {
      throw new Error("No se encontró la pestaña 'RUTA' en la BD CENTRAL.");
    }

    const datos = hojaRuta.getDataRange().getValues();
    const cabeceras = datos[0].map(h => String(h).toLowerCase().trim());
    
    let colId = cabeceras.indexOf("guia");
    if (colId === -1) colId = cabeceras.indexOf("guía");
    if (colId === -1) colId = cabeceras.indexOf("pid");
    if (colId === -1) colId = cabeceras.indexOf("guia_o_pid");
    
    let colTel = cabeceras.indexOf("telefono");
    if (colTel === -1) colTel = cabeceras.indexOf("teléfono");
    if (colTel === -1) colTel = cabeceras.indexOf("tel_query");
    
    if (colId === -1 || colTel === -1) {
      throw new Error("No se encontraron las columnas de Guía/PID o Teléfono en la pestaña RUTA. Columnas actuales: " + cabeceras.join(", "));
    }

    let filaEncontrada = -1;
    for (let i = datos.length - 1; i >= 1; i--) {
      const valorCelda = sanitizarPIDParaBoveda(String(datos[i][colId]));
      if (valorCelda === idBuscado) {
        filaEncontrada = i + 1;
        break;
      }
    }

    if (filaEncontrada !== -1) {
      hojaRuta.getRange(filaEncontrada, colTel + 1).setValue(telefonoLimpio);
      return {
        exito: true,
        mensaje: "Teléfono " + telefonoLimpio + " inyectado en la guía/PID: " + idBuscado
      };
    } else {
      return {
        exito: false,
        error: "No se encontró la guía/PID " + idBuscado + " en la pestaña RUTA."
      };
    }
  } catch (error) {
    return {
      exito: false,
      error: error.toString()
    };
  }
}

/**
 * 🎙️ TEOYOLOTL IA - OBTENER AUDITORÍAS MULTIMODALES (NOTAS DE VOZ, FOTOS, EXCEPCIONES)
 * Conecta con BD_APP_RUTA_2025 para extraer audios webm y evidencias fotográficas
 */
function obtenerAuditoriasTeoyolotl() {
  try {
    var ID_BD_APP = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
    var resultados = [];

    try {
      var ssApp = SpreadsheetApp.openById(ID_BD_APP);
      var hojaGuias = ssApp.getSheetByName("GUIAS_ASIGNADAS");
      if (hojaGuias && hojaGuias.getLastRow() > 1) {
        var datos = hojaGuias.getDataRange().getValues();
        var headers = datos[0].map(function(h) { return String(h).toLowerCase().trim(); });
        var colGuia = headers.indexOf("guia");
        var colDest = headers.indexOf("destinatario");
        var colDir = headers.indexOf("direccioncompleta");
        var colChofer = headers.indexOf("chofer");
        var colEstatus = headers.indexOf("estatus_guia");
        var colAudio = headers.indexOf("audio_evidencia");
        var colFoto = headers.indexOf("foto_fachada");
        if (colFoto === -1) colFoto = headers.indexOf("imagen_fachada");
        var colComentarios = headers.indexOf("comentarios");

        for (var i = datos.length - 1; i >= 1; i--) {
          var row = datos[i];
          var guia = colGuia !== -1 ? String(row[colGuia]).trim() : "";
          var audio = colAudio !== -1 ? String(row[colAudio]).trim() : "";
          var foto = colFoto !== -1 ? String(row[colFoto]).trim() : "";
          var estatus = colEstatus !== -1 ? String(row[colEstatus]).trim() : "";
          var comentarios = colComentarios !== -1 ? String(row[colComentarios]).trim() : "";
          var chofer = colChofer !== -1 ? String(row[colChofer]).trim() : "";
          var dest = colDest !== -1 ? String(row[colDest]).trim() : "";

          if (audio || foto || (estatus && estatus !== "OK" && estatus !== "POR_ENTREGAR" && estatus !== "PRE_ASIGNADO" && estatus !== "SIN_CARGAR")) {
            resultados.push({
              guia: guia,
              destinatario: dest,
              operador: chofer,
              checkpoint: estatus,
              comentarios: comentarios,
              audioUrl: audio ? convertirRutaAppSheet(audio, "GUIAS_ASIGNADAS") : "",
              fotoUrl: foto ? convertirRutaAppSheet(foto, "GUIAS_ASIGNADAS") : "",
              tieneAudio: !!audio,
              tieneFoto: !!foto
            });
          }
          if (resultados.length >= 100) break;
        }
      }
    } catch(errApp) {
      Logger.log("Nota: Consulta Teoyolotl en BD App: " + errApp.toString());
    }

    return { exito: true, datos: resultados };
  } catch(err) {
    return { exito: true, datos: [], error: err.toString() };
  }
}

function sanitizarPiezasPidAhora() {
  const ID_BD_APP = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
  const ssApp = SpreadsheetApp.openById(ID_BD_APP);
  const hojaPiezas = ssApp.getSheetByName("PIEZAS_PID");
  if (!hojaPiezas || hojaPiezas.getLastRow() <= 1) {
    Logger.log("No hay datos en PIEZAS_PID");
    return { exito: true, mensaje: "Sin datos en PIEZAS_PID" };
  }

  const datos = hojaPiezas.getDataRange().getValues();
  const cab = datos[0].map(h => String(h).toLowerCase().trim());
  const colValIdx = cab.indexOf("escaneo_validacion") !== -1 ? cab.indexOf("escaneo_validacion") : cab.indexOf("validacion");
  const colEstPidIdx = cab.indexOf("estatus_pid") !== -1 ? cab.indexOf("estatus_pid") : cab.indexOf("estatus");

  let filasModificadas = 0;
  for (let p = 1; p < datos.length; p++) {
    let mod = false;
    if (colValIdx !== -1) {
      const val = String(datos[p][colValIdx]).trim();
      // Regla v81.2: Respetar A_BORDO, SIN_CARGAR, BYPASS_TLACHIXQUI y RECHAZADO
      if (val === "A_BORDO_CONFIRMADO") {
        datos[p][colValIdx] = "A_BORDO";
        mod = true;
      } else if (val === "FALTANTE_DHL_NO_INGRESADO" || val === "") {
        datos[p][colValIdx] = "SIN_CARGAR";
        mod = true;
      }
    }
    if (colEstPidIdx !== -1) {
      const est = String(datos[p][colEstPidIdx]).trim();
      if (est === "FALTANTE_DHL") {
        datos[p][colEstPidIdx] = "PRE_ASIGNADO";
        mod = true;
      }
    }
    if (mod) filasModificadas++;
  }

  if (filasModificadas > 0) {
    hojaPiezas.getRange(1, 1, datos.length, datos[0].length).setValues(datos);
  }

  Logger.log("🧹 PIEZAS_PID Sanitizado (v81.2 PROD): " + filasModificadas + " filas normalizadas a SIN_CARGAR.");
  return { exito: true, modificadas: filasModificadas };
}

/**
 * 🔍 AUDITORÍA DE DUPLICADOS SEMANA 37 (2026)
 * Examina '2025 Tabla de facturacion QRO 2.0' en la pestaña 'Ruta Backend'
 */
function auditarDuplicadosSemana37() {
  try {
    var ID_TABLA_FACTURACION = "1d6D8jy5PGScalE8POFou1UYTpbW6p1Vi5xovrqZay6U";
    var ss = SpreadsheetApp.openById(ID_TABLA_FACTURACION);
    var allSheets = ss.getSheets();
    var sheetNames = allSheets.map(function(s) { return s.getName(); });
    
    // Buscar la pestaña exacta o por aproximación
    var hoja = ss.getSheetByName("Ruta Backend") || ss.getSheetByName("Ruta Back end") || ss.getSheetByName("RutaBackend") || ss.getSheetByName("Ruta_Backend");
    if (!hoja) {
      for (var s = 0; s < allSheets.length; s++) {
        var sName = allSheets[s].getName().toLowerCase();
        if (sName.indexOf("ruta") !== -1 && (sName.indexOf("back") !== -1 || sName.indexOf("end") !== -1)) {
          hoja = allSheets[s];
          break;
        }
      }
    }
    
    // Si aún no se encuentra, usar la primera hoja o avisar pestañas disponibles
    if (!hoja) {
      return {
        exito: false,
        error: "No se encontró la pestaña 'Ruta Backend'. Pestañas disponibles en el libro: " + sheetNames.join(" | ")
      };
    }
    
    var nombrePestana = hoja.getName();
    var data = hoja.getDataRange().getValues();
    if (data.length < 2) {
      return {
        exito: true,
        pestana: nombrePestana,
        mensaje: "La hoja está vacía o solo tiene encabezados.",
        totalFilas: data.length
      };
    }
    
    var cabeceras = data[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });
    
    var idxGuia = cabeceras.indexOf("guia");
    if (idxGuia === -1) idxGuia = cabeceras.indexOf("guía");
    if (idxGuia === -1) idxGuia = cabeceras.indexOf("hwb");
    if (idxGuia === -1) idxGuia = cabeceras.indexOf("hwb no");
    
    var idxPid = cabeceras.indexOf("pid");
    if (idxPid === -1) idxPid = cabeceras.indexOf("piece id");
    
    var idxCheckpoint = cabeceras.indexOf("checkpoint");
    if (idxCheckpoint === -1) idxCheckpoint = cabeceras.indexOf("estatus");
    if (idxCheckpoint === -1) idxCheckpoint = cabeceras.indexOf("last event cd");
    
    var idxFecha = cabeceras.indexOf("fecha en ruta");
    if (idxFecha === -1) idxFecha = cabeceras.indexOf("fecha asignacion");
    if (idxFecha === -1) idxFecha = cabeceras.indexOf("fecha");
    if (idxFecha === -1) idxFecha = cabeceras.indexOf("delivery date");
    if (idxFecha === -1) idxFecha = cabeceras.indexOf("event date");
    
    var idxSemana = cabeceras.indexOf("semana");
    if (idxSemana === -1) idxSemana = cabeceras.indexOf("semana factura");
    
    var idxCliente = cabeceras.indexOf("receiver name");
    if (idxCliente === -1) idxCliente = cabeceras.indexOf("nombre destinatario");
    if (idxCliente === -1) idxCliente = cabeceras.indexOf("cliente");
    
    var idxOperador = cabeceras.indexOf("id correo");
    if (idxOperador === -1) idxOperador = cabeceras.indexOf("operador");
    if (idxOperador === -1) idxOperador = cabeceras.indexOf("chofer");

    var conteoPorGuia = {};
    var filasAnalizadas = 0;
    
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var g = idxGuia !== -1 ? String(row[idxGuia] || "").trim() : "";
      if (!g) continue;
      
      var chk = idxCheckpoint !== -1 ? String(row[idxCheckpoint] || "").trim().toUpperCase() : "SIN_CHECKPOINT";
      var fch = idxFecha !== -1 ? String(row[idxFecha] || "").trim() : "";
      var sem = idxSemana !== -1 ? String(row[idxSemana] || "").trim() : "";
      var cli = idxCliente !== -1 ? String(row[idxCliente] || "").trim() : "";
      var op = idxOperador !== -1 ? String(row[idxOperador] || "").trim() : "";
      var pidVal = idxPid !== -1 ? String(row[idxPid] || "").trim() : "";
      
      // Filtrar semana 37: si hay columna semana o si fecha coincide con semana 37 (Sep 2026)
      // Guardamos el objeto para analizar duplicados
      filasAnalizadas++;
      if (!conteoPorGuia[g]) {
        conteoPorGuia[g] = [];
      }
      conteoPorGuia[g].push({
        fila: r + 1,
        guia: g,
        pid: pidVal,
        checkpoint: chk,
        fecha: fch,
        semana: sem,
        cliente: cli,
        operador: op
      });
    }
    
    var duplicados = [];
    var totalConOK = 0;
    var totalOtros = 0;
    
    for (var guiaKey in conteoPorGuia) {
      if (conteoPorGuia[guiaKey].length > 1) {
        var registros = conteoPorGuia[guiaKey];
        var tieneOK = registros.some(function(item) { return item.checkpoint === "OK" || item.checkpoint === "FD" || item.checkpoint === "ENTREGADO"; });
        if (tieneOK) totalConOK++; else totalOtros++;
        
        duplicados.push({
          guia: guiaKey,
          totalApariciones: registros.length,
          tieneOK: tieneOK,
          checkpoints: registros.map(function(item) { return item.checkpoint; }).join(" | "),
          filas: registros.map(function(item) { return "Fila " + item.fila + " (" + item.checkpoint + ", " + item.fecha + ")"; }),
          detalle: registros
        });
      }
    }
    
    return {
      exito: true,
      libro: "2025 Tabla de facturacion QRO 2.0",
      pestana: nombrePestana,
      pestanasDisponibles: sheetNames,
      totalFilasDatos: filasAnalizadas,
      totalGuiasUnicas: Object.keys(conteoPorGuia).length,
      totalGuiasDuplicadas: duplicados.length,
      duplicadosConOK: totalConOK,
      duplicadosSinOK: totalOtros,
      duplicados: duplicados
    };
    
  } catch (err) {
    return {
      exito: false,
      error: err.toString()
    };
  }
}

// ================================================================================
// 🐙 MÓDULO MEGAPULPO: TELEMETRÍA, ASIGNACIÓN Y CENTINELA EN VIVO (OLLIN v83.0 PROD)
// ================================================================================

/**
 * 📡 Obtiene el estado telemétrico consolidado de la flota, alertas y guías
 */
function obtenerTelemetriaMegapulpo(paramUser, paramRole) {
  try {
    var userEmail = String(paramUser || "xichudaniel@gmail.com").trim().toLowerCase();
    var role = String(paramRole || "daniel").trim().toLowerCase();

    var esSierra = (role === "daniel" || role === "sierra");
    var esSuper = (role === "todos" || role === "irvin" || role === "tlayacanqui" || role === "sidharta" ||
                   userEmail === "sidharta.santiago@arauto.express" || userEmail === "irvin.reyes@arauto.express");

    // 1. Catálogo base de Pochtecas
    var pochtecasMasterMap = {
      "fmsanluispaq@gmail.com": { nombre: "Gregorio Adonai Sánchez", zona: "San Luis de la Paz", esSierra: true, tel: "+524681395455" },
      "fmpaqueteriatvsm@gmail.com": { nombre: "Lyonnet Ramírez", zona: "Jalpan / San José Iturbide", esSierra: true, tel: "+524411158571" },
      "yesigonzg1827@gmail.com": { nombre: "Maria Rosi", zona: "Pinal de Amoles", esSierra: true, tel: "+524411077704" },
      "xichudaniel@gmail.com": { nombre: "Daniel Juárez", zona: "Xichú / Sierra Gorda", esSierra: true, tel: "+524191005625" },
      "victor18amadorm@gmail.com": { nombre: "Víctor Amador (Comodín)", zona: "Comodín Sierra / Doctor Mora", esSierra: true, tel: "+524191266463" },
      "diegovv21mar@gmail.com": { nombre: "Diego Rivera", zona: "Tierra Blanca", esSierra: true, tel: "+524191002361" },
      "edgar.rodriguez.arauto@gmail.com": { nombre: "Edgar Rodríguez", zona: "Querétaro Centro / 5 Feb", esSierra: false, tel: "+524423716310" },
      "fernando.maestro.1991@gmail.com": { nombre: "Fernando Maestro", zona: "Querétaro Poniente", esSierra: false, tel: "+524424366990" }
    };

    // 2. Leer CONTROL_SESIONES de OLLIN_OPERACIONES_2026
    var sesionesMap = {};
    try {
      var ssOllin = SpreadsheetApp.openById(ID_OLLIN_OPERACIONES_2026);
      var hojaSesiones = ssOllin.getSheetByName("CONTROL_SESIONES");
      if (hojaSesiones) {
        var dSes = hojaSesiones.getDataRange().getValues();
        var hoyStr = Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd");
        for (var s = 1; s < dSes.length; s++) {
          var uMail = String(dSes[s][0] || "").trim().toLowerCase();
          var uFecha = String(dSes[s][1] || "").trim();
          var uDev = String(dSes[s][2] || "").trim();
          var uInicio = String(dSes[s][3] || "").trim();
          var uPing = String(dSes[s][4] || "").trim();
          var uStatus = String(dSes[s][5] || "").trim().toUpperCase();

          if (uFecha === hoyStr || !uFecha) {
            sesionesMap[uMail] = {
              fecha: uFecha,
              deviceId: uDev,
              horaInicio: uInicio,
              ultimoPing: uPing,
              estatus: uStatus
            };
          }
        }
      }
    } catch (eSes) {
      Logger.log("[Megapulpo] Error leyendo CONTROL_SESIONES: " + eSes.toString());
    }

    // 3. Leer RUTA_OLLINQUI de OLLIN_OPERACIONES_2026 para eventos vivos
    var eventosMap = {};
    try {
      var hojaRutaOllin = ssOllin ? ssOllin.getSheetByName("RUTA_OLLINQUI") : null;
      if (hojaRutaOllin) {
        var dEve = hojaRutaOllin.getDataRange().getValues();
        for (var e = 1; e < dEve.length; e++) {
          var eChofer = String(dEve[e][9] || "").trim().toLowerCase(); // Col J
          var eChk = String(dEve[e][3] || "").trim().toUpperCase(); // Col D
          var eTs = dEve[e][10] || dEve[e][11]; // Col K o L
          var eGps = String(dEve[e][8] || "").trim(); // Col I

          if (!eventosMap[eChofer]) {
            eventosMap[eChofer] = { total: 0, oks: 0, incidencias: 0, ultimoTs: null, ultimoGps: "" };
          }
          eventosMap[eChofer].total++;
          if (eChk === "OK" || eChk === "FD" || eChk === "ENTREGADO") eventosMap[eChofer].oks++;
          else eventosMap[eChofer].incidencias++;

          var parsedTs = eTs ? new Date(eTs).getTime() : 0;
          if (!eventosMap[eChofer].ultimoTs || parsedTs > eventosMap[eChofer].ultimoTs) {
            eventosMap[eChofer].ultimoTs = parsedTs;
            eventosMap[eChofer].ultimoGps = eGps;
          }
        }
      }
    } catch (eEve) {
      Logger.log("[Megapulpo] Error leyendo RUTA_OLLINQUI: " + eEve.toString());
    }

    // 4. Leer BD CENTRAL 2023 (Ruta) para Universo de Bultos Activos
    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    var hojaRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
    if (!hojaRuta) throw new Error("No se encontró la pestaña 'Ruta' en BD CENTRAL 2023.");

    var datosRuta = hojaRuta.getDataRange().getValues();
    var cabeceras = datosRuta[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });
    var colGuia = cabeceras.indexOf("guia"); if (colGuia === -1) colGuia = 0;
    var colPid = cabeceras.indexOf("pid"); if (colPid === -1) colPid = 1;
    var colCp = cabeceras.indexOf("c.p."); if (colCp === -1) colCp = cabeceras.indexOf("cp");
    var colDest = cabeceras.indexOf("receiver name"); if (colDest === -1) colDest = 7;
    var colChk = cabeceras.indexOf("checkpoint"); if (colChk === -1) colChk = 9;
    var colCorreo = cabeceras.indexOf("id correo"); if (colCorreo === -1) colCorreo = 14;
    var colEdd = cabeceras.indexOf("edd"); if (colEdd === -1) colEdd = 15;
    var colServicio = cabeceras.indexOf("tipo de servicio"); if (colServicio === -1) colServicio = 17;
    var colInter = cabeceras.indexOf("inter"); if (colInter === -1) colInter = 18;

    var pochtecasStats = {};
    var guiasHuerfanas = [];
    var guiasLista = [];
    var kpis = { total: 0, ok: 0, pendientes: 0, incidencias: 0, internacionales: 0, huerfanas: 0 };

    // Inicializar stats
    for (var pEmail in pochtecasMasterMap) {
      var pInfo = pochtecasMasterMap[pEmail];
      if (esSierra && !pInfo.esSierra) continue;

      pochtecasStats[pEmail] = {
        email: pEmail,
        nombre: pInfo.nombre,
        zona: pInfo.zona,
        esSierra: pInfo.esSierra,
        telefono: pInfo.tel,
        total: 0,
        ok: 0,
        pendientes: 0,
        incidencias: 0,
        internacionales: 0,
        horaInicio: "---",
        ultimoPing: "---",
        estadoSesion: "OFFLINE",
        minutosInactivo: 0,
        semaforo: "VERDE",
        ultimoGps: "",
        sph: "0.0",
        avancePorcentaje: 0
      };

      if (sesionesMap[pEmail]) {
        pochtecasStats[pEmail].horaInicio = sesionesMap[pEmail].horaInicio || "---";
        pochtecasStats[pEmail].ultimoPing = sesionesMap[pEmail].ultimoPing || "---";
        pochtecasStats[pEmail].estadoSesion = (sesionesMap[pEmail].estatus === "ACTIVA") ? "ONLINE" : "STANDBY";
      }

      if (eventosMap[pEmail]) {
        pochtecasStats[pEmail].ok = eventosMap[pEmail].oks;
        pochtecasStats[pEmail].incidencias = eventosMap[pEmail].incidencias;
        pochtecasStats[pEmail].ultimoGps = eventosMap[pEmail].ultimoGps;
      }
    }

    var now = new Date();
    var nowMs = now.getTime();
    var hoy830Ms = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0).getTime();

    for (var r = 1; r < datosRuta.length; r++) {
      var row = datosRuta[r];
      var correo = colCorreo !== -1 ? String(row[colCorreo] || "").trim().toLowerCase() : "";
      var chk = colChk !== -1 ? String(row[colChk] || "").trim().toUpperCase() : "PRE_ASIGNADO";
      var hwb = colGuia !== -1 ? String(row[colGuia] || "").trim() : "";
      var pidVal = colPid !== -1 ? String(row[colPid] || "").trim() : "";
      var cpVal = colCp !== -1 ? String(row[colCp] || "").trim() : "";
      var destVal = colDest !== -1 ? String(row[colDest] || "").trim() : "";
      var servVal = colServicio !== -1 ? String(row[colServicio] || "").trim() : "";
      var interVal = colInter !== -1 ? String(row[colInter] || "").trim().toUpperCase() : "";

      var esInter = (interVal === "INTER" || interVal === "SI" || interVal === "1" || 
                     servVal.toUpperCase().indexOf("INTER") !== -1 || pidVal.toUpperCase().indexOf("[INTER]") !== -1);

      var esHuerfana = (correo === "" || correo === "sin_asignar" || correo === "sin_asignar@arauto.express");
      var esPochtecaSierra = pochtecasMasterMap[correo] && pochtecasMasterMap[correo].esSierra;
      if (esSierra && !esPochtecaSierra && !esHuerfana) continue;

      var estatusNorm = "PENDIENTE";
      if (chk === "OK" || chk === "ENTREGADO" || chk === "FD") estatusNorm = "OK";
      else if (chk === "NH" || chk === "BA" || chk === "CA" || chk === "RD" || chk === "INCIDENCIA") estatusNorm = "INCIDENCIA";

      kpis.total++;
      if (estatusNorm === "OK") kpis.ok++;
      else if (estatusNorm === "INCIDENCIA") { kpis.incidencias++; kpis.pendientes++; }
      else kpis.pendientes++;

      if (esInter) kpis.internacionales++;

      if (esHuerfana) {
        kpis.huerfanas++;
        guiasHuerfanas.push({
          guia: hwb,
          pid: pidVal,
          cp: cpVal,
          destinatario: destVal,
          fila: r + 1,
          esInternacional: esInter
        });
      } else if (pochtecasStats[correo]) {
        pochtecasStats[correo].total++;
        if (estatusNorm === "OK") pochtecasStats[correo].ok++;
        else if (estatusNorm === "INCIDENCIA") pochtecasStats[correo].incidencias++;
        else pochtecasStats[correo].pendientes++;
        if (esInter) pochtecasStats[correo].internacionales++;
      }

      guiasLista.push({
        guia: hwb,
        pid: pidVal,
        cp: cpVal,
        destinatario: destVal,
        chofer: correo,
        choferNombre: pochtecasMasterMap[correo] ? pochtecasMasterMap[correo].nombre : (correo || "Sin Asignar"),
        estatus: estatusNorm,
        esInternacional: esInter,
        fila: r + 1
      });
    }

    // 5. Calcular Alertas en Vivo (Centinela)
    var alertasActivas = [];

    for (var em in pochtecasStats) {
      var st = pochtecasStats[em];
      if (st.total === 0) continue;

      // A. Alerta de Inicio de Sistema
      var noHaIniciado = (st.horaInicio === "---" || st.estadoSesion === "OFFLINE");
      if (noHaIniciado && nowMs > hoy830Ms) {
        alertasActivas.push({
          tipo: "INICIO_TARDIO",
          nivel: "CRITICO",
          pochteca: st.nombre,
          email: st.email,
          telefono: st.telefono,
          mensaje: "No ha iniciado sesión en Ollinqui PWA (Límite 08:30 hrs).",
          hora: st.horaInicio
        });
      }

      // B. Alerta de Tiempos Prolongados entre Entregas
      var ultimoTs = (eventosMap[em] && eventosMap[em].ultimoTs) ? eventosMap[em].ultimoTs : null;
      var minutosSinAvance = 0;
      if (ultimoTs) {
        minutosSinAvance = Math.max(0, Math.floor((nowMs - ultimoTs) / 60000));
      } else if (st.horaInicio !== "---") {
        var partesH = st.horaInicio.split(":");
        if (partesH.length >= 2) {
          var horaLoginDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(partesH[0]), parseInt(partesH[1]), 0);
          minutosSinAvance = Math.max(0, Math.floor((nowMs - horaLoginDate.getTime()) / 60000));
        }
      }

      st.minutosInactivo = minutosSinAvance;

      var umbralRojo = st.esSierra ? 45 : 30;
      var umbralAmarillo = st.esSierra ? 20 : 15;

      if (st.pendientes > 0) {
        if (minutosSinAvance >= umbralRojo) {
          st.semaforo = "ROJO";
          alertasActivas.push({
            tipo: "INACTIVIDAD_PROLONGADA",
            nivel: "CRITICO",
            pochteca: st.nombre,
            email: st.email,
            telefono: st.telefono,
            minutos: minutosSinAvance,
            mensaje: minutosSinAvance + " min sin registrar entregas (" + (st.esSierra ? "Umbral Sierra: 45m" : "Umbral QRO: 30m") + ")."
          });
        } else if (minutosSinAvance >= umbralAmarillo) {
          st.semaforo = "AMARILLO";
        } else {
          st.semaforo = "VERDE";
        }
      }

      if (st.total > 0) {
        st.avancePorcentaje = Math.round((st.ok / st.total) * 100);
      }
      if (st.horaInicio !== "---" && st.ok > 0) {
        var hPartes = st.horaInicio.split(":");
        var dInicio = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hPartes[0]), parseInt(hPartes[1]), 0);
        var horasTranscurridas = Math.max(0.5, (nowMs - dInicio.getTime()) / 3600000);
        st.sph = (st.ok / horasTranscurridas).toFixed(1);
      }
    }

    var pochtecasLista = [];
    for (var kEmail in pochtecasStats) {
      pochtecasLista.push(pochtecasStats[kEmail]);
    }
    pochtecasLista.sort(function(a, b) { return b.total - a.total; });

    return {
      exito: true,
      timestamp: Utilities.formatDate(now, "America/Mexico_City", "yyyy-MM-dd HH:mm:ss"),
      kpis: kpis,
      alertas: alertasActivas,
      pochtecas: pochtecasLista,
      guiasHuerfanas: guiasHuerfanas,
      guias: guiasLista.slice(0, 300),
      usuario: { email: userEmail, rol: role, esSuper: esSuper }
    };

  } catch (err) {
    return { exito: false, error: err.toString() };
  }
}

/**
 * ⚡ Asignación atómica de Guías Huérfanas en Caliente
 */
function asignarGuiasEnCaliente(guiasArray, nuevoChoferEmail, supervisorEmail, rol) {
  try {
    var dest = String(nuevoChoferEmail || "").trim().toLowerCase();
    if (!dest) throw new Error("Debes indicar un Pochteca Destino.");
    if (!guiasArray || guiasArray.length === 0) throw new Error("No seleccionaste guías para asignar.");

    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    var hojaRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
    if (!hojaRuta) throw new Error("No se encontró la pestaña 'Ruta' en BD CENTRAL 2023.");

    var datosR = hojaRuta.getDataRange().getValues();
    var cabeceras = datosR[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });
    var colGuia = cabeceras.indexOf("guia"); if (colGuia === -1) colGuia = 0;
    var colCorreo = cabeceras.indexOf("id correo"); if (colCorreo === -1) colCorreo = 14;

    var guiasSet = {};
    guiasArray.forEach(function(g) { guiasSet[String(g).trim()] = true; });

    var lastRow = hojaRuta.getLastRow();
    var rangeCorreos = hojaRuta.getRange(2, colCorreo + 1, lastRow - 1, 1);
    var valoresCorreos = rangeCorreos.getValues();
    var count = 0;

    for (var r = 1; r < datosR.length; r++) {
      var hwb = String(datosR[r][colGuia] || "").trim();
      if (guiasSet[hwb]) {
        valoresCorreos[r - 1][0] = dest;
        count++;
      }
    }

    if (count > 0) {
      rangeCorreos.setValues(valoresCorreos);
    }

    return {
      exito: true,
      mensaje: "Se asignaron exitosamente " + count + " guías a " + dest + ".",
      totalAsignadas: count
    };

  } catch (err) {
    return { exito: false, error: err.toString() };
  }
}

/**
 * 📲 Despacho de Alerta Calpixqui (Google Chat + WhatsApp Gateway Log)
 */
function despacharAlertaCalpixqui(alertaObj) {
  try {
    if (!alertaObj) return { exito: false, error: "Alerta vacía" };
    
    var texto = "🚨 *[OLLIN MEGAPULPO] ALERTA DE RUTA*\n" +
                "• *Tipo:* " + (alertaObj.tipo || "DETENCIÓN") + "\n" +
                "• *Pochteca:* " + (alertaObj.pochteca || "Desconocido") + "\n" +
                "• *Detalle:* " + (alertaObj.mensaje || "") + "\n" +
                "• *Hora:* " + Utilities.formatDate(new Date(), "America/Mexico_City", "HH:mm:ss");

    try {
      var payload = JSON.stringify({ text: texto });
      UrlFetchApp.fetch(WEBHOOK_CHAT_SIERRA, {
        method: "post",
        contentType: "application/json",
        payload: payload,
        muteHttpExceptions: true
      });
    } catch(eChat) {}

    return { exito: true, mensaje: "Alerta notificada al canal de supervisión." };
  } catch(err) {
    return { exito: false, error: err.toString() };
  }
}

/**
 * 💼 SERVICIO DE NÓMINA Y LIQUIDACIÓN POCHTECAS (Tab 6 - Ollin v84.5)
 */
function obtenerNominaPochtecas(anio, semana, choferFiltro) {
  try {
    var anioNum = parseInt(anio, 10) || 2026;
    var semNum = parseInt(semana, 10) || 40;
    var choferNorm = String(choferFiltro || "todos").toLowerCase().trim();

    var kpis = {
      totalDispersarNeto: 0,
      totalEntregasOK: 0,
      totalMontoOK: 0,
      totalPUs: 0,
      totalMontoPU: 0,
      totalGastos: 0,
      slaPromedio: 100,
      totalAsignadas: 0
    };

    var colaboradores = [];

    try {
      if (typeof ID_BOVEDA_BATCH_MAESTRO !== "undefined" && ID_BOVEDA_BATCH_MAESTRO) {
        var ssBoveda = SpreadsheetApp.openById(ID_BOVEDA_BATCH_MAESTRO);
        var hojaFacturados = ssBoveda.getSheetByName("FACTURADOS_PROD_2026");
        if (hojaFacturados && hojaFacturados.getLastRow() > 1) {
          var datos = hojaFacturados.getDataRange().getValues();
          var headers = datos[0].map(function(h) { return String(h).toLowerCase().trim(); });
          var colChofer = headers.indexOf("pochteca");
          if (colChofer === -1) colChofer = headers.indexOf("chofer");
          var colChk = headers.indexOf("checkpoint");
          var colSemana = headers.indexOf("semana");

          var mapColabs = {};

          for (var i = 1; i < datos.length; i++) {
            var row = datos[i];
            var chk = colChk !== -1 ? String(row[colChk] || "").toUpperCase().trim() : "OK";
            var emailChofer = colChofer !== -1 ? String(row[colChofer] || "").toLowerCase().trim() : "";
            var semRow = colSemana !== -1 ? parseInt(row[colSemana], 10) : null;

            if (semRow && semRow !== semNum) continue;
            if (choferNorm !== "todos" && emailChofer !== choferNorm) continue;
            if (!emailChofer) continue;

            if (!mapColabs[emailChofer]) {
              mapColabs[emailChofer] = {
                nombre: emailChofer.split("@")[0].toUpperCase(),
                email: emailChofer,
                entregasOK: 0,
                entregasInc: 0,
                pus: 0,
                totalAsignadas: 0,
                tarifaGuia: 15.00,
                tarifaPU: 20.00,
                gastos: 0,
                diasLaborados: 5,
                calidad: 100
              };
            }

            mapColabs[emailChofer].totalAsignadas++;
            kpis.totalAsignadas++;

            if (chk === "OK" || chk === "FD") {
              mapColabs[emailChofer].entregasOK++;
              kpis.totalEntregasOK++;
            } else {
              mapColabs[emailChofer].entregasInc++;
            }
          }

          for (var em in mapColabs) {
            var colab = mapColabs[em];
            var subtotalGuias = colab.entregasOK * colab.tarifaGuia;
            var subtotalPU = colab.pus * colab.tarifaPU;
            var neto = subtotalGuias + subtotalPU - colab.gastos;
            var sla = colab.totalAsignadas > 0 ? Math.round((colab.entregasOK / colab.totalAsignadas) * 100) : 100;

            colaboradores.push({
              nombre: colab.nombre,
              email: colab.email,
              entregasOK: colab.entregasOK,
              entregasInc: colab.entregasInc,
              pus: colab.pus,
              totalAsignadas: colab.totalAsignadas,
              tarifaGuia: colab.tarifaGuia,
              tarifaPU: colab.tarifaPU,
              montoGuias: subtotalGuias,
              montoPU: subtotalPU,
              gastos: colab.gastos,
              netoAPagar: neto,
              sla: sla,
              diasLaborados: colab.diasLaborados
            });

            kpis.totalMontoOK += subtotalGuias;
            kpis.totalMontoPU += subtotalPU;
            kpis.totalGastos += colab.gastos;
            kpis.totalDispersarNeto += neto;
          }

          if (colaboradores.length > 0) {
            var sumaSla = colaboradores.reduce(function(acc, c) { return acc + c.sla; }, 0);
            kpis.slaPromedio = Math.round(sumaSla / colaboradores.length);
          }
        }
      }
    } catch(errBoveda) {
      Logger.log("Nota: Consulta de nómina en Bóveda: " + errBoveda.toString());
    }

    return {
      exito: true,
      anio: anioNum,
      semana: semNum,
      choferFiltro: choferNorm,
      kpis: kpis,
      colaboradores: colaboradores
    };
  } catch(err) {
    return {
      exito: false,
      error: "Error en cálculo de nómina: " + err.toString(),
      kpis: { totalDispersarNeto: 0, totalEntregasOK: 0, totalMontoOK: 0, totalPUs: 0, totalMontoPU: 0, totalGastos: 0, slaPromedio: 0, totalAsignadas: 0 },
      colaboradores: []
    };
  }
}

/**
 * 📋 DIRECTORIO MAESTRO DE CONTACTO POCHTECAS (OLLIN v84.5)
 */
var DIRECTORIO_CONTACTO_POCHTECAS = typeof DIRECTORIO_CONTACTO_POCHTECAS !== 'undefined' ? DIRECTORIO_CONTACTO_POCHTECAS : {
  "xichudaniel@gmail.com": { nombre: "Daniel Juárez", tel: "419 100 8472", zona: "Sierra Gorda (Xichú)" },
  "fmtierrabla1@gmail.com": { nombre: "Diego", tel: "419 114 4521", zona: "Tierra Blanca" },
  "diegovv21mar@gmail.com": { nombre: "Diego", tel: "419 114 4521", zona: "Tierra Blanca" },
  "victor18amadorm@gmail.com": { nombre: "Víctor Amador", tel: "419 108 9231", zona: "Comodín Sierra" },
  "fmsanluispaq@gmail.com": { nombre: "Gregorio Adonai", tel: "442 561 7890", zona: "San Luis de la Paz" },
  "fmpaqueteriatvsm@gmail.com": { nombre: "Lyonnet", tel: "442 812 3456", zona: "Dr. Mora / S.J. Iturbide" },
  "yesigonzg1827@gmail.com": { nombre: "Rosi González", tel: "419 102 3344", zona: "Santa Catarina" },
  "edgar.rodriguez.arauto@gmail.com": { nombre: "Edgar Rodríguez", tel: "442 338 9898", zona: "Querétaro Metrópoli" },
  "fernando.maestro.1991@gmail.com": { nombre: "Fernando Maestro", tel: "442 411 2233", zona: "Querétaro Metrópoli" },
  "irvin.reyes@arauto.express": { nombre: "Irvin Reyes", tel: "442 708 5511", zona: "Supervisor Operativo" },
  "sidharta.santiago@arauto.express": { nombre: "Sidharta Santiago", tel: "442 123 4567", zona: "Dirección Operativa" }
};

/**
 * =========================================================================
 * 🔀 ESTRATEGIA DE CONVIVENCIA HÍBRIDA Y DOBLE ALTERNANCIA (OLLIN v84.5)
 * =========================================================================
 * Modos de Operación por Pochteca:
 * 1. BD_CENTRAL: Registros en hoja Ruta (BD CENTRAL 2023).
 * 2. HIBRIDO: Coexistencia activa de BD Central y Ollinqui PWA (VALIDACIÓN_QRO_2025)
 *             con deduplicación canónica y consolidación Golden Record.
 * 3. OLLINQUI: Exclusividad en PWA / VALIDACIÓN_QRO_2025 (AppSheet / Ollinqui).
 *
 * Configuración persistente en PropertiesService (Clave: MATRIZ_MIGRACION_POCHTECAS).
 * Default normativo: Daniel Juárez (xichudaniel@gmail.com) en HIBRIDO, el resto en BD_CENTRAL.
 */

var CLAVE_PROPS_MATRIZ_MIGRACION = "MATRIZ_MIGRACION_POCHTECAS";

var DEFAULT_MATRIZ_MIGRACION = {
  "xichudaniel@gmail.com": {
    correo: "xichudaniel@gmail.com",
    nombre: "Daniel Juárez",
    zona: "Sierra Gorda (Xichú)",
    telefono: "419 100 8472",
    modo: "HIBRIDO", // Default normativo: Daniel Juárez en HÍBRIDO
    ultimaModificacion: "2026-10-09 12:00:00",
    modificadoPor: "Sistema (Default)"
  },
  "fmtierrabla1@gmail.com": {
    correo: "fmtierrabla1@gmail.com",
    nombre: "Diego",
    zona: "Tierra Blanca",
    telefono: "419 114 4521",
    modo: "BD_CENTRAL",
    ultimaModificacion: "2026-10-09 12:00:00",
    modificadoPor: "Sistema (Default)"
  },
  "diegovv21mar@gmail.com": {
    correo: "diegovv21mar@gmail.com",
    nombre: "Diego",
    zona: "Tierra Blanca",
    telefono: "419 114 4521",
    modo: "BD_CENTRAL",
    ultimaModificacion: "2026-10-09 12:00:00",
    modificadoPor: "Sistema (Default)"
  },
  "victor18amadorm@gmail.com": {
    correo: "victor18amadorm@gmail.com",
    nombre: "Víctor Amador",
    zona: "Comodín Sierra",
    telefono: "419 108 9231",
    modo: "BD_CENTRAL",
    ultimaModificacion: "2026-10-09 12:00:00",
    modificadoPor: "Sistema (Default)"
  },
  "fmsanluispaq@gmail.com": {
    correo: "fmsanluispaq@gmail.com",
    nombre: "Gregorio Adonai",
    zona: "San Luis de la Paz",
    telefono: "442 561 7890",
    modo: "BD_CENTRAL",
    ultimaModificacion: "2026-10-09 12:00:00",
    modificadoPor: "Sistema (Default)"
  },
  "fmpaqueteriatvsm@gmail.com": {
    correo: "fmpaqueteriatvsm@gmail.com",
    nombre: "Lyonnet",
    zona: "Dr. Mora / S.J. Iturbide",
    telefono: "442 812 3456",
    modo: "BD_CENTRAL",
    ultimaModificacion: "2026-10-09 12:00:00",
    modificadoPor: "Sistema (Default)"
  },
  "yesigonzg1827@gmail.com": {
    correo: "yesigonzg1827@gmail.com",
    nombre: "Rosi González",
    zona: "Santa Catarina",
    telefono: "419 102 3344",
    modo: "BD_CENTRAL",
    ultimaModificacion: "2026-10-09 12:00:00",
    modificadoPor: "Sistema (Default)"
  },
  "edgar.rodriguez.arauto@gmail.com": {
    correo: "edgar.rodriguez.arauto@gmail.com",
    nombre: "Edgar Rodríguez",
    zona: "Querétaro Metrópoli",
    telefono: "442 338 9898",
    modo: "BD_CENTRAL",
    ultimaModificacion: "2026-10-09 12:00:00",
    modificadoPor: "Sistema (Default)"
  },
  "fernando.maestro.1991@gmail.com": {
    correo: "fernando.maestro.1991@gmail.com",
    nombre: "Fernando Maestro",
    zona: "Querétaro Metrópoli",
    telefono: "442 411 2233",
    modo: "BD_CENTRAL",
    ultimaModificacion: "2026-10-09 12:00:00",
    modificadoPor: "Sistema (Default)"
  }
};

/**
 * 1. Obtiene la matriz de migración actual desde PropertiesService.
 * Si no está inicializada, persiste y retorna los defaults normativos.
 */
function obtenerMatrizMigracionRutas() {
  try {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty(CLAVE_PROPS_MATRIZ_MIGRACION);
    var matriz = {};

    if (raw) {
      try {
        matriz = JSON.parse(raw);
      } catch (eParse) {
        Logger.log("Aviso: Parse error en Matriz de Migración, reestableciendo defaults: " + eParse.toString());
        matriz = null;
      }
    }

    if (!matriz || Object.keys(matriz).length === 0) {
      matriz = JSON.parse(JSON.stringify(DEFAULT_MATRIZ_MIGRACION));
      props.setProperty(CLAVE_PROPS_MATRIZ_MIGRACION, JSON.stringify(matriz));
    } else {
      // Asegurar que todos los pochtecas del catálogo por defecto existan
      var huboCambio = false;
      for (var emailKey in DEFAULT_MATRIZ_MIGRACION) {
        if (!matriz[emailKey]) {
          matriz[emailKey] = JSON.parse(JSON.stringify(DEFAULT_MATRIZ_MIGRACION[emailKey]));
          huboCambio = true;
        }
      }
      if (huboCambio) {
        props.setProperty(CLAVE_PROPS_MATRIZ_MIGRACION, JSON.stringify(matriz));
      }
    }

    var lista = [];
    var resumen = { total: 0, bdCentral: 0, hibrido: 0, ollinqui: 0 };

    for (var k in matriz) {
      var item = matriz[k];
      lista.push(item);
      resumen.total++;
      if (item.modo === "HIBRIDO") resumen.hibrido++;
      else if (item.modo === "OLLINQUI") resumen.ollinqui++;
      else resumen.bdCentral++;
    }

    lista.sort(function(a, b) {
      var pesos = { "HIBRIDO": 1, "OLLINQUI": 2, "BD_CENTRAL": 3 };
      var pesoA = pesos[a.modo] || 4;
      var pesoB = pesos[b.modo] || 4;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return a.nombre.localeCompare(b.nombre);
    });

    return {
      exito: true,
      matriz: lista,
      mapa: matriz,
      resumen: resumen,
      timestamp: Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd HH:mm:ss")
    };
  } catch (err) {
    Logger.log("Error en obtenerMatrizMigracionRutas: " + err.toString());
    return {
      exito: false,
      error: err.toString(),
      matriz: Object.values(DEFAULT_MATRIZ_MIGRACION),
      resumen: { total: 9, bdCentral: 8, hibrido: 1, ollinqui: 0 }
    };
  }
}

/**
 * 2. Actualiza en caliente el modo operativo de un Pochteca en PropertiesService.
 */
function actualizarModoPochteca(correo, nuevoModo, operador) {
  try {
    if (!correo) return { exito: false, error: "Correo de Pochteca no proporcionado." };
    
    var emailClean = String(correo).trim().toLowerCase();
    var modoClean = String(nuevoModo || "").trim().toUpperCase();
    var modosValidos = ["BD_CENTRAL", "HIBRIDO", "OLLINQUI"];

    if (modosValidos.indexOf(modoClean) === -1) {
      return { exito: false, error: "Modo inválido: '" + nuevoModo + "'. Permitidos: " + modosValidos.join(", ") };
    }

    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty(CLAVE_PROPS_MATRIZ_MIGRACION);
    var matriz = {};

    if (raw) {
      try { matriz = JSON.parse(raw); } catch(e) { matriz = {}; }
    }
    if (!matriz || Object.keys(matriz).length === 0) {
      matriz = JSON.parse(JSON.stringify(DEFAULT_MATRIZ_MIGRACION));
    }

    var registro = matriz[emailClean];
    if (!registro) {
      var dirInfo = (typeof DIRECTORIO_CONTACTO_POCHTECAS !== 'undefined' && DIRECTORIO_CONTACTO_POCHTECAS[emailClean]) || {
        nombre: emailClean,
        tel: "",
        zona: "Ruta General"
      };
      registro = {
        correo: emailClean,
        nombre: dirInfo.nombre,
        zona: dirInfo.zona,
        telefono: dirInfo.tel,
        modo: modoClean,
        ultimaModificacion: Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd HH:mm:ss"),
        modificadoPor: operador || "Supervisor"
      };
    } else {
      registro.modo = modoClean;
      registro.ultimaModificacion = Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd HH:mm:ss");
      registro.modificadoPor = operador || "Supervisor";
    }

    matriz[emailClean] = registro;
    props.setProperty(CLAVE_PROPS_MATRIZ_MIGRACION, JSON.stringify(matriz));

    Logger.log("✅ Matriz de Migración actualizada: " + emailClean + " -> " + modoClean);

    return {
      exito: true,
      correo: emailClean,
      modo: modoClean,
      registro: registro,
      mensaje: "Pochteca " + registro.nombre + " actualizado a modo " + modoClean + " exitosamente."
    };
  } catch (err) {
    Logger.log("Error en actualizarModoPochteca: " + err.toString());
    return { exito: false, error: err.toString() };
  }
}

/**
 * =========================================================================
 * ⚙️ MOTOR DE DEDUPLICACIÓN CANÓNICO Y CONCILIACIÓN HÍBRIDA
 * =========================================================================
 */

/**
 * Normaliza y sanitiza el PID siguiendo la Ley de la Doble J de Arauto Express:
 * AppSheet/Calle (JJD...) -> BD/Bóveda (JD...)
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
 * Normaliza fecha a string 'yyyy-MM-dd' para la clave de idempotencia
 */
function normalizarFechaIdempotencia(fechaRaw) {
  if (!fechaRaw) return "SIN_FECHA";
  if (fechaRaw instanceof Date) {
    return Utilities.formatDate(fechaRaw, "America/Mexico_City", "yyyy-MM-dd");
  }
  var str = String(fechaRaw).trim();
  var matchDMY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchDMY) {
    var dia = matchDMY[1].length === 1 ? "0" + matchDMY[1] : matchDMY[1];
    var mes = matchDMY[2].length === 1 ? "0" + matchDMY[2] : matchDMY[2];
    var anio = matchDMY[3];
    return anio + "-" + mes + "-" + dia;
  }
  var matchYMD = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (matchYMD) {
    var mesY = matchYMD[2].length === 1 ? "0" + matchYMD[2] : matchYMD[2];
    var diaY = matchYMD[3].length === 1 ? "0" + matchYMD[3] : matchYMD[3];
    return matchYMD[1] + "-" + mesY + "-" + diaY;
  }
  return str.substring(0, 10).replace(/[\s\:\/]/g, "-");
}

/**
 * Genera la Idempotency Key Canónica:
 * Key = (Guia + "_" + PID_sanitizado + "_" + Checkpoint + "_" + Fecha_normalizada)
 */
function generarIdempotencyKey(guia, pid, checkpoint, fecha) {
  var g = String(guia || "").trim().replace(/\D/g, "");
  var p = sanitizarPIDParaBoveda(pid);
  var c = String(checkpoint || "PENDIENTE").trim().toUpperCase();
  var f = normalizarFechaIdempotencia(fecha);
  
  if (!g && p) {
    return "PID_" + p + "_" + c + "_" + f;
  }
  return "HWB_" + (g || "S_G") + "_" + (p || "S_PID") + "_" + c + "_" + f;
}

/**
 * 3. MOTOR DE DEDUPLICACIÓN CANÓNICO Y CONCILIACIÓN HÍBRIDA
 * Idempotency Key = (Guia + "_" + PID_sanitizado + "_" + Checkpoint + "_" + Fecha)
 * Golden Record: Las evidencias de Ollinqui PWA (Firma, Foto Fachada, Audio, GPS) prevalecen sobre BD Central.
 */
function conciliarEventosHibridos(opciones) {
  try {
    opciones = opciones || {};
    var matrizInfo = obtenerMatrizMigracionRutas();
    var mapaModos = matrizInfo.mapa || {};

    var idVal = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M";
    var ssVal = SpreadsheetApp.openById(idVal);
    var shVal = ssVal.getSheetByName("Validación") || ssVal.getSheetByName("VALIDACIÓN_QRO_2025") || ssVal.getSheets()[0];

    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    var shRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");

    var mapaEventos = {};
    var indiceGuias = {};
    var indicePids = {};
    var metricas = {
      totalLeidosOllinqui: 0,
      totalLeidosBDCentral: 0,
      colisionesDetectadas: 0,
      goldenRecordsGenerados: 0,
      soloOllinqui: 0,
      soloBDCentral: 0,
      descartadosPorFiltro: 0,
      rutasHibridasProcesadas: 0
    };

    // A. Lectura de Ollinqui PWA (VALIDACIÓN_QRO_2025 - 15 cols)
    if (shVal && shVal.getLastRow() > 1) {
      var lastRowVal = shVal.getLastRow();
      var maxLeerVal = opciones.limite || Math.min(lastRowVal - 1, 600);
      var startRowVal = Math.max(2, lastRowVal - maxLeerVal + 1);
      var valsVal = shVal.getRange(startRowVal, 1, lastRowVal - startRowVal + 1, Math.min(shVal.getLastColumn(), 15)).getValues();

      for (var i = 0; i < valsVal.length; i++) {
        var row = valsVal[i];
        var guia = String(row[0] || "").trim();
        var pidRaw = String(row[1] || "").trim();
        var cp = String(row[2] || "").trim();
        var chk = String(row[3] || "OK").trim().toUpperCase();
        var receptor = String(row[4] || "").trim();
        var firma = String(row[5] || "").trim();
        var foto = String(row[6] || "").trim();
        var audio = String(row[7] || "").trim();
        var gps = String(row[8] || "").trim();
        var pochteca = String(row[9] || "").trim().toLowerCase();
        var fecha = row[10];
        var auditorStatus = String(row[11] || "PENDIENTE").trim().toUpperCase();

        if (!guia && !pidRaw) continue;
        metricas.totalLeidosOllinqui++;

        var modoPochteca = (mapaModos[pochteca] && mapaModos[pochteca].modo) || "BD_CENTRAL";
        var key = generarIdempotencyKey(guia, pidRaw, chk, fecha);
        var guiaLimpia = String(guia || "").trim().replace(/\D/g, "");
        var pidCleanOllin = sanitizarPIDParaBoveda(pidRaw);

        var eventoObj = {
          idempotencyKey: key,
          guia: guia,
          pidOriginal: pidRaw,
          pidBoveda: sanitizarPIDParaBoveda(pidRaw),
          cp: cp,
          checkpoint: chk,
          receptor: receptor,
          firma: firma,
          fotoFachada: foto,
          audioTeoyolotl: audio,
          gps: gps,
          pochteca: pochteca,
          fecha: fecha instanceof Date ? Utilities.formatDate(fecha, "America/Mexico_City", "yyyy-MM-dd HH:mm:ss") : String(fecha || ""),
          auditorStatus: auditorStatus,
          origen: "OLLINQUI",
          tieneEvidenciaCompleta: !!(firma || foto || gps),
          modoRuta: modoPochteca,
          timestampConciliacion: Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd HH:mm:ss")
        };
        mapaEventos[key] = eventoObj;
        if (guiaLimpia && guiaLimpia.length >= 10) indiceGuias[guiaLimpia] = key;
        if (pidCleanOllin) indicePids[pidCleanOllin] = key;
      }
    }

    // B. Lectura de BD CENTRAL 2023 (Ruta) y Consolidación Golden Record
    if (shRuta && shRuta.getLastRow() > 1) {
      var lastRowRuta = shRuta.getLastRow();
      var maxLeerRuta = opciones.limite || Math.min(lastRowRuta - 1, 800);
      var startRowRuta = Math.max(2, lastRowRuta - maxLeerRuta + 1);
      var dataR = shRuta.getRange(startRowRuta, 1, lastRowRuta - startRowRuta + 1, shRuta.getLastColumn()).getValues();

      var headers = shRuta.getRange(1, 1, 1, shRuta.getLastColumn()).getValues()[0];
      var cab = headers.map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });
      var colG = cab.indexOf("guia") !== -1 ? cab.indexOf("guia") : cab.indexOf("guía");
      var colP = cab.indexOf("pid");
      var colC = cab.indexOf("checkpoint");
      var colCor = cab.indexOf("id correo");
      var colRec = cab.indexOf("quien recibio o comentarios") !== -1 ? cab.indexOf("quien recibio o comentarios") : cab.indexOf("comentarios");
      var colFec = cab.indexOf("fecha entrega");
      var colCp = cab.indexOf("cp");

      for (var j = 0; j < dataR.length; j++) {
        var r = dataR[j];
        var gRuta = colG !== -1 ? String(r[colG] || "").trim() : "";
        var pRuta = colP !== -1 ? String(r[colP] || "").trim() : "";
        var cRuta = colC !== -1 ? String(r[colC] || "OK").trim().toUpperCase() : "OK";
        var corRuta = colCor !== -1 ? String(r[colCor] || "").trim().toLowerCase() : "";
        var recRuta = colRec !== -1 ? String(r[colRec] || "").trim() : "";
        var fecRuta = colFec !== -1 ? r[colFec] : "";
        var cpRuta = colCp !== -1 ? String(r[colCp] || "").trim() : "";

        if (!gRuta && !pRuta) continue;
        metricas.totalLeidosBDCentral++;

        var modoPochtecaRuta = (mapaModos[corRuta] && mapaModos[corRuta].modo) || "BD_CENTRAL";
        var keyRuta = generarIdempotencyKey(gRuta, pRuta, cRuta, fecRuta);
        var gRutaLimpia = String(gRuta || "").trim().replace(/\D/g, "");
        var pRutaClean = sanitizarPIDParaBoveda(pRuta);

        // Buscar colisión por key compuesta, o por coincidencia directa de Guía/PID
        var keyColision = null;
        if (mapaEventos[keyRuta]) {
          keyColision = keyRuta;
        } else if (gRutaLimpia && gRutaLimpia.length >= 10 && indiceGuias[gRutaLimpia]) {
          keyColision = indiceGuias[gRutaLimpia];
        } else if (pRutaClean && indicePids[pRutaClean]) {
          keyColision = indicePids[pRutaClean];
        }

        if (keyColision) {
          var goldenKey = keyColision;
          // 🏆 Colisión -> Golden Record (Ollinqui evidencias prevalecen)
          metricas.colisionesDetectadas++;
          var golden = mapaEventos[goldenKey];

          if (!golden.receptor && recRuta) golden.receptor = recRuta;
          if (!golden.cp && cpRuta) golden.cp = cpRuta;

          golden.origen = "CONCILIADO";
          golden.referenciaBDCentral = {
            pochtecaOriginal: corRuta,
            comentariosRuta: recRuta,
            fechaRuta: fecRuta instanceof Date ? Utilities.formatDate(fecRuta, "America/Mexico_City", "yyyy-MM-dd HH:mm:ss") : String(fecRuta || "")
          };
          metricas.goldenRecordsGenerados++;
        } else {
          mapaEventos[keyRuta] = {
            idempotencyKey: keyRuta,
            guia: gRuta,
            pidOriginal: pRuta,
            pidBoveda: sanitizarPIDParaBoveda(pRuta),
            cp: cpRuta,
            checkpoint: cRuta,
            receptor: recRuta,
            firma: "",
            fotoFachada: "",
            audioTeoyolotl: "",
            gps: "",
            pochteca: corRuta,
            fecha: fecRuta instanceof Date ? Utilities.formatDate(fecRuta, "America/Mexico_City", "yyyy-MM-dd HH:mm:ss") : String(fecRuta || ""),
            auditorStatus: "PENDIENTE",
            origen: "BD_CENTRAL",
            tieneEvidenciaCompleta: false,
            modoRuta: modoPochtecaRuta,
            timestampConciliacion: Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd HH:mm:ss")
          };
          metricas.soloBDCentral++;
        }
      }
    }

    var listaConsolidada = [];
    for (var kEv in mapaEventos) {
      var ev = mapaEventos[kEv];
      if (!ev || typeof ev !== "object" || !ev.idempotencyKey) continue;
      listaConsolidada.push(ev);
      if (ev.origen === "OLLINQUI") metricas.soloOllinqui++;
      if (ev.modoRuta === "HIBRIDO") metricas.rutasHibridasProcesadas++;
    }

    Logger.log("⚡ Conciliación Híbrida completada: " + JSON.stringify(metricas));

    return {
      exito: true,
      metricas: metricas,
      totalEventosUnicos: listaConsolidada.length,
      muestraEventos: listaConsolidada.slice(0, 50),
      timestamp: Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd HH:mm:ss")
    };

  } catch (err) {
    Logger.log("Error en conciliarEventosHibridos: " + err.toString());
    return { exito: false, error: err.toString() };
  }
}

/**
 * =========================================================================
 * ⏱️ AUTOMATIZACIÓN DE TRIGGERS HÍBRIDOS
 * =========================================================================
 */

/**
 * 4. Instala los triggers automáticos:
 * - Ciclo incremental cada 2 horas
 * - Barrido nocturno a las 23:00 hrs
 */
function instalarTriggersHibridos() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var funcionesEliminar = ["ejecutarCicloHibridoPeriodico", "ejecutarBarridoNocturnoHibrido"];
    var eliminados = 0;

    for (var i = 0; i < triggers.length; i++) {
      var t = triggers[i];
      if (funcionesEliminar.indexOf(t.getHandlerFunction()) !== -1) {
        ScriptApp.deleteTrigger(t);
        eliminados++;
      }
    }

    // Cada 2 horas
    ScriptApp.newTrigger("ejecutarCicloHibridoPeriodico")
      .timeBased()
      .everyHours(2)
      .create();

    // Barrido nocturno a las 23:00 hrs
    ScriptApp.newTrigger("ejecutarBarridoNocturnoHibrido")
      .timeBased()
      .atHour(23)
      .nearMinute(0)
      .everyDays(1)
      .create();

    var mensaje = "Triggers híbridos instalados con éxito: Ciclo cada 2 hrs y Barrido Nocturno 23:00 hrs (" + eliminados + " anteriores purgados).";
    Logger.log("✅ " + mensaje);

    return {
      exito: true,
      mensaje: mensaje,
      triggersInstalados: [
        { funcion: "ejecutarCicloHibridoPeriodico", tipo: "Cada 2 horas" },
        { funcion: "ejecutarBarridoNocturnoHibrido", tipo: "Diario a las 23:00 hrs" }
      ]
    };
  } catch (err) {
    Logger.log("Error en instalarTriggersHibridos: " + err.toString());
    return { exito: false, error: err.toString() };
  }
}

/**
 * Función ejecutora del ciclo periódico cada 2 horas
 */
function ejecutarCicloHibridoPeriodico() {
  Logger.log("⏱️ Iniciando ejecutarCicloHibridoPeriodico...");
  try {
    var res = conciliarEventosHibridos({ limite: 300, modo: "PERIODICO_2H" });
    Logger.log("Resultado Ciclo Periódico: Colisiones resueltas=" + (res.metricas ? res.metricas.colisionesDetectadas : 0));
    return res;
  } catch (e) {
    Logger.log("Error en ejecutarCicloHibridoPeriodico: " + e.toString());
  }
}

/**
 * Función ejecutora del barrido nocturno integral a las 23:00 hrs
 */
function ejecutarBarridoNocturnoHibrido() {
  Logger.log("🌙 Iniciando ejecutarBarridoNocturnoHibrido (23:00 hrs)...");
  try {
    var resConciliacion = conciliarEventosHibridos({ limite: 1500, modo: "BARRIDO_NOCTURNO" });
    Logger.log("Barrido Nocturno Conciliación: " + JSON.stringify(resConciliacion.metricas || {}));

    // Auto-cierre de tickets en ACLARACIONES_DHL respondidos en Gmail
    var idVal = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M";
    var ssVal = SpreadsheetApp.openById(idVal);
    var hojaAcl = ssVal.getSheetByName("ACLARACIONES_DHL");
    if (hojaAcl && hojaAcl.getLastRow() > 1) {
      var dataAcl = hojaAcl.getDataRange().getValues();
      var autoCerrados = 0;
      for (var r = 1; r < dataAcl.length; r++) {
        var estatusActual = String(dataAcl[r][12] || "").trim().toUpperCase();
        var threadId = String(dataAcl[r][16] || "").trim();

        if (estatusActual !== "CERRADO" && threadId) {
          try {
            var thread = GmailApp.getThreadById(threadId);
            if (thread) {
              var msgs = thread.getMessages();
              var lastMsg = msgs[msgs.length - 1];
              var lastFrom = lastMsg.getFrom().toLowerCase();
              if (lastFrom.indexOf("@arauto.express") !== -1 || lastFrom.indexOf("arauto") !== -1) {
                hojaAcl.getRange(r + 1, 13).setValue("CERRADO");
                hojaAcl.getRange(r + 1, 18).setValue(Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd HH:mm:ss"));
                autoCerrados++;
              }
            }
          } catch(eThread) {}
        }
      }
      SpreadsheetApp.flush();
      Logger.log("🌙 Barrido Nocturno: " + autoCerrados + " tickets de ACLARACIONES_DHL auto-cerrados.");
    }

    return { exito: true, mensaje: "Barrido nocturno ejecutado exitosamente." };
  } catch (err) {
    Logger.log("Error en ejecutarBarridoNocturnoHibrido: " + err.toString());
    return { exito: false, error: err.toString() };
  }
}

/**
 * =========================================================================
 * 📜 GENERADOR DE MACROS DE RESPUESTA PERICIAL PARA DHL (TAB 7)
 * =========================================================================
 */
function generarMacrosPericiales(t) {
  var guia = t.guia || "S/G";
  var pid = t.pid || "S/P";
  var receptor = t.receptor || "Destinatario en domicilio";
  var fecha = t.fechaEntrega || t.fechaSolicitud || "Fecha registrada en sistema";
  var chk = t.checkpoint || "OK";
  var pochteca = t.pochteca || "Operador de Ruta";
  var telChofer = t.telefonoChofer || "";
  var supervisor = t.supervisor || "Irvin Reyes";
  var fechaVisita = t.fechaVisita || "Siguiente ciclo de ruta";
  var foto = t.fotoFachada || "";
  var firma = t.firma || "";
  var gps = t.gps || "";
  var cp = t.cp || "";

  // 1. ENTREGA CONFIRMADA CON EVIDENCIA (POD)
  var macro1_pod = 
    "Estimado equipo de Operaciones y Calidad DHL Querétaro,\n\n" +
    "Respecto a la solicitud de aclaración sobre la guía " + guia + " (PID: " + pid + "):\n\n" +
    "Confirmamos formalmente que el envío fue ENTREGADO de forma efectiva bajo los siguientes datos periciales:\n" +
    "• Estatus en Bóveda OLLIN: " + chk + " (ENTREGA CONCLUIDA)\n" +
    "• Receptor registrado en predio: " + receptor + "\n" +
    "• Fecha y hora de entrega: " + fecha + "\n" +
    "• Operador responsable: " + pochteca + (telChofer ? " (Tel: " + telChofer + ")" : "") + "\n" +
    "• Evidencias en Bóveda Operativa:\n" +
    (foto ? "  - Evidencia fotográfica de fachada: " + foto + "\n" : "  - Foto de fachada resguardada en expediente digital.\n") +
    (firma ? "  - Acuse de firma digital: " + firma + "\n" : "  - Firma digital capturada en dispositivo móvil.\n") +
    (gps ? "  - Coordenadas GPS de liberación: " + gps + "\n" : "  - Geocerca validada dentro del perímetro del domicilio.\n") +
    "\nCon base en los elementos probatorios acreditados, solicitamos proceder al cierre formal de la aclaración sin afectación a la plaza.\n\n" +
    "Atentamente,\n" +
    "Supervisión Operativa Arauto Express - Plaza Querétaro";

  // 2. REINTENTO PROGRAMADO EN RUTA
  var macro2_reintento = 
    "Estimado equipo de Despacho y Operaciones DHL Querétaro,\n\n" +
    "En atención a la solicitud de reintento para la guía " + guia + " (PID: " + pid + "):\n\n" +
    "Informamos que el paquete se encuentra programado para nueva visita en ruta con los siguientes parámetros:\n" +
    "• Checkpoint previo en sistema: " + chk + "\n" +
    "• Fecha y ventana compromiso de visita: " + fechaVisita + "\n" +
    "• Pochteca asignado a la zona: " + pochteca + (telChofer ? " (Tel: " + telChofer + ")" : "") + "\n" +
    "• Supervisor operativo a cargo: " + supervisor + "\n" +
    "• Acción preventiva: El operador cuenta con instrucción prioritaria para contacto telefónico previo con el destinatario.\n\n" +
    "Se mantendrá monitoreo en tiempo real hasta la conclusión del evento en rampa.\n\n" +
    "Atentamente,\n" +
    "Mesa de Control Arauto Express - Plaza Querétaro";

  // 3. DESCONOCIMIENTO / ACLARACIÓN PERICIAL DE ENTREGA
  var macro3_desconocimiento = 
    "Estimado equipo de Reclamaciones DHL Querétaro,\n\n" +
    "Atendiendo el reporte de entrega no reconocida para la guía " + guia + " (PID: " + pid + "):\n\n" +
    "Hacemos de su conocimiento el dictamen pericial levantado en campo por nuestra supervisión:\n" +
    "1. La unidad de ruta arribó al domicilio destino el " + fecha + ".\n" +
    "2. El paquete fue recibido y acreditado por: " + receptor + ".\n" +
    (gps ? "3. El punto de liberación satelital coincide con la geolocalización: " + gps + ".\n" : "3. La geocerca satelital confirma presencia en la calle y predio indicado.\n") +
    (foto ? "4. Se cuenta con fotografía de la fachada del inmueble donde se realizó la entrega: " + foto + "\n" : "4. Se anexa fotografía de la fachada del inmueble resguardada en Bóveda.\n") +
    "\nSe remite esta evidencia para confronta directa con el cliente final a fin de ratificar la persona que atendió la entrega.\n\n" +
    "Atentamente,\n" +
    "Supervisión de Calidad y Peritaje - Arauto Express Querétaro";

  // 4. FUERA DE ZONA / NO PERTENECE (ESCUDO DE PERTENENCIA)
  var macro4_fuerazona = 
    "Estimado equipo de Tráfico y Operaciones DHL Querétaro,\n\n" +
    "Dictamen de Pertenencia Territorial para la guía " + guia + " (PID: " + pid + "):\n\n" +
    "Notificamos que el envío en mención se encuentra FUERA DE COBERTURA / NO PERTENECE a la circunscripción asignada a Arauto Express Querétaro / Sierra Gorda.\n" +
    "• Código Postal reportado: " + (cp || "Código Postal no asignado") + "\n" +
    "• Zona asignada contractual: La dirección no forma parte de las rutas operativas activas de esta concesión (Escudo de Pertenencia OLLIN).\n" +
    "• Requerimiento: Solicitamos la reasignación inmediata a la estación correspondiente en el sistema DHL Express y la liberación de métrica de rezago para nuestra base operativa.\n\n" +
    "Atentamente,\n" +
    "Mesa de Control y Despacho - Arauto Express Querétaro";

  return {
    macro1: macro1_pod,
    macro2: macro2_reintento,
    macro3: macro3_desconocimiento,
    macro4: macro4_fuerazona,
    macroPOD: macro1_pod,
    macroReintento: macro2_reintento,
    macroDesconocimiento: macro3_desconocimiento,
    macroFueraZona: macro4_fuerazona
  };
}

function normalizarEncabezadoAclaracion_(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function crearIndiceEncabezadosAclaracion_(headers) {
  var index = {};
  for (var i = 0; i < headers.length; i++) {
    var name = normalizarEncabezadoAclaracion_(headers[i]);
    if (name && index[name] === undefined) index[name] = i;
  }
  return index;
}

function obtenerCampoAclaracion_(row, headerIndex, aliases, legacyIndex) {
  for (var i = 0; i < aliases.length; i++) {
    var key = normalizarEncabezadoAclaracion_(aliases[i]);
    if (headerIndex[key] !== undefined) return row[headerIndex[key]];
  }
  var esEsquemaCanonico = headerIndex["key"] !== undefined ||
    headerIndex["rcvr addr 1"] !== undefined ||
    headerIndex["aprobacion auditor"] !== undefined ||
    headerIndex["marca de tiempo"] !== undefined;
  return legacyIndex !== undefined && !esEsquemaCanonico ? row[legacyIndex] : "";
}

function normalizarCPAclaracion_(cp) {
  var value = String(cp || "").trim().replace(/\D/g, "");
  return value && value.length < 5 ? ("00000" + value).slice(-5) : value;
}

function construirDireccionAclaracion_(lineas) {
  var limpias = [];
  for (var i = 0; i < lineas.length; i++) {
    var linea = String(lineas[i] || "").trim();
    if (linea && limpias.indexOf(linea) === -1) limpias.push(linea);
  }
  return limpias.join(", ");
}

function enriquecerTicketPericial360_(ticket, evidenciaVal, evidenciaRuta, cpInfoMap) {
  var val = evidenciaVal || {};
  var ruta = evidenciaRuta || {};
  var cp = ticket.cp || val.cp || ruta.cp || "";
  var cpInfo = cpInfoMap[normalizarCPAclaracion_(cp)] || {};
  var emailChofer = String(ticket.emailChofer || val.pochteca || ruta.chofer || "").trim().toLowerCase();
  var directorio = typeof DIRECTORIO_CONTACTO_POCHTECAS !== "undefined" &&
    DIRECTORIO_CONTACTO_POCHTECAS[emailChofer] ? DIRECTORIO_CONTACTO_POCHTECAS[emailChofer] : {};
  var emailSupervisor = String(cpInfo.supervisor || "").trim().toLowerCase();
  var contactoSupervisor = typeof DIRECTORIO_CONTACTO_POCHTECAS !== "undefined" &&
    DIRECTORIO_CONTACTO_POCHTECAS[emailSupervisor] ? DIRECTORIO_CONTACTO_POCHTECAS[emailSupervisor] : {};
  var municipio = String(cpInfo.municipio || "").trim();
  var zona = String(cpInfo.zona || "").trim();

  ticket.cp = String(cp || "");
  ticket.direccionCompleta = ticket.direccionCompleta ||
    construirDireccionAclaracion_([
      val.direccion1 || ruta.direccion1,
      val.direccion2 || ruta.direccion2,
      val.direccion3 || ruta.direccion3
    ]);
  ticket.comunidadMunicipio = ticket.comunidadMunicipio ||
    (municipio ? municipio + (zona && normalizarEncabezadoAclaracion_(zona) !== normalizarEncabezadoAclaracion_(municipio) ? " · " + zona : "") : "");
  ticket.telefonoContacto = ticket.telefonoContacto || val.telefono || ruta.telefono || "";
  ticket.comentariosPOD = ticket.comentariosPOD || val.comentarios || ruta.comentarios || "";
  ticket.gps = ticket.gps || val.gps || ruta.gps || "";
  ticket.fotoFachada = ticket.fotoFachada || val.foto || ruta.foto || "";
  ticket.firma = ticket.firma || val.firma || ruta.firma || "";
  ticket.audioTeoyolotl = ticket.audioTeoyolotl || val.audio || ruta.audio || "";
  ticket.receptor = ticket.receptor || val.receptor || ruta.receptor || "";
  ticket.checkpoint = ticket.checkpoint || val.chk || ruta.chk || "";
  ticket.emailChofer = emailChofer;
  if ((!ticket.pochteca || String(ticket.pochteca).indexOf("@") !== -1) && directorio.nombre) {
    ticket.pochteca = directorio.nombre;
  }
  ticket.pochteca = ticket.pochteca || directorio.nombre || "Sin Asignar";
  ticket.telefonoChofer = ticket.telefonoChofer || directorio.tel || "";
  ticket.supervisor = contactoSupervisor.nombre || ticket.supervisor || "Irvin Reyes";
  return ticket;
}

/**
 * =========================================================================
 * 📋 SERVICIO DE TICKETS Y ACLARACIONES DHL V2 (Tab 7 - Ollin v84.5)
 * Cruce dual con VALIDACIÓN_QRO_2025 y BD Central + Detección Gmail + 4 Macros
 * =========================================================================
 */
function obtenerAclaracionesAbiertasV2() {
  try {
    var idVal = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M";
    var ssVal = SpreadsheetApp.openById(idVal);
    var hojaAclaraciones = ssVal.getSheetByName("ACLARACIONES_DHL");
    
    // Crear pestaña si no existe
    if (!hojaAclaraciones) {
      hojaAclaraciones = ssVal.insertSheet("ACLARACIONES_DHL");
      hojaAclaraciones.appendRow([
        "ID_Ticket", "Guia", "PID", "Pochteca", "Email_Chofer", "Telefono_Chofer",
        "Supervisor", "Categoria", "Asunto", "Detalle_DHL", "Fecha_Solicitud",
        "Fecha_Compromiso_Visita", "Estatus", "Firma", "Foto_Fachada",
        "Propuesta_Respuesta", "Thread_ID", "Ultima_Actualizacion"
      ]);
    }

    // 1. Cargar Mapa de Evidencias desde VALIDACIÓN_QRO_2025 (PWA)
    var shVal = ssVal.getSheetByName("Validación") || ssVal.getSheetByName("VALIDACIÓN_QRO_2025") || ssVal.getSheets()[0];
    var valMap = {};
    if (shVal && shVal.getLastRow() > 1) {
      var lastVRow = shVal.getLastRow();
      var numV = Math.min(lastVRow - 1, 500);
      var headerVal = shVal.getRange(1, 1, 1, shVal.getLastColumn()).getValues()[0];
      var indexVal = crearIndiceEncabezadosAclaracion_(headerVal);
      var dataV = shVal.getRange(Math.max(2, lastVRow - numV + 1), 1, numV, shVal.getLastColumn()).getValues();
      for (var vi = 0; vi < dataV.length; vi++) {
        var vr = dataV[vi];
        var vGuia = String(obtenerCampoAclaracion_(vr, indexVal, ["Guia", "Guía", "HWB", "AWB"], 0) || "").trim();
        var vPidRaw = String(obtenerCampoAclaracion_(vr, indexVal, ["PID", "PID Codigo", "PID Código"], 1) || "").trim();
        var vPidClean = sanitizarPIDParaBoveda(vPidRaw);
        var vObj = {
          guia: vGuia,
          pid: vPidClean,
          cp: String(obtenerCampoAclaracion_(vr, indexVal, ["C.P.", "CP", "Codigo Postal", "Código Postal"], 2) || "").trim(),
          chk: String(obtenerCampoAclaracion_(vr, indexVal, ["Checkpoint", "Estatus"], 3) || "OK").trim().toUpperCase(),
          receptor: String(obtenerCampoAclaracion_(vr, indexVal, ["Receiver Name", "Receptor", "Destinatario", "Quien Recibio"], 4) || "").trim(),
          direccion1: String(obtenerCampoAclaracion_(vr, indexVal, ["Rcvr Addr 1", "Receiver Address 1", "Direccion 1", "Direccion"]) || "").trim(),
          direccion2: String(obtenerCampoAclaracion_(vr, indexVal, ["Rcvr Addr 2", "Receiver Address 2", "Direccion 2"]) || "").trim(),
          direccion3: String(obtenerCampoAclaracion_(vr, indexVal, ["Rcvr Addr 3", "Receiver Address 3", "Direccion 3"]) || "").trim(),
          firma: String(obtenerCampoAclaracion_(vr, indexVal, ["Firma", "URL Firma"], 5) || "").trim(),
          foto: String(obtenerCampoAclaracion_(vr, indexVal, ["Imagen Fachada", "Foto Fachada", "Foto"], 6) || "").trim(),
          audio: String(obtenerCampoAclaracion_(vr, indexVal, ["Audio Teoyolotl", "Audio", "URL Audio"], 7) || "").trim(),
          gps: String(obtenerCampoAclaracion_(vr, indexVal, ["GPS", "Coordenadas"], 8) || "").trim(),
          pochteca: String(obtenerCampoAclaracion_(vr, indexVal, ["ID Correo", "Email Chofer", "Pochteca", "Operador"], 9) || "").trim().toLowerCase(),
          telefono: String(obtenerCampoAclaracion_(vr, indexVal, ["Telefono", "Telefono Contacto", "Tel Contacto"], 20) || "").trim(),
          comentarios: String(obtenerCampoAclaracion_(vr, indexVal, ["Comentarios", "Comentarios POD", "Observaciones"], 10) || "").trim(),
          fecha: obtenerCampoAclaracion_(vr, indexVal, ["Fecha en Ruta", "Fecha Entrega", "Fecha"], 10)
        };
        vObj.fecha = vObj.fecha ? (vObj.fecha instanceof Date ? Utilities.formatDate(vObj.fecha, "America/Mexico_City", "yyyy-MM-dd HH:mm") : String(vObj.fecha)) : "";
        if (vGuia) valMap[vGuia] = vObj;
        if (vPidClean) valMap[vPidClean] = vObj;
      }
    }

    // 2. Cargar Mapa de BD CENTRAL 2023 (Ruta)
    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    var hojaRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
    var rutaMap = {};
    var cpInfoMap = {};
    try {
      var ssBoveda = SpreadsheetApp.openById(ID_BOVEDA_BATCH_MAESTRO);
      var hojaMatrizCP = ssBoveda.getSheetByName("MATRIZ_CP");
      if (hojaMatrizCP && hojaMatrizCP.getLastRow() > 1) {
        var matrizCP = hojaMatrizCP.getDataRange().getValues();
        for (var im = 1; im < matrizCP.length; im++) {
          var cpMatriz = normalizarCPAclaracion_(matrizCP[im][0]);
          if (cpMatriz) {
            cpInfoMap[cpMatriz] = {
              municipio: String(matrizCP[im][1] || "").trim(),
              zona: String(matrizCP[im][2] || "").trim(),
              supervisor: String(matrizCP[im][5] || "").trim().toLowerCase()
            };
          }
        }
      }
    } catch (errCP) {
      Logger.log("Aviso: No se pudo consultar MATRIZ_CP para ficha pericial: " + errCP.toString());
    }
    if (hojaRuta && hojaRuta.getLastRow() > 1) {
      var dataR = hojaRuta.getDataRange().getValues();
      var indexRuta = crearIndiceEncabezadosAclaracion_(dataR[0]);

      for (var idxR = 1; idxR < dataR.length; idxR++) {
        var rowRuta = dataR[idxR];
        var g = String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Guia", "Guía", "HWB", "AWB"], -1) || "").trim();
        var pClean = sanitizarPIDParaBoveda(obtenerCampoAclaracion_(rowRuta, indexRuta, ["PID"], -1));
        var rObj = {
          pid: pClean,
          chk: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Checkpoint"], -1) || "PENDIENTE").trim(),
          chofer: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["ID Correo", "Email Chofer", "Pochteca", "Operador"], -1) || "").trim().toLowerCase(),
          receptor: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Quien Recibio O Comentarios", "Comentarios", "Receptor", "Destinatario"], -1) || "").trim(),
          fecha: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Fecha Entrega", "Fecha En Ruta", "Fecha"], -1) || "").trim(),
          cp: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["CP", "C.P.", "Codigo Postal", "Código Postal"], -1) || "").trim(),
          direccion1: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Rcvr Addr 1", "Direccion 1", "Direccion"], -1) || "").trim(),
          direccion2: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Rcvr Addr 2", "Direccion 2"], -1) || "").trim(),
          direccion3: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Rcvr Addr 3", "Direccion 3"], -1) || "").trim(),
          telefono: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Telefono Contacto", "Telefono", "Tel Contacto"], -1) || "").trim(),
          gps: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["GPS", "Coordenadas"], -1) || "").trim(),
          foto: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Imagen Fachada", "Foto Fachada", "Foto"], -1) || "").trim(),
          firma: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Firma", "URL Firma"], -1) || "").trim(),
          audio: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Audio Teoyolotl", "Audio", "URL Audio"], -1) || "").trim(),
          comentarios: String(obtenerCampoAclaracion_(rowRuta, indexRuta, ["Comentarios POD", "Comentarios", "Observaciones"], -1) || "").trim()
        };
        if (g) rutaMap[g] = rObj;
        if (pClean) rutaMap[pClean] = rObj;
      }
    }

    var ticketsExistentes = {};
    var ultFila = hojaAclaraciones.getLastRow();
    var tickets = [];

    // 3. Cargar tickets previamente guardados en la hoja
    if (ultFila > 1) {
      var valores = hojaAclaraciones.getRange(2, 1, ultFila - 1, 18).getValues();
      for (var i = 0; i < valores.length; i++) {
        var r = valores[i];
        var tId = String(r[0] || "").trim();
        var hwb = String(r[1] || "").trim();
        var pidCleanTicket = sanitizarPIDParaBoveda(r[2]);
        if (!tId && !hwb) continue;

        ticketsExistentes[tId] = true;
        if (hwb) ticketsExistentes[hwb] = true;

        var vEv = valMap[hwb] || valMap[pidCleanTicket];
        var rEv = rutaMap[hwb] || rutaMap[pidCleanTicket];

        // Determinar origen POD
        var origenPOD = "SIN_EVIDENCIA";
        if (vEv && rEv) origenPOD = "CONCILIADO";
        else if (vEv) origenPOD = "OLLINQUI";
        else if (rEv) origenPOD = "BD_CENTRAL";

        var firmaFinal = String(r[13] || (vEv ? vEv.firma : "")).trim();
        var fotoFinal = String(r[14] || (vEv ? vEv.foto : "")).trim();
        var gpsFinal = vEv ? vEv.gps : "";
        var audioFinal = vEv ? vEv.audio : "";
        var receptorFinal = (vEv && vEv.receptor) ? vEv.receptor : (rEv ? rEv.receptor : "Destinatario");
        var chkFinal = (vEv && vEv.chk) ? vEv.chk : (rEv ? rEv.chk : "PENDIENTE");
        var cpFinal = (vEv && vEv.cp) ? vEv.cp : (rEv ? rEv.cp : "");

        var threadIdTicket = String(r[16] || "").trim();
        var hiloContestado = false;
        var ultimoRemitente = "";
        var fechaUltimaRespuesta = "";
        var textoOriginalDhl = String(r[9] || "");

        // Detección de respuesta en Gmail (limitada a 10 tickets abiertos recientes para evitar lentitud y timeout)
        var ticketEstatusCheck = String(r[12] || "ABIERTO").toUpperCase();
        if (threadIdTicket && ticketEstatusCheck !== "CERRADO" && tickets.length < 10) {
          try {
            var thObj = GmailApp.getThreadById(threadIdTicket);
            if (thObj) {
              var msgs = thObj.getMessages();
              if (msgs.length > 0) {
                var firstMsg = msgs[0];
                textoOriginalDhl = String(firstMsg.getPlainBody() || textoOriginalDhl);
                var lastM = msgs[msgs.length - 1];
                ultimoRemitente = lastM.getFrom();
                var remLower = ultimoRemitente.toLowerCase();
                if (remLower.indexOf("@arauto.express") !== -1) {
                  hiloContestado = true;
                }
                fechaUltimaRespuesta = Utilities.formatDate(lastM.getDate(), "America/Mexico_City", "yyyy-MM-dd HH:mm");
              }
            }
          } catch(eTh) {}
        }

        var tData = {
          ticketId: tId,
          guia: hwb,
          pid: pidCleanTicket,
          pochteca: String(r[3] || "Sin Asignar"),
          emailChofer: String(r[4] || ""),
          telefonoChofer: String(r[5] || ""),
          supervisor: String(r[6] || "Irvin Reyes"),
          categoria: String(r[7] || "ACTUALIZACION_ESTATUS"),
          asunto: String(r[8] || ""),
          detalleDhl: String(r[9] || ""),
          textoOriginalDhl: textoOriginalDhl,
          fechaSolicitud: r[10] ? (r[10] instanceof Date ? Utilities.formatDate(r[10], "America/Mexico_City", "yyyy-MM-dd HH:mm") : String(r[10])) : "",
          fechaVisita: String(r[11] || ""),
          estatus: String(r[12] || "ABIERTO").toUpperCase(),
          firma: firmaFinal,
          fotoFachada: fotoFinal,
          gps: gpsFinal,
          audioTeoyolotl: audioFinal,
          receptor: receptorFinal,
          checkpoint: chkFinal,
          cp: cpFinal,
          propuestaRespuesta: String(r[15] || ""),
          threadId: threadIdTicket,
          ultimaActualizacion: r[17] ? (r[17] instanceof Date ? Utilities.formatDate(r[17], "America/Mexico_City", "yyyy-MM-dd HH:mm") : String(r[17])) : "",
          origenPOD: origenPOD,
          hiloContestado: hiloContestado,
          ultimoRemitente: ultimoRemitente,
          fechaUltimaRespuesta: fechaUltimaRespuesta
        };

        enriquecerTicketPericial360_(tData, vEv, rEv, cpInfoMap);
        tData.macros = generarMacrosPericiales(tData);
        tickets.push(tData);
      }
    }

    // 3.B. Ingestar tickets desde MONITOR_INCIDENCIAS_AE (Frente 5 Bot) para resolver split-brain
    try {
      var idMonitor = "15XPRq79p0Z_jcKoxc_Sc_FKOQNHj8V2EYwn8QlMbqc0";
      var ssMon = SpreadsheetApp.openById(idMonitor);
      var hojaMon = ssMon.getSheetByName("ACLARACIONES_DHL");
      if (hojaMon && hojaMon.getLastRow() > 1) {
        var ultMon = hojaMon.getLastRow();
        var numMon = Math.min(ultMon - 1, 300);
        var datosMon = hojaMon.getRange(ultMon - numMon + 1, 1, numMon, Math.min(hojaMon.getLastColumn(), 18)).getValues();
        for (var m = 0; m < datosMon.length; m++) {
          var rM = datosMon[m];
          var tIdM = String(rM[0] || "").trim();
          var hwbM = String(rM[2] || "").trim();
          var pidM = sanitizarPIDParaBoveda(rM[3]);
          if (!tIdM && !hwbM) continue;
          if (ticketsExistentes[tIdM] || (hwbM && ticketsExistentes[hwbM])) continue;

          var vEvM = valMap[hwbM] || valMap[pidM];
          var rEvM = rutaMap[hwbM] || rutaMap[pidM];

          var origenPOD_M = "SIN_EVIDENCIA";
          if (vEvM && rEvM) origenPOD_M = "CONCILIADO";
          else if (vEvM) origenPOD_M = "OLLINQUI";
          else if (rEvM) origenPOD_M = "BD_CENTRAL";

          var tDataM = {
            ticketId: tIdM,
            guia: hwbM || "S/G",
            pid: pidM,
            pochteca: String(rM[7] || (vEvM ? vEvM.pochteca : (rEvM ? rEvM.chofer : "Sin Asignar"))),
            emailChofer: (vEvM ? vEvM.pochteca : (rEvM ? rEvM.chofer : "")),
            telefonoChofer: "",
            supervisor: "Irvin Reyes",
            categoria: String(rM[6] || "ACTUALIZACION_ESTATUS"),
            asunto: String(rM[5] || ""),
            detalleDhl: String(rM[14] || rM[5] || "").substring(0, 180),
            textoOriginalDhl: String(rM[14] || rM[5] || ""),
            fechaSolicitud: rM[1] ? (rM[1] instanceof Date ? Utilities.formatDate(rM[1], "America/Mexico_City", "yyyy-MM-dd HH:mm") : String(rM[1])) : "",
            fechaVisita: "",
            estatus: String(rM[13] || "ABIERTO").toUpperCase(),
            firma: vEvM ? vEvM.firma : "",
            fotoFachada: vEvM ? vEvM.foto : "",
            gps: vEvM ? vEvM.gps : "",
            audioTeoyolotl: vEvM ? vEvM.audio : "",
            receptor: (vEvM && vEvM.receptor) ? vEvM.receptor : (rEvM ? rEvM.receptor : "Destinatario"),
            checkpoint: (vEvM && vEvM.chk) ? vEvM.chk : (rEvM ? rEvM.chk : "PENDIENTE"),
            cp: (vEvM && vEvM.cp) ? vEvM.cp : (rEvM ? rEvM.cp : ""),
            propuestaRespuesta: String(rM[15] || ""),
            threadId: String(rM[16] || ""),
            ultimaActualizacion: rM[17] ? (rM[17] instanceof Date ? Utilities.formatDate(rM[17], "America/Mexico_City", "yyyy-MM-dd HH:mm") : String(rM[17])) : "",
            origenPOD: origenPOD_M,
            hiloContestado: false,
            ultimoRemitente: String(rM[4] || ""),
            fechaUltimaRespuesta: ""
          };

          enriquecerTicketPericial360_(tDataM, vEvM, rEvM, cpInfoMap);
          tDataM.macros = generarMacrosPericiales(tDataM);
          tickets.push(tDataM);
          ticketsExistentes[tIdM] = true;
          if (hwbM) ticketsExistentes[hwbM] = true;
        }
      }
    } catch(eMon) {
      Logger.log("Aviso: Consulta de MONITOR_INCIDENCIAS_AE: " + eMon.toString());
    }

    // 4. Escaneo proactivo de hilos en Gmail bajo etiquetas DHL con LockService anti-concurrencia
    var lockGmail = LockService.getScriptLock();
    if (lockGmail.tryLock(5000)) {
      try {
        var queryGmail = "label:03_RECLAMOS_DHL OR label:03_RECLAM OR label:03_RECLAMACION";
        var threads = GmailApp.search(queryGmail, 0, 15);

        if (threads && threads.length > 0) {
          var nuevosTicketsHoja = [];

          for (var t = 0; t < threads.length; t++) {
            var th = threads[t];
            var tId = "TK-" + th.getId().substring(0, 6).toUpperCase();
            if (ticketsExistentes[tId]) continue;

            var msgsThread = th.getMessages();
            var lastMsg = msgsThread[msgsThread.length - 1];
            var subject = th.getFirstMessageSubject() || "";
            var body = lastMsg.getPlainBody() || "";
            var originalBody = msgsThread[0].getPlainBody() || body;
            var date = lastMsg.getDate();

            var guiaMatch = subject.match(/\b\d{10}\b/) || body.match(/\b\d{10}\b/);
            var guia = guiaMatch ? guiaMatch[0] : "";
            if (guia && ticketsExistentes[guia]) continue;

            var vEvNuevo = valMap[guia];
            var rEvNuevo = rutaMap[guia];

            var origenPODNuevo = "SIN_EVIDENCIA";
            if (vEvNuevo && rEvNuevo) origenPODNuevo = "CONCILIADO";
            else if (vEvNuevo) origenPODNuevo = "OLLINQUI";
            else if (rEvNuevo) origenPODNuevo = "BD_CENTRAL";

            var pochtecaCorreo = (vEvNuevo && vEvNuevo.pochteca) ? vEvNuevo.pochteca : (rEvNuevo ? rEvNuevo.chofer : "");
            var dirContacto = (typeof DIRECTORIO_CONTACTO_POCHTECAS !== 'undefined' && DIRECTORIO_CONTACTO_POCHTECAS[pochtecaCorreo]) || { nombre: pochtecaCorreo || "Sin Asignar", tel: "", zona: "" };

            // Clasificación inteligente
            var categoria = "ACTUALIZACION_ESTATUS";
            var subjLower = (subject + " " + body).toLowerCase();
            if (subjLower.indexOf("no reconoce") !== -1 || subjLower.indexOf("desconoce") !== -1 || subjLower.indexOf("no recibi") !== -1) {
              categoria = "ENTREGA_NO_RECONOCIDA";
            } else if (subjLower.indexOf("reintento") !== -1 || subjLower.indexOf("segunda visita") !== -1 || subjLower.indexOf("visitar") !== -1) {
              categoria = "NUEVO_INTENTO";
            } else if (subjLower.indexOf("fuera de zona") !== -1 || subjLower.indexOf("no pertenece") !== -1) {
              categoria = "NO_PERTENECE";
            }

            var chkStr = (vEvNuevo && vEvNuevo.chk) ? vEvNuevo.chk : (rEvNuevo ? rEvNuevo.chk : "PENDIENTE");
            var pidStr = (vEvNuevo && vEvNuevo.pid) ? vEvNuevo.pid : (rEvNuevo ? rEvNuevo.pid : ("JD" + (guia || "0000000000")));
            var recStr = (vEvNuevo && vEvNuevo.receptor) ? vEvNuevo.receptor : (rEvNuevo ? rEvNuevo.receptor : "EN TRÁNSITO");
            var fecStr = (vEvNuevo && vEvNuevo.fecha) ? vEvNuevo.fecha : (rEvNuevo ? rEvNuevo.fecha : Utilities.formatDate(date, "America/Mexico_City", "dd/MM/yyyy HH:mm"));
            var cpStr = (vEvNuevo && vEvNuevo.cp) ? vEvNuevo.cp : (rEvNuevo ? rEvNuevo.cp : "");

            var firmaStr = vEvNuevo ? vEvNuevo.firma : "";
            var fotoStr = vEvNuevo ? vEvNuevo.foto : "";
            var gpsStr = vEvNuevo ? vEvNuevo.gps : "";
            var audioStr = vEvNuevo ? vEvNuevo.audio : "";

            // Detección respuesta en Gmail
            var lastSender = lastMsg.getFrom();
            var lastSenderLower = lastSender.toLowerCase();
            var contestado = (lastSenderLower.indexOf("@arauto.express") !== -1 || lastSenderLower.indexOf("arauto") !== -1);

            var ticketNuevo = {
              ticketId: tId,
              guia: guia || "S/G",
              pid: pidStr,
              pochteca: dirContacto.nombre,
              emailChofer: pochtecaCorreo,
              telefonoChofer: dirContacto.tel,
              supervisor: "Irvin Reyes",
              categoria: categoria,
              asunto: subject,
              detalleDhl: originalBody.trim().substring(0, 45000),
              textoOriginalDhl: originalBody.trim().substring(0, 45000),
              fechaSolicitud: Utilities.formatDate(date, "America/Mexico_City", "yyyy-MM-dd HH:mm"),
              fechaVisita: "",
              estatus: "ABIERTO",
              firma: firmaStr,
              fotoFachada: fotoStr,
              gps: gpsStr,
              audioTeoyolotl: audioStr,
              receptor: recStr,
              checkpoint: chkStr,
              cp: cpStr,
              propuestaRespuesta: "",
              threadId: th.getId(),
              ultimaActualizacion: Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd HH:mm"),
              origenPOD: origenPODNuevo,
              hiloContestado: contestado,
              ultimoRemitente: lastSender,
              fechaUltimaRespuesta: Utilities.formatDate(lastMsg.getDate(), "America/Mexico_City", "yyyy-MM-dd HH:mm")
            };

            enriquecerTicketPericial360_(ticketNuevo, vEvNuevo, rEvNuevo, cpInfoMap);
            ticketNuevo.macros = generarMacrosPericiales(ticketNuevo);
            ticketNuevo.propuestaRespuesta = ticketNuevo.macros.macroPOD;

            tickets.push(ticketNuevo);
            ticketsExistentes[tId] = true;
            if (guia) ticketsExistentes[guia] = true;

            nuevosTicketsHoja.push([
              ticketNuevo.ticketId, ticketNuevo.guia, ticketNuevo.pid, ticketNuevo.pochteca,
              ticketNuevo.emailChofer, ticketNuevo.telefonoChofer, ticketNuevo.supervisor,
              ticketNuevo.categoria, ticketNuevo.asunto, ticketNuevo.detalleDhl,
              ticketNuevo.fechaSolicitud, ticketNuevo.fechaVisita, ticketNuevo.estatus,
              ticketNuevo.firma, ticketNuevo.fotoFachada, ticketNuevo.propuestaRespuesta,
              ticketNuevo.threadId, ticketNuevo.ultimaActualizacion, ""
            ]);
          }

          if (nuevosTicketsHoja.length > 0) {
            hojaAclaraciones.getRange(hojaAclaraciones.getLastRow() + 1, 1, nuevosTicketsHoja.length, nuevosTicketsHoja[0].length).setValues(nuevosTicketsHoja);
          }
        }
      } catch(eGmail) {
        Logger.log("Nota: Escaneo en vivo de tickets Gmail: " + eGmail.toString());
      } finally {
        lockGmail.releaseLock();
      }
    }

    return {
      exito: true,
      total: tickets.length,
      tickets: tickets,
      timestamp: Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd HH:mm:ss")
    };

  } catch(err) {
    Logger.log("Error en obtenerAclaracionesAbiertasV2: " + err.toString());
    return {
      exito: false,
      total: 0,
      tickets: [],
      error: err.toString()
    };
  }
}

/**
 * Delegación transparente para preservar compatibilidad con llamadas existentes
 */
function obtenerAclaracionesAbiertas() {
  return obtenerAclaracionesAbiertasV2();
}

function obtenerTicketsAclaracionesV2() {
  return obtenerAclaracionesAbiertasV2();
}

/**
 * 💾 Actualiza el estatus, fecha compromiso y observaciones en ACLARACIONES_DHL y sincroniza con Gmail y Monitor
 */
function actualizarAclaracionDHL(ticketId, nuevoEstatus, fechaVisita, observaciones) {
  try {
    if (!ticketId) return { exito: false, error: "ID de ticket no proporcionado." };

    var idVal = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M";
    var ssVal = SpreadsheetApp.openById(idVal);
    var hoja = ssVal.getSheetByName("ACLARACIONES_DHL");
    if (!hoja) return { exito: false, error: "Pestaña ACLARACIONES_DHL no encontrada en VALIDACIÓN_QRO_2025." };

    var data = hoja.getDataRange().getValues();
    var filaTarget = -1;
    var threadIdEncontrado = "";

    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim() === String(ticketId).trim()) {
        filaTarget = r + 1;
        threadIdEncontrado = String(data[r][16] || "").trim(); // Col Q: Thread_ID
        break;
      }
    }

    var nowStr = Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd HH:mm:ss");

    if (filaTarget !== -1) {
      if (fechaVisita !== undefined && fechaVisita !== null) {
        hoja.getRange(filaTarget, 12).setValue(fechaVisita); // Col 12: Fecha_Compromiso_Visita
      }
      if (nuevoEstatus) {
        hoja.getRange(filaTarget, 13).setValue(nuevoEstatus); // Col 13: Estatus
      }
      hoja.getRange(filaTarget, 18).setValue(nowStr);        // Col 18: Ultima_Actualizacion
      if (observaciones !== undefined && observaciones !== null) {
        hoja.getRange(filaTarget, 19).setValue(observaciones); // Col 19: Observaciones_Supervisor
      }
    }

    // Sincronizar también en MONITOR_INCIDENCIAS_AE si el ticket reside allí
    try {
      var idMonAct = "15XPRq79p0Z_jcKoxc_Sc_FKOQNHj8V2EYwn8QlMbqc0";
      var ssMonAct = SpreadsheetApp.openById(idMonAct);
      var hojaMonAct = ssMonAct.getSheetByName("ACLARACIONES_DHL");
      if (hojaMonAct && hojaMonAct.getLastRow() > 1) {
        var dM = hojaMonAct.getDataRange().getValues();
        for (var mi = 1; mi < dM.length; mi++) {
          if (String(dM[mi][0]).trim() === String(ticketId).trim()) {
            if (nuevoEstatus) hojaMonAct.getRange(mi + 1, 14).setValue(nuevoEstatus); // Col 14: Estatus_Ticket
            hojaMonAct.getRange(mi + 1, 18).setValue(nowStr);                           // Col 18: Ultima_Actualizacion
            if (!threadIdEncontrado) threadIdEncontrado = String(dM[mi][16] || "").trim();
            break;
          }
        }
      }
    } catch(eMonSync) {
      Logger.log("Aviso: Sincronización en Monitor Incidencias: " + eMonSync.toString());
    }

    SpreadsheetApp.flush();

    // Sincronización en Gmail con etiquetas operativas
    if (threadIdEncontrado) {
      try {
        var thread = GmailApp.getThreadById(threadIdEncontrado);
        if (thread) {
          if (nuevoEstatus === "CERRADO") {
            var labelCerrado = GmailApp.getUserLabelByName("03_CERRADO") || GmailApp.createLabel("03_CERRADO");
            thread.addLabel(labelCerrado);
          } else if (nuevoEstatus === "EN_GESTION") {
            var labelGestion = GmailApp.getUserLabelByName("03_EN_GESTION") || GmailApp.createLabel("03_EN_GESTION");
            thread.addLabel(labelGestion);
          }
        }
      } catch(eLabel) {
        Logger.log("Aviso: No se pudo etiquetar hilo Gmail (" + threadIdEncontrado + "): " + eLabel.toString());
      }
    }

    return {
      exito: true,
      mensaje: "Ticket " + ticketId + " actualizado a " + nuevoEstatus + " exitosamente."
    };

  } catch(err) {
    Logger.log("Error en actualizarAclaracionDHL: " + err.toString());
    return { exito: false, error: err.toString() };
  }
}

function actualizarTicketAclaracionV2(ticketId, nuevoEstatus, fechaVisita, observaciones) {
  return actualizarAclaracionDHL(ticketId, nuevoEstatus, fechaVisita, observaciones);
}

function buscarEvidenciaParaAclaracion(guiaOPid) {
  var id = String(guiaOPid || "").trim();
  if (!id) return { exito: false, error: "Guía o PID requerido" };
  var idVal = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M";
  var ssVal = SpreadsheetApp.openById(idVal);
  var shVal = ssVal.getSheetByName("Validación") || ssVal.getSheetByName("VALIDACIÓN_QRO_2025");
  if (shVal && shVal.getLastRow() > 1) {
    var d = shVal.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) {
      if (String(d[i][0]).trim() === id || String(d[i][1]).trim() === id || sanitizarPIDParaBoveda(d[i][1]) === sanitizarPIDParaBoveda(id)) {
        return {
          exito: true,
          encontrado: true,
          fuente: "VALIDACION_PWA",
          guia: String(d[i][0]),
          pid: sanitizarPIDParaBoveda(d[i][1]),
          cp: String(d[i][2]),
          checkpoint: String(d[i][3]),
          receptor: String(d[i][4]),
          firma: String(d[i][5]),
          foto: String(d[i][6]),
          audio: String(d[i][7]),
          gps: String(d[i][8]),
          pochteca: String(d[i][9]),
          fecha: String(d[i][10])
        };
      }
    }
  }
  return { exito: true, encontrado: false, mensaje: "No encontrado en Validación PWA" };
}

/**
 * =========================================================================
 * ⚡ FASE 2: MOTOR DE CONCILIACIÓN NOCTURNA EDD Y ASIGNADOR MASIVO (v84.5)
 * =========================================================================
 */

/**
 * 1. Asegura la etiqueta canónica 04_EDD_QRO en Gmail
 */
function asegurarEtiquetaEDD_() {
  try {
    var etiquetaNombre = "04_EDD_QRO";
    var etiquetas = GmailApp.getUserLabels();
    var existe = false;
    for (var i = 0; i < etiquetas.length; i++) {
      if (etiquetas[i].getName().toUpperCase() === etiquetaNombre.toUpperCase()) {
        existe = true;
        break;
      }
    }
    if (!existe) {
      GmailApp.createLabel(etiquetaNombre);
      Logger.log("Etiqueta creada en Gmail: " + etiquetaNombre);
    }
    return etiquetaNombre;
  } catch(e) {
    Logger.log("Nota: asegurarEtiquetaEDD_: " + e.toString());
    return "04_EDD_QRO";
  }
}

/**
 * 2. Succiona el correo más reciente con etiqueta EDD y concilia contra Ruta
 */
function extraerGuiasCorreoEDDDia() {
  try {
    asegurarEtiquetaEDD_();
    var query = "label:04_EDD_QRO OR label:04_CORTE_EDD OR label:04_EDD_DHL OR label:EDD_HOY";
    var threads = GmailApp.search(query, 0, 5);

    if (!threads || threads.length === 0) {
      return {
        exito: false,
        error: "No se encontraron correos con la etiqueta '04_EDD_QRO' en Gmail. Asegúrate de etiquetar el correo vespertino de DHL con '04_EDD_QRO'."
      };
    }

    // Tomar el hilo más reciente (última actualización del día)
    var thread = threads[0];
    var msgs = thread.getMessages();
    var lastMsg = msgs[msgs.length - 1];

    var asunto = thread.getFirstMessageSubject() || "Reporte EDD DHL";
    var remitente = lastMsg.getFrom() || "DHL Express";
    var fechaMsg = Utilities.formatDate(lastMsg.getDate(), "America/Mexico_City", "dd/MM/yyyy HH:mm");

    // Extraer texto completo (cuerpo + adjuntos si son texto/csv)
    var textoCompleto = lastMsg.getPlainBody() || "";
    var attachments = lastMsg.getAttachments();
    for (var a = 0; a < attachments.length; a++) {
      var att = attachments[a];
      var attName = att.getName().toLowerCase();
      if (attName.indexOf(".csv") !== -1 || attName.indexOf(".txt") !== -1) {
        textoCompleto += "\n" + att.getDataAsString();
      }
    }

    // Buscar guías de 10 dígitos
    var regexGuia = /\b\d{10}\b/g;
    var matches = textoCompleto.match(regexGuia) || [];
    var guiasUnicas = [];
    var guiasSet = {};

    for (var m = 0; m < matches.length; m++) {
      var g = matches[m];
      if (!guiasSet[g]) {
        guiasSet[g] = true;
        guiasUnicas.push({ guia: g });
      }
    }

    if (guiasUnicas.length === 0) {
      return {
        exito: false,
        asunto: asunto,
        remitente: remitente,
        fechaCorreo: fechaMsg,
        error: "El correo no contiene guías estándar de 10 dígitos en el texto o adjuntos."
      };
    }

    // Conciliar automáticamente contra BD Central
    var resultadoConciliacion = conciliarGuiasEDDContraRuta(guiasUnicas);

    return {
      exito: true,
      asunto: asunto,
      remitente: remitente,
      fechaCorreo: fechaMsg,
      totalGuiasCorreo: guiasUnicas.length,
      metricas: resultadoConciliacion.metricas,
      guias: resultadoConciliacion.guias
    };

  } catch(err) {
    return {
      exito: false,
      error: "Error al extraer correo EDD: " + err.toString()
    };
  }
}

/**
 * 3. Cruza un listado de guías (del correo o pegadas a mano) contra BD CENTRAL 2023 (Ruta)
 */
function conciliarGuiasEDDContraRuta(guiasInput) {
  try {
    if (!guiasInput || guiasInput.length === 0) {
      return {
        exito: false,
        error: "Lista de guías vacía.",
        metricas: { total: 0, ok: 0, pendientes: 0, noEnRuta: 0 },
        guias: []
      };
    }

    // Normalizar entrada a array de strings
    var listaGuias = [];
    var setGuias = {};
    for (var i = 0; i < guiasInput.length; i++) {
      var item = guiasInput[i];
      var g = (typeof item === 'object' && item.guia) ? String(item.guia).trim() : String(item).trim();
      var subMatches = g.match(/\b\d{10}\b/g);
      if (subMatches) {
        for (var s = 0; s < subMatches.length; s++) {
          var sg = subMatches[s];
          if (!setGuias[sg]) {
            setGuias[sg] = true;
            listaGuias.push(sg);
          }
        }
      } else if (g && !setGuias[g]) {
        setGuias[g] = true;
        listaGuias.push(g);
      }
    }

    // Conectar a BD CENTRAL 2023
    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    var hojaRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
    if (!hojaRuta) throw new Error("No se encontró pestaña 'Ruta' en BD CENTRAL 2023.");

    var datosRuta = hojaRuta.getDataRange().getValues();
    var cabeceras = datosRuta[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });

    var colGuia = cabeceras.indexOf("guia");
    if (colGuia === -1) colGuia = cabeceras.indexOf("guía");
    var colPid = cabeceras.indexOf("pid");
    var colCp = cabeceras.indexOf("c.p.");
    if (colCp === -1) colCp = cabeceras.indexOf("cp");
    var colDest = cabeceras.indexOf("receiver name");
    if (colDest === -1) colDest = cabeceras.indexOf("destinatario");
    var colChk = cabeceras.indexOf("checkpoint");
    var colComent = cabeceras.indexOf("quien recibio o comentarios");
    if (colComent === -1) colComent = cabeceras.indexOf("comentarios");
    var colFechaEnRuta = cabeceras.indexOf("fecha en ruta");
    var colChofer = cabeceras.indexOf("id correo");
    var colInter = cabeceras.indexOf("inter");

    // Indexar filas de Ruta por Guía y por PID
    var mapaRuta = {};
    for (var r = 1; r < datosRuta.length; r++) {
      var row = datosRuta[r];
      var gVal = colGuia !== -1 ? String(row[colGuia] || "").trim() : "";
      var pVal = colPid !== -1 ? String(row[colPid] || "").trim() : "";

      var obj = {
        filaSheet: r + 1,
        guia: gVal,
        pid: pVal,
        cp: colCp !== -1 ? String(row[colCp] || "").trim() : "",
        destinatario: colDest !== -1 ? String(row[colDest] || "").trim() : "",
        checkpoint: colChk !== -1 ? String(row[colChk] || "").trim().toUpperCase() : "",
        comentarios: colComent !== -1 ? String(row[colComent] || "").trim() : "",
        fechaEnRuta: colFechaEnRuta !== -1 ? String(row[colFechaEnRuta] || "").trim() : "",
        chofer: colChofer !== -1 ? String(row[colChofer] || "").trim().toLowerCase() : "",
        esInternacional: colInter !== -1 ? (String(row[colInter] || "").trim().toUpperCase() === "INTER" || String(row[colInter] || "").trim().toUpperCase() === "I") : false
      };

      if (gVal) mapaRuta[gVal] = obj;
      if (pVal) {
        mapaRuta[pVal] = obj;
        if (pVal.indexOf("JJD") === 0) mapaRuta["JD" + pVal.substring(3)] = obj;
        else if (pVal.indexOf("JD") === 0) mapaRuta["JJD" + pVal.substring(2)] = obj;
      }
    }

    var guiasConciliadas = [];
    var metricas = { total: listaGuias.length, ok: 0, pendientes: 0, noEnRuta: 0 };

    for (var k = 0; k < listaGuias.length; k++) {
      var guiaQuery = listaGuias[k];
      var match = mapaRuta[guiaQuery];

      if (match) {
        var esOk = (match.checkpoint === "OK" || match.checkpoint === "ENTREGADO" || match.checkpoint === "FD");
        var estatusConcil = esOk ? "ENTREGADA_OK" : "PENDIENTE_INCIDENCIA";

        if (esOk) metricas.ok++;
        else metricas.pendientes++;

        // Generar Sugerencia Inteligente Poka-Yoke si está pendiente
        var sugerenciaChk = "NH";
        var motivoSugerido = "Cliente ausente en domicilio";

        if (!esOk) {
          var cpNum = match.cp;
          var destUpper = match.destinatario.toUpperCase();

          if (cpNum === "37980" || cpNum === "37900" || cpNum === "37917") {
            sugerenciaChk = "BA";
            motivoSugerido = "Dirección fuera de cobertura / zona foránea con ventana";
          } else if (destUpper.indexOf("S.A.") !== -1 || destUpper.indexOf("DE C.V.") !== -1 || 
                     destUpper.indexOf("EMPRESA") !== -1 || destUpper.indexOf("TIENDA") !== -1 || 
                     destUpper.indexOf("LOCAL") !== -1 || destUpper.indexOf("MERCADO") !== -1 ||
                     destUpper.indexOf("PLAZA") !== -1 || destUpper.indexOf("COMERCIAL") !== -1) {
            sugerenciaChk = "CA";
            motivoSugerido = "Comercio / empresa cerrado en horario vespertino";
          } else {
            sugerenciaChk = "NH";
            motivoSugerido = "No se localiza a destinatario en primer intento";
          }
        }

        guiasConciliadas.push({
          guia: match.guia || guiaQuery,
          pid: match.pid,
          cp: match.cp,
          destinatario: match.destinatario,
          chofer: match.chofer,
          checkpointActual: match.checkpoint || "PENDIENTE",
          comentariosActuales: match.comentarios,
          fechaEnRuta: match.fechaEnRuta,
          esInternacional: match.esInternacional,
          estatusConciliacion: estatusConcil,
          sugerencia: sugerenciaChk,
          motivoSugerido: motivoSugerido,
          filaSheet: match.filaSheet
        });

      } else {
        metricas.noEnRuta++;
        guiasConciliadas.push({
          guia: guiaQuery,
          pid: "S/P",
          cp: "---",
          destinatario: "No localizada en hoja Ruta",
          chofer: "sin_asignar",
          checkpointActual: "NO_LOCALIZADA",
          comentariosActuales: "",
          fechaEnRuta: "",
          esInternacional: false,
          estatusConciliacion: "NO_EN_RUTA",
          sugerencia: "PRE_ASIGNAR",
          motivoSugerido: "Revisar si pertenece a otra plaza o día previo",
          filaSheet: -1
        });
      }
    }

    return {
      exito: true,
      metricas: metricas,
      guias: guiasConciliadas
    };

  } catch(err) {
    return {
      exito: false,
      error: "Error al conciliar guías contra Ruta: " + err.toString(),
      metricas: { total: 0, ok: 0, pendientes: 0, noEnRuta: 0 },
      guias: []
    };
  }
}

/**
 * 4. Aplica incidencias de forma masiva y atómica a la hoja Ruta de BD Central 2023
 */
function inyectarIncidenciasMasivasRuta(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30s timeout

    if (!payload || !payload.guias || payload.guias.length === 0) {
      return { exito: false, error: "No se proporcionaron guías para actualizar." };
    }

    var chkTarget = String(payload.checkpoint || "NH").trim().toUpperCase();
    var fechaTarget = String(payload.fecha || Utilities.formatDate(new Date(), "America/Mexico_City", "dd/MM/yyyy")).trim();
    var horaTarget = String(payload.hora || "18:30").trim();
    var comentariosTarget = String(payload.comentarios || ("Incidencia " + chkTarget + " - Mesa de control")).trim();
    var fechaEnRutaCompleta = fechaTarget + " " + horaTarget;

    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    var hojaRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
    if (!hojaRuta) throw new Error("No se encontró pestaña 'Ruta' en BD CENTRAL 2023.");

    var datosRuta = hojaRuta.getDataRange().getValues();
    var cabeceras = datosRuta[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });

    var colGuia = cabeceras.indexOf("guia");
    if (colGuia === -1) colGuia = cabeceras.indexOf("guía");
    var colPid = cabeceras.indexOf("pid");
    var colChk = cabeceras.indexOf("checkpoint");
    var colComent = cabeceras.indexOf("quien recibio o comentarios");
    if (colComent === -1) colComent = cabeceras.indexOf("comentarios");
    var colFechaEnRuta = cabeceras.indexOf("fecha en ruta");

    if (colChk === -1) throw new Error("Columna Checkpoint no encontrada en hoja Ruta.");

    var guiasMapTarget = {};
    for (var g = 0; g < payload.guias.length; g++) {
      var itemG = payload.guias[g];
      var gStr = (typeof itemG === 'object' && itemG.guia) ? String(itemG.guia).trim() : String(itemG).trim();
      var pStr = (typeof itemG === 'object' && itemG.pid) ? String(itemG.pid).trim() : "";
      var customFechaEnRuta = (typeof itemG === 'object' && (itemG.fechaEnRuta || itemG.fechaHora)) ? String(itemG.fechaEnRuta || itemG.fechaHora).trim() : null;

      var infoObj = { customFecha: customFechaEnRuta };
      if (gStr) guiasMapTarget[gStr] = infoObj;
      if (pStr) {
        guiasMapTarget[pStr] = infoObj;
        var pUpper = pStr.toUpperCase();
        if (pUpper.indexOf("JJD") === 0) {
          guiasMapTarget["JD" + pUpper.substring(3)] = infoObj;
        } else if (pUpper.indexOf("JD") === 0) {
          guiasMapTarget["J" + pUpper] = infoObj;
        }
      }
    }

    var filasModificadas = 0;

    for (var r = 1; r < datosRuta.length; r++) {
      var row = datosRuta[r];
      var gVal = colGuia !== -1 ? String(row[colGuia] || "").trim() : "";
      var pVal = colPid !== -1 ? String(row[colPid] || "").trim() : "";

      var targetInfo = guiasMapTarget[gVal] || guiasMapTarget[pVal];
      if (!targetInfo && pVal) {
        var pUpperVal = pVal.toUpperCase();
        if (pUpperVal.indexOf("JD") === 0 && guiasMapTarget["J" + pUpperVal]) {
          targetInfo = guiasMapTarget["J" + pUpperVal];
        } else if (pUpperVal.indexOf("JJD") === 0 && guiasMapTarget["JD" + pUpperVal.substring(3)]) {
          targetInfo = guiasMapTarget["JD" + pUpperVal.substring(3)];
        }
      }

      if (targetInfo) {
        var filaNum = r + 1;
        // Columna Checkpoint (1-indexed)
        hojaRuta.getRange(filaNum, colChk + 1).setValue(chkTarget);

        // Columna Comentarios
        if (colComent !== -1) {
          hojaRuta.getRange(filaNum, colComent + 1).setValue(comentariosTarget);
        }

        // Columna Fecha en Ruta
        if (colFechaEnRuta !== -1) {
          var valFechaEnRuta = targetInfo.customFecha || fechaEnRutaCompleta;
          hojaRuta.getRange(filaNum, colFechaEnRuta + 1).setValue(valFechaEnRuta);
        }

        filasModificadas++;
      }
    }

    SpreadsheetApp.flush();

    return {
      exito: true,
      checkpointAplicado: chkTarget,
      totalActualizadas: filasModificadas,
      mensaje: "Se aplicó exitosamente el checkpoint " + chkTarget + " a " + filasModificadas + " guías en BD Central."
    };

  } catch(err) {
    return {
      exito: false,
      error: "Error al inyectar incidencias masivas: " + err.toString()
    };
  } finally {
    try { lock.releaseLock(); } catch(eLock) {}
  }
}

/**
 * 🛠️ Helpers Oficiales DHL ECIS (Alineación Canónica 14 Columnas)
 */
function formatearPIDParaECIS(pVal, gVal) {
  var pid = String(pVal || "").trim().toUpperCase();
  if (!pid && gVal) pid = String(gVal).trim().toUpperCase();
  if (pid.indexOf("JJD") === 0) return pid;
  if (pid.indexOf("JD") === 0) return "J" + pid; // Fuerza Ley Doble J para ECIS: JD -> JJD
  return pid;
}

function depurarSignatoryECIS(texto) {
  if (!texto) return "";
  var s = String(texto).trim();
  if (typeof s.normalize === "function") {
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } else {
    s = s.replace(/[áàäâ]/gi, "A")
         .replace(/[éèëê]/gi, "E")
         .replace(/[íìïî]/gi, "I")
         .replace(/[óòöô]/gi, "O")
         .replace(/[úùüû]/gi, "U")
         .replace(/ñ/gi, "N");
  }
  s = s.toUpperCase().trim();
  s = s.replace(/[^A-Z0-9\.\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (s === "." || s === ".." || s === "..." || s === "N/A" || s === "NA") return "";
  return s.substring(0, 30);
}

function formatearFechaECIS_GAS(fechaRaw) {
  if (!fechaRaw) {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + "T" + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
  }
  var d;
  if (fechaRaw instanceof Date && !isNaN(fechaRaw.getTime())) {
    d = fechaRaw;
  } else {
    var s = String(fechaRaw).trim();
    if (!s) {
      d = new Date();
    } else {
      // 1. Priorizar formato mexicano DD/MM/YYYY HH:mm:ss o DD-MM-YYYY
      var m = s.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
      if (m) {
        var dia = parseInt(m[1], 10);
        var mes = parseInt(m[2], 10) - 1;
        var anio = parseInt(m[3], 10);
        if (anio < 100) anio += 2000;
        var h = m[4] ? parseInt(m[4], 10) : 18;
        var mi = m[5] ? parseInt(m[5], 10) : 30;
        var seg = m[6] ? parseInt(m[6], 10) : 0;
        d = new Date(anio, mes, dia, h, mi, seg);
      } else {
        // 2. Formato ISO YYYY-MM-DDTHH:mm:ss o YYYY-MM-DD HH:mm:ss
        var mIso = s.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (mIso) {
          var anioIso = parseInt(mIso[1], 10);
          var mesIso = parseInt(mIso[2], 10) - 1;
          var diaIso = parseInt(mIso[3], 10);
          var hIso = mIso[4] ? parseInt(mIso[4], 10) : 18;
          var miIso = mIso[5] ? parseInt(mIso[5], 10) : 30;
          var segIso = mIso[6] ? parseInt(mIso[6], 10) : 0;
          d = new Date(anioIso, mesIso, diaIso, hIso, miIso, segIso);
        } else {
          d = new Date(s);
          if (isNaN(d.getTime())) d = new Date();
        }
      }
    }
  }
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + "T" + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
}

/**
 * 5. Genera el corte CSV para el robot de ECIS / DHL (Alineado 1:1 a Especificación Oficial de 14 Columnas)
 */
function generarCorteECISManual(guiasSeleccionadas) {
  try {
    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    var hojaRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
    if (!hojaRuta) throw new Error("No se encontró pestaña 'Ruta' en BD CENTRAL 2023.");

    var datosRuta = hojaRuta.getDataRange().getValues();
    var cabeceras = datosRuta[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });

    var colGuia = cabeceras.indexOf("guia");
    if (colGuia === -1) colGuia = cabeceras.indexOf("guía");
    var colPid = cabeceras.indexOf("pid");
    var colDest = cabeceras.indexOf("receiver name");
    if (colDest === -1) colDest = cabeceras.indexOf("destinatario");
    var colComentarios = cabeceras.indexOf("quien recibio o comentarios");
    if (colComentarios === -1) colComentarios = cabeceras.indexOf("comentarios");
    var colChk = cabeceras.indexOf("checkpoint");
    var colFechaEnRuta = cabeceras.indexOf("fecha en ruta");
    if (colFechaEnRuta === -1) colFechaEnRuta = cabeceras.indexOf("fecha asignacion");
    if (colFechaEnRuta === -1) colFechaEnRuta = cabeceras.indexOf("fecha");
    var colInter = cabeceras.indexOf("inter");

    var setFiltro = null;
    if (guiasSeleccionadas && guiasSeleccionadas.length > 0) {
      setFiltro = {};
      for (var s = 0; s < guiasSeleccionadas.length; s++) {
        var valG = String(guiasSeleccionadas[s]).trim();
        setFiltro[valG] = true;
      }
    }

    var MAPEO_ECIS = {
      "OK": { tyCd: "DLWLC", rcd: "OK211" },
      "BA": { tyCd: "DLWLE", rcd: "BA021" },
      "NH": { tyCd: "DLWLE", rcd: "NH562" },
      "CA": { tyCd: "DLWLE", rcd: "CAUND" },
      "RD": { tyCd: "DLWLE", rcd: "RD666" }
    };

    var lineasCsv = [];
    lineasCsv.push("CkptCd*,TyCd*,PcsIdShipId*,SrvaCd*,FcCd*,CycCd,RouteCd,DateTime*,LegalEntity,NoPcs*,SignNm*,ThrfrQf*,CourNo,RCd*");
    lineasCsv.push("Checkpoint Code,Event Type Code,SID/PID/HUID,Service Area Code,Facility Code,Cycle,Route Code,Checkpoint Created Date and Time,Legal Entity,Pieces,Signatory,Thoroughfare Qualifier,Courier Number,Standard Remark Code");

    var totalEventos = 0;

    for (var r = 1; r < datosRuta.length; r++) {
      var row = datosRuta[r];
      var gVal = colGuia !== -1 ? String(row[colGuia] || "").trim() : "";
      var pVal = colPid !== -1 ? String(row[colPid] || "").trim() : "";
      var chk = colChk !== -1 ? String(row[colChk] || "").trim().toUpperCase() : "";
      var esInter = colInter !== -1 ? (String(row[colInter] || "").trim().toUpperCase() === "INTER" || String(row[colInter] || "").trim().toUpperCase() === "I") : false;

      if (esInter) continue;
      if (!MAPEO_ECIS[chk]) continue;
      if (setFiltro && !setFiltro[gVal] && !setFiltro[pVal]) continue;

      var pidClean = formatearPIDParaECIS(pVal, gVal);
      var infoMapeo = MAPEO_ECIS[chk];
      var fechaVal = colFechaEnRuta !== -1 ? row[colFechaEnRuta] : null;
      var fechaEvento = formatearFechaECIS_GAS(fechaVal);

      // En DHL ECIS: Si es OK, se captura Signatory (quien recibió). Si es excepción (BA, NH, CA, RD), DEBE IR VACÍO.
      var signName = "";
      if (chk === "OK") {
        var comentVal = colComentarios !== -1 ? String(row[colComentarios] || "").trim() : "";
        var destVal = colDest !== -1 ? String(row[colDest] || "").trim() : "";
        var rawSign = (comentVal && comentVal.length > 1) ? comentVal : destVal;
        signName = depurarSignatoryECIS(rawSign) || "CLIENTE";
      }

      var filaCsv = [
        chk,
        infoMapeo.tyCd,
        pidClean,
        "QRO",
        "QRO",
        "A",
        "QRX2",
        fechaEvento,
        "",
        "1",
        signName,
        "Arauto Express",
        "",
        infoMapeo.rcd
      ].join(",");

      lineasCsv.push(filaCsv);
      totalEventos++;
    }

    var csvContenido = lineasCsv.join("\r\n");
    var timestampStr = Utilities.formatDate(new Date(), "America/Mexico_City", "ddMMyyyy_HHmm");
    var nombreArchivo = timestampStr + " OK BA NH CA RD.csv";

    try {
      var carpetas = DriveApp.getFoldersByName("QRO CAPTURA MASIVA");
      if (carpetas.hasNext()) {
        var folder = carpetas.next();
        folder.createFile(nombreArchivo, csvContenido, MimeType.CSV);
      }
    } catch(eDrive) {
      Logger.log("Nota: Guardar en carpeta Drive: " + eDrive.toString());
    }

    return {
      exito: true,
      nombreArchivo: nombreArchivo,
      totalRegistros: totalEventos,
      csvString: csvContenido,
      mensaje: "Corte generado exitosamente con " + totalEventos + " eventos para ECIS."
    };

  } catch(err) {
    return {
      exito: false,
      error: "Error al generar corte ECIS: " + err.toString()
    };
  }
}

/**
 * 📦 OBTENER REZAGOS E INCIDENCIAS (Fase 3 - Segmentación Sierra vs Metrópoli)
 * Extrae paquetes de Ruta (BD CENTRAL 2023) que no fueron entregados (no OK).
 * Si el usuario/rol es Daniel (Sierra Gorda), aísla estrictamente a los 6 Pochtecas de Sierra Gorda
 * y excluye completamente a choferes metropolitanos (Edgar, Fernando).
 */
function obtenerRezagosEIncidencias(paramUser, paramRole) {
  try {
    var userEmail = String(paramUser || "xichudaniel@gmail.com").trim().toLowerCase();
    var role = String(paramRole || "daniel").trim().toLowerCase();

    var esSuper = (role === "todos" || role === "tlayacanqui" || role === "sidharta" || role === "irvin" ||
                   userEmail === "sidharta.santiago@arauto.express" || userEmail === "irvin.reyes@arauto.express");
    var esSierra = (role === "daniel" || role === "sierra" || userEmail === "xichudaniel@gmail.com") && !esSuper;

    // Catálogo estricto de Sierra Gorda
    var pochtecasSierraMap = {
      "fmsanluispaq@gmail.com": { nombre: "Gregorio Adonai Sánchez", zona: "San Luis de la Paz" },
      "fmpaqueteriatvsm@gmail.com": { nombre: "Lyonnet Ramírez", zona: "Jalpan / San José Iturbide" },
      "yesigonzg1827@gmail.com": { nombre: "Maria Rosi", zona: "Pinal de Amoles" },
      "xichudaniel@gmail.com": { nombre: "Daniel Juárez", zona: "Xichú / Sierra Gorda" },
      "victor18amadorm@gmail.com": { nombre: "Víctor Amador (Comodín)", zona: "Comodín Sierra / Doctor Mora" },
      "diegovv21mar@gmail.com": { nombre: "Diego Rivera", zona: "Tierra Blanca" }
    };

    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);

    // Cargar catálogo de choferes metropolitanos si existe
    var couriersMap = {};
    try {
      var hojaCourier = ssCentral.getSheetByName("COURIER");
      if (hojaCourier) {
        var datosC = hojaCourier.getDataRange().getValues();
        for (var c = 1; c < datosC.length; c++) {
          var emailC = String(datosC[c][3] || "").trim().toLowerCase();
          var nombreC = String(datosC[c][1] || "").trim();
          var telC = String(datosC[c][4] || "").trim();
          if (emailC) {
            couriersMap[emailC] = { nombre: nombreC || emailC, telefono: telC };
          }
        }
      }
    } catch(eC) {}

    var hojaRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
    if (!hojaRuta) throw new Error("No se encontró la pestaña 'Ruta' en BD CENTRAL 2023.");

    var datosRuta = hojaRuta.getDataRange().getValues();
    if (datosRuta.length <= 1) {
      return {
        exito: true, total: 0, incidencias: 0, pendientes: 0, retornosDhl: 0,
        kpis: {
          total: 0, incidencias: 0, pendientes: 0, retornosDhl: 0, reintentos: 0,
          sierra: { total: 0, incidencias: 0, pendientes: 0, retornosDhl: 0, reintentos: 0 },
          metropoli: { total: 0, incidencias: 0, pendientes: 0, retornosDhl: 0, reintentos: 0 }
        },
        rezagos: []
      };
    }

    var cabeceras = datosRuta[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });
    var colGuia = cabeceras.indexOf("guia") !== -1 ? cabeceras.indexOf("guia") : cabeceras.indexOf("guía");
    var colPid = cabeceras.indexOf("pid");
    var colCp = cabeceras.indexOf("c.p.") !== -1 ? cabeceras.indexOf("c.p.") : cabeceras.indexOf("cp");
    var colPiezas = cabeceras.indexOf("piezas");
    var colDest = cabeceras.indexOf("receiver name");
    var colChk = cabeceras.indexOf("checkpoint");
    var colComentarios = cabeceras.indexOf("quien recibio o comentarios") !== -1 ? cabeceras.indexOf("quien recibio o comentarios") : cabeceras.indexOf("comentarios");
    var colFechaAsig = cabeceras.indexOf("fecha asignacion");
    var colCorreo = cabeceras.indexOf("id correo");
    var colInter = cabeceras.indexOf("inter");
    var colServicio = cabeceras.indexOf("tipo de servicio");

    var rezagos = [];
    var conteoIncidencias = 0;
    var conteoPendientes = 0;
    var conteoRetornos = 0;
    var kpis = {
      total: 0, incidencias: 0, pendientes: 0, retornosDhl: 0, reintentos: 0,
      sierra: { total: 0, incidencias: 0, pendientes: 0, retornosDhl: 0, reintentos: 0 },
      metropoli: { total: 0, incidencias: 0, pendientes: 0, retornosDhl: 0, reintentos: 0 }
    };

    for (var r = 1; r < datosRuta.length; r++) {
      var row = datosRuta[r];
      var chk = colChk !== -1 ? String(row[colChk] || "").trim().toUpperCase() : "";
      
      // Si ya está entregado (OK / FD / ENTREGADO), NO es rezago
      if (chk === "OK" || chk === "FD" || chk === "ENTREGADO") {
        continue;
      }

      var correoChofer = colCorreo !== -1 ? String(row[colCorreo] || "").trim().toLowerCase() : "";
      var cpVal = colCp !== -1 ? String(row[colCp] || "").trim() : "";
      var servVal = colServicio !== -1 ? String(row[colServicio] || "").trim().toLowerCase() : "";

      var esChoferSierra = pochtecasSierraMap[correoChofer] !== undefined;
      var esCpSierra = (servVal.indexOf("sierra") !== -1) || 
                       ["37900","37901","37902","37903","37904","37905","37906","37907","37980","37917","37920","37930","37970","76340","76343","76344","76345","76346"].indexOf(cpVal) !== -1;
      var esHuerfana = (!correoChofer || correoChofer === "sin_asignar" || correoChofer === "sin_asignar@arauto.express" || correoChofer === "s/a");
      var esHuerfanaSierra = esCpSierra && esHuerfana;

      // Filtro territorial: si el usuario es Daniel Juárez (Poka-Yoke)
      if (esSierra) {
        if (correoChofer === "edgar.rodriguez.arauto@gmail.com" || correoChofer === "fernando.maestro.1991@gmail.com") {
          continue;
        }
        if (!esChoferSierra && !esHuerfanaSierra) {
          continue;
        }
      }

      var equipoItem = (esChoferSierra || esCpSierra) ? "SIERRA" : "METROPOLI";

      var hwb = colGuia !== -1 ? String(row[colGuia] || "").trim() : "";
      var pidVal = colPid !== -1 ? String(row[colPid] || "").trim() : "";
      var piezasVal = colPiezas !== -1 ? (parseInt(row[colPiezas]) || 1) : 1;
      var destinatario = colDest !== -1 ? String(row[colDest] || "").trim() : "";
      var comentarios = colComentarios !== -1 ? String(row[colComentarios] || "").trim() : "";
      var fechaAsig = colFechaAsig !== -1 ? String(row[colFechaAsig] || "").trim() : "";
      var interVal = colInter !== -1 ? String(row[colInter] || "").trim().toUpperCase() : "";
      var esInternacional = (interVal === "I" || interVal.indexOf("INTER") !== -1);

      // Calcular reintentos y radar escalonado por antigüedad
      var reintentos = 1;
      var matchReint = comentarios.match(/\[REINTENTO D\+(\d+)\]/i);
      if (matchReint) {
        reintentos = parseInt(matchReint[1], 10) + 1;
      }

      // Cálculo de antigüedad exacta contra fecha actual
      var diasAntiguedad = 1;
      if (fechaAsig) {
        try {
          var pPartes = fechaAsig.split(/[-/]/);
          if (pPartes.length === 3) {
            var anioF = parseInt(pPartes[0].length === 4 ? pPartes[0] : pPartes[2], 10);
            var mesF = parseInt(pPartes[1], 10) - 1;
            var diaF = parseInt(pPartes[0].length === 4 ? pPartes[2] : pPartes[0], 10);
            var fechaD = new Date(anioF, mesF, diaF);
            var diffMs = (new Date()).getTime() - fechaD.getTime();
            diasAntiguedad = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          }
        } catch(eAnt) {}
      }
      var diasEfectivos = Math.max(diasAntiguedad, reintentos);

      var nivelAlerta = "AMARILLO_1D";
      var alertaTexto = "🟡 Preventivo D+1";
      if (diasEfectivos >= 3) {
        nivelAlerta = "ROJO_3D";
        alertaTexto = "🔴 Crítico D+3+ (Retorno DHL)";
      } else if (diasEfectivos === 2) {
        nivelAlerta = "NARANJA_2D";
        alertaTexto = "🟠 Alerta D+2 (Contactar)";
      }

      var tipoRezago = "PENDIENTE";
      if (chk === "NH" || chk === "BA" || chk === "CA" || chk === "RD") {
        tipoRezago = "INCIDENCIA";
        conteoIncidencias++;
        kpis.incidencias++;
        if (equipoItem === "SIERRA") kpis.sierra.incidencias++; else kpis.metropoli.incidencias++;
      } else if (chk === "RETORNO_DHL" || chk === "RT") {
        tipoRezago = "RETORNO_DHL";
        conteoRetornos++;
        kpis.retornosDhl++;
        if (equipoItem === "SIERRA") kpis.sierra.retornosDhl++; else kpis.metropoli.retornosDhl++;
      } else {
        conteoPendientes++;
        kpis.pendientes++;
        if (equipoItem === "SIERRA") kpis.sierra.pendientes++; else kpis.metropoli.pendientes++;
      }

      kpis.total++;
      if (equipoItem === "SIERRA") kpis.sierra.total++; else kpis.metropoli.total++;

      if (reintentos > 1) {
        kpis.reintentos++;
        if (equipoItem === "SIERRA") kpis.sierra.reintentos++; else kpis.metropoli.reintentos++;
      }

      var nombreChofer = esHuerfana ? "⚠️ Sin Asignar" : (pochtecasSierraMap[correoChofer] ? pochtecasSierraMap[correoChofer].nombre : (couriersMap[correoChofer] ? couriersMap[correoChofer].nombre : correoChofer));
      var zonaChofer = pochtecasSierraMap[correoChofer] ? pochtecasSierraMap[correoChofer].zona : (equipoItem === "SIERRA" ? "Sierra Gorda" : "Querétaro Metrópoli");

      rezagos.push({
        guia: hwb,
        pid: pidVal,
        cp: cpVal,
        piezas: piezasVal,
        destinatario: destinatario,
        chofer: correoChofer,
        choferNombre: nombreChofer,
        zona: zonaChofer,
        equipo: equipoItem,
        corredor: equipoItem,
        checkpoint: chk || "PRE_ASIGNADO",
        tipoRezago: tipoRezago,
        comentarios: comentarios,
        fechaAsignacion: fechaAsig,
        reintentos: reintentos,
        diasAntiguedad: diasEfectivos,
        nivelAlerta: nivelAlerta,
        alertaTexto: alertaTexto,
        esInternacional: esInternacional,
        rowNumber: r + 1
      });
    }

    return {
      exito: true,
      total: rezagos.length,
      incidencias: conteoIncidencias,
      pendientes: conteoPendientes,
      retornosDhl: conteoRetornos,
      kpis: kpis,
      rezagos: rezagos
    };

  } catch(err) {
    return { exito: false, error: err.toString() };
  }
}

/**
 * 🔄 EJECUTAR ROLLOVER SIGUIENTE DÍA (REINTENTO D+1 O RETORNO DHL)
 * Actualiza en caliente BD CENTRAL 2023 (Ruta) con bloqueo atómico LockService.
 */
function ejecutarRolloverSiguienteDia(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch(eLock) {
    return { exito: false, error: "Servidor ocupado. Intenta nuevamente en unos segundos." };
  }

  try {
    if (!payload || !payload.guias || payload.guias.length === 0) {
      throw new Error("No se recibieron guías para procesar el rollover.");
    }

    var guiasMap = {};
    payload.guias.forEach(function(g) {
      guiasMap[String(g).trim()] = true;
    });

    var accion = payload.accion || "REINTENTO";
    var nuevaFecha = payload.nuevaFecha || Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM-dd");
    var nuevoChofer = payload.nuevoChofer || null;
    var motivoRetorno = payload.motivoRetorno || "Agotó intentos de entrega";
    var supervisor = payload.supervisor || "Daniel Juárez";

    var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
    var hojaRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
    if (!hojaRuta) throw new Error("No se encontró la pestaña 'Ruta' en BD CENTRAL 2023.");

    var datosRuta = hojaRuta.getDataRange().getValues();
    var cabeceras = datosRuta[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });
    var colGuia = cabeceras.indexOf("guia") !== -1 ? cabeceras.indexOf("guia") : cabeceras.indexOf("guía");
    var colChk = cabeceras.indexOf("checkpoint");
    var colComentarios = cabeceras.indexOf("quien recibio o comentarios") !== -1 ? cabeceras.indexOf("quien recibio o comentarios") : cabeceras.indexOf("comentarios");
    var colFechaAsig = cabeceras.indexOf("fecha asignacion");
    var colCorreo = cabeceras.indexOf("id correo");

    if (colGuia === -1 || colChk === -1) {
      throw new Error("Estructura de columnas inválida en hoja Ruta.");
    }

    var totalActualizados = 0;

    for (var r = 1; r < datosRuta.length; r++) {
      var hwb = String(datosRuta[r][colGuia] || "").trim();
      if (guiasMap[hwb]) {
        var filaNum = r + 1;
        var comentarioActual = colComentarios !== -1 ? String(datosRuta[r][colComentarios] || "").trim() : "";

        if (accion === "REINTENTO") {
          // Extraer número de reintento anterior si existe
          var reintNum = 1;
          var matchReint = comentarioActual.match(/\[REINTENTO D\+(\d+)\]/i);
          if (matchReint) {
            reintNum = parseInt(matchReint[1], 10) + 1;
          }
          var comentarioLimpio = comentarioActual.replace(/\s*\[REINTENTO D\+\d+\]/gi, "").trim();
          var nuevoComentario = (comentarioLimpio ? comentarioLimpio + " " : "") + "[REINTENTO D+" + reintNum + "] " + supervisor;

          hojaRuta.getRange(filaNum, colChk + 1).setValue("PRE_ASIGNADO");
          if (colComentarios !== -1) hojaRuta.getRange(filaNum, colComentarios + 1).setValue(nuevoComentario);
          if (colFechaAsig !== -1) hojaRuta.getRange(filaNum, colFechaAsig + 1).setValue(nuevaFecha);
          if (nuevoChofer && colCorreo !== -1) {
            hojaRuta.getRange(filaNum, colCorreo + 1).setValue(nuevoChofer);
          }
          totalActualizados++;

        } else if (accion === "RETORNO_DHL") {
          var nuevoComentarioRetorno = (comentarioActual ? comentarioActual + " | " : "") + "[RETORNO DHL: " + motivoRetorno + "] " + supervisor;
          hojaRuta.getRange(filaNum, colChk + 1).setValue("RETORNO_DHL");
          if (colComentarios !== -1) hojaRuta.getRange(filaNum, colComentarios + 1).setValue(nuevoComentarioRetorno);
          totalActualizados++;
        }
      }
    }

    SpreadsheetApp.flush();

    return {
      exito: true,
      mensaje: accion === "REINTENTO" 
        ? "Se programaron " + totalActualizados + " guías para reintento D+1 (" + nuevaFecha + ")."
        : "Se marcaron " + totalActualizados + " guías para Retorno a DHL.",
      totalProcesadas: totalActualizados
    };

  } catch(err) {
    return { exito: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ============================================================================
 * 🛡️ MESA DE AUDITORÍA Y VISTO BUENO OPERATIVO (IRVIN) - OLLIN v2026.10
 * Conecta VALIDACIÓN_QRO_2025 (Esquema Moderno 15 Col) con FACTURADOS_PROD_2026
 * ============================================================================
 */
/**
 * 🛡️ Motor Unificado de Auditoría y Visto Bueno Multi-Fuente (BD Central + Ollinqui PWA)
 * Ingesta simultáneamente de:
 * 1. BD CENTRAL 2023 (hoja Ruta) -> Operación rampa, calle y conciliaciones.
 * 2. VALIDACIÓN_QRO_2025 (hoja Validación) -> Evidencias de Ollinqui PWA / AppSheet.
 * Fusiona por HWB y PID, etiquetando el origen exacto de cada guía.
 */
function obtenerEntregasAuditoriaPWA() {
  try {
    var entregasMap = {};
    var listaFinal = [];
    var kpis = {
      total: 0,
      pendientes: 0,
      aprobados: 0,
      rechazados: 0,
      internacionales: 0,
      deCentral: 0,
      dePwa: 0,
      enlazadas: 0
    };

    // =========================================================================
    // FUENTE 1: BD CENTRAL 2023 (Hoja Ruta)
    // =========================================================================
    try {
      var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
      var shRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
      if (shRuta && shRuta.getLastRow() > 1) {
        var lastRutaRow = shRuta.getLastRow();
        var numRutaLeer = Math.min(lastRutaRow - 1, 600);
        var startRutaRow = lastRutaRow - numRutaLeer + 1;
        var datosRuta = shRuta.getRange(startRutaRow, 1, numRutaLeer, shRuta.getLastColumn()).getValues();
        var cabecerasRuta = shRuta.getRange(1, 1, 1, shRuta.getLastColumn()).getValues()[0].map(function(h) {
          return String(h).toLowerCase().trim().replace(/[\s_]+/g, " ");
        });

        var colGuiaR = cabecerasRuta.indexOf("guia");
        if (colGuiaR === -1) colGuiaR = cabecerasRuta.indexOf("guía");
        var colPidR = cabecerasRuta.indexOf("pid");
        var colCpR = cabecerasRuta.indexOf("cp");
        if (colCpR === -1) colCpR = cabecerasRuta.indexOf("c.p.");
        var colDestR = cabecerasRuta.indexOf("destinatario");
        if (colDestR === -1) colDestR = cabecerasRuta.indexOf("receiver name");
        var colChkR = cabecerasRuta.indexOf("checkpoint");
        var colComentR = cabecerasRuta.indexOf("quien recibio o comentarios");
        if (colComentR === -1) colComentR = cabecerasRuta.indexOf("comentarios");
        var colFechaR = cabecerasRuta.indexOf("fecha en ruta");
        if (colFechaR === -1) colFechaR = cabecerasRuta.indexOf("fecha asignacion");
        var colPochtecaR = cabecerasRuta.indexOf("id correo");
        if (colPochtecaR === -1) colPochtecaR = cabecerasRuta.indexOf("correo");
        var colInterR = cabecerasRuta.indexOf("inter");
        var colFotoR = cabecerasRuta.indexOf("imagen fachada");
        var colFirmaR = cabecerasRuta.indexOf("firma");

        for (var r = datosRuta.length - 1; r >= 0; r--) {
          var rowR = datosRuta[r];
          var gVal = colGuiaR !== -1 ? String(rowR[colGuiaR] || "").trim() : "";
          var pVal = colPidR !== -1 ? String(rowR[colPidR] || "").trim() : "";
          if (!gVal && !pVal) continue;

          var chkVal = colChkR !== -1 ? String(rowR[colChkR] || "PENDIENTE").trim().toUpperCase() : "PENDIENTE";
          var pochVal = colPochtecaR !== -1 ? String(rowR[colPochtecaR] || "").trim() : "";
          var destVal = colDestR !== -1 ? String(rowR[colDestR] || "").trim() : "";
          var comentVal = colComentR !== -1 ? String(rowR[colComentR] || "").trim() : "";
          var receptorDisplay = (comentVal && comentVal.length > 1) ? (destVal ? destVal + " (" + comentVal + ")" : comentVal) : destVal;

          var fRuta = colFechaR !== -1 ? rowR[colFechaR] : "";
          if (fRuta instanceof Date) {
            fRuta = Utilities.formatDate(fRuta, "America/Mexico_City", "dd/MM/yyyy HH:mm");
          } else {
            fRuta = String(fRuta || "");
          }

          var esInterR = false;
          if (colInterR !== -1) {
            var valInter = String(rowR[colInterR] || "").trim().toUpperCase();
            esInterR = (valInter === "INTER" || valInter === "I");
          }
          if (!esInterR) {
            esInterR = Boolean(pVal.indexOf("JJD01") === 0 || (gVal.length === 10 && (gVal.startsWith("1") || gVal.startsWith("9"))));
          }

          var fotoVal = colFotoR !== -1 ? String(rowR[colFotoR] || "").trim() : "";
          var firmaVal = colFirmaR !== -1 ? String(rowR[colFirmaR] || "").trim() : "";

          var itemR = {
            guia: gVal,
            pid: pVal || gVal,
            cp: colCpR !== -1 ? String(rowR[colCpR] || "").trim() : "",
            checkpoint: chkVal || "OK",
            receptor: receptorDisplay,
            firma: firmaVal,
            foto: fotoVal,
            audio: "",
            gps: "",
            pochteca: pochVal,
            fechaEntrega: fRuta,
            estatusAuditor: (chkVal === "OK") ? "PENDIENTE" : "PENDIENTE",
            motivoRechazo: "",
            auditorValidador: "",
            esInternacional: esInterR,
            origen: "BD_CENTRAL",
            origenLabel: "BD Central (Ruta)",
            origenIcon: "database"
          };

          var keyRef = gVal || pVal;
          entregasMap[keyRef] = itemR;
          if (gVal) entregasMap[gVal] = itemR;
          if (pVal) {
            entregasMap[pVal] = itemR;
            // Ley de la Doble J: Indexar versiones JD y JJD
            var pUp = pVal.toUpperCase();
            if (pUp.indexOf("JJD") === 0) entregasMap["JD" + pUp.substring(3)] = itemR;
            else if (pUp.indexOf("JD") === 0) entregasMap["J" + pUp] = itemR;
          }
          listaFinal.push(itemR);
          kpis.deCentral++;
        }
      }
    } catch(errCentral) {
      Logger.log("Aviso: No se pudo leer BD Central en auditoría: " + errCentral.message);
    }

    // =========================================================================
    // FUENTE 2: BD_APP_RUTA_2025 (Ollinqui App - GUIAS_ASIGNADAS y PIEZAS_PID)
    // =========================================================================
    try {
      var ID_BD_APP = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
      var ssApp = SpreadsheetApp.openById(ID_BD_APP);

      // 2.A: PIEZAS_PID (Mapeo de PIDs y evidencias a nivel pieza)
      var pidMapApp = {};
      var shPiezas = ssApp.getSheetByName("PIEZAS_PID");
      if (shPiezas && shPiezas.getLastRow() > 1) {
        var lastPiezasRow = shPiezas.getLastRow();
        var numPiezasLeer = Math.min(lastPiezasRow - 1, 350);
        var datosPiezas = shPiezas.getRange(lastPiezasRow - numPiezasLeer + 1, 1, numPiezasLeer, shPiezas.getLastColumn()).getValues();
        var cabPiezas = shPiezas.getRange(1, 1, 1, shPiezas.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
        var colPidP = cabPiezas.indexOf("pid") !== -1 ? cabPiezas.indexOf("pid") : cabPiezas.indexOf("piece_id");
        var colGuiaP = cabPiezas.indexOf("guia") !== -1 ? cabPiezas.indexOf("guia") : cabPiezas.indexOf("hwb");
        var colAudioP = cabPiezas.indexOf("audio_evidencia") !== -1 ? cabPiezas.indexOf("audio_evidencia") : cabPiezas.indexOf("audio");
        var colFotoP = cabPiezas.indexOf("foto_fachada") !== -1 ? cabPiezas.indexOf("foto_fachada") : cabPiezas.indexOf("foto_evidencia");
        var colFirmaP = cabPiezas.indexOf("firma_evidencia") !== -1 ? cabPiezas.indexOf("firma_evidencia") : cabPiezas.indexOf("firma");
        var colGpsP = cabPiezas.indexOf("check_in_gps") !== -1 ? cabPiezas.indexOf("check_in_gps") : cabPiezas.indexOf("gps");
        var colChoferP = cabPiezas.indexOf("chofer") !== -1 ? cabPiezas.indexOf("chofer") : cabPiezas.indexOf("pochteca");
        var colEstP = cabPiezas.indexOf("estatus_pid") !== -1 ? cabPiezas.indexOf("estatus_pid") : cabPiezas.indexOf("estatus");
        var colRcvrP = cabPiezas.indexOf("nombre_recibe") !== -1 ? cabPiezas.indexOf("nombre_recibe") : cabPiezas.indexOf("recibe");

        for (var p = 0; p < datosPiezas.length; p++) {
          var rowP = datosPiezas[p];
          var pidP = colPidP !== -1 ? String(rowP[colPidP] || "").trim() : "";
          var guiaP = colGuiaP !== -1 ? String(rowP[colGuiaP] || "").trim() : "";
          if (guiaP) {
            pidMapApp[guiaP] = {
              pid: pidP || guiaP,
              audio: colAudioP !== -1 && rowP[colAudioP] ? convertirRutaAppSheet(String(rowP[colAudioP]).trim(), "PIEZAS_PID") : "",
              foto: colFotoP !== -1 && rowP[colFotoP] ? convertirRutaAppSheet(String(rowP[colFotoP]).trim(), "PIEZAS_PID") : "",
              firma: colFirmaP !== -1 && rowP[colFirmaP] ? convertirRutaAppSheet(String(rowFirmaP = colFirmaP !== -1 ? rowP[colFirmaP] : "").trim(), "PIEZAS_PID") : "",
              gps: colGpsP !== -1 ? String(rowP[colGpsP] || "").trim() : "",
              chofer: colChoferP !== -1 ? String(rowP[colChoferP] || "").trim() : "",
              estatus: colEstP !== -1 ? String(rowP[colEstP] || "").trim().toUpperCase() : "OK",
              receptor: colRcvrP !== -1 ? String(rowP[colRcvrP] || "").trim() : ""
            };
            if (pidP) pidMapApp[pidP] = pidMapApp[guiaP];
          }
        }
      }

      // 2.B: GUIAS_ASIGNADAS (Entregas y estados de choferes en calle)
      var shGuias = ssApp.getSheetByName("GUIAS_ASIGNADAS");
      if (shGuias && shGuias.getLastRow() > 1) {
        var lastGuiasRow = shGuias.getLastRow();
        var numGuiasLeer = Math.min(lastGuiasRow - 1, 350);
        var datosGuias = shGuias.getRange(lastGuiasRow - numGuiasLeer + 1, 1, numGuiasLeer, shGuias.getLastColumn()).getValues();
        var cabGuias = shGuias.getRange(1, 1, 1, shGuias.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });
        var colGuiaG = cabGuias.indexOf("guia") !== -1 ? cabGuias.indexOf("guia") : cabGuias.indexOf("hwb");
        var colDestG = cabGuias.indexOf("destinatario");
        var colChoferG = cabGuias.indexOf("chofer");
        var colEstG = cabGuias.indexOf("estatus_guia") !== -1 ? cabGuias.indexOf("estatus_guia") : cabGuias.indexOf("estatus");
        var colAudioG = cabGuias.indexOf("audio_evidencia") !== -1 ? cabGuias.indexOf("audio_evidencia") : cabGuias.indexOf("audio");
        var colFotoG = cabGuias.indexOf("foto_fachada") !== -1 ? cabGuias.indexOf("foto_fachada") : (cabGuias.indexOf("imagen_fachada") !== -1 ? cabGuias.indexOf("imagen_fachada") : cabGuias.indexOf("foto"));
        var colComentG = cabGuias.indexOf("comentarios");

        for (var g = datosGuias.length - 1; g >= 0; g--) {
          var rowG = datosGuias[g];
          var gValApp = colGuiaG !== -1 ? String(rowG[colGuiaG] || "").trim() : "";
          if (!gValApp) continue;

          var destG = colDestG !== -1 ? String(rowG[colDestG] || "").trim() : "";
          var choferG = colChoferG !== -1 ? String(rowG[colChoferG] || "").trim() : "";
          var estG = colEstG !== -1 ? String(rowG[colEstG] || "").trim().toUpperCase() : "PENDIENTE";
          var comentG = colComentG !== -1 ? String(rowG[colComentG] || "").trim() : "";
          var audioG = colAudioG !== -1 && rowG[colAudioG] ? convertirRutaAppSheet(String(rowG[colAudioG]).trim(), "GUIAS_ASIGNADAS") : "";
          var fotoG = colFotoG !== -1 && rowG[colFotoG] ? convertirRutaAppSheet(String(rowG[colFotoG]).trim(), "GUIAS_ASIGNADAS") : "";

          // Cruzar con datos de PIEZAS_PID si existen
          var piezaInfo = pidMapApp[gValApp] || null;
          var pidApp = piezaInfo ? piezaInfo.pid : gValApp;
          if (!audioG && piezaInfo && piezaInfo.audio) audioG = piezaInfo.audio;
          if (!fotoG && piezaInfo && piezaInfo.foto) fotoG = piezaInfo.foto;
          var firmaG = (piezaInfo && piezaInfo.firma) ? piezaInfo.firma : "";
          var gpsG = (piezaInfo && piezaInfo.gps) ? piezaInfo.gps : "";

          var matchExistente = entregasMap[gValApp] || (pidApp ? entregasMap[pidApp] : null);

          if (matchExistente) {
            // ENRIQUECER ITEM EXISTENTE (BD Central)
            matchExistente.origen = "HIBRIDO";
            matchExistente.origenLabel = "Enlazado (Ruta + App)";
            matchExistente.origenIcon = "zap";
            if (audioG && !matchExistente.audio) matchExistente.audio = audioG;
            if (fotoG && !matchExistente.foto) matchExistente.foto = fotoG;
            if (firmaG && !matchExistente.firma) matchExistente.firma = firmaG;
            if (gpsG && !matchExistente.gps) matchExistente.gps = gpsG;
            if (!matchExistente.pochteca && choferG) matchExistente.pochteca = choferG;
            if (!matchExistente.receptor && destG) matchExistente.receptor = destG;
            if (comentG && (!matchExistente.receptor || !matchExistente.receptor.includes(comentG))) {
              matchExistente.receptor = matchExistente.receptor ? matchExistente.receptor + " (" + comentG + ")" : comentG;
            }
            kpis.enlazadas++;
          } else {
            // NUEVO DESDE BD_APP_RUTA_2025
            var esInterApp = Boolean(pidApp.indexOf("JJD01") === 0 || (gValApp.length === 10 && (gValApp.startsWith("1") || gValApp.startsWith("9"))));
            var itemApp = {
              guia: gValApp,
              pid: pidApp,
              cp: "",
              checkpoint: (estG === "ENTREGADO" || estG === "OK" || estG === "FD") ? "OK" : (estG || "PENDIENTE"),
              receptor: comentG ? (destG ? destG + " (" + comentG + ")" : comentG) : destG,
              firma: firmaG,
              foto: fotoG,
              audio: audioG,
              gps: gpsG,
              pochteca: choferG,
              fechaEntrega: "",
              estatusAuditor: "PENDIENTE",
              motivoRechazo: "",
              auditorValidador: "",
              esInternacional: esInterApp,
              origen: "BD_APP",
              origenLabel: "Ollinqui App (BD_APP_RUTA_2025)",
              origenIcon: "smartphone"
            };

            entregasMap[gValApp] = itemApp;
            if (pidApp) entregasMap[pidApp] = itemApp;
            listaFinal.unshift(itemApp);
            kpis.deApp++;
          }
        }
      }
    } catch(errApp) {
      Logger.log("Aviso: No se pudo leer BD App en auditoría: " + errApp.message);
    }

    // =========================================================================
    // FUENTE 3: VALIDACIÓN_QRO_2025 (Ollinqui PWA / AppSheet)
    // =========================================================================
    try {
      var idVal = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M";
      var ssVal = SpreadsheetApp.openById(idVal);
      var shVal = ssVal.getSheetByName("Validación") || ssVal.getSheetByName("VALIDACIÓN_QRO_2025") || ssVal.getSheets()[0];
      if (shVal && shVal.getLastRow() > 1) {
        var lastValRow = shVal.getLastRow();
        var numValLeer = Math.min(lastValRow - 1, 400);
        var startValRow = lastValRow - numValLeer + 1;
        var datosVal = shVal.getRange(startValRow, 1, numValLeer, Math.min(shVal.getLastColumn(), 25)).getValues();

        for (var v = datosVal.length - 1; v >= 0; v--) {
          var rowV = datosVal[v];
          var gValPwa = String(rowV[0] || "").trim();
          var pValPwa = String(rowV[1] || "").trim();
          if (!gValPwa && !pValPwa) continue;

          // Buscar si ya existe en la lista desde BD Central o BD App
          var matchExistente = entregasMap[gValPwa] || entregasMap[pValPwa];
          if (!matchExistente && pValPwa) {
            var pUp2 = pValPwa.toUpperCase();
            if (pUp2.indexOf("JJD") === 0) matchExistente = entregasMap["JD" + pUp2.substring(3)];
            else if (pUp2.indexOf("JD") === 0) matchExistente = entregasMap["J" + pUp2];
          }

          var estadoAudPwa = String(rowV[11] || "PENDIENTE").trim().toUpperCase();
          if (!estadoAudPwa) estadoAudPwa = "PENDIENTE";

          var fEntrPwa = rowV[10];
          if (fEntrPwa instanceof Date) {
            fEntrPwa = Utilities.formatDate(fEntrPwa, "America/Mexico_City", "dd/MM/yyyy HH:mm");
          } else {
            fEntrPwa = String(fEntrPwa || "");
          }

          var firmaPwa = String(rowV[5] || "").trim();
          var fotoPwa = String(rowV[6] || "").trim();
          var audioPwa = String(rowV[7] || "").trim();
          var gpsPwa = String(rowV[8] || "").trim();
          var rechazoPwa = String(rowV[12] || "").trim();
          var auditorPwa = String(rowV[13] || "").trim();

          if (matchExistente) {
            // MATCH HÍBRIDO: Existe en múltiples frentes
            matchExistente.origen = "HIBRIDO";
            matchExistente.origenLabel = "Enlazado Multi-Frente";
            matchExistente.origenIcon = "zap";
            if (fotoPwa) matchExistente.foto = fotoPwa;
            if (firmaPwa) matchExistente.firma = firmaPwa;
            if (audioPwa) matchExistente.audio = audioPwa;
            if (gpsPwa) matchExistente.gps = gpsPwa;
            if (estadoAudPwa) matchExistente.estatusAuditor = estadoAudPwa;
            if (rechazoPwa) matchExistente.motivoRechazo = rechazoPwa;
            if (auditorPwa) matchExistente.auditorValidador = auditorPwa;
            if (fEntrPwa && !matchExistente.fechaEntrega) matchExistente.fechaEntrega = fEntrPwa;
            kpis.enlazadas++;
          } else {
            // SOLO EN PWA
            var esInterPwa = Boolean(pValPwa.indexOf("JJD01") === 0 || (gValPwa.length === 10 && (gValPwa.startsWith("1") || gValPwa.startsWith("9"))));
            var itemPwa = {
              guia: gValPwa,
              pid: pValPwa || gValPwa,
              cp: String(rowV[2] || "").trim(),
              checkpoint: String(rowV[3] || "OK").trim().toUpperCase(),
              receptor: String(rowV[4] || "").trim(),
              firma: firmaPwa,
              foto: fotoPwa,
              audio: audioPwa,
              gps: gpsPwa,
              pochteca: String(rowV[9] || "").trim(),
              fechaEntrega: fEntrPwa,
              estatusAuditor: estadoAudPwa,
              motivoRechazo: rechazoPwa,
              auditorValidador: auditorPwa,
              esInternacional: esInterPwa,
              origen: "PWA_VALIDACION",
              origenLabel: "Ollinqui PWA (Validación)",
              origenIcon: "shield-check"
            };

            entregasMap[gValPwa] = itemPwa;
            if (pValPwa) entregasMap[pValPwa] = itemPwa;
            listaFinal.unshift(itemPwa); // Más recientes arriba
            kpis.dePwa++;
          }
        }
      }
    } catch(errPwa) {
      Logger.log("Aviso: No se pudo leer Validación PWA: " + errPwa.message);
    }

    // =========================================================================
    // CALCULAR KPIS CONSOLIDADOS
    // =========================================================================
    kpis.total = listaFinal.length;
    for (var i = 0; i < listaFinal.length; i++) {
      var it = listaFinal[i];
      if (it.esInternacional) kpis.internacionales++;
      if (it.estatusAuditor === "APROBADO" || it.estatusAuditor === "TRUE") {
        kpis.aprobados++;
      } else if (it.estatusAuditor === "RECHAZADO") {
        kpis.rechazados++;
      } else {
        kpis.pendientes++;
      }
    }

    return {
      exito: true,
      entregas: listaFinal,
      kpis: kpis,
      timestamp: Utilities.formatDate(new Date(), "America/Mexico_City", "HH:mm:ss")
    };

  } catch(e) {
    Logger.log("Error en obtenerEntregasAuditoriaPWA unificado: " + e.message);
    return {
      exito: false,
      error: e.message,
      entregas: [],
      kpis: { total: 0, pendientes: 0, aprobados: 0, rechazados: 0, internacionales: 0, deCentral: 0, dePwa: 0, enlazadas: 0 }
    };
  }
}

/**
 * 🔒 Visto Bueno y Aprobación en Lote (Inyección a Bóveda FACTURADOS_PROD_2026)
 */
function aprobarLoteAuditoria(pidsList, auditorEmail) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) {
      return { exito: false, error: "Servidor ocupado. Intenta de nuevo en unos segundos." };
    }

    if (!pidsList || !Array.isArray(pidsList) || pidsList.length === 0) {
      throw new Error("No se seleccionó ningún PID para aprobar.");
    }

    var auditor = String(auditorEmail || "irvin.auditor@arauto.express").trim();
    var idVal = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M";
    var ssVal = SpreadsheetApp.openById(idVal);
    var shVal = ssVal.getSheetByName("Validación") || ssVal.getSheetByName("VALIDACIÓN_QRO_2025") || ssVal.getSheets()[0];

    var idBoveda = ID_BOVEDA_BATCH_MAESTRO;
    var ssBoveda = SpreadsheetApp.openById(idBoveda);
    var shFact = ssBoveda.getSheetByName("FACTURADOS_PROD_2026");
    if (!shFact) throw new Error("No se encontró la pestaña 'FACTURADOS_PROD_2026' en BOVEDA_BATCH_MAESTRO.");

    var targetPids = {};
    pidsList.forEach(function(p) { targetPids[String(p).trim().toUpperCase()] = true; });

    var dataVal = shVal.getDataRange().getValues();
    var filasFacturar = [];
    var now = new Date();
    var nowStr = Utilities.formatDate(now, "America/Mexico_City", "dd/MM/yyyy HH:mm:ss");

    // Calcular semana del año
    var d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    var semanaFolio = "Semana " + weekNo + " (" + now.getFullYear() + ")";

    for (var r = 1; r < dataVal.length; r++) {
      var pidRow = String(dataVal[r][1] || "").trim().toUpperCase();
      if (targetPids[pidRow]) {
        // 1. Actualizar VALIDACIÓN_QRO_2025
        shVal.getRange(r + 1, 12).setValue("APROBADO"); // Col L: Aprobacion_Auditor
        shVal.getRange(r + 1, 14).setValue(auditor);   // Col N: Auditor_Validador
        shVal.getRange(r + 1, 15).setValue(now);       // Col O: Marca_Tiempo

        // 2. Preparar fila para FACTURADOS_PROD_2026 (Sanitizar PID a JD)
        var pidBoveda = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(pidRow) : pidRow;
        var idFact = "FAC_" + Utilities.getUuid().substring(0, 8).toUpperCase();
        var fEntrega = dataVal[r][10];
        if (fEntrega instanceof Date) {
          fEntrega = Utilities.formatDate(fEntrega, "America/Mexico_City", "dd/MM/yyyy HH:mm");
        } else {
          fEntrega = String(fEntrega || "");
        }

        filasFacturar.push([
          idFact,                                      // 0: ID_Facturacion
          String(dataVal[r][0] || "").trim(),          // 1: Guia
          pidBoveda,                                   // 2: PID (JD)
          String(dataVal[r][2] || "").trim(),          // 3: CP
          String(dataVal[r][9] || "").trim(),          // 4: Pochteca
          String(dataVal[r][3] || "OK").trim().toUpperCase(), // 5: Checkpoint
          String(dataVal[r][4] || "").trim(),          // 6: Receptor
          String(dataVal[r][5] || "").trim(),          // 7: Firma
          String(dataVal[r][6] || "").trim(),          // 8: Foto_Fachada
          String(dataVal[r][7] || "").trim(),          // 9: Audio_Evidencia
          String(dataVal[r][8] || "").trim(),          // 10: GPS
          fEntrega,                                    // 11: Fecha_Entrega
          auditor,                                     // 12: Auditor_Aprobador
          nowStr,                                      // 13: Fecha_Aprobacion
          semanaFolio,                                 // 14: Semana_Factura
          38.50,                                       // 15: Tarifa_Base
          0,                                           // 16: Tarifa_Excedente
          38.50,                                       // 17: Gran_Total
          "LISTO_PARA_PAGO",                           // 18: Estatus_Pago
          now                                          // 19: Marca_Tiempo_Cierre
        ]);
      }
    }

    // Fallback: Si hay PIDs seleccionados que venían de BD Central (hoja Ruta) y no de shVal
    var pidsPendientes = {};
    for (var tp in targetPids) {
      var found = false;
      for (var f = 0; f < filasFacturar.length; f++) {
        if (filasFacturar[f][1] === tp || filasFacturar[f][2] === tp || ("J" + filasFacturar[f][2]) === tp) {
          found = true;
          break;
        }
      }
      if (!found) pidsPendientes[tp] = true;
    }

    if (Object.keys(pidsPendientes).length > 0) {
      try {
        var ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_2023);
        var shRuta = ssCentral.getSheetByName("Ruta") || ssCentral.getSheetByName("RUTA");
        if (shRuta && shRuta.getLastRow() > 1) {
          var dRuta = shRuta.getDataRange().getValues();
          var cabR = dRuta[0].map(function(h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });
          var colGR = cabR.indexOf("guia") !== -1 ? cabR.indexOf("guia") : cabR.indexOf("guía");
          var colPR = cabR.indexOf("pid");
          var colCpR = cabR.indexOf("cp");
          var colPochR = cabR.indexOf("id correo");
          var colDestR = cabR.indexOf("destinatario");
          var colChkR = cabR.indexOf("checkpoint");
          var colFechaR = cabR.indexOf("fecha en ruta") !== -1 ? cabR.indexOf("fecha en ruta") : cabR.indexOf("fecha asignacion");

          for (var r2 = 1; r2 < dRuta.length; r2++) {
            var gValR = colGR !== -1 ? String(dRuta[r2][colGR] || "").trim().toUpperCase() : "";
            var pValR = colPR !== -1 ? String(dRuta[r2][colPR] || "").trim().toUpperCase() : "";
            if (pidsPendientes[gValR] || pidsPendientes[pValR]) {
              var pidBovedaR = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(pValR || gValR) : (pValR || gValR);
              var idFactR = "FAC_" + Utilities.getUuid().substring(0, 8).toUpperCase();
              var fEntrR = colFechaR !== -1 ? dRuta[r2][colFechaR] : "";
              if (fEntrR instanceof Date) {
                fEntrR = Utilities.formatDate(fEntrR, "America/Mexico_City", "dd/MM/yyyy HH:mm");
              } else {
                fEntrR = String(fEntrR || "");
              }

              filasFacturar.push([
                idFactR,
                gValR,
                pidBovedaR,
                colCpR !== -1 ? String(dRuta[r2][colCpR] || "").trim() : "",
                colPochR !== -1 ? String(dRuta[r2][colPochR] || "").trim() : "",
                colChkR !== -1 ? String(dRuta[r2][colChkR] || "OK").trim().toUpperCase() : "OK",
                colDestR !== -1 ? String(dRuta[r2][colDestR] || "").trim() : "",
                "", // Firma
                "", // Foto
                "", // Audio
                "", // GPS
                fEntrR,
                auditor,
                nowStr,
                semanaFolio,
                38.50,
                0,
                38.50,
                "LISTO_PARA_PAGO",
                now
              ]);
              delete pidsPendientes[gValR];
              delete pidsPendientes[pValR];
            }
          }
        }
      } catch(eRutaFact) {
        Logger.log("Error recuperando de Ruta para facturar: " + eRutaFact.message);
      }
    }

    // Fallback 2: Si aún hay PIDs seleccionados que venían de BD_APP_RUTA_2025 (GUIAS_ASIGNADAS)
    if (Object.keys(pidsPendientes).length > 0) {
      try {
        var ID_BD_APP = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w";
        var ssApp = SpreadsheetApp.openById(ID_BD_APP);
        var shGuiasApp = ssApp.getSheetByName("GUIAS_ASIGNADAS");
        if (shGuiasApp && shGuiasApp.getLastRow() > 1) {
          var dApp = shGuiasApp.getDataRange().getValues();
          var cabA = dApp[0].map(function(h) { return String(h).toLowerCase().trim(); });
          var colGA = cabA.indexOf("guia") !== -1 ? cabA.indexOf("guia") : cabA.indexOf("hwb");
          var colDestA = cabA.indexOf("destinatario");
          var colChoferA = cabA.indexOf("chofer");
          var colChkA = cabA.indexOf("estatus_guia") !== -1 ? cabA.indexOf("estatus_guia") : cabA.indexOf("estatus");
          var colFotoA = cabA.indexOf("foto_fachada") !== -1 ? cabA.indexOf("foto_fachada") : cabA.indexOf("imagen_fachada");
          var colAudioA = cabA.indexOf("audio_evidencia") !== -1 ? cabA.indexOf("audio_evidencia") : cabA.indexOf("audio");

          for (var r3 = 1; r3 < dApp.length; r3++) {
            var gValA = colGA !== -1 ? String(dApp[r3][colGA] || "").trim().toUpperCase() : "";
            if (pidsPendientes[gValA]) {
              var pidBovedaA = (typeof sanitizarPIDParaBoveda === "function") ? sanitizarPIDParaBoveda(gValA) : gValA;
              var idFactA = "FAC_" + Utilities.getUuid().substring(0, 8).toUpperCase();
              var fotoUrlA = colFotoA !== -1 && dApp[r3][colFotoA] ? convertirRutaAppSheet(String(dApp[r3][colFotoA]).trim(), "GUIAS_ASIGNADAS") : "";
              var audioUrlA = colAudioA !== -1 && dApp[r3][colAudioA] ? convertirRutaAppSheet(String(dApp[r3][colAudioA]).trim(), "GUIAS_ASIGNADAS") : "";

              filasFacturar.push([
                idFactA,
                gValA,
                pidBovedaA,
                "", // CP
                colChoferA !== -1 ? String(dApp[r3][colChoferA] || "").trim() : "",
                colChkA !== -1 ? String(dApp[r3][colChkA] || "OK").trim().toUpperCase() : "OK",
                colDestA !== -1 ? String(dApp[r3][colDestA] || "").trim() : "",
                "", // Firma
                fotoUrlA,
                audioUrlA,
                "", // GPS
                nowStr,
                auditor,
                nowStr,
                semanaFolio,
                38.50,
                0,
                38.50,
                "LISTO_PARA_PAGO",
                now
              ]);
              delete pidsPendientes[gValA];
            }
          }
        }
      } catch(eAppFact) {
        Logger.log("Error recuperando de BD App para facturar: " + eAppFact.message);
      }
    }

    if (filasFacturar.length > 0) {
      // 🛡️ Filtro estricto anti-duplicados contra FACTURADOS_PROD_2026
      var pidsYGuiasExistentes = {};
      if (shFact.getLastRow() > 1) {
        var numFilasFact = shFact.getLastRow() - 1;
        var numFilasLeer = Math.min(numFilasFact, 3000);
        var startR = Math.max(2, shFact.getLastRow() - numFilasLeer + 1);
        var dataExistente = shFact.getRange(startR, 2, numFilasLeer, 2).getValues(); // Col B (Guia) y Col C (PID)
        for (var ex = 0; ex < dataExistente.length; ex++) {
          var gEx = String(dataExistente[ex][0] || "").trim().toUpperCase();
          var pEx = String(dataExistente[ex][1] || "").trim().toUpperCase();
          if (gEx) pidsYGuiasExistentes[gEx] = true;
          if (pEx) pidsYGuiasExistentes[pEx] = true;
        }
      }

      var filasSinDuplicados = [];
      for (var fIdx = 0; fIdx < filasFacturar.length; fIdx++) {
        var filaF = filasFacturar[fIdx];
        var gF = String(filaF[1] || "").trim().toUpperCase();
        var pF = String(filaF[2] || "").trim().toUpperCase();
        if ((gF && pidsYGuiasExistentes[gF]) || (pF && pidsYGuiasExistentes[pF])) {
          Logger.log("Aviso Anti-Duplicado: La guía " + gF + " / PID " + pF + " ya existe en FACTURADOS_PROD_2026. Omitiendo reinserción.");
          continue;
        }
        filasSinDuplicados.push(filaF);
        if (gF) pidsYGuiasExistentes[gF] = true;
        if (pF) pidsYGuiasExistentes[pF] = true;
      }

      if (filasSinDuplicados.length > 0) {
        var lastRowFact = shFact.getLastRow();
        shFact.getRange(lastRowFact + 1, 1, filasSinDuplicados.length, filasSinDuplicados[0].length).setValues(filasSinDuplicados);
      }
    }

    SpreadsheetApp.flush();

    return {
      exito: true,
      aprobadas: (typeof filasSinDuplicados !== 'undefined' ? filasSinDuplicados.length : filasFacturar.length),
      mensaje: "Se aprobaron e inyectaron " + (typeof filasSinDuplicados !== 'undefined' ? filasSinDuplicados.length : filasFacturar.length) + " entregas a Bóveda FACTURADOS_PROD_2026."
    };

  } catch(e) {
    Logger.log("Error en aprobarLoteAuditoria: " + e.message);
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ❌ Rechazo de Entrega en Auditoría
 */
function rechazarEntregaAuditoria(pid, motivo, auditorEmail) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) {
      return { exito: false, error: "Servidor ocupado. Intenta de nuevo en unos segundos." };
    }

    var cleanPid = String(pid || "").trim().toUpperCase();
    if (!cleanPid) throw new Error("PID no válido.");

    var auditor = String(auditorEmail || "irvin.auditor@arauto.express").trim();
    var idVal = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M";
    var ssVal = SpreadsheetApp.openById(idVal);
    var shVal = ssVal.getSheetByName("Validación") || ssVal.getSheetByName("VALIDACIÓN_QRO_2025") || ssVal.getSheets()[0];

    var dataVal = shVal.getDataRange().getValues();
    var encontrado = false;

    for (var r = 1; r < dataVal.length; r++) {
      var pidRow = String(dataVal[r][1] || "").trim().toUpperCase();
      if (pidRow === cleanPid) {
        shVal.getRange(r + 1, 12).setValue("RECHAZADO"); // Col L: Aprobacion_Auditor
        shVal.getRange(r + 1, 13).setValue(String(motivo || "Rechazado por auditor")); // Col M: Motivo_Rechazo
        shVal.getRange(r + 1, 14).setValue(auditor);    // Col N: Auditor_Validador
        shVal.getRange(r + 1, 15).setValue(new Date()); // Col O: Marca_Tiempo
        encontrado = true;
        break;
      }
    }

    if (!encontrado) {
      throw new Error("No se localizó el PID " + cleanPid + " en Validación.");
    }

    SpreadsheetApp.flush();

    return {
      exito: true,
      mensaje: "Entrega " + cleanPid + " marcada como RECHAZADA."
    };

  } catch(e) {
    Logger.log("Error en rechazarEntregaAuditoria: " + e.message);
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}
