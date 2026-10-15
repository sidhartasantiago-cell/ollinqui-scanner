# 📜 REGLA MAESTRA: ESQUEMA MODERNO OLLINQUI PWA Y BÓVEDA FACTURACIÓN (OLLIN v84.0 PROD)

## Propósito
Define la estructura moderna de 15 columnas de `VALIDACIÓN_QRO_2025` alineada 1:1 a Ollinqui PWA y el flujo automatizado de visto bueno hacia `FACTURADOS_PROD_2026` en `BOVEDA_BATCH_MAESTRO`, eliminando la necesidad de auditoría manual directa en hojas de cálculo.

## Esquema Moderno de 15 Columnas de VALIDACIÓN_QRO_2025

| Idx | Columna             | Col | Tipo         | Descripción                                        |
|:---:|:--------------------|:---:|:------------:|:---------------------------------------------------|
|  0  | Guia                |  A  | Texto        | HWB de 10 dígitos                                  |
|  1  | PID                 |  B  | Texto        | Formato Doble J (`JJD...`)                         |
|  2  | CP                  |  C  | Texto/Número | Código Postal de entrega                           |
|  3  | Checkpoint          |  D  | Texto        | `OK`, `BA`, `NH`, `CA`, `RD`, etc.                 |
|  4  | Receptor            |  E  | Texto        | Nombre de quien recibe                             |
|  5  | Firma               |  F  | URL / Ruta   | Evidencia de firma digital                         |
|  6  | Foto_Fachada        |  G  | URL / Ruta   | Evidencia fotográfica de fachada / inmueble        |
|  7  | Audio_Teoyolotl     |  H  | URL / Ruta   | Evidencia de audio por voz (Teoyolotl Mic)         |
|  8  | GPS                 |  I  | Coordenadas  | Latitud, Longitud                                  |
|  9  | Pochteca            |  J  | Email        | Correo del operador asignado                       |
| 10  | Fecha_Entrega       |  K  | Fecha/Hora   | Marca de tiempo local de entrega                   |
| 11  | Aprobacion_Auditor  |  L  | Estado       | `PENDIENTE` / `APROBADO` / `RECHAZADO`             |
| 12  | Motivo_Rechazo      |  M  | Texto        | Observaciones del auditor                          |
| 13  | Auditor_Validador   |  N  | Email        | Correo del auditor (Irvin)                         |
| 14  | Marca_Tiempo        |  O  | Fecha/Hora   | Timestamp del sistema al auditar                   |

## Destino Definitivo de Facturación: `FACTURADOS_PROD_2026`
Al otorgar el "Visto Bueno" en la Consola Maestra:
- La tabla de facturación histórica `"2025 Tabla de facturacion QRO 2.0"` queda estrictamente como **archivo histórico**.
- Los registros validados se inyectan en caliente a `BOVEDA_BATCH_MAESTRO` (`FACTURADOS_PROD_2026`) listos para liquidación semanal y cobro a DHL.
- El PID se sanitiza automáticamente al estándar canónico de Bóveda (`JD...`).

## Ley de la Doble J (Formato de PIDs)

- **En calle/rampa (AppSheet/Netlify):** formato `JJD` (3 letras).
- **En BD/Facturación (Sheets/Bóveda):** formato `JD` (2 letras).

Expresión de sanitización:
```js
function sanitizarPIDParaBoveda(pidRaw) {
  var pidClean = pidRaw.toString().trim().toUpperCase();
  if (pidClean.indexOf("JJD") === 0) {
    pidClean = "JD" + pidClean.substring(3);
  }
  return pidClean;
}
```

## Instrucción de Seguridad

Queda prohibido re-ordenar columnas en `VALIDACIÓN_QRO_2025` sin autorización
expresa del Tlayacanqui Sidharta Santiago.

---

# 🧠 REGLA INVIOLABLE DE TRABAJO: ADAPTACIÓN Y TOLERANCIA AL PERFIL COGNITIVO (TDA)

## Pautas Obligatorias de Interacción con Sidharta:
1. **Tolerancia y Paciencia Total:** Absoluta empatía ante cambios de tema, dudas repetidas o momentos de sobrecarga mental. NUNCA apurar, regañar ni ser rígido.
2. **Formato Claro y Visual:** Usar respuestas estructuradas en viñetas cortas, negritas y párrafos concisos. Cero muros de texto abrumadores.
3. **Anclaje Amable de Metas:** Si el hiperfoco nos lleva por varias ideas, acompañar con entusiasmo, pero recordar suavemente cuál es el siguiente paso concreto.
4. **Cero Complicaciones:** Ir directo a la solución de forma sencilla sin abrumar con tecnicismos innecesarios.

---

# 📚 REGLA INQUEBRANTABLE: SINCRONIZACIÓN OBLIGATORIA A AMOXCALLI (NOTEBOOKLM)

## Mandato Permanente de Memoria Técnica:
Queda estrictamente ordenado a Antigravity que al finalizar cualquier hito, corrección de bug, cambio de esquema o diseño de reglas operativas, DEBE cumplir sin excepción el siguiente protocolo:
1. **Destilado de Memoria Técnica:** Redactar el documento canónico en Markdown con las decisiones, causas raíz y reglas aprendidas (sin volcar ruido conversacional efímero).
2. **Espejo Inmediato en Google Drive:** Guardar una copia directa e inmediata en:
   `g:\Mi unidad\Fuentes_NotebookLM_Amoxcalli_AE\`
3. **Actualización del Compendio Maestro:** Anexar el contenido sintetizado al archivo:
   `g:\Mi unidad\Fuentes_NotebookLM_Amoxcalli_AE\AMOXCALLI_BITACORA_MAESTRA_SISTEMAS_Y_OPERACIONES.md`
4. **Cero Dependencia de Memoria Volátil:** Este mandato aplica para cualquier chat nuevo, subagente o sesión futura de Antigravity en este workspace.

---

# 🏛️ REGLA MAESTRA: MANDATO EXCLUSIVO DE TENANT CORPORATIVO Y SEPARACIÓN DE UNIVERSOS (OLLIN v2026.10)
**ID de Regla:** `OLLIN_MANDATO_TENANT_WORKSPACE`  
**Ámbito:** Todo el Workspace local, Clasp, Google Apps Script, GCP, Netlify y APIs de Google.  
**Aplica para:** Agente Prudencia (Google Antigravity), OpenCode y Subagentes Autónomos.  
**Activación:** Always On (Siempre Activa)

## Mandato Inviolable de Delimitación de Contextos y Tres Universos
Queda ESTRICTAMENTE PROHIBIDO crear, desplegar, modificar o alojar cualquier proyecto de código, archivo de Google Drive, script de Google Apps Script, webhook, base de datos o servicio del Ecosistema OLLIN bajo cuentas personales de Gmail (`@gmail.com`). Toda la infraestructura de Arauto Express debe residir exclusivamente en `@arauto.express`.

### 1. 🌌 UNIVERSO 1: PERSONAL (PRIVADO)
- **Cuenta:** `sidharta.santiago@gmail.com`
- **Ámbito:** Asuntos personales y proyectos privados fuera de la empresa.
- **Regla:** NUNCA alojar aquí activos de Arauto Express ni herramientas del consultorio clínico.

### 2. 🏛️ UNIVERSO 2: CORPORATIVO / OPERACIONES LOGÍSTICAS (ARAUTO EXPRESS)
- **Cuenta:** `sidharta.santiago@arauto.express`
- **Ámbito:** Ecosistema OLLIN, logística de última milla DHL, Tlachialoni, Painani, Ollinqui, Reclutamiento de Pochtecas y control de rampa/calle.
- **Regla:** Todos los scripts y bases de datos operativas deben nacer bajo la titularidad de esta cuenta corporativa en Google Workspace.

### 3. 🧠 UNIVERSO 3: CLÍNICO / CONSULTORIO PROFESIONAL (MTRA. LILIANA LÓPEZ)
- **Cuenta:** `psic.liliana.lopez@arauto.express`
- **Ámbito:** Ecosistema Digital Lili v2.0, expediente clínico electrónico, notas SOAP, psicometría, agenda y canalización de crisis.
- **Regla:** Todo el software clínico, Google Sheets y AppSheet debe nacer y pertenecer ÚNICAMENTE a la cuenta de Lili para proteger el secreto profesional y el estricto cumplimiento normativo.

---

## 🛡️ PROTOCOLO PRE-VUELO DE IDENTIDAD (PRE-FLIGHT IDENTITY CHECK)
Antes de ejecutar `clasp create`, `clasp push`, `gcloud deploy`, `git commit` o la creación de un Google Doc / Sheet mediante API:
1. **Comprobación de Usuario Activo:** Verificar la sesión en Clasp (`~/.clasprc.json`) y Google Cloud. Si la cuenta contiene `@gmail.com`, Antigravity DEBE detenerse de inmediato y requerir la cuenta institucional `@arauto.express`.
2. **Titularidad WebApp:** En despliegues WebApp (`doGet` / `doPost` / Clasp), validar que el propietario sea `sidharta.santiago@arauto.express` bajo la organización corporativa para evitar el error 403 / "Google hasn't verified this app".





