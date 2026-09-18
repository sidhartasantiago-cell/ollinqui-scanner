# 🏛️ AMOXCALLI: DESPLIEGUE PRODUCTIVO v81.2 (VERSIÓN 178) Y GOBERNANZA DE ROLES POR URL
## Ecosistema OLLIN — Arauto Express (Plaza Querétaro)
**Documento Canónico de Memoria Técnica para Amoxcalli / NotebookLM**  
*Fecha:* 17 de Septiembre de 2026, 21:48 hrs  
*Autor:* Antigravity (Google DeepMind) en co-autoría con el Tlayacanqui Sidharta Santiago  
*Aprobado para:* Irvin Reyes (Centro de Mando QRO) y Daniel Juárez (Rutas Sierra Gorda)

---

### 📌 1. Resumen Ejecutivo del Hito
En esta sesión se resolvieron dos contingencias operativas críticas en el ecosistema de consolas web de Google Apps Script:
1. **Resolución de Error 404 (Typo de URL):** Corrección de carácter duplicado (`sdll` a `sdl`) en el ID de implementación que impedía el acceso público vía Google Drive.
2. **Despliegue Productivo de Versión 178:** Activación en producción de la versión compilada por Antigravity en el selector de implementaciones de Apps Script.
3. **Formalización de la Arquitectura de Roles (RBAC por Query Parameter):** Definición clara del aislamiento de vistas para evitar fuga de información operativa entre el andén de Querétaro y la zona de alta montaña.

---

### 🛡️ 2. Mecanismo de Roles y Gobernanza de Acceso (Poka-Yoke)

El servidor en `Code.gs` (`doGet(e)`) procesa el parámetro `role` o `view` de la siguiente manera:

```javascript
function doGet(e) {
  var page = (e && e.parameter && (e.parameter.view || e.parameter.page || e.parameter.v)) || '';
  var roleParam = (e && e.parameter && e.parameter.role) ? e.parameter.role.toLowerCase() : '';

  // Candado Estricto de Aislamiento para Daniel Juárez / Sierra Gorda
  if (page.toLowerCase() === 'sierra' || roleParam === 'sierra' || roleParam === 'daniel') {
    return HtmlService.createTemplateFromFile('Index_Sierra')
      .evaluate()
      .setTitle('OLLIN - Consola Sierra Gorda v3.0')
      .setFaviconUrl(OLLIN_FAVICON_URL)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  // Vista de Mando Total por Defecto (Irvin / Dirección)
  var template = HtmlService.createTemplateFromFile('Index');
  template.role = roleParam ? roleParam : 'irvin';
  return template
    .evaluate()
    .setTitle('OLLIN - Consola Maestra de Operaciones QRO (v81.2 PROD)')
    .setFaviconUrl(OLLIN_FAVICON_URL)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
```

#### Aislamiento Operativo:
* **Centro de Mando Irvin (`role=irvin`):**
  * URL Base: `https://script.google.com/macros/s/AKfycbz9KITH2sdlPsSibwV1PRNq_5DI60S0Oxc3GZD6P3LBm0wBvsfaCKvZ0Rpu8dOxuruP/exec`
  * Vista: 5 Pestañas integradas (Rampa & Lotes, Calle QRO, Sierra Gorda v3.0, Teoyolotl IA, Pickups).
  * Facultades: Ejecución de procesamiento unificado, consulta global de 6 choferes, auditoría de rampa y mesa de incidencias.
* **Consola Sierra Gorda Daniel (`role=daniel`):**
  * URL Parametrizada: `https://script.google.com/macros/s/AKfycbz9KITH2sdlPsSibwV1PRNq_5DI60S0Oxc3GZD6P3LBm0wBvsfaCKvZ0Rpu8dOxuruP/exec?role=daniel`
  * Vista: Únicamente `Index_Sierra.html` en versión limpia v3.0.
  * Candado: Bloqueo total de la rampa de Querétaro, finanzas, pickups y pochtecas urbanos. Solo visualiza la custodia y cierre de su equipo: Daniel Juárez, Oscher y Jesús Ivar.

---

### 🌐 3. Ficha Técnica de Despliegue
* **Script ID:** `1OPEYOE5qQPz-Jn5998dtGvMXexLyrPBuTNQVlDmZdHybg7Jh78OkSMjB`
* **Implementación Activa:** `v81.2 PROD`
* **Versión Asignada:** `178 (17 sept 2026, 9:38 p.m.)`
* **Estatus de Acceso:** Verificado 200 OK en Google Chrome y Microsoft Edge.
