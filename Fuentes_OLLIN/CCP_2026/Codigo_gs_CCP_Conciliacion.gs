/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CONSOLA_CONCILIACION_Y_CCP_2026 — Motor CCP CFDI 4.0           ║
 * ║     Ecosistema OLLIN / Arauto Express — Buzón Inteligente DHL          ║
 * ║     v1.0.0 PROD — Tlayacanqui: Sidharta Santiago Garduño              ║
 * ║     Desarrollado por: Antigravity (Google DeepMind) — Sep 2026        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * PROPÓSITO:
 * Desbloquear el flujo de capital retenido por clientes corporativos (DHL)
 * mediante la generación masiva de Complementos de Recepción de Pagos (CCP).
 * Aísla la gestión contable de la Bóveda operativa (Ollinqui/BD_APP_RUTA_2025)
 * y funciona como un Buzón Inteligente en Google Drive que construye la carga
 * masiva en el formato exacto de 'CargarCFDI.csv' para Facturo Por Ti.
 *
 * ARQUITECTURA:
 * ┌─ CONSOLA_CONCILIACION_Y_CCP_2026 (este libro)
 * │  ├─ TABLERO          → KPIs de cartera retenida vs. CCPs timbrados
 * │  ├─ CONCILIADOR      → Matriz de captura y match de depósitos
 * │  ├─ DETALLE_DOCUMENTOS → Desglose 1-a-Muchos de folios pagados
 * │  ├─ EXPORTADOR_FACTURO_POR_TI → CSV listo para carga masiva
 * │  └─ CUENTAS_POR_PAGAR_FASE2 → Gestión futura de proveedores
 * │
 * └─ Drive: g:/OLLIN_FINANZAS/BUZON_CCP/
 *    ├─ 01_COMPROBANTES_BANCO (recibos BBVA/SPEI)
 *    ├─ 02_PAYMENT_ADVICE    (avisos DHL)
 *    └─ 03_CARGAS_GENERADAS  (CSVs producidos)
 */

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 1: CONSTANTES DE INFRAESTRUCTURA — OLLIN ECOSYSTEM
// ═══════════════════════════════════════════════════════════════════════════

/** ID oficial de la hoja 'Control de Folios' en Drive */
const ID_OFICIAL_CONTROL_FOLIOS = "1vhG5Sv6yCkrok35FnKXwZq0hppUdmXydhHUA5pi1rX8";

/** ID de la hoja 'Control de Folios' (libro raíz de Arauto Express en Drive) */
const ID_CONTROL_FOLIOS = PropertiesService.getScriptProperties().getProperty("ID_CONTROL_FOLIOS") || ID_OFICIAL_CONTROL_FOLIOS;

/** RFC del emisor de Arauto Express para CCP */
const RFC_EMISOR = "DEM8801152E9";

/** RFC del receptor DHL México */
const RFC_RECEPTOR_DHL = "DHL020127CJ3";

/** Nombre de la hoja de Control de Folios con los UUIDs */
const PESTANA_CONTROL_FOLIOS = "Control de Folios";

/** Pestaña alternativa dentro del libro Control de Folios */
const PESTANA_FOLIOS_ALT = "Folios";

/** Nombre de las carpetas clave del Buzón en Drive */
const NOMBRE_CARPETA_BUZON_RAIZ = "BUZON_CCP";
const NOMBRE_CARPETA_BANCO = "01_COMPROBANTES_BANCO";
const NOMBRE_CARPETA_ADVICE = "02_PAYMENT_ADVICE";
const NOMBRE_CARPETA_CARGAS = "03_CARGAS_GENERADAS";

/** Carpeta raíz OLLIN_FINANZAS en Drive */
const NOMBRE_CARPETA_OLLIN_FINANZAS = "OLLIN_FINANZAS";

/** Configuración fiscal para CCP (Facturo Por Ti — CargarCFDI.csv) */
const CONFIG_FISCAL = {
  moneda: "MXN - Peso Mexicano",
  tipoCambio: 1,
  formaPago: "03", // Transferencia electrónica de fondos (SPEI)
  rfcBeneficiario: RFC_EMISOR,
  cuentaBeneficiario: "", // Llenar con cuenta CLABE de Arauto
  rfcOrdenante: RFC_RECEPTOR_DHL,
  objetoImpuesto: "02 - Sí objeto de impuesto.",
  tipoImpuesto: "2 - IVA",
  tipoFactor: "1 - Tasa",
  tasaIVA: 0.16,
  tipoTraslado: "1 - Trasladado"
};


// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 2: MENÚ PERSONALIZADO '🚀 OLLIN FINANZAS'
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Crea el menú personalizado al abrir el Google Sheet.
 * Se activa automáticamente con onOpen().
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 OLLIN FINANZAS')
    .addItem('⚡ Sincronizar Buzón Drive & Match', 'sincronizarBuzonYMatch')
    .addSeparator()
    .addItem('📥 Generar CargarCFDI.csv para Facturo Por Ti', 'generarCSVFacturoPorTi')
    .addSeparator()
    .addItem('🔒 Cerrar Folio CCP en Control de Folios', 'cerrarFolioCCPDialog')
    .addSeparator()
    .addItem('🛠️ Inicializar Hojas del Sistema', 'inicializarHojas')
    .addItem('📋 Ver Estado del Sistema', 'verEstadoSistema')
    .addToUi();
}


// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 3: INICIALIZACIÓN DE HOJAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inicializa las hojas del sistema con sus encabezados canónicos.
 * Ejecutar una única vez al configurar el sistema.
 */
function inicializarHojas() {
  return inicializarHojasFinanzas();
}

/**
 * Función canónica requerida por la arquitectura OLLIN FINANZAS
 */
function inicializarHojasFinanzas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ui = null;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    // Modo ejecución sin interfaz (API / CLI / Triggers)
  }

  try {
    _inicializarTABLERO(ss);
    _inicializarCONCILIADOR(ss);
    _inicializarDETALLE_DOCUMENTOS(ss);
    _inicializarEXPORTADOR(ss);
    _inicializarCUENTAS_POR_PAGAR(ss);

    // Si existe "Hoja 1" por defecto y hay otras hojas creadas, removerla
    const hoja1 = ss.getSheetByName("Hoja 1");
    if (hoja1 && ss.getSheets().length > 1) {
      try { ss.deleteSheet(hoja1); } catch (e) {}
    }

    // Garantizar persistencia de Script Property ID_CONTROL_FOLIOS
    try {
      PropertiesService.getScriptProperties().setProperty("ID_CONTROL_FOLIOS", ID_OFICIAL_CONTROL_FOLIOS);
      Logger.log("✅ Propiedad de Script ID_CONTROL_FOLIOS configurada: " + ID_OFICIAL_CONTROL_FOLIOS);
    } catch (eProp) {
      Logger.log("⚠️ No se pudo fijar Script Property directamente: " + eProp.message);
    }

    Logger.log('✅ Sistema Inicializado exitosamente.');

    if (ui) {
      ui.alert(
        '✅ Sistema Inicializado',
        'Todas las hojas de CONSOLA_CONCILIACION_Y_CCP_2026 han sido configuradas con sus esquemas canónicos.\n\n' +
        'Siguiente paso: Configura el ID_CONTROL_FOLIOS en Propiedades del Script.',
        ui.ButtonSet.OK
      );
    }
    return { status: "SUCCESS", message: "Hojas inicializadas correctamente" };
  } catch (err) {
    Logger.log('❌ Error de Inicialización: ' + err.toString());
    if (ui) {
      ui.alert('❌ Error de Inicialización', err.toString(), ui.ButtonSet.OK);
    }
    throw err;
  }
}


const DATOS_DEPOSITOS_2026 = [
  ["DEP-01", "02/01/2026", "12:00:00", "1500000200", 59336.90, "879, 880, 881", "CCP_EMITIDO", "CCP51", "HISTORICO_ENERO_CCP51", "3 facturas pagadas"],
  ["DEP-02", "02/01/2026", "12:00:00", "1500000201", 326656.00, "847, 848, 854..858, 863..868, 874..876", "CCP_EMITIDO", "CCP50", "HISTORICO_ENERO_CCP50", "16 facturas pagadas"],
  ["DEP-03", "19/01/2026", "12:00:00", "1500005683", 93945.50, "884, 885, 886, 887, 888", "CCP_EMITIDO", "CCP52", "HISTORICO_ENERO_CCP52", "5 facturas pagadas"],
  ["DEP-04", "26/01/2026", "12:00:00", "1500006943", 255452.30, "861, 862, 869..873, 889, 893, 894, 898..900", "CCP_EMITIDO", "CCP53", "HISTORICO_ENERO_CCP53", "13 facturas pagadas"],
  ["DEP-05", "16/02/2026", "12:00:00", "1500013866", 197226.10, "901, 902, 903, 904, 905, 906, 907, 908, 910", "CCP_EMITIDO", "CCP66", "4191F644-F6B8-4D2C-8838-8ECC8F59E115", "9 facturas pagadas"],
  ["DEP-06", "02/03/2026", "12:00:00", "1500017089", 79906.60, "917, 918, 919, 920", "CCP_EMITIDO", "CCP68", "928B5F61-905F-4C68-95FD-6731451455D1", "4 facturas pagadas"],
  ["DEP-07", "17/03/2026", "12:00:00", "1500020568", 131941.30, "923, 924, 925, 926, 927, 928", "CCP_EMITIDO", "CCP69", "E39E3B89-5E67-4319-883A-F75120E00E3B", "6 facturas pagadas"],
  ["DEP-08", "23/03/2026", "12:00:00", "1500021800", 75750.90, "938, 939, 936, 937", "CCP_EMITIDO", "CCP70", "E793C1ED-0E59-40F6-8D8F-AB0A98D9E40D", "4 facturas pagadas"],
  ["DEP-09", "01/04/2026", "12:00:00", "1500024169", 56541.30, "942, 943, 944", "CCP_EMITIDO", "CCP71", "E0EED8FA-77E7-4DF0-A683-A9AD1ED4DE4C", "3 facturas pagadas"],
  ["DEP-10", "13/04/2026", "12:00:00", "1500026094", 422039.90, "878, 877, 882, 883, 890..897, 911..922", "CCP_EMITIDO", "CCP72", "E08F3AA2-A89F-4B3F-9829-43E6875405FF", "22 facturas pagadas"],
  ["DEP-11", "04/05/2026", "12:00:00", "1500030979", 466581.00, "947, 949, 948, 951, 950, 955..959", "CCP_EMITIDO", "CCP73", "B315BA42-1684-41C6-B8E2-0EA179BCEC90", "24 facturas pagadas"],
  ["DEP-12", "11/05/2026", "12:00:00", "1500032661", 166761.60, "969, 968, 972, 973, 970, 964, 960..963", "CCP_EMITIDO", "CCP74", "902272B0-A280-477D-BD07-9E70D52C62A0", "9 facturas pagadas"],
  ["DEP-13", "18/05/2026", "12:00:00", "1500034908", 91170.20, "976, 977, 978, 974, 975", "CCP_EMITIDO", "CCP57", "6A3FCDE1-15F7-4567-AEDF-8236DF16888E", "5 facturas pagadas"],
  ["DEP-14", "01/06/2026", "12:00:00", "1500037802", 149927.10, "984, 985, 983, 987, 986, 979..982", "CCP_EMITIDO", "CCP58", "907E0AFC-17D1-4F51-AA2C-046B99731BEC", "9 facturas pagadas"],
  ["DEP-15", "15/06/2026", "12:00:00", "1500042041", 133498.60, "992, 993, 991, 994, 995, 988..990", "CCP_EMITIDO", "CCP59", "3DCFEB6F-188D-4ED2-9D87-C1DE4093C808", "8 facturas pagadas"],
  ["DEP-16", "22/06/2026", "12:00:00", "1500043465", 77038.50, "999, 998, 997, 996", "CCP_EMITIDO", "CCP60", "50B11C61-3982-4391-AA92-D8086207C97F", "4 facturas pagadas"],
  ["DEP-17", "01/07/2026", "12:00:00", "1500045908", 96941.20, "1003, 1002, 1004, 1000, 1001", "CCP_EMITIDO", "CCP61", "7A35CD42-3709-4E5D-848A-5D13CD0E86DA", "5 facturas pagadas"],
  ["DEP-18", "20/07/2026", "12:00:00", "1500050979", 138852.00, "1015, 1016, 1017, 1019, 1018, 1020, 1013, 1014", "CCP_EMITIDO", "CCP62", "C9669FB2-63E7-4716-9CB0-E25DA0968D19", "8 facturas pagadas"],
  ["DEP-19", "03/08/2026", "12:00:00", "1500053827", 269601.40, "1027, 1021, 1022, 1024, 1023, 1025, 1026, 1028..1034", "CCP_EMITIDO", "CCP63", "339EB420-32ED-4F3E-8F2F-F8D5F7E22C0D", "14 facturas pagadas"],
  ["DEP-20", "17/08/2026", "12:00:00", "1500057939", 154413.40, "1038, 1037, 1041, 1039, 1040, 1035, 1036", "CCP_EMITIDO", "CCP64", "55ACD74A-FB83-4758-95C7-06DA2387C032", "7 facturas pagadas"],
  ["DEP-21", "01/09/2026", "12:00:00", "1500060915", 181328.30, "1042, 1043, 1044, 1045, 1046, 1048, 1050, 1049, 1047", "CCP_EMITIDO", "CCP65", "4A55D309-723C-4B4B-9CE4-4125148D616E", "9 facturas pagadas"],
  ["DEP-22", "14/09/2026", "12:00:00", "1500064821", 164911.40, "1051, 1052, 1053, 1054", "CCP_EMITIDO", "CCP54", "4317FA96-0B61-4F20-8FE0-48CB058FF0F7", "4 facturas pagadas (Nota: CCP56 es duplicado a cancelar)"],
  ["DEP-23", "21/09/2026", "12:00:00", "1500066030", 28037.20, "1055", "CCP_EMITIDO", "CCP55", "1B3E45AE-02FB-4844-828B-7628833EF7C5", "1 factura pagada"],
  ["DEP-24", "01/10/2026", "14:34:40", "1500068054", 127553.60, "1056, 1057, 1058", "PENDIENTE", "", "", "3 facturas por timbrar (CargarCFDI_LOTE_24_LISTO.xlsx)"]
];

function _inicializarTABLERO(ss) {
  let hoja = ss.getSheetByName("TABLERO");
  if (!hoja) {
    hoja = ss.insertSheet("TABLERO");
  }
  hoja.clear();

  // 1. Título y Subtítulo
  hoja.getRange("A1:I1").merge().setValue("🏛️ CONSOLA DE CONCILIACIÓN Y CCP 2026 — ARAUTO EXPRESS")
    .setBackground("#1a237e").setFontColor("#ffffff").setFontWeight("bold").setFontSize(14)
    .setHorizontalAlignment("center");

  hoja.getRange("A2:I2").merge().setValue("Tablero Ejecutivo de Cobranza DHL Express vs. CCPs Timbrados ante el SAT")
    .setBackground("#283593").setFontColor("#e8eaf6").setHorizontalAlignment("center");

  // 2. Tarjetas de KPIs (Fila 4 Headers, Fila 5 Valores)
  const kpiHeaders = [
    ["💰 TOTAL DEPOSITADO", "📄 TOTAL FACTURAS", "✅ LOTES TIMBRADOS", "⏳ LOTES PENDIENTES", "💵 CARTERA PENDIENTE", "📊 % CUMPLIMIENTO"]
  ];
  hoja.getRange("A4:F4").setValues(kpiHeaders)
    .setBackground("#3949ab").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");

  const totalDep = 3945412.30;
  const totalTimbr = 3817858.70;
  const totalPend = 127553.60;
  const pct = totalTimbr / totalDep;

  const kpiValues = [
    [totalDep, 175, 23, 1, totalPend, pct]
  ];
  hoja.getRange("A5:F5").setValues(kpiValues)
    .setBackground("#e8eaf6").setFontWeight("bold").setFontSize(12).setHorizontalAlignment("center");

  hoja.getRange("A5").setNumberFormat("$#,##0.00");
  hoja.getRange("E5").setNumberFormat("$#,##0.00");
  hoja.getRange("F5").setNumberFormat("0.0%");

  // 3. Separador Histórico
  hoja.getRange("A7:I7").merge().setValue("📋 CONCILIACIÓN INTEGRAL DE LOS 24 LOTES DE COBRANZA DHL (2026)")
    .setBackground("#5c6bc0").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");

  // 4. Encabezados Tabla
  const histHeaders = [["ID Lote", "Fecha Depósito", "Monto $MXN", "Documento SAP", "Facturas Cubiertas", "Estatus Fiscal", "Folio CCP SAT", "UUID Fiscal SAT", "Notas Auditoría"]];
  hoja.getRange("A8:I8").setValues(histHeaders)
    .setBackground("#7986cb").setFontColor("#ffffff").setFontWeight("bold");

  // 5. Filas de datos desde DATOS_DEPOSITOS_2026
  const filasHist = DATOS_DEPOSITOS_2026.map(function(d) {
    return [d[0], d[1], d[4], d[3], d[5], (d[6] === "CCP_EMITIDO" ? "✅ TIMBRADO" : "⏳ PENDIENTE"), d[7], d[8], d[9]];
  });
  hoja.getRange(9, 1, filasHist.length, 9).setValues(filasHist);

  // Formato de tabla
  hoja.getRange(9, 3, filasHist.length, 1).setNumberFormat("$#,##0.00");
  hoja.setColumnWidth(1, 100);
  hoja.setColumnWidth(2, 120);
  hoja.setColumnWidth(3, 140);
  hoja.setColumnWidth(4, 130);
  hoja.setColumnWidth(5, 250);
  hoja.setColumnWidth(6, 130);
  hoja.setColumnWidth(7, 120);
  hoja.setColumnWidth(8, 280);
  hoja.setColumnWidth(9, 250);
  hoja.setFrozenRows(8);

  // Colorear estatus
  for (let i = 0; i < filasHist.length; i++) {
    const rIdx = 9 + i;
    const est = filasHist[i][5];
    if (est.indexOf("TIMBRADO") !== -1) {
      hoja.getRange(rIdx, 6).setBackground("#e8f5e9").setFontColor("#2e7d32").setFontWeight("bold");
    } else {
      hoja.getRange(rIdx, 6).setBackground("#fff9c4").setFontColor("#f57f17").setFontWeight("bold");
    }
  }
}

function _inicializarCONCILIADOR(ss) {
  let hoja = ss.getSheetByName("CONCILIADOR");
  if (!hoja) hoja = ss.insertSheet("CONCILIADOR");
  hoja.clear();

  const headers = [[
    "ID_Deposito", "Fecha_Banco", "Hora_Banco", "Documento_SAP_DHL",
    "Monto_Depositado", "Folios_DHL_Pagados", "Estatus_Conciliado",
    "Folio_CCP_Asignado", "UUID_CCP_Timbrado", "Notas_Conciliacion"
  ]];
  hoja.getRange("A1:J1").setValues(headers)
    .setBackground("#1b5e20").setFontColor("#ffffff").setFontWeight("bold");

  hoja.getRange(2, 1, DATOS_DEPOSITOS_2026.length, 10).setValues(DATOS_DEPOSITOS_2026);

  hoja.getRange("B:B").setNumberFormat("dd/MM/yyyy");
  hoja.getRange("E:E").setNumberFormat("$#,##0.00");
  hoja.setColumnWidth(6, 250);
  hoja.setColumnWidth(9, 280);
  hoja.setFrozenRows(1);
}


function _inicializarDETALLE_DOCUMENTOS(ss) {
  let hoja = ss.getSheetByName("DETALLE_DOCUMENTOS");
  if (!hoja) hoja = ss.insertSheet("DETALLE_DOCUMENTOS");
  hoja.clearContents();

  const headers = [[
    "ID_Deposito", "Folio_Interno", "UUID_Origen", "Serie",
    "Subtotal_Base", "IVA_16", "Total_Factura",
    "Saldo_Anterior", "Importe_Pagado", "Saldo_Insoluto",
    "Num_Parcialidad", "Estatus_Pago", "Fecha_Factura", "Receptor"
  ]];
  hoja.getRange("A1:N1").setValues(headers)
    .setBackground("#4a148c").setFontColor("#ffffff").setFontWeight("bold");

  hoja.getRange("E:J").setNumberFormat("$#,##0.00");
  hoja.setFrozenRows(1);
}

function _inicializarEXPORTADOR(ss) {
  let hoja = ss.getSheetByName("EXPORTADOR_FACTURO_POR_TI");
  if (!hoja) hoja = ss.insertSheet("EXPORTADOR_FACTURO_POR_TI");
  hoja.clearContents();

  // ROW 1: Pago (encabezado maestro)
  hoja.getRange("A1:X1").setBackground("#b71c1c").setFontColor("#ffffff").setFontWeight("bold");
  hoja.getRange("A1").setValue("Pago");
  const pagoHeaders = [
    "FechaPago","FormaPago","Moneda","TipoCambio","MontoPago",
    "NúmeroOperación","BancoExtranjero","RFCCuentaOrdenante","CuentaOrdenante",
    "RFCCuentaBeneficiario","CuentaBeneficiario","","","","","","","","","","","",""
  ];
  hoja.getRange("B1:X1").setValues([pagoHeaders]);

  // ROW 2: DetallePago
  hoja.getRange("A2:X2").setBackground("#e53935").setFontColor("#ffffff");
  hoja.getRange("A2").setValue("DetallePago");
  hoja.getRange("B2").setValue("dd/mm/yyyy hh:mm:ss");
  hoja.getRange("D2").setValue("MXN - Peso Mexicano");
  hoja.getRange("E2").setValue(1);

  // ROW 3: DocumentosRelacionados (encabezado de documentos)
  hoja.getRange("A3:X3").setBackground("#c62828").setFontColor("#ffffff").setFontWeight("bold");
  hoja.getRange("A3").setValue("DocumentosRelacionados");
  const drHeaders = [
    "UUID","Serie","Folio","Moneda","TipoCambio","Equivalencia",
    "NúmeroParcialidad","ImporteSaldoAnterior","ImportePagado","ImporteSaldoInsoluto",
    "ObjetoDeImpuesto","ImpuestoTrasladadoRetenido","TipoImpuesto","Factor",
    "Base","Tasa","Importe","ImpuestoTrasladadoRetenido","TipoImpuesto","Factor",
    "Base","Tasa","Importe"
  ];
  hoja.getRange("B3:X3").setValues([drHeaders]);

  // Nota informativa
  hoja.getRange("A5").setValue("⚠️ Esta hoja es generada automáticamente por 'Generar CargarCFDI.csv'. No editar manualmente.");
  hoja.getRange("A5").setFontColor("#c62828").setFontStyle("italic");

  hoja.setFrozenRows(3);
  hoja.setColumnWidth(2, 300); // UUID
}

function _inicializarCUENTAS_POR_PAGAR(ss) {
  let hoja = ss.getSheetByName("CUENTAS_POR_PAGAR_FASE2");
  if (!hoja) hoja = ss.insertSheet("CUENTAS_POR_PAGAR_FASE2");
  hoja.clearContents();

  hoja.getRange("A1:H1").merge().setValue("🔒 CUENTAS POR PAGAR — FASE 2 (Gestión de Proveedores)")
    .setBackground("#37474f").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");

  const headers = [["ID_Proveedor", "Nombre_Proveedor", "RFC_Proveedor", "Folio_Factura", "Monto_Total", "Fecha_Vencimiento", "Estatus_Pago", "UUID_CFDI_Proveedor"]];
  hoja.getRange("A2:H2").setValues(headers)
    .setBackground("#546e7a").setFontColor("#ffffff").setFontWeight("bold");

  hoja.getRange("A3").setValue("(Esta pestaña está reservada para la gestión futura de cuentas por pagar a proveedores — Fase 2)");
  hoja.getRange("A3").setFontStyle("italic").setFontColor("#78909c");
  hoja.setFrozenRows(2);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 4: FUNCIÓN PRINCIPAL A — procesarBuzonDrive()
// Lee las carpetas del Buzón en Drive y puebla CONCILIADOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Punto de entrada del menú "⚡ Sincronizar Buzón Drive & Match"
 * Orquesta las dos operaciones: lectura del buzón y match de folios.
 */
function sincronizarBuzonYMatch() {
  const ui = SpreadsheetApp.getUi();
  try {
    const resultadoBuzon = procesarBuzonDrive();
    const resultadoMatch = realizarMatchControlFolios();

    ui.alert(
      '✅ Sincronización Completada',
      '📥 Buzón Drive:\n' +
      '  • Comprobantes banco procesados: ' + resultadoBuzon.comprobantesLeidos + '\n' +
      '  • Payment Advice DHL procesados: ' + resultadoBuzon.advicesLeidos + '\n' +
      '  • Filas nuevas en CONCILIADOR: ' + resultadoBuzon.filasNuevas + '\n\n' +
      '🔗 Match Control de Folios:\n' +
      '  • Folios encontrados y enriquecidos: ' + resultadoMatch.foliosEncontrados + '\n' +
      '  • Folios no encontrados: ' + resultadoMatch.foliosNoEncontrados + '\n' +
      '  • Filas en DETALLE_DOCUMENTOS: ' + resultadoMatch.filasDetalle,
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('❌ Error en Sincronización', err.toString(), ui.ButtonSet.OK);
    Logger.log('ERROR sincronizarBuzonYMatch: ' + err.stack);
  }
}

/**
 * Lee las carpetas 01_COMPROBANTES_BANCO y 02_PAYMENT_ADVICE del Buzón en Drive,
 * extrae metadatos y textos disponibles, y puebla la pestaña CONCILIADOR.
 *
 * @returns {Object} Resumen de filas procesadas.
 */
function procesarBuzonDrive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaConciliador = ss.getSheetByName("CONCILIADOR");
  if (!hojaConciliador) throw new Error("Pestaña CONCILIADOR no encontrada. Ejecuta 'Inicializar Hojas' primero.");

  // Localizar carpeta OLLIN_FINANZAS > BUZON_CCP en Drive
  const carpetaBuzon = _obtenerOCrearCarpetaBuzon();
  const carpetaBanco = _obtenerSubcarpeta(carpetaBuzon, NOMBRE_CARPETA_BANCO);
  const carpetaAdvice = _obtenerSubcarpeta(carpetaBuzon, NOMBRE_CARPETA_ADVICE);

  // Leer IDs de depósitos ya registrados para evitar duplicados
  const datosExistentes = hojaConciliador.getDataRange().getValues();
  const idsExistentes = new Set();
  for (let i = 1; i < datosExistentes.length; i++) {
    if (datosExistentes[i][0]) idsExistentes.add(String(datosExistentes[i][0]).trim());
  }

  const filasNuevas = [];
  let comprobantesLeidos = 0;
  let advicesLeidos = 0;

  // ── Procesar Comprobantes de Banco ───────────────────────────────────────
  const archivosComprobante = carpetaBanco.getFiles();
  while (archivosComprobante.hasNext()) {
    const archivo = archivosComprobante.next();
    const nombreArchivo = archivo.getName();
    const mimeType = archivo.getMimeType();
    const fechaCreacion = archivo.getDateCreated();

    // Generar ID único basado en el nombre del archivo
    const idDeposito = "DEP-" + _generarHashCorto(nombreArchivo + fechaCreacion.getTime());

    if (idsExistentes.has(idDeposito)) continue;

    let montoExtarido = 0;
    let claveRastreo = "";
    let horaDeposito = "";

    // Intentar extraer texto si es un archivo de texto/doc
    if (mimeType === MimeType.PLAIN_TEXT || mimeType === "text/csv") {
      try {
        const contenido = archivo.getAs("text/plain").getDataAsString("UTF-8");
        montoExtarido = _extraerMontoDeTexto(contenido);
        claveRastreo = _extraerClaveRastreoDeTexto(contenido);
        horaDeposito = _extraerHoraDeTexto(contenido);
      } catch (e) {
        Logger.log("No se pudo leer texto de: " + nombreArchivo + " — " + e.toString());
      }
    }

    filasNuevas.push([
      idDeposito,
      fechaCreacion,
      horaDeposito || "",
      claveRastreo || "",
      montoExtarido || 0,
      "", // Folios_DHL_Pagados — se llena manualmente o desde Payment Advice
      "PENDIENTE",
      "",
      "",
      "Comprobante banco: " + nombreArchivo
    ]);

    idsExistentes.add(idDeposito);
    comprobantesLeidos++;
  }

  // ── Procesar Payment Advice DHL ──────────────────────────────────────────
  const archivosAdvice = carpetaAdvice.getFiles();
  while (archivosAdvice.hasNext()) {
    const archivo = archivosAdvice.next();
    const nombreArchivo = archivo.getName();
    const mimeType = archivo.getMimeType();
    const fechaCreacion = archivo.getDateCreated();

    const idDeposito = "ADV-" + _generarHashCorto(nombreArchivo + fechaCreacion.getTime());
    if (idsExistentes.has(idDeposito)) continue;

    let monto = 0;
    let clave = "";
    let foliosDHL = "";
    let hora = "";

    // Intentar leer texto del Payment Advice
    try {
      if (mimeType === MimeType.PLAIN_TEXT || mimeType === "text/csv") {
        const contenido = archivo.getAs("text/plain").getDataAsString("UTF-8");
        monto = _extraerMontoDeTexto(contenido);
        clave = _extraerClaveRastreoDeTexto(contenido);
        foliosDHL = _extraerFoliosDHLDeTexto(contenido);
        hora = _extraerHoraDeTexto(contenido);
      }
    } catch (e) {
      Logger.log("No se pudo leer texto de advice: " + nombreArchivo + " — " + e.toString());
    }

    filasNuevas.push([
      idDeposito,
      fechaCreacion,
      hora || "",
      clave || "",
      monto || 0,
      foliosDHL || "",
      "PENDIENTE",
      "",
      "",
      "Payment Advice DHL: " + nombreArchivo
    ]);

    idsExistentes.add(idDeposito);
    advicesLeidos++;
  }

  // Inyectar filas nuevas en CONCILIADOR
  if (filasNuevas.length > 0) {
    const ultimaFila = Math.max(hojaConciliador.getLastRow(), 1);
    hojaConciliador.getRange(ultimaFila + 1, 1, filasNuevas.length, 10).setValues(filasNuevas);
    hojaConciliador.getRange(ultimaFila + 1, 2, filasNuevas.length, 1).setNumberFormat("dd/MM/yyyy");
    hojaConciliador.getRange(ultimaFila + 1, 5, filasNuevas.length, 1).setNumberFormat("$#,##0.00");
  }

  return {
    comprobantesLeidos: comprobantesLeidos,
    advicesLeidos: advicesLeidos,
    filasNuevas: filasNuevas.length
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 5: FUNCIÓN PRINCIPAL B — realizarMatchControlFolios()
// Conecta con Control de Folios y extrae UUIDs, subtotales, IVAs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lee los folios de la columna 'Folios_DHL_Pagados' en CONCILIADOR,
 * los busca en la hoja 'Control de Folios' de Arauto Express,
 * extrae UUID, Subtotal, IVA, Total y llena DETALLE_DOCUMENTOS.
 *
 * @returns {Object} Resumen de folios encontrados y no encontrados.
 */
function realizarMatchControlFolios() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaConciliador = ss.getSheetByName("CONCILIADOR");
  const hojaDetalle = ss.getSheetByName("DETALLE_DOCUMENTOS");

  if (!hojaConciliador || !hojaDetalle) {
    throw new Error("Faltan hojas CONCILIADOR o DETALLE_DOCUMENTOS. Ejecuta 'Inicializar Hojas'.");
  }

  // Cargar datos del CONCILIADOR
  const datosConciliador = hojaConciliador.getDataRange().getValues();
  if (datosConciliador.length < 2) return { foliosEncontrados: 0, foliosNoEncontrados: 0, filasDetalle: 0 };

  // Conectar con Control de Folios
  const ssControlFolios = _abrirControlFolios();
  if (!ssControlFolios) throw new Error("No se pudo abrir 'Control de Folios'. Verifica ID_CONTROL_FOLIOS en Script Properties.");

  const hojaControlFolios = ssControlFolios.getSheetByName(PESTANA_CONTROL_FOLIOS)
    || ssControlFolios.getSheetByName(PESTANA_FOLIOS_ALT)
    || ssControlFolios.getSheets()[0];

  if (!hojaControlFolios) throw new Error("No se encontró pestaña en Control de Folios.");

  const datosControlFolios = hojaControlFolios.getDataRange().getValues();
  if (datosControlFolios.length < 2) throw new Error("Control de Folios está vacío.");

  // Mapear columnas de Control de Folios
  const cabeceras = datosControlFolios[0].map(h => String(h).toLowerCase().trim().replace(/[\s_]+/g, "_"));
  const mapa = _mapearColumnasControlFolios(cabeceras);

  Logger.log("Columnas Control de Folios: " + cabeceras.join(", "));
  Logger.log("Mapa de columnas: " + JSON.stringify(mapa));

  // Construir índice de folios: { "1051": { uuid, serie, subtotal, iva, total, fecha... } }
  const indiceFolios = {};
  for (let r = 1; r < datosControlFolios.length; r++) {
    const fila = datosControlFolios[r];
    const folioRaw = mapa.folio !== -1 ? String(fila[mapa.folio] || "").trim() : "";
    const serieRaw = mapa.serie !== -1 ? String(fila[mapa.serie] || "").trim() : "";
    if (!folioRaw) continue;

    // La clave del índice es "SERIE+FOLIO" o solo "FOLIO"
    const claveIdx = serieRaw ? (serieRaw + folioRaw) : folioRaw;
    indiceFolios[claveIdx] = {
      folio: folioRaw,
      serie: serieRaw,
      uuid: mapa.uuid !== -1 ? String(fila[mapa.uuid] || "").trim() : "",
      subtotal: mapa.subtotal !== -1 ? (Number(fila[mapa.subtotal]) || 0) : 0,
      iva: mapa.iva !== -1 ? (Number(fila[mapa.iva]) || 0) : 0,
      total: mapa.total !== -1 ? (Number(fila[mapa.total]) || 0) : 0,
      saldoAnterior: mapa.saldo_anterior !== -1 ? (Number(fila[mapa.saldo_anterior]) || 0) : 0,
      saldoInsoluto: mapa.saldo_insoluto !== -1 ? (Number(fila[mapa.saldo_insoluto]) || 0) : 0,
      fechaFactura: mapa.fecha !== -1 ? fila[mapa.fecha] : "",
      receptor: mapa.receptor !== -1 ? String(fila[mapa.receptor] || "").trim() : "DHL de México",
      filaCF: r + 1 // número de fila en Control de Folios (base 1)
    };
    // También indexar solo por folio numérico para facilitar búsqueda
    if (serieRaw) indiceFolios[folioRaw] = indiceFolios[claveIdx];
  }

  // Leer IDs de depósitos ya procesados en DETALLE_DOCUMENTOS
  const datosDetalle = hojaDetalle.getDataRange().getValues();
  const clavesProcesadas = new Set();
  for (let d = 1; d < datosDetalle.length; d++) {
    const clave = String(datosDetalle[d][0] || "") + "_" + String(datosDetalle[d][1] || "");
    if (clave !== "_") clavesProcesadas.add(clave);
  }

  const filasDetalle = [];
  let foliosEncontrados = 0;
  let foliosNoEncontrados = 0;

  // Iterar sobre CONCILIADOR y procesar folios pagados
  for (let c = 1; c < datosConciliador.length; c++) {
    const fila = datosConciliador[c];
    const idDeposito = String(fila[0] || "").trim();
    const montoPago = Number(fila[4]) || 0;
    const foliosPagadosRaw = String(fila[5] || "").trim();

    if (!idDeposito || !foliosPagadosRaw) continue;

    // Parsear lista de folios: "1051, 1052, 1053, 1054"
    const listFolios = foliosPagadosRaw.split(/[,;\s]+/).map(f => f.trim()).filter(f => f);
    const nParcialidades = listFolios.length;

    for (let fi = 0; fi < listFolios.length; fi++) {
      const folioKey = listFolios[fi];
      const claveUnica = idDeposito + "_" + folioKey;
      if (clavesProcesadas.has(claveUnica)) continue;

      let datosDoc = indiceFolios[folioKey];
      // Búsqueda flexible: probar con P+folio (ej: "P1051")
      if (!datosDoc) datosDoc = indiceFolios["P" + folioKey];
      if (!datosDoc) datosDoc = indiceFolios["p" + folioKey.toLowerCase()];

      if (datosDoc && datosDoc.uuid) {
        // Calcular distribución del pago entre parcialidades
        const importePagadoParcial = nParcialidades > 0 ? montoPago / nParcialidades : montoPago;
        const saldoAnterior = datosDoc.total || datosDoc.subtotal + datosDoc.iva;
        const saldoInsoluto = Math.max(0, saldoAnterior - importePagadoParcial);
        const baseIVA = importePagadoParcial / (1 + CONFIG_FISCAL.tasaIVA);
        const ivaCalculado = importePagadoParcial - baseIVA;

        filasDetalle.push([
          idDeposito,
          folioKey,
          datosDoc.uuid,
          datosDoc.serie || "P",
          datosDoc.subtotal || baseIVA,
          datosDoc.iva || ivaCalculado,
          datosDoc.total || importePagadoParcial,
          saldoAnterior,
          importePagadoParcial,
          saldoInsoluto,
          fi + 1, // Num_Parcialidad
          "PAGADO",
          datosDoc.fechaFactura || "",
          datosDoc.receptor || "DHL de México"
        ]);

        clavesProcesadas.add(claveUnica);
        foliosEncontrados++;
      } else {
        // Folio no encontrado en Control de Folios: registrar con UUID vacío
        filasDetalle.push([
          idDeposito,
          folioKey,
          "⚠️ UUID NO ENCONTRADO — Verificar en Control de Folios",
          "?",
          0, 0, 0, 0,
          montoPago / nParcialidades,
          0,
          fi + 1,
          "PENDIENTE_UUID",
          "",
          ""
        ]);
        clavesProcesadas.add(claveUnica);
        foliosNoEncontrados++;
        Logger.log("⚠️ Folio no encontrado en Control de Folios: " + folioKey + " (ID Depósito: " + idDeposito + ")");
      }
    }
  }

  // Inyectar en DETALLE_DOCUMENTOS
  if (filasDetalle.length > 0) {
    const ultimaFilaDet = Math.max(hojaDetalle.getLastRow(), 1);
    hojaDetalle.getRange(ultimaFilaDet + 1, 1, filasDetalle.length, 14).setValues(filasDetalle);
    hojaDetalle.getRange(ultimaFilaDet + 1, 5, filasDetalle.length, 6).setNumberFormat("$#,##0.00000");
  }

  return {
    foliosEncontrados: foliosEncontrados,
    foliosNoEncontrados: foliosNoEncontrados,
    filasDetalle: filasDetalle.length
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 6: FUNCIÓN PRINCIPAL C — generarCSVFacturoPorTi()
// Convierte DETALLE_DOCUMENTOS al formato CargarCFDI.csv
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lee DETALLE_DOCUMENTOS y CONCILIADOR, construye el CSV en formato exacto
 * de 'CargarCFDI.csv' de Facturo Por Ti, guarda en Drive '03_CARGAS_GENERADAS'
 * y actualiza la hoja EXPORTADOR_FACTURO_POR_TI como espejo visual.
 */
function generarCSVFacturoPorTi() {
  const ui = SpreadsheetApp.getUi();

  // Solicitar datos del pago
  const respMonto = ui.prompt(
    '📥 Generar CargarCFDI.csv',
    'Ingresa el MONTO TOTAL del depósito a complementar (ej: 164911.40):\n(Déjalo vacío para tomar el total de CONCILIADOR)',
    ui.ButtonSet.OK_CANCEL
  );
  if (respMonto.getSelectedButton() !== ui.Button.OK) return;

  const respFecha = ui.prompt(
    '📅 Fecha del Pago (SPEI)',
    'Fecha del depósito bancario (formato dd/mm/yyyy HH:MM:SS):\n(Ej: 15/09/2026 10:32:18)',
    ui.ButtonSet.OK_CANCEL
  );
  if (respFecha.getSelectedButton() !== ui.Button.OK) return;

  const respClave = ui.prompt(
    '🔑 Clave de Rastreo SPEI',
    'Número de operación/Clave SPEI del depósito:',
    ui.ButtonSet.OK_CANCEL
  );
  if (respClave.getSelectedButton() !== ui.Button.OK) return;

  const montoTotal = parseFloat(respMonto.getResponseText().replace(/,/g, '')) || 0;
  const fechaPago = respFecha.getResponseText().trim() || Utilities.formatDate(new Date(), "America/Mexico_City", "dd/MM/yyyy HH:mm:ss");
  const claveRastreo = respClave.getResponseText().trim() || "";

  try {
    const resultado = _construirYGuardarCSV(montoTotal, fechaPago, claveRastreo);

    ui.alert(
      '✅ CargarCFDI.csv Generado',
      '📄 Archivo: ' + resultado.nombreArchivo + '\n' +
      '📁 Guardado en: BUZON_CCP/03_CARGAS_GENERADAS/\n' +
      '🔗 URL: ' + resultado.urlArchivo + '\n\n' +
      '📊 Documentos relacionados incluidos: ' + resultado.totalDocumentos + '\n' +
      '💰 Monto total del CCP: $' + montoTotal.toFixed(2) + ' MXN\n\n' +
      '➡️ Descarga el archivo desde Drive y súbelo a Facturo Por Ti.',
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('❌ Error al generar CSV', err.toString(), ui.ButtonSet.OK);
    Logger.log('ERROR generarCSVFacturoPorTi: ' + err.stack);
  }
}

/**
 * Construye el contenido del CSV y lo guarda en Drive.
 * @param {number} montoTotal - Monto del pago recibido
 * @param {string} fechaPago - Fecha formato dd/mm/yyyy HH:mm:ss
 * @param {string} claveRastreo - Clave SPEI/número de operación
 * @returns {Object} { nombreArchivo, urlArchivo, totalDocumentos }
 */
function _construirYGuardarCSV(montoTotal, fechaPago, claveRastreo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaDetalle = ss.getSheetByName("DETALLE_DOCUMENTOS");
  const hojaExportador = ss.getSheetByName("EXPORTADOR_FACTURO_POR_TI");

  if (!hojaDetalle) throw new Error("Pestaña DETALLE_DOCUMENTOS no encontrada.");

  const datosDetalle = hojaDetalle.getDataRange().getValues();
  if (datosDetalle.length < 2) throw new Error("DETALLE_DOCUMENTOS no tiene datos. Ejecuta 'Sincronizar Buzón Drive & Match' primero.");

  // Filtrar solo filas con UUID válido (excluir filas de error)
  const filasValidas = [];
  for (let i = 1; i < datosDetalle.length; i++) {
    const uuid = String(datosDetalle[i][2] || "").trim();
    if (uuid && uuid.length > 30 && !uuid.startsWith("⚠️")) {
      filasValidas.push(datosDetalle[i]);
    }
  }

  if (filasValidas.length === 0) throw new Error("No hay documentos con UUID válido en DETALLE_DOCUMENTOS. Verifica que Control de Folios tenga los UUIDs correctos.");

  // Si montoTotal no fue especificado, sumar importes pagados
  let montoEfectivo = montoTotal;
  if (!montoEfectivo || montoEfectivo === 0) {
    montoEfectivo = filasValidas.reduce((acc, f) => acc + (Number(f[8]) || 0), 0);
  }

  // ── Construir líneas del CSV en formato CargarCFDI ────────────────────
  const lineasCSV = [];

  // LÍNEA 1: Pago (encabezado de sección)
  lineasCSV.push([
    "Pago","FechaPago","FormaPago","Moneda","TipoCambio","MontoPago",
    "NúmeroOperación","BancoExtranjero","RFCCuentaOrdenante","CuentaOrdenante",
    "RFCCuentaBeneficiario","CuentaBeneficiario","","","","","","","","","","","",""
  ]);

  // LÍNEA 2: DetallePago (valores reales del pago)
  lineasCSV.push([
    "DetallePago",
    fechaPago,
    CONFIG_FISCAL.formaPago, // "03" = Transferencia SPEI
    CONFIG_FISCAL.moneda,
    CONFIG_FISCAL.tipoCambio,
    montoEfectivo,
    claveRastreo || "",
    "", // BancoExtranjero (vacío para México)
    CONFIG_FISCAL.rfcOrdenante, // RFC DHL
    "", // CuentaOrdenante (se puede completar con CLABE DHL)
    CONFIG_FISCAL.rfcBeneficiario, // RFC Arauto Express
    CONFIG_FISCAL.cuentaBeneficiario, // CLABE Arauto
    "","","","","","","","","","","",""
  ]);

  // LÍNEA 3: DocumentosRelacionados (encabezado de sección)
  lineasCSV.push([
    "DocumentosRelacionados","UUID","Serie","Folio","Moneda","TipoCambio","Equivalencia",
    "NúmeroParcialidad","ImporteSaldoAnterior","ImportePagado","ImporteSaldoInsoluto",
    "ObjetoDeImpuesto","ImpuestoTrasladadoRetenido","TipoImpuesto","Factor",
    "Base","Tasa","Importe","ImpuestoTrasladadoRetenido","TipoImpuesto","Factor",
    "Base","Tasa","Importe"
  ]);

  // LÍNEAS DE DOCUMENTOS: Una por cada factura relacionada
  for (let d = 0; d < filasValidas.length; d++) {
    const doc = filasValidas[d];
    // [0]=ID_Deposito, [1]=Folio_Interno, [2]=UUID_Origen, [3]=Serie,
    // [4]=Subtotal_Base, [5]=IVA_16, [6]=Total_Factura,
    // [7]=Saldo_Anterior, [8]=Importe_Pagado, [9]=Saldo_Insoluto, [10]=Num_Parcialidad

    const uuid = String(doc[2] || "").trim();
    const serie = String(doc[3] || "P").trim();
    const folio = String(doc[1] || "").trim();
    const saldoAnterior = Number(doc[7]) || Number(doc[6]) || 0;
    const importePagado = Number(doc[8]) || 0;
    const saldoInsoluto = Number(doc[9]) || 0;
    const numParcialidad = Number(doc[10]) || (d + 1);

    // Calcular Base e Importe IVA desde el importe pagado
    const base = importePagado / (1 + CONFIG_FISCAL.tasaIVA);
    const importeIVA = importePagado - base;

    lineasCSV.push([
      "DetalleDocumentosRelacionados",
      uuid,
      serie,
      folio,
      CONFIG_FISCAL.moneda,
      CONFIG_FISCAL.tipoCambio,
      1, // Equivalencia
      numParcialidad,
      _formatearMonto(saldoAnterior),
      _formatearMonto(importePagado),
      _formatearMonto(saldoInsoluto),
      CONFIG_FISCAL.objetoImpuesto, // "02 - Sí objeto de impuesto."
      "1 - Trasladado", // ImpuestoTrasladadoRetenido
      CONFIG_FISCAL.tipoImpuesto, // "2 - IVA"
      CONFIG_FISCAL.tipoFactor, // "1 - Tasa"
      _formatearMonto(base), // Base
      "0.160000", // Tasa
      _formatearMonto(importeIVA), // Importe IVA
      "","","","","",""  // Campos vacíos segunda ronda impuesto
    ]);
  }

  // ── Convertir a CSV string ────────────────────────────────────────────
  const csvContent = lineasCSV.map(fila =>
    fila.map(celda => {
      const valor = celda === null || celda === undefined ? "" : String(celda);
      // Escapar si contiene coma, comilla o salto de línea
      if (valor.includes(",") || valor.includes("\"") || valor.includes("\n")) {
        return '"' + valor.replace(/"/g, '""') + '"';
      }
      return valor;
    }).join(",")
  ).join("\r\n");

  // ── Guardar en Drive 03_CARGAS_GENERADAS ────────────────────────────
  const carpetaCargas = _obtenerCarpetaCargas();
  const timestamp = Utilities.formatDate(new Date(), "America/Mexico_City", "yyyyMMdd_HHmmss");
  const nombreArchivo = "CargarCFDI_CCP_" + timestamp + ".csv";

  const blob = Utilities.newBlob(csvContent, "text/csv", nombreArchivo);
  const archivoGuardado = carpetaCargas.createFile(blob);

  Logger.log("✅ CargarCFDI.csv guardado: " + archivoGuardado.getUrl());

  // ── Actualizar hoja espejo EXPORTADOR_FACTURO_POR_TI ────────────────
  if (hojaExportador) {
    _actualizarExportadorHoja(hojaExportador, lineasCSV);
  }

  return {
    nombreArchivo: nombreArchivo,
    urlArchivo: archivoGuardado.getUrl(),
    totalDocumentos: filasValidas.length
  };
}

/**
 * Actualiza la hoja espejo EXPORTADOR_FACTURO_POR_TI con los datos del último CSV generado.
 */
function _actualizarExportadorHoja(hoja, lineasCSV) {
  // Limpiar filas de datos anteriores (conservar las 3 primeras de encabezado)
  const lastRow = hoja.getLastRow();
  if (lastRow > 3) {
    hoja.getRange(4, 1, lastRow - 3, 24).clearContent();
  }

  // Inyectar filas de datos (saltando las 3 de encabezado que ya están)
  const filasData = lineasCSV.slice(2); // Saltar fila 1 y 2 (Pago y DetallePago ya están hardcodeados)

  // Actualizar la fila 2 con datos reales del DetallePago
  if (lineasCSV.length > 1) {
    const detPago = lineasCSV[1];
    hoja.getRange("B2").setValue(detPago[1]); // FechaPago
    hoja.getRange("C2").setValue(detPago[2]); // FormaPago
    hoja.getRange("F2").setValue(detPago[5]); // MontoPago
    hoja.getRange("G2").setValue(detPago[6]); // NúmeroOperación
    hoja.getRange("I2").setValue(detPago[8]); // RFCCuentaOrdenante
    hoja.getRange("K2").setValue(detPago[10]); // RFCCuentaBeneficiario
  }

  // Inyectar DocumentosRelacionados (saltando la fila de encabezado)
  const filasDocs = lineasCSV.slice(3);
  if (filasDocs.length > 0) {
    const rango = hoja.getRange(4, 1, filasDocs.length, 24);
    const valores = filasDocs.map(f => {
      while (f.length < 24) f.push("");
      return f.slice(0, 24);
    });
    rango.setValues(valores);
    rango.setBackground("#fff8e1");
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 7: FUNCIÓN PRINCIPAL D — marcarCCPCompletado()
// Cierra el ciclo contable escribiendo el folio CCP en Control de Folios
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Diálogo interactivo para cerrar un folio CCP en Control de Folios.
 * Punto de entrada del menú "🔒 Cerrar Folio CCP en Control de Folios".
 */
function cerrarFolioCCPDialog() {
  const ui = SpreadsheetApp.getUi();

  const respFolioCCP = ui.prompt(
    '🔒 Cerrar Folio CCP',
    'Ingresa el folio CCP emitido por Facturo Por Ti (Ej: CCP54):',
    ui.ButtonSet.OK_CANCEL
  );
  if (respFolioCCP.getSelectedButton() !== ui.Button.OK) return;

  const respFolioFactura = ui.prompt(
    '📄 Folio de Factura Original',
    'Ingresa el folio interno de la factura que cierra (Ej: 1051):\n(Para múltiples, separa con coma: 1051,1052,1053,1054)',
    ui.ButtonSet.OK_CANCEL
  );
  if (respFolioFactura.getSelectedButton() !== ui.Button.OK) return;

  const folioCCP = respFolioCCP.getResponseText().trim().toUpperCase();
  const folioFactura = respFolioFactura.getResponseText().trim();

  if (!folioCCP || !folioFactura) {
    ui.alert('❌ Error', 'Ambos folios son obligatorios.', ui.ButtonSet.OK);
    return;
  }

  try {
    const resultado = marcarCCPCompletado(folioCCP, folioFactura);
    ui.alert(
      '✅ Cierre Contable Completado',
      '🔒 Folio CCP: ' + folioCCP + '\n' +
      '📄 Facturas cerradas: ' + resultado.facturasCerradas + '\n' +
      '📝 Filas actualizadas en Control de Folios: ' + resultado.filasActualizadas + '\n\n' +
      resultado.detalle,
      ui.ButtonSet.OK
    );

    // También actualizar CONCILIADOR con el folio CCP
    _actualizarConciliadorConCCP(folioCCP, folioFactura);

  } catch (err) {
    ui.alert('❌ Error al cerrar folio', err.toString(), ui.ButtonSet.OK);
    Logger.log('ERROR cerrarFolioCCPDialog: ' + err.stack);
  }
}

/**
 * Escribe el folio CCP en la columna correspondiente de 'Control de Folios'.
 * Cierra el ciclo contable para los folios indicados.
 *
 * @param {string} folioCCP - Folio emitido (ej: "CCP54")
 * @param {string} foliosFacturasStr - Folios separados por coma (ej: "1051,1052,1053,1054")
 * @returns {Object} Resumen de operación
 */
function marcarCCPCompletado(folioCCP, foliosFacturasStr) {
  const ssControlFolios = _abrirControlFolios();
  if (!ssControlFolios) throw new Error("No se pudo abrir 'Control de Folios'. Verifica ID_CONTROL_FOLIOS.");

  const hojaControlFolios = ssControlFolios.getSheetByName(PESTANA_CONTROL_FOLIOS)
    || ssControlFolios.getSheetByName(PESTANA_FOLIOS_ALT)
    || ssControlFolios.getSheets()[0];

  if (!hojaControlFolios) throw new Error("Pestaña no encontrada en Control de Folios.");

  const datosControlFolios = hojaControlFolios.getDataRange().getValues();
  const cabeceras = datosControlFolios[0].map(h => String(h).toLowerCase().trim().replace(/[\s_]+/g, "_"));
  const mapa = _mapearColumnasControlFolios(cabeceras);

  // Buscar columna de CCP (puede llamarse "folio_ccp", "ccp", "complemento_pago", etc.)
  let colCCP = cabeceras.indexOf("folio_ccp");
  if (colCCP === -1) colCCP = cabeceras.indexOf("ccp");
  if (colCCP === -1) colCCP = cabeceras.indexOf("complemento_de_pago");
  if (colCCP === -1) colCCP = cabeceras.indexOf("complemento_pago");
  if (colCCP === -1) colCCP = cabeceras.indexOf("num_ccp");
  if (colCCP === -1) colCCP = cabeceras.length; // Si no existe, crear nueva columna al final

  // Si no existe la columna CCP, crearla
  if (colCCP >= cabeceras.length) {
    hojaControlFolios.getRange(1, colCCP + 1).setValue("Folio_CCP")
      .setBackground("#b71c1c").setFontColor("#ffffff").setFontWeight("bold");
    Logger.log("✅ Columna 'Folio_CCP' creada en Control de Folios (col " + (colCCP + 1) + ")");
  }

  // Parsear lista de folios
  const listFolios = foliosFacturasStr.split(/[,;\s]+/).map(f => f.trim().toUpperCase()).filter(f => f);
  let filasActualizadas = 0;
  const detalleArr = [];

  for (let r = 1; r < datosControlFolios.length; r++) {
    const fila = datosControlFolios[r];
    const folioEnFila = String(fila[mapa.folio] !== undefined ? fila[mapa.folio] : "").trim().toUpperCase();
    const serieEnFila = mapa.serie !== -1 ? String(fila[mapa.serie] || "").trim().toUpperCase() : "";

    // Verificar si este folio está en la lista
    const coincide = listFolios.some(f =>
      f === folioEnFila ||
      f === (serieEnFila + folioEnFila) ||
      ("P" + f) === folioEnFila ||
      f === folioEnFila.replace(/^P/, "")
    );

    if (coincide) {
      // Actualizar la celda de CCP en esta fila
      hojaControlFolios.getRange(r + 1, colCCP + 1).setValue(folioCCP)
        .setBackground("#e8f5e9").setFontColor("#1b5e20").setFontWeight("bold");

      // Marcar estatus de pago si existe la columna
      if (mapa.estatus_pago !== -1) {
        hojaControlFolios.getRange(r + 1, mapa.estatus_pago + 1).setValue("PAGADO_CCP");
      }

      detalleArr.push("✅ Folio " + folioEnFila + " → " + folioCCP + " (fila " + (r + 1) + ")");
      filasActualizadas++;
    }
  }

  if (filasActualizadas === 0) {
    throw new Error(
      "No se encontraron los folios " + foliosFacturasStr + " en Control de Folios.\n" +
      "Verifica que el ID_CONTROL_FOLIOS sea correcto y que los folios existan en la pestaña."
    );
  }

  Logger.log("🔒 CCP cerrado: " + folioCCP + " | Filas actualizadas: " + filasActualizadas);

  return {
    facturasCerradas: listFolios.length,
    filasActualizadas: filasActualizadas,
    detalle: detalleArr.join("\n")
  };
}

/**
 * Actualiza CONCILIADOR con el Folio CCP recién emitido.
 */
function _actualizarConciliadorConCCP(folioCCP, folioFactura) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaConciliador = ss.getSheetByName("CONCILIADOR");
    if (!hojaConciliador) return;

    const datos = hojaConciliador.getDataRange().getValues();
    for (let r = 1; r < datos.length; r++) {
      const foliosPagados = String(datos[r][5] || "");
      const listFoliosInput = folioFactura.split(/[,;\s]+/).map(f => f.trim());

      // Verificar si alguno de los folios del depósito coincide con los de entrada
      const hayCoincidencia = listFoliosInput.some(f => foliosPagados.includes(f));
      if (hayCoincidencia) {
        // Columna H (índice 7) = Folio_CCP_Asignado
        hojaConciliador.getRange(r + 1, 8).setValue(folioCCP);
        // Columna G (índice 6) = Estatus_Conciliado → CCP_EMITIDO
        hojaConciliador.getRange(r + 1, 7).setValue("CCP_EMITIDO");
      }
    }
  } catch (e) {
    Logger.log("No se pudo actualizar CONCILIADOR con CCP: " + e.toString());
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 8: UTILIDADES Y HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Abre el libro 'Control de Folios' usando el ID almacenado en Script Properties.
 */
function _abrirControlFolios() {
  const idGuardado = PropertiesService.getScriptProperties().getProperty("ID_CONTROL_FOLIOS");
  if (!idGuardado || idGuardado === "REEMPLAZAR_CON_ID_CONTROL_DE_FOLIOS") {
    // Intentar buscar por nombre en Drive como fallback
    const archivos = DriveApp.getFilesByName("Control de Folios");
    if (archivos.hasNext()) {
      const archivo = archivos.next();
      return SpreadsheetApp.openById(archivo.getId());
    }
    return null;
  }
  try {
    return SpreadsheetApp.openById(idGuardado);
  } catch (e) {
    Logger.log("No se pudo abrir Control de Folios con ID: " + idGuardado + " — " + e.toString());
    return null;
  }
}

/**
 * Mapea columnas del libro Control de Folios a índices numéricos.
 * @param {string[]} cabeceras - Array de nombres de columnas normalizados.
 * @returns {Object} Mapa de índices.
 */
function _mapearColumnasControlFolios(cabeceras) {
  const encontrar = function(opciones) {
    for (let i = 0; i < opciones.length; i++) {
      const idx = cabeceras.indexOf(opciones[i]);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    folio: encontrar(["folio", "folio_interno", "no._factura", "num_factura", "factura", "no_factura"]),
    serie: encontrar(["serie", "serie_factura"]),
    uuid: encontrar(["uuid", "uuid_cfdi", "folio_fiscal", "folio_fiscal_uuid", "timbre", "cfdi"]),
    subtotal: encontrar(["subtotal", "sub_total", "importe_base", "base", "importe_sin_iva"]),
    iva: encontrar(["iva", "impuesto", "iva_16", "impuesto_16%", "importe_iva"]),
    total: encontrar(["total", "total_factura", "importe_total", "monto_total"]),
    saldo_anterior: encontrar(["saldo_anterior", "saldo_ant", "importe_saldo_anterior"]),
    saldo_insoluto: encontrar(["saldo_insoluto", "saldo_ins", "importe_saldo_insoluto"]),
    fecha: encontrar(["fecha", "fecha_factura", "fecha_emision", "fecha_timbrado"]),
    receptor: encontrar(["receptor", "cliente", "razon_social_receptor", "nombre_cliente", "receptor_rfc"]),
    estatus_pago: encontrar(["estatus_pago", "estatus", "status", "pago", "estatus_cobro"])
  };
}

/**
 * Obtiene o crea la carpeta OLLIN_FINANZAS > BUZON_CCP en Drive.
 */
function _obtenerOCrearCarpetaBuzon() {
  let carpetaOllin = null;
  const carpetasOllin = DriveApp.getFoldersByName(NOMBRE_CARPETA_OLLIN_FINANZAS);
  if (carpetasOllin.hasNext()) {
    carpetaOllin = carpetasOllin.next();
  } else {
    carpetaOllin = DriveApp.createFolder(NOMBRE_CARPETA_OLLIN_FINANZAS);
    Logger.log("✅ Carpeta creada: " + NOMBRE_CARPETA_OLLIN_FINANZAS);
  }

  let carpetaBuzon = null;
  const subcarpetas = carpetaOllin.getFoldersByName(NOMBRE_CARPETA_BUZON_RAIZ);
  if (subcarpetas.hasNext()) {
    carpetaBuzon = subcarpetas.next();
  } else {
    carpetaBuzon = carpetaOllin.createFolder(NOMBRE_CARPETA_BUZON_RAIZ);
    Logger.log("✅ Carpeta creada: " + NOMBRE_CARPETA_BUZON_RAIZ);
  }

  return carpetaBuzon;
}

/**
 * Obtiene o crea una subcarpeta dentro de una carpeta padre.
 */
function _obtenerSubcarpeta(carpetaPadre, nombreSub) {
  const subs = carpetaPadre.getFoldersByName(nombreSub);
  if (subs.hasNext()) return subs.next();
  return carpetaPadre.createFolder(nombreSub);
}

/**
 * Obtiene la carpeta 03_CARGAS_GENERADAS.
 */
function _obtenerCarpetaCargas() {
  const buzon = _obtenerOCrearCarpetaBuzon();
  return _obtenerSubcarpeta(buzon, NOMBRE_CARPETA_CARGAS);
}

/**
 * Genera un hash corto (8 chars) para generar IDs únicos de depósito.
 */
function _generarHashCorto(cadena) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, cadena);
  return digest.slice(0, 4).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').toUpperCase();
}

/**
 * Intenta extraer el monto depositado de un texto.
 * Patrones típicos: "$164,911.40", "MONTO: 164911.40", "TOTAL 164911.40"
 */
function _extraerMontoDeTexto(texto) {
  const patrones = [
    /(?:monto|total|importe|cantidad|deposit)[:\s]+\$?([\d,]+\.?\d*)/i,
    /\$\s*([\d,]+\.\d{2})/,
    /(?:MXN|Pesos?)[:\s]+\$?([\d,]+\.?\d*)/i,
    /([\d]{2,3}(?:,[\d]{3})+\.[\d]{2})/  // Formato 164,911.40
  ];

  for (let i = 0; i < patrones.length; i++) {
    const m = texto.match(patrones[i]);
    if (m) {
      const montoStr = m[1].replace(/,/g, "");
      const monto = parseFloat(montoStr);
      if (!isNaN(monto) && monto > 0) return monto;
    }
  }
  return 0;
}

/**
 * Intenta extraer la clave de rastreo SPEI de un texto.
 */
function _extraerClaveRastreoDeTexto(texto) {
  const patrones = [
    /(?:clave[\s_]?(?:de[\s_]?)?rastreo|rastreo|folio|número[\s_]?operaci[oó]n|num[\s_]?op)[:\s]+([A-Z0-9]{10,20})/i,
    /SPEI[:\s]+([A-Z0-9]{10,20})/i,
    /CLABE[:\s]+([\d]{18})/i
  ];

  for (let i = 0; i < patrones.length; i++) {
    const m = texto.match(patrones[i]);
    if (m) return m[1].trim();
  }
  return "";
}

/**
 * Intenta extraer la hora del depósito de un texto.
 */
function _extraerHoraDeTexto(texto) {
  const m = texto.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?)/i);
  return m ? m[1] : "";
}

/**
 * Intenta extraer los folios DHL mencionados en el Payment Advice.
 */
function _extraerFoliosDHLDeTexto(texto) {
  const patrones = [
    /(?:folio[s]?|factura[s]?|invoice[s]?)[:\s]+((?:\d+[,;\s]*)+)/i,
    /P?(\d{4,6})(?:[,;\s]+P?(\d{4,6}))*/ // Números de 4-6 dígitos
  ];

  for (let i = 0; i < patrones.length; i++) {
    const m = texto.match(patrones[i]);
    if (m) {
      const numeros = m[0].match(/\d{4,6}/g);
      if (numeros && numeros.length > 0) return numeros.join(", ");
    }
  }
  return "";
}

/**
 * Formatea un número como string con 5 decimales (formato Facturo Por Ti).
 */
function _formatearMonto(num) {
  return Number(num).toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
}


// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 9: DIAGNÓSTICO Y ESTADO DEL SISTEMA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Muestra el estado actual del sistema en un diálogo.
 */
function verEstadoSistema() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let informe = "📊 ESTADO DEL SISTEMA — CONSOLA CCP 2026\n";
  informe += "═══════════════════════════════════════\n\n";

  // Verificar hojas
  const nombresHojas = ["TABLERO", "CONCILIADOR", "DETALLE_DOCUMENTOS", "EXPORTADOR_FACTURO_POR_TI", "CUENTAS_POR_PAGAR_FASE2"];
  informe += "🗂️ HOJAS DEL SISTEMA:\n";
  nombresHojas.forEach(nombre => {
    const hoja = ss.getSheetByName(nombre);
    if (hoja) {
      const filas = Math.max(0, hoja.getLastRow() - 1);
      informe += "  ✅ " + nombre + " (" + filas + " filas de datos)\n";
    } else {
      informe += "  ❌ " + nombre + " — NO ENCONTRADA (ejecuta 'Inicializar Hojas')\n";
    }
  });

  // Verificar ID_CONTROL_FOLIOS
  const idCF = PropertiesService.getScriptProperties().getProperty("ID_CONTROL_FOLIOS");
  informe += "\n🔑 CONEXIÓN CONTROL DE FOLIOS:\n";
  if (!idCF || idCF === "REEMPLAZAR_CON_ID_CONTROL_DE_FOLIOS") {
    informe += "  ⚠️ ID no configurado en Script Properties\n";
    informe += "  📝 Acción: Ve a Extensiones > Apps Script > Propiedades del script\n";
    informe += "  📝 Clave: ID_CONTROL_FOLIOS\n";
    informe += "  📝 Valor: (ID del Google Sheet 'Control de Folios')\n";

    // Intentar búsqueda automática
    try {
      const archivos = DriveApp.getFilesByName("Control de Folios");
      if (archivos.hasNext()) {
        const cf = archivos.next();
        informe += "  🔍 Encontrado en Drive: " + cf.getId() + "\n";
        informe += "  💡 Sugerencia: Usa ese ID como valor de ID_CONTROL_FOLIOS\n";
      }
    } catch (e) {}
  } else {
    try {
      const ssCF = SpreadsheetApp.openById(idCF);
      informe += "  ✅ Conectado: '" + ssCF.getName() + "'\n";
    } catch (e) {
      informe += "  ❌ ID configurado pero no accesible: " + idCF + "\n";
    }
  }

  // Verificar Buzón en Drive
  informe += "\n📁 BUZÓN DRIVE (OLLIN_FINANZAS/BUZON_CCP):\n";
  try {
    const carpetasBuzon = DriveApp.getFoldersByName(NOMBRE_CARPETA_OLLIN_FINANZAS);
    if (carpetasBuzon.hasNext()) {
      const carpetaOllin = carpetasBuzon.next();
      const buzon = carpetaOllin.getFoldersByName(NOMBRE_CARPETA_BUZON_CCP);
      if (buzon.hasNext()) {
        const carpetaBuzon = buzon.next();
        ["01_COMPROBANTES_BANCO", "02_PAYMENT_ADVICE", "03_CARGAS_GENERADAS"].forEach(sub => {
          const subCarpetas = carpetaBuzon.getFoldersByName(sub);
          if (subCarpetas.hasNext()) {
            const carpeta = subCarpetas.next();
            const archivos = carpeta.getFiles();
            let count = 0;
            while (archivos.hasNext()) { archivos.next(); count++; }
            informe += "  ✅ " + sub + " (" + count + " archivos)\n";
          } else {
            informe += "  ⚠️ " + sub + " — carpeta no encontrada\n";
          }
        });
      } else {
        informe += "  ⚠️ BUZON_CCP no encontrado bajo OLLIN_FINANZAS\n";
      }
    } else {
      informe += "  ❌ OLLIN_FINANZAS no existe en Drive\n";
    }
  } catch (e) {
    informe += "  ❌ Error verificando Drive: " + e.toString() + "\n";
  }

  informe += "\n⏰ Verificación: " + Utilities.formatDate(new Date(), "America/Mexico_City", "dd/MM/yyyy HH:mm:ss");

  ui.alert("📊 Estado del Sistema", informe, ui.ButtonSet.OK);
}


// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN 10: SIMULACIÓN DE PRUEBA CONTROLADA (Lote 1051-1054)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta una prueba controlada simulando el lote real:
 * Facturas 1051-1054, depósito DHL de $164,911.40 MXN.
 *
 * NOTA: Esta función es solo para validar el flujo completo.
 * Los UUIDs son de demostración y deben reemplazarse con los reales de Control de Folios.
 */
function ejecutarPruebaControladaLote1051_1054() {
  let ui = null;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    // Modo ejecución sin interfaz
  }

  if (ui) {
    const confirm = ui.alert(
      '🧪 PRUEBA CONTROLADA — LOTE 1051-1054',
      'Esta función simula el depósito de $164,911.40 MXN de DHL (Folios 1051, 1052, 1053, 1054).\n\n' +
      '⚠️ IMPORTANTE: Los UUIDs de demostración serán inyectados en DETALLE_DOCUMENTOS.\n' +
      'Asegúrate de reemplazarlos con los UUIDs reales de Control de Folios ANTES de generar el CSV final.\n\n' +
      '¿Deseas continuar con la prueba?',
      ui.ButtonSet.YES_NO
    );
    if (confirm !== ui.Button.YES) return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // 1. Inyectar depósito de prueba en CONCILIADOR
    const hojaConciliador = ss.getSheetByName("CONCILIADOR");
    if (!hojaConciliador) throw new Error("Inicializa las hojas primero.");

    // Verificar si ya existe el depósito de prueba
    const datosCon = hojaConciliador.getDataRange().getValues();
    const yaTienePrueba = datosCon.some(f => String(f[0]).startsWith("DEP-PRUEBA-001"));

    if (!yaTienePrueba) {
      const filaPrueba = [[
        "DEP-PRUEBA-001",
        new Date("2026-09-15T10:32:18"),
        "10:32:18",
        "2026091500000001234",
        164911.40,
        "1051, 1052, 1053, 1054",
        "CONCILIADO",
        "",
        "",
        "🧪 PRUEBA: Depósito DHL Semana 37 — $164,911.40 MXN"
      ]];
      hojaConciliador.getRange(hojaConciliador.getLastRow() + 1, 1, 1, 10).setValues(filaPrueba);
      hojaConciliador.getRange(hojaConciliador.getLastRow(), 2, 1, 1).setNumberFormat("dd/MM/yyyy");
      hojaConciliador.getRange(hojaConciliador.getLastRow(), 5, 1, 1).setNumberFormat("$#,##0.00");
    }

    // 2. Inyectar documentos relacionados de demostración en DETALLE_DOCUMENTOS
    const hojaDetalle = ss.getSheetByName("DETALLE_DOCUMENTOS");
    if (!hojaDetalle) throw new Error("Hoja DETALLE_DOCUMENTOS no encontrada.");

    const datosDetalle = hojaDetalle.getDataRange().getValues();
    const yaTieneDetalle = datosDetalle.some(f => String(f[0]).startsWith("DEP-PRUEBA-001"));

    if (!yaTieneDetalle) {
      // Datos de demostración: 4 facturas, suma total = $164,911.40 MXN
      // Subtotales calculados: $164,911.40 / 1.16 = $142,165.00 base aprox.
      // Dividido en 4 facturas: ~$41,227.93 c/u de pago
      const montoTotalPago = 164911.40;
      const montoPorFactura = montoTotalPago / 4; // ~$41,227.85
      const baseIVA = montoPorFactura / 1.16;
      const ivaFactura = montoPorFactura - baseIVA;

      const docsDemo = [
        ["DEP-PRUEBA-001", "1051", "⚠️ REEMPLAZAR-UUID-REAL-FACTURA-1051-EN-CONTROL-FOLIOS", "P", baseIVA, ivaFactura, montoPorFactura, montoPorFactura, montoPorFactura, 0, 1, "PAGADO", new Date("2026-08-01"), "DHL de México"],
        ["DEP-PRUEBA-001", "1052", "⚠️ REEMPLAZAR-UUID-REAL-FACTURA-1052-EN-CONTROL-FOLIOS", "P", baseIVA, ivaFactura, montoPorFactura, montoPorFactura, montoPorFactura, 0, 2, "PAGADO", new Date("2026-08-08"), "DHL de México"],
        ["DEP-PRUEBA-001", "1053", "⚠️ REEMPLAZAR-UUID-REAL-FACTURA-1053-EN-CONTROL-FOLIOS", "P", baseIVA, ivaFactura, montoPorFactura, montoPorFactura, montoPorFactura, 0, 3, "PAGADO", new Date("2026-08-15"), "DHL de México"],
        ["DEP-PRUEBA-001", "1054", "⚠️ REEMPLAZAR-UUID-REAL-FACTURA-1054-EN-CONTROL-FOLIOS", "P", baseIVA, ivaFactura, montoPorFactura, montoPorFactura, montoPorFactura, 0, 4, "PAGADO", new Date("2026-08-22"), "DHL de México"]
      ];
      hojaDetalle.getRange(hojaDetalle.getLastRow() + 1, 1, docsDemo.length, 14).setValues(docsDemo);
      hojaDetalle.getRange(hojaDetalle.getLastRow() - docsDemo.length + 1, 5, docsDemo.length, 6).setNumberFormat("$#,##0.00000");
    }

    // 3. Generar el CSV de prueba
    const csvResultado = _construirYGuardarCSV(
      164911.40,
      "15/09/2026 10:32:18",
      "2026091500000001234"
    );

    if (ui) {
      ui.alert(
        '✅ Prueba Controlada Completada — Lote 1051-1054',
        '📊 Resultados de la simulación:\n\n' +
        '• Depósito: $164,911.40 MXN (15/Sep/2026)\n' +
        '• Clave SPEI: 2026091500000001234\n' +
        '• Facturas simuladas: 1051, 1052, 1053, 1054\n' +
        '• Monto por factura: $' + (164911.40 / 4).toFixed(2) + ' MXN c/u\n\n' +
        '📄 CSV generado: ' + csvResultado.nombreArchivo + '\n' +
        '🔗 URL: ' + csvResultado.urlArchivo + '\n\n' +
        '⚠️ ACCIÓN REQUERIDA:\n' +
        'Los UUIDs en DETALLE_DOCUMENTOS son de DEMOSTRACIÓN.\n' +
        'Reemplaza los 4 UUIDs con los valores reales de tu "Control de Folios" antes\n' +
        'de subir el CargarCFDI.csv a Facturo Por Ti.',
        ui.ButtonSet.OK
      );
    }
    return { status: "SUCCESS", csv: csvResultado };

  } catch (err) {
    if (ui) {
      ui.alert('❌ Error en prueba controlada', err.toString(), ui.ButtonSet.OK);
    }
    Logger.log('ERROR prueba controlada: ' + err.stack);
    throw err;
  }
}


function auditarListaPendientesDHL() {
  var idSheet = "1vgka3tXAde-EnwDiSBNtQ-8n9Bi64AUw";
  var ss = SpreadsheetApp.openById(idSheet);
  var sheets = ss.getSheets();
  var sheetNames = sheets.map(function(s) { return s.getName() + " (gid=" + s.getSheetId() + ")"; });
  Logger.log("Hojas disponibles: " + sheetNames.join(", "));
  
  var targetSheet = null;
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() == 588794921) {
      targetSheet = sheets[i];
      break;
    }
  }
  if (!targetSheet) targetSheet = sheets[0];
  
  var lastRow = targetSheet.getLastRow();
  var lastCol = targetSheet.getLastColumn();
  Logger.log("Hoja: " + targetSheet.getName() + " | Filas: " + lastRow + " | Columnas: " + lastCol);
  
  var headers = targetSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  Logger.log("Encabezados: " + JSON.stringify(headers));
  
  if (lastRow > 1) {
    var sampleRows = targetSheet.getRange(2, 1, Math.min(5, lastRow - 1), lastCol).getValues();
    Logger.log("Muestra datos: " + JSON.stringify(sampleRows));
  }
  return { sheet: targetSheet.getName(), rows: lastRow, cols: lastCol, headers: headers };
}
