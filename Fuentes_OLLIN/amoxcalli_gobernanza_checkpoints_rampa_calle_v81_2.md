# 📜 AMOXCALLI: Gobernanza de Checkpoints y Blindaje de Rampa (v81.2 PROD)
## Ecosistema OLLIN | Regla Inquebrantable de "SIN_CARGAR" & Higiene de Datos
**Documento Técnico de Referencia para el Amoxcalli y Fuentes de NotebookLM**  
*Plaza Querétaro (QRO) — Arauto Express*

---

> [!IMPORTANT]
> **Estatus:** Vigente, Normalizado y Desplegado en Producción.  
> **Versión Canónica Unificada:** `v81.2 PROD`.  
> **Regla Suprema de Rampa:** *"Todo bulto nace y permanece obligatoriamente en `SIN_CARGAR` tras la ingesta digital. Ningún proceso automático de backend puede mutarlo a `A_BORDO`. La transición a `A_BORDO` es potestad exclusiva del escaneo físico en rampa con la metralleta láser"*.  
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
                  │    • Escaneo_Validacion = "SIN_CARGAR" (FIJO) │
                  │    • Estatus_Guia       = "PRE_ASIGNADO"      │
                  └───────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────▼───────────────────────┐
                  │ 2. CUSTODIA EN ANDÉN (Módulo RAMPA)           │
                  │    • Al bipiarse en rampa ➔ "A_BORDO"         │
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

## 🔒 3. REINGENIERÍA APLICADA EN v81.2 PROD

1. **Desacoplamiento Total de la Auto-Conciliación:**
   Se eliminó la llamada automática de `conciliarRampaConBatchQRO()` dentro del Procesamiento Unificado de Batch. Al ingerir el Excel de DHL, los paquetes NO se marcan como `A_BORDO` por escaneos históricos en `RECEPCION_RAMPA`.
2. **Blindaje de Inyección a `PIEZAS_PID`:**
   El valor por defecto es y permanece estrictamente en **`SIN_CARGAR`**.
3. **Rutina de Higiene Automática:**
   Toda ejecución en la versión v81.2 barre la tabla `PIEZAS_PID` y asegura que ningún bulto quede en `A_BORDO` sin haber sido bipiado físicamente en el turno.
4. **Identificadores Visuales Unificados:**
   * Título de Pestaña: `OLLIN - Consola Maestra de Operaciones QRO (v81.2 PROD)`
   * Badge Header: `V81.2 PROD`
   * Tarjeta de Procesamiento: `Procesamiento Unificado v81.2 PROD`
   * Logs de Consola: `[v81.2 PROD]`

---

*Documento técnico de Amoxcalli archivado para memoria histórica y entrenamiento cognitivo del Ecosistema OLLIN.*  
*Fecha de Emisión: 16 de Septiembre de 2026.*
