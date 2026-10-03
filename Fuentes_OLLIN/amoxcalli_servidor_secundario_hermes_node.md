# 🏛️ AMOXCALLI: ARQUITECTURA Y ESPECIFICACIÓN TÉCNICA
## Servidor de Automatización de Fondo 24/7 — AGENTE CALPIXQUI (Calpix) en PC Secundaria

**Ecosistema OLLIN — Arauto Express (Plazas Querétaro / León)**  
**Fecha de Publicación y Bautizo Oficial:** 22 de Septiembre de 2026  
**Autoridad Rectora:** Tlayacanqui Sidharta Santiago  
**Ingeniería de Sistemas:** Antigravity (Google DeepMind)  
**Estatus:** ✅ PROD Ready / Activación Certificada  
**Ruta en Repositorio:** `Fuentes_OLLIN/servidor_secundario/`  
**Ruta en Bóveda Amoxcalli:** `g:\Mi unidad\Fuentes_NotebookLM_Amoxcalli_AE\amoxcalli_servidor_secundario_hermes_node.md`  

---

## 1. 🏛️ Bautizo Oficial y Filosofía Náhuatl del Agente

Por decreto del Tlayacanqui Sidharta Santiago, el orquestador asíncrono 24/7 que reside en la PC secundaria del centro de operaciones es nombrado oficialmente:

> ### **AGENTE CALPIXQUI** (o simplemente **CALPIX**)  
> *"El Guardián de la Casa y Administrador de la Bóveda"*

### Mapeo en el Panteón OLLIN:
* **Amoxcalli:** La Bóveda Central y Casa de los Libros (Google Sheets, Bóveda Batch, Histórico 2023).
* **Pochtecas:** Los embajadores del camino (choferes y operadores en calle con Ollinqui AppSheet).
* **Painani:** El corredor veloz de rampa (escaneo masivo de cross-docking y metralleta).
* **Teoyolotl:** El corazón pensante (Inteligencia Artificial Gemini 3.6 Flash para visión y voz).
* **CALPIXQUI:** **El Guardián de la Casa.** Aquel que nunca duerme (daemon 24/7). Cuida las provisiones, concilia los pagos (CCP), audita la integridad de las 25 columnas, sanitiza la Doble J y vigila que ninguna evidencia se pierda en el camino.

---

## 2. 📋 Resumen Ejecutivo y Especificaciones de Hardware

Para maximizar la resiliencia operativa y liberar de sobrecarga computacional a la estación principal de desarrollo y despacho, CALPIXQUI opera como un **Headless Orchestrator 24/7**.

### Premisa Fundamental: Delegación Ligera vs. Carga Local
- **Hardware Asignado:** Intel Core i3-6100 (2 núcleos / 4 hilos @ 3.70 GHz), 16 GB RAM DDR4, Almacenamiento SSD, Windows 10/11 Pro, Conexión Tailscale activa.
- **Principio Rector:** La máquina **NO ejecuta LLMs locales pesados** (que saturarían los 2 núcleos del i3 y ralentizarían la respuesta). En su lugar, opera como un **orquestador asíncrono ultraligero** que:
  1. Recibe peticiones en menos de 50ms respondiendo confirmación inmediata al chofer/andén.
  2. Delega el análisis cognitivo y multimodal a la **API de Gemini 3.6 Flash (<300ms)** vía endpoints HTTP directos.
  3. Ejecuta de forma local y atómica la sincronización con las Bóvedas de Google Sheets, la conciliación de datos, la vigilancia de carpetas compartidas y el disparo de alertas a Google Chat y WhatsApp.

---

## 3. 🗺️ Topología de Red y Flujo Multimodal

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TOPOLOGÍA DE RED OLLIN                          │
└────────────────────────────────────────────────────────────────────────┘

 [ Pochteca en Calle / Andén ]
 (Teoyolotl Mic / Metralleta PWA)
              │
              │ HTTP POST (<50ms ack)
              ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │     AGENTE CALPIXQUI 24/7 (HEADLESS ORCHESTRATOR - PC SECUNDARIA)     │
 │       Intel Core i3-6100 | 16 GB RAM | SSD | Tailscale IP Privada     │
 │                                                                       │
 │   ┌──────────────────────┐        ┌───────────────────────────────┐   │
 │   │ FastAPI Webhook      │───────►│ Cola de Tareas Asíncronas     │   │
 │   │ Puerto 8088 / Tailscale│       │ (Background Worker Thread)    │   │
 │   └──────────────────────┘        └──────────────┬────────────────┘   │
 │                                                  │                    │
 │   ┌──────────────────────┐                       │                    │
 │   │ Vigilante Buzón Local│───────────────────────┘                    │
 │   │ (inbox_multimodal/)  │                                            │
 │   └──────────────────────┘                                            │
 └──────────────────┬────────────────────────────────────────────────────┘
                    │
       ┌────────────┴──────────────────────────┐
       ▼                                       ▼
┌──────────────────────────────┐ ┌──────────────────────────────────────┐
│  API GEMINI 3.6 FLASH        │ │  BÓVEDAS GOOGLE SHEETS & ALERTAS    │
│  (Multimodal <300ms)         │ │  • VALIDACIÓN_QRO_2025 (25 Cols)     │
│  • Transcripción verbatim    │ │  • Ley de la Doble J (JJD -> JD)     │
│  • Auditoría visual de POD   │ │  • BD_APP_RUTA_2025                  │
│  • Extracción JSON estricto  │ │  • Google Chat / WhatsApp Webhook    │
└──────────────────────────────┘ └──────────────────────────────────────┘
```

---

## 4. 📦 Componentes del Paquete de Despliegue (`servidor_secundario/`)

| Archivo | Rol y Propósito Técnico |
|---|---|
| `ACTIVAR_CALPIXQUI.bat` | **Lanzador maestro de 1 solo clic.** Auto-eleva privilegios de Administrador, verifica `.env`, corre `setup_entorno.ps1`, levanta el servicio con `registrar_servicio_247.ps1` y valida la salud HTTP del nodo. |
| `calpixqui_worker.py` | Punto de entrada canónico del Agente CALPIXQUI para ejecución en primer plano o servicios. |
| `hermes_ollin_worker.py` | Daemon orquestador en Python: FastAPI, endpoints `/health`, `/webhook/multimodal`, `/webhook/batch`, cliente Gemini 3.6 Flash con rotación resiliente, validador de 25 columnas y vigilante de buzón local. |
| `setup_entorno.ps1` | Script PowerShell interactivo con elevación de privilegios: verifica CPU, RAM (>=12 GB), Tailscale, Python 3.11+, Git, crea el entorno `.venv` e instala dependencias. |
| `registrar_servicio_247.ps1` | Script para registrar a `CalpixquiWorker` como Servicio de Windows (vía NSSM 2.24) o Tarea Programada de Inicio de Sistema (`AtStartup` bajo `SYSTEM`), garantizando auto-reinicio tras cortes de energía. |
| `desinstalar_servicio_247.ps1` | Script de desinstalación limpia que detiene el servicio `CalpixquiWorker` y purga tareas huérfanas. |
| `probar_nodo_local.py` | Suite de pruebas unitarias atómicas: certifica la Ley de la Doble J, la inmutabilidad de las 25 columnas, la conectividad con Gemini API y la simulación de Teoyolotl Mic. |
| `.env.template` / `.env` | Almacén de credenciales: `GEMINI_API_KEY`, IPs de Tailscale, IDs oficiales de Spreadsheets y webhooks de alertas. |
| `requirements.txt` | Dependencias Python probadas (`fastapi`, `uvicorn`, `requests`, `pydantic`, `google-genai`, `gspread`, `psutil`, etc.). |
| `package.json` | Metadatos y scripts npm (`npm run activate`, `npm run setup`, `npm run register-service`). |

---

## 5. 🔒 Candados Inmutables y Reglas de Negocio OLLIN

### A. Ley de la Doble J (Formato de PIDs)
Todo PID procesado por CALPIXQUI es sanitizado antes de tocar cualquier Bóveda o base contable:
- **En rampa o calle:** Formato de 3 letras (`JJD014600012745225571`).
- **En Bóveda o Facturación:** Formato de 2 letras (`JD014600012745225571`).

```python
def sanitizar_pid_para_boveda(pid_raw: Any) -> str:
    if not pid_raw:
        return ""
    pid_clean = str(pid_raw).strip().upper()
    if pid_clean.startswith("JJD"):
        pid_clean = "JD" + pid_clean[3:]
    return pid_clean
```

### B. Esquema Rígido de 25 Columnas Base-0 (`VALIDACIÓN_QRO_2025`)
CALPIXQUI valida y fuerza la estructura de 25 elementos para erradicar el Column Shifting:
- **Índice 0 (Col A):** Guía
- **Índice 1 (Col B):** PID (sanitizado con Doble J)
- **Índice 16 (Col Q):** `KEY` (Inmutable, combinación Guía-PID)
- **Índice 19 (Col T):** `Firma` (URL de imagen)
- **Índice 20 (Col U):** `Telefono` (Inmutable)
- **Columna `Actualización`:** Extinta (Prohibido restaurar).

### C. Patrón de Latencia <300ms
El webhook `POST /webhook/multimodal` genera un ID de tarea (`task_...`), responde `HTTP 200` en menos de 50ms al chofer o a la consola web, y transfiere el análisis a un hilo de fondo. El chofer nunca experimenta congelamientos ni latencia de red en andén.

---

## 6. 🚀 Activación de 1 Solo Clic en la PC Secundaria

### El Flujo de Cero Complicaciones:
1. Copiar la carpeta `servidor_secundario/` a la PC secundaria (ej. `C:\OLLIN_SERVIDOR_SECUNDARIO\`).
2. Configurar la clave `GEMINI_API_KEY` en el archivo `.env`.
3. **Hacer doble clic en:**
   ```cmd
   ACTIVAR_CALPIXQUI.bat
   ```
4. El activador:
   - Solicita permisos de Administrador de forma automática.
   - Ejecuta el diagnóstico de RAM y Tailscale.
   - Configura el entorno virtual e instala dependencias.
   - Registra e inicia el Servicio de Windows de CALPIXQUI con arranque automático ante reinicios.
   - Realiza la prueba atómica de salud contra `http://localhost:8088/health` confirmando el estatus con check verde.

---

## 7. 📊 Diagnóstico y Monitoreo

- **Salud del Sistema (JSON):** `GET http://localhost:8088/health`
- **Consulta remota vía Tailscale:** `GET http://100.x.y.z:8088/health`
- **Revisión de Logs en tiempo real:**
  ```powershell
  Get-Content .\logs\hermes_service_stdout.log -Wait -Tail 50
  ```
- **Heartbeat automático:** Cada 60 minutos el nodo reporta su porcentaje de uso de RAM y procesador en los logs.
- **Desinstalación limpia:** `.\desinstalar_servicio_247.ps1`
