/**
 * Recibe escaneos de rampa y actualiza el estado de validacion del PID.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || typeof e.postData.contents !== "string") {
      return generarRespuestaJSON({
        status: "error",
        message: "Error: La solicitud debe incluir un cuerpo JSON."
      });
    }

    var parsed = safeJsonParse(e.postData.contents);
    if (!parsed.ok) {
      return generarRespuestaJSON({
        status: "error",
        message: "Error: El JSON de la solicitud es inválido."
      });
    }

    var params = parsed.value;
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return generarRespuestaJSON({
        status: "error",
        message: "Error: El cuerpo JSON debe ser un objeto."
      });
    }

    var pid = params.pid === null || params.pid === undefined
      ? ""
      : String(params.pid).trim();
    if (!pid) {
      return generarRespuestaJSON({
        status: "error",
        message: "Error: El parámetro PID es requerido."
      });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(BD_APP_RUTA_CONFIG.sheetName);
    if (!sheet) {
      return generarRespuestaJSON({
        status: "error",
        message: "Error: No se encontró la pestaña PIEZAS_PID."
      });
    }

    var resultado = actualizarEscaneoPID_(
      sheet,
      pid,
      params.estatus || BD_APP_RUTA_CONFIG.defaultScanStatus
    );
    if (resultado.status === "not_found") {
      return generarRespuestaJSON({
        status: "not_found",
        message: "Aviso: El bulto JJD no existe en la base. Requiere carga manual."
      });
    }
    if (resultado.status === "ambiguous") {
      return generarRespuestaJSON({
        status: "error",
        message: "Error: El PID aparece en más de una fila; no se actualizó."
      });
    }

    return generarRespuestaJSON({
      status: "success",
      message: "Bulto validado correctamente en rampa.",
      pid: resultado.pid,
      fila: resultado.row
    });
  } catch (err) {
    return generarRespuestaJSON({
      status: "error",
      message: "Excepción en el servidor: " + err.toString()
    });
  }
}

/**
 * Se conserva como respuesta auxiliar; Apps Script no expone doOptions como trigger web.
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
