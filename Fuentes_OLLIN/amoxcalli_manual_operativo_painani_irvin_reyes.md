# 📋 MANUAL OPERATIVO DE RAMPA: PAINANI APP (v82.5 PROD)
## Guía de Procedimiento para el Auditor de Andén — Irvin Reyes
**Ecosistema OLLIN | Plaza Querétaro — Arauto Express**  
*Documento de Referencia Operativa e Instructivo de Trabajo*

---

> [!IMPORTANT]
> **Enlace de la Aplicación:** [https://painani.arauto.express/](https://painani.arauto.express/)  
> **Auditor Responsable:** Irvin Reyes (Tlachixqui de Rampa).  
> **Objetivo Principal:** Blindar legal y financieramente a Arauto Express contra reclamaciones de paquetes faltantes que DHL declara en sistema pero no entrega físicamente.  
> **Axioma Operativo:** *"Paquete no bipiado en rampa, es paquete que no ingresó a custodia de Arauto".*

---

## 📲 PASO 1: CÓMO INSTALAR PAINANI COMO APP EN TU TELÉFONO

Painani está construida como una **PWA (Progressive Web App)** nativa. No necesitas buscarla en Play Store ni App Store; se instala directamente desde el navegador y funciona a pantalla completa con su ícono dorado y negro.

### Si tu teléfono es Android (Chrome):
1. Abre Google Chrome y entra a: `https://painani.arauto.express/`.
2. Verás en la parte superior un botón dorado que dice **`📲 GUARDAR APP EN PANTALLA`**. Tócalo.
3. El teléfono te mostrará un mensaje: *"¿Deseas instalar la app Painani?"* ➔ Toca **Instalar**.
4. *(Método alternativo):* Toca los tres puntos verticales (`⋮`) en la esquina superior derecha de Chrome y selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
5. ¡Listo! En el menú de tu teléfono aparecerá la app **Painani** con el rayo dorado y fondo negro.

### Si tu teléfono es iPhone (Safari):
1. Abre Safari y entra a: `https://painani.arauto.express/`.
2. Toca el botón **Compartir** de Safari (el ícono de un cuadrado con una flecha hacia arriba en la barra inferior).
3. Desliza hacia abajo y selecciona **"Agregar a Inicio"** (o *"Add to Home Screen"*).
4. Confirma el nombre **Painani** y toca **Agregar**.
5. ¡Listo! Se abrirá como aplicación nativa sin barra de direcciones web.

---

## 🚚 PASO 2: APERTURA DE DESCARGA (ANTES DE BAJAR LA MERCANCÍA)

Cuando el camión de DHL se acople a la rampa y antes de que comiencen a pasar bultos:

1. **Abre Painani** en tu teléfono o terminal Zebra/Honeywell.
2. Llena los 4 campos de apertura:
   * **Asistente / Chofer de DHL:** Escribe el nombre del chofer y número de camión o ruta (Ej. *Juan Pérez - Camión 08*).
   * **Piezas declaradas por DHL:** Pregúntale al chofer cuántas piezas dice que trae y anota el número exacto (Ej. *300*). **Este número es crucial para calcular faltantes.**
   * **EDD Físico Predominante:** Mira las primeras etiquetas amarillas de las cajas e identifica la fecha prometida de entrega rotulada (por default viene la fecha de hoy).
   * **Auditor Responsable:** Debe decir *Irvin Reyes*.
3. Toca el botón grande amarillo: **`🔫 INICIAR METRALLETA DE RAMPA`**.

---

## ⚡ PASO 3: USO DE LA METRALLETA EN RÁFAGA (ESCANEO FÍSICO)

Una vez abierta la metralleta, la pantalla pasa al modo **AMOLED Black** de alta velocidad:

1. **Disparo Continuo con la Pistola:**  
   Pasa cada caja frente al lector láser. La aplicación tiene un bloqueo inteligente que **nunca pierde el foco**; no necesitas tocar la pantalla entre bulto y bulto.
2. **Escucha los Tonos de Audio:**
   * 🟢 **Bip Agudo Corto:** Escaneo exitoso y aceptado.
   * 🟡 **Doble Bip Rápido (Alerta Ámbar):** **¡DUPLICADO!** Esa misma caja ya fue bipiada antes. La app la ignora para no inflar el conteo.
   * 🔴 **Bip Grave Largo:** Código inválido (no es una guía AWB ni un PID válido de DHL).
3. **El Odómetro en Tiempo Real:**
   * Te muestra cuántas piezas llevas bipiadas (ej. `245 / 300 PZS`).
   * La barra de estado te dice al segundo cuántas faltan:  
     `🚨 55 FALTANTES DE DHL` ➔ Se irá reduciendo hasta llegar a `0`.
4. **Si cambia el EDD a mitad de la descarga:**  
   Si de pronto viene un lote para entrega de mañana o lunes, solo cambia la fecha en la barra **`📅 EDD FÍSICO ACTIVO`** y los siguientes bultos quedarán etiquetados con esa nueva fecha.
5. **Si te equivocas en un bulto:**  
   Toca el botón rojo **`↩️ Deshacer`** en la parte inferior para cancelar el último paquete escaneado.

---

## ✏️ PASO 4: ¿QUÉ HACER SI TE EQUIVOCASTE EN LOS DATOS O CAMBIARON AL CHOFER?

> **¡No cierres la app ni borres nada!** Painani tiene edición en caliente protegida:

1. Toca el botón **`✏️ EDITAR DATOS`** (lo tienes arriba en el odómetro o abajo en la barra de acciones).
2. Se abrirá la ventana de corrección donde puedes modificar:
   * El nombre del chofer de DHL.
   * Las piezas declaradas (por si el chofer dijo *"eran 320, no 300"*).
   * El auditor responsable.
   * La fecha de EDD.
3. Toca **`💾 GUARDAR`**.
4. **El sistema conservará el 100% de tus bultos ya escaneados**, actualizará el odómetro y recalculará la diferencia al instante.

---

## 📜 PASO 5: GENERACIÓN DEL ACTA NOTARIAL Y RESPALDO

Cuando el camión termine de descargarse físicamente al 100%:

1. Toca el botón verde **`📄 GENERAR ACTA`**.
2. Verás en pantalla el resumen notarial con:
   * Folio único de recepción (`REC-QRO-...`).
   * Piezas declaradas por DHL vs bultos físicos que realmente bajaron.
   * El **Dictamen Oficial**:
     * `✅ CONCILIACIÓN EXACTA` (si llegaron completas).
     * `🚨 DISCREPANCIA: -X PIEZAS FALTANTES DE DHL` (si faltaron cajas).
     * `⚠️ EXCEDENTE DETECTADO: +X PIEZAS` (si sobraron cajas no reportadas).
3. **Copiar para WhatsApp:**  
   Toca **`📱 COPIAR PARA WHATSAPP DE DHL`** y pégalo de inmediato en el grupo de supervisión operativa de DHL.
4. **Descargar Respaldo CSV:**  
   Toca **`💾 DESCARGAR CSV`** para que se guarde en tu teléfono la lista completa con fecha, hora al segundo y códigos.
5. **Si necesitas seguir bipiando:**  
   Si de pronto apareció otra caja en la orilla del camión, toca **`⬅️ Regresar a Seguir Bipiando`**, escanea la caja y vuelve a generar el acta.

---

## 🏁 PASO 6: CIERRE DE PROCESO EN RAMPA (NOTIFICACIÓN AUTOMÁTICA)

Una vez compartida el acta con el chofer y verificada:

1. Dentro de la ventana del acta, toca el botón rojo brillante:  
   **`🏁 CIERRE DE PROCESO EN RAMPA E INICIAR NUEVO CICLO`**.
2. La app te pedirá confirmación: confirma tocando **Aceptar**.
3. **¿Qué sucede en ese instante automáticamente?**
   * 📡 Se inyecta la fila de cierre notarial en la Bóveda de Almacén (`RECEPCION_RAMPA`).
   * 🤖 **Se dispara una alerta inmediata a la dirección en Google Chat en el canal `AE Bot` (`AE_Bot_QRO 🤺`)** con el folio, el chofer, el auditor y el dictamen de piezas.
   * 🧹 La app se limpia y queda lista para abrir la descarga del siguiente camión.

---

## 🛡️ REGLAS DE ORO DE HIGIENE OPERATIVA PARA IRVIN REYES

1. **Nunca cierres un camión en "0":** Solo toca *Cierre de Proceso en Rampa* cuando todos los paquetes físicos hayan sido bipiados.
2. **Revisa el indicador de sincronización:** En la lista de bultos debe decir **`✓ Sincronizado`** en verde. Si dice `⏳ Sincronizando`, dale unos segundos para que suba los datos a Google Sheets.
3. **Sin red en andén:** Si se cae el Wi-Fi o los datos celulares en el andén, **sigue bipiando normalmente**. La app guardará todo en la memoria del teléfono y lo sincronizará automáticamente en cuanto recupere señal.
