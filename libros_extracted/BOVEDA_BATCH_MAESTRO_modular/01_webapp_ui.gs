function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.valorUma2026 = CONFIG_FACTURACION_2026.valorUma;
  template.topeReclamoUma2026 = CONFIG_FACTURACION_2026.topeReclamoUma;
  return template.evaluate()
    .setTitle('OLLIN - Control Remoto de Rampa')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, shrink-to-fit=no');
}

// ==========================================
// 🛡️ 2. ACCIONES DEL BACKEND ACCESIBLES DESDE LA WEB APP (Endpoints)
// ==========================================

/**
 * Ejecuta la ingesta desde Gmail (descarga de reportes Excel y rescate de teléfonos)
 */

function ejecutarIngestaDesdeWeb() {
  try {
    var resultado = procesarReportesDesdeEtiqueta02();
    if (resultado && resultado.exito === false) {
      return resultado; // Retorna directamente el mensaje amigable de "sin correos"
    }
   
    var guias = (resultado && resultado.guias !== undefined) ? resultado.guias : 0;
    var bultos = (resultado && resultado.bultos !== undefined) ? resultado.bultos : 0;
    var tels = (resultado && resultado.telefonos !== undefined) ? resultado.telefonos : 0;
   
    return {
      exito: true,
      mensaje: "✅ Ingesta de Gmail completada de forma exitosa. Se inyectaron *" + guias + "* guías y *" + bultos + "* bultos en la Bóveda y BD Central, con *" + tels + "* teléfonos en memoria."
    };
  } catch (err) {
    return {
      exito: false,
      mensaje: "❌ Error en la Ingesta de Gmail: " + err.message
    };
  }
}

/**
 * Ejecuta el cruzamiento del BATCH y regenera la mesa de asignación
 */

function ejecutarMesaDesdeWeb() {
  try {
    generarMesaAsignacion();
    return {
      exito: true,
      mensaje: "✅ ¡Mesa de Asignación generada con éxito! Los datos de RAW_SHIPMENT han sido cruzados con la MATRIZ_CP."
    };
  } catch (err) {
    return {
      exito: false,
      mensaje: "❌ Error al generar la Mesa: " + err.message
    };
  }
}

/**
 * Ejecuta el despacho masivo a los celulares de los Pochtecas
 */

function ejecutarDespachoDesdeWeb() {
  try {
    enviarCelularesYCentral();
    return {
      exito: true,
      mensaje: "🚀 ¡Despacho finalizado con éxito! Guías inyectadas a AppSheet, RUTA central alimentada y autolavado completado."
    };
  } catch (err) {
    return {
      exito: false,
      mensaje: "❌ Error en el despacho: " + err.message
    };
  }
}

// ==========================================
// 📥 3. MOTOR DE INGESTA DESDE GMAIL (SheetJS In-Memory - Sin dependencias de Google Drive/GCP)
// ==========================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Sistema OLLIN')
      .addItem('1. Cruzar BATCH y Generar Mesa Asignación', 'generarMesaAsignacion')
      .addItem('2. Enviar a Celulares (AppSheet y RUTA Central)', 'enviarCelularesYCentral')
      .addToUi();
}

// ==========================================
// 🛠️ FUNCIÓN 1: GENERAR MESA ASIGNACIÓN (CRUCE EN CALIENTE)
// ==========================================
