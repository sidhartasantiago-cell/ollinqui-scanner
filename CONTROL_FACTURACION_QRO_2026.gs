/**
 * 🧾 ECOSISTEMA OLLIN / ARAUTO EXPRESS - SISTEMA DESACOPLADO DE FACTURACIÓN EN 2 TIEMPOS
 * 
 * CONTROL DE FACTURACIÓN QRO & LEN (2026)
 * 
 * CARACTERÍSTICAS INMUTABLES DE SEGURIDAD (POKA-YOKE):
 * 1. MODO SOLO-LECTURA para bases maestras:
 *    - "BD CENTRAL 2023" (ID: 1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8)
 *    - "2025 Tabla de facturacion QRO 2.0" (ID: 1d6D8jy5PGScalE8POFou1UYTpbW6p1Vi5xovrqZay6U)
 *    - NUNCA escribe ni altera una sola celda en esos libros productivos.
 * 2. FLUJO EN 2 TIEMPOS (2 BOTONES):
 *    - Tiempo 1 (🔍 Calcular y Auditar): Genera pre-cálculo y detecta guías duplicadas o casos especiales.
 *    - Tiempo 2 (📄 Generar Documentos): Genera el CSV de Carta Porte (Facturo Por Ti) y el Excel oficial DHL.
 * 3. DETECTOR DE REZAGOS Y CASOS ESPECIALES:
 *    - Suma automáticamente guías pendientes de semanas anteriores.
 *    - Aísla duplicados/reintentos en una bandeja de auditoría con checkbox para autorización de Sidharta.
 * 4. DATOS FIJOS DE TRASLADO CARTA PORTE 3.1:
 *    - Operador: Sidharta Santiago Garduño (SAGS781017RR6)
 *    - Vehículo: Placas SW3768A, Seguros El Potosí (Póliza AUIN-105157-13), Permiso SCT 11112551
 */

// IDs de Infraestructura Canónica
var ID_BD_CENTRAL_CANONICA = typeof ID_BD_CENTRAL_CANONICA !== 'undefined' ? ID_BD_CENTRAL_CANONICA : "1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8";
var ID_TABLA_FACTURACION_HISTORICA = typeof ID_TABLA_FACTURACION_HISTORICA !== 'undefined' ? ID_TABLA_FACTURACION_HISTORICA : "1d6D8jy5PGScalE8POFou1UYTpbW6p1Vi5xovrqZay6U";
var ID_BOVEDA_BATCH_MAESTRO = typeof ID_BOVEDA_BATCH_MAESTRO !== 'undefined' ? ID_BOVEDA_BATCH_MAESTRO : "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw";

// Datos Fiscales y de Transporte Fijos (Carta Porte 3.1)
const TRANSPORTE_CONFIG = {
  proveedorNombre: "Sidharta Santiago Garduño",
  proveedorRfc: "SAGS781017RR6",
  licencia: "Q124079-20",
  vehiculoPlacas: "SW3768A",
  vehiculoConfig: "VL",
  vehiculoPesoBruto: 1.3,
  vehiculoModelo: "2015",
  aseguradora: "Seguros El Potosí",
  polizaSeguro: "AUIN-105157-13",
  permisoSct: "TPAF02",
  numPermisoSct: "11112551",
  origenCp: "76246",
  destinoCp: "76138"
};

/**
 * Menú contextual en Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🧾 Facturación DHL (Control 2026)')
    .addItem('🔍 1. Calcular Corte y Auditar Guías (Tiempo 1)', 'ejecutarCalculoYAuditoria')
    .addSeparator()
    .addItem('📄 2. Generar Documentos Finales (Tiempo 2)', 'ejecutarGeneracionDocumentos')
    .addSeparator()
    .addItem('🕵️ 3. Agente Hermes: Auditar Diferencia (537 vs 531)', 'auditarDiferenciaHermes')
    .addSeparator()
    .addItem('🔬 4. Inspeccionar Fórmulas de Ruta Backend', 'inspeccionarFormulasRutaBackend')
    .addSeparator()
    .addItem('⚙️ Inicializar / Resetear Estructura de Pestañas', 'inicializarEstructuraLibro')
    .addToUi();
}

/**
 * Sanitización estricta de PID bajo la Ley de la Doble J
 */
function sanitizarPID(pidRaw) {
  if (!pidRaw) return "";
  var pidClean = String(pidRaw).trim().toUpperCase();
  if (pidClean.indexOf("JJD") === 0) {
    pidClean = "JD" + pidClean.substring(3);
  }
  return pidClean;
}

/**
 * Analizador universal de fechas (soporta dd/mm/aaaa, aaaa-mm-dd, o Date)
 * Retorna Date con hora a las 12:00:00 para evitar desfases de zona horaria.
 */
function parsearFechaFlexible(fechaVal) {
  if (!fechaVal) return null;
  if (fechaVal instanceof Date) {
    if (isNaN(fechaVal.getTime())) return null;
    return new Date(fechaVal.getFullYear(), fechaVal.getMonth(), fechaVal.getDate(), 12, 0, 0);
  }
  
  var str = String(fechaVal).trim();
  
  // 1. Formato dd/mm/aaaa o dd-mm-aaaa
  var matchDMY = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (matchDMY) {
    var dia = parseInt(matchDMY[1], 10);
    var mes = parseInt(matchDMY[2], 10) - 1; // Base 0
    var anio = parseInt(matchDMY[3], 10);
    var d = new Date(anio, mes, dia, 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  
  // 2. Formato aaaa/mm/dd o aaaa-mm-dd
  var matchYMD = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (matchYMD) {
    var anio = parseInt(matchYMD[1], 10);
    var mes = parseInt(matchYMD[2], 10) - 1;
    var dia = parseInt(matchYMD[3], 10);
    var d = new Date(anio, mes, dia, 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  
  // 3. Fallback para strings con hora (ej: "15/09/2026 14:30:00" o "2026-09-15 14:30:00")
  var partesEspacio = str.split(" ")[0];
  var mDMY2 = partesEspacio.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mDMY2) {
    return new Date(parseInt(mDMY2[3], 10), parseInt(mDMY2[2], 10) - 1, parseInt(mDMY2[1], 10), 12, 0, 0);
  }
  var mYMD2 = partesEspacio.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (mYMD2) {
    return new Date(parseInt(mYMD2[1], 10), parseInt(mYMD2[2], 10) - 1, parseInt(mYMD2[3], 10), 12, 0, 0);
  }
  
  return null;
}

/**
 * Convierte fecha a número entero YYYYMMDD para comparación matemática infalible
 * Ejemplo: 19/09/2026 -> 20260919
 */
function fechaANumero(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return 0;
  var a = dateObj.getFullYear();
  var m = dateObj.getMonth() + 1;
  var d = dateObj.getDate();
  return a * 10000 + m * 100 + d;
}

/**
 * Formato natural hispano dd/mm/aaaa
 */
function formatearFechaDDMMAAAA(fechaVal) {
  var d = parsearFechaFlexible(fechaVal);
  if (!d) return "";
  var dia = ("0" + d.getDate()).slice(-2);
  var mes = ("0" + (d.getMonth() + 1)).slice(-2);
  var anio = d.getFullYear();
  return dia + "/" + mes + "/" + anio;
}

/**
 * =========================================================================
 * TIEMPO 1: CALCULAR CORTE Y AUDITAR GUÍAS
 * =========================================================================
 */
function ejecutarCalculoYAuditoria() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Solicitar Folio de Factura
  const respFolio = ui.prompt(
    '🧾 Tiempo 1: Cálculo y Auditoría de Facturación',
    'Ingresa el folio de Factura Semanal a procesar\n(Ejemplo: Semana 38 (2026) factura P1072 QRO):',
    ui.ButtonSet.OK_CANCEL
  );
  if (respFolio.getSelectedButton() !== ui.Button.OK) return;
  const folioFactura = respFolio.getResponseText().trim();
  if (!folioFactura) {
    ui.alert('❌ Error: El folio de factura es obligatorio.');
    return;
  }

  // 2. Solicitar Rango de Fechas del Corte Semanal en formato dd/mm/aaaa
  const hoyObj = new Date();
  const hoyDDMMAAAA = formatearFechaDDMMAAAA(hoyObj);

  const respFechaFin = ui.prompt(
    '📅 1/2: Fecha Fin de Corte (Límite)',
    'Ingresa la FECHA FIN de la semana (formato: dd/mm/aaaa):\n(Ejemplo: 19/09/2026 o presiona OK para hoy ' + hoyDDMMAAAA + '):',
    ui.ButtonSet.OK_CANCEL
  );
  if (respFechaFin.getSelectedButton() !== ui.Button.OK) return;
  var inputFin = respFechaFin.getResponseText().trim();
  var dateFin = inputFin ? parsearFechaFlexible(inputFin) : hoyObj;
  if (!dateFin) {
    ui.alert('❌ Error: Formato de fecha fin no válido. Usa dd/mm/aaaa (ejemplo: 19/09/2026).');
    return;
  }

  // Fecha de inicio sugerida: 6 días antes de la fecha fin (lunes a domingo)
  var dateInicioSugerida = new Date(dateFin.getTime());
  dateInicioSugerida.setDate(dateInicioSugerida.getDate() - 6);
  var sugeridaDDMMAAAA = formatearFechaDDMMAAAA(dateInicioSugerida);

  const respFechaInicio = ui.prompt(
    '📅 2/2: Fecha Inicio del Corte Semanal',
    'Ingresa la FECHA INICIO de la semana (formato: dd/mm/aaaa):\n(Presiona OK para usar la sugerida: ' + sugeridaDDMMAAAA + '):',
    ui.ButtonSet.OK_CANCEL
  );
  if (respFechaInicio.getSelectedButton() !== ui.Button.OK) return;
  var inputInicio = respFechaInicio.getResponseText().trim();
  var dateInicio = inputInicio ? parsearFechaFlexible(inputInicio) : dateInicioSugerida;
  if (!dateInicio) {
    ui.alert('❌ Error: Formato de fecha inicio no válido. Usa dd/mm/aaaa (ejemplo: 13/09/2026).');
    return;
  }
  // Enteros matemáticos infalibles YYYYMMDD para comparación exacta
  const numFin = fechaANumero(dateFin);
  const numInicio = fechaANumero(dateInicio);

  ui.alert(
    '⏳ Parámetros de Corte Establecidos',
    '• Folio: ' + folioFactura + '\n' +
    '• Corte a facturar: del ' + formatearFechaDDMMAAAA(dateInicio) + ' al ' + formatearFechaDDMMAAAA(dateFin) + '\n' +
    '(Únicamente se procesarán los envíos dentro de este rango de fechas).\n\n' +
    'Presiona Aceptar para iniciar el procesamiento.',
    ui.ButtonSet.OK
  );

  try {
    // 3. CONECTAR DIRECTAMENTE A "2025 Tabla de facturacion QRO 2.0" (SOLO-LECTURA)
    const ssFacturacion = SpreadsheetApp.openById(ID_TABLA_FACTURACION_HISTORICA);
    
    // Buscar la hoja de datos que alimenta TD Facturación: "Ruta Backend" o "Ruta Back end"
    let hojaFuente = ssFacturacion.getSheetByName("Ruta Backend") || 
                     ssFacturacion.getSheetByName("Ruta Back end") || 
                     ssFacturacion.getSheetByName("RUTA") || 
                     ssFacturacion.getSheets()[0];

    const dataFuente = hojaFuente.getDataRange().getValues();
    if (dataFuente.length < 2) {
      throw new Error("La hoja '" + hojaFuente.getName() + "' en 2025 Tabla de facturacion QRO 2.0 está vacía.");
    }

    const cabF = dataFuente[0].map(h => String(h || "").toLowerCase().trim().replace(/[\s_]+/g, " "));
    
    // Mapeo dinámico y tolerante de columnas exactas de Ruta Backend y TD Facturación
    const idxGuia = cabF.findIndex(h => h.indexOf("guia") !== -1 || h.indexOf("guía") !== -1);
    const idxCheckpoint = cabF.findIndex(h => h === "checkpoint" || h.indexOf("check") !== -1);
    const idxTipoServicio = cabF.findIndex(h => h.indexOf("tipo de servicio") !== -1 || h === "servicio" || h.indexOf("tipo servicio") !== -1);
    const idxTarifaBase = cabF.findIndex(h => h === "tarifa" || h === "tarifa base" || h === "costo");
    
    // Piezas y Maniobra (Multipiezas: $5.00 por cada pieza adicional a partir de la 2da)
    const idxPcs = cabF.findIndex(h => h === "piezas" || h === "#pcs" || h === "pzas" || h === "piezas total");
    const idxTarifaPieza = cabF.findIndex(h => h.indexOf("tarifa por pieza") !== -1 || h.indexOf("tarifa pieza") !== -1 || h.indexOf("costo pieza") !== -1);
    
    // Peso y Tarifa por peso (DHL QRO: mayor a 25 kg, $2.50 por kg adicional)
    const idxTarifaPeso = cabF.findIndex(h => h.indexOf("tarifa por peso") !== -1 || h.indexOf("tarifa peso") !== -1 || h.indexOf("costo peso") !== -1);
    const idxPesoMayor = cabF.findIndex(h => h.indexOf("peso mayor") !== -1 || h.indexOf("peso excedente") !== -1 || h.indexOf("excedente") !== -1);
    const idxCp = cabF.findIndex(h => h === "c.p." || h === "cp" || h.indexOf("codigo postal") !== -1);
    const idxPid = cabF.findIndex(h => h === "pid" || h.indexOf("pid") !== -1);

    // Detección de columnas candidatas de Fecha (ordenadas por prioridad)
    const idxFechasCandidatas = [];
    ["fecha en ruta", "fecha ruta", "fecha entrega", "fecha asignacion", "fecha asignación", "fecha"].forEach(cand => {
      const idx = cabF.findIndex(h => h === cand);
      if (idx !== -1 && idxFechasCandidatas.indexOf(idx) === -1) idxFechasCandidatas.push(idx);
    });
    // Si no encontró por coincidencia exacta, incluir cualquier columna que contenga "fecha"
    if (idxFechasCandidatas.length === 0) {
      cabF.forEach((h, i) => { if (h.indexOf("fecha") !== -1) idxFechasCandidatas.push(i); });
    }

    // Checkpoints cobrables oficiales de DHL Plaza Querétaro
    const CHECKPOINTS_COBRABLES = new Set(["OK", "BA", "PU", "RD"]);

    // 4. PROCESAMIENTO Y FILTRADO EXACTO
    const guiasParaCobro = [];
    const casosEspeciales = [];
    const guiasVistasEnEsteCorte = new Map();

    for (let r = 1; r < dataFuente.length; r++) {
      const row = dataFuente[r];
      const guia = idxGuia !== -1 ? String(row[idxGuia] || "").trim() : String(row[0] || "").trim();
      if (!guia || guia.length < 5) continue;

      // Checkpoint de la fila
      const ckptRaw = idxCheckpoint !== -1 ? String(row[idxCheckpoint] || "").trim().toUpperCase() : "OK";
      
      // FILTRO 1: Checkpoint cobrable oficial (OK, BA, PU, RD)
      if (!CHECKPOINTS_COBRABLES.has(ckptRaw)) {
        continue;
      }

      // FILTRO 2: Fecha estricta con formato natural dd/mm/aaaa
      let fechaValida = null;
      for (let i = 0; i < idxFechasCandidatas.length; i++) {
        const valF = row[idxFechasCandidatas[i]];
        if (valF) {
          const d = parsearFechaFlexible(valF);
          if (d) {
            fechaValida = d;
            break;
          }
        }
      }

      // SI NO HAY FECHA VÁLIDA O ESTÁ FUERA DEL RANGO DEL CORTE: OMITIR
      if (!fechaValida) {
        continue;
      }
      const numRow = fechaANumero(fechaValida);
      if (numRow < numInicio || numRow > numFin) {
        continue;
      }
      const fechaRowDDMMAAAA = formatearFechaDDMMAAAA(fechaValida);

      // Tipo de Servicio de la hoja (Foraneo vs Remoto)
      let tipoServicio = "Foraneo";
      if (idxTipoServicio !== -1 && row[idxTipoServicio]) {
        const ts = String(row[idxTipoServicio]).trim().toLowerCase();
        if (ts.indexOf("remoto") !== -1) {
          tipoServicio = "Remoto";
        }
      } else if (idxCp !== -1 && row[idxCp]) {
        const cpStr = String(row[idxCp]).trim();
        if (["762", "763", "764", "765", "766", "767", "768", "769"].some(function(p) { return cpStr.indexOf(p) === 0; })) {
          tipoServicio = "Remoto";
        }
      }

      // 1. Tarifa Base de Reparto ($65 Foráneo, $100 Remoto)
      let tarifaBase = (tipoServicio === "Remoto") ? 100 : 65;
      if (idxTarifaBase !== -1 && row[idxTarifaBase] !== "" && row[idxTarifaBase] !== null) {
        const tb = Number(row[idxTarifaBase]);
        if (!isNaN(tb) && (tb === 65 || tb === 100 || tb > 0)) tarifaBase = tb;
      }

      // 2. Tarifa por Pieza (Respetar columna calculada en Ruta Backend de 2025 Tabla de facturacion QRO 2.0)
      const piezas = idxPcs !== -1 ? (Number(row[idxPcs]) || 1) : 1;
      let tarifaPieza = 0;
      if (idxTarifaPieza !== -1 && row[idxTarifaPieza] !== "" && row[idxTarifaPieza] !== null) {
        const tp = Number(row[idxTarifaPieza]);
        if (!isNaN(tp)) tarifaPieza = tp;
      } else if (piezas > 1) {
        tarifaPieza = (piezas - 1) * 5.00;
      }

      // 3. Tarifa por Peso (DHL: a partir de 25 kg, $2.50 por kg adicional)
      let tarifaPeso = 0;
      if (idxTarifaPeso !== -1 && row[idxTarifaPeso] !== "" && row[idxTarifaPeso] !== null) {
        const tpw = Number(row[idxTarifaPeso]);
        if (!isNaN(tpw)) tarifaPeso = tpw;
      } else if (idxPesoMayor !== -1 && row[idxPesoMayor] !== "" && row[idxPesoMayor] !== null) {
        const kgExcedente = Number(row[idxPesoMayor]);
        if (!isNaN(kgExcedente) && kgExcedente > 0) {
          tarifaPeso = Math.round(kgExcedente) * 2.50;
        }
      }

      const pidRaw = idxPid !== -1 ? String(row[idxPid] || "").trim() : "";
      const pidLimpio = sanitizarPID(pidRaw);
      const cpVal = idxCp !== -1 ? String(row[idxCp] || "").trim() : "";

      const importeTotal = tarifaBase + tarifaPieza + tarifaPeso;
      const maniobra = tarifaPieza > 0 ? "Multipieza" : "N/A";

      // Registro y tratamiento de reintentos en la misma semana (Opción A: Facturados en automático)
      let esReintento = false;
      if (guiasVistasEnEsteCorte.has(guia)) {
        esReintento = true;
        casosEspeciales.push([
          true,
          guia,
          pidLimpio,
          fechaRowDDMMAAAA,
          "Reintento cobrable autorizado (Checkpoint: " + ckptRaw + ")",
          piezas,
          tipoServicio,
          importeTotal,
          "Incluida automáticamente en la factura conforme a regla DHL"
        ]);
      } else {
        guiasVistasEnEsteCorte.set(guia, true);
      }

      guiasParaCobro.push({
        guia: guia,
        pid: pidLimpio,
        fecha: fechaRowDDMMAAAA,
        cp: cpVal,
        piezas: piezas,
        tipoReparto: tipoServicio,
        checkpoint: ckptRaw,
        costoBase: tarifaBase,
        tarifaPieza: tarifaPieza,
        tarifaPeso: tarifaPeso,
        importeTotal: importeTotal,
        maniobra: esReintento ? (tarifaPieza > 0 ? "Multipieza (Reintento)" : "Reintento Cobrable") : maniobra,
        folio: folioFactura
      });
    }

    // 5. ESCRIBIR EN EL SHEET LOCAL (CONTROL DE FACTURACIÓN)
    escribirResultadosAlineadosTD(ss, folioFactura, formatearFechaDDMMAAAA(dateInicio) + " al " + formatearFechaDDMMAAAA(dateFin), guiasParaCobro, casosEspeciales);

    ui.alert(
      '✅ ¡Tiempo 1 Completado con Éxito!',
      '• Folio: ' + folioFactura + '\n' +
      '• Guías Listas para Facturar: ' + guiasParaCobro.length + '\n' +
      '• Casos Especiales / Duplicados en Auditoría: ' + casosEspeciales.length + '\n\n' +
      '👉 Revisa las pestañas:\n' +
      '1. "2_PRE_FACTURA": Detalle de todas las guías normales y rezagadas.\n' +
      '2. "3_CASOS_ESPECIALES_AUDITORIA": Si hay guías repetidas, marca el checkbox [X] de las que sí procedan.\n' +
      '3. "4_PARA_FACTURAR": Totales de códigos SAT para Facturo Por Ti.\n\n' +
      'Cuando estés listo, ejecuta el "Tiempo 2: Generar Documentos Finales".',
      ui.ButtonSet.OK
    );

  } catch (err) {
    ui.alert('❌ Error en Tiempo 1: ' + err.toString());
  }
}

/**
 * Escribe las pestañas locales alineadas al 100% con TD Facturación
 */
function escribirResultadosAlineadosTD(ss, folioFactura, fechaCorte, guias, casosEspeciales) {
  // Pestaña 1: PANEL Y RESUMEN
  let hPanel = ss.getSheetByName("1_PANEL_CONTROL") || ss.insertSheet("1_PANEL_CONTROL");
  hPanel.clear();

  // Encabezado del Panel
  hPanel.getRange("A1:E1").merge().setValue("🧾 CONTROL DE FACTURACIÓN QRO 2026 - PANEL DE CORTE")
    .setFontWeight("bold").setFontSize(14).setBackground("#1a73e8").setFontColor("#ffffff")
    .setHorizontalAlignment("center");

  hPanel.getRange("A3:B6").setValues([
    ["Folio de Factura:", folioFactura],
    ["Rango de Facturación:", fechaCorte],
    ["Fecha de Ejecución:", new Date()],
    ["Estatus:", "Cálculo Calibrado con TD Facturación (Tiempo 1)"]
  ]);
  hPanel.getRange("A3:A6").setFontWeight("bold");

  // Métricas idénticas a TD Facturación y Tabla Canónica de Facturación
  let entregasForaneas = guias.filter(g => g.tipoReparto === "Foraneo" && g.checkpoint !== "PU");
  let recoleccionesForaneas = guias.filter(g => g.tipoReparto === "Foraneo" && g.checkpoint === "PU");
  let entregasRemotas = guias.filter(g => g.tipoReparto === "Remoto" && g.checkpoint !== "PU");
  let recoleccionesRemotas = guias.filter(g => g.tipoReparto === "Remoto" && g.checkpoint === "PU");
  
  let cantEntFor = entregasForaneas.length;
  let cantRecFor = recoleccionesForaneas.length;
  let cantEntRem = entregasRemotas.length;
  let cantRecRem = recoleccionesRemotas.length;
  
  let subEntFor = cantEntFor * 65.00;
  let subRecFor = cantRecFor * 65.00;
  let subEntRem = cantEntRem * 100.00;
  let subRecRem = cantRecRem * 100.00;

  let sumaTarifaPiezas = guias.reduce((acc, g) => acc + (g.tarifaPieza || 0), 0);
  let sumaTarifaPeso = guias.reduce((acc, g) => acc + (g.tarifaPeso || 0), 0);
  let cantMultiPiezas = sumaTarifaPiezas > 0 ? Math.round(sumaTarifaPiezas / 5) : 0;
  let cantKilosExtra = sumaTarifaPeso > 0 ? Math.round(sumaTarifaPeso / 2.50) : 0;

  let grandSubtotal = subEntFor + subRecFor + subEntRem + subRecRem + sumaTarifaPiezas + sumaTarifaPeso;
  let grandIva = grandSubtotal * 0.16;
  let grandTotal = grandSubtotal + grandIva;

  hPanel.getRange("D3:E13").setValues([
    ["Total Guías Facturables:", guias.length],
    ["Servicio Entrega Foránea ($65) [Cód 2]:", cantEntFor],
    ["Servicio Recolección Foránea PU ($65) [Cód 4]:", cantRecFor],
    ["Servicio Entrega Remota ($100) [Cód 1]:", cantEntRem],
    ["Servicio Recolección Remota PU ($100) [Cód 5]:", cantRecRem],
    ["Manejo Multi-pieza ($5/pza) [Cód 8]:", cantMultiPiezas + " pzas ($" + sumaTarifaPiezas.toFixed(2) + ")"],
    ["Kilogramo Adicional ($2.50/kg) [Cód 9]:", cantKilosExtra + " kg ($" + sumaTarifaPeso.toFixed(2) + ")"],
    ["Total Reparto Base:", subEntFor + subRecFor + subEntRem + subRecRem],
    ["SUBTOTAL A COBRAR:", grandSubtotal],
    ["IVA TRASLADADO (16%):", grandIva],
    ["TOTAL FACTURA CON IVA:", grandTotal]
  ]);
  hPanel.getRange("D3:D13").setFontWeight("bold");
  hPanel.getRange("E3:E7").setNumberFormat("#,##0");
  hPanel.getRange("E10:E13").setFontWeight("bold").setNumberFormat("$#,##0.00");

  // Pestaña 2: PRE-FACTURA
  let hPre = ss.getSheetByName("2_PRE_FACTURA") || ss.insertSheet("2_PRE_FACTURA");
  hPre.clear();

  const cabPre = [
    "GUIA", "PID_SANITIZADO", "FECHA_ENTREGA", "CP", "PIEZAS",
    "TIPO_REPARTO", "CHECKPOINT", "COSTO_BASE", "TARIFA_PIEZA", "TARIFA_PESO", "IMPORTE_TOTAL",
    "MANIOBRA", "FOLIO_FACTURA"
  ];
  hPre.getRange(1, 1, 1, cabPre.length).setValues([cabPre])
    .setFontWeight("bold").setBackground("#34a853").setFontColor("#ffffff");

  if (guias.length > 0) {
    const filasPre = guias.map(g => [
      g.guia, g.pid, g.fecha, g.cp, g.piezas,
      g.tipoReparto, g.checkpoint, g.costoBase, g.tarifaPieza, g.tarifaPeso, g.importeTotal,
      g.maniobra, g.folio
    ]);
    hPre.getRange(2, 1, filasPre.length, cabPre.length).setValues(filasPre);
  }

  // Pestaña 3: CASOS ESPECIALES / AUDITORÍA
  let hCasos = ss.getSheetByName("3_CASOS_ESPECIALES_AUDITORIA") || ss.insertSheet("3_CASOS_ESPECIALES_AUDITORIA");
  hCasos.clear();

  const cabCasos = [
    "¿FACTURAR? (MARCAR)", "GUIA", "PID", "FECHA", "MOTIVO_ALERTA",
    "PIEZAS", "TIPO_REPARTO", "IMPORTE_PROPUESTO", "INSTRUCCIONES"
  ];
  hCasos.getRange(1, 1, 1, cabCasos.length).setValues([cabCasos])
    .setFontWeight("bold").setBackground("#ea4335").setFontColor("#ffffff");

  if (casosEspeciales.length > 0) {
    hCasos.getRange(2, 1, casosEspeciales.length, cabCasos.length).setValues(casosEspeciales);
    hCasos.getRange(2, 1, casosEspeciales.length, 1).insertCheckboxes();
  }

  // Pestaña 4: PARA FACTURAR (Códigos Facturo Por Ti / Catálogo DHL)
  let hPara = ss.getSheetByName("4_PARA_FACTURAR") || ss.insertSheet("4_PARA_FACTURAR");
  hPara.clear();

  hPara.getRange("A1:G1").merge().setValue("RESUMEN DE CONCEPTOS PARA FACTURO POR TI (CFDI 4.0 + CARTA PORTE 3.1)")
    .setFontWeight("bold").setBackground("#4285f4").setFontColor("#ffffff").setHorizontalAlignment("center");

  const cabPara = ["Código Factura", "Concepto", "Costo Unitario", "Cantidad", "Subtotal", "IVA (16%)", "Total + IVA"];
  hPara.getRange(3, 1, 1, 7).setValues([cabPara]).setFontWeight("bold").setBackground("#e8f0fe");

  const filasPara = [
    [2, "Servicio de entrega foránea", 65.00, cantEntFor, subEntFor, subEntFor * 0.16, subEntFor * 1.16],
    [9, "Kilogramo adicional", 2.50, cantKilosExtra, sumaTarifaPeso, sumaTarifaPeso * 0.16, sumaTarifaPeso * 1.16],
    [8, "Servicio multipieza", 5.00, cantMultiPiezas, sumaTarifaPiezas, sumaTarifaPiezas * 0.16, sumaTarifaPiezas * 1.16],
    [4, "Servicio recolección foránea", 65.00, cantRecFor, subRecFor, subRecFor * 0.16, subRecFor * 1.16],
    [1, "Servicio de entrega remota", 100.00, cantEntRem, subEntRem, subEntRem * 0.16, subEntRem * 1.16],
    [5, "Servicio de recolección remota", 100.00, cantRecRem, subRecRem, subRecRem * 0.16, subRecRem * 1.16],
    [3, "Servicio entrega mismo dia", 75.00, 0, 0, 0, 0]
  ];

  hPara.getRange(4, 1, filasPara.length, 7).setValues(filasPara);
  hPara.getRange("C4:C10").setNumberFormat("$#,##0.00");
  hPara.getRange("E4:G10").setNumberFormat("$#,##0.00");

  hPara.getRange(12, 4, 3, 2).setValues([
    ["SUBTOTAL:", grandSubtotal],
    ["IVA TRASLADADO (16%):", grandIva],
    ["TOTAL FACTURA:", grandTotal]
  ]);
  hPara.getRange(12, 4, 3, 2).setFontWeight("bold");
  hPara.getRange("E12:E14").setNumberFormat("$#,##0.00");
}

/**
 * =========================================================================
 * TIEMPO 2: GENERAR DOCUMENTOS FINALES
 * =========================================================================
 */
function ejecutarGeneracionDocumentos() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const hPre = ss.getSheetByName("2_PRE_FACTURA");
  const hCasos = ss.getSheetByName("3_CASOS_ESPECIALES_AUDITORIA");

  if (!hPre || hPre.getLastRow() < 2) {
    ui.alert('❌ Error: No hay guías pre-calculadas. Ejecuta primero el Tiempo 1.');
    return;
  }

  const dataPre = hPre.getDataRange().getValues();
  const guiasFinales = [];

  for (let r = 1; r < dataPre.length; r++) {
    const row = dataPre[r];
    guiasFinales.push({
      guia: String(row[0]).trim(),
      pid: String(row[1]).trim(),
      fecha: row[2],
      cp: row[3],
      piezas: Number(row[4]) || 1,
      tipoReparto: row[5],
      checkpoint: row[6],
      costoBase: Number(row[7]) || 65,
      tarifaPieza: Number(row[8]) || 0,
      tarifaPeso: Number(row[9]) || 0,
      importeTotal: Number(row[10]) || 65,
      maniobra: row[11],
      folio: row[12]
    });
  }

  // Revisar si Sidharta aprobó algún caso especial en 3_CASOS_ESPECIALES_AUDITORIA o en 🕵️_AUDITORIA_HERMES
  let casosAprobadosAdicionales = 0;
  const hojasCasosAprobados = [hCasos, ss.getSheetByName("🕵️_AUDITORIA_HERMES")].filter(Boolean);

  hojasCasosAprobados.forEach(hoja => {
    if (hoja.getLastRow() > 1) {
      const dataCasos = hoja.getDataRange().getValues();
      for (let c = 1; c < dataCasos.length; c++) {
        const rowC = dataCasos[c];
        const checkbox = rowC[0];
        if (checkbox === true || String(checkbox).toUpperCase() === "TRUE") {
          const guiaC = String(rowC[1]).trim();
          // Evitar duplicar si ya estaba incluida en la pre-factura o procesada previamente
          if (guiaC && guiaC.length >= 5 && !guiasFinales.some(gf => gf.guia === guiaC)) {
            casosAprobadosAdicionales++;
            let pzas = Number(rowC[5]) || 1;
            let tipoRep = String(rowC[4] || rowC[6] || "Foraneo");
            let cBase = tipoRep.toLowerCase().indexOf("remoto") !== -1 ? 100 : 65;
            let impTot = Number(rowC[8]) || Number(rowC[7]) || cBase;

            guiasFinales.push({
              guia: guiaC,
              pid: String(rowC[2] || "").trim(),
              fecha: rowC[2] || rowC[3] || "25/09/2026",
              cp: "76000",
              piezas: pzas,
              tipoReparto: tipoRep,
              checkpoint: String(rowC[3] || "OK"),
              costoBase: cBase,
              tarifaPieza: Number(rowC[6]) || 0,
              tarifaPeso: Number(rowC[7]) || 0,
              importeTotal: impTot,
              maniobra: pzas > 1 ? "Multipieza" : "N/A",
              folio: guiasFinales[0] ? guiasFinales[0].folio : "Corte Extra"
            });
          }
        }
      }
    }
  });
  // Cargar información de descripciones y pesos desde BATCH AWB (QRO 2.0 y BD CENTRAL 2023)
  const mapaBatchAWB = new Map();
  try {
    const ssQRO = SpreadsheetApp.openById(ID_TABLA_FACTURACION_HISTORICA);
    cargarDatosEnMapaBatch(ssQRO, mapaBatchAWB);
  } catch (eBatchQRO) {
    console.warn("Aviso: No se pudo leer BATCH AWB en QRO 2.0:", eBatchQRO);
  }

  try {
    const ssCentral = SpreadsheetApp.openById(ID_BD_CENTRAL_CANONICA);
    cargarDatosEnMapaBatch(ssCentral, mapaBatchAWB);
  } catch (eBatchCen) {
    console.warn("Aviso: No se pudo leer Batch AWB en BD CENTRAL 2023:", eBatchCen);
  }

  const folio = guiasFinales[0] ? guiasFinales[0].folio : "Semana_Factura";

  // 1. GENERAR PESTAÑAS "5_PAQUETERIA_GUIAS" Y "5_RESUMEN_MERCANCIAS"
  const resultadoCP = generarDocumentosCartaPorteFacturoPorTi(ss, folio, guiasFinales, mapaBatchAWB);

  // 2. GENERAR CONTENIDO DEL FORMATO DE COBRO POR TERCEROS PARA DHL
  const csvCobroTercerosContent = generarFormatoCobroTerceros(ss, folio, guiasFinales);

  // 3. GUARDAR ARCHIVOS EN GOOGLE DRIVE (En la misma carpeta del libro)
  let parentFolder = DriveApp.getRootFolder();
  try {
    const parents = DriveApp.getFileById(ss.getId()).getParents();
    if (parents.hasNext()) {
      parentFolder = parents.next();
    }
  } catch (e) {
    console.warn("No se pudo obtener carpeta padre, usando raíz:", e);
  }

  const nombreCsvCP = "Paqueteria_Guias_" + folio.replace(/[^a-zA-Z0-9_-]/g, "_") + ".csv";
  const fileCP = parentFolder.createFile(nombreCsvCP, resultadoCP.csvContent, MimeType.CSV);

  const nombreCobroDHL = "Formato_de_cobro_por_terceros_" + folio.replace(/[^a-zA-Z0-9_-]/g, "_") + ".csv";
  const fileDHL = parentFolder.createFile(nombreCobroDHL, csvCobroTercerosContent, MimeType.CSV);

  // Actualizar Estatus en Panel
  const hPanel = ss.getSheetByName("1_PANEL_CONTROL");
  if (hPanel) {
    hPanel.getRange("B6").setValue("Documentos Generados Exitosamente el " + new Date());
  }

  ui.alert(
    '🎉 ¡Documentos de Facturación Generados con Éxito!',
    '• Total de Guías Incluidas: ' + guiasFinales.length + ' (Casos especiales: ' + casosAprobadosAdicionales + ')\n' +
    '• Peso Total Calculado: ' + resultadoCP.pesoTotal.toFixed(2) + ' kg (Poka-Yoke: descripciones "." a "Parte", pesos 0 a 0.01)\n\n' +
    '1. Pestañas creadas en este libro:\n' +
    '   👉 5_PAQUETERIA_GUIAS (Las ' + guiasFinales.length + ' guías limpias)\n' +
    '   👉 5_RESUMEN_MERCANCIAS (Resumen oficial para Facturo Por Ti)\n' +
    '   👉 6_FORMATO_COBRO_DHL (Conciliación para DHL)\n\n' +
    '2. Para generar el archivo Excel (.xlsx) para Facturo Por Ti:\n' +
    '   👉 En tu Escritorio, abre la carpeta "CARTA PORTE 3.0" y haz doble clic en "1_CLIC_GENERAR_CARTA_PORTE.bat". ¡Listo!',
    ui.ButtonSet.OK
  );
}

/**
 * Carga información de descripciones y pesos desde cualquier hoja Batch AWB.
 * Tolerante a variaciones de nombre de pestaña y de encabezados.
 */
function cargarDatosEnMapaBatch(ss, mapa) {
  if (!ss) return;
  const nombresPosibles = ["BATCH AWB", "Batch AWB", "Batch AWB ", "Layout carta porte", "RAW_SHIPMENT"];
  let hoja = null;
  for (let n of nombresPosibles) {
    hoja = ss.getSheetByName(n);
    if (hoja && hoja.getLastRow() > 1) break;
  }
  if (!hoja || hoja.getLastRow() < 2) return;

  const data = hoja.getDataRange().getValues();
  const cab = data[0].map(h => String(h || "").toLowerCase().trim().replace(/[\s_]+/g, " "));
  const idxG = cab.findIndex(h => h.indexOf("hwb") !== -1 || h.indexOf("guia") !== -1 || h.indexOf("guía") !== -1 || h.indexOf("tracking") !== -1);
  const idxD = cab.findIndex(h => h.indexOf("desc") !== -1 || h.indexOf("commodity") !== -1 || h.indexOf("producto") !== -1 || h.indexOf("contenido") !== -1 || h.indexOf("mercancia") !== -1 || h.indexOf("mercancía") !== -1);
  const idxP = cab.findIndex(h => h.indexOf("weight") !== -1 || h.indexOf("peso") !== -1 || h.indexOf("kilos") !== -1 || h.indexOf("kg") !== -1);

  if (idxG === -1) return;

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const gKey = String(row[idxG] || "").trim();
    if (!gKey) continue;

    let descVal = idxD !== -1 ? String(row[idxD] || "").trim() : "";
    let pesoVal = idxP !== -1 ? Number(row[idxP]) || 0 : 0;

    if (!mapa.has(gKey)) {
      mapa.set(gKey, { desc: descVal, peso: pesoVal });
    } else {
      let existing = mapa.get(gKey);
      if (!existing.desc && descVal) existing.desc = descVal;
      if ((!existing.peso || existing.peso <= 0) && pesoVal > 0) existing.peso = pesoVal;
    }
  }
}

/**
 * Sanitiza la descripción de una mercancía para Facturo Por Ti.
 * Poka-Yoke: Si es ".", "-", "xx", "na", vacía o menor a 2 caracteres alfanuméricos -> "Parte".
 */
function sanitizarDescripcionCartaPorte(desc) {
  if (!desc) return "Parte";
  let d = String(desc).trim();
  let alfanum = d.replace(/[^a-zA-Z0-9]/g, "");
  if (alfanum.length < 2) return "Parte";
  if (/^(xx|xxx|na|n\/a|none|null|undefined|vacio|vacío)$/i.test(d)) return "Parte";
  return d;
}

/**
 * Sanitiza el peso de un paquete para Facturo Por Ti.
 * Poka-Yoke: Si es 0.00, <= 0 o NaN -> 0.01.
 */
function sanitizarPesoCartaPorte(peso) {
  let p = Number(peso);
  if (isNaN(p) || p <= 0) return 0.01;
  return Math.round(p * 1000) / 1000;
}

/**
 * Genera las pestañas y string CSV para Carta Porte (Facturo Por Ti):
 * - 5_PAQUETERIA_GUIAS (# Guia, Descripcion, Peso)
 * - 5_RESUMEN_MERCANCIAS (Resumen con cantidad, clave SAT 31181701, valor declarado y peso total)
 */
function generarDocumentosCartaPorteFacturoPorTi(ss, folio, guias, mapaBatch) {
  // Limpiar pestaña antigua si existía
  const hVieja = ss.getSheetByName("5_LAYOUT_CARTA_PORTE");
  if (hVieja) {
    try { ss.deleteSheet(hVieja); } catch(e) { hVieja.clear(); }
  }

  // 1. Pestaña 5_PAQUETERIA_GUIAS
  let hGuias = ss.getSheetByName("5_PAQUETERIA_GUIAS") || ss.insertSheet("5_PAQUETERIA_GUIAS");
  hGuias.clear();

  const cabGuias = ["# Guia", "Descripcion", "Peso"];
  const filasGuias = [cabGuias];
  let pesoTotalAcumulado = 0;

  for (let g of guias) {
    let batchInfo = mapaBatch.get(g.guia) || {};
    let descRaw = batchInfo.desc || g.descripcion || "";
    let pesoRaw = batchInfo.peso || g.peso || 0;

    let descClean = sanitizarDescripcionCartaPorte(descRaw);
    let pesoClean = sanitizarPesoCartaPorte(pesoRaw);

    pesoTotalAcumulado += pesoClean;
    filasGuias.push([g.guia, descClean, pesoClean]);
  }

  hGuias.getRange(1, 1, filasGuias.length, cabGuias.length).setValues(filasGuias);
  hGuias.getRange("A1:C1").setBackground("#1a73e8").setFontColor("#ffffff").setFontWeight("bold");

  // 2. Pestaña 5_RESUMEN_MERCANCIAS
  let hMerc = ss.getSheetByName("5_RESUMEN_MERCANCIAS") || ss.insertSheet("5_RESUMEN_MERCANCIAS");
  hMerc.clear();

  const cabMerc = [
    "IdOrigen", "IdDestino", "Cantidad", "Clave Unidad", "Unidad",
    "Clave Producto", "Descripción", "Valor Mercancía", "Peso en Kilos", "Dimensión", "Moneda", "Material Peligroso"
  ];
  const filaMerc = [
    1, 1, guias.length, "XPK - Paquete", "Paquete",
    "31181701", "Paquetes", guias.length * 1000, Number(pesoTotalAcumulado.toFixed(2)), "", "MXN - Peso Mexicano", "No"
  ];

  hMerc.getRange(1, 1, 1, cabMerc.length).setValues([cabMerc]).setBackground("#0f9d58").setFontColor("#ffffff").setFontWeight("bold");
  hMerc.getRange(2, 1, 1, filaMerc.length).setValues([filaMerc]);

  // Generar string CSV para Paqueteria Guias
  const csvContent = filasGuias.map(r => r.map(c => '"' + String(c !== undefined ? c : '').replace(/"/g, '""') + '"').join(',')).join('\n');
  return { csvContent: csvContent, pesoTotal: pesoTotalAcumulado };
}

/**
 * Genera la pestaña y string del Formato de Cobro por Terceros para DHL (13 Columnas)
 */
function generarFormatoCobroTerceros(ss, folio, guias) {
  let hCobro = ss.getSheetByName("6_FORMATO_COBRO_DHL") || ss.insertSheet("6_FORMATO_COBRO_DHL");
  hCobro.clear();

  // Cabecera Oficial de 3 Filas de DHL
  const r1 = ["PROVEEDOR", "FACTURA", "#PCS", "FECHA ENTREGA", "FORMA DE COBRO POR PARTE DEL TERCERO", "", "", "", "", "", "", "", ""];
  const r2 = ["", "", "", "", "", "FLETE/REPARTO", "", "SERVICIO ESPECIAL", "", "", "", "", ""];
  const r3 = ["", "", "", "", "GUIA", "REPARTO", "COSTO", "MANIOBRA", "COSTO", "RDD'S", "RECOLECCION", "DEVOLUCION", "PESO EXCEDENTE"];

  const filas = [r1, r2, r3];

  for (let g of guias) {
    filas.push([
      TRANSPORTE_CONFIG.proveedorNombre,
      folio,
      g.piezas,
      g.fecha,
      g.guia,
      g.tipoReparto,
      g.costoBase,
      g.maniobra,
      g.tarifaPieza > 0 ? g.tarifaPieza : "",
      "",
      g.checkpoint === "PU" ? 65 : "",
      "",
      g.tarifaPeso > 0 ? g.tarifaPeso : ""
    ]);
  }

  hCobro.getRange(1, 1, filas.length, 13).setValues(filas);
  hCobro.getRange("A1:M3").setFontWeight("bold").setBackground("#fbbc04");

  return filas.map(r => r.map(c => '"' + String(c !== undefined ? c : '').replace(/"/g, '""') + '"').join(',')).join('\n');
}

/**
 * Inicialización limpia de pestañas para dejar el libro listo
 */
function inicializarEstructuraLibro() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nombresDeseados = [
    "1_PANEL_CONTROL",
    "2_PRE_FACTURA",
    "3_CASOS_ESPECIALES_AUDITORIA",
    "4_PARA_FACTURAR",
    "5_LAYOUT_CARTA_PORTE",
    "6_FORMATO_COBRO_DHL"
  ];

  for (let n of nombresDeseados) {
    if (!ss.getSheetByName(n)) {
      ss.insertSheet(n);
    }
  }

  SpreadsheetApp.getUi().alert('✅ Estructura inicializada correctamente.');
}

/**
 * =========================================================================
 * INSPECCIÓN Y VOLCADO DE FÓRMULAS DE RUTA BACKEND
 * =========================================================================
 * Abre "2025 Tabla de facturacion QRO 2.0" y vuelca las fórmulas exactas
 * de "Ruta Backend" en la pestaña local "FORMULAS_RUTA_BACKEND"
 */
function inspeccionarFormulasRutaBackend() {
  const ui = SpreadsheetApp.getUi();
  const ssLocal = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const ssFacturacion = SpreadsheetApp.openById(ID_TABLA_FACTURACION_HISTORICA);
    let hojaFuente = ssFacturacion.getSheetByName("Ruta Backend") || 
                     ssFacturacion.getSheetByName("Ruta Back end") || 
                     ssFacturacion.getSheetByName("RUTA");

    if (!hojaFuente) throw new Error("No se encontró la pestaña 'Ruta Backend' en 2025 Tabla de facturacion QRO 2.0");

    const maxCols = hojaFuente.getLastColumn();
    const headers = hojaFuente.getRange(1, 1, 1, maxCols).getValues()[0];
    
    // Buscar la primera fila que contenga fórmulas (entre filas 2 y 10)
    let filaConFormulas = 2;
    let formulasFila = hojaFuente.getRange(2, 1, 1, maxCols).getFormulas()[0];
    for (let f = 2; f <= Math.min(10, hojaFuente.getLastRow()); f++) {
      const forms = hojaFuente.getRange(f, 1, 1, maxCols).getFormulas()[0];
      if (forms.some(fm => fm !== "")) {
        filaConFormulas = f;
        formulasFila = forms;
        break;
      }
    }

    // Volcar las fórmulas en la pestaña local "FORMULAS_RUTA_BACKEND"
    let hAudit = ssLocal.getSheetByName("FORMULAS_RUTA_BACKEND") || ssLocal.insertSheet("FORMULAS_RUTA_BACKEND");
    hAudit.clear();

    hAudit.getRange("A1:D1").setValues([["Columna", "Letra", "Nombre Encabezado", "Fórmula Exacta (Fila " + filaConFormulas + ")"]])
      .setFontWeight("bold").setBackground("#1a73e8").setFontColor("#ffffff");

    const filasAudit = [];
    for (let c = 0; c < maxCols; c++) {
      let colLetra = "";
      if (c < 26) {
        colLetra = String.fromCharCode(65 + c);
      } else {
        colLetra = String.fromCharCode(64 + Math.floor(c / 26)) + String.fromCharCode(65 + (c % 26));
      }
      const nombreH = String(headers[c] || "");
      const formulaVal = formulasFila[c] || "(Sin fórmula / Valor estático)";
      filasAudit.push([c + 1, colLetra, nombreH, formulaVal]);
    }

    hAudit.getRange(2, 1, filasAudit.length, 4).setValues(filasAudit);
    hAudit.autoResizeColumns(1, 4);

    // Identificar fórmulas y columnas clave
    const colsInteres = [
      { clave: "Tarifa Base", filtro: f => f[2].toLowerCase() === "tarifa" || f[2].toLowerCase() === "tarifa base" },
      { clave: "Tarifa por Pieza", filtro: f => f[2].toLowerCase().indexOf("tarifa por pieza") !== -1 || f[2].toLowerCase().indexOf("tarifa pieza") !== -1 },
      { clave: "Tarifa por Peso", filtro: f => f[2].toLowerCase().indexOf("tarifa por peso") !== -1 || f[2].toLowerCase().indexOf("tarifa peso") !== -1 },
      { clave: "Peso mayor a 25 kg", filtro: f => f[2].toLowerCase().indexOf("peso mayor") !== -1 || f[2].toLowerCase().indexOf("peso excedente") !== -1 },
      { clave: "Piezas", filtro: f => f[2].toLowerCase() === "piezas" || f[2].toLowerCase() === "#pcs" },
      { clave: "Fecha", filtro: f => f[2].toLowerCase().indexOf("fecha") !== -1 }
    ];

    let resumenMsg = "🔬 Columnas y Fórmulas Clave en 'Ruta Backend' (Fila " + filaConFormulas + "):\n\n";
    colsInteres.forEach(item => {
      const match = filasAudit.find(item.filtro);
      if (match) {
        resumenMsg += "• " + item.clave + " [" + match[2] + "] (Col " + match[1] + "):\n  " + match[3] + "\n\n";
      }
    });
    resumenMsg += "👉 Revisa la pestaña 'FORMULAS_RUTA_BACKEND' para ver el desglose completo de las " + maxCols + " columnas.";

    ui.alert('✅ Fórmulas Inspeccionadas Exitosamente', resumenMsg, ui.ButtonSet.OK);

  } catch (err) {
    ui.alert('❌ Error al inspeccionar fórmulas: ' + err.toString());
  }
}

/**
 * Cálculo avanzado de tarifa por peso conforme a la regla de negocio de DHL:
 * 1. Toma el mayor entre Weight y Vol Weight.
 * 2. Redondea a medios kilos (0.5 kg).
 * 3. Si peso > 25 kg, cobra $2.50 por cada kg adicional a partir de los 25 kg.
 */
function calcularTarifaPesoAvanzada(pesoFisico, pesoVolumetrico) {
  var pF = Number(pesoFisico) || 0;
  var pV = Number(pesoVolumetrico) || 0;
  var pesoMayor = Math.max(pF, pV);
  
  if (pesoMayor <= 25) return 0;

  // Redondeo a 0.5 kg (medios kilos)
  var pesoRedondeado = Math.round(pesoMayor * 2) / 2;
  
  if (pesoRedondeado > 25) {
    var kgExcedentes = pesoRedondeado - 25;
    return kgExcedentes * 2.50;
  }
  return 0;
}

/**
 * =========================================================================
 * 🕵️ AGENTE HERMES: AUDITORÍA UNIVERSAL DE DIFERENCIAS (DINÁMICO PARA CUALQUIER SEMANA)
 * =========================================================================
 * Audita guía por guía las diferencias entre 2_PRE_FACTURA y Ruta Backend en
 * 2025 Tabla de facturacion QRO 2.0 (y Batch AWB), detectando exactamente:
 * - Guías excluidas por Checkpoints no cobrables (NH, CA, OH, DF, etc.)
 * - Guías excluidas por Fecha fuera del rango
 * - Guías con Folio ya facturado en otra semana
 * - Reintentos en la misma semana
 * - Estatus de descripciones y pesos en BATCH AWB (QRO 2.0 y BD Central)
 */
function auditarDiferenciaHermes() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const hPre = ss.getSheetByName("2_PRE_FACTURA");
    if (!hPre || hPre.getLastRow() < 2) {
      ui.alert('❌ Primero debes ejecutar el Tiempo 1 para tener las guías pre-calculadas de la semana.');
      return;
    }

    // 1. Detectar fechas de corte de la semana activa
    let dateInicio = null;
    let dateFin = null;
    const hPanel = ss.getSheetByName("1_PANEL_CONTROL");
    if (hPanel) {
      const strRango = String(hPanel.getRange("B4").getValue() || "").trim();
      const partes = strRango.split(/al|\-/);
      if (partes.length === 2) {
        dateInicio = parsearFechaFlexible(partes[0].trim());
        dateFin = parsearFechaFlexible(partes[1].trim());
      }
    }

    if (!dateInicio || !dateFin) {
      const respF = ui.prompt(
        '🕵️ Auditoría Hermes: Fecha Fin',
        'Ingresa la FECHA FIN del corte a auditar (dd/mm/aaaa, ej: 26/09/2026 o 27/09/2026):',
        ui.ButtonSet.OK_CANCEL
      );
      if (respF.getSelectedButton() !== ui.Button.OK) return;
      dateFin = parsearFechaFlexible(respF.getResponseText().trim());

      var dateIniSugerida = new Date(dateFin.getTime());
      dateIniSugerida.setDate(dateIniSugerida.getDate() - 6);
      const respI = ui.prompt(
        '🕵️ Auditoría Hermes: Fecha Inicio',
        'Ingresa la FECHA INICIO del corte (dd/mm/aaaa, ej: ' + formatearFechaDDMMAAAA(dateIniSugerida) + '):',
        ui.ButtonSet.OK_CANCEL
      );
      if (respI.getSelectedButton() !== ui.Button.OK) return;
      dateInicio = parsearFechaFlexible(respI.getResponseText().trim()) || dateIniSugerida;
    }

    const numInicio = fechaANumero(dateInicio);
    const numFin = fechaANumero(dateFin);

    // Margen adyacente de 1 día antes y 1 día después para atrapar cortes de frontera
    const dMin = new Date(dateInicio.getTime());
    dMin.setDate(dMin.getDate() - 1);
    const numAdyMin = fechaANumero(dMin);

    const dMax = new Date(dateFin.getTime());
    dMax.setDate(dMax.getDate() + 1);
    const numAdyMax = fechaANumero(dMax);

    // 2. Guías presentes en 2_PRE_FACTURA
    const dataPre = hPre.getDataRange().getValues();
    const guiasEnPreFactura = new Set();
    for (let i = 1; i < dataPre.length; i++) {
      const g = String(dataPre[i][0] || "").trim();
      if (g) guiasEnPreFactura.add(g);
    }

    // 3. Conectar a "2025 Tabla de facturacion QRO 2.0" y revisar "Ruta Backend"
    const ssFacturacion = SpreadsheetApp.openById(ID_TABLA_FACTURACION_HISTORICA);
    let hojaFuente = ssFacturacion.getSheetByName("Ruta Backend") || 
                     ssFacturacion.getSheetByName("Ruta Back end") || 
                     ssFacturacion.getSheetByName("RUTA") || 
                     ssFacturacion.getSheets()[0];

    const dataFuente = hojaFuente.getDataRange().getValues();
    const cabF = dataFuente[0].map(h => String(h || "").toLowerCase().trim().replace(/[\s_]+/g, " "));

    const idxGuia = cabF.findIndex(h => h.indexOf("guia") !== -1 || h.indexOf("guía") !== -1);
    const idxCheckpoint = cabF.findIndex(h => h === "checkpoint" || h.indexOf("check") !== -1);
    const idxTipoServicio = cabF.findIndex(h => h.indexOf("tipo de servicio") !== -1 || h === "servicio");
    const idxTarifaBase = cabF.findIndex(h => h === "tarifa" || h === "costo");
    const idxPcs = cabF.findIndex(h => h === "piezas" || h === "#pcs");
    const idxTarifaPieza = cabF.findIndex(h => h.indexOf("tarifa por pieza") !== -1);
    const idxTarifaPeso = cabF.findIndex(h => h.indexOf("tarifa por peso") !== -1);
    const idxPesoMayor = cabF.findIndex(h => h.indexOf("peso mayor") !== -1);
    const idxFolio = cabF.findIndex(h => h.indexOf("folio") !== -1);

    const idxFechas = [];
    ["fecha en ruta", "fecha ruta", "fecha entrega", "fecha asignacion", "fecha"].forEach(cand => {
      const idx = cabF.findIndex(h => h === cand);
      if (idx !== -1 && idxFechas.indexOf(idx) === -1) idxFechas.push(idx);
    });

    const guiasDiferencia = [];
    const conteoDuplicadasEnFuente = new Map();
    let totalCobrablesEnRutaBackend = 0;
    let totalNoCobrablesEnRutaBackend = 0;
    let totalAdyacentes = 0;

    for (let r = 1; r < dataFuente.length; r++) {
      const row = dataFuente[r];
      const g = idxGuia !== -1 ? String(row[idxGuia] || "").trim() : "";
      if (!g || g.length < 5) continue;

      let fechaVal = null;
      for (let f of idxFechas) {
        if (row[f]) {
          const d = parsearFechaFlexible(row[f]);
          if (d) { fechaVal = d; break; }
        }
      }
      if (!fechaVal) continue;
      const numF = fechaANumero(fechaVal);

      // Solo analizar filas entre rango ampliado
      if (numF < numAdyMin || numF > numAdyMax) continue;

      const ckpt = idxCheckpoint !== -1 ? String(row[idxCheckpoint] || "").trim().toUpperCase() : "";
      const folioExistente = idxFolio !== -1 ? String(row[idxFolio] || "").trim() : "";
      const esEnRangoExacto = (numF >= numInicio && numF <= numFin);
      const esCkptCobrable = ["OK", "BA", "PU", "RD"].includes(ckpt);

      conteoDuplicadasEnFuente.set(g, (conteoDuplicadasEnFuente.get(g) || 0) + 1);
      const ocurrencia = conteoDuplicadasEnFuente.get(g);

      if (esEnRangoExacto && esCkptCobrable) {
        totalCobrablesEnRutaBackend++;
      } else if (esEnRangoExacto && !esCkptCobrable) {
        totalNoCobrablesEnRutaBackend++;
      } else {
        totalAdyacentes++;
      }

      const noEstaEnPre = !guiasEnPreFactura.has(g);
      const esDuplicada = ocurrencia > 1;

      // Si la guía YA ESTÁ en 2_PRE_FACTURA y no es un reintento cobrable extra, OMITIR para no meter ruido
      if (!noEstaEnPre && !esDuplicada) {
        continue;
      }

      // SOLO auditar casos que realmente impactan el cobro:
      // 1. Guías cobrables que NO están en 2_PRE_FACTURA
      // 2. Reintentos con estatus cobrable que podrían cobrarse doble
      if (esCkptCobrable && esEnRangoExacto) {
        let motivo = "";
        let cobrarSugerido = false;

        if (noEstaEnPre) {
          if (folioExistente && folioExistente.toLowerCase().indexOf("semana") !== -1) {
            motivo = "Tenía Folio previo escrito en Ruta Backend (" + folioExistente + ")";
          } else {
            motivo = "Guía Cobrable (" + ckpt + ") en Fecha (" + formatearFechaDDMMAAAA(fechaVal) + ") no procesada";
            cobrarSugerido = true;
          }
        } else if (esDuplicada) {
          motivo = "Segundo reparto cobrable en la misma semana (Ocurrencia #" + ocurrencia + ")";
          cobrarSugerido = true;
        }

        const piezas = idxPcs !== -1 ? (Number(row[idxPcs]) || 1) : 1;
        const tipoServ = idxTipoServicio !== -1 ? String(row[idxTipoServicio] || "Foraneo") : "Foraneo";
        let tarifa = tipoServ.toLowerCase().indexOf("remoto") !== -1 ? 100 : 65;
        if (idxTarifaBase !== -1 && Number(row[idxTarifaBase]) > 0) tarifa = Number(row[idxTarifaBase]);

        let tpz = piezas > 1 ? (piezas - 1) * 5 : 0;
        let tpw = 0;
        if (idxTarifaPeso !== -1 && Number(row[idxTarifaPeso]) > 0) tpw = Number(row[idxTarifaPeso]);
        else if (idxPesoMayor !== -1 && Number(row[idxPesoMayor]) > 0) tpw = Math.round(Number(row[idxPesoMayor])) * 2.5;

        guiasDiferencia.push([
          cobrarSugerido,
          g,
          formatearFechaDDMMAAAA(fechaVal),
          ckpt,
          tipoServ,
          piezas,
          tpz,
          tpw,
          tarifa + tpz + tpw,
          motivo
        ]);
      }
    }

    // 4. Crear o limpiar pestaña de Auditoría Hermes
    let hHermes = ss.getSheetByName("🕵️_AUDITORIA_HERMES") || ss.insertSheet("🕵️_AUDITORIA_HERMES");
    hHermes.clear();

    hHermes.getRange("A1:J1").merge()
      .setValue("🕵️ INFORME DE AUDITORÍA HERMES: CORTE " + formatearFechaDDMMAAAA(dateInicio) + " AL " + formatearFechaDDMMAAAA(dateFin))
      .setFontWeight("bold").setFontSize(13).setBackground("#202124").setFontColor("#ffffff")
      .setHorizontalAlignment("center");

    const cabH = [
      "¿COBRAR? [X]", "GUIA", "FECHA", "CHECKPOINT", "TIPO_REPARTO",
      "PIEZAS", "TARIFA_PIEZA", "TARIFA_PESO", "IMPORTE_TOTAL", "DIAGNÓSTICO_HERMES"
    ];
    hHermes.getRange(3, 1, 1, cabH.length).setValues([cabH])
      .setFontWeight("bold").setBackground("#fbbc04").setFontColor("#202124");

    if (guiasDiferencia.length > 0) {
      hHermes.getRange(4, 1, guiasDiferencia.length, cabH.length).setValues(guiasDiferencia);
      hHermes.getRange(4, 1, guiasDiferencia.length, 1).insertCheckboxes();
      hHermes.getRange(4, 7, guiasDiferencia.length, 3).setNumberFormat("$#,##0.00");
    }

    // Mensaje en pantalla
    let alertMsg = "🕵️ INFORME DEL AGENTE HERMES:\n\n";
    alertMsg += "• Corte Auditado: del " + formatearFechaDDMMAAAA(dateInicio) + " al " + formatearFechaDDMMAAAA(dateFin) + "\n";
    alertMsg += "• Guías calculadas en Tiempo 1 (2_PRE_FACTURA): " + guiasEnPreFactura.size + "\n";
    alertMsg += "• Guías con Checkpoints Cobrables en Ruta Backend: " + totalCobrablesEnRutaBackend + "\n";
    alertMsg += "• Guías con Checkpoints No Cobrables (NH, CA, etc.): " + totalNoCobrablesEnRutaBackend + "\n";
    alertMsg += "• Guías en fechas borde (día antes / después): " + totalAdyacentes + "\n\n";
    alertMsg += "👉 Se han desglosado " + guiasDiferencia.length + " casos en la pestaña '🕵️_AUDITORIA_HERMES'.\n";
    alertMsg += "Revisa las casillas y diagnósticos para ver exactamente qué guías marcan la diferencia.";

    ui.alert('🕵️ Auditoría Hermes Finalizada', alertMsg, ui.ButtonSet.OK);

  } catch (err) {
    ui.alert('❌ Error en Auditoría Hermes: ' + err.toString());
  }
}

