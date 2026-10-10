// Procesa consultas de Gmail y extrae contactos de los correos de DHL.
function procesarQueriesQRO() {
  const executionLogs = [];
  function log(msg) {
    const time = new Date().toLocaleTimeString("es-MX");
    executionLogs.push("[" + time + "] " + msg);
  }

  log("⚙️ Iniciando escaneo de Queries pendientes en Gmail...");
  const labelQuery = obtenerEtiquetaPorNombre("01_QUERY_QRO");
  if (!labelQuery) {
    log("⚠️ No se localizó la etiqueta '01_QUERY_QRO' en tu buzón.");
    return { exito: false, error: "La etiqueta de Queries no existe.", logs: executionLogs };
  }

  const hilos = labelQuery.getThreads(0, 15);
  if (hilos.length === 0) {
    log("📭 No hay correos de Queries no leídos en la etiqueta.");
    return { exito: false, mensaje: "No hay Queries pendientes en Gmail.", logs: executionLogs };
  }

  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) {
      log("❌ No se pudo adquirir el bloqueo de red. Sistema ocupado.");
      return { exito: false, error: "El sistema está ocupado procesando otra solicitud.", logs: executionLogs };
    }

    const baseApp = SpreadsheetApp.openById(ID_BD_APP_RUTA_2025);
    const hojaGuiasApp = baseApp.getSheetByName("GUIAS_ASIGNADAS") || baseApp.getSheetByName("RECOLECCIONES_ASIGNADAS");
    if (!hojaGuiasApp) {
      log("❌ ERROR: No se encontró la hoja de guías en la base de datos.");
      return { exito: false, error: "No se encontró la pestaña de guías asignadas.", logs: executionLogs };
    }

    const datosGuias = hojaGuiasApp.getDataRange().getValues();
    let totalActualizados = 0;

    hilos.forEach(thread => {
      const msgs = thread.getMessages();
      const lastMsg = msgs[msgs.length - 1];
      const htmlBody = lastMsg.getBody();
      const plainTextBody = lastMsg.getPlainBody();

      const contactos = extraerContactosDeQuery(htmlBody, plainTextBody);
      const llaves = Object.keys(contactos);
      let hwbEncontradosEnEsteCorreo = 0;

      llaves.forEach(awb => {
        const tel = contactos[awb];
        let encontrado = false;
        for (let j = 1; j < datosGuias.length; j++) {
          const guiaSheet = String(datosGuias[j][0]).trim();
          if (normalizarAwb_QRO(guiaSheet) === normalizarAwb_QRO(awb)) {
            // Actualizar columna G (tel_destinatario)
            hojaGuiasApp.getRange(j + 1, 7).setValue(tel.toString());
            totalActualizados++;
            hwbEncontradosEnEsteCorreo++;
            encontrado = true;
            log("✅ Guía " + awb + " asociada con el teléfono: " + tel);
          }
        }
        if (!encontrado) {
          log("⚠️ Guía " + awb + " descifrada pero NO encontrada en la base de la App.");
        }
      });

      if (hwbEncontradosEnEsteCorreo > 0 || llaves.length === 0) {
        thread.markRead();
        try {
          thread.removeLabel(labelQuery);
          log("🧹 Hilo de Query procesado con éxito y des-etiquetado.");
        } catch(eLabel) {
          log("⚠️ Advertencia al remover etiqueta de Query: " + eLabel.message);
        }
      } else {
        log("⏳ Hilo de Query conservado en buzón (is:unread) en espera de que las guías se inyecten desde el Excel.");
      }
    });

    // Registrar evento en LOG_TRAZABILIDAD
    registrarTrazabilidadQRO("CRUCE QUERIES", "Multi-Guia", totalActualizados, "GMAIL", "ASOCIADO");
   
    return { exito: true, procesados: totalActualizados, mensaje: "Se asociaron e inyectaron " + totalActualizados + " teléfonos de QUERY.", logs: executionLogs };
  } catch (err) {
    log("❌ ERROR crítico durante la inyección de Query: " + err.message);
    return { exito: false, error: err.message, logs: executionLogs };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 🚀 FUNCIÓN GLOBAL UNIFICADA (v70.0 PROD - BOTÓN ÚNICO)
 */

function ejecutarProcesamientoUnificadoQRO() {
  const executionLogs = [];
  function log(msg) {
    const time = new Date().toLocaleTimeString("es-MX");
    executionLogs.push("[" + time + "] " + msg);
  }

  log("⚙️ Iniciando Ejecución Unificada del Ecosistema OLLIN...");
 
  let resultadoBatch;
  try {
    resultadoBatch = procesarBatchQRO();
    if (resultadoBatch.logs) {
      resultadoBatch.logs.forEach(l => executionLogs.push(l));
    }
  } catch (e) {
    log("❌ Error crítico en procesamiento de Batch: " + e.message);
    resultadoBatch = { exito: false, mensaje: e.message };
  }

  let resultadoQueries;
  try {
    resultadoQueries = procesarQueriesQRO();
    if (resultadoQueries.logs) {
      resultadoQueries.logs.forEach(l => executionLogs.push(l));
    }
  } catch (e) {
    log("❌ Error crítico en procesamiento de Queries: " + e.message);
    resultadoQueries = { exito: false, mensaje: e.message };
  }

  const exitoGlobal = resultadoBatch.exito || resultadoQueries.exito;
  let mensajeGlobal = "";
  if (resultadoBatch.exito && resultadoQueries.exito) {
    mensajeGlobal = "Éxito total: " + resultadoBatch.mensaje + " e " + resultadoQueries.mensaje;
  } else if (resultadoBatch.exito) {
    mensajeGlobal = "Éxito parcial de Batch: " + resultadoBatch.mensaje + " | Queries: " + (resultadoQueries.mensaje || "Sin cambios");
  } else if (resultadoQueries.exito) {
    mensajeGlobal = "Éxito parcial de Queries: " + resultadoQueries.mensaje + " | Batch: " + (resultadoBatch.mensaje || "Sin cambios");
  } else {
    mensajeGlobal = "No se procesaron registros nuevos (" + (resultadoBatch.mensaje || "Batch sin cambios") + " / " + (resultadoQueries.mensaje || "Queries sin cambios") + ")";
  }

  log("🏁 Ejecución unificada de rampa finalizada.");

  return {
    exito: exitoGlobal,
    mensaje: mensajeGlobal,
    logs: executionLogs
  };
}

/**
 * Obtiene un objeto GmailLabel buscando por coincidencia de nombre exacto o ruta anidada.
 */

function obtenerEtiquetaPorNombre(nombreLabel) {
  const labels = GmailApp.getUserLabels();
  for (let i = 0; i < labels.length; i++) {
    const labelName = labels[i].getName();
    if (labelName === nombreLabel || labelName.indexOf("/" + nombreLabel) !== -1) {
      return labels[i];
    }
  }
  return null;
}

/**
 * Descodifica cadenas codificadas en Quoted-Printable (Limpieza de caracteres de escape QP de red)
 */

function decodeQuotedPrintable(str) {
  if (!str) return "";
  // Unificar saltos de línea suaves de transferencia de red (DHL cortes de línea con '=')
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  str = str.replace(/=\n/g, "");
  // Reemplazar códigos de escape hexadecimales QP (=3D, =20, =09, etc.)
  return str.replace(/=([0-9A-F]{2})/gi, function(match, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

/**
 * Desencriptador maestro de transferencias MIME (Base64 y Quoted-Printable)
 */

function desencriptarQueryText(htmlBody, plainTextBody) {
  let textoBody = (plainTextBody || htmlBody || "").toString();
 
  // Detectar e interpretar si el texto completo viaja encriptado en Base64 puro
  if (/^[A-Za-z0-9+/=\s\r\n]{40,}$/.test(textoBody.trim().replace(/[\r\n\s]/g, ""))) {
    try {
      const decodedBytes = Utilities.base64Decode(textoBody.trim());
      textoBody = Utilities.newBlob(decodedBytes).getDataAsString("UTF-8");
    } catch(e) {
      // Si falla, conservar texto original para procesamiento fallback
    }
  }
 
  // Siempre procesar descodificación Quoted-Printable de forma preventiva
  textoBody = decodeQuotedPrintable(textoBody);
 
  return textoBody;
}

/**
 * Elimina las etiquetas HTML de un texto de manera robusta,
 * conservando los saltos de línea para el parser estructurado.
 */

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ");
}

function extraerContactosDeQuery(htmlBody, plainTextBody) {
  // Desencriptar y descodificar preventivamente flujos MIME
  const cuerpoDecodificado = desencriptarQueryText(htmlBody, plainTextBody);
 
  // Limpiar etiquetas HTML de forma robusta
  let textoLimpio = cuerpoDecodificado;
  if (!plainTextBody && htmlBody) {
    textoLimpio = stripHtml(cuerpoDecodificado);
  }
 
  // Colapsar múltiples espacios horizontales en un solo espacio horizontal,
  // y normalizar saltos de línea para poder procesar línea por línea.
  textoLimpio = textoLimpio.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
 
  const mapaContactos = {};
 
  // Split por cualquier variación de AWB, HWB, Waybill, etc. (case insensitive)
  const bloques = textoLimpio.split(/(?:A\s*W\s*B|H\s*W\s*B|W\s*a\s*y\s*b\s*i\s*l\s*l|G\s*u\s*í\s*a|G\s*u\s*i\s*a)/i);
  if (bloques.length <= 1) {
    return mapaContactos; // Retornar vacío si no hay bloques de guías
  }
 
  // Quitar el primer bloque (asunto o encabezado antes del primer AWB)
  bloques.shift();
 
  bloques.forEach(function(bloque) {
    // 1. Extraer la guía (los primeros 10 dígitos continuos permitiendo cualquier carácter no numérico antes de ellos)
    const guiaMatch = bloque.match(/^[^0-9]*(\d{10})/);
    if (guiaMatch) {
      const guia = normalizarAwb_QRO(guiaMatch[1]);
     
      // ESCUDO DE PROTECCIÓN CRÍTICA: No sobreescribir guías ya procesadas en el mismo correo (GEMA/OPUS trace tables)
      if (mapaContactos[guia]) {
        return; // Equivalente a continue en forEach. Mantiene intacto el teléfono real del cliente.
      }
     
      // 2. Extraer teléfonos usando la Regex de alta fidelidad de LEN
      const regexTel = /(?:P\s*h\s*o\s*n\s*e|T\s*e\s*l|C\s*o\s*n\s*t\s*a\s*c\s*t|M\s*o\s*b\s*i\s*l)[^0-9\+]*([\+\d][\d\s\-]{6,})/gi;
      let matchTel;
      const listaTels = [];
     
      while ((matchTel = regexTel.exec(bloque)) !== null) {
        const tel = matchTel[1].trim().split(/\s{2,}/)[0];
        if (tel.toUpperCase() !== "NOT SUPPLIED") {
          const cleanTel = limpiarYValidarTelefono_QRO(tel);
          if (cleanTel) {
            listaTels.push(cleanTel);
          }
        }
      }
     
      // 3. Triple escudo fallback (Si no se encontró ningún teléfono con prefijo)
      if (listaTels.length === 0) {
        const todosLosNumeros = bloque.match(/\d{10,12}/g) || [];
        for (let n = 0; n < todosLosNumeros.length; n++) {
          const numLimpio = normalizarAwb_QRO(todosLosNumeros[n]);
          if (numLimpio !== guia) {
            const cleanTelFallback = limpiarYValidarTelefono_QRO(numLimpio);
            if (cleanTelFallback) {
              listaTels.push(cleanTelFallback);
            }
          }
        }
      }
     
      // 4. Asignación asíncrona inteligente (Segundo teléfono = Destinatario, Primer teléfono = Remitente)
      if (listaTels.length >= 2) {
        mapaContactos[guia] = listaTels[1]; // Destinatario (Segundo teléfono de la fila horizontal de DHL)
      } else if (listaTels.length === 1) {
        mapaContactos[guia] = listaTels[0]; // Fallback al primero
      }
    }
  });
 
  return mapaContactos;
}

/**
 * Sanitizador de teléfonos para Querétaro (Asegura longitud de 10 dígitos)
 */

function limpiarYValidarTelefono_QRO(tel) {
  if (!tel) return null;
  let clean = tel.toString().replace(/[^0-9]/g, "");
  if (clean.length === 12 && clean.indexOf("52") === 0) {
    clean = clean.substring(2);
  }
  if (clean.length > 10) {
    clean = clean.substring(0, 10);
  }
  return (clean.length === 10) ? clean : null;
}

function normalizarAwb_QRO(awb) {
  if (!awb) return "";
  return awb.toString().replace(/\D/g, "");
}

function formatearPidParaCampo_(pid) {
  const pidBoveda = sanitizarPIDParaBoveda(pid).replace(/[\s-]/g, "");
  return pidBoveda.indexOf("JD") === 0 ? "J" + pidBoveda : "JJD" + pidBoveda;
}

function encontrarFilaHeaderYIndices(valores) {
  for (let r = 0; r < Math.min(valores.length, 10); r++) {
    const indices = obtenerIndicesColumnasBatch_(valores[r]);
    if (indices["hwb no"] !== undefined) {
      return { filaHeader: r, indices: indices };
    }
  }
  return null;
}

function obtenerIndicesColumnasBatch_(filaCabecera) {
  const indices = {};
  for (let i = 0; i < filaCabecera.length; i++) {
    const cabeceraStr = String(filaCabecera[i]).toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    if (!cabeceraStr) continue;
    if (cabeceraStr.indexOf("hwb") !== -1 || cabeceraStr.indexOf("waybill") !== -1 || cabeceraStr.indexOf("guia") !== -1 || cabeceraStr.indexOf("airbill") !== -1) {
      indices["hwb no"] = i;
    } else if (cabeceraStr.indexOf("piece id") !== -1 || cabeceraStr === "pid" || cabeceraStr === "pieceid" || cabeceraStr.indexOf("piece id ship id") !== -1 || cabeceraStr === "piece_id") {
      indices["piece id"] = i;
    } else if (cabeceraStr.indexOf("piece no") !== -1 || cabeceraStr.indexOf("pieces") !== -1 || cabeceraStr.indexOf("bultos") !== -1 || cabeceraStr.indexOf("piezas") !== -1 || cabeceraStr.indexOf("piece count") !== -1) {
      indices["piece no"] = i;
    } else if (cabeceraStr.indexOf("receiver name") !== -1 || cabeceraStr.indexOf("consignee name") !== -1 || cabeceraStr.indexOf("destinatario") !== -1 || cabeceraStr.indexOf("nombre recibe") !== -1 || cabeceraStr.indexOf("receiver contact name") !== -1) {
      indices["receiver name"] = i;
    } else if (cabeceraStr.indexOf("rcvr addr 1") !== -1 || cabeceraStr.indexOf("receiver address 1") !== -1 || cabeceraStr.indexOf("address 1") !== -1 || cabeceraStr.indexOf("rcvr addr1") !== -1 || cabeceraStr.indexOf("rcvr_addr_1") !== -1 || cabeceraStr.indexOf("direccion 1") !== -1) {
      indices["rcvr addr 1"] = i;
    } else if (cabeceraStr.indexOf("rcvr addr 2") !== -1 || cabeceraStr.indexOf("receiver address 2") !== -1 || cabeceraStr.indexOf("address 2") !== -1 || cabeceraStr.indexOf("rcvr addr2") !== -1 || cabeceraStr.indexOf("rcvr_addr_2") !== -1 || cabeceraStr.indexOf("direccion 2") !== -1) {
      indices["rcvr addr 2"] = i;
    } else if (cabeceraStr.indexOf("rcvr addr 3") !== -1 || cabeceraStr.indexOf("receiver address 3") !== -1 || cabeceraStr.indexOf("address 3") !== -1 || cabeceraStr.indexOf("rcvr addr3") !== -1 || cabeceraStr.indexOf("rcvr_addr_3") !== -1 || cabeceraStr.indexOf("direccion 3") !== -1) {
      indices["rcvr addr 3"] = i;
    } else if (cabeceraStr.indexOf("postcode") !== -1 || cabeceraStr.indexOf("postal code") !== -1 || cabeceraStr === "cp" || cabeceraStr === "c p" || cabeceraStr.indexOf("post code") !== -1) {
      indices["rcvr postcode"] = i;
    } else if (cabeceraStr.indexOf("rcvr tel") !== -1 || cabeceraStr.indexOf("receiver tel") !== -1 || cabeceraStr.indexOf("recipient tel") !== -1 || cabeceraStr.indexOf("recipient phone") !== -1 || cabeceraStr === "phone" || cabeceraStr === "tel" || cabeceraStr === "telefono" || cabeceraStr === "teléfono") {
      indices["rcvr tel"] = i;
    } else if (cabeceraStr.indexOf("edd") !== -1 || cabeceraStr.indexOf("delivery date") !== -1 || cabeceraStr.indexOf("fecha estimada") !== -1 || cabeceraStr.indexOf("fecha de entrega") !== -1 || cabeceraStr === "edd") {
      indices["edd"] = i;
    } else if (cabeceraStr.indexOf("desc") !== -1 || cabeceraStr.indexOf("det") !== -1 || cabeceraStr.indexOf("merc") !== -1) {
      indices["description"] = i;
    } else if (cabeceraStr.indexOf("orig ctry") !== -1 || cabeceraStr.indexOf("origin country") !== -1 || cabeceraStr.indexOf("pais origen") !== -1 || cabeceraStr === "orig_ctry" || cabeceraStr === "origin_country") {
      indices["orig ctry"] = i;
    } else if (cabeceraStr.indexOf("dest ctry") !== -1 || cabeceraStr.indexOf("destination country") !== -1 || cabeceraStr.indexOf("pais destino") !== -1 || cabeceraStr === "dest_ctry" || cabeceraStr === "destination_country") {
      indices["dest ctry"] = i;
    } else if (cabeceraStr.indexOf("prod") !== -1 || cabeceraStr.indexOf("product") !== -1 || cabeceraStr === "product_code" || cabeceraStr === "product code" || cabeceraStr === "producto") {
      indices["product"] = i;
    }
  }
  return indices;
}

/**
 * 3️⃣ SECCIÓN COMÚN: AUTO-ASIGNACIÓN DE POCHTECA POR CP
 */
