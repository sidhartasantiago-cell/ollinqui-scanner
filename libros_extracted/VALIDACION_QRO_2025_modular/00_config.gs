/**
 * 🏛️ TLACHIALONI & AMOXCALLI QRO - AUTOMATIZACIONES Y CONTROL (v70.0 PROD)
 * Ecosistema OLLIN - Arauto Express Querétaro
 *
 * SCRIPT PRINCIPAL DE RESPALDO Y MONITOREO DE RAMPA Y CALLE
 * Alojar en: Google Apps Script de VALIDACIÓN_QRO_2025
 */

// IDs de Infraestructura del Ecosistema OLLIN
const ID_BD_APP_RUTA_2025 = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w"; // Base de AppSheet / Pochtecas
const ID_BOVEDA_BATCH_MAESTRO = "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw"; // Amoxcalli Almacén (Matriz CP, RAW)
const ID_BD_CENTRAL_2023 = "1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8"; // Amoxcalli Operativo histórico

const EMAIL_ADMIN_IRVIN = "irvin.reyes@arauto.express";

const VALIDACION_QRO_HEADERS = [
  "Guia", "PID", "C.P.", "Piezas", "Rcvr Addr 1",
  "Rcvr Addr 2", "Rcvr Addr 3", "Receiver Name", "GPS", "Checkpoint",
  "Comentarios", "Fecha asignación", "Fecha en ruta", "Imagen fachada",
  "ID correo", "EDD", "KEY", "Tipo de servicio", "Inter", "Firma",
  "Telefono", "Hora de llegada", "Aprobación Auditor", "Motivo de Rechazo",
  "Marca de Tiempo"
];

const RECOLECCIONES_VALIDACION_HEADERS = [
  "ID_PU", "ID_Booking", "Cliente_Remitente", "Direccion", "CP",
  "Chofer_Asignado", "Estatus_PU", "Pzs_Estimadas", "Pzs_Reales",
  "Firma_Remitente", "Foto_Evidencia", "Motivo_Incidencia", "Check_In_GPS",
  "Timestamp_PU", "Hora de llegada a Validación", "Aprobación Auditor",
  "Motivo de Rechazo", "Marca de Tiempo (Inyección)"
];

function obtenerIndicesEsquema_(sheet, headers) {
  if (sheet.getLastColumn() !== headers.length) {
    throw new Error("La hoja " + sheet.getName() + " debe conservar exactamente " + headers.length + " columnas.");
  }

  const indexes = getColumnIndexes(sheet, headers);
  const schemaIsOrdered = headers.every((header, index) => indexes[header] === index);
  if (!schemaIsOrdered) {
    throw new Error("El esquema u orden de columnas no coincide con el contrato de " + sheet.getName() + ".");
  }
  return indexes;
}

/**
 * 🌐 SERVIDOR DE INTERFAZ WEB (TLACHIALONI QRO)
 * Sirve la Consola Unificada (v70.0 PROD - Rampa e Incidencias Sierra Gorda)
 */
