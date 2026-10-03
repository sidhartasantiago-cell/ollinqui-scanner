# 📜 AMOXCALLI: Especificación de Botón Terminé y Jerarquía Inquebrantable A_BORDO (v82.0 PROD)
## Ollinqui Metralleta (PWA Netlify) y Blindaje de Estatus en Bóveda QRO
**Documento Técnico de Referencia para el Amoxcalli y Fuentes de NotebookLM**  
*Plaza Querétaro (QRO) — Arauto Express*  
*Fecha de Certificación: 21 de Septiembre de 2026*  
*Autoridad: Tlayacanqui Sidharta Santiago / Antigravity (Google DeepMind)*  

---

> [!IMPORTANT]
> **Estatus:** Certificado, Desplegado y Activo en Producción.  
> **URL Producción Metralleta:** `https://heroic-youtiao-74046e.netlify.app/`  
> **Backend Webhook Apps Script:** Versión `@46` (`AKfycbyOcK5lm-_baXG021-GvPh_FRo4V9iMdokFyByn8M3A0xmqaBoutIuaYGEUS3aoOTHyBQ`)  
> **Hoja de Bóveda:** `BD_APP_RUTA_2025` (`1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w`)  
> **Axioma de Jerarquía:** *"Lo que el andén bipió en `A_BORDO` o la calle entregó en `OK`, ningún worker digital tiene la facultad de regresarlo a `SIN_CARGAR` o `PRE_ASIGNADO`."*  

---

## 🧭 1. DIAGNÓSTICO Y CONTEXTO OPERATIVO

1. **Fricción de Salida en la Metralleta Móvil:**  
   Cuando el Pochteca (Edgar Rodríguez) finalizaba el escaneo en rampa en la PWA de Metralleta (`heroic-youtiao-74046e`), no existía un mecanismo explícito y visible para cerrar la herramienta. Salir mediante controles del navegador o gestos podía provocar pérdida del estado en AppSheet o forzar una recarga completa de la aplicación, destruyendo la sesión activa del chofer.
2. **Riesgo de Regresión de Estatus (Column Overwrite):**  
   Si un bulto ya había sido validado físicamente en rampa (`Escaneo_Validacion = "A_BORDO"`), existía el riesgo de que recálculos masivos de fórmulas o rutinas de higiene automatizadas pisaran la celda con el valor teórico inicial `SIN_CARGAR`, invalidando la liberación de la ruta (`Estatus_Guia = "POR_ENTREGAR"`).

---

## 🛠️ 2. SOLUCIONES ARQUITECTÓNICAS IMPLEMENTADAS

### A. Botón Flotante y Destacado en Metralleta UI
Se integró en `Metralleta_Frontend/index.html` un botón con anclaje visual permanente:
- **Texto:** `✅ Terminé de Escanear / Regresar a Ollinqui`
- **Diseño:** Verde esmeralda neón con gradiente (`#10b981` a `#059669`), borde `#34d399`, sombra difusa de 25px y altura táctil optimizada para guantes de andén.
- **Protocolo de Cierre Limpio (<200ms):**  
  ```javascript
  function terminarEscaneoYRegresar() {
      // 1. Envío express vía sendBeacon de cualquier pendiente en buffer
      try {
          const pendientes = scanHistory.filter(item => !item.sync);
          if (pendientes.length > 0 && navigator.sendBeacon) {
              pendientes.forEach(p => {
                  const pData = JSON.stringify({
                      action: 'registrar_escaneo_rampa',
                      pid: p.pid,
                      estatus: 'A_BORDO',
                      chofer: choferEmail
                  });
                  navigator.sendBeacon(URL_PROXY_SEGURO, new Blob([pData], { type: 'text/plain' }));
              });
          }
      } catch(eBeacon) {}

      // 2. Cascada de Cierre Limpio (Teoyolotl Protocol)
      try { window.close(); } catch (e1) {}
      if (!window.closed) {
          try { self.close(); } catch (e2) {}
      }
      setTimeout(() => {
          if (!window.closed) {
              try { history.back(); } catch (e3) {}
          }
      }, 150);
  }
  ```
- **Garantía Operativa:** Regresa directamente a la vista activa de AppSheet sin recargar la app ni requerir re-autenticación de Edgar.

---

### B. Jerarquía Inquebrantable de Estatus en Servidor (Apps Script @46)

Se codificó en `Webhook_v3.js` la jerarquía estricta de rangos para evitar cualquier degradación:

$$\text{Rango 3: } \mathbf{ENTREGADO\ /\ OK} \quad > \quad \text{Rango 2: } \mathbf{A\_BORDO\ /\ POR\_ENTREGAR} \quad > \quad \text{Rango 1: } \mathbf{SIN\_CARGAR\ /\ PRE\_ASIGNADO}$$

#### 1. Inyección Atómica en `PIEZAS_PID`:
- Al recibir el escaneo de Metralleta, el backend busca el PID bajo la **Ley de la Doble J** (`JJD...` / `JD...`).
- Si `Estatus_PID` ya es `OK`, se preserva inmutable.
- `Escaneo_Validacion` (Col E) se fija en `A_BORDO` (o se respeta `BYPASS_TLACHIXQUI`).
- Se ejecuta `SpreadsheetApp.flush()` para escritura atómica en Google Sheets.

#### 2. Blindaje en `recitoTriggerEstatus`:
```javascript
// Col H: Estatus_Guia (Nunca regresa a PRE_ASIGNADO si ya es POR_ENTREGAR u OK)
const rankH_current = (currentH === "OK" || currentH === "ENTREGADO") ? 3 : (currentH === "POR_ENTREGAR" ? 2 : 1);
const rankH_proposed = (proposedH === "OK" || proposedH === "ENTREGADO") ? 3 : (proposedH === "POR_ENTREGAR" ? 2 : 1);
const calcH = (rankH_proposed >= rankH_current) ? proposedH : currentH;

// Col J: Nuevo_Estatus (Nunca degrada OK a PD o PENDIENTE)
const rankJ_current = (currentJ === "OK") ? 3 : ((currentJ === "PD") ? 2 : 1);
const rankJ_proposed = (proposedJ === "OK") ? 3 : ((proposedJ === "PD") ? 2 : 1);
const calcJ = (rankJ_proposed >= rankJ_current) ? proposedJ : currentJ;
```

#### 3. Blindaje en `LectorIA_Pickups.js`:
Se eliminó la sobreescritura que revertía piezas con estatus `OK` a `PRE_ASIGNADO` durante barridos matutinos del Batch de DHL.

---

## 📊 3. CERTIFICACIÓN EN VIVO (SMOKE TEST PRODUCTIVO)

| Escenario de Prueba | PID Evaluado | Estatus Inicial | Estatus Post-Escaneo | Resultado |
| :--- | :--- | :---: | :---: | :---: |
| **Escaneo Atómico en Rampa** | `JJD014600012745225571` | `SIN_CARGAR` | `A_BORDO` | **Aprobado (Ascenso atómico)** |
| **Intento de Regresión por Recálculo** | `JJD014600012745225571` | `A_BORDO` | `A_BORDO` | **Aprobado (Blindado contra SIN_CARGAR)** |
| **Preservación de Entrega en Calle** | `JJD014600012797547545` | `OK` | `OK` | **Aprobado (OK inmutable)** |
| **Frontend Netlify** | `heroic-youtiao-74046e` | Sin botón | Botón visible + Cascada <200ms | **Aprobado (Deploy 6ab200f0)** |

---

*Documento consolidado para su preservación en la biblioteca Amoxcalli y consulta permanente en NotebookLM.*
