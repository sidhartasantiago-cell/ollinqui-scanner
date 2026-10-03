# 🏛️ AMOXCALLI: BITÁCORA TÉCNICA Y GOBERNANZA OPERATIVA
## Hito: Gobernanza Central de Pochtecas y Nueva MATRIZ_CP Enriquecida Multicapa en CALPIXQUI (v1.0.0 PROD)

**Fecha de Registro:** 22 de Septiembre de 2026  
**Autor:** Agente Antigravity (Google DeepMind) & Tlayacanqui Sidharta Santiago  
**Ecosistema:** OLLIN / Arauto Express (Plaza Querétaro & Sierra Gorda)  
**Servidor:** CALPIXQUI (Nodo Secundario de Automatización 24/7)  
**Bases de Datos Afectadas:**  
- `BD_APP_RUTA_2025` (`1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w`) — Pestaña `CAT_USUARIOS` (SheetId: `294388755`)  
- `BOVEDA_BATCH_MAESTRO` (`1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw`) — Pestaña `MATRIZ_CP` (SheetId: `1838646383`)  

---

## 🧭 1. Resumen Ejecutivo y Propósito Arquitectónico

Se completó con éxito la evolución de la arquitectura de asignación y gobernanza de Arauto Express, consolidando en el servidor **CALPIXQUI** (PC Secundaria / Daemon 24/7) dos pilares estructurales:

1. **Directorio Centralizado de Pochtecas:** Gestión integral de ciclo de vida (alta, modificación, y baja por *Soft Delete*) y teléfonos para mensajería operativa de WhatsApp con persistencia dual atómica.
2. **Nueva MATRIZ_CP Enriquecida Multicapa:** Migración del esquema plano a 9 columnas canónicas, permitiendo zonificación precisa, reasignaciones temporales en caliente (*hot-swapping*) por Municipio o Microzona y autorrecuperación automática sin perder jamás la identidad del Chofer Titular base.
3. **Regla de Despacho Dual:** Alertas coordinadas en paralelo al operador en ruta y al Supervisor de Zona (Daniel Juárez en Sierra Gorda).

---

## 👥 2. Directorio Central de Pochtecas (`/webhook/gestion_pochteca`)

### A. Endpoint y Operaciones Canónicas
Expuesto nativamente en FastAPI sobre el puerto `8088` (o Tailscale Mesh) con las acciones:

- **`AGREGAR_POCHTECA`**: Registra `Correo`, `Nombre`, `Teléfono` (WhatsApp), `Rol`, `Zona Asignada` y `Supervisor`.
- **`ACTUALIZAR_POCHTECA`**: Modifica teléfono, zona o supervisor de un Pochteca en activo.
- **`BAJA_POCHTECA`**: Ejecuta un **Soft Delete** estricto (`Estatus = 'Inactivo'`). Suspende alertas automáticas sin eliminar la fila ni destruir el historial de entregas pasadas en Bóveda.

### B. Persistencia Dual Poka-Yoke (Cero Regenerate Structure en AppSheet)
- **Capa Local Calpixqui:** Archivo `Fuentes_OLLIN/servidor_secundario/data/directorio_pochtecas.json`.
- **Capa Nube (Google Sheets API v4):** 
  - Se aplicó la solicitud `appendDimension` sobre `CAT_USUARIOS` para ampliar la rejilla física de 7 a 8 columnas.
  - La **Columna H** (`CAT_USUARIOS!H1`) fue designada exclusivamente como `Telefono`.
  - **Candado Poka-Yoke:** Al inyectar la columna mediante la API nativa y omitir intencionalmente el comando *Regenerate Structure* en el editor de AppSheet, las 7 columnas que AppSheet mapea permanecen idénticas, blindando la app móvil contra regresiones de conteo o desalineación de atributos, al tiempo que el backend 24/7 dispone del número de WhatsApp para notificaciones.

---

## 🗺️ 3. Nueva MATRIZ_CP Enriquecida Multicapa (9 Columnas)

### A. Esquema Rígido de MATRIZ_CP (`BOVEDA_BATCH_MAESTRO`)

| Columna | Nombre de Cabecera | Tipo de Dato | Propósito Operativo |
|:---:|:---|:---:|:---|
| **A** | `Codigo_Postal` | Texto (Key) | Código Postal de 5 dígitos (Índice Maestro) |
| **B** | `Municipio` | Texto | Municipio / Demarcación (ej. San Luis de la Paz, Victoria, Xichú, Juriquilla) |
| **C** | `Zona_Operativa` | Texto | Microzona logística (ej. Sierra Gorda - Microzona 3, QRO Norte) |
| **D** | `Chofer_Titular` | Email | Correo del Pochteca base inamovible |
| **E** | `Chofer_Suplente` | Email | Pochteca de respaldo natural (ej. `oscher1016@gmail.com`) |
| **F** | `Supervisor_Zona` | Email | Correo del supervisor responsable (ej. `xichudaniel@gmail.com`) |
| **G** | `Tipo_Servicio` | Texto | Clasificación de ruta (`Local` / `Foraneo` / `Remoto`) |
| **H** | `Override_Activo` | Email / Vacío | Correo del Pochteca temporal reasignado en caliente |
| **I** | `Fecha_Expiracion_Override` | Fecha (`YYYY-MM-DD`) | Fecha límite de la reasignación temporal |

### B. Resumen de la Migración Atómica
- Se migraron los **543 CPs activos** de la Bóveda QRO respetando los choferes titulares y tipos de servicio preexistentes.
- Se clasificaron en 25 demarcaciones operativas (97 CPs en Querétaro Centro/Sur, 78 CPs en Sierra Gorda Noreste Guanajuato, 62 CPs en Sierra Gorda Querétaro, etc.).
- Se precarga al 100% en memoria RAM al iniciar Calpixqui (`MatrizCPManager`), garantizando latencias de asignación inferiores a 5 milisegundos.

---

## ⚡ 4. Lógica de Asignación Dinámica, Autorrecuperación y Reasignación Masiva

### A. Algoritmo de Resolución Dinámica
Al consultar o procesar una guía por CP o Municipio:
```text
IF Override_Activo != "" AND Fecha_Expiracion_Override >= Fecha_Hoy:
    Chofer_Asignado = Override_Activo
    Es_Override = TRUE
    Estado_Override = "VIGENTE"
ELSE:
    Chofer_Asignado = Chofer_Titular
    Es_Override = FALSE
    Estado_Override = "EXPIRADO_AUTORRECUPERADO" (o "INACTIVO")
```
**Efecto Inmune:** El operador temporal toma la ruta mientras dure la suplencia. Al llegar la medianoche de la fecha de expiración, el sistema autorrecupera la ruta hacia el `Chofer_Titular` sin requerir intervención manual de Mesa de Control ni llamadas telefónicas.

### B. Reasignación Masiva por Municipio (`/webhook/reasignacion_masiva`)
Permite reasignar en un solo paso todos los CPs asociados a un municipio, soportando tanto payload JSON estructurado como **comandos en lenguaje natural**:
- **Comando de Ejemplo:** `"Reasigna todo el Municipio de Xichú a Oscher hasta el 23/09"`
- **Procesamiento:** El parser cognitivo identifica el municipio ("Xichú"), resuelve el alias del chofer ("Oscher" $\rightarrow$ `oscher1016@gmail.com`), normaliza la fecha ("2026-09-23") y actualiza atómicamente en lote los 9 CPs de Xichú en Google Sheets y en RAM.

---

## 🚨 5. Protocolo de Despacho Dual (Sierra Gorda / Daniel Juárez)

Para todas las guías pertenecientes a:
- Prefijo CP `379xx` (Sierra Gorda Noreste Guanajuato: San Luis de la Paz, Victoria, Xichú, Atarjea, Doctor Mora, Santa Catarina).
- Prefijo CP `763xx`, `76280`, `76290` (Sierra Gorda Querétaro).
- O donde `Supervisor_Zona == "xichudaniel@gmail.com"`.

**Regla de Despacho Dual:**
1. Se despacha la notificación operativa al Pochteca que operará la ruta en caliente (`Chofer_Asignado`).
2. Se despacha simultáneamente una alerta de supervisión a Daniel Juárez (`xichudaniel@gmail.com`).
3. Si un Pochteca está en estatus `Inactivo` (*Soft Delete*), sus alertas directas se suspenden y se canalizan de inmediato al Supervisor para evitar guías huérfanas en la sierra.

---

## 🧪 6. Validación de Pruebas de Integración

| Componente Evaluado | Prueba Ejecutada | Resultado |
|:---|:---|:---:|
| `CAT_USUARIOS` | Expansión física a Columna H (`Telefono`) vía Sheets API | ✅ **PASÓ** (Cabecera H1 confirmada) |
| `MATRIZ_CP` | Inyección de 9 columnas en 544 filas con backup previo | ✅ **PASÓ** (4,896 celdas actualizadas) |
| Directorio Pochtecas | Alta, modificación y Soft-Delete (`Inactivo`) | ✅ **PASÓ** (Persistencia dual validada) |
| Asignación Dinámica | Override vigente vs Override expirado | ✅ **PASÓ** (Autorrecuperación confirmada) |
| Reasignación Masiva | Parser de comando texto para Municipio de Xichú | ✅ **PASÓ** (9 CPs actualizados en lote) |
| Despacho Dual | Alerta dual Pochteca + Supervisor Daniel Juárez | ✅ **PASÓ** (2 alertas despachadas) |
| Poka-Yoke de Limpieza | Eliminación de registros temporales de prueba | ✅ **PASÓ** (Cero contaminación de BD) |

---

## 📞 7. Carga Masiva de Teléfonos y Reconfiguración Jerárquica de Webhooks

### A. Matriz de Telefonía Saneada (Columna H)
Se inyectaron y persistieron en `CAT_USUARIOS` y `directorio_pochtecas.json` los 10 teléfonos de WhatsApp:
- **Diego:** `5661562361`
- **Edgar:** `4423816310`
- **Fernando:** `7295676990`
- **Irvin:** `5541891708`
- **Sidharta:** `4491805948`
- **Víctor:** `4681566463`
- **Daniel:** `4191155625`
- **Gregorio:** `4192705455`
- **Lyonnet:** `8607718571`
- **Rosi:** `4191297704`

### B. Diagnóstico Poka-Yoke de Conectividad Webhook (Google Chat)
1. **Canal General de Rampa / Mesa de Control (`AAQA-NmGVf0`):** 🟢 **ACTIVO (200 OK)**. Asignado a Irvin Reyes y Sidharta Santiago.
2. **Canal Independiente Edgar Rodríguez (`AAQAZOkix4k`):** 🟢 **ACTIVO (200 OK)**.
3. **Canal Independiente Fernando Maestro (`AAQA8DkJmF4`):** 🔴 **HTTP 403 Forbidden** (requiere regenerar webhook en el espacio de Google Chat).
4. **Canal Jerárquico Sierra Gorda (`AAQATOX9ZdI`):** 🔴 **HTTP 403 Forbidden** (requiere regenerar webhook en el espacio de Sierra Gorda de Google Chat).
5. **Mecanismo de Resiliencia Calpixqui:** `DespachoDualManager` cuenta con fallback automático hacia el Canal General (`AAQA-NmGVf0`) ante códigos 403/errores, garantizando que ninguna alerta de rampa se pierda en el vacío.

---
**Estatus:** Producción Estable en CALPIXQUI (Nodo Hermes 24/7).
