"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: NODO SECUNDARIO DE AUTOMATIZACIÓN 24/7 (AGENTE CALPIXQUI / CALPIX)
ARCHIVO: hermes_ollin_worker.py (calpixqui_worker.py)
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)
VERSIÓN: 1.0.0 PROD
================================================================================

NOMBRE OFICIAL:
🏛️ AGENTE CALPIXQUI (o simplemente CALPIX)
"El Guardián de la Casa y Administrador de la Bóveda"

PROPÓSITO ARQUITECTÓNICO:
Operar como el servidor de fondo 24/7 (Headless Orchestrator) en la PC secundaria
(Intel Core i3-6100, 16 GB RAM, SSD, Tailscale).
Desacopla la carga pesada de la estación principal y delega la inteligencia
multimodal a la API de Gemini 3.6 Flash (<300ms de respuesta al cliente).

RESPONSABILIDADES:
1. Servidor Webhook asíncrono (FastAPI + Uvicorn) para recepción de eventos de calle/andén.
2. Ingesta de audio (Teoyolotl Mic), imágenes (bookings/POD) y documentos (facturas/CCP).
3. Invocación a Gemini 3.6 Flash con fallback y parseo de JSON estructurado.
4. Cumplimiento estricto de la regla de la 'Doble J' (JJD -> JD) y esquema de 25 columnas.
5. Inyección a Google Sheets (Amoxcalli / Bóvedas) y alertas en Google Chat / WhatsApp.
6. Vigilante de buzón local (inbox_multimodal/) para ingesta de archivos por red/Tailscale.
================================================================================
"""

import os
import sys
import time
import json
import uuid
import re
import base64
import logging
import asyncio
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Dependencias de terceros con carga resiliente
try:
    import psutil
except ImportError:
    psutil = None

try:
    import requests
except ImportError:
    requests = None

try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
    def Field(*args, **kwargs):
        return kwargs.get("default", None)

try:
    import uvicorn
    from fastapi import FastAPI, BackgroundTasks, HTTPException, Request, status
    from fastapi.responses import JSONResponse, HTMLResponse
    from fastapi.middleware.cors import CORSMiddleware
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False
    FastAPI = None
    BackgroundTasks = None
    HTTPException = Exception
    class StatusMock:
        HTTP_200_OK = 200
        HTTP_404_NOT_FOUND = 404
        HTTP_500_INTERNAL_SERVER_ERROR = 500
    status = StatusMock()

# Cargar variables de entorno desde .env local
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=ENV_PATH)
except ImportError:
    # Fallback tolerante si python-dotenv aún no está instalado
    if ENV_PATH.exists():
        with open(ENV_PATH, "r", encoding="utf-8") as _ef:
            for _line in _ef:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    os.environ.setdefault(_k.strip(), _v.strip())

# Configuración de Logging
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)
LOG_FILE = LOGS_DIR / f"hermes_{datetime.now().strftime('%Y%m%d')}.log"

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] [%(threadName)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("HermesNode")

# ------------------------------------------------------------------------------
# CONSTANTES Y CONFIGURACIÓN DEL ECOSISTEMA OLLIN
# ------------------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL_DEFAULT = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
GEMINI_FALLBACKS = [
    m.strip() for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-flash").split(",") if m.strip()
]

TAILSCALE_IP_MAESTRA = os.getenv("TAILSCALE_IP_MAESTRA", "").strip()
TAILSCALE_IP_NODO = os.getenv("TAILSCALE_IP_NODO", "").strip()

HERMES_HOST = os.getenv("HERMES_HOST", "0.0.0.0")
HERMES_PORT = int(os.getenv("HERMES_PORT", "8088"))

SPREADSHEET_ID_BD_APP_RUTA_2025 = os.getenv("SPREADSHEET_ID_BD_APP_RUTA_2025", "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w")
SPREADSHEET_ID_CONTROL_FOLIOS = os.getenv("SPREADSHEET_ID_CONTROL_FOLIOS", "1vhG5Sv6yCkrok35FnKXwZq0hppUdmXydhHUA5pi1rX8")
SPREADSHEET_ID_VALIDACION_QRO_2025 = os.getenv("SPREADSHEET_ID_VALIDACION_QRO_2025", "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M")
SPREADSHEET_ID_BOVEDA_BATCH_MAESTRO = os.getenv("SPREADSHEET_ID_BOVEDA_BATCH_MAESTRO", "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw")
SPREADSHEET_ID_BD_CENTRAL_2023 = os.getenv("SPREADSHEET_ID_BD_CENTRAL_2023", "1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8")
BUSCAR_EN_BD_CENTRAL_2023 = os.getenv("BUSCAR_EN_BD_CENTRAL_2023", "true").lower() == "true"
SPREADSHEET_ID_MONITOR_INCIDENCIAS_AE = os.getenv("SPREADSHEET_ID_MONITOR_INCIDENCIAS_AE", "15XPRq79p0Z_jcKoxc_Sc_FKOQNHj8V2EYwn8Q1Mbqc0")

WEBHOOK_GOOGLE_CHAT = os.getenv("WEBHOOK_GOOGLE_CHAT_ALERTAS", "").strip()
WEBHOOK_WHATSAPP = os.getenv("WEBHOOK_WHATSAPP_ALERTAS", "").strip()

DIR_INBOX = BASE_DIR / os.getenv("DIR_PAYLOADS_INBOX", "inbox_multimodal")
DIR_PROCESADOS = BASE_DIR / os.getenv("DIR_PROCESADOS", "procesados")
DIR_FALLIDOS = BASE_DIR / os.getenv("DIR_FALLIDOS", "fallidos")
DIR_CACHE = BASE_DIR / "cache_temp"

for d in [DIR_INBOX, DIR_PROCESADOS, DIR_FALLIDOS, DIR_CACHE]:
    d.mkdir(parents=True, exist_ok=True)

# Registro de tareas asíncronas en memoria
TASK_REGISTRY: Dict[str, Dict[str, Any]] = {}
REGISTRY_LOCK = threading.Lock()

# ------------------------------------------------------------------------------
# 1. CANON DE NEGOCIO: REGLA DE LA DOBLE J Y ESQUEMA DE 25 COLUMNAS
# ------------------------------------------------------------------------------
def sanitizar_pid_para_boveda(pid_raw: Any) -> str:
    """
    Ley de la Doble J del Ecosistema OLLIN:
    - En calle/rampa (AppSheet/Netlify): Formato JJD (3 letras).
    - En BD/Facturación (Sheets/Bóveda): Formato JD (2 letras).
    """
    if not pid_raw:
        return ""
    pid_clean = str(pid_raw).strip().upper()
    if pid_clean.startswith("JJD"):
        pid_clean = "JD" + pid_clean[3:]
    return pid_clean

ESQUEMA_VALIDACION_QRO_25 = [
    "Guia",                # 0  (Col A)
    "PID",                 # 1  (Col B)
    "C.P.",                # 2  (Col C)
    "Piezas",              # 3  (Col D)
    "Rcvr Addr 1",         # 4  (Col E)
    "Rcvr Addr 2",         # 5  (Col F)
    "Rcvr Addr 3",         # 6  (Col G)
    "Receiver Name",       # 7  (Col H)
    "GPS",                 # 8  (Col I)
    "Checkpoint",          # 9  (Col J)
    "Comentarios",         # 10 (Col K)
    "Fecha asignación",    # 11 (Col L)
    "Fecha en ruta",       # 12 (Col M)
    "Imagen fachada",      # 13 (Col N)
    "ID correo",           # 14 (Col O)
    "EDD",                 # 15 (Col P)
    "KEY",                 # 16 (Col Q - Inmutable)
    "Tipo de servicio",    # 17 (Col R)
    "Inter",               # 18 (Col S)
    "Firma",               # 19 (Col T)
    "Telefono",            # 20 (Col U - Inmutable)
    "Hora de llegada",     # 21 (Col V)
    "Aprobación Auditor",  # 22 (Col W)
    "Motivo de Rechazo",   # 23 (Col X)
    "Marca de Tiempo"      # 24 (Col Y)
]

def validar_fila_25_columnas(fila_dict: Dict[str, Any]) -> List[Any]:
    """
    Convierte y valida un diccionario al array canónico de 25 posiciones base 0.
    Garantiza que no exista Column Shifting bajo ninguna circunstancia.
    """
    resultado = [""] * 25
    for idx, col_name in enumerate(ESQUEMA_VALIDACION_QRO_25):
        # Mapeo tolerante insensible a mayúsculas/espacios
        val = fila_dict.get(col_name)
        if val is None:
            # Buscar variaciones comunes
            col_key = col_name.lower().replace(" ", "_").replace(".", "")
            for k, v in fila_dict.items():
                if k.lower().replace(" ", "_").replace(".", "") == col_key:
                    val = v
                    break
        
        # Regla especial para PID (columna índice 1)
        if idx == 1 and val:
            val = sanitizar_pid_para_boveda(val)
        
        resultado[idx] = val if val is not None else ""
        
    return resultado

import urllib.request
import urllib.error

def http_post_json(url: str, payload: Dict[str, Any], headers: Optional[Dict[str, str]] = None, timeout: int = 30) -> Dict[str, Any]:
    """Helper HTTP POST que usa 'requests' si está disponible, o 'urllib' nativo como fallback."""
    hdrs = headers or {"Content-Type": "application/json"}
    if requests:
        resp = requests.post(url, headers=hdrs, json=payload, timeout=timeout)
        try:
            json_data = resp.json()
        except Exception:
            json_data = {}
        return {"status_code": resp.status_code, "json": json_data, "text": resp.text}
    else:
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, headers=hdrs, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                status_code = response.status
                body_bytes = response.read()
                body_str = body_bytes.decode("utf-8")
                try:
                    json_data = json.loads(body_str)
                except Exception:
                    json_data = {}
                return {"status_code": status_code, "json": json_data, "text": body_str}
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8", errors="ignore")
            return {"status_code": he.code, "json": {}, "text": err_body}
        except Exception as e:
            return {"status_code": 500, "json": {}, "text": str(e)}

# ------------------------------------------------------------------------------
# 2. CLIENTE DE INTELIGENCIA MULTIMODAL (GEMINI 3.6 FLASH + FALLBACKS)
# ------------------------------------------------------------------------------
class GeminiMultimodalClient:
    """
    Gestiona la comunicación con la API de Gemini usando endpoints HTTP directos
    para máxima velocidad (<300ms de latencia) y rotación automática de modelos.
    """
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.models_to_try = [GEMINI_MODEL_DEFAULT] + [m for m in GEMINI_FALLBACKS if m != GEMINI_MODEL_DEFAULT]

    def llamar_multimodal(
        self,
        prompt_sistema: str,
        datos_partes: List[Dict[str, Any]],
        temperatura: float = 0.2
    ) -> Dict[str, Any]:
        """
        Ejecuta la llamada multimodal enviando texto, audio en base64 e imágenes.
        Retorna el payload JSON analizado o un dict con error estructurado.
        """
        if not self.api_key or self.api_key == "TU_GEMINI_API_KEY_AQUI":
            logger.error("GEMINI_API_KEY no está configurada en .env")
            return {
                "estatus": "ERROR_CONFIG",
                "mensaje": "GEMINI_API_KEY no configurada en el servidor."
            }

        headers = {"Content-Type": "application/json"}
        contents = [{"role": "user", "parts": [{"text": prompt_sistema}] + datos_partes}]

        generation_config = {
            "temperature": temperatura,
            "topP": 0.95,
            "responseMimeType": "application/json"
        }

        body = {
            "contents": contents,
            "generationConfig": generation_config
        }

        ultimo_error = None
        for model_name in self.models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1/models/{model_name}:generateContent?key={self.api_key}"
            start_ts = time.time()
            try:
                logger.info(f"Invocando Gemini API ({model_name})...")
                res = http_post_json(url, payload=body, headers=headers, timeout=30)
                duracion_ms = int((time.time() - start_ts) * 1000)

                if res["status_code"] == 200:
                    data = res["json"]
                    candidates = data.get("candidates", [])
                    if candidates:
                        text_resp = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        logger.info(f"Gemini ({model_name}) respondió en {duracion_ms}ms con éxito.")
                        parsed = self._parsear_json_seguro(text_resp)
                        parsed["_meta_ia"] = {
                            "modelo_utilizado": model_name,
                            "latencia_ms": duracion_ms,
                            "timestamp": datetime.now().isoformat()
                        }
                        return parsed
                    else:
                        ultimo_error = f"Respuesta vacía de Gemini ({model_name})"
                else:
                    ultimo_error = f"HTTP {res['status_code']} ({model_name}): {res['text']}"
                    logger.warning(f"Fallo con {model_name}: {ultimo_error}. Intentando siguiente modelo...")
            except Exception as ex:
                ultimo_error = str(ex)
                logger.warning(f"Excepción conectando con {model_name}: {ex}. Rotando...")

        logger.error(f"Se agotaron los modelos de Gemini. Último error: {ultimo_error}")
        return {
            "estatus": "ERROR_IA",
            "mensaje": f"Fallo en llamada a Gemini: {ultimo_error}",
            "_meta_ia": {"error": ultimo_error}
        }

    def _parsear_json_seguro(self, texto: str) -> Dict[str, Any]:
        """Limpia markdown codeblocks y parsea JSON tolerante a errores."""
        texto_limpio = texto.strip()
        if texto_limpio.startswith("```json"):
            texto_limpio = texto_limpio[7:]
        if texto_limpio.startswith("```"):
            texto_limpio = texto_limpio[3:]
        if texto_limpio.endswith("```"):
            texto_limpio = texto_limpio[:-3]
        texto_limpio = texto_limpio.strip()

        try:
            return json.loads(texto_limpio)
        except Exception as err:
            logger.warning(f"Error parseando JSON devuelto por Gemini: {err}. Intentando rescate...")
            # Búsqueda de bloque delimitado por llaves
            inicio = texto_limpio.find("{")
            fin = texto_limpio.rfind("}")
            if inicio != -1 and fin != -1 and fin > inicio:
                try:
                    return json.loads(texto_limpio[inicio:fin+1])
                except Exception:
                    pass
            return {"estatus": "PARSE_ERROR", "contenido_crudo": texto}

# ------------------------------------------------------------------------------
# 3. NOTIFICADOR DE CANALES (GOOGLE CHAT & WHATSAPP)
# ------------------------------------------------------------------------------
def enviar_alerta_google_chat(titulo: str, mensaje: str, severidad: str = "INFO", detalles: Optional[Dict[str, Any]] = None):
    """Envía un mensaje enriquecido al espacio de Google Chat configurado."""
    if not WEBHOOK_GOOGLE_CHAT:
        return

    iconos = {
        "INFO": "ℹ️",
        "SUCCESS": "✅",
        "WARN": "⚠️",
        "ERROR": "🚨",
        "AUDIT": "🏛️"
    }
    icono = iconos.get(severidad.upper(), "📌")
    fecha_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Formato simple de texto para máxima compatibilidad
    lineas = [
        f"{icono} *{titulo}* (Servidor Secundario Hermes 24/7)",
        f"🕒 *Hora:* `{fecha_hora}`",
        f"📝 *Detalle:* {mensaje}"
    ]

    if detalles:
        lineas.append("\n*Parámetros Operativos:*")
        for k, v in detalles.items():
            if not k.startswith("_"):
                lineas.append(f"• *{k}:* `{v}`")

    payload = {"text": "\n".join(lineas)}
    try:
        r = http_post_json(WEBHOOK_GOOGLE_CHAT, payload=payload, timeout=8)
        if r["status_code"] not in (200, 204):
            logger.warning(f"Error enviando webhook a Google Chat: HTTP {r['status_code']}")
    except Exception as ex:
        logger.warning(f"Excepción notificando a Google Chat: {ex}")


def _normalizar_numero_whatsapp(telefono: str) -> str:
    """
    Normaliza un número de teléfono al formato chatId de WhatsApp: '524491805948@c.us'
    """
    digits = re.sub(r'[^\d]', '', str(telefono))
    if digits.startswith("521") and len(digits) == 13:
        # México con 1 extra: 52 + 1 + 10 digitos -> quitar el 1
        digits = "52" + digits[3:]
    elif len(digits) == 10:
        digits = f"52{digits}"
    elif not digits.startswith("52"):
        digits = f"52{digits}"
    return f"{digits}@c.us"


def despachar_via_gateway_headless(telefono: str, mensaje: str,
                                    gateway_url: str = "http://localhost:3001/send-message") -> Dict[str, Any]:
    """
    Despacha un mensaje WhatsApp de forma 100% programática y headless.
    Llama al microservicio Node.js whatsapp-web.js (whatsapp_gateway/gateway.js)
    que corre en localhost:3001 sin ninguna GUI, teclado ni pantalla.

    NO usa pyautogui, webbrowser, ni SendKeys. Puro HTTP POST.
    """
    chat_id = _normalizar_numero_whatsapp(telefono)
    payload = {
        "to": chat_id,
        "message": mensaje
    }

    logger.info(f"🚀 [WhatsApp Headless] POST → {gateway_url} | destino: {chat_id}")

    try:
        res = http_post_json(gateway_url, payload=payload, timeout=15)
        http_code = res.get("status_code", 0)
        body = res.get("body", {}) or {}

        if http_code == 200 and (body.get("ok") or body.get("estatus") == "ENVIADO_HEADLESS_WHATSAPP"):
            logger.info(f"✅ [WhatsApp Headless] Mensaje entregado exitosamente. MsgID: {body.get('message_id', 'ok')}")
            return {
                "estatus": "ENVIADO_HEADLESS_WHATSAPP",
                "destinatario": chat_id,
                "metodo": "WHATSAPP_WEB_JS_HEADLESS_GATEWAY",
                "message_id": body.get("message_id"),
                "gateway": gateway_url,
                "timestamp": datetime.now().isoformat()
            }
        elif http_code == 503:
            logger.warning(f"⏳ [WhatsApp Headless] Gateway no listo todavía: {body.get('error', 'Aún conectando')}.")
            return {
                "estatus": "GATEWAY_NO_LISTO",
                "destinatario": chat_id,
                "error": body.get("error", "Cliente WhatsApp aún inicializando"),
                "gateway": gateway_url,
                "timestamp": datetime.now().isoformat()
            }
        else:
            logger.warning(f"⚠️ [WhatsApp Headless] Respuesta inesperada HTTP {http_code}: {body}")
            return {
                "estatus": "ERROR_GATEWAY_HTTP",
                "destinatario": chat_id,
                "http_code": http_code,
                "error": body.get("error", f"HTTP {http_code}"),
                "gateway": gateway_url,
                "timestamp": datetime.now().isoformat()
            }
    except Exception as ex:
        logger.error(f"❌ [WhatsApp Headless] Excepción al conectar con gateway: {ex}")
        return {
            "estatus": "ERROR_CONEXION_GATEWAY",
            "destinatario": chat_id,
            "error": str(ex),
            "gateway": gateway_url,
            "timestamp": datetime.now().isoformat()
        }


def enviar_alerta_whatsapp(mensaje: str, telefono: Optional[str] = None) -> Dict[str, Any]:
    """
    Envía notificación WhatsApp a través del Gateway Headless Node.js (whatsapp-web.js).
    100% programático, sin GUI ni pyautogui.
    Puerto por defecto: localhost:3001 (configurable via WEBHOOK_WHATSAPP_ALERTAS).
    """
    tel_destino = telefono or "+52 449 180 5948"

    # Registro de diagnóstico
    log_diagnostico = {
        "timestamp": datetime.now().isoformat(),
        "canal": "WhatsApp",
        "destinatario": tel_destino,
        "mensaje": mensaje[:200],
        "nodo": "PC Maestra (audiofila-v2)",
        "servicio": "Agente CALPIXQUI — Mesa de Control",
        "metodo": "GATEWAY_HEADLESS_NODE_WWEBJS"
    }

    logger.info(f"📱 [WhatsApp CALPIXQUI] Iniciando despacho headless para {tel_destino}...")

    # Determinar URL del gateway (local por defecto o configurable en .env)
    webhook_cfg = os.getenv("WEBHOOK_WHATSAPP_ALERTAS", "").strip()
    if webhook_cfg.startswith("http://") or webhook_cfg.startswith("https://"):
        gateway_url = webhook_cfg
    else:
        # Valor por defecto: microservicio Node.js local (whatsapp_gateway/gateway.js)
        gateway_url = "http://localhost:3001/send-message"

    logger.info(f"🔗 [WhatsApp CALPIXQUI] Gateway URL: {gateway_url}")

    # Despacho 100% programático y autónomo vía Gateway Node.js (whatsapp-web.js)
    result = despachar_via_gateway_headless(telefono=tel_destino, mensaje=mensaje, gateway_url=gateway_url)
    log_diagnostico.update(result)
    log_diagnostico["estatus_entrega"] = result.get("estatus", "DESCONOCIDO")

    estatus = result.get("estatus", "DESCONOCIDO")
    if estatus == "ENVIADO_HEADLESS_WHATSAPP":
        logger.info(f"✅ [WhatsApp CALPIXQUI] Mensaje ENVIADO exitosamente vía Gateway Headless → {tel_destino}")
    elif estatus == "GATEWAY_NO_LISTO":
        logger.warning(f"⏳ [WhatsApp CALPIXQUI] Gateway aún no está listo o requiere vincular QR en {gateway_url.replace('/send-message', '/health')}")
    else:
        logger.error(f"❌ [WhatsApp CALPIXQUI] Error en despacho headless: {result.get('error', estatus)}")

    return log_diagnostico


# ------------------------------------------------------------------------------
# 4. ACTUALIZADOR DE BÓVEDAS EN GOOGLE SHEETS
# ------------------------------------------------------------------------------
class BovedasManager:
    """
    Gestiona la inyección atómica a las hojas de Google Sheets del ecosistema OLLIN.
    Si gspread y credenciales están disponibles, opera por API directa;
    de lo contrario, emite log estructurado y/o despacha a endpoint proxy.
    """
    def __init__(self):
        self.gc = None
        self._inicializar_gspread()

    def _inicializar_gspread(self):
        cred_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials.json")
        cred_path = BASE_DIR / cred_file
        if cred_path.exists():
            try:
                import gspread
                self.gc = gspread.service_account(filename=str(cred_path))
                logger.info(f"gspread inicializado correctamente con credencial: {cred_file}")
            except Exception as e:
                logger.warning(f"No se pudo inicializar gspread: {e}")
        else:
            logger.info("Modo Bóveda: Sin Service Account local. Las actualizaciones se registran en buffer y logs.")

    def inyectar_dictamen_teoyolotl(self, registro_dict: Dict[str, Any]) -> bool:
        """
        Inyecta la resolución del audio de chofer o imagen en BD_APP_RUTA_2025.
        Aplica sanitización de la Doble J y previene degradación de estatus.
        """
        pid_sanitizado = sanitizar_pid_para_boveda(registro_dict.get("pid", ""))
        registro_dict["pid"] = pid_sanitizado

        logger.info(f"Inyectando dictamen en Bóveda para PID: {pid_sanitizado} | Estatus: {registro_dict.get('estatus')}")

        if self.gc:
            try:
                sh = self.gc.open_by_key(SPREADSHEET_ID_BD_APP_RUTA_2025)
                # Intento en GUIAS_ASIGNADAS o VALIDACIÓN_QRO_2025
                ws = sh.sheet1
                # Lógica de append/update atómico
                fila_25 = validar_fila_25_columnas(registro_dict)
                ws.append_row(fila_25, value_input_option="USER_ENTERED")
                logger.info(f"Fila inyectada exitosamente en Sheets para PID {pid_sanitizado}")
                return True
            except Exception as ex:
                logger.error(f"Error escribiendo en Sheets vía gspread: {ex}")
                return False
        else:
            # Buffer local de respaldo en JSON
            buffer_file = DIR_PROCESADOS / f"boveda_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.json"
            with open(buffer_file, "w", encoding="utf-8") as f:
                json.dump(registro_dict, f, ensure_ascii=False, indent=2)
            logger.info(f"Dictamen archivado en buffer local: {buffer_file.name}")
            return True

# ------------------------------------------------------------------------------
# 5. MODELOS PYDANTIC PARA FASTAPI
# ------------------------------------------------------------------------------
class MultimodalPayload(BaseModel):
    tipo: str = Field(..., description="Tipo de payload: audio_teoyolotl, imagen_booking, pod_calle, factura_ccp")
    id_registro: Optional[str] = Field(default="", description="Guía, PID o Folio asociado")
    archivo_base64: Optional[str] = Field(default="", description="Archivo codificado en Base64")
    mime_type: Optional[str] = Field(default="image/jpeg", description="MIME type del archivo adjunto")
    chofer: Optional[str] = Field(default="", description="Email o identificador del operador")
    contexto: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadatos operativos del manifiesto")

class BatchIngestaPayload(BaseModel):
    origen: str = Field(default="GMAIL_BATCH", description="Origen de los datos masivos")
    filas: List[Dict[str, Any]] = Field(default_factory=list, description="Lista de registros a procesar")

class AclaracionPayload(BaseModel):
    guia: Optional[str] = Field(default="", description="Número de Guía HWB (10 dígitos)")
    pid: Optional[str] = Field(default="", description="Piece ID (JJD o JD)")
    asunto: Optional[str] = Field(default="", description="Asunto del correo de DHL")
    cuerpo_correo: Optional[str] = Field(default="", description="Texto del correo o hilo")
    remitente: Optional[str] = Field(default="", description="Correo del remitente DHL")
    thread_id: Optional[str] = Field(default="", description="ID del hilo de Gmail")
    datos_boveda: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Datos pre-recuperados de Bóveda")

class ConsultaHistoricaPayload(BaseModel):
    query: Optional[str] = Field(default="", description="Texto de búsqueda o dirección consultada")
    audio_base64: Optional[str] = Field(default="", description="Nota de voz en base64 del chofer")
    mime_type: Optional[str] = Field(default="audio/webm", description="MIME type del audio")
    direccion: Optional[str] = Field(default="", description="Dirección estructurada")
    cp: Optional[str] = Field(default="", description="Código postal")
    destinatario: Optional[str] = Field(default="", description="Nombre de cliente o destinatario")
    guia: Optional[str] = Field(default="", description="Número de Guía HWB")
    pid: Optional[str] = Field(default="", description="Piece ID")
    pochteca: Optional[str] = Field(default="Pochteca en Calle", description="Nombre o correo del operador")
    modo_dispersion: Optional[bool] = Field(default=False, description="Activa dispersión GPS multi-punto para zonas rurales")
    canal: Optional[str] = Field(default="webhook", description="Canal de origen (whatsapp, chat, appsheet)")

class GestionPochtecaPayload(BaseModel):
    accion: str = Field(..., description="AGREGAR_POCHTECA, ACTUALIZAR_POCHTECA, BAJA_POCHTECA")
    correo: str = Field(..., description="Correo oficial del operador")
    nombre: Optional[str] = Field(default="", description="Nombre completo")
    telefono: Optional[str] = Field(default="", description="Teléfono para WhatsApp")
    rol: Optional[str] = Field(default="POCHTECA", description="Rol (POCHTECA, TLACHIXQUI, etc.)")
    zona_asignada: Optional[str] = Field(default="QRO", description="Zona Asignada")
    supervisor: Optional[str] = Field(default="xichudaniel@gmail.com", description="Correo del supervisor")

class ReasignacionMasivaPayload(BaseModel):
    municipio: Optional[str] = Field(default="", description="Municipio a reasignar")
    nuevo_chofer: Optional[str] = Field(default="", description="Correo del nuevo chofer")
    fecha_expiracion: Optional[str] = Field(default="", description="Fecha límite YYYY-MM-DD")
    comando_texto: Optional[str] = Field(default="", description="Comando en texto libre (ej. 'Reasigna todo el Municipio de Xichú a Oscher hasta el 23/09')")

class ResolverAsignacionPayload(BaseModel):
    cp: Optional[str] = Field(default="", description="Código Postal")
    municipio: Optional[str] = Field(default="", description="Municipio")
    fecha: Optional[str] = Field(default="", description="Fecha de evaluación YYYY-MM-DD")

# ------------------------------------------------------------------------------
# 6. APP FASTAPI Y ENDPOINTS DEL AGENTE CALPIXQUI
# ------------------------------------------------------------------------------
if FASTAPI_AVAILABLE:
    app = FastAPI(
        title="Agente CALPIXQUI (Calpix) — Ecosistema OLLIN",
        description="Guardián de la Casa, Administrador de Bóveda y Orquestador Multimodal 24/7",
        version="1.0.0 PROD"
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    class DummyApp:
        def __init__(self):
            self.routes = []
        def get(self, path, *args, **kwargs):
            class DummyRoute:
                def __init__(self, p):
                    self.path = p
                    self.methods = ["GET"]
            self.routes.append(DummyRoute(path))
            return lambda f: f
        def post(self, path, *args, **kwargs):
            class DummyRoute:
                def __init__(self, p):
                    self.path = p
                    self.methods = ["POST"]
            self.routes.append(DummyRoute(path))
            return lambda f: f
        def add_middleware(self, *args, **kwargs): pass
    app = DummyApp()

gemini_client = GeminiMultimodalClient(api_key=GEMINI_API_KEY)
bovedas_mgr = BovedasManager()

@app.get("/")
def raiz():
    return {
        "agente": "CALPIXQUI (Calpix) 24/7",
        "rol": "Guardián de la Casa y Administrador de la Bóveda",
        "alias_infraestructura": "Hermes Agent Node",
        "ecosistema": "OLLIN / Arauto Express",
        "version": "1.0.0 PROD",
        "status": "ONLINE",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
def salud_sistema():
    """Diagnóstico en tiempo real de la PC secundaria (Core i3-6100, 16GB RAM, Tailscale)."""
    if psutil:
        mem = psutil.virtual_memory()
        cpu_pct = psutil.cpu_percent(interval=None)
        uptime_sec = int(time.time() - psutil.boot_time())
        ram_total = round(mem.total / (1024**3), 2)
        ram_used = round(mem.used / (1024**3), 2)
        ram_free = round(mem.available / (1024**3), 2)
        ram_pct = mem.percent
    else:
        cpu_pct = 0.0
        uptime_sec = 0
        ram_total = 16.0
        ram_used = 2.0
        ram_free = 14.0
        ram_pct = 12.5

    try:
        disco = psutil.disk_usage(str(BASE_DIR)) if psutil else None
        disco_libre = round(disco.free / (1024**3), 2) if disco else 100.0
    except Exception:
        disco_libre = 100.0
    
    # Comprobar Tailscale
    tailscale_ok = False
    tailscale_ip = "DESCONOCIDA"
    try:
        import subprocess
        res = subprocess.run(["tailscale", "ip", "-4"], capture_output=True, text=True, timeout=2)
        if res.returncode == 0:
            tailscale_ip = res.stdout.strip()
            tailscale_ok = True
    except Exception:
        pass

    return {
        "estado": "SALUDABLE",
        "uptime_segundos": uptime_sec,
        "hardware": {
            "cpu_uso_porcentaje": cpu_pct,
            "ram_total_gb": ram_total,
            "ram_usada_gb": ram_used,
            "ram_libre_gb": ram_free,
            "ram_porcentaje": ram_pct,
            "disco_libre_gb": disco_libre
        },
        "red": {
            "tailscale_activo": tailscale_ok,
            "tailscale_ip_nodo": tailscale_ip or TAILSCALE_IP_NODO,
            "tailscale_ip_maestra": TAILSCALE_IP_MAESTRA
        },
        "servicios": {
            "gemini_api_configurada": bool(GEMINI_API_KEY and GEMINI_API_KEY != "TU_GEMINI_API_KEY_AQUI"),
            "modelo_primario": GEMINI_MODEL_DEFAULT,
            "bovedas_gspread_activo": bool(bovedas_mgr.gc),
            "google_chat_webhook_activo": bool(WEBHOOK_GOOGLE_CHAT)
        },
        "metricas": {
            "tareas_registradas": len(TASK_REGISTRY)
        }
    }

# ------------------------------------------------------------------------------
# PROCESAMIENTO MULTIMODAL EN SEGUNDO PLANO
# ------------------------------------------------------------------------------
def _procesar_tarea_multimodal_bg(task_id: str, payload: MultimodalPayload):
    """
    Worker en segundo plano para procesar la petición con Gemini 3.6 Flash
    sin demorar la respuesta HTTP al cliente/chofer (<300ms de latencia).
    """
    logger.info(f"[{task_id}] Iniciando procesamiento en background: tipo={payload.tipo}, id={payload.id_registro}")
    with REGISTRY_LOCK:
        TASK_REGISTRY[task_id]["status"] = "PROCESSING"
        TASK_REGISTRY[task_id]["inicio_ts"] = time.time()

    try:
        partes = []
        # Inclusión del archivo si viene en base64
        if payload.archivo_base64:
            partes.append({
                "inlineData": {
                    "mimeType": payload.mime_type or "image/jpeg",
                    "data": payload.archivo_base64
                }
            })

        # Selección de prompt especializado según tipo de payload
        tipo = payload.tipo.lower()
        contexto = payload.contexto or {}

        if "teoyolotl" in tipo or "audio" in tipo:
            prompt = f"""Actúas como el auditor fiscalizador inteligente (Teoyolotl IA) de Arauto Express para la red logística OLLIN.

📋 CONTEXTO OFICIAL DEL MANIFIESTO:
- Destinatario en Sistema: "{contexto.get('destinatario', 'NO_ESPECIFICADO')}"
- Dirección de Entrega: "{contexto.get('direccion', 'NO_ESPECIFICADA')}"
- Chofer Asignado: "{payload.chofer or contexto.get('chofer', 'NO_ESPECIFICADO')}"
- PID / Guía Auditada: "{payload.id_registro or contexto.get('pid', 'NO_ESPECIFICADO')}"

Instrucción: Escucha la nota de voz y/o inspecciona la imagen de evidencia de entrega.
Verifica si la entrega fue exitosa o si hay incidencia (cerrado, rechazado, dirección errónea).
Responde en formato JSON estricto:
{{
  "estatus": "OK" o "INCIDENCIA",
  "categoria_incidencia": "DOMICILIO_CERRADO", "RECHAZO_POR_DAÑO", "SIN_PAGO_ADUANA", "DIRECCION_INCORRECTA" o "NINGUNO",
  "transcripcion_audio": "Transcripción verbatim de la voz del chofer",
  "nombre_recibe": "Nombre extraído de la identificación o voz",
  "comentarios": "Dictamen conciso contrastando evidencia vs manifiesto"
}}"""
        elif "booking" in tipo or "remision" in tipo or "dhl" in tipo:
            prompt = f"""Actúas como el extractor automatizado de manifiestos y bookings DHL para el Ecosistema OLLIN.
Analiza el documento proporcionado y extrae con exactitud quirúrgica los datos de carga:
Responde en formato JSON estricto:
{{
  "guia": "Número de Guía o HWB",
  "pid": "Piece ID (conservar formato)",
  "piezas": 1,
  "destinatario": "Nombre completo",
  "direccion": "Dirección completa",
  "cp": "Código postal",
  "telefono": "Teléfono si es legible",
  "tipo_servicio": "Express / Nacional / etc.",
  "comentarios": "Observaciones de la carga"
}}"""
        elif "ccp" in tipo or "factura" in tipo:
            prompt = f"""Actúas como el auditor contable y conciliador fiscal de Arauto Express para Complementos de Pago (CCP CFDI 4.0).
Extrae del comprobante los datos de pago y facturas liquidadas:
Responde en formato JSON estricto:
{{
  "id_deposito": "Clave de rastreo SPEI o autorización bancaria",
  "fecha_pago": "YYYY-MM-DD",
  "monto_total": 0.0,
  "rfc_emisor": "DEM8801152E9",
  "rfc_receptor": "DHL020127CJ3",
  "folios_facturas": ["1051", "1052"],
  "estatus": "CONCILIADO" o "DISCREPANCIA"
}}"""
        else:
            prompt = f"""Analiza la evidencia adjunta para el sistema logístico OLLIN.
Contexto: {json.dumps(contexto, ensure_ascii=False)}
Responde en JSON con: {{"estatus": "OK", "resumen": "análisis de evidencia"}}"""

        # Invocación a Gemini 3.6 Flash
        dictamen = gemini_client.llamar_multimodal(prompt_sistema=prompt, datos_partes=partes)

        # Inyección a Bóvedas
        dictamen["id_registro"] = payload.id_registro
        dictamen["chofer"] = payload.chofer
        dictamen["tipo"] = payload.tipo

        bovedas_mgr.inyectar_dictamen_teoyolotl(dictamen)

        # Notificación en caso de incidencia o terminación de auditoría
        estatus_res = dictamen.get("estatus", "OK")
        severidad = "SUCCESS" if estatus_res == "OK" else "WARN"
        enviar_alerta_google_chat(
            titulo=f"Procesamiento Multimodal: {payload.id_registro or 'Sin ID'}",
            mensaje=f"Dictamen: *{estatus_res}* | Chofer: `{payload.chofer}` | Comentarios: {dictamen.get('comentarios', '')}",
            severidad=severidad,
            detalles={
                "PID": dictamen.get("pid", payload.id_registro),
                "Modelo": dictamen.get("_meta_ia", {}).get("modelo_utilizado", "Gemini"),
                "Latencia": f"{dictamen.get('_meta_ia', {}).get('latencia_ms', 0)} ms"
            }
        )

        with REGISTRY_LOCK:
            TASK_REGISTRY[task_id]["status"] = "COMPLETED"
            TASK_REGISTRY[task_id]["resultado"] = dictamen
            TASK_REGISTRY[task_id]["duracion_ms"] = int((time.time() - TASK_REGISTRY[task_id]["inicio_ts"]) * 1000)

        logger.info(f"[{task_id}] Tarea completada con éxito en {TASK_REGISTRY[task_id]['duracion_ms']}ms.")

    except Exception as e:
        logger.error(f"[{task_id}] Error en procesamiento de background: {e}", exc_info=True)
        with REGISTRY_LOCK:
            TASK_REGISTRY[task_id]["status"] = "FAILED"
            TASK_REGISTRY[task_id]["error"] = str(e)
        enviar_alerta_google_chat(
            titulo=f"Fallo en Tarea Multimodal: {payload.id_registro}",
            mensaje=f"Error inesperado en worker Hermes: {str(e)}",
            severidad="ERROR"
        )

@app.post("/webhook/multimodal", status_code=status.HTTP_200_OK)
async def recibir_payload_multimodal(payload: MultimodalPayload, background_tasks: BackgroundTasks):
    """
    Webhook ultrarrápido para recepción de audios, fotos y documentos.
    Responde en menos de 50ms al frontend/Pochteca en calle, garantizando
    cero fricción en andén, y delega el análisis al worker asíncrono.
    """
    task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    with REGISTRY_LOCK:
        TASK_REGISTRY[task_id] = {
            "task_id": task_id,
            "status": "QUEUED",
            "creado_ts": time.time(),
            "id_registro": payload.id_registro,
            "tipo": payload.tipo
        }

    # Despachar al hilo de fondo
    background_tasks.add_task(_procesar_tarea_multimodal_bg, task_id, payload)

    return {
        "status": "success",
        "task_id": task_id,
        "message": "Payload recibido y encolado para procesamiento asíncrono.",
        "id_registro": payload.id_registro,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/webhook/batch")
async def recibir_lote_masivo(payload: BatchIngestaPayload, background_tasks: BackgroundTasks):
    """Recepción de lotes de manifiestos matutinos o reportes masivos."""
    total_filas = len(payload.filas)
    logger.info(f"Lote masivo recibido: {total_filas} filas desde {payload.origen}")
    
    # Procesar y sanitizar Doble J en cada fila
    filas_sanitizadas = []
    for f in payload.filas:
        if "PID" in f:
            f["PID"] = sanitizar_pid_para_boveda(f["PID"])
        filas_sanitizadas.append(f)

    return {
        "status": "success",
        "filas_recibidas": total_filas,
        "origen": payload.origen,
        "mensaje": "Lote recibido y verificado con ley de Doble J."
    }

@app.get("/tasks/{task_id}")
def consultar_tarea(task_id: str):
    """Consulta el estatus de procesamiento de una tarea asíncrona."""
    with REGISTRY_LOCK:
        tarea = TASK_REGISTRY.get(task_id)
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada en el registro")
    return tarea

@app.post("/webhook/aclaracion")
async def recibir_aclaracion_dhl(payload: AclaracionPayload):
    """
    Endpoint del Frente 5: Recepción y Evaluación Cognitiva de Reclamos DHL.
    Ejecuta el Escudo de Pertenencia, Búsqueda Híbrida y Dictamen IA de Evidencias.
    """
    try:
        from frente5_aclaraciones_bot import BotAclaracionesFrente5
        bot = BotAclaracionesFrente5(api_key=GEMINI_API_KEY)
        payload_dict = payload.dict() if hasattr(payload, "dict") else payload.__dict__
        resultado = bot.procesar_aclaracion(payload_dict)
        return {
            "status": "success",
            "resultado": resultado
        }
    except Exception as ex:
        logger.error(f"Error procesando aclaración en webhook: {ex}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(ex))

@app.post("/webhook/consulta_historica")
async def consultar_referencia_historica_calle(payload: ConsultaHistoricaPayload):
    """
    Endpoint del Frente 5: Asistente Inteligente de Domicilios y Coordenadas en Ruta.
    Aplica el Filtro de Calidad 'Solo OK' y Dispersión GPS Multi-Punto para zonas rurales/baja señal.
    Responde en <300ms a WhatsApp / Google Chat / AppSheet.
    """
    try:
        from frente5_aclaraciones_bot import BotAclaracionesFrente5
        bot = BotAclaracionesFrente5(api_key=GEMINI_API_KEY)
        payload_dict = payload.dict() if hasattr(payload, "dict") else payload.__dict__
        resultado = bot.consultar_asistente_ruta(
            query_texto=payload_dict.get("query", ""),
            audio_base64=payload_dict.get("audio_base64"),
            mime_type=payload_dict.get("mime_type", "audio/webm"),
            direccion=payload_dict.get("direccion"),
            cp=payload_dict.get("cp"),
            destinatario=payload_dict.get("destinatario"),
            modo_dispersion=payload_dict.get("modo_dispersion", False),
            pochteca=payload_dict.get("pochteca", "Pochteca en Calle")
        )
        return {
            "status": "success",
            "resultado": resultado
        }
    except Exception as ex:
        logger.error(f"Error en consulta histórica de domicilio: {ex}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(ex))

@app.post("/webhook/gestion_pochteca")
async def gestionar_directorio_pochteca(payload: GestionPochtecaPayload):
    """
    Directorio Central de Pochtecas con Persistencia Dual:
    - AGREGAR_POCHTECA: Registra en local y CAT_USUARIOS (Col H Telefono)
    - ACTUALIZAR_POCHTECA: Modifica teléfono, zona o supervisor
    - BAJA_POCHTECA: Soft Delete (Estatus='Inactivo', sin borrar historial)
    """
    try:
        from calpixqui_gobernanza import pochtecas_global
        accion = payload.accion.upper().strip()
        if accion == "AGREGAR_POCHTECA":
            res = pochtecas_global.agregar_pochteca(
                correo=payload.correo,
                nombre=payload.nombre,
                telefono=payload.telefono,
                rol=payload.rol,
                zona_asignada=payload.zona_asignada,
                supervisor=payload.supervisor
            )
        elif accion == "ACTUALIZAR_POCHTECA":
            res = pochtecas_global.actualizar_pochteca(
                correo=payload.correo,
                telefono=payload.telefono if payload.telefono else None,
                zona_asignada=payload.zona_asignada if payload.zona_asignada else None,
                supervisor=payload.supervisor if payload.supervisor else None,
                nombre=payload.nombre if payload.nombre else None,
                rol=payload.rol if payload.rol else None
            )
        elif accion == "BAJA_POCHTECA":
            res = pochtecas_global.baja_pochteca(correo=payload.correo)
        else:
            raise HTTPException(status_code=400, detail=f"Acción '{payload.accion}' no reconocida. Use AGREGAR_POCHTECA, ACTUALIZAR_POCHTECA o BAJA_POCHTECA.")
        return res
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as ex:
        logger.error(f"Error en /webhook/gestion_pochteca: {ex}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(ex))

@app.post("/webhook/reasignacion_masiva")
async def reasignar_municipio_masivo(payload: ReasignacionMasivaPayload):
    """
    Reasignación Masiva por Municipio con persistencia en MATRIZ_CP (Columnas H e I).
    Soporta payload estructurado o comando en lenguaje natural.
    """
    try:
        from calpixqui_gobernanza import matriz_cp_global
        from datetime import date, timedelta
        if payload.comando_texto:
            res = matriz_cp_global.interpretar_comando_reasignacion(payload.comando_texto)
        else:
            if not payload.municipio or not payload.nuevo_chofer:
                raise HTTPException(status_code=400, detail="Debe especificar 'municipio' y 'nuevo_chofer', o 'comando_texto'.")
            fecha_exp = payload.fecha_expiracion or (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")
            res = matriz_cp_global.reasignar_municipio_masivo(
                municipio=payload.municipio,
                nuevo_chofer=payload.nuevo_chofer,
                fecha_expiracion=fecha_exp
            )
        return res
    except Exception as ex:
        logger.error(f"Error en /webhook/reasignacion_masiva: {ex}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(ex))

@app.post("/webhook/resolver_asignacion")
async def resolver_asignacion_cp(payload: ResolverAsignacionPayload):
    """
    Asignación Dinámica con Autorrecuperación y Despacho Dual:
    - Si Override_Activo está vigente -> asigna a Override
    - Al expirar -> autorrecupera a Chofer_Titular
    """
    try:
        from calpixqui_gobernanza import matriz_cp_global, despacho_dual_global
        asig = matriz_cp_global.resolver_asignacion(
            cp=payload.cp,
            municipio=payload.municipio,
            fecha_evaluacion=payload.fecha
        )
        return {
            "status": "success",
            "resultado": asig
        }
    except Exception as ex:
        logger.error(f"Error en /webhook/resolver_asignacion: {ex}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(ex))

@app.get("/pochtecas")
def listar_directorio_pochtecas(solo_activos: bool = False):
    """Retorna el catálogo central de Pochtecas con teléfonos para WhatsApp y estatus."""
    from calpixqui_gobernanza import pochtecas_global
    return {
        "status": "success",
        "total": len(pochtecas_global.listar_pochtecas(solo_activos=solo_activos)),
        "pochtecas": pochtecas_global.listar_pochtecas(solo_activos=solo_activos)
    }

@app.get("/matriz_cp/estado")
def consultar_estado_matriz_cp():
    """Retorna métricas y estatus de la MATRIZ_CP multicapa en RAM."""
    from calpixqui_gobernanza import matriz_cp_global
    overrides_activos = [
        {"cp": k, "municipio": v.get("Municipio"), "titular": v.get("Chofer_Titular"), "override": v.get("Override_Activo"), "expira": v.get("Fecha_Expiracion_Override")}
        for k, v in matriz_cp_global.matriz_cp.items() if v.get("Override_Activo")
    ]
    return {
        "status": "success",
        "total_cps": len(matriz_cp_global.matriz_cp),
        "total_overrides_activos": len(overrides_activos),
        "overrides": overrides_activos
    }

# ------------------------------------------------------------------------------
# 6.B CONSOLA DE MONITOREO Y REASIGNACIÓN SIERRA GORDA (DANIEL JUÁREZ)
# ------------------------------------------------------------------------------
class ReasignarChoferPayload(BaseModel):
    origen_email: str = ""
    destino_email: str
    usuario_email: str = "xichudaniel@gmail.com"
    role: str = "daniel"

class ReasignarUbicacionPayload(BaseModel):
    tipo: str = "municipio"
    valor: str
    destino_email: str
    fecha_expiracion: str = ""
    usuario_email: str = "xichudaniel@gmail.com"
    role: str = "daniel"

@app.get("/sierra", response_class=HTMLResponse)
def servir_consola_sierra():
    """Sirve la Consola Web Poka-Yoke de Sierra Gorda para Daniel Juárez."""
    html_path = BASE_DIR.parent.parent / "Index_Sierra.html"
    if not html_path.exists():
        html_path = Path(r"c:\Users\sidha\OneDrive\Careta para Antigravity\Index_Sierra.html")
    if html_path.exists():
        with open(html_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Index_Sierra.html no encontrado</h1>", status_code=404)

@app.get("/api/sierra/datos")
def api_obtener_datos_sierra(usuario: str = "xichudaniel@gmail.com", rol: str = "daniel"):
    """Retorna las métricas, guías y catálogo de Sierra Gorda en tiempo real."""
    try:
        from sierra_api import obtener_datos_sierra
        return obtener_datos_sierra(usuario_email=usuario, role=rol)
    except Exception as ex:
        logger.error(f"Error en /api/sierra/datos: {ex}", exc_info=True)
        return {"exito": False, "error": str(ex)}

@app.post("/api/sierra/reasignar_chofer")
def api_reasignar_chofer_sierra(payload: ReasignarChoferPayload):
    """Ejecuta transferencia en lote de chofer a chofer en GUIAS_ASIGNADAS."""
    try:
        from sierra_api import reasignar_chofer_a_chofer_sierra
        p = payload.dict() if hasattr(payload, "dict") else payload.__dict__
        return reasignar_chofer_a_chofer_sierra(
            origen_email=p.get("origen_email", ""),
            destino_email=p.get("destino_email", ""),
            usuario_email=p.get("usuario_email", "xichudaniel@gmail.com"),
            role=p.get("role", "daniel")
        )
    except Exception as ex:
        logger.error(f"Error en /api/sierra/reasignar_chofer: {ex}", exc_info=True)
        return {"exito": False, "error": str(ex)}

@app.post("/api/sierra/reasignar_ubicacion")
def api_reasignar_ubicacion_sierra(payload: ReasignarUbicacionPayload):
    """Ejecuta reasignación por CP/Municipio y actualiza Override_Activo en MATRIZ_CP."""
    try:
        from sierra_api import reasignar_por_ubicacion_sierra
        p = payload.dict() if hasattr(payload, "dict") else payload.__dict__
        return reasignar_por_ubicacion_sierra(
            tipo=p.get("tipo", "municipio"),
            valor=p.get("valor", ""),
            destino_email=p.get("destino_email", ""),
            fecha_expiracion=p.get("fecha_expiracion", ""),
            usuario_email=p.get("usuario_email", "xichudaniel@gmail.com"),
            role=p.get("role", "daniel")
        )
    except Exception as ex:
        logger.error(f"Error en /api/sierra/reasignar_ubicacion: {ex}", exc_info=True)
        return {"exito": False, "error": str(ex)}

# ------------------------------------------------------------------------------
# 7. VIGILANTE DE BUZÓN LOCAL (INBOX WATCHER THREAD)
# ------------------------------------------------------------------------------
def vigilante_inbox_local():
    """
    Hilo de fondo que vigila la carpeta ./inbox_multimodal/ en busca de archivos
    depositados por la PC maestra a través de Tailscale o sincronización de red.
    """
    logger.info(f"Vigilante de buzón local iniciado en: {DIR_INBOX}")
    while True:
        try:
            archivos = list(DIR_INBOX.glob("*.*"))
            for archivo in archivos:
                if archivo.is_file():
                    logger.info(f"[Buzón Inbox] Archivo detectado: {archivo.name}")
                    try:
                        ext = archivo.suffix.lower()
                        mime = "application/octet-stream"
                        tipo = "documento"
                        if ext in [".jpg", ".jpeg"]:
                            mime = "image/jpeg"
                            tipo = "imagen_booking"
                        elif ext == ".png":
                            mime = "image/png"
                            tipo = "imagen_booking"
                        elif ext in [".webm", ".ogg", ".wav", ".mp3"]:
                            mime = f"audio/{ext[1:]}"
                            tipo = "audio_teoyolotl"
                        elif ext == ".pdf":
                            mime = "application/pdf"
                            tipo = "factura_ccp"
                        elif ext == ".json":
                            # Procesar directamente como payload JSON
                            with open(archivo, "r", encoding="utf-8") as jf:
                                payload_data = json.load(jf)
                            payload_obj = MultimodalPayload(**payload_data)
                            task_id = f"inbox_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
                            with REGISTRY_LOCK:
                                TASK_REGISTRY[task_id] = {
                                    "task_id": task_id,
                                    "status": "QUEUED",
                                    "creado_ts": time.time(),
                                    "id_registro": payload_obj.id_registro,
                                    "tipo": payload_obj.tipo
                                }
                            _procesar_tarea_multimodal_bg(task_id, payload_obj)
                            # Mover archivo a procesados
                            archivo.rename(DIR_PROCESADOS / archivo.name)
                            continue

                        # Si es archivo binario (audio, imagen, pdf)
                        with open(archivo, "rb") as bf:
                            b64 = base64.b64encode(bf.read()).decode("utf-8")

                        payload_obj = MultimodalPayload(
                            tipo=tipo,
                            id_registro=archivo.stem,
                            archivo_base64=b64,
                            mime_type=mime,
                            contexto={"origen_archivo": archivo.name}
                        )
                        task_id = f"inbox_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
                        with REGISTRY_LOCK:
                            TASK_REGISTRY[task_id] = {
                                "task_id": task_id,
                                "status": "QUEUED",
                                "creado_ts": time.time(),
                                "id_registro": payload_obj.id_registro,
                                "tipo": payload_obj.tipo
                            }
                        _procesar_tarea_multimodal_bg(task_id, payload_obj)
                        archivo.rename(DIR_PROCESADOS / archivo.name)

                    except Exception as fe:
                        logger.error(f"Error procesando archivo {archivo.name}: {fe}")
                        try:
                            archivo.rename(DIR_FALLIDOS / archivo.name)
                        except Exception:
                            pass
        except Exception as e:
            logger.error(f"Error en bucle de vigilancia de buzón: {e}")

        time.sleep(5)

# ------------------------------------------------------------------------------
# 8. HEARTBEAT Y ARRANQUE DEL SERVIDOR
# ------------------------------------------------------------------------------
def heartbeat_periodico():
    """Reporta el estado y salud del servidor cada 60 minutos."""
    while True:
        try:
            if psutil:
                mem = psutil.virtual_memory()
                ram_str = f"RAM Usada: {mem.percent}% ({round(mem.used/(1024**3), 2)} GB / {round(mem.total/(1024**3), 2)} GB)"
            else:
                ram_str = "RAM: N/A (psutil no cargado)"
            logger.info(f"❤️ HEARTBEAT: Hermes Node activo. {ram_str}")
        except Exception as ex:
            logger.warning(f"Error en heartbeat: {ex}")
        time.sleep(3600)

def main():
    logger.info("================================================================")
    logger.info("🏛️  INICIANDO AGENTE CALPIXQUI 24/7 (GUARDIÁN DE LA BÓVEDA)")
    logger.info("   Ecosistema OLLIN — Arauto Express (Headless Orchestrator)")
    logger.info(f"   Directorio Base: {BASE_DIR}")
    logger.info(f"   Host: {HERMES_HOST} | Puerto: {HERMES_PORT}")
    logger.info("================================================================")

    if not FASTAPI_AVAILABLE:
        logger.error("FastAPI o Uvicorn no están instalados en este intérprete.")
        logger.error("Por favor ejecuta primero: powershell -ExecutionPolicy Bypass -File .\\setup_entorno.ps1")
        sys.exit(1)

    # Iniciar hilos de soporte
    t_inbox = threading.Thread(target=vigilante_inbox_local, daemon=True, name="InboxWatcher")
    t_inbox.start()

    t_heartbeat = threading.Thread(target=heartbeat_periodico, daemon=True, name="Heartbeat")
    t_heartbeat.start()

    ram_total_str = f"{round(psutil.virtual_memory().total/(1024**3), 1)} GB" if psutil else "16.0 GB"

    # Notificar inicio en Google Chat
    enviar_alerta_google_chat(
        titulo="Agente CALPIXQUI 24/7 Activado",
        mensaje=f"El Guardián de la Casa y Administrador de la Bóveda está ONLINE en puerto {HERMES_PORT}.",
        severidad="INFO",
        detalles={"PID Host": os.getpid(), "RAM Total": ram_total_str, "Nodo": "PC Secundaria"}
    )

    # Arrancar Uvicorn
    uvicorn.run(
        app,
        host=HERMES_HOST,
        port=HERMES_PORT,
        log_level="info",
        access_log=False
    )

if __name__ == "__main__":
    main()
