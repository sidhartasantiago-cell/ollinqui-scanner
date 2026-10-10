// Funciones de lectura, despacho y trazabilidad de la consola QRO.
function autoAsignarPochtecaPorCP(cp) {
  if (!cp) return "sin_asignar@arauto.express";
  try {
    const boveda = SpreadsheetApp.openById(ID_BOVEDA_BATCH_MAESTRO);
    const hojaMatriz = boveda.getSheetByName("MATRIZ_CP");
    if (!hojaMatriz) return "sin_asignar@arauto.express";
    const datos = hojaMatriz.getDataRange().getValues();
    for (let i = 1; i < datos.length; i++) {
      if (String(datos[i][0]).trim() === cp.toString().trim()) {
        const chofer = String(datos[i][1]).trim();
        return chofer || "sin_asignar@arauto.express";
      }
    }
  } catch(e) {
    Logger.log("Error en lectura de Matriz CP: " + e.message);
  }
  return "sin_asignar@arauto.express";
}

/**
 * 4️⃣ SECCIÓN COMÚN: CATÁLOGO DE POCHTECAS MÓVIL
 */

function obtenerChoferesQRO() {
  try {
    const baseApp = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    const hojaChoferes = baseApp.getSheetByName("CAT_USUARIOS");
    if (hojaChoferes) {
      const datos = hojaChoferes.getDataRange().getValues();
      const lista = [];
      for (let i = 1; i < datos.length; i++) {
        const correo = datos[i][0];
        const nombre = datos[i][1];
        const rol = datos[i][2];
        if (correo && nombre && String(rol).toUpperCase() === "POCHTECA") {
          lista.push({ nombre: nombre.trim(), correo: correo.trim() });
        }
      }
      if (lista.length > 0) return lista;
    }
  } catch(e) {
    Logger.log("Error al obtener choferes: " + e.message);
  }
  return [];
}

/**
 * 5️⃣ SECCIÓN COMÚN: MONITOR CALLE EN VIVO (Últimos 150 Registros de Validación)
 * Esta función es la que alimenta la consola web unificada en caliente.
 */

function obtenerEntregasActivasQRO() {
  try {
    const libroLocal = SpreadsheetApp.getActiveSpreadsheet();
    const hojaValidacion = libroLocal.getSheets()[0];
    const validationColumns = hojaValidacion
      ? obtenerIndicesEsquema_(hojaValidacion, VALIDACION_QRO_HEADERS)
      : null;
   
    // A. Leemos VALIDACIÓN_QRO_2025 (las que ya han sido visitadas o cargadas físicamente)
    let datosVal = [];
    if (hojaValidacion && hojaValidacion.getLastRow() > 1) {
      const vLast = hojaValidacion.getLastRow();
      const vStart = Math.max(2, vLast - 299); // Leemos las últimas 300 para mayor visibilidad en pruebas
      const vTotal = vLast - vStart + 1;
      datosVal = hojaValidacion.getRange(vStart, 1, vTotal, VALIDACION_QRO_HEADERS.length).getValues();
    }
   
    // B. Leemos BD_APP_RUTA_2025 - GUIAS_ASIGNADAS (las preasignaciones de rampa del día en AppSheet)
    let datosApp = [];
    let mapGuiaPIDs = {};
    try {
      const baseApp = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
      const hojaApp = baseApp.getSheetByName("GUIAS_ASIGNADAS");
      if (hojaApp && hojaApp.getLastRow() > 1) {
        const aLast = hojaApp.getLastRow();
        const aStart = Math.max(2, aLast - 299);
        const aTotal = aLast - aStart + 1;
        datosApp = hojaApp.getRange(aStart, 1, aTotal, 8).getValues(); // 8 columnas
      }
     
      const hojaPiezas = baseApp.getSheetByName("PIEZAS_PID");
      if (hojaPiezas && hojaPiezas.getLastRow() > 1) {
        const pLast = hojaPiezas.getLastRow();
        const pStart = Math.max(2, pLast - 499); // Leemos las últimas 500 piezas para asociar PIDs preasignados
        const pTotal = pLast - pStart + 1;
        const datosPiezas = hojaPiezas.getRange(pStart, 1, pTotal, 2).getValues(); // Columnas A (Guia) y B (PID)
        datosPiezas.forEach(function(pRow) {
          const g = String(pRow[0]).trim();
          const p = String(pRow[1]).trim();
          if (g && p) {
            if (!mapGuiaPIDs[g]) {
              mapGuiaPIDs[g] = [];
            }
            mapGuiaPIDs[g].push(p);
          }
        });
      }
    } catch(errApp) {
      Logger.log("Error al leer preasignaciones/PIDs de App: " + errApp.message);
    }
   
    const mapUnificado = {};
   
    // C. Registrar preasignaciones de AppSheet como base del mapa
    datosApp.forEach(function(row) {
      const guia = String(row[0]).trim(); // Col A: Guía
      let destinatario = String(row[1]).trim(); // Col B: Destinatario
      const direccion = String(row[2]).trim(); // Col C: DireccionCompleta (que incluye C.P. concatenado en v61+)
      const edd = String(row[3]).trim(); // Col D: EDD
      const operador = String(row[4]).trim(); // Col E: Chofer
      const piezas = String(row[5]).trim(); // Col F: Total_Piezas
      const telefono = String(row[6]).trim(); // Col G: Teléfono
      const checkpoint = String(row[7]).trim(); // Col H: Estatus_Guia (Checkpoint "PENDIENTE")
     
      // Extraer C.P. de la dirección de forma robusta
      const cpMatch = direccion.match(/\(C\.P\.\s*(\d{5})\)/) || direccion.match(/\b\d{5}\b/);
      const cp = cpMatch ? cpMatch[1] : "S/CP";
     
      // Detectar si es internacional mediante el tag [INTER]
      let isInter = false;
      if (destinatario.indexOf("[INTER]") !== -1) {
        isInter = true;
        destinatario = destinatario.replace(" [INTER]", "").trim(); // Limpiar el nombre para que se vea limpio
      }
     
      // Obtenemos los PIDs asociados si existen en la hoja PIEZAS_PID de AppSheet
      const pidsAsociados = mapGuiaPIDs[guia] || [];
      const pidStr = pidsAsociados.length > 0 ? pidsAsociados.join(", ") : "";
     
      if (guia && guia !== "" && guia !== "Guia") {
        mapUnificado[guia] = {
          guia: guia,
          pid: pidStr, // Inyectamos la cadena unificada de PIDs reales asociados
          cp: cp,
          piezas: piezas || "1",
          destinatario: destinatario,
          checkpoint: checkpoint || "PENDIENTE",
          comentarios: "",
          fecha_asignacion: edd, // Usamos EDD o dejamos vacío
          fecha_en_ruta: "", // Se queda vacío en rampa hasta que sea validada físicamente
          imagen_fachada: "",
          operador: operador || "sin_asignar@arauto.express",
          inter: isInter ? "Inter" : "", // ¡Aquí se guarda el estatus de internacional!
          telefono: telefono || "", // ¡Mapeado seguro de teléfono de contacto!
          firma: "",
          timestamp: "",
          origen: "PREASIGNADO"
        };
      }
    });
   
    // D. Fusionar y sobreescribir con las guías procesadas en Validación real (calle/campo)
    datosVal.forEach(function(row) {
      const guia = String(row[validationColumns.Guia]).trim();
      const pid = String(row[validationColumns.PID]).trim();
      const cp = String(row[validationColumns["C.P."]]).trim();
      const piezas = String(row[validationColumns.Piezas]).trim();
      const destinatario = String(row[validationColumns["Receiver Name"]]).trim();
      const checkpoint = String(row[validationColumns.Checkpoint]).trim();
      const comentarios = String(row[validationColumns.Comentarios]).trim();
      const fecha_asignacion = String(row[validationColumns["Fecha asignación"]]).trim();
      const fecha_en_ruta = String(row[validationColumns["Fecha en ruta"]]).trim();
      const imagen_fachada = String(row[validationColumns["Imagen fachada"]]).trim();
      const operador = String(row[validationColumns["ID correo"]]).trim();
      const inter = String(row[validationColumns.Inter]).trim();
      const firma = String(row[validationColumns.Firma]).trim();
      const timestamp = String(row[validationColumns["Marca de Tiempo"]]).trim();
     
      let isInterVal = (inter && (inter.toUpperCase() === "I" || inter.toUpperCase().indexOf("INTER") !== -1));

      if (guia && guia !== "" && guia !== "Guia") {
        mapUnificado[guia] = {
          guia: guia,
          pid: pid || (mapUnificado[guia] ? mapUnificado[guia].pid : ""),
          cp: cp,
          piezas: piezas,
          destinatario: destinatario,
          checkpoint: checkpoint || "PENDIENTE",
          comentarios: comentarios,
          fecha_asignacion: fecha_asignacion || (mapUnificado[guia] ? mapUnificado[guia].fecha_asignacion : ""),
          fecha_en_ruta: fecha_en_ruta, // Fecha en ruta rellenada significa VALIDADA FÍSICAMENTE
          imagen_fachada: imagen_fachada,
          operador: operador || (mapUnificado[guia] ? mapUnificado[guia].operador : "sin_asignar@arauto.express"),
          inter: isInterVal ? "Inter" : (mapUnificado[guia] ? mapUnificado[guia].inter : ""),
          telefono: String(row[validationColumns.Telefono]).trim() || (mapUnificado[guia] ? mapUnificado[guia].telefono : ""),
          firma: firma,
          timestamp: timestamp,
          origen: mapUnificado[guia] ? "AMBOS" : "VALIDACION"
        };
      }
    });
   
    // E. Convertir el mapa unificado en la lista final de retorno
    const lista = [];
    for (let k in mapUnificado) {
      lista.push(mapUnificado[k]);
    }
    return lista;
  } catch(e) {
    Logger.log("Error en obtenerEntregasActivasQRO: " + e.message);
    return [];
  }
}

function obtenerPickupsActivosQRO() {
  try {
    const libroLocal = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPU = libroLocal.getSheetByName("RECOLECCIONES_VALIDACION");
    if (!hojaPU) return [];
    const pickupColumns = obtenerIndicesEsquema_(hojaPU, RECOLECCIONES_VALIDACION_HEADERS);
    const ultimaFila = hojaPU.getLastRow();
    if (ultimaFila < 2) return [];
    const filaInicio = Math.max(2, ultimaFila - 49);
    const totalFilas = ultimaFila - filaInicio + 1;
    const datos = hojaPU.getRange(filaInicio, 1, totalFilas, RECOLECCIONES_VALIDACION_HEADERS.length).getValues();
    const lista = [];
    for (let i = datos.length - 1; i >= 0; i--) {
      const fila = datos[i];
      if (fila && String(fila[0]).trim() !== "") {
        lista.push({
          id_pu: String(fila[pickupColumns.ID_PU]),
          id_booking: String(fila[pickupColumns.ID_Booking]),
          remitente: String(fila[pickupColumns.Cliente_Remitente]),
          direccion: String(fila[pickupColumns.Direccion]),
          cp: String(fila[pickupColumns.CP]),
          chofer: String(fila[pickupColumns.Chofer_Asignado]),
          estatus: String(fila[pickupColumns.Estatus_PU]),
          hora_llegada: String(fila[pickupColumns["Hora de llegada a Validación"]])
        });
      }
    }
    return lista;
  } catch(e) {
    Logger.log("Error en obtenerPickups: " + e.message);
  }
  return [];
}

/**
 * 6️⃣ INTERFAZ WEB AUXILIAR: BUSCAR RECIENTES PROCESADOS EN GMAIL (Soporte Dual)
 */

function buscarCorreosBatchQRO() {
  try {
    const lista = [];
    const processedThreadIds = {};
   
    // Usamos GmailApp.search para evadir el caché del objeto de etiqueta y obtener resultados 100% en tiempo real
    const threads = GmailApp.search("label:02_REPORTE_QRO OR label:01_QUERY_QRO", 0, 15);
    threads.forEach(function(t) {
      const lastMsg = t.getMessages().pop();
      const tId = t.getId();
      if (!processedThreadIds[tId]) {
        processedThreadIds[tId] = true;
        const labels = t.getLabels().map(function(l) { return l.getName(); });
       
        let tipo = "REPORTE";
        let tieneEtiquetaActiva = false;
        labels.forEach(function(l) {
          const uLabel = l.toUpperCase();
          if (uLabel.indexOf("01_QUERY_QRO") !== -1) {
            tipo = "QUERY";
            tieneEtiquetaActiva = true;
          }
          if (uLabel.indexOf("02_REPORTE_QRO") !== -1) {
            tipo = "REPORTE";
            tieneEtiquetaActiva = true;
          }
        });

        // Solo agregar si la etiqueta sigue físicamente activa en el correo para evitar correos procesados huérfanos
        if (tieneEtiquetaActiva) {
          lista.push({
            subject: lastMsg.getSubject(),
            sender: lastMsg.getFrom().split("<")[0].replace(/"/g, "").trim(),
            date: lastMsg.getDate().toLocaleDateString("es-MX"),
            isUnread: t.isUnread(),
            tipo: tipo,
            id: lastMsg.getId()
          });
        }
      }
    });
   
    return lista.slice(0, 15);
  } catch(e) {
    Logger.log("Error en buscarCorreosBatchQRO: " + e.message);
    return [];
  }
}

/**
 * 7️⃣ RECEPCIÓN IA: DESPACHAR BOOKINGS EXTRAÍDOS HACIA CAMPO (Inyección Dual Atómica)
 */

function ejecutarDespachoBookingACampo(payloadJson) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lockAcquired = lock.tryLock(30000);
    if (!lockAcquired) throw new Error("No se pudo obtener el bloqueo de red. Intenta de nuevo.");
   
    const parsedPayload = safeJsonParse(payloadJson);
    if (!parsedPayload.ok || !parsedPayload.value || typeof parsedPayload.value !== "object" || Array.isArray(parsedPayload.value)) {
      throw new Error("El payload de despacho no contiene un objeto JSON válido.");
    }
    const datos = parsedPayload.value;
    const idBookingLimpio = String(datos.id_booking).trim();
    const idPU = "PU-" + Math.random().toString(36).substr(2, 8).toUpperCase();
    const fechaHoy = new Date();
    const horaServidor = fechaHoy.toLocaleTimeString();
   
    const libroLocal = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPU = libroLocal.getSheetByName("RECOLECCIONES_VALIDACION");
    if (!hojaPU) throw new Error("No se encontró la hoja 'RECOLECCIONES_VALIDACION'.");
    obtenerIndicesEsquema_(hojaPU, RECOLECCIONES_VALIDACION_HEADERS);
   
    hojaPU.appendRow([
      idPU,
      idBookingLimpio,
      datos.remitente,
      datos.direccion,
      datos.cp,
      datos.chofer,
      "PENDIENTE",
      datos.piezas_estimadas,
      0, "", "", "", "", "",
      horaServidor,
      false, "",
      fechaHoy
    ]);
   
    const libroApp = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    const hojaAppPU = libroApp.getSheetByName("RECOLECCIONES_ASIGNADAS");
    if (!hojaAppPU) throw new Error("No se encontró la pestaña 'RECOLECCIONES_ASIGNADAS' en la base de la App.");
   
    hojaAppPU.appendRow([
      idPU,
      idBookingLimpio,
      datos.remitente,
      datos.direccion,
      datos.cp,
      "08:00",
      "17:00",
      datos.chofer,
      "PENDIENTE",
      datos.piezas_estimadas,
      "", "", "", "", "", ""
    ]);
   
    // Registrar evento en LOG_TRAZABILIDAD
    registrarTrazabilidadQRO("DESPACHO RECOLECCION", idBookingLimpio, datos.piezas_estimadas, datos.chofer, "PENDIENTE");
   
    return { exito: true, id_pu: idPU };
  } catch(err) {
    return { exito: false, error: err.message };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

/**
 * Forzar actualización de permisos y variables de rampa unificada
 */

function forzarPermisosBasicos() {
  const ssName = SpreadsheetApp.getActiveSpreadsheet().getName();
  Logger.log("Iniciando permisos unificados para: " + ssName);
}


/**
 * 8️⃣ AUDITORÍA DE OPERACIONES: REGISTRAR EN LOG_TRAZABILIDAD (BOVEDA_BATCH_MAESTRO)
 * Inyecta una fila de auditoría inmutable cada vez que ocurre un evento clave en el sistema.
 */

function registrarTrazabilidadQRO(accion, guia, piezas, chofer, estatus) {
  try {
    const boveda = SpreadsheetApp.openById(ID_BOVEDA_BATCH_MAESTRO);
    const hojaLog = boveda.getSheetByName("LOG_TRAZABILIDAD");
    if (!hojaLog) {
      Logger.log("No se encontró la pestaña 'LOG_TRAZABILIDAD' en BOVEDA_BATCH_MAESTRO.");
      return;
    }
   
    const fechaHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT-6", "dd/MM/yyyy HH:mm:ss");
    const usuario = Session.getActiveUser().getEmail() || EMAIL_ADMIN_IRVIN;
   
    hojaLog.appendRow([
      fechaHora,     // Col A: Fecha y Hora
      usuario,       // Col B: Usuario operador
      accion,        // Col C: Acción ejecutada
      guia || "",    // Col D: Guía HWB
      piezas || 0,   // Col E: Cantidad de piezas/PIDs
      chofer || "",  // Col F: Chofer asignado
      estatus || ""  // Col G: Estatus operativo
    ]);
    Logger.log("✅ Registro de trazabilidad añadido: " + accion);
  } catch(e) {
    Logger.log("⚠️ Error de trazabilidad: " + e.message);
  }
}
