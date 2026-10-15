"""
escudo_reclamos_dhl.py — Motor Cognitivo de Aclaraciones DHL y Escudo de Pertenencia (Calpixqui v3)
Ecosistema OLLIN — Arauto Express (Plaza Querétaro)

ARQUITECTURA DE 5 FILTROS COGNITIVOS:
1. Filtro de Atendido Previo: Si el último remitente es @arauto.express, archiva sin alertar.
2. Extractor de Guías Completo: Decodifica el cuerpo y extrae todas las guías de 10 dígitos (discriminando teléfonos).
3. Escudo de Pertenencia: Búsqueda cruzada real en Bóvedas (cero datos inventados). Si no existe -> Notifica a Mesa.
4. Clasificador Cognitivo Gemini: Clasifica en ACTUALIZACION_ESTATUS, NUEVO_INTENTO, ENTREGA_NO_RECONOCIDA, etc.
5. Matriz de Acciones y Registro Canónico:
   - Registra/actualiza ticket en la pestaña 'ACLARACIONES_DHL' de VALIDACIÓN_QRO_2025 (Estatus ABIERTO).
   - ACTUALIZACION_ESTATUS -> WhatsApp suave a chofer (sin rescate) + Google Chat con propuesta de respuesta.
   - NUEVO_INTENTO / SIN POD -> WhatsApp rescate a chofer + Supervisor.
   - ENTREGA_NO_RECONOCIDA CON POD -> Google Chat con POD + propuesta lista para copiar a DHL (sin molestar a chofer).
   - NO_PERTENECE -> Google Chat Mesa de Control para avisar a DHL que está fuera de plaza.
"""

import os
import re
import sys
import json
import base64
import uuid
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

# Cargar .env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

# Importar submódulos de Calpixqui v3
CURRENT_DIR = Path(__file__).parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from extractor_guias import extraer_guias_dhl, aislar_ultimo_mensaje
from clasificador_aclaraciones import clasificar_peticion_dhl
from gestor_tickets_aclaraciones import registrar_o_actualizar_ticket

BASE_DIR = Path(__file__).parent
ROOT_DIR = BASE_DIR.parent.parent
LOG_FILE = BASE_DIR / "logs" / "calpixqui_whatsapp_diagnostico.json"
TOKEN_FILE = ROOT_DIR / ".agents" / "google_token.json"
DISPATCH_CACHE = BASE_DIR / "logs" / "guias_despachadas_recientes.json"

GATEWAY_URL = "http://localhost:3001/send-message"
GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz9KITH2sdlPsSibwV1PRNq_5DI60S0Oxc3GZD6P3LBm0wBvsfaCKvZ0Rpu8dOxuruP/exec"
BD_APP_RUTA_ID = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w"
ID_VALIDACION_QRO_2025 = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M"
ID_BD_CENTRAL_2023 = "1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8"
MONITOR_INCIDENCIAS_ID = "15XPRq79p0Z_jcKoxc_Sc_FKOQNHj8V2EYwn8QlMbqc0"

WEBHOOK_GENERAL_CHAT = "https://chat.googleapis.com/v1/spaces/AAQA-NmGVf0/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ml4k0Mmpx8c3vGco583llDQGEGJf3OY7LUMKlJjJIsY"

# Supervisión Operativa de Rampa (Sidharta monitorea exclusivamente por Google Chat)
SUPERVISORES_OPERATIVOS = [
    {
        "nombre": "Irvin Reyes - Supervisor de Rampa",
        "telefono": "+52 55 4189 1708",
        "to": "525541891708@c.us"
    }
]


def sanitizar_pid_para_boveda(pid_raw: Any) -> str:
    """Ley de la Doble J: JJD (3 letras calle) -> JD (2 letras Bóveda)."""
    if not pid_raw:
        return ""
    pid_clean = str(pid_raw).strip().upper()
    if pid_clean.startswith("JJD"):
        pid_clean = "JD" + pid_clean[3:]
    return pid_clean


def obtener_google_token() -> str:
    """Obtiene y/o refresca el token de acceso OAuth para Google APIs."""
    if not TOKEN_FILE.exists():
        return ""
    try:
        with open(TOKEN_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        access_token = data.get("access_token", "")
        refresh_token = data.get("refresh_token", "")
        client_id = data.get("client_id", "")
        client_secret = data.get("client_secret", "")

        test_url = f"https://sheets.googleapis.com/v4/spreadsheets/{BD_APP_RUTA_ID}?fields=spreadsheetId"
        req = urllib.request.Request(test_url, headers={"Authorization": f"Bearer {access_token}"})
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    return access_token
        except urllib.error.HTTPError as e:
            if e.code == 401 and refresh_token and client_id and client_secret:
                print("🔄 Refrescando token OAuth de Google...")
                token_url = "https://oauth2.googleapis.com/token"
                refresh_payload = json.dumps({
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token"
                }).encode("utf-8")
                r_req = urllib.request.Request(token_url, data=refresh_payload, headers={"Content-Type": "application/json"}, method="POST")
                with urllib.request.urlopen(r_req, timeout=10) as r_resp:
                    r_data = json.loads(r_resp.read().decode("utf-8"))
                    new_token = r_data.get("access_token")
                    if new_token:
                        data["access_token"] = new_token
                        with open(TOKEN_FILE, "w", encoding="utf-8") as f_out:
                            json.dump(data, f_out, indent=2)
                        return new_token
        return access_token
    except Exception as ex:
        print(f"⚠️ Error obteniendo Google token: {ex}")
        return ""


def decodificar_parte_payload(part: Dict[str, Any]) -> str:
    """Decodifica recursivamente partes mime de un mensaje de Gmail."""
    mime_type = part.get("mimeType", "")
    body_data = part.get("body", {}).get("data", "")
    
    if body_data and ("text/plain" in mime_type or "text/html" in mime_type):
        try:
            padded = body_data + "=" * (-len(body_data) % 4)
            raw = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8", errors="replace")
            if "text/plain" in mime_type:
                return raw
            else:
                return re.sub(r"<[^>]+>", " ", raw)
        except Exception:
            pass

    subparts = part.get("parts", [])
    textos = []
    for sp in subparts:
        t = decodificar_parte_payload(sp)
        if t:
            textos.append(t)
    return "\n".join(textos)


def escanear_gmail_reclamos() -> Dict[str, Any]:
    """
    Escanea la bandeja de Gmail para obtener reclamos bajo '03_RECLAMOS_DHL'
    excluyendo los ya procesados.
    FILTRO 1: Detecta si el último mensaje fue enviado por Arauto Express para descartar hilos ya atendidos.
    """
    print("📬 [FRENTE 6] Escaneando bandeja de Gmail (etiqueta '03_RECLAMOS_DHL')...")
    token = obtener_google_token()
    if not token:
        return {"exito": False, "motivo": "Sin token de Google"}

    try:
        query = "label:03_RECLAMOS_DHL -label:03_RECLAMOS_DHL/PROCESADOS"
        url = f"https://gmail.googleapis.com/gmail/v1/users/me/threads?q={urllib.parse.quote(query)}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            threads = data.get("threads", [])
            if not threads:
                return {"exito": False, "motivo": "Sin hilos pendientes"}

            th_id = threads[0]["id"]
            th_url = f"https://gmail.googleapis.com/gmail/v1/users/me/threads/{th_id}?format=full"
            th_req = urllib.request.Request(th_url, headers={"Authorization": f"Bearer {token}"})
            with urllib.request.urlopen(th_req, timeout=12) as th_resp:
                th_data = json.loads(th_resp.read().decode("utf-8"))
                messages = th_data.get("messages", [])
                if not messages:
                    return {"exito": False, "motivo": "Hilo sin mensajes"}

                asunto = ""
                remitente_ultimo = ""
                cuerpo_ultimo = ""
                cuerpo_completo = ""

                # Obtener asunto del primer mensaje
                for h in messages[0].get("payload", {}).get("headers", []):
                    if h["name"].lower() == "subject":
                        asunto = h["value"]
                        break

                # Analizar el último mensaje para remitente y cuerpo reciente
                ultimo_msg = messages[-1]
                for h in ultimo_msg.get("payload", {}).get("headers", []):
                    if h["name"].lower() == "from":
                        remitente_ultimo = h["value"]
                        break

                cuerpo_ultimo = decodificar_parte_payload(ultimo_msg.get("payload", {}))
                if not cuerpo_ultimo.strip():
                    cuerpo_ultimo = ultimo_msg.get("snippet", "")

                for m in messages:
                    cuerpo_completo += "\n" + decodificar_parte_payload(m.get("payload", {})) + " " + m.get("snippet", "")

                # FILTRO 1: ¿El último remitente es de Arauto Express?
                if "@arauto.express" in remitente_ultimo.lower():
                    print(f"   🛑 [FILTRO 1] El hilo {th_id} ya fue atendido por {remitente_ultimo}. Se silencia y archiva.")
                    return {
                        "exito": True,
                        "ya_atendido": True,
                        "thread_id": th_id,
                        "asunto": asunto,
                        "remitente": remitente_ultimo
                    }

                return {
                    "exito": True,
                    "ya_atendido": False,
                    "thread_id": th_id,
                    "asunto": asunto,
                    "cuerpo_ultimo": cuerpo_ultimo.strip(),
                    "cuerpo_completo": cuerpo_completo.strip(),
                    "remitente": remitente_ultimo
                }
    except Exception as e_api:
        print(f"   ⚠️ Error en consulta Gmail API nativa: {e_api}")
        return {"exito": False, "motivo": str(e_api)}


def consultar_pochteca_boveda(hwb: str, token: str) -> Dict[str, Any]:
    """
    FILTRO 3: Escudo de Pertenencia con Búsqueda Híbrida Real.
    Cero datos inventados: Si la guía no está en Bóveda, 'encontrado' es False.
    Cruza GUIAS_ASIGNADAS + VALIDACIÓN_QRO_2025 para tener datos completos.
    """
    res = {
        "encontrado": False,
        "fuente": "NO_ENCONTRADO",
        "pochteca": "",
        "email_chofer": "",
        "direccion": "",
        "colonia_mun": "",
        "cp": "",
        "destinatario": "",
        "telefono_cliente": "",
        "fecha_asignacion": "",
        "checkpoint_previo": "",
        "pid": "",
        "piezas": 1,
        "foto_fachada": "",
        "firma": "",
        "comentarios_previos": ""
    }

    if not token or not hwb:
        return res

    # 1. Nivel 1A: GUIAS_ASIGNADAS (BD_APP_RUTA_2025)
    try:
        url_g = f"https://sheets.googleapis.com/v4/spreadsheets/{BD_APP_RUTA_ID}/values/GUIAS_ASIGNADAS!A:Z"
        req_g = urllib.request.Request(url_g, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req_g, timeout=10) as resp_g:
            data_g = json.loads(resp_g.read().decode("utf-8"))
            vals = data_g.get("values", [])
            if vals:
                hdrs = vals[0]
                for r in vals[1:]:
                    if len(r) > 0 and str(r[0]).strip() == hwb:
                        row_dict = {h: v for h, v in zip(hdrs, r) if v}
                        res["encontrado"] = True
                        res["fuente"] = "GUIAS_ASIGNADAS"
                        res["destinatario"] = row_dict.get("Destinatario", "")
                        res["direccion"] = row_dict.get("Direccion_Entrega", "")
                        res["email_chofer"] = row_dict.get("Chofer_Asignado", "")
                        res["telefono_cliente"] = row_dict.get("Tel_Query", "")
                        res["checkpoint_previo"] = row_dict.get("Nuevo_Estatus") or row_dict.get("Estatus_Guia", "")
                        res["foto_fachada"] = row_dict.get("Foto_Fachada_Paquete", "")
                        res["firma"] = row_dict.get("Firma_Evidencia", "")
                        res["comentarios_previos"] = row_dict.get("Comentarios_Chofer", "")
                        print(f"   ✅ [Nivel 1A] HWB {hwb} localizada en GUIAS_ASIGNADAS.")
                        break
    except Exception as ex_g:
        print(f"   ℹ️ Consulta GUIAS_ASIGNADAS: {ex_g}")

    # 2. Nivel 1B: VALIDACIÓN_QRO_2025 (Pestaña 'Validación' - 25 columnas)
    try:
        url_v = f"https://sheets.googleapis.com/v4/spreadsheets/{ID_VALIDACION_QRO_2025}/values/" + urllib.parse.quote("Validación!A:Y")
        req_v = urllib.request.Request(url_v, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req_v, timeout=10) as resp_v:
            data_v = json.loads(resp_v.read().decode("utf-8"))
            vals_v = data_v.get("values", [])
            if vals_v:
                hdrs_v = vals_v[0]
                for r in vals_v[1:]:
                    if len(r) > 0 and str(r[0]).strip() == hwb:
                        row_dict = {h: v for h, v in zip(hdrs_v, r) if v}
                        res["encontrado"] = True
                        if res["fuente"] == "NO_ENCONTRADO":
                            res["fuente"] = "VALIDACION_QRO_2025"
                        # Enriquecer campos si faltan
                        if not res["pid"]:
                            res["pid"] = sanitizar_pid_para_boveda(row_dict.get("PID", ""))
                        if not res["cp"]:
                            res["cp"] = str(row_dict.get("C.P.", ""))
                        if not res["direccion"]:
                            res["direccion"] = row_dict.get("Rcvr Addr 1", "")
                        if not res["colonia_mun"]:
                            res["colonia_mun"] = f"{row_dict.get('Rcvr Addr 2', '')} {row_dict.get('Rcvr Addr 3', '')}".strip()
                        if not res["destinatario"]:
                            res["destinatario"] = row_dict.get("Receiver Name", "")
                        if not res["checkpoint_previo"]:
                            res["checkpoint_previo"] = row_dict.get("Checkpoint", "")
                        if not res["email_chofer"]:
                            res["email_chofer"] = row_dict.get("ID correo", "")
                        if not res["telefono_cliente"]:
                            res["telefono_cliente"] = row_dict.get("Telefono", "")
                        if not res["fecha_asignacion"]:
                            res["fecha_asignacion"] = row_dict.get("Fecha asignacion", "")
                        if not res["foto_fachada"]:
                            res["foto_fachada"] = row_dict.get("Imagen fachada", "")
                        if not res["firma"]:
                            res["firma"] = row_dict.get("Firma", "")
                        print(f"   ✅ [Nivel 1B] HWB {hwb} enriquecida desde VALIDACIÓN_QRO_2025.")
                        break
    except Exception as ex_v:
        print(f"   ℹ️ Consulta VALIDACIÓN_QRO_2025: {ex_v}")

    # 3. Nivel 2: BD_CENTRAL_2023 (Pestaña 'Ruta') si no se ha encontrado
    if not res["encontrado"]:
        try:
            url_c = f"https://sheets.googleapis.com/v4/spreadsheets/{ID_BD_CENTRAL_2023}/values/" + urllib.parse.quote("Ruta!A:Y")
            req_c = urllib.request.Request(url_c, headers={"Authorization": f"Bearer {token}"})
            with urllib.request.urlopen(req_c, timeout=10) as resp_c:
                data_c = json.loads(resp_c.read().decode("utf-8"))
                vals_c = data_c.get("values", [])
                if vals_c:
                    hdrs_c = vals_c[0]
                    for r in vals_c[1:]:
                        if len(r) > 0 and str(r[0]).strip() == hwb:
                            row_dict = {h: v for h, v in zip(hdrs_c, r) if v}
                            res["encontrado"] = True
                            res["fuente"] = "BD_CENTRAL_2023"
                            res["pid"] = sanitizar_pid_para_boveda(row_dict.get("PID", ""))
                            res["cp"] = str(row_dict.get("C.P.", ""))
                            res["direccion"] = row_dict.get("Rcvr Addr 1", "")
                            res["colonia_mun"] = f"{row_dict.get('Rcvr Addr 2', '')} {row_dict.get('Rcvr Addr 3', '')}".strip()
                            res["destinatario"] = row_dict.get("Receiver Name", "")
                            res["checkpoint_previo"] = row_dict.get("Checkpoint", "")
                            res["email_chofer"] = row_dict.get("ID correo", "")
                            res["telefono_cliente"] = row_dict.get("Telefono", "")
                            res["fecha_asignacion"] = row_dict.get("Fecha asignacion", "")
                            print(f"   ✅ [Nivel 2] HWB {hwb} localizada en BD_CENTRAL_2023 (Ruta).")
                            break
        except Exception as ex_c:
            print(f"   ℹ️ Consulta BD_CENTRAL_2023: {ex_c}")

    # 4. Resolver Nombre y Contacto del Pochteca desde directorio
    em_chofer = res.get("email_chofer", "").lower().strip()
    dir_path = BASE_DIR / "data" / "directorio_pochtecas.json"
    if dir_path.exists() and em_chofer:
        try:
            with open(dir_path, "r", encoding="utf-8") as f_dir:
                cat_local = json.load(f_dir)
                if em_chofer in cat_local:
                    res["pochteca"] = cat_local[em_chofer].get("nombre", res["pochteca"])
        except Exception:
            pass

    # Mapeos conocidos de seguridad
    if "edgar" in em_chofer:
        res["pochteca"] = "Edgar Rodríguez"
    elif "daniel" in em_chofer:
        res["pochteca"] = "Daniel Juárez"
    elif "rosi" in em_chofer or "yesi" in em_chofer:
        res["pochteca"] = "Rosi"
    elif "fernando" in em_chofer:
        res["pochteca"] = "Fernando"
    elif "diego" in em_chofer:
        res["pochteca"] = "Diego"
    elif "gregorio" in em_chofer:
        res["pochteca"] = "Gregorio Adonai"

    return res


def obtener_datos_contacto_pochteca(pochteca: str, email_chofer: str = "") -> Dict[str, Any]:
    """Obtiene teléfono y webhook de chat del Pochteca."""
    dir_path = BASE_DIR / "data" / "directorio_pochtecas.json"
    em_clean = email_chofer.lower().strip()
    
    if dir_path.exists():
        try:
            with open(dir_path, "r", encoding="utf-8") as f_dir:
                directorio = json.load(f_dir)
                if em_clean in directorio:
                    u = directorio[em_clean]
                    return {
                        "nombre": u.get("nombre", pochteca),
                        "telefono": u.get("telefono", ""),
                        "to": u.get("to", ""),
                        "supervisor": u.get("supervisor", "irvin.reyes@arauto.express"),
                        "grupo": u.get("grupo", "Independiente"),
                        "webhook_chat": u.get("webhook_chat", "")
                    }
        except Exception as ex_dir:
            print(f"   ⚠️ Error leyendo directorio_pochtecas.json: {ex_dir}")

    # Fallbacks conocidos de seguridad
    poch_low = pochteca.lower()
    if "edgar" in poch_low:
        return {"nombre": "Edgar Rodríguez", "telefono": "+52 442 381 6310", "to": "524423816310@c.us", "supervisor": "irvin.reyes@arauto.express", "grupo": "Independiente", "webhook_chat": "https://chat.googleapis.com/v1/spaces/AAQAZOkix4k/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=6h6p2bqUKIDZQ1gblgNf3e5aQIxaUu4i6UJ1i1l8ank"}
    elif "daniel" in poch_low or "xichu" in poch_low:
        return {"nombre": "Daniel Juárez", "telefono": "+52 419 115 5625", "to": "524191155625@c.us", "supervisor": "xichudaniel@gmail.com", "grupo": "Daniel", "webhook_chat": "https://chat.googleapis.com/v1/spaces/AAQAEoaLlMQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=C3nlfauF5BX4ywmc4xnQWDbr8B5qdJINL-SUbhHw3PI"}
    elif "rosi" in poch_low or "yesi" in poch_low:
        return {"nombre": "Rosi", "telefono": "+52 419 129 7704", "to": "524191297704@c.us", "supervisor": "xichudaniel@gmail.com", "grupo": "Daniel", "webhook_chat": "https://chat.googleapis.com/v1/spaces/AAQAEoaLlMQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=C3nlfauF5BX4ywmc4xnQWDbr8B5qdJINL-SUbhHw3PI"}
    elif "diego" in poch_low:
        return {"nombre": "Diego", "telefono": "+52 566 156 2361", "to": "525661562361@c.us", "supervisor": "xichudaniel@gmail.com", "grupo": "Daniel", "webhook_chat": "https://chat.googleapis.com/v1/spaces/AAQAEoaLlMQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=C3nlfauF5BX4ywmc4xnQWDbr8B5qdJINL-SUbhHw3PI"}
    elif "gregorio" in poch_low:
        return {"nombre": "Gregorio Adonai", "telefono": "+52 468 113 4607", "to": "524681134607@c.us", "supervisor": "xichudaniel@gmail.com", "grupo": "Daniel", "webhook_chat": "https://chat.googleapis.com/v1/spaces/AAQAEoaLlMQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=C3nlfauF5BX4ywmc4xnQWDbr8B5qdJINL-SUbhHw3PI"}

    return {"nombre": pochteca, "telefono": "", "to": "", "supervisor": "irvin.reyes@arauto.express", "grupo": "Independiente", "webhook_chat": ""}


def construir_mensaje_suave_actualizacion(hwb: str, pochteca: str, contexto: Dict[str, Any]) -> str:
    """Plantilla WhatsApp SUAVE para Solicitudes de Actualización / DD's (Sin alarma de rescate)."""
    ctx = contexto or {}
    direccion = ctx.get("direccion", "Consultar en AppSheet")
    colonia = ctx.get("colonia_mun", "")
    cp = ctx.get("cp", "")
    destinatario = ctx.get("destinatario", "Cliente Particular")
    fecha_asig = ctx.get("fecha_asignacion", "Reciente")
    sup = ctx.get("supervisor_nombre", "tu supervisor")

    lineas = [
        "📦 *[Arauto Express — Consulta de Ruta]*",
        f"Hola *{pochteca}*, DHL nos solicita fecha tentativa de entrega para la guía:",
        f"🏷️ *Guía HWB:* `{hwb}`",
        f"👤 *Destinatario:* {destinatario}",
        f"📍 *Dirección:* {direccion} {colonia} (C.P. {cp})",
        f"🕒 *Asignada:* {fecha_asig}\n",
        "❓ *¿En qué fecha u horario tienes contemplado pasar a entregar?*",
        f"Por favor confirma con {sup}. *(No requiere rescate urgente).* \n",
        "🛡️ _Ecosistema OLLIN Arauto Express._"
    ]
    return "\n".join(lineas)


def construir_mensaje_rescate(hwb: str, pochteca: str, motivo: str, accion: str, contexto: Dict[str, Any]) -> str:
    """Plantilla WhatsApp de RESCATE / REINTENTO URGENTE."""
    ctx = contexto or {}
    pid = ctx.get("pid", "")
    direccion = ctx.get("direccion", "Consultar en AppSheet")
    colonia = ctx.get("colonia_mun", "")
    cp = ctx.get("cp", "")
    destinatario = ctx.get("destinatario", "Cliente Particular")
    tel_cliente = ctx.get("telefono_cliente", "N/A")
    sup = ctx.get("supervisor_nombre", "tu supervisor")

    dir_query = urllib.parse.quote(f"{direccion} {cp} Querétaro")
    url_maps = f"https://www.google.com/maps/search/?api=1&query={dir_query}"

    lineas = [
        "🚨 *[ALERTA DE RESCATE / NUEVO INTENTO — ARAUTO EXPRESS]*",
        f"Hola *{pochteca}*, requerimos tu apoyo prioritario hoy para este envío:\n",
        f"🏷️ *Guía HWB:* `{hwb}`",
    ]
    if pid:
        lineas.append(f"📦 *PID:* `{pid}`")
    lineas.extend([
        f"📍 *Dirección:* {direccion} {colonia} (C.P. {cp})",
        f"👤 *Destinatario:* {destinatario}",
    ])
    if tel_cliente and tel_cliente != "N/A":
        lineas.append(f"📞 *Tel. Cliente:* {tel_cliente}")
    lineas.append(f"🗺️ *Maps:* {url_maps}\n")
    lineas.extend([
        f"⚠️ *Motivo DHL:* {motivo}",
        f"🎯 *Acción:* {accion}\n",
        f"Por favor comunícate a la brevedad con {sup}.",
        "🛡️ _Ecosistema OLLIN Arauto Express._"
    ])
    return "\n".join(lineas)


def construir_mensaje_retorno(hwb: str, pochteca: str, contexto: Dict[str, Any]) -> str:
    """Plantilla WhatsApp para Retorno de Paquete al SVC."""
    lineas = [
        "↩️ *[INSTRUCCIÓN DE RETORNO A ORIGEN — ARAUTO EXPRESS]*",
        f"Hola *{pochteca}*, DHL ha solicitado formalmente el retorno a estación de la guía:",
        f"🏷️ *Guía HWB:* `{hwb}`",
        f"📦 *PID:* `{contexto.get('pid', 'N/A')}`",
        f"📍 *Destinatario:* {contexto.get('destinatario', 'N/A')}\n",
        "🛑 *ACCIÓN:* No intentar entrega. Regresar el bulto físico al SVC al finalizar tu ruta.",
        "🛡️ _Ecosistema OLLIN Arauto Express._"
    ]
    return "\n".join(lineas)


def enviar_mensaje_whatsapp(to_id: str, mensaje: str, nom_dest: str, hwb: str) -> bool:
    """Envía un mensaje de WhatsApp a través del Gateway local (Puppeteer en puerto 3001)."""
    if not to_id:
        return False
    print(f"📤 Enviando WhatsApp a {nom_dest} ({to_id})...")
    payload = json.dumps({"to": to_id, "message": mensaje}).encode("utf-8")
    req = urllib.request.Request(GATEWAY_URL, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.getcode()
            body = resp.read().decode("utf-8")
            ok = (status == 200)
            print(f"   HTTP {status} | {'🟢 Enviado WhatsApp' if ok else '⚠️ Falló WhatsApp'}")
            return ok
    except Exception as e:
        print(f"   ❌ Excepción enviando WhatsApp a {nom_dest}: {e}")
        return False


def notificar_google_chat(webhooks: List[str], texto: str):
    """Notifica en uno o más webhooks de Google Chat."""
    for wh in webhooks:
        if not wh:
            continue
        try:
            req = urllib.request.Request(
                wh,
                data=json.dumps({"text": texto}).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(f"   💬 Google Chat notificado exitosamente (HTTP {resp.status})")
        except Exception as e_gc:
            print(f"   ⚠️ Error en webhook Google Chat: {e_gc}")


def autoarchivar_y_etiquetar_en_gmail(thread_id: str) -> bool:
    """
    Etiqueta automáticamente bajo '03_RECLAMOS_DHL/PROCESADOS',
    remueve '03_RECLAMOS_DHL' y desarchiva de INBOX directamente vía Gmail API.
    """
    if not thread_id:
        return False
    print(f"🏷️ [FRENTE 6] Archivando hilo {thread_id} en Gmail...")
    token = obtener_google_token()
    if token:
        try:
            url = f"https://gmail.googleapis.com/gmail/v1/users/me/threads/{thread_id}/modify"
            payload = json.dumps({
                "addLabelIds": ["Label_29"],  # 03_RECLAMOS_DHL/PROCESADOS
                "removeLabelIds": ["INBOX", "Label_1185948050814530214"]  # INBOX y 03_RECLAMOS_DHL
            }).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    print("   ✅ Hilo archivado vía Gmail API.")
                    return True
        except Exception as e_mod:
            print(f"   ℹ️ Modificación Gmail API: {e_mod}")
    return False


def inyectar_en_monitor_incidencias(datos: Dict[str, Any], token: str) -> bool:
    """
    Inyecta en MONITOR_INCIDENCIAS_AE cumpliendo ESTRICTAMENTE el esquema
    de 25 columnas rígidas (Base 0 - Regla Maestra GEMINI.md).
    """
    print("💾 Inyectando registro en MONITOR_INCIDENCIAS_AE (25 cols rígidas)...")
    ts_ahora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    fecha_hoy = datetime.now().strftime("%d/%m/%Y")

    # Esquema Canónico Inviolable de 25 Columnas:
    # 0: Guia | 1: PID | 2: C.P. | 3: Piezas | 4: Rcvr Addr 1 | 5: Rcvr Addr 2 | 6: Rcvr Addr 3
    # 7: Receiver Name | 8: GPS | 9: Checkpoint | 10: Comentarios | 11: Fecha asignacion
    # 12: Fecha en ruta | 13: Imagen fachada | 14: ID correo | 15: EDD | 16: KEY (Col Q)
    # 17: Tipo de servicio | 18: Inter | 19: Firma | 20: Telefono (Col U) | 21: Hora de llegada
    # 22: Aprobación Auditor | 23: Motivo de Rechazo | 24: Marca de Tiempo
    fila_25 = [
        datos.get("guia", ""),                                  # 0
        sanitizar_pid_para_boveda(datos.get("pid", "")),        # 1
        str(datos.get("cp", "")),                               # 2
        1,                                                      # 3
        datos.get("direccion_1", ""),                           # 4
        datos.get("direccion_2", ""),                           # 5
        datos.get("colonia_municipio", ""),                     # 6
        datos.get("destinatario", ""),                          # 7
        datos.get("gps", ""),                                   # 8
        datos.get("checkpoint", "FD"),                          # 9
        datos.get("incidencia", ""),                            # 10
        datos.get("fecha_asignacion", ts_ahora),                # 11
        ts_ahora,                                               # 12
        datos.get("foto_fachada", ""),                          # 13
        datos.get("email_chofer", ""),                          # 14
        fecha_hoy,                                              # 15
        datos.get("key", uuid.uuid4().hex[:8]),                 # 16: KEY fija en Col Q
        datos.get("tipo_servicio", "Urbano"),                   # 17
        "",                                                     # 18
        datos.get("firma", ""),                                 # 19: Firma en Col T
        str(datos.get("telefono", "")),                         # 20: Telefono en Col U
        ts_ahora,                                               # 21
        "FALSE",                                                # 22
        "",                                                     # 23
        ts_ahora                                                # 24
    ]

    try:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{MONITOR_INCIDENCIAS_ID}/values/MONITOR!A:Y:append?valueInputOption=USER_ENTERED"
        payload = json.dumps({"values": [fila_25]}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as ex:
        print(f"   ℹ️ Error inyectando en MONITOR_INCIDENCIAS_AE: {ex}")
        return False


def procesar_ciclo_atomico_frente6():
    """
    Ciclo atómico completo con la Arquitectura de 5 Filtros Cognitivos y
    seguimiento abierto en la Consola Megapulpo v83.0 PROD.
    """
    print("=" * 80)
    print("🏛️ CALPIXQUI v3 — PIPELINE COGNITIVO FRENTE 6 (5 FILTROS & SEGUIMIENTO)")
    print(f"Fecha y Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} CST")
    print("=" * 80)

    # 1. Lectura e Ingesta de Gmail
    datos_correo = escanear_gmail_reclamos()
    if not datos_correo.get("exito"):
        print(f"📭 {datos_correo.get('motivo', 'Sin correos pendientes')}. Fin de ciclo.")
        return

    thread_id = datos_correo.get("thread_id", "")
    asunto = datos_correo.get("asunto", "")

    # FILTRO 1: Si ya fue atendido por Arauto Express -> Archivar y terminar
    if datos_correo.get("ya_atendido"):
        print(f"✅ Hilo {thread_id} archivado silenciosamente porque ya fue respondido por Arauto.")
        autoarchivar_y_etiquetar_en_gmail(thread_id)
        return

    cuerpo_reciente = datos_correo.get("cuerpo_ultimo", "")
    cuerpo_completo = datos_correo.get("cuerpo_completo", "")

    # FILTRO 2: Extractor de Guías Legítimas (cuerpo completo + asunto)
    from extractor_guias import RE_ASUNTO_EXCLUIDO
    if RE_ASUNTO_EXCLUIDO.search(asunto or ""):
        print(f"🛑 [FILTRO ADMINISTRATIVO] El asunto '{asunto}' es un directorio/batch informativo. Archivando silenciosamente.")
        autoarchivar_y_etiquetar_en_gmail(thread_id)
        return

    guias_extraidas = extraer_guias_dhl(asunto, cuerpo_reciente)
    if not guias_extraidas:
        # Reintentar en cuerpo completo
        guias_extraidas = extraer_guias_dhl(asunto, cuerpo_completo)

    if not guias_extraidas:
        print(f"⚠️ No se detectó ninguna guía DHL de 10 dígitos en el hilo {thread_id}.")
        # Notificar a Mesa para revisión manual
        msg_manual = (
            f"⚠️ *[REVISIÓN MANUAL — CORREO DHL SIN GUÍA IDENTIFICABLE]*\n"
            f"• Asunto: *{asunto}*\n"
            f"• Remitente: {datos_correo.get('remitente', 'N/A')}\n"
            f"• Detalle: No se localizó guía de 10 dígitos en el texto.\n"
            f"🔗 https://mail.google.com/mail/u/0/#all/{thread_id}"
        )
        notificar_google_chat([WEBHOOK_GENERAL_CHAT], msg_manual)
        autoarchivar_y_etiquetar_en_gmail(thread_id)
        return

    # Tope de seguridad contra correos masivos (máximo 10 guías por hilo)
    if len(guias_extraidas) > 10:
        print(f"⚠️ Se detectaron {len(guias_extraidas)} números en el hilo; limitando a los primeros 10 para evitar tormenta HTTP.")
        guias_extraidas = guias_extraidas[:10]

    print(f"📋 Guías DHL identificadas en el hilo: {guias_extraidas}")

    # FILTRO 4: Clasificación Cognitiva de la Petición
    dictamen = clasificar_peticion_dhl(asunto, cuerpo_reciente)
    categoria = dictamen.get("categoria", "INCIERTO")
    resumen_dhl = dictamen.get("resumen", "")
    confianza = dictamen.get("confianza", 0.0)
    propuesta_resp = dictamen.get("propuesta_respuesta_dhl", "")

    print(f"🧠 Clasificación: [{categoria}] (Confianza: {confianza}) — {resumen_dhl}")

    if categoria == "ACUSE":
        print("📨 Correo identificado como simple acuse/agradecimiento. Archivando sin emitir alertas.")
        autoarchivar_y_etiquetar_en_gmail(thread_id)
        return

    token = obtener_google_token()
    guias_fuera_de_zona: List[str] = []

    try:
        # Procesar cada guía extraída
        for hwb in guias_extraidas:
            print(f"\n--- Procesando Guía HWB: {hwb} ---")

            # FILTRO 3: Escudo de Pertenencia
            info_boveda = consultar_pochteca_boveda(hwb, token)

            if not info_boveda["encontrado"]:
                # Guía NO pertenece a Arauto Express -> Acumular para enviar 1 sola alerta consolidada
                print(f"🛡️ [ESCUDO DE PERTENENCIA] Guía {hwb} NO pertenece a nuestra zona/bóvedas.")
                guias_fuera_de_zona.append(hwb)
                continue

            # La guía SÍ es de Arauto Express
            pochteca = info_boveda["pochteca"]
            email_chofer = info_boveda.get("email_chofer", "")
            datos_contacto = obtener_datos_contacto_pochteca(pochteca, email_chofer)
            supervisor_nom = "Irvin Reyes" if "irvin" in datos_contacto.get("supervisor", "") else "Daniel Juárez"
            info_boveda["supervisor_nombre"] = supervisor_nom

            tiene_pod = bool(info_boveda.get("firma") or info_boveda.get("foto_fachada"))

            # Preparar propuesta de respuesta para DHL si no venía en el clasificador
            if not propuesta_resp:
                if categoria == "ACTUALIZACION_ESTATUS":
                    propuesta_resp = f"Estimado equipo DHL, respecto a la guía {hwb}, se encuentra asignada al operador {pochteca} en ruta y programada para próxima visita."
                elif categoria == "ENTREGA_NO_RECONOCIDA" and tiene_pod:
                    propuesta_resp = f"Estimado equipo DHL, compartimos que la guía {hwb} cuenta con entrega registrada por el operador {pochteca}. Adjuntamos evidencia y firmas disponibles en sistema."
                else:
                    propuesta_resp = f"Estimado equipo DHL, enterados de la solicitud para la guía {hwb}. Se encuentra en gestión con el supervisor de ruta {supervisor_nom}."

            # REGISTRO CANÓNICO DEL TICKET EN ACLARACIONES_DHL (Modo Abierto)
            ticket_data = {
                "guia": hwb,
                "pid": info_boveda.get("pid", ""),
                "pochteca": pochteca,
                "email_chofer": email_chofer,
                "telefono_chofer": datos_contacto.get("telefono", ""),
                "supervisor": supervisor_nom,
                "categoria": categoria,
                "asunto": asunto,
                "detalle_dhl": resumen_dhl,
                "estatus": "ABIERTO",
                "firma": info_boveda.get("firma", ""),
                "foto_fachada": info_boveda.get("foto_fachada", ""),
                "propuesta_respuesta": propuesta_resp,
                "thread_id": thread_id
            }
            registrar_o_actualizar_ticket(ticket_data, token)

            # Inyectar también en MONITOR_INCIDENCIAS_AE si requiere seguimiento en calle
            inyectar_en_monitor_incidencias({
                "guia": hwb,
                "pid": info_boveda.get("pid", ""),
                "cp": info_boveda.get("cp", ""),
                "direccion_1": info_boveda.get("direccion", ""),
                "colonia_municipio": info_boveda.get("colonia_mun", ""),
                "destinatario": info_boveda.get("destinatario", ""),
                "email_chofer": email_chofer,
                "incidencia": f"[{categoria}] {resumen_dhl}",
                "telefono": datos_contacto.get("telefono", ""),
                "foto_fachada": info_boveda.get("foto_fachada", ""),
                "firma": info_boveda.get("firma", ""),
                "fecha_asignacion": info_boveda.get("fecha_asignacion", "")
            }, token)

            # Webhooks de Google Chat a notificar
            chats_notificar = [WEBHOOK_GENERAL_CHAT]
            if datos_contacto.get("webhook_chat") and datos_contacto["webhook_chat"] not in chats_notificar:
                chats_notificar.append(datos_contacto["webhook_chat"])

            # FILTRO 5: MATRIZ DE ACCIONES OPERATIVAS

            # Rama 1: ACTUALIZACION_ESTATUS
            if categoria == "ACTUALIZACION_ESTATUS":
                print(f"🟢 [RAMA ACTUALIZACIÓN] Disparando WhatsApp suave a {pochteca} y aviso a Chat...")
                msg_wa = construir_mensaje_suave_actualizacion(hwb, pochteca, info_boveda)
                if datos_contacto.get("to"):
                    enviar_mensaje_whatsapp(datos_contacto["to"], msg_wa, pochteca, hwb)

                msg_chat = (
                    f"📋 *[SOLICITUD DE ACTUALIZACIÓN DHL — EN RUTA]*\n"
                    f"• Guía HWB: `{hwb}` | PID: `{info_boveda.get('pid', 'N/A')}`\n"
                    f"• Operador: *{pochteca}* ({supervisor_nom})\n"
                    f"• Dirección: {info_boveda.get('direccion', 'N/A')} (C.P. {info_boveda.get('cp', '')})\n"
                    f"• Petición DHL: {resumen_dhl}\n\n"
                    f"📝 *Propuesta de respuesta a DHL (1-Clic):*\n"
                    f"\"{propuesta_resp}\"\n"
                    f"🔗 https://mail.google.com/mail/u/0/#all/{thread_id}"
                )
                notificar_google_chat(chats_notificar, msg_chat)

            # Rama 2: NUEVO_INTENTO
            elif categoria == "NUEVO_INTENTO":
                print(f"🔴 [RAMA NUEVO INTENTO] Disparando alerta de rescate a {pochteca} y supervisor...")
                msg_rescate = construir_mensaje_rescate(hwb, pochteca, resumen_dhl, "Re-visitar domicilio hoy con cliente presente.", info_boveda)
                if datos_contacto.get("to"):
                    enviar_mensaje_whatsapp(datos_contacto["to"], msg_rescate, pochteca, hwb)

                # Notificar al supervisor por WhatsApp
                for s in SUPERVISORES_OPERATIVOS:
                    enviar_mensaje_whatsapp(s["to"], msg_rescate, s["nombre"], hwb)

                msg_chat = (
                    f"🚨 *[NUEVO INTENTO DE ENTREGA SOLICITADO POR DHL]*\n"
                    f"• Guía HWB: `{hwb}` | Operador: *{pochteca}*\n"
                    f"• Domicilio: {info_boveda.get('direccion', 'N/A')} (C.P. {info_boveda.get('cp', '')})\n"
                    f"• Detalle DHL: {resumen_dhl}\n"
                    f"🔗 https://mail.google.com/mail/u/0/#all/{thread_id}"
                )
                notificar_google_chat(chats_notificar, msg_chat)

            # Rama 3: ENTREGA_NO_RECONOCIDA
            elif categoria == "ENTREGA_NO_RECONOCIDA":
                if tiene_pod:
                    print(f"📋 [RAMA ENTREGA NO RECONOCIDA - CON POD] Entrega respaldada en sistema. Notificando Mesa...")
                    msg_chat = (
                        f"🛡️ *[ENTREGA NO RECONOCIDA — CON EVIDENCIA EN BÓVEDA]*\n"
                        f"• Guía HWB: `{hwb}` | Operador: *{pochteca}*\n"
                        f"• Destinatario en sistema: {info_boveda.get('destinatario', 'N/A')}\n"
                        f"• Firma: {'✅ Registrada' if info_boveda.get('firma') else 'Sin firma'}\n"
                        f"• Foto Fachada: {'✅ Registrada' if info_boveda.get('foto_fachada') else 'Sin foto'}\n\n"
                        f"📝 *Propuesta de respuesta a DHL:*\n"
                        f"\"{propuesta_resp}\"\n"
                        f"🔗 https://mail.google.com/mail/u/0/#all/{thread_id}"
                    )
                    notificar_google_chat(chats_notificar, msg_chat)
                else:
                    print(f"⚠️ [RAMA ENTREGA NO RECONOCIDA - SIN POD] Requiere aclaración en campo. Alerta a chofer y supervisor...")
                    msg_rescate = construir_mensaje_rescate(hwb, pochteca, "Cliente indica no reconocer la entrega.", "Contactar al cliente y validar recepción o recuperar bulto.", info_boveda)
                    if datos_contacto.get("to"):
                        enviar_mensaje_whatsapp(datos_contacto["to"], msg_rescate, pochteca, hwb)
                    for s in SUPERVISORES_OPERATIVOS:
                        enviar_mensaje_whatsapp(s["to"], msg_rescate, s["nombre"], hwb)
                    notificar_google_chat(chats_notificar, msg_rescate)

            # Rama 4: RETORNO_ORIGEN
            elif categoria == "RETORNO_ORIGEN":
                print(f"🟠 [RAMA RETORNO] Disparando orden de devolución al SVC para {pochteca}...")
                msg_ret = construir_mensaje_retorno(hwb, pochteca, info_boveda)
                if datos_contacto.get("to"):
                    enviar_mensaje_whatsapp(datos_contacto["to"], msg_ret, pochteca, hwb)
                notificar_google_chat(chats_notificar, msg_ret)

            # Rama 5: PERDIDA / INCIERTO
            else:
                print(f"⚠️ [RAMA {categoria}] Notificando en Google Chat para gestión personalizada...")
                msg_chat = (
                    f"⚠️ *[ACLARACIÓN DHL — GESTIÓN REQUERIDA ({categoria})]*\n"
                    f"• Guía HWB: `{hwb}` | Operador: *{pochteca}*\n"
                    f"• Petición DHL: {resumen_dhl}\n"
                    f"• Propuesta: {propuesta_resp}\n"
                    f"🔗 https://mail.google.com/mail/u/0/#all/{thread_id}"
                )
                notificar_google_chat(chats_notificar, msg_chat)

        # Enviar 1 sola notificación consolidada si hubo guías fuera de zona
        if guias_fuera_de_zona:
            lista_str = ", ".join(f"`{g}`" for g in guias_fuera_de_zona)
            msg_fuera = (
                f"🛡️ *[ESCUDO DE PERTENENCIA — GUÍA(S) FUERA DE ZONA]*\n"
                f"• Guía(s) reclamada(s): {lista_str}\n"
                f"• Asunto: {asunto}\n"
                f"• Dictamen: No se encontró registro en nuestras Bóvedas de Querétaro.\n\n"
                f"📝 *Respuesta sugerida para copiar y pegar a DHL:*\n"
                f"\"Estimado equipo DHL, tras validar en nuestro sistema operativo de ruta, confirmamos que la(s) guía(s) {', '.join(guias_fuera_de_zona)} no pertenece(n) a la zona ni asignación de Arauto Express. Favor de canalizar al proveedor correspondiente.\"\n"
                f"🔗 https://mail.google.com/mail/u/0/#all/{thread_id}"
            )
            notificar_google_chat([WEBHOOK_GENERAL_CHAT], msg_fuera)
    finally:
        # 7. Auto-archivar hilo procesado en Gmail SIEMPRE (evita bucles infinitos)
        autoarchivar_y_etiquetar_en_gmail(thread_id)
        print("\n🟢 Ciclo atómico del Frente 6 completado exitosamente.")


if __name__ == "__main__":
    procesar_ciclo_atomico_frente6()
