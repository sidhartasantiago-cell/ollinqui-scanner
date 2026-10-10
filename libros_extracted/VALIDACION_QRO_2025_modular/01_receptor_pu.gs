/**
 * 🏛️ CEREBRO DE RECEPCIÓN ASÍNCRONA QRO (OLLIN v41.0 PROD)
 * 🚀 Webhook Receptor para el Ecosistema Ollinqui (Querétaro)
 * 📋 Procesa las recolecciones (Pickups) directo en VALIDACIÓN_QRO_2025
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lockAcquired = lock.tryLock(30000);
    if (!lockAcquired) {
      return ContentService.createTextOutput(JSON.stringify({
        exito: false,
        error: "El sistema está ocupado; intenta de nuevo."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Validamos que la solicitud contenga datos
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        exito: false,
        error: "⚠️ Solicitud vacía o sin cuerpo JSON."
      })).setMimeType(ContentService.MimeType.JSON);
    }
   
    // Parseamos el JSON recibido desde AppSheet (Ollinqui)
    const parsedPayload = safeJsonParse(e.postData.contents);
    if (!parsedPayload.ok) {
      return ContentService.createTextOutput(JSON.stringify({
        exito: false,
        error: "El JSON de la solicitud es inválido: " + parsedPayload.error
      })).setMimeType(ContentService.MimeType.JSON);
    }
    if (!parsedPayload.value || typeof parsedPayload.value !== "object" || Array.isArray(parsedPayload.value)) {
      return ContentService.createTextOutput(JSON.stringify({
        exito: false,
        error: "El cuerpo de la solicitud debe ser un objeto JSON."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    const datos = parsedPayload.value;
   
    // Obtenemos la hoja de cálculo activa
    const libro = SpreadsheetApp.getActiveSpreadsheet();
    let hojaPU = libro.getSheetByName("RECOLECCIONES_VALIDACION");
   
    // Si por alguna razón la hoja no existe, la creamos en caliente con sus encabezados estandarizados
    if (!hojaPU) {
      hojaPU = libro.insertSheet("RECOLECCIONES_VALIDACION");
      hojaPU.getRange(1, 1, 1, RECOLECCIONES_VALIDACION_HEADERS.length)
        .setValues([RECOLECCIONES_VALIDACION_HEADERS]);
      hojaPU.getRange(1, 1, 1, RECOLECCIONES_VALIDACION_HEADERS.length)
            .setBackground("#0d2c54") // Azul Cobalto
            .setFontColor("#ffffff")
            .setFontWeight("bold");
    }
    const pickupColumns = obtenerIndicesEsquema_(hojaPU, RECOLECCIONES_VALIDACION_HEADERS);
   
    // Extraemos las variables del JSON mapeado
    const idPU = datos.id_pu ? datos.id_pu.toString().trim() : "";
    const idBooking = datos.id_booking ? datos.id_booking.toString().trim() : "";
    const remitente = datos.remitente ? datos.remitente.toString().trim() : "";
    const direccion = datos.direccion ? datos.direccion.toString().trim() : "";
    const cp = datos.cp ? datos.cp.toString().trim() : "";
    const chofer = datos.chofer ? datos.chofer.toString().trim() : "";
    const estatus = datos.estatus ? datos.estatus.toString().trim() : "";
    const pzsEstimadas = datos.piezas_estimadas ? parseInt(datos.piezas_estimadas, 10) || 0 : 0;
    const pzsReales = datos.piezas_reales ? parseInt(datos.piezas_reales, 10) || 0 : 0;
    const firma = datos.firma ? datos.firma.toString().trim() : "";
    const evidencia = datos.evidencia ? datos.evidencia.toString().trim() : "";
    const motivo = datos.motivo ? datos.motivo.toString().trim() : "";
    const gps = datos.gps ? datos.gps.toString().trim() : "";
    const timestampPU = datos.timestamp ? datos.timestamp.toString().trim() : "";
   
    // Si no trae ID de recolección (ID_PU), abortamos por seguridad
    if (idPU === "") {
      return ContentService.createTextOutput(JSON.stringify({
        exito: false,
        error: "⚠️ ID_PU (ID de Recolección) no especificado o nulo."
      })).setMimeType(ContentService.MimeType.JSON);
    }
   
    // Obtenemos marcas de tiempo del servidor de oficina
    const fechaHoy = new Date();
    const horaServidor = Utilities.formatDate(fechaHoy, "America/Mexico_City", "dd/MM/yyyy HH:mm:ss");
   
    // Estructuramos la fila para inyectar (Columnas A a R)
    const nuevaFila = [
      idPU,          // A: ID_PU
      idBooking,     // B: ID_Booking
      remitente,     // C: Cliente_Remitente
      direccion,     // D: Direccion
      cp,            // E: CP
      chofer,        // F: Chofer_Asignado
      estatus,       // G: Estatus_PU
      pzsEstimadas,  // H: Pzs_Estimadas
      pzsReales,     // I: Pzs_Reales
      firma,         // J: Firma_Remitente
      evidencia,     // K: Foto_Evidencia
      motivo,        // L: Motivo_Incidencia
      gps,           // M: Check_In_GPS
      timestampPU,   // N: Timestamp_PU
      horaServidor,  // O: Hora de llegada a Validación
      false,         // P: Aprobación Auditor (Casilla por aprobar en FALSE)
      "",            // Q: Motivo de Rechazo (Vacío por default)
      fechaHoy       // R: Marca de Tiempo (Inyección)
    ];
   
    // --- ESCUDO ANTI-DUPLICADOS Y "ECOS" DE APPSHEET ---
    // Buscamos si ya existe el ID_PU en la columna A
    const ultimaFila = hojaPU.getLastRow();
    let filaEncontrada = -1;
   
    if (ultimaFila > 1) {
      const rangoIDs = hojaPU.getRange(2, pickupColumns.ID_PU + 1, ultimaFila - 1, 1).getValues();
      for (let i = 0; i < rangoIDs.length; i++) {
        if (rangoIDs[i].toString().trim() === idPU) {
          filaEncontrada = i + 2; // +2 por la fila de encabezados y el desfase de índice
          break;
        }
      }
    }
   
    let accionRealizada = "";
    if (filaEncontrada !== -1) {
      // Si la recolección ya existe, la sobrescribimos (Evita duplicados por re-intentos de red o ecos) [5]
      // Mantenemos el estado de Aprobación de oficina si ya fue auditada por Irvin
      const aprobacionExistente = hojaPU.getRange(filaEncontrada, pickupColumns["Aprobación Auditor"] + 1).getValue();
      const motivoRechazoExistente = hojaPU.getRange(filaEncontrada, pickupColumns["Motivo de Rechazo"] + 1).getValue();
     
      nuevaFila[pickupColumns["Aprobación Auditor"]] = aprobacionExistente;
      nuevaFila[pickupColumns["Motivo de Rechazo"]] = motivoRechazoExistente;
     
      hojaPU.getRange(filaEncontrada, 1, 1, nuevaFila.length).setValues([nuevaFila]);
      accionRealizada = "SOBREESCRITA (Protección anti-duplicación)";
    } else {
      // Si es un registro nuevo, lo inyectamos al final de la hoja
      hojaPU.appendRow(nuevaFila);
      // Aplicamos formato de Checkbox de manera nativa a la columna P (Aprobación Auditor) de la nueva fila [6]
      const filaNuevaIndex = hojaPU.getLastRow();
      hojaPU.getRange(filaNuevaIndex, pickupColumns["Aprobación Auditor"] + 1).insertCheckboxes();
      accionRealizada = "INYECTADA";
    }
   
    return ContentService.createTextOutput(JSON.stringify({
      exito: true,
      mensaje: "✅ Recolección " + idPU + " " + accionRealizada + " exitosamente en VALIDACIÓN_QRO_2025.",
      detalles: {
        id_pu: idPU,
        booking: idBooking,
        estatus: estatus,
        pzs_reales: pzsReales,
        chofer: chofer,
        accion: accionRealizada
      }
    })).setMimeType(ContentService.MimeType.JSON);
   
  } catch(error) {
    // Si algo colapsa, reportamos el error de forma segura en el JSON
    return ContentService.createTextOutput(JSON.stringify({
      exito: false,
      error: "❌ Error crítico en el Servidor Webhook de Validación: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
   
  } finally {
    // Liberamos el bloqueo de Apps Script para el siguiente Pochteca
    if (lockAcquired) lock.releaseLock();
  }
}
