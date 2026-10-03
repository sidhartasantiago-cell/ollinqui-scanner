# 📜 REGLA MAESTRA: ESQUEMA RÍGIDO DE 25 COLUMNAS Y DOBLE J (OLLIN v77.0 PROD)

## Propósito
Evitar la regresión más destructiva del andén de Querétaro: el **Column Shifting**.
Define la estructura rígida de 25 columnas de `VALIDACIÓN_QRO_2025` y la regla de
transformación de bultos "Doble J".

## Esquema de 25 Columnas (Base 0 — JavaScript)

| Idx | Columna              | Col  | Tipo          |
|:---:|:---------------------|:----:|:-------------:|
|  0  | Guia                 |  A   | Texto         |
|  1  | PID                  |  B   | Texto         |
|  2  | C.P.                 |  C   | Texto/Número  |
|  3  | Piezas               |  D   | Número        |
|  4  | Rcvr Addr 1          |  E   | Texto         |
|  5  | Rcvr Addr 2          |  F   | Texto         |
|  6  | Rcvr Addr 3          |  G   | Texto         |
|  7  | Receiver Name        |  H   | Texto         |
|  8  | GPS                  |  I   | Texto         |
|  9  | Checkpoint           |  J   | Texto         |
| 10  | Comentarios          |  K   | Texto         |
| 11  | Fecha asignación     |  L   | Fecha         |
| 12  | Fecha en ruta        |  M   | Fecha/Hora    |
| 13  | Imagen fachada       |  N   | URL Imagen    |
| 14  | ID correo            |  O   | Texto         |
| 15  | EDD                  |  P   | Fecha         |
| 16  | KEY                  |  Q   | Texto         |
| 17  | Tipo de servicio     |  R   | Texto         |
| 18  | Inter                |  S   | Texto         |
| 19  | Firma                |  T   | URL Imagen    |
| 20  | Telefono             |  U   | Texto         |
| 21  | Hora de llegada      |  V   | Fecha/Hora    |
| 22  | Aprobación Auditor   |  W   | Checkbox      |
| 23  | Motivo de Rechazo    |  X   | Texto         |
| 24  | Marca de Tiempo      |  Y   | Fecha/Hora    |

## Candados Inmutables

1. La columna `Actualización` (antiguo índice 16) está **extinta**. No restaurar.
2. `KEY` reside fija en **índice 16 (Columna Q)**. No mover.
3. `Telefono` reside en **índice 20 (Columna U)**. No inyectar firma aquí.

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





