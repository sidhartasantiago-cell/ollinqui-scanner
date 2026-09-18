# 📜 AMOXCALLI: Gobernanza de Checkpoints y Mapeo RUTA (v81.1 PROD)
## Ecosistema OLLIN | Catálogo Canónico CAT_CHECKPOINTS & Higiene de Datos
**Documento Técnico de Referencia para el Amoxcalli y Fuentes de NotebookLM**  
*Plaza Querétaro (QRO) — Arauto Express*

---

> [!IMPORTANT]
> **Estatus:** Vigente, Normalizado y Desplegado en Producción.  
> **Versión Canónica Unificada:** `v81.1 PROD`.  
> **Bases de Datos Rectoras:**  
> • `CAT_CHECKPOINTS` en `BD_APP_RUTA_2025` (`1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w`)  
> • `MATRIZ_CP` en `BOVEDA_BATCH_MAESTRO` (`1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw`)  
> • `RUTA` en `BD_CENTRAL_2023` (`1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8`)  
> **Autoridad:** Tlayacanqui Sidharta Santiago / Tlachixqui Irvin Reyes.  

---

## 🏛️ 1. FILOSOFÍA Y SEPARACIÓN CANÓNICA DE MÓDULOS

Para evitar corrupción de datos, falsas entregas en andén y errores en los filtros de AppSheet, el ciclo de vida de un paquete (HWB / PID) se rige bajo una **estricta separación modular**:

```
                  ┌───────────────────────────────────────────────┐
                  │              FLUJO DE UN BULTO                │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────▼───────────────────────┐
                  │ 1. INGESTA DIGITAL (Batch DHL en Gmail)       │
                  │    • Estatus_PID        = "PRE_ASIGNADO"      │
                  │    • Escaneo_Validacion = "SIN_CARGAR"        │
                  │    • Estatus_Guia       = "PRE_ASIGNADO"      │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────▼───────────────────────┐
                  │ 2. CUSTODIA EN ANDÉN (Módulo RAMPA)           │
                  │    • Si se bipió en rampa ➔ "A_BORDO"         │
                  │    • Si no se bipió       ➔ "SIN_CARGAR"      │
                  │    • Autorización manual  ➔ "BYPASS_TLACHIXQUI"│
                  │    • Dañado / no apto     ➔ "RECHAZADO"       │
                  │    ⚠️ Estatus_PID se mantiene "PRE_ASIGNADO"  │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────▼───────────────────────┐
                  │ 3. DESPACHO A CALLE (Módulo RUTA)             │
                  │    • Promoción de Guía    ➔ "POR_ENTREGAR"    │
                  │    • Visibilidad en App   ➔ Vista 'Mi Ruta'   │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────▼───────────────────────┐
                  │ 4. ENTREGA AL CLIENTE (Pochteca en Calle)     │
                  │    • Entrega exitosa      ➔ "OK" (DLWLC)      │
                  │    • Incidencias en calle ➔ NH, BA, CA, RD... │
                  └───────────────────────────────────────────────┘
```

---

## 📋 2. CATÁLOGO MAESTRO CANÓNICO (`CAT_CHECKPOINTS`)

Toda tabla (`PIEZAS_PID`, `GUIAS_ASIGNADAS`), formulario de AppSheet y script de Apps Script (`LectorIA_Pickups.js`, `Puente_Ruta_Temporal.js`, `Receptor_PU.js`) debe utilizar exclusivamente estas claves:

| Clave_Estatus | Modulo | Descripción Operativa | Código DHL (ECIS) | Orden Display | Activo |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **`PRE_ASIGNADO`** | `RUTA` | Registrado en sistema, pendiente de escaneo físico en rampa | `PRE_0` | 0 | `TRUE` |
| **`SIN_CARGAR`** | `RAMPA` | Paquete recibido en manifiesto, pendiente de subida | `RAMPA_0` | 1 | `TRUE` |
| **`A_BORDO`** | `RAMPA` | Escaneado y validado a bordo de la unidad | `RAMPA_1` | 2 | `TRUE` |
| **`BYPASS_TLACHIXQUI`** | `RAMPA` | Autorización manual de carga por supervisor | `RAMPA_2` | 3 | `TRUE` |
| **`RECHAZADO`** | `RAMPA` | Bulto dañado o no apto para ruta | `RAMPA_3` | 4 | `TRUE` |
| **`POR_ENTREGAR`** | `RUTA` | En camino hacia domicilio del cliente | `PRE` | 1 | `TRUE` |
| **`OK`** | `RUTA` | Entrega exitosa recabada (Firma + Nombre) | `DLWLC` | 2 | `TRUE` |
| **`NH`** | `RUTA` | No Home / Domicilio deshabitado | `DLWLE` | 3 | `TRUE` |
| **`BA`** | `RUTA` | Bad Address / Dirección incorrecta | `DLWLE` | 4 | `TRUE` |
| **`CA`** | `RUTA` | Closed / Negocio o empresa cerrada | `DLWLE` | 5 | `TRUE` |
| **`RD`** | `RUTA` | Refused / Cliente rechaza recibir paquete | `DLWLE` | 6 | `TRUE` |
| **`CM`** | `RUTA` | Customer Moved / Cliente se mudó | `DLWLE` | 7 | `TRUE` |
| **`RESCATE`** | `RUTA` | Traspaso de paquete a otra unidad | `OPS_0` | 8 | `TRUE` |
| **`RTO SVC`** | `RUTA` | Retorno a Centro de Servicio DHL | `OPS_1` | 9 | `TRUE` |
| **`PD`** | `RUTA` | Parcial (calculado en multipiezas) | `OPS_2` | 10 | `TRUE` |

---

## 🔒 3. LEYES INQUEBRANTABLES DE GOBERNANZA

1. **Prohibición de Estatus Sintéticos:** Queda estrictamente prohibido introducir textos no catalogados como `A_BORDO_CONFIRMADO`, `FALTANTE_DHL_NO_INGRESADO` o `FALTANTE_DHL`. Si un bulto no fue bipiado en el andén, su estado de rampa permanece en **`SIN_CARGAR`**.
2. **Intocabilidad de `Estatus_PID` en Rampa:** El estatus `OK` es exclusivo de la entrega física en calle al receptor final (`DLWLC`). La conciliación de rampa **NUNCA** debe mutar `Estatus_PID` a `OK`. Toda pieza en patio permanece en `PRE_ASIGNADO`.
3. **Mapeo de Columnas en `PIEZAS_PID`:**
   * **Columna D (`Estatus_PID`):** Valida contra `SELECT(CAT_CHECKPOINTS[Clave_Estatus], AND([Modulo] = "RUTA", [Activo] = TRUE))`.
   * **Columna E (`Escaneo_Validacion`):** Valida contra `SELECT(CAT_CHECKPOINTS[Clave_Estatus], AND([Modulo] = "RAMPA", [Activo] = TRUE))`.

---

## 📐 4. ESQUEMA ESTRICTO DE INYECCIÓN A LA HOJA "RUTA" (21 COLUMNAS)

Tanto el motor principal (`LectorIA_Pickups.js`) como el puente temporal (`Puente_Ruta_Temporal.js`) mapean estrictamente las siguientes 21 posiciones (Base 0):

| Idx | Columna | Encabezado en RUTA | Regla de Formato v81.1 PROD |
|:---:|:---:|:---|:---|
| 0 | A | Guia | Número de Guía AWB |
| 1 | B | PID | PID formateado a Doble J (`JJD...`) |
| 2 | C | C.P. | Código Postal (5 dígitos) |
| 3 | D | Piezas | Cantidad de piezas de la guía |
| 4 | E | Rcvr Addr 1 | Dirección de entrega (Línea 1) |
| 5 | F | Rcvr Addr 2 | Dirección de entrega (Línea 2) |
| 6 | G | Rcvr Addr 3 | Dirección de entrega (Línea 3) |
| 7 | H | Receiver Name | Nombre del destinatario |
| 8 | I | GPS | Vacío en rampa |
| 9 | J | Checkpoint | `PRE_ASIGNADO` |
| 10 | K | Comentarios | Vacío en rampa |
| 11 | L | Fecha asignacion | Formato `dd/MM/yyyy HH:mm:ss` |
| 12 | M | Fecha en ruta | Vacío en rampa |
| 13 | N | Imagen fachada | Vacío en rampa |
| 14 | O | ID correo | Correo del chofer / Pochteca |
| **15** | **P** | **EDD** | **Formato estricto de fecha: `d/M/yyyy` (Ej: `22/9/2026`)** |
| **16** | **Q** | **Actualizacion** | **Estrictamente VACÍA (`""`)** |
| 17 | R | KEY | UUID aleatorio de 8 caracteres |
| **18** | **S** | **Tipo de servicio** | **Cruce directo con `MATRIZ_CP` en `BOVEDA_BATCH_MAESTRO`** |
| 19 | T | Inter | `"Inter"` si es internacional, de lo contrario `""` |
| 20 | U | Telefono | Teléfono sanitizado del destinatario |

---

## ⚡ 5. UNIFICACIÓN VISUAL DE VERSIONES EN LA CONSOLA (v81.1 PROD)

Para erradicar la confusión generada por cachés o implementaciones desfasadas, se unificaron todos los identificadores de la interfaz:
* **Título de la Pestaña:** `OLLIN - Consola Maestra de Operaciones QRO (v81.1 PROD)`
* **Badge Superior (Header):** `V81.1 PROD`
* **Título de la Tarjeta:** `Procesamiento Unificado v81.1 PROD`
* **Prefijo de Logs de Consola:** `[v81.1 PROD]`

---

*Documento técnico de Amoxcalli archivado para memoria histórica y entrenamiento cognitivo del Ecosistema OLLIN.*  
*Fecha de Emisión: 16 de Septiembre de 2026.*
