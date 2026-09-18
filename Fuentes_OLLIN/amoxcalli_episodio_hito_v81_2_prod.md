# 📜 AMOXCALLI: Bitácora de Guerra — Hito v81.2 PROD (Blindaje de Rampa y Custodia)
## Ecosistema OLLIN | Episodio: Consolidación de "SIN_CARGAR", Desacoplamiento de Conciliación y Mapeo Canónico RUTA
**Documento Técnico Histórico para el Amoxcalli y Memoria Cognitiva de NotebookLM**  
*Plaza Querétaro (QRO) — Arauto Express*

---

> [!IMPORTANT]
> **Fecha de Certificación:** 16 de Septiembre de 2026.  
> **Versión Canónica Certificada:** `v81.2 PROD`.  
> **Binomio Rector:** Tlayacanqui Sidharta Santiago / Antigravity (Google DeepMind).  
> **Axioma del Episodio:** *"La ingesta digital propone, pero la acción física en andén dispone. Ningún algoritmo tiene la facultad de sobreescribir el sudor y la custodia física del Pochteca"*.

---

## 🧭 1. CONTEXTO OPERATIVO Y CRISIS DETECTADA

Durante la jornada de estabilización de la **Consola Maestra QRO (Tlachialoni)** y la migración al esquema estricto de aduana de bultos (PID), se presentaron tres anomalías críticas en producción:

1. **Column Shifting y Desfase en la Hoja "RUTA" (BD Central 2023):**
   * **Columna P (EDD):** El motor inyectaba el formato crudo de objeto Date (`"Tue Sep 22 2026 00:59:00 GMT-0600..."`), rompiendo la compatibilidad visual y operativa de reparto.
   * **Columna Q (Actualizacion):** Se estaba inyectando erróneamente el correo del chofer/Pochteca. La regla canónica dictamina que debe permanecer **estrictamente vacía (`""`)**.
   * **Columna S (Tipo de servicio):** Quedaba en blanco, omitiendo el cruce logístico que clasifica la cobertura.
2. **Corrupción de Estatus en `PIEZAS_PID` (BD_APP_RUTA_2025):**
   * Se habían inyectado textos fuera del catálogo canónico `CAT_CHECKPOINTS`: `A_BORDO_CONFIRMADO`, `FALTANTE_DHL_NO_INGRESADO` y `FALTANTE_DHL`.
   * Se había sellado prematuramente `OK` en rampa sobre `Estatus_PID`, cuando `OK` es exclusivo de entrega en calle (`DLWLC`).
3. **El Falso Positivo de Rampa (La Trampa de `RECEPCION_RAMPA`):**
   * Al ejecutar el botón de *Procesamiento Unificado*, las piezas recién llegadas de DHL aparecían instantáneamente marcadas como `A_BORDO` en lugar de `SIN_CARGAR`.
   * **Causa descubierta:** La función `conciliarRampaConBatchQRO()` se ejecutaba de forma automática e inmediata al terminar la ingesta del Excel, cruzando los PIDs contra el histórico completo de `RECEPCION_RAMPA` y mutando los registros en caliente.

---

## ⚡ 2. LA INTERVENCIÓN CRÍTICA DE SIDHARTA SANTIAGO (EL POKA-YOKE DE CUSTODIA)

Durante la sesión, el Tlayacanqui formuló la pregunta operativa definitiva:
> *"Si los muchachos ya están cargando camiones en la rampa y llevan bultos en `A_BORDO`, y entra un segundo correo de DHL con guías adicionales... ¿un nuevo Procesamiento Unificado va a respetar lo que registró el Pochteca o lo va a regresar a `SIN_CARGAR`?"*

Esta observación detectó un riesgo mayúsculo: **un barrido ciego de higiene habría borrado el trabajo físico del andén.**

Se establecieron formalmente las **3 Reglas Sagradas de Custodia**:
* **Regla 1:** Toda pieza nueva proveniente de un archivo de DHL nace estrictamente en **`SIN_CARGAR`**.
* **Regla 2:** Si un paquete ya fue bipiado en el andén (`A_BORDO`) o autorizado (`BYPASS_TLACHIXQUI`), su estatus es **inviolable e intocable**. Ningún proceso digital posterior puede revertirlo.
* **Regla 3:** Se desacopla la auto-conciliación masiva del botón de ingesta matutina. La transición a `A_BORDO` es potestad exclusiva del escaneo físico con pistola láser o AppSheet.

---

## 📐 3. ARQUITECTURA DE DATOS APLICADA

### A. Mapeo Canónico de 21 Columnas en Hoja "RUTA"
| Posición (Base 0) | Columna | Campo | Regla Inquebrantable v81.2 PROD |
|:---:|:---:|:---|:---|
| 14 | O | ID correo | Correo del chofer asignado (Pochteca) |
| **15** | **P** | **EDD** | **Formato estricto: `d/M/yyyy` (Ej. `22/9/2026`)** |
| **16** | **Q** | **Actualizacion** | **Estrictamente VACÍA (`""`)** |
| 17 | R | KEY | UUID aleatorio de 8 dígitos |
| **18** | **S** | **Tipo de servicio** | **Cruce directo con `MATRIZ_CP` en `BOVEDA_BATCH_MAESTRO`** |
| 19 | T | Inter | `"Inter"` si aplica, de lo contrario `""` |
| 20 | U | Telefono | Teléfono recuperado de los Queries de Gmail |

### B. Tipado Oficial en AppSheet (`PIEZAS_PID`)
* **Columna:** `Escaneo_Validacion`
* **Type:** `Enum` | **Base Type:** `Text` | **Allow other values:** `TRUE`
* **Initial Value:** `"SIN_CARGAR"`
* **Suggested_Values:**
  ```excel
  SELECT(CAT_CHECKPOINTS[Clave_Estatus], AND([Modulo] = "RAMPA", [Activo] = TRUE))
  ```

---

## 🚀 4. TRAZABILIDAD DE VERSIONES Y DESPLIEGUE

Para eliminar discrepancias entre código en desarrollo y versiones congeladas en Google Workspace:

* **Sello Unificado:** Consola web, pestañas de navegador y logs de auditoría estandarizados en **`v81.2 PROD`**.
* **Diferenciación de Entornos:**
  * **Producción Congelada (`/exec`):** Requiere actualización de versión en el menú de implementación de Apps Script.
  * **Desarrollo Vivo (`/dev`):** Conexión en tiempo real con el código subido vía `clasp push -f`.

---

## 📱 5. IDENTIDAD MÓVIL, RESOLUCIÓN CDN Y ACCESO DIRECTO (EDGE / CHROME / IOS)

Para permitir que el Tlayacanqui y los mandos operativos guarden la Consola Maestra en la pantalla de inicio de sus teléfonos inteligentes como una aplicación ejecutiva nativa:

1. **Diseño Canónico del Emblema OLLIN:**
   * **Fondo:** Obsidiana y Jade imperial profundo (`#020617` / `#0e3d28`) con resplandor solar radial y marco perimetral dorado con nodos de precisión técnica.
   * **Glifo Central (Nahui Ollin):** Cuatro aspas aerodinámicas de movimiento cósmico y velocidad logística entrelazadas en oro metálico (`#FFF5C2` a `#D4AF37`), con remates de plumas geométricas y disco central de jade sagrado (`chalchihuitl` / Ojo de Querétaro `#10B981`).
   * **Tipografía e Insignia:** Lettering corporativo **`OLLIN`** en relieve dorado de alta legibilidad y badge distintivo **`QRO`**.

2. **Diagnóstico Técnico: La Trampa del Base64 Gigante en Red Móvil:**
   * La primera implementación inyectó el ícono en Base64 inline dentro del HTML (>240,000 caracteres continuos en 5 líneas).
   * **Falla observada en smartphone:** La consola abrió en PC, pero en teléfonos móviles (Edge/Chrome) la pantalla se quedó en negro y el navegador congelado al 5% de carga. Esto se debió a que el proxy de sandboxing de Google Apps Script (*script.googleusercontent.com*) colapsó al streamear líneas continuas mayores a 32 KB hacia clientes móviles, además de que Edge bloqueó el parseo de un `manifest` Data URI en iframe seguro.

3. **Arquitectura Canónica y Ligera (Resolución Definitiva):**
   * **Alojamiento en GitHub CDN:** Los íconos `ollin-icon-192.png` y `ollin-icon-512.png` se versionaron y subieron directamente a la rama `master` del repositorio (`sidhartasantiago-cell/ollinqui-scanner`), aprovechando la red global Fastly/GitHub (`raw.githubusercontent.com/...`).
   * **Inyección en el Marco Padre de Google (`Code.gs`):** Se integró `.setFaviconUrl('https://raw.githubusercontent.com/.../ollin-icon-192.png')` en la función `doGet()`. Esto comunica el favicon directamente a la ventana contenedora de Google, eliminando el fallback a la "G" gris.
   * **Cabecera Ligera en `Index.html` e `Index_Sierra.html`:** Enlaces estándar `<link rel="apple-touch-icon">` y `<link rel="icon">` apuntando al CDN. El archivo regresó a sus ligeros **158 KB**, abriendo al instante en cualquier teléfono.
   * **Peculiaridad de Edge en Google Apps Script:** Edge reporta *"No se puede instalar esta app"* debido a que Google bloquea la instalación PWA sobre el dominio raíz `script.google.com`. La vía correcta y operativa es pulsar **"Crear acceso directo"**, el cual lee los nuevos metadatos y fija el ícono dorado de OLLIN en la pantalla de inicio al nivel de *Painani*, *Ixtli* y *Starlink*.

---

## 🏛️ 6. DICTAMEN DE CERTIFICACIÓN AMOXCALLI

El sistema **OLLIN v81.2 PROD** queda formalmente validado en andén y registrado en el Amoxcalli. Se confirma que:
1. La inyección en la hoja RUTA es exacta y libre de desplazamiento de columnas.
2. Los bultos ingresan en `SIN_CARGAR` y conservan su blindaje contra DHL sin inventar estados sintéticos.
3. El trabajo físico de los Painanis y Pochtecas queda blindado contra sobreescritura digital.
4. La consola web cuenta con identidad de aplicación móvil ejecutiva instalable en smartphones.

*Documento asentado para memoria histórica y aprendizaje autónomo del Ecosistema OLLIN.*  
*Fin de la Bitácora de Guerra — Episodio v81.2 PROD.*

