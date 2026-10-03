# 🏛️ CONSOLA_CONCILIACION_Y_CCP_2026
## Motor de CCP CFDI 4.0 — Arauto Express / Ecosistema OLLIN

**Versión:** 1.0.0 PROD  
**Fecha de creación:** 21/Sep/2026  
**Tlayacanqui:** Sidharta Santiago Garduño  
**Desarrollado por:** Antigravity (Google DeepMind)  

---

## 🎯 Objetivo Estratégico

Desbloquear el flujo de capital retenido por clientes corporativos (DHL) mediante la automatización de **Complementos de Recepción de Pagos (CCP CFDI 4.0)**. El sistema aísla la gestión contable de la Bóveda operativa (Ollinqui/BD_APP_RUTA_2025) y funciona como un **Buzón Inteligente** en Google Drive que construye la carga masiva en el formato exacto de `CargarCFDI.csv` para **Facturo Por Ti**.

---

## 🗺️ Arquitectura del Sistema

```
CONSOLA_CONCILIACION_Y_CCP_2026 (Google Sheet)
├── TABLERO              → KPIs ejecutivos de cartera retenida vs. CCPs timbrados
├── CONCILIADOR          → Matriz de captura y match de depósitos bancarios
├── DETALLE_DOCUMENTOS   → Desglose 1-a-Muchos de folios pagados con UUIDs
├── EXPORTADOR_FACTURO_POR_TI → Espejo visual del CSV de carga masiva
└── CUENTAS_POR_PAGAR_FASE2  → Reservado para Fase 2 (proveedores)

Drive: g:/OLLIN_FINANZAS/BUZON_CCP/
├── 01_COMPROBANTES_BANCO  → Recibos BBVA / comprobantes SPEI
├── 02_PAYMENT_ADVICE      → Avisos de pago de DHL (PDF/TXT)
└── 03_CARGAS_GENERADAS    → CSVs CargarCFDI.csv producidos
```

---

## 📋 Flujo de Operación (3 Pasos)

### Paso 1: Depositar archivos en el Buzón
1. Descarga el comprobante bancario del depósito SPEI de DHL
2. Descarga el Payment Advice de DHL (desde el portal o correo)
3. Coloca los archivos en sus carpetas respectivas del Buzón Drive

### Paso 2: Sincronizar y Match
1. Abrir `CONSOLA_CONCILIACION_Y_CCP_2026`
2. Menú **🚀 OLLIN FINANZAS** → **⚡ Sincronizar Buzón Drive & Match**
3. El sistema leerá los archivos, buscará los UUIDs en Control de Folios
4. Revisar `CONCILIADOR` y llenar manualmente los `Folios_DHL_Pagados` si no se extrajeron automáticamente

### Paso 3: Generar CSV y Timbrar
1. Menú **🚀 OLLIN FINANZAS** → **📥 Generar CargarCFDI.csv para Facturo Por Ti**
2. Ingresar: Monto, Fecha del depósito, Clave SPEI
3. El CSV se guarda automáticamente en `03_CARGAS_GENERADAS`
4. Descargar el CSV y subirlo a **Facturo Por Ti** (carga masiva)
5. Una vez timbrado, usar **🔒 Cerrar Folio CCP en Control de Folios** con el folio asignado

---

## ⚙️ Configuración Inicial (Solo una vez)

### 1. Crear el Google Sheet
1. Crear nuevo Google Sheet llamado `CONSOLA_CONCILIACION_Y_CCP_2026`
2. Copiar el código de `Codigo_gs_CCP_Conciliacion.gs` al editor de Apps Script
3. Guardar con el nombre `Codigo_gs_CCP_Conciliacion`

### 2. Configurar Script Properties
En el editor de Apps Script:
- Ve a **Proyecto > Propiedades del proyecto**
- Agrega la propiedad:
  - **Clave:** `ID_CONTROL_FOLIOS`
  - **Valor:** ID de tu Google Sheet "Control de Folios"

El ID se encuentra en la URL del Sheet:
```
https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
```

### 3. Inicializar Hojas
- Menú **🚀 OLLIN FINANZAS** → **🛠️ Inicializar Hojas del Sistema**
- Esto creará las 5 pestañas con sus esquemas canónicos

### 4. Estructura de Carpetas Drive
Las carpetas se crean automáticamente en Drive la primera vez que se ejecuta la sincronización. Asegúrate de tener permisos de escritura en Drive.

---

## 📄 Formato CargarCFDI.csv (Facturo Por Ti)

El CSV generado sigue exactamente este layout:

```
Pago,FechaPago,FormaPago,Moneda,TipoCambio,MontoPago,NúmeroOperación,...
DetallePago,dd/mm/yyyy hh:mm:ss,,MXN - Peso Mexicano,1,...
DocumentosRelacionados,UUID,Serie,Folio,Moneda,...
DetalleDocumentosRelacionados,[UUID-1],[Serie],[Folio],[Moneda],1,1,[Parcialidad],...
DetalleDocumentosRelacionados,[UUID-2],...
```

**Configuración fiscal fija (CFDI 4.0):**
- Forma de Pago: `03` (Transferencia electrónica SPEI)
- Moneda: `MXN - Peso Mexicano`
- Tipo de Cambio: `1`
- Objeto de Impuesto: `02 - Sí objeto de impuesto.`
- Tipo Impuesto: `2 - IVA`
- Factor: `1 - Tasa`
- Tasa: `0.160000` (16%)

---

## 🧪 Prueba Controlada — Lote 1051-1054

Para validar el sistema antes del primer timbrado real:
1. Menú **🚀 OLLIN FINANZAS** → **Ver Estado del Sistema** (verifica configuración)
2. En el editor de Apps Script, ejecutar manualmente: `ejecutarPruebaControladaLote1051_1054()`
3. Revisar el CSV generado en `03_CARGAS_GENERADAS`
4. **Reemplazar los UUIDs de demostración** con los reales antes de subir a Facturo Por Ti

**Datos de la prueba:**
- Depósito: $164,911.40 MXN
- Fecha: 15/Sep/2026
- Clave SPEI: 2026091500000001234
- Facturas: 1051, 1052, 1053, 1054
- Monto por factura: ~$41,227.85 MXN c/u

---

## 🔒 Candados de Seguridad

1. **Aislamiento de Bóveda**: Este sistema NO toca `VALIDACIÓN_QRO_2025`, `BD_APP_RUTA_2025`, ni ninguna Bóveda operativa. Es un sistema contable completamente aislado.
2. **Solo Lectura de Control de Folios**: `realizarMatchControlFolios()` lee pero no modifica Control de Folios (excepto `marcarCCPCompletado()` que agrega la columna Folio_CCP).
3. **Poka-Yoke de UUID**: El CSV solo incluye documentos con UUID válido (> 30 chars). Los UUIDs de demostración quedan excluidos automáticamente.
4. **Prevención de Duplicados**: Ambas funciones de sincronización verifican IDs existentes antes de insertar.

---

## 📝 Historial de Versiones

| Versión | Fecha | Cambios |
|:-------:|:-----:|:--------|
| 1.0.0 | 21/Sep/2026 | Versión inicial PROD. Motor completo CCP CFDI 4.0 |

---

*Desarrollado por Antigravity (Google DeepMind) para el Ecosistema OLLIN — Arauto Express*
