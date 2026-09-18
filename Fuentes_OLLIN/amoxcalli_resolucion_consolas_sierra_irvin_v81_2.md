# 🏔️ AMOXCALLI: RESOLUCIÓN Y UNIFICACIÓN DE CONSOLAS — SIERRA GORDA v3.0 & CONSOLA MAESTRA v81.2 PROD
## Ecosistema OLLIN — Arauto Express (Plaza Querétaro)
**Documento Canónico de Memoria Técnica para Amoxcalli / NotebookLM**  
*Fecha:* 17 de Septiembre de 2026  
*Autor:* Antigravity (Google DeepMind) en co-autoría con el Tlayacanqui Sidharta Santiago  
*Aprobado para:* Irvin Reyes (Mando Unificado QRO) y Daniel Juárez (Coordinación Sierra Gorda)

---

### 📌 1. Diagnóstico del Problema Reportado

#### A. ¿Por qué Irvin tenía un enlace obsoleto y la información era confusa?
1. **Enlace Huérfano de Sierra Gorda v2.0:**
   - Irvin estaba consultando un despliegue aislado anterior (`/AKfycbxUwbfom.../exec`), el cual correspondía a una versión preliminar de transición (**v2.0**).
   - **Confusión en Métricas:** Esa pantalla mostraba los nombres de los días en inglés crudo (`Tue`, `Thu`) y mantenía una tarjeta de "Riesgo de Garantía" con una cifra teórica exorbitante (`$504,850.50 MXN` calculada multiplicando bultos en custodia por 30 UMAs). Esta cifra desorientaba al operador haciéndole creer que había un desfalco o pérdida real de medio millón de pesos, cuando únicamente se trataba de paquetes en tránsito de montaña.
2. **Causa Raíz de la Pantalla en Blanco al pulsar "Sierra Gorda" desde la Consola Maestra:**
   - **¿Era un tema de roles de usuario?** **NO.** El rol asignado a Irvin (`irvin` / `tlayacanqui`) cuenta con privilegios absolutos para ver todos los módulos.
   - **Causa Raíz Técnica (Sandboxed Iframe en Google Apps Script):**
     - En el archivo `Index.html`, el botón superior estaba configurado como un enlace HTML relativo: `<a href="?view=sierra">`.
     - Las aplicaciones Web Apps de Google Apps Script se ejecutan dentro de un contenedor `iframe` aislado (`n-xxx.googleusercontent.com`).
     - Al hacer clic en un hipervínculo relativo sin el atributo `target="_top"`, el navegador intenta recargar la URL dentro del mismo iframe interno. La infraestructura de seguridad de Google bloquea esa recarga con cabeceras `X-Frame-Options: SAMEORIGIN / DENY`, resultando en una **pantalla totalmente en blanco**.
3. **Desalineación Arquitectónica Previa:**
   - No era necesario recargar la página: **Sierra Gorda v3.0 ya estaba integrada como la Pestaña 3 (`tab-sierra-content`)** dentro de la misma Consola Maestra (`Index.html`). El enlace externo era redundante y rompía la sesión.

---

### 🛠️ 2. Solución de Ingeniería Aplicada

1. **Transformación del Botón en Acción en Memoria RAM:**
   - Se reemplazó el tag `<a>` por un botón interactivo: `onclick="switchTab('sierra')"`.
   - Al presionarlo, la Consola Maestra ejecuta `switchTab('sierra')` instantáneamente:
     - Oculta las demás pestañas y muestra la **Mesa de Control Sierra Gorda (Grupo Daniel Juárez) v3.0 PROD**.
     - Carga de forma asíncrona y en memoria RAM los datos de la hoja `RUTA` (`ID_BD_CENTRAL_2023`) filtrando a los 3 pochtecas de montaña (Daniel Juárez, Jesús Ivar González, Oscher).
     - Cero recargas de navegador, cero redirecciones de Google y **cero pantallas en blanco**.
2. **Protección Poka-Yoke para la Vista Aislada de Daniel Juárez (`Index_Sierra.html`):**
   - Para cuando Daniel o la dirección accedan a la vista dedicada con `?view=sierra` o `?role=daniel`, el botón de regreso hacia *Tlachialoni QRO* ahora incluye explícitamente `target="_top"`, evitando que la sesión quede atrapada en blanco al regresar a la consola central.
3. **Consolidación Visual de Sierra Gorda v3.0 (Eliminación de Confusión):**
   - **Tarjeta de SLA Real:** Mide la efectividad operativa de campo (OKs vs Visitas reales).
   - **Cierre Diario:** Muestra exactamente cuántas visitas faltan de OK, aislando las preasignaciones de rampa.
   - **Custodia Internacional:** Muestra con claridad los envíos prioritarios DHL pendientes de firma y las incidencias sin alarmas financieras infundadas.
   - **Fechas en Español:** Se normalizaron todos los nombres de los días (`Lunes`, `Martes`, `Miércoles`, etc.).

---

### 🌐 3. Enlace Único y Oficial de Acceso para Irvin Reyes

A partir de este despliegue, Irvin **no debe usar enlaces fragmentados ni versiones viejas**. Todo vive bajo el Centro de Mando Unificado:

- **Consola Maestra de Operaciones QRO (v81.2 PROD):**
  `https://script.google.com/macros/s/AKfycbz9KITH2sdllPsSibwV1PRNq_5DI60S0Oxc3GZD6P3LBm0wBvsfaCKvZ0Rpu8dOxuruP/exec`

En esta consola única, Irvin tiene las 5 pestañas operativas:
1. 🏗️ **Rampa & Lotes:** Procesamiento unificado de Excel DHL, Gmail y Puente a Ruta.
2. 🚚 **Calle QRO:** Monitoreo en vivo de los 6 pochtecas, buscador inteligente de guías y mesa de auditoría.
3. 🏔️ **Sierra Gorda v3.0:** Monitoreo en caliente de Daniel, Oscher y Jesús Ivar sin salir de la app.
4. 🎙️ **Teoyolotl IA:** Auditoría multimodal de fotos de fachada y testimonios de audio.
5. 📦 **Pickups:** Radar de recolecciones activas.
