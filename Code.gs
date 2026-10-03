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
  "yesigonzg1827@gmail.com",
  "jesusivargonzalez@gmail.com",
  "oscher1016@gmail.com"
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
    .setTitle('OLLIN - Centro de Mando Operativo Megapulpo (v83.0 PROD)')
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
      "fmsanluispaq@gmail.com": { nombre: "Gregorio González", zona: "San Luis de la Paz", tel: "+524681395455" },
      "fmpaqueteriatvsm@gmail.com": { nombre: "Lyonnet", zona: "Jalpan de Serra", tel: "+524411158571" },
      "yesigonzg1827@gmail.com": { nombre: "Maria Rosi", zona: "Pinal de Amoles", tel: "+524411077704" },
      "xichudaniel@gmail.com": { nombre: "Daniel Juárez", zona: "Xichú / Sierra", tel: "+524191005625" },
      "victor18amadorm@gmail.com": { nombre: "Víctor Amador", zona: "Doctor Mora", tel: "+524191266463" },
      "diegovv21mar@gmail.com": { nombre: "Diego Rivera", zona: "San José Iturbide", tel: "+524191002361" },
      "jesusivargonzalez@gmail.com": { nombre: "Jesús Ivar", zona: "Sierra Gorda", tel: "+524411234567" },
      "oscher1016@gmail.com": { nombre: "Oscher", zona: "Sierra Gorda", tel: "+524191002030" }
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

            if (esSierraCP) {
              if (!municipiosSet[munM]) {
                municipiosSet[munM] = { nombre: munM, cps: [], countGuias: 0 };
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
    var kpis = { total: 0, ok: 0, pendientes: 0, internacionales: 0, huerfanas: 0 };
    var pochtecasStats = {};

    // Inicializar stats de todos los pochtecas del grupo Daniel
    emailsGrupoDaniel.forEach(function(em) {
      var pConf = pochtecasSierraMap[em];
      pochtecasStats[em] = {
        email: em,
        nombre: pConf.nombre,
        zona: pConf.zona,
        telefono: pConf.tel,
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
    });

    for (var r = 1; r < datosRuta.length; r++) {
      var row = datosRuta[r];
      var correoChofer = colCorreo !== -1 ? String(row[colCorreo] || "").trim().toLowerCase() : "";
      var cpVal = colCp !== -1 ? String(row[colCp] || "").trim() : "";
      var servicioVal = colServicio !== -1 ? String(row[colServicio] || "").trim() : "";

      var cpInfo = cpInfoMap[cpVal] || {};
      var esSierraCP = cpInfo.esSierra || (servicioVal && servicioVal.toLowerCase().indexOf("sierra") !== -1);
      var esHuerfanaSierra = esSierraCP && (!correoChofer || correoChofer === "sin_asignar" || correoChofer === "sin_asignar@arauto.express" || correoChofer === "s/a");
      var esDelGrupoDaniel = pochtecasSierraMap[correoChofer] !== undefined;

      // Inclusión estricta de los 360 paquetes de Sierra Gorda (Grupo Daniel + Guías Huérfanas de la zona)
      if (!esDelGrupoDaniel && !esHuerfanaSierra) {
        continue;
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
      var municipio = cpInfo.municipio || (servicioVal.indexOf("Sierra Gorda") !== -1 ? servicioVal.replace("Sierra Gorda - ", "") : "Sierra Gorda");

      // Bandera Internacional
      var esInter = (interVal === "INTER" || interVal === "SI" || interVal === "1" || interVal === "TRUE" || 
                     servicioVal.toUpperCase().indexOf("INTER") !== -1 || pidVal.toUpperCase().indexOf("[INTER]") !== -1);

      // Normalizar Estatus (solo marcar OK si efectivamente fue entregado en campo)
      var estatusNormalizado = "PENDIENTE";
      if (chkVal === "OK" || chkVal === "ENTREGADO" || chkVal === "FD") {
        estatusNormalizado = "OK";
        kpis.ok++;
      } else if (chkVal === "NH" || chkVal === "BA" || chkVal === "INCIDENCIA" || chkVal === "RECHAZADO") {
        estatusNormalizado = "INCIDENCIA";
        kpis.pendientes++;
      } else {
        estatusNormalizado = "PENDIENTE";
        kpis.pendientes++;
      }

      kpis.total++;
      if (esInter) {
        kpis.internacionales++;
      }

      // Nombre del chofer
      var nombreChofer = esHuerfanaSierra ? "⚠️ Sin Asignar" : (pochtecasSierraMap[correoChofer] ? pochtecasSierraMap[correoChofer].nombre : (couriersMap[correoChofer] ? couriersMap[correoChofer].nombre : correoChofer));

      if (esHuerfanaSierra) {
        kpis.huerfanas++;
        guiasHuerfanas.push({
          guia: hwb,
          pid: pidVal,
          destinatario: destinatario,
          cp: cpVal || "S/CP",
          municipio: municipio,
          piezas: piezasVal,
          esInternacional: esInter,
          fila: r + 1
        });
      } else if (pochtecasStats[correoChofer]) {
        pochtecasStats[correoChofer].total++;
        if (estatusNormalizado === "OK") pochtecasStats[correoChofer].ok++;
        else if (estatusNormalizado === "INCIDENCIA") pochtecasStats[correoChofer].incidencias++;
        else pochtecasStats[correoChofer].pendientes++;
        if (esInter) pochtecasStats[correoChofer].internacionales++;
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
        rowNumber: r + 1
      });
    }

    // 6. Centinela de Telemetría: Cálculo de Alertas en Vivo (Umbrales Sierra: 45 min)
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
          mensaje: "Sin inicio de sesión en Ollinqui PWA tras las 08:30 hrs (" + st.total + " guías asignadas)."
        });
      }

      // Alerta B: Tiempos Prolongados entre Entregas (>45 min Sierra)
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
        if (minutosSinAvance >= 45) {
          st.semaforo = "ROJO";
          alertasActivas.push({
            tipo: "INACTIVIDAD_PROLONGADA",
            nivel: "CRITICO",
            pochteca: st.nombre,
            email: st.email,
            telefono: st.telefono,
            zona: st.zona,
            minutos: minutosSinAvance,
            mensaje: minutosSinAvance + " min sin registrar entregas en " + st.zona + " (Umbral Sierra: 45 min)."
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
        cps: municipiosSet[mNom].cps
      });
    }
    municipiosLista.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });

    // Armar lista de pochtecas para selectores
    var pochtecasLista = [];
    for (var pKey in pochtecasStats) {
      pochtecasLista.push(pochtecasStats[pKey]);
    }
    pochtecasLista.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });

    // Lista de CPs de Sierra Gorda para selector
    var cpsSierraLista = [];
    for (var cpK in cpInfoMap) {
      if (cpInfoMap[cpK].esSierra) {
        cpsSierraLista.push({
          cp: cpK,
          municipio: cpInfoMap[cpK].municipio,
          titular: cpInfoMap[cpK].titular,
          override: cpInfoMap[cpK].overrideActivo,
          expiracion: cpInfoMap[cpK].fechaExpiracion
        });
      }
    }
    cpsSierraLista.sort(function(a, b) { return a.cp.localeCompare(b.cp); });

    return {
      exito: true,
      kpis: kpis,
      guias: guiasList,
      guiasHuerfanas: guiasHuerfanas,
      pochtecas: pochtecasLista,
      alertas: alertasActivas,
      municipios: municipiosLista,
      codigosPostales: cpsSierraLista,
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
      "diegovv21mar@gmail.com": true,
      "jesusivargonzalez@gmail.com": true,
      "oscher1016@gmail.com": true
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
    var ssApp = SpreadsheetApp.openById(ID_BD_APP);
    var hojaGuias = ssApp.getSheetByName("GUIAS_ASIGNADAS");
    if (!hojaGuias) throw new Error("No se encontró GUIAS_ASIGNADAS en BD_APP_RUTA_2025");
    
    var datos = hojaGuias.getDataRange().getValues();
    if (datos.length <= 1) return { exito: true, datos: [] };
    
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
    
    var resultados = [];
    // Leer los registros más recientes primero
    for (var i = datos.length - 1; i >= 1; i--) {
      var row = datos[i];
      var guia = colGuia !== -1 ? String(row[colGuia]).trim() : "";
      var audio = colAudio !== -1 ? String(row[colAudio]).trim() : "";
      var foto = colFoto !== -1 ? String(row[colFoto]).trim() : "";
      var estatus = colEstatus !== -1 ? String(row[colEstatus]).trim() : "";
      var comentarios = colComentarios !== -1 ? String(row[colComentarios]).trim() : "";
      var chofer = colChofer !== -1 ? String(row[colChofer]).trim() : "";
      var dest = colDest !== -1 ? String(row[colDest]).trim() : "";
      
      // Filtrar registros que contengan audio de voz, foto o incidencias de campo
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
      if (resultados.length >= 100) break; // Limitar a las últimas 100 auditorías
    }
    
    return { exito: true, datos: resultados };
  } catch(err) {
    return { exito: false, error: err.toString() };
  }
}

/**
 * 🧹 SANITIZADOR DIRECTO (v81.2 PROD): Normaliza PIEZAS_PID en BD_APP_RUTA_2025
 * Asegura que todo paquete permanezca en SIN_CARGAR y PRE_ASIGNADO a la espera de escaneo físico.
 * Puede ejecutarse con 1 clic desde el menú desplegable de Apps Script.
 */
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
      "fmsanluispaq@gmail.com": { nombre: "Gregorio González", zona: "San Luis de la Paz", esSierra: true, tel: "+524681395455" },
      "fmpaqueteriatvsm@gmail.com": { nombre: "Lyonnet", zona: "Jalpan de Serra", esSierra: true, tel: "+524411158571" },
      "yesigonzg1827@gmail.com": { nombre: "Maria Rosi", zona: "Pinal de Amoles", esSierra: true, tel: "+524411077704" },
      "xichudaniel@gmail.com": { nombre: "Daniel Juárez", zona: "Xichú / Sierra", esSierra: true, tel: "+524191005625" },
      "victor18amadorm@gmail.com": { nombre: "Víctor Amador", zona: "Doctor Mora", esSierra: true, tel: "+524191266463" },
      "diegovv21mar@gmail.com": { nombre: "Diego Rivera", zona: "San José Iturbide", esSierra: true, tel: "+524191002361" },
      "jesusivargonzalez@gmail.com": { nombre: "Jesús Ivar", zona: "Sierra Gorda", esSierra: true, tel: "+524411234567" },
      "oscher1016@gmail.com": { nombre: "Oscher", zona: "Sierra Gorda", esSierra: true, tel: "+524191002030" },
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


