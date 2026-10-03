# 🏛️ MEMORIA TÉCNICA AMOXCALLI: FRENTE 6 — DEMONIO DE BARRIDO CONTINUO Y MONITOREO DE RECLAMOS DHL EN GMAIL

**Fecha de Ejecución:** 2026-09-23  
**Módulo:** Frente 6 — Escudo de Reclamos DHL / Mesa de Control 24/7  
**Servidor:** Nodo Secundario de Automatización (PC Secundaria)  
**Autor:** Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)  

---

## 1. Resumen Ejecutivo
Se ejecutó con éxito el **barrido inmediato de reclamos pendientes en Gmail** bajo la etiqueta `03_RECLAMOS_DHL` y se activó el **Demonio de Barrido Continuo 24/7** (`daemon_frente6_reclamos.py`) para monitorear autónomamente la bandeja de entrada cada 5 minutos (300 segundos).

---

## 2. Resultados del Barrido Inmediato
- **Guía procesada:** `4116134562`
- **PID extraído y sanitizado (Doble J):** `JD014600012640962864`
- **Motivo / Incidencia:** `Dirección no localizada / Aclaración urgente de entrega`
- **Pochteca en Bóveda (`BD_APP_RUTA_2025`):** Edgar Rodríguez (`edgar.rodriguez.arauto@gmail.com`)
- **Inyección en Bóveda (`MONITOR_INCIDENCIAS_AE`):** Asentado en `MONITOR!A15:Y15` cumpliendo rígidamente el esquema maestro de 25 columnas.
- **Acción Gmail:** Marcado con `03_RECLAMOS_DHL/PROCESADOS` y retirado de `INBOX` para mantener la meta de Inbox Zero.

---

## 3. Demonio de Monitoreo Continuo 24/7 (`daemon_frente6_reclamos.py`)
- **Frecuencia:** Cada 5 minutos (300 segundos).
- **Proceso:** Demonio en segundo plano (PID en background), tolerante a fallos de conexión.
- **Flujo:**
  1. Verifica estado del Calpixqui WhatsApp Gateway (localhost:3001).
  2. Consulta la presencia de nuevos correos bajo `label:03_RECLAMOS_DHL -label:03_RECLAMOS_DHL/PROCESADOS`.
  3. Al detectar correos, invoca de forma atómica:
     - Ingesta Cognitiva con Gemini 3.6 Flash.
     - Identificación del chofer en `BD_APP_RUTA_2025`.
     - Inyección en `MONITOR_INCIDENCIAS_AE`.
     - Despacho de Alerta de Rescate por WhatsApp a Sidharta Santiago e Irvin Reyes.
     - Auto-archivado y etiquetado en Gmail.
  4. Registra cada ciclo en `logs/frente6_daemon.log`.

---

## 4. Estado de Servicios y Pasarelas
| Componente | Estatus | Detalle |
| :--- | :---: | :--- |
| **Calpixqui Gateway (Node.js)** | 🟡 CONNECTING | Escuchando en `http://localhost:3001`. Requiere escaneo del QR fresco guardado en el Escritorio. |
| **Worker / Demonio Frente 6** | 🟢 ONLINE (24/7) | Ejecutándose en segundo plano (`daemon_frente6_reclamos.py`). Ciclos activos cada 5 min. |
| **Bóveda Ingesta (`MONITOR_INCIDENCIAS_AE`)** | 🟢 ONLINE | Fila 15 asentada exitosamente con 25 columnas. |
| **Gmail Web App (Apps Script)** | 🟢 ONLINE | Conexión a `03_RECLAMOS_DHL` y auto-archivado operativo. |
