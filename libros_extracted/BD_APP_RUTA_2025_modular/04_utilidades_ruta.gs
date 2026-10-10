/**
 * Resuelve aliases contra encabezados existentes sin asumir posiciones fijas.
 */
function obtenerIndiceUnicoEncabezado_(sheet, aliases, nombreLogico, requerido) {
  var indexes = getColumnIndexes(sheet, aliases);
  var found = aliases.filter(function(alias) {
    return indexes[alias] !== -1;
  });

  if (found.length > 1) {
    throw new Error("Hay encabezados ambiguos para " + nombreLogico + ": " + found.join(", "));
  }
  if (found.length === 0) {
    if (requerido === false) {
      return -1;
    }
    throw new Error("Falta el encabezado requerido para " + nombreLogico + ".");
  }
  return indexes[found[0]];
}

/**
 * Compara PIDs en su forma canónica JD y devuelve la representación de campo JJD.
 */
function formatearPIDParaRuta_(pidRaw) {
  var pidBoveda = sanitizarPIDParaBoveda(pidRaw);
  return pidBoveda.indexOf("JD") === 0
    ? "JJD" + pidBoveda.substring(2)
    : pidBoveda;
}

function generarRespuestaJSON(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
