/**
 * 📊 RESUMEN DIARIO RUTA LEN (León) — Consola de la Tríada
 * Lee la hoja "Ruta LEN" de LEN BD CENTRAL 2023, agrupa los registros FD por usuario y día,
 * y envía el consolidado por correo a los supervisores de León.
 * Solo lectura sobre la hoja: no reordena columnas (esquema rígido).
 *
 * Destinatarios: Script Property LEN_SUPERVISORES_EMAILS (separados por coma).
 * Si no existe, se usa el fallback institucional.
 */
var ID_LEN_BD_CENTRAL = "1Qu9q7LCBIY5PcWYqKwroIRX9b57NCOwmvbP-cQJ_hGQ";
var HOJA_RUTA_LEN = "Ruta LEN";
var LEN_SUPERVISORES_FALLBACK = "irvin.reyes@arauto.express";

function enviarResumenDiarioRutaLEN() {
  try {
    var ss = SpreadsheetApp.openById(ID_LEN_BD_CENTRAL);
    var hoja = ss.getSheetByName(HOJA_RUTA_LEN);
    if (!hoja) return { exito: false, mensaje: "No existe la hoja '" + HOJA_RUTA_LEN + "'." };

    var datos = hoja.getDataRange().getDisplayValues();
    if (datos.length < 2) return { exito: false, mensaje: "La hoja Ruta LEN no tiene registros." };

    var resumen = resumirFDPorUsuarioYDia_(datos);
    if (resumen.totalFD === 0) return { exito: false, mensaje: "No hay registros FD en Ruta LEN." };

    var destinatarios = obtenerDestinatariosLEN_();
    var asunto = "[Arauto Express] Resumen Ruta LEN — FD por usuario y día (" +
      Utilities.formatDate(new Date(), "America/Mexico_City", "dd/MM/yyyy") + ")";
    MailApp.sendEmail({
      to: destinatarios,
      subject: asunto,
      htmlBody: construirHtmlResumenLEN_(resumen),
      body: construirTextoResumenLEN_(resumen)
    });

    var wa = enviarResumenLENPorWhatsApp_(resumen);
    return {
      exito: true,
      mensaje: resumen.totalFD + " FD en " + resumen.dias.length + " día(s) enviados por correo a " +
        destinatarios + " | WhatsApp: " + wa
    };
  } catch (err) {
    Logger.log("[Resumen LEN] " + err.toString());
    return { exito: false, mensaje: "Error: " + err.message };
  }
}

var LEN_SUPERVISORES_DEFAULT = "sidharta.santiago@arauto.express,irvin.reyes@arauto.express";

/** Autoconfigura LEN_SUPERVISORES_EMAILS si aún no existe. */
function asegurarPropiedadSupervisoresLEN_() {
  var props = PropertiesService.getScriptProperties();
  var actual = props.getProperty("LEN_SUPERVISORES_EMAILS");
  if (!actual) {
    props.setProperty("LEN_SUPERVISORES_EMAILS", LEN_SUPERVISORES_DEFAULT);
    actual = LEN_SUPERVISORES_DEFAULT;
  }
  return actual;
}

var LEN_WA_GATEWAY_DEFAULT = "http://100.69.207.81:3001/send-message";
var LEN_WA_GRUPO_DEFAULT = "Delivery plus - Arauto Express";

/**
 * Envía el resumen al gateway Calpixqui (POST /send-message {to, message}).
 * Propiedades opcionales: LEN_WA_GATEWAY_URL, LEN_WA_GRUPO_ID (chatId xxx@g.us).
 * Nunca lanza error: el correo ya salió y el fallo de WhatsApp solo se reporta.
 */
function enviarResumenLENPorWhatsApp_(resumen) {
  try {
    var props = PropertiesService.getScriptProperties();
    var url = props.getProperty("LEN_WA_GATEWAY_URL") || LEN_WA_GATEWAY_DEFAULT;
    var grupo = props.getProperty("LEN_WA_GRUPO_ID") || LEN_WA_GRUPO_DEFAULT;
    var resp = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ to: grupo, message: construirMensajeWhatsAppLEN_(resumen) }),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    return code >= 200 && code < 300 ? "enviado" : "fallo HTTP " + code;
  } catch (err) {
    Logger.log("[Resumen LEN] WhatsApp: " + err.toString());
    return "no alcanzable (" + err.message + ")";
  }
}

function construirMensajeWhatsAppLEN_(resumen) {
  var t = "🏛️ *RESUMEN RUTA LEN — FD por usuario y día*\n• *Total FD:* " + resumen.totalFD + "\n";
  resumen.dias.forEach(function (d) {
    t += "\n📅 *" + d.dia + "*\n";
    d.usuarios.forEach(function (u) {
      t += "• " + u.usuario + ": " + u.guias + " guías / " + u.piezas + " pzas\n";
    });
  });
  return t + "\n🛡️ _Calpixqui | Arauto Express_";
}

function obtenerDestinatariosLEN_() {
  var prop = asegurarPropiedadSupervisoresLEN_();
  var lista = String(prop || LEN_SUPERVISORES_FALLBACK).split(",")
    .map(function (e) { return e.trim().toLowerCase(); })
    .filter(function (e) { return /@arauto\.express$/.test(e); });
  if (lista.length === 0) lista = [LEN_SUPERVISORES_FALLBACK];
  return lista.join(",");
}

function idxEncabezadoLEN_(cabeceras, nombres, porDefecto) {
  for (var i = 0; i < nombres.length; i++) {
    var p = cabeceras.indexOf(nombres[i]);
    if (p !== -1) return p;
  }
  return porDefecto;
}

/** Normaliza dd/MM/yyyy o yyyy-MM-dd (con hora opcional) a yyyy-MM-dd. */
function fechaDiaLEN_(txt) {
  var s = String(txt || "").trim();
  var m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (m) return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0].substring(0, 10) : "";
}

function resumirFDPorUsuarioYDia_(datos) {
  var cab = datos[0].map(function (h) { return String(h).toLowerCase().trim().replace(/[\s_]+/g, " "); });
  var iChk = idxEncabezadoLEN_(cab, ["checkpoint"], 9);
  var iFecha = idxEncabezadoLEN_(cab, ["fecha en ruta", "fecha asignación", "fecha asignacion"], 12);
  var iFechaAlt = idxEncabezadoLEN_(cab, ["fecha asignación", "fecha asignacion"], 11);
  var iUsuario = idxEncabezadoLEN_(cab, ["id correo"], 14); // Columna O (idx 14) del esquema rígido
  var iPiezas = idxEncabezadoLEN_(cab, ["piezas"], 3);

  var porDia = {};
  var totalFD = 0;
  for (var r = 1; r < datos.length; r++) {
    var fila = datos[r];
    if (String(fila[iChk] || "").trim().toUpperCase() !== "FD") continue;
    var dia = fechaDiaLEN_(fila[iFecha]) || fechaDiaLEN_(fila[iFechaAlt]) || "SIN FECHA";
    var usuario = String(fila[iUsuario] || "").trim().toLowerCase() || "(sin usuario)";
    var piezas = parseInt(fila[iPiezas], 10);
    if (isNaN(piezas) || piezas < 1) piezas = 1;

    if (!porDia[dia]) porDia[dia] = {};
    if (!porDia[dia][usuario]) porDia[dia][usuario] = { guias: 0, piezas: 0 };
    porDia[dia][usuario].guias++;
    porDia[dia][usuario].piezas += piezas;
    totalFD++;
  }

  var dias = Object.keys(porDia).sort().map(function (d) {
    var usuarios = Object.keys(porDia[d]).sort().map(function (u) {
      return { usuario: u, guias: porDia[d][u].guias, piezas: porDia[d][u].piezas };
    });
    return { dia: d, usuarios: usuarios };
  });
  return { totalFD: totalFD, dias: dias };
}

function escHtmlLEN_(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function construirHtmlResumenLEN_(resumen) {
  var h = "<h3>Resumen Ruta LEN — FD por usuario y día</h3><p>Total FD: <b>" + resumen.totalFD + "</b></p>";
  resumen.dias.forEach(function (d) {
    h += "<h4>" + escHtmlLEN_(d.dia) + "</h4><table border='1' cellpadding='4' cellspacing='0' style='border-collapse:collapse'>" +
      "<tr><th>Usuario</th><th>Guías FD</th><th>Piezas</th></tr>";
    d.usuarios.forEach(function (u) {
      h += "<tr><td>" + escHtmlLEN_(u.usuario) + "</td><td align='right'>" + u.guias + "</td><td align='right'>" + u.piezas + "</td></tr>";
    });
    h += "</table>";
  });
  return h;
}

function construirTextoResumenLEN_(resumen) {
  var t = "Resumen Ruta LEN — FD por usuario y día\nTotal FD: " + resumen.totalFD + "\n";
  resumen.dias.forEach(function (d) {
    t += "\n" + d.dia + "\n";
    d.usuarios.forEach(function (u) {
      t += "  " + u.usuario + ": " + u.guias + " guías / " + u.piezas + " piezas\n";
    });
  });
  return t;
}
