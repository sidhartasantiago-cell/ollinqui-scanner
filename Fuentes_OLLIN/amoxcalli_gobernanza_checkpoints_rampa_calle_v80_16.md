# 📜 AMOXCALLI: Gobernanza de Checkpoints de Rampa y Calle (v80.16 PROD)
## Ecosistema OLLIN | Catálogo Canónico CAT_CHECKPOINTS & Higiene de Datos
**Documento Técnico de Referencia para el Amoxcalli y Fuentes de NotebookLM**  
*Plaza Querétaro (QRO) — Arauto Express*

---

> [!IMPORTANT]
> **Estatus:** Vigente, Normalizado y Desplegado en Producción.  
> **Catálogo Rector:** Pestaña `CAT_CHECKPOINTS` en `BD_APP_RUTA_2025` (`1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w`).  
> **Autoridad:** Tlayacanqui Sidharta Santiago / Tlachixqui Irvin Reyes.  
> **Axioma Rector:** *"La base de datos es la ley; ningún script ni proceso automatizado puede crear estatus ajenos a `CAT_CHECKPOINTS`"*.

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
                  │    • Estatus_PID       = "PRE_ASIGNADO"       │
                  │    • Escaneo_Validacion = "SIN_CARGAR"        │
                  │    • Estatus_Guia      = "PRE_ASIGNADO"       │
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

Toda tabla (`PIEZAS_PID`, `GUIAS_ASIGNADAS`), formulario de AppSheet y script de Apps Script (`LectorIA_Pickups.js`, `Receptor_PU.js`) debe utilizar exclusivamente estas claves:

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

### Ley 1: Prohibición de Estatus Sintéticos
Queda estrictamente prohibido introducir textos no catalogados como `A_BORDO_CONFIRMADO`, `FALTANTE_DHL_NO_INGRESADO` o `FALTANTE_DHL`. 
* Si un bulto no fue bipiado en el andén, su estado de rampa es canónicamente **`SIN_CARGAR`**.
* La falta de bipiado constituye en sí misma la prueba legal y financiera de no recepción en custodia.

### Ley 2: Intocabilidad de `Estatus_PID` en Rampa
El estatus `OK` es exclusivo de la entrega física en calle al receptor final (`DLWLC`). 
* La conciliación de rampa **NUNCA** debe mutar `Estatus_PID` a `OK`.
* Toda pieza en patio permanece en `PRE_ASIGNADO` hasta que la unidad es despachada a ruta.

### Ley 3: Mapeo de Columnas en `PIEZAS_PID`
* **Columna D (`Estatus_PID`):** Valida contra `SELECT(CAT_CHECKPOINTS[Clave_Estatus], AND([Modulo] = "RUTA", [Activo] = TRUE))`.
* **Columna E (`Escaneo_Validacion`):** Valida contra `SELECT(CAT_CHECKPOINTS[Clave_Estatus], AND([Modulo] = "RAMPA", [Activo] = TRUE))`.

---

## 🛠️ 4. REINGENIERÍA APLICADA EN EL BACKEND (`LectorIA_Pickups.js`)

En la versión **v80.16 PROD**, se implementaron los siguientes cambios correctivos:

1. **Alineación de Conciliación (`conciliarRampaConBatchQRO`):**
   * Coincidencia en rampa ➔ Escribe **`A_BORDO`** en `Escaneo_Validacion`.
   * Sin escaneo en rampa ➔ Conserva **`SIN_CARGAR`** en `Escaneo_Validacion`.
   * Protección de `Estatus_PID` ➔ Mantiene **`PRE_ASIGNADO`**.
2. **Auto-Sanitización Masiva en RAM:**
   * Detección y normalización inmediata de cualquier residuo previo (`A_BORDO_CONFIRMADO` ➔ `A_BORDO`, `FALTANTE_DHL_NO_INGRESADO` ➔ `SIN_CARGAR`, `OK` prematuro ➔ `PRE_ASIGNADO`).
   * Escritura en bloque (Bulk Write) para evitar sobrecarga de cuota en Google Sheets API.

---

*Documento técnico de Amoxcalli archivado para memoria histórica y entrenamiento cognitivo del Ecosistema OLLIN.*  
*Fecha de Emisión: 16 de Septiembre de 2026.*
