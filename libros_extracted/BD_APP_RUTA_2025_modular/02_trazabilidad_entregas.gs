/**
 * Actualiza exclusivamente las columnas de escaneo y estado del PID localizado.
 * No cambia identificadores ni agrega, borra o reordena columnas.
 */
function actualizarEscaneoPID_(sheet, pidRaw, estatusValidacion) {
  var data = sheet.getDataRange().getValues();
  if (!data.length) {
    throw new Error("La hoja PIEZAS_PID no contiene encabezados.");
  }

  var pidIndex = obtenerIndiceUnicoEncabezado_(sheet, BD_APP_RUTA_CONFIG.pidHeaders, "PID");
  var scanIndex = obtenerIndiceUnicoEncabezado_(
    sheet,
    BD_APP_RUTA_CONFIG.scanStatusHeaders,
    "Escaneo_Validacion"
  );
  var statusIndex = obtenerIndiceUnicoEncabezado_(
    sheet,
    BD_APP_RUTA_CONFIG.pidStatusHeaders,
    "Estatus_PID",
    false
  );
  var soughtPid = sanitizarPIDParaBoveda(pidRaw);
  var matchingRow = -1;

  for (var rowIndex = 1; rowIndex < data.length; rowIndex++) {
    var cellPid = data[rowIndex][pidIndex];
    if (cellPid === null || cellPid === undefined || String(cellPid).trim() === "") {
      continue;
    }
    if (sanitizarPIDParaBoveda(cellPid) === soughtPid) {
      if (matchingRow !== -1) {
        return { status: "ambiguous" };
      }
      matchingRow = rowIndex + 1;
    }
  }

  if (matchingRow === -1) {
    return { status: "not_found" };
  }

  sheet.getRange(matchingRow, scanIndex + 1).setValue(estatusValidacion);
  if (statusIndex !== -1) {
    sheet.getRange(matchingRow, statusIndex + 1).setValue("OK");
  }
  return {
    status: "success",
    pid: formatearPIDParaRuta_(pidRaw),
    row: matchingRow
  };
}
