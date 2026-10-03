# 📜 AMOXCALLI — MEMORIA TÉCNICA CANÓNICA
## PAINANI v85.0 PROD: SEPARACIÓN DE FASES Y ESCANEO SECUNDARIO DE INTERNACIONALES (EDD FÍSICO)

**Fecha:** 28 de Septiembre de 2026  
**Ecosistema:** OLLIN v2026.10 / Arauto Express  
**Entorno:** Andén y Rampa Querétaro (`painani.arauto.express`)  
**Autoridad:** Tlayacanqui Sidharta Santiago / Tlachixqui Irvin Reyes  
**ID de Componente:** `PAINANI_RAMPA_V85_INTER_EDD`  

---

### 1. CONTEXTO OPERATIVO Y CAUSA RAÍZ
En el andén de Querétaro, la recepción física de paquetería de DHL se compone de dos momentos operativos críticos que no deben cruzarse:
1. **Fase 1 (Acta Notarial de Rampa):** Conteo veloz y ciego de todo el material que desciende del camión de DHL para conciliar piezas declaradas vs piezas físicas recibidas, cerrando el acta de rampa con la firma del chofer de DHL.
2. **Fase 2 (Escaneo Secundario de Internacionales por EDD Físico):** Una vez firmado y cerrado el camión, el Tlachixqui (Irvin Reyes) separa los paquetes internacionales con etiqueta física y requiere asignarles su fecha prometida de entrega (EDD), Código Postal y Zona Logística antes de su despacho a calle.

**Problema Detectado:** Si los escaneos de internacionales se realizaban en la misma sesión o pestaña del camión, los conteos del acta notarial se contaminaban y existía riesgo de alterar las discrepancias financieras con DHL.

**Solución Implementada en v85.0 PROD:** Separación arquitectónica estricta en dos fases operativas independientes tanto en el Frontend (`painani.arauto.express`) como en la Bóveda de Base de Datos (`BOVEDA_BATCH_MAESTRO`).

---

### 2. ARQUITECTURA DE DATOS Y BÓVEDA INDEPENDIENTE

Toda la data de rampa reside exclusivamente en la **Bóveda Batch Maestro** (`1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw`). Queda estrictamente prohibido tocar `BD_APP_RUTA_2025` durante este proceso.

#### A. Pestaña de Fase 1: `RECEPCION_RAMPA`
- Almacena exclusivamente el conteo de recepción física del camión DHL.
- Conciliación: Piezas declaradas vs piezas bipiadas.
- Firma notarial del chofer DHL y dictamen de faltantes/excedentes.

#### B. Pestaña de Fase 2: `INTERNACIONALES_EDD` (13 Columnas Rígidas)
Los registros de internacionales se escriben de forma independiente y aislada bajo el siguiente esquema rígido:

| Col | Índice | Campo | Tipo | Descripción |
|:---:|:---:|:---|:---|:---|
| **A** | 0 | `ID_Lote_Inter` | String | Folio del lote internacional (ej. `INT-20260928-1234`) |
| **B** | 1 | `Timestamp_Escaneo` | ISO Date | Marca de tiempo atómica del escaneo en dispositivo |
| **C** | 2 | `Codigo_Original` | String | Código bipiado tal cual se leyó en etiqueta (`JJD...`) |
| **D** | 3 | `PID_Sanitizado_Boveda`| String | PID transformado a estándar JD según Ley Doble J |
| **E** | 4 | `EDD_Fisico_Asignado` | Date | Fecha prometida leída de la etiqueta física (`YYYY-MM-DD`) |
| **F** | 5 | `CP` | String (5) | Código Postal resuelto de la etiqueta o del escaneo previo |
| **G** | 6 | `Zona_Logistica` | String | Zona resuelta en pantalla (ej. `ZONA 3 - NORTE / JURIQUILLA`) |
| **H** | 7 | `Ruta_Sugerida` | String | Clave de ruta sugerida (ej. `RUTA 03`) |
| **I** | 8 | `Tlachixqui_Auditor` | String | Nombre del auditor responsable (Irvin Reyes) |
| **J** | 9 | `ID_Recepcion_Origen` | String | Folio del acta del camión de donde provienen los paquetes |
| **K** | 10 | `Conteo_Acumulado_Lote`| Number | Bultos clasificados acumulados en este lote |
| **L** | 11 | `Estatus_Clasificacion`| String | `CLASIFICADO_EDD` o `INCIDENCIA_FOTO_IA` |
| **M** | 12 | `Marca_Tiempo_Servidor`| Date/Time | Fecha y hora en que se asentó en Bóveda |

---

### 3. REGLAS INVIOLABLES DE NEGOCIO (POKA-YOKE)

1. **Ley "J de Oro" (Filtro Anti-AWB):**
   - Si se escanea un código de 10 dígitos numéricos puros (Guía AWB DHL), el sistema detiene el proceso con alerta sonora de error y pantalla roja. **No suma al odómetro**. Solo se aceptan PIDs que inicien con `JJD` o `JD` con longitud > 10.
2. **Ley de la Doble J:**
   - En la PWA y en andén se conserva `JJD...` para trazabilidad de bulto.
   - En Bóveda se sanitiza automáticamente a `JD...` en la columna D.
3. **Módulo de Foto Etiqueta Ilegible Internacional:**
   - Botón físico `📸 Foto Etiqueta Ilegible Internacional`.
   - Genera folio auxiliar `PID_INC_INT_XXXX` y suma +1 al conteo.
   - Respalda la imagen en Drive y la envía a la Bóveda con lectura OCR/IA.
4. **Flujo de Cierre Transicional:**
   - Al finalizar el acta de camión, el Tlachixqui puede presionar:
     `🌐 Cerrar Acta y Pasar a Escaneo Secundario Internacional (EDD)`.
   - El sistema cierra notarialmente el camión, transmite el dictamen a Google Chat y transfiere el folio del camión como `ID_Recepcion_Origen` a la fase de internacionales de forma automática.

---

### 4. GUÍA RÁPIDA PARA EL TLACHIXQUI (IRVIN REYES)

```
[🚚 FASE 1: DESCARGA CAMIÓN DHL]
  1. Abre painani.arauto.express
  2. En pestaña "1. Recepción Camión", anota chofer y piezas que dice traer.
  3. Bipia toda la descarga del camión.
  4. Presiona "📄 Generar Acta".
  5. Firma el chofer DHL en el acta física.
  6. Presiona el botón azul: "🌐 Cerrar Acta y Pasar a Escaneo Secundario Internacional (EDD)".

[🌐 FASE 2: CLASIFICACIÓN INTERNACIONAL]
  1. La app abre directamente la pestaña "2. Internacionales (EDD Físico)".
  2. El ID del camión ya viene precargado.
  3. Selecciona la fecha EDD en los botones rápidos: [Hoy] [Mañana] [+2 Días] [+3 Días].
  4. Bipia los paquetes internacionales. La pantalla te dice su zona y C.P. de inmediato.
  5. Si una etiqueta viene rota o no lee, dale a "📸 Foto Etiqueta Ilegible Internacional".
  6. Al terminar todos los internacionales, presiona "📜 Cerrar Lote y Ver Resumen" y ¡listo!
```

---

### 5. ESTADO DEL DESPLIEGUE PRODUCTIVO
- **Frontend PWA:** Desplegado en Netlify (`https://painani.arauto.express/`) bajo Cache Worker `painani-v85`.
- **Backend Receptor:** Desplegado vía Clasp en `Receptor_PU.js` (Script ID: `1OPEYOE5qQPz-Jn5998dtGvMXexLyrPBuTNQVlDmZdHybg7Jh78OkSMjB`).
- **Bóveda:** Conexión validada a `BOVEDA_BATCH_MAESTRO` (`1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw`).
