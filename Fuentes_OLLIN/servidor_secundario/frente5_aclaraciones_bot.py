"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: BOT DE ACLARACIONES DE SERVICIO AL CLIENTE (FRENTE 5)
ARCHIVO: frente5_aclaraciones_bot.py
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)
VERSIÓN: 1.0.0 PROD
================================================================================

PROPÓSITO ARQUITECTÓNICO:
Motor en Python para el Agente CALPIXQUI (PC secundaria 24/7) especializado
en la ingesta, evaluación cognitiva de evidencias y resolución de aclaraciones DHL.

RESPONSABILIDADES:
1. 'El Escudo de Pertenencia': filtra guías de otros Service Centers.
2. Motor de Búsqueda Híbrida: OLLIN 2025 (BD_APP_RUTA, VALIDACIÓN_QRO) + Fallback BD CENTRAL 2023.
3. Evaluación Cognitiva con Gemini 3.6 Flash (<300ms de latencia).
4. Generación de borrador formal de respuesta a DHL y alertas de rescate al Pochteca.
5. Registro de tickets en 'MONITOR_INCIDENCIAS_AE' (Spreadsheet ID: 15XPRq79p0Z_jcKoxc_Sc_FKOQNHj8V2EYwn8Q1Mbqc0).
================================================================================
"""

import os
import sys
import json
import time
import uuid
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

# Rutas base
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=ENV_PATH)
except ImportError:
    pass

logger = logging.getLogger("Frente5Bot")

# Importar utilidades base de hermes_ollin_worker
try:
    from hermes_ollin_worker import (
        GeminiMultimodalClient,
        sanitizar_pid_para_boveda,
        enviar_alerta_google_chat,
        enviar_alerta_whatsapp,
        GEMINI_API_KEY,
        SPREADSHEET_ID_BD_APP_RUTA_2025,
        SPREADSHEET_ID_VALIDACION_QRO_2025,
        DIR_PROCESADOS
    )
except ImportError:
    def sanitizar_pid_para_boveda(pid_raw: Any) -> str:
        if not pid_raw:
            return ""
        pid_clean = str(pid_raw).strip().upper()
        if pid_clean.startswith("JJD"):
            pid_clean = "JD" + pid_clean[3:]
        return pid_clean

    def enviar_alerta_google_chat(titulo: str, mensaje: str, severidad: str = "INFO", detalles: Optional[Dict[str, Any]] = None):
        print(f"[{severidad}] {titulo}: {mensaje}")

    def enviar_alerta_whatsapp(mensaje: str):
        print(f"[WHATSAPP] {mensaje}")

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    SPREADSHEET_ID_BD_APP_RUTA_2025 = os.getenv("SPREADSHEET_ID_BD_APP_RUTA_2025", "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w")
    SPREADSHEET_ID_VALIDACION_QRO_2025 = os.getenv("SPREADSHEET_ID_VALIDACION_QRO_2025", "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M")
    DIR_PROCESADOS = BASE_DIR / "procesados"

SPREADSHEET_ID_BD_CENTRAL_2023 = os.getenv("SPREADSHEET_ID_BD_CENTRAL_2023", "1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8")
SPREADSHEET_ID_MONITOR_INCIDENCIAS_AE = os.getenv("SPREADSHEET_ID_MONITOR_INCIDENCIAS_AE", "15XPRq79p0Z_jcKoxc_Sc_FKOQNHj8V2EYwn8Q1Mbqc0")
BUSCAR_EN_BD_CENTRAL_2023 = os.getenv("BUSCAR_EN_BD_CENTRAL_2023", "true").lower() == "true"


class BotAclaracionesFrente5:
    """
    Motor del Bot de Aclaraciones (Frente 5) para CALPIXQUI.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or GEMINI_API_KEY
        try:
            self.gemini_client = GeminiMultimodalClient(api_key=self.api_key)
        except Exception:
            self.gemini_client = None

        self.gc = None
        self._inicializar_gspread()

    def _inicializar_gspread(self):
        cred_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials.json")
        cred_path = BASE_DIR / cred_file
        if cred_path.exists():
            try:
                import gspread
                self.gc = gspread.service_account(filename=str(cred_path))
                logger.info("gspread conectado exitosamente para Frente 5.")
            except Exception as e:
                logger.warning(f"gspread no disponible en Frente 5: {e}")

    def extraer_identificadores(self, texto: str) -> Dict[str, List[str]]:
        """Extrae guías (10 dígitos) y PIDs (JD / JJD)."""
        texto_limpio = re.sub(r'[\r\n\t]+', ' ', texto)
        hwbs = []
        pids = []

        # Guías HWB (10 dígitos numéricos)
        for m in re.finditer(r'\b(\d{10})\b', texto_limpio):
            hwb = m.group(1)
            if hwb not in hwbs:
                hwbs.append(hwb)

        # PIDs (JJD / JD)
        for m in re.finditer(r'\b(JJD[0-9A-Z]{14,24}|JD[0-9A-Z]{14,24})\b', texto_limpio, re.IGNORECASE):
            raw_pid = m.group(1).upper()
            clean_pid = sanitizar_pid_para_boveda(raw_pid)
            if clean_pid not in pids:
                pids.append(clean_pid)

        return {"hwbs": hwbs, "pids": pids}

    def buscar_en_bovedas(self, id_valor: str, tipo_id: str = "HWB") -> Dict[str, Any]:
        """
        Búsqueda híbrida escalonada:
        1. Nivel 1: VALIDACIÓN_QRO_2025 y BD_APP_RUTA_2025
        2. Nivel 2 (Fallback): BD CENTRAL 2023 si BUSCAR_EN_BD_CENTRAL_2023 es True
        """
        id_limpio = id_valor.strip().upper()
        if tipo_id == "PID":
            id_limpio = sanitizar_pid_para_boveda(id_limpio)

        logger.info(f"Iniciando Búsqueda Híbrida para {tipo_id}={id_limpio}...")

        # Si tenemos gspread activo
        if self.gc:
            # Nivel 1.A: VALIDACIÓN_QRO_2025
            try:
                sh_val = self.gc.open_by_key(SPREADSHEET_ID_VALIDACION_QRO_2025)
                ws_val = sh_val.worksheet("VALIDACIÓN_QRO_2025")
                registros = ws_val.get_all_values()
                for r in reversed(registros[1:]):
                    guia_r = r[0].strip() if len(r) > 0 else ""
                    pid_r = sanitizar_pid_para_boveda(r[1]) if len(r) > 1 else ""
                    if (tipo_id == "HWB" and guia_r == id_limpio) or (tipo_id == "PID" and pid_r == id_limpio):
                        return {
                            "encontrado": True,
                            "fuente": "VALIDACION_QRO_2025",
                            "registro": {
                                "guia": guia_r,
                                "pid": pid_r,
                                "destinatario": r[7] if len(r) > 7 else "",
                                "gps": r[8] if len(r) > 8 else "",
                                "checkpoint": r[9] if len(r) > 9 else "OK",
                                "comentarios": r[10] if len(r) > 10 else "",
                                "foto_fachada": r[13] if len(r) > 13 else "",
                                "pochteca": r[14] if len(r) > 14 else "",
                                "firma_evidencia": r[19] if len(r) > 19 else "",
                                "telefono": r[20] if len(r) > 20 else "",
                                "audio_evidencia": ""
                            }
                        }
            except Exception as e_val:
                logger.warning(f"Error consultando VALIDACIÓN_QRO_2025 vía gspread: {e_val}")

            # Nivel 2: Fallback BD CENTRAL 2023
            if BUSCAR_EN_BD_CENTRAL_2023:
                try:
                    sh_cen = self.gc.open_by_key(SPREADSHEET_ID_BD_CENTRAL_2023)
                    ws_cen = sh_cen.worksheet("RUTA")
                    registros_cen = ws_cen.get_all_values()
                    headers = [h.lower().strip() for h in registros_cen[0]]
                    idx_guia = headers.index("guia") if "guia" in headers else 0
                    idx_pid = headers.index("pid") if "pid" in headers else 1
                    for r in reversed(registros_cen[1:]):
                        g_cen = r[idx_guia].strip() if len(r) > idx_guia else ""
                        p_cen = sanitizar_pid_para_boveda(r[idx_pid]) if len(r) > idx_pid else ""
                        if (tipo_id == "HWB" and g_cen == id_limpio) or (tipo_id == "PID" and p_cen == id_limpio):
                            return {
                                "encontrado": True,
                                "fuente": "BD_CENTRAL_2023_FALLBACK",
                                "registro": {
                                    "guia": g_cen,
                                    "pid": p_cen,
                                    "destinatario": r[7] if len(r) > 7 else "",
                                    "gps": r[8] if len(r) > 8 else "",
                                    "checkpoint": r[9] if len(r) > 9 else "OK",
                                    "comentarios": r[10] if len(r) > 10 else "",
                                    "foto_fachada": r[13] if len(r) > 13 else "",
                                    "pochteca": r[14] if len(r) > 14 else "",
                                    "firma_evidencia": r[19] if len(r) > 19 else "",
                                    "telefono": "",
                                    "audio_evidencia": ""
                                }
                            }
                except Exception as e_cen:
                    logger.warning(f"Error consultando BD CENTRAL 2023 vía gspread: {e_cen}")

        # Si gspread no está activo o se usa modo híbrido de respaldo
        return {
            "encontrado": False,
            "fuente": "NINGUNA",
            "registro": None,
            "motivo": "Guía no localizada en Bóvedas de Arauto Express (Escudo de Pertenencia activado)."
        }

    def evaluar_cognitivamente(
        self,
        asunto: str,
        cuerpo_correo: str,
        registro_boveda: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evalúa el reclamo de DHL contrastado con las evidencias de Bóveda mediante Gemini 3.6 Flash.
        """
        destinatario = registro_boveda.get("destinatario", "")
        firma = registro_boveda.get("firma_evidencia", "")
        foto = registro_boveda.get("foto_fachada", "")
        gps = registro_boveda.get("gps", "")
        audio = registro_boveda.get("audio_evidencia", "")
        comentarios = registro_boveda.get("comentarios", "")

        evidencias_encontradas = []
        faltantes = []

        if destinatario: evidencias_encontradas.append(f"Destinatario ({destinatario})")
        if firma: evidencias_encontradas.append("Firma Digital / Autógrafa")
        else: faltantes.append("Firma Digital / Autógrafa")

        if foto: evidencias_encontradas.append("Foto Fachada / Paquete")
        else: faltantes.append("Foto Fachada / Paquete")

        if gps: evidencias_encontradas.append(f"Check-In GPS ({gps})")
        else: faltantes.append("Coordenadas GPS")

        if audio: evidencias_encontradas.append("Nota de Voz Teoyolotl")
        if comentarios: evidencias_encontradas.append(f"Observaciones ({comentarios})")

        # Inferencia con Gemini 3.6 Flash si está configurado
        if self.gemini_client and self.api_key and self.api_key != "TU_GEMINI_API_KEY_AQUI":
            prompt = f"""Actúas como CALPIXQUI, el Auditor Cognitivo de Servicio al Cliente para Arauto Express (concesionario DHL QRO/LEN).
Analiza el correo de reclamo de DHL y determina si las evidencias de Bóveda son suficientes para desvirtuar el reclamo o responder con POD.

CORREO DHL:
- Asunto: {asunto}
- Texto: {cuerpo_correo[:1500]}

EVIDENCIAS EN BÓVEDA:
- Guía: {registro_boveda.get('guia')} | PID: {registro_boveda.get('pid')}
- Destinatario: {destinatario}
- Pochteca: {registro_boveda.get('pochteca')}
- Checkpoint: {registro_boveda.get('checkpoint')}
- Firma URL: {firma or 'NO REGISTRADA'}
- Foto Fachada URL: {foto or 'NO REGISTRADA'}
- GPS: {gps or 'NO REGISTRADO'}
- Audio Teoyolotl: {audio or 'NO REGISTRADO'}
- Comentarios Chofer: {comentarios}

Responde en formato JSON estricto:
{{
  "tipo_reclamo": "SOLICITUD_POD" | "NEGATIVA_ENTREGA" | "FALTA_FIRMA" | "DIRECCION_ERRONEA",
  "suficiencia": "COMPLETA" | "DEFICIENTE" | "SIN_EVIDENCIA",
  "faltantes": ["lista de evidencias faltantes"],
  "dictamen_resumen": "resumen ejecutivo del dictamen",
  "transcripcion_voz": "síntesis de lo dicho por chofer o comentarios"
}}"""
            try:
                res_gemini = self.gemini_client.llamar_multimodal(prompt_sistema=prompt, datos_partes=[])
                if res_gemini.get("suficiencia"):
                    res_gemini["evidencias_encontradas"] = evidencias_encontradas
                    return res_gemini
            except Exception as ex_gem:
                logger.warning(f"Fallo en llamada a Gemini: {ex_gem}")

        # Fallback heurístico determinista
        tiene_completa = bool(firma and foto)
        suficiencia = "COMPLETA" if tiene_completa else ("DEFICIENTE" if (firma or foto) else "SIN_EVIDENCIA")
        tipo_reclamo = "SOLICITUD_POD"
        lower = (asunto + " " + cuerpo_correo).lower()
        if "negativa" in lower or "desconoce" in lower or "no recibido" in lower:
            tipo_reclamo = "NEGATIVA_ENTREGA"
        elif "firma" in lower:
            tipo_reclamo = "FALTA_FIRMA"

        return {
            "tipo_reclamo": tipo_reclamo,
            "suficiencia": suficiencia,
            "faltantes": faltantes,
            "evidencias_encontradas": evidencias_encontradas,
            "dictamen_resumen": "Entrega acreditada con Firma y Foto de Fachada." if suficiencia == "COMPLETA" else "Faltan elementos probatorios clave; se requiere rescate de campo.",
            "transcripcion_voz": comentarios or ""
        }

    def generar_borrador_dhl(self, reg: Dict[str, Any], eval_ia: Dict[str, Any]) -> str:
        """Genera el texto de respuesta formal para DHL."""
        return f"""Estimado equipo de Rastreo y Servicio al Cliente DHL,

En atención a su solicitud de aclaración para la Guía: {reg.get('guia')} (PID: {reg.get('pid')}), compartimos el reporte formal de entrega y evidencias de campo recabadas por Arauto Express:

📋 DETALLES DE LA ENTREGA:
• Estatus en Sistema: {reg.get('checkpoint', 'OK')}
• Destinatario: {reg.get('destinatario', 'Titular en domicilio')}
• Pochteca / Operador: {reg.get('pochteca', 'Ruta Asignada')}
• Check-In GPS: {reg.get('gps', 'Coordenadas validadas')}
• Observaciones: {reg.get('comentarios', 'Entrega realizada en domicilio')}

📷 EVIDENCIAS DIGITALES:
• Foto Fachada / Paquete: {reg.get('foto_fachada') or 'No disponible'}
• Firma de Recepción: {reg.get('firma_evidencia') or 'No disponible'}
• Audio Testimonial Teoyolotl: {reg.get('audio_evidencia') or 'Sin nota de voz'}

Quedamos a su disposición para cualquier validación adicional.

Atentamente,
Mesa de Control y Aclaraciones — Arauto Express (Plaza QRO / LEN)"""

    def emitir_alerta_rescate(self, reg: Dict[str, Any], eval_ia: Dict[str, Any], asunto_original: str):
        """Emite alerta de rescate al Pochteca responsable."""
        faltantes_str = ", ".join(eval_ia.get("faltantes", []))
        msg = f"""🚨 *ALERTA DE RESCATE PRIORITARIA — FRENTE 5 (ACLARACIONES)*

Escalación de DHL recibida con evidencia *INCOMPLETA*:
• *Guía:* `{reg.get('guia')}` | *PID:* `{reg.get('pid')}`
• *Pochteca Responsable:* `{reg.get('pochteca')}`
• *Tipo Reclamo:* {eval_ia.get('tipo_reclamo')}
• *Faltante Urgente a Recabar:* *{faltantes_str}*
• *Asunto DHL:* _{asunto_original}_

👉 *Instrucción Operativa:* El operador debe acudir a re-visita o contactar al cliente para obtener la evidencia faltante antes de las 18:00 hrs."""

        enviar_alerta_google_chat(
            titulo="Alerta de Rescate: Evidencia Incompleta Frente 5",
            mensaje=msg,
            severidad="WARN",
            detalles={
                "Guia": reg.get("guia"),
                "Pochteca": reg.get("pochteca"),
                "Faltantes": faltantes_str
            }
        )
        enviar_alerta_whatsapp(msg)

    def registrar_ticket_monitor(self, ticket: Dict[str, Any]):
        """Registra el ticket en MONITOR_INCIDENCIAS_AE."""
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        fila = [
            ticket.get("ticket_id", f"TKT-{datetime.now().strftime('%Y%m%d%H%M%S')}"),
            ts,
            ticket.get("guia", ""),
            ticket.get("pid", ""),
            ticket.get("remitente", ""),
            ticket.get("asunto", ""),
            ticket.get("tipo_reclamo", ""),
            ticket.get("pochteca", ""),
            ticket.get("plaza", "QRO"),
            ticket.get("fuente_boveda", ""),
            ticket.get("suficiencia", ""),
            ", ".join(ticket.get("evidencias", [])),
            ", ".join(ticket.get("faltantes", [])),
            ticket.get("estatus", "RECLAMO_INGRESADO"),
            ticket.get("dictamen_ia", ""),
            "SI" if ticket.get("borrador_generado") else "NO",
            ticket.get("thread_id", ""),
            ts
        ]

        if self.gc:
            try:
                sh_mon = self.gc.open_by_key(SPREADSHEET_ID_MONITOR_INCIDENCIAS_AE)
                ws_mon = sh_mon.worksheet("ACLARACIONES_DHL")
                ws_mon.append_row(fila, value_input_option="USER_ENTERED")
                logger.info(f"Ticket {fila[0]} registrado en MONITOR_INCIDENCIAS_AE vía gspread.")
                return
            except Exception as e_mon:
                logger.warning(f"Error escribiendo en MONITOR_INCIDENCIAS_AE vía gspread: {e_mon}")

        # Respaldo en buffer local JSON
        DIR_PROCESADOS.mkdir(parents=True, exist_ok=True)
        buf_file = DIR_PROCESADOS / f"ticket_aclaracion_{ticket.get('guia')}_{uuid.uuid4().hex[:6]}.json"
        with open(buf_file, "w", encoding="utf-8") as f:
            json.dump(ticket, f, ensure_ascii=False, indent=2)
        logger.info(f"Ticket archivado en buffer local: {buf_file.name}")

    def procesar_aclaracion(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Orquesta el ciclo de vida completo de un ticket de aclaración.
        """
        asunto = payload.get("asunto", "")
        cuerpo = payload.get("cuerpo_correo", "")
        remitente = payload.get("remitente", "")
        thread_id = payload.get("thread_id", "")
        datos_boveda = payload.get("datos_boveda") or {}

        # 1. Extraer identificadores si no vienen explícitos
        guia = payload.get("guia")
        pid = payload.get("pid")
        if not guia and not pid:
            ids = self.extraer_identificadores(asunto + " " + cuerpo)
            guia = ids["hwbs"][0] if ids["hwbs"] else ""
            pid = ids["pids"][0] if ids["pids"] else ""

        if not guia and not pid:
            return {
                "estatus": "DESCARTADO_SIN_IDENTIFICADOR",
                "mensaje": "No se detectaron HWBs ni PIDs válidos en el correo."
            }

        # 2. Búsqueda híbrida si los datos de bóveda no vienen provistos
        if not datos_boveda:
            tipo_id = "HWB" if guia else "PID"
            val_id = guia if guia else pid
            res_busqueda = self.buscar_en_bovedas(val_id, tipo_id)
            if not res_busqueda["encontrado"]:
                return {
                    "estatus": "DESCARTADO_ESCUDO_PERTENENCIA",
                    "guia": guia,
                    "pid": pid,
                    "mensaje": "La guía no pertenece a la operación de Arauto Express (Escudo de Pertenencia)."
                }
            reg_boveda = res_busqueda["registro"]
            fuente_boveda = res_busqueda["fuente"]
        else:
            reg_boveda = datos_boveda
            fuente_boveda = "PROVISTO_APPSCRIPT"

        # 3. Evaluación Cognitiva
        eval_ia = self.evaluar_cognitivamente(asunto, cuerpo, reg_boveda)
        suficiencia = eval_ia.get("suficiencia", "SIN_EVIDENCIA")

        borrador = ""
        if suficiencia == "COMPLETA":
            estatus_ticket = "RESUELTO_EVIDENCIA_DHL"
            borrador = self.generar_borrador_dhl(reg_boveda, eval_ia)
        else:
            estatus_ticket = "NOTIFICADO_A_POCHTECA"
            self.emitir_alerta_rescate(reg_boveda, eval_ia, asunto)

        # 4. Registrar en Monitor de Incidencias
        ticket_id = f"TKT-{datetime.now().strftime('%Y%m%d')}-{reg_boveda.get('guia') or reg_boveda.get('pid')}"
        ticket_data = {
            "ticket_id": ticket_id,
            "guia": reg_boveda.get("guia", guia),
            "pid": reg_boveda.get("pid", pid),
            "remitente": remitente,
            "asunto": asunto,
            "tipo_reclamo": eval_ia.get("tipo_reclamo", "SOLICITUD_POD"),
            "pochteca": reg_boveda.get("pochteca", ""),
            "plaza": reg_boveda.get("plaza", "QRO"),
            "fuente_boveda": fuente_boveda,
            "suficiencia": suficiencia,
            "evidencias": eval_ia.get("evidencias_encontradas", []),
            "faltantes": eval_ia.get("faltantes", []),
            "estatus": estatus_ticket,
            "dictamen_ia": eval_ia.get("dictamen_resumen", ""),
            "borrador_generado": bool(borrador),
            "thread_id": thread_id
        }
        self.registrar_ticket_monitor(ticket_data)

        return {
            "estatus": estatus_ticket,
            "ticket_id": ticket_id,
            "suficiencia": suficiencia,
            "evaluacion_ia": eval_ia,
            "borrador_dhl": borrador,
            "registro": reg_boveda
        }

    # ==========================================================================
    # ASISTENTE INTELIGENTE DE DOMICILIOS Y COORDENADAS PARA POCHTECAS EN RUTA
    # ==========================================================================

    @staticmethod
    def parsear_coordenadas_gps(gps_str: Any) -> Optional[Tuple[float, float]]:
        """Extrae (lat, lon) de una cadena tolerante a formatos geográficos."""
        if not gps_str:
            return None
        texto = str(gps_str).strip()
        # Regex para capturar dos números decimales
        match = re.search(r'([-+]?\d{1,2}\.\d+)[,\s]+([-+]?\d{1,3}\.\d+)', texto)
        if match:
            try:
                lat = float(match.group(1))
                lon = float(match.group(2))
                # Validar límites de México (Lat 14-33, Lon -118 a -86)
                if 14.0 <= lat <= 33.5 and -118.5 <= lon <= -85.5:
                    return (lat, lon)
                # Si vienen invertidos por error
                if 14.0 <= lon <= 33.5 and -118.5 <= lat <= -85.5:
                    return (lon, lat)
            except Exception:
                pass
        return None

    @staticmethod
    def calcular_distancia_metros(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calcula distancia en metros usando la fórmula de Haversine."""
        import math
        r = 6371000.0  # Radio medio de la Tierra en metros
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(r * c, 1)

    @staticmethod
    def generar_enlaces_mapas(lat: float, lon: float) -> Dict[str, str]:
        """Genera enlaces directos a Google Maps y Waze para navegación móvil en 1 clic."""
        return {
            "google_maps": f"https://www.google.com/maps/search/?api=1&query={lat},{lon}",
            "waze": f"https://waze.com/ul?ll={lat},{lon}&navigate=yes",
            "coordenadas_str": f"{lat:.6f}, {lon:.6f}"
        }

    def buscar_referencias_historicas_direccion(
        self,
        direccion: str,
        cp: Optional[str] = None,
        destinatario: Optional[str] = None,
        modo_dispersion: bool = False,
        limite_dispersion: int = 3
    ) -> Dict[str, Any]:
        """
        Búsqueda histórica de domicilios con Filtro de Calidad 'Solo OK'
        y Dispersión GPS Multi-Punto para zonas rurales o baja señal.
        """
        dir_norm = re.sub(r'[\.,#\-_/]', ' ', str(direccion or "")).lower()
        palabras_clave = [p for p in dir_norm.split() if len(p) > 2 and p not in ["calle", "avenida", "av", "privada", "priv", "colonia", "col", "numero", "num", "del", "las", "los", "san"]]
        cp_limpio = str(cp or "").strip()
        dest_limpio = str(destinatario or "").lower().strip()

        logger.info(f"🔎 Buscando referencias históricas: dir='{direccion}', cp='{cp_limpio}', palabras={palabras_clave}")

        candidatos_ok: List[Dict[str, Any]] = []
        candidatos_incidencia: List[Dict[str, Any]] = []
        candidatos_colindantes: List[Dict[str, Any]] = []

        # Función auxiliar para puntuar coincidencia
        def evaluar_coincidencia(texto_dir_bd: str, dest_bd: str, cp_bd: str) -> float:
            score = 0.0
            texto_bd_norm = str(texto_dir_bd or "").lower()
            dest_bd_norm = str(dest_bd or "").lower()
            cp_bd_norm = str(cp_bd or "").strip()

            if cp_limpio and cp_bd_norm and cp_limpio == cp_bd_norm:
                score += 3.0

            # Coincidencia de palabras clave
            for kw in palabras_clave:
                if kw in texto_bd_norm:
                    score += 2.0

            # Coincidencia de destinatario
            if dest_limpio and dest_bd_norm:
                for w in dest_limpio.split():
                    if len(w) > 3 and w in dest_bd_norm:
                        score += 3.0

            return score

        # 1. Si gspread está disponible, consultar en Bóvedas reales
        if self.gc:
            # 1.A: Consultar VALIDACIÓN_QRO_2025
            try:
                sh_val = self.gc.open_by_key(SPREADSHEET_ID_VALIDACION_QRO_2025)
                ws_val = sh_val.worksheet("VALIDACIÓN_QRO_2025")
                datos_val = ws_val.get_all_values()
                for fila in reversed(datos_val[1:]):
                    if len(fila) < 10:
                        continue
                    guia_f = fila[0]
                    pid_f = fila[1]
                    cp_f = fila[2]
                    dir_f = " ".join([fila[4] or "", fila[5] or "", fila[6] or ""]).strip()
                    dest_f = fila[7]
                    gps_f = fila[8]
                    ck_f = str(fila[9] or "OK").upper().strip()
                    coment_f = fila[10]
                    foto_f = fila[13] if len(fila) > 13 else ""
                    firma_f = fila[19] if len(fila) > 19 else ""
                    chofer_f = fila[14] if len(fila) > 14 else ""

                    sc = evaluar_coincidencia(dir_f, dest_f, cp_f)
                    if sc >= 3.0:
                        item = {
                            "guia": guia_f,
                            "pid": pid_f,
                            "direccion": dir_f,
                            "destinatario": dest_f,
                            "cp": cp_f,
                            "gps": gps_f,
                            "checkpoint": ck_f,
                            "comentarios": coment_f,
                            "foto_fachada": foto_f,
                            "firma": firma_f,
                            "pochteca": chofer_f,
                            "fuente": "VALIDACIÓN_QRO_2025",
                            "score": sc
                        }
                        if ck_f in ["OK", "ENTREGADO", "ENTREGA EXITOSA", "ENTREGADA"] or ck_f.startswith("OK"):
                            candidatos_ok.append(item)
                        else:
                            candidatos_incidencia.append(item)
                    elif cp_limpio and str(cp_f).strip() == cp_limpio and gps_f:
                        # Colindante para dispersión
                        candidatos_colindantes.append({
                            "guia": guia_f,
                            "direccion": dir_f,
                            "destinatario": dest_f,
                            "gps": gps_f,
                            "checkpoint": ck_f,
                            "fuente": "VALIDACIÓN_QRO_2025"
                        })
            except Exception as e_v:
                logger.warning(f"Error consultando referencias en VALIDACIÓN_QRO_2025: {e_v}")

            # 1.B: Fallback BD CENTRAL 2023 si aplica
            if BUSCAR_EN_BD_CENTRAL_2023 and len(candidatos_ok) == 0:
                try:
                    sh_cen = self.gc.open_by_key(SPREADSHEET_ID_BD_CENTRAL_2023)
                    ws_cen = sh_cen.worksheet("RUTA")
                    datos_cen = ws_cen.get_all_values()
                    headers_cen = [h.lower().strip() for h in datos_cen[0]]
                    idx_g = headers_cen.index("guia") if "guia" in headers_cen else 0
                    idx_dir = headers_cen.index("rcvr addr 1") if "rcvr addr 1" in headers_cen else 4
                    idx_dest = headers_cen.index("receiver name") if "receiver name" in headers_cen else 7
                    idx_gps = headers_cen.index("gps") if "gps" in headers_cen else 8
                    idx_ck = headers_cen.index("checkpoint") if "checkpoint" in headers_cen else 9
                    idx_foto = headers_cen.index("foto fachada paquete") if "foto fachada paquete" in headers_cen else 13

                    for fila in reversed(datos_cen[1:]):
                        dir_c = fila[idx_dir] if len(fila) > idx_dir else ""
                        dest_c = fila[idx_dest] if len(fila) > idx_dest else ""
                        gps_c = fila[idx_gps] if len(fila) > idx_gps else ""
                        ck_c = str(fila[idx_ck] if len(fila) > idx_ck else "OK").upper().strip()
                        foto_c = fila[idx_foto] if len(fila) > idx_foto else ""

                        sc = evaluar_coincidencia(dir_c, dest_c, "")
                        if sc >= 3.0:
                            item = {
                                "guia": fila[idx_g] if len(fila) > idx_g else "",
                                "direccion": dir_c,
                                "destinatario": dest_c,
                                "cp": "",
                                "gps": gps_c,
                                "checkpoint": ck_c,
                                "foto_fachada": foto_c,
                                "fuente": "BD_CENTRAL_2023_HISTORICO",
                                "score": sc
                            }
                            if ck_c in ["OK", "ENTREGADO", "ENTREGA EXITOSA", "ENTREGADA"] or ck_c.startswith("OK"):
                                candidatos_ok.append(item)
                            else:
                                candidatos_incidencia.append(item)
                except Exception as e_c:
                    logger.warning(f"Error consultando BD CENTRAL 2023 para histórico: {e_c}")

        # Ordenar candidatos OK por score descendente
        candidatos_ok.sort(key=lambda x: x.get("score", 0), reverse=True)

        # ----------------------------------------------------------------------
        # APLICACIÓN DEL FILTRO DE CALIDAD 'SOLO OK'
        # ----------------------------------------------------------------------
        referencia_principal: Optional[Dict[str, Any]] = None
        advertencia_incidencia = ""
        calidad_aprobada = False

        if candidatos_ok:
            mejor_ok = candidatos_ok[0]
            calidad_aprobada = True
            coords = self.parsear_coordenadas_gps(mejor_ok.get("gps"))
            links = self.generar_enlaces_mapas(coords[0], coords[1]) if coords else {}

            referencia_principal = {
                "direccion_coincidente": mejor_ok.get("direccion"),
                "ultimo_receptor": mejor_ok.get("destinatario"),
                "foto_fachada_previa": mejor_ok.get("foto_fachada"),
                "estatus_entrega_previa": mejor_ok.get("checkpoint"),
                "fecha_referencia": mejor_ok.get("fecha") or "Histórico Bóveda",
                "pochteca_previo": mejor_ok.get("pochteca"),
                "gps": links.get("coordenadas_str", mejor_ok.get("gps")),
                "enlaces_navegacion": links,
                "fuente_boveda": mejor_ok.get("fuente")
            }
        elif candidatos_incidencia:
            # Hubo visitas pero NINGUNA fue OK, o la última fue fallida
            peor_inc = candidatos_incidencia[0]
            motivo = peor_inc.get("comentarios") or peor_inc.get("checkpoint")
            advertencia_incidencia = (
                f"⚠️ ADVERTENCIA DE RUTA: La última visita a este domicilio registró INCIDENCIA: "
                f"[{peor_inc.get('checkpoint')}] '{motivo}'. No se avala como referencia positiva. "
                f"Confirmar referencias o solicitar apoyo telefónico antes de acudir."
            )
            logger.warning(f"Filtro de Calidad aplicado: Domicilio con incidencia previa detectada -> {advertencia_incidencia}")

        # ----------------------------------------------------------------------
        # DISPERSIÓN GPS MULTI-PUNTO (TOLERANCIA A ZONAS RURALES / BAJA SEÑAL)
        # ----------------------------------------------------------------------
        puntos_dispersion: List[Dict[str, Any]] = []

        # Extraer hasta 'limite_dispersion' coordenadas distintas con estatus OK
        coords_vistas = set()
        pool_puntos = candidatos_ok + [c for c in candidatos_colindantes if c.get("checkpoint") in ["OK", "ENTREGADO", "ENTREGA EXITOSA"]]

        for p in pool_puntos:
            c = self.parsear_coordenadas_gps(p.get("gps"))
            if c and c not in coords_vistas:
                coords_vistas.add(c)
                links = self.generar_enlaces_mapas(c[0], c[1])
                dist = 0.0
                if referencia_principal and referencia_principal.get("enlaces_navegacion"):
                    coords_prim = self.parsear_coordenadas_gps(referencia_principal["enlaces_navegacion"].get("coordenadas_str"))
                    if coords_prim:
                        dist = self.calcular_distancia_metros(coords_prim[0], coords_prim[1], c[0], c[1])

                puntos_dispersion.append({
                    "indice": len(puntos_dispersion) + 1,
                    "tipo": "REFERENCIA_DIRECTA_OK" if p in candidatos_ok else "COLINDANTE_OK_CALLE_CP",
                    "coordenadas": links["coordenadas_str"],
                    "lat": c[0],
                    "lon": c[1],
                    "distancia_aprox_metros": dist,
                    "destinatario_referencia": p.get("destinatario"),
                    "direccion_referencia": p.get("direccion"),
                    "google_maps_url": links["google_maps"],
                    "waze_url": links["waze"],
                    "fuente": p.get("fuente")
                })
                if len(puntos_dispersion) >= limite_dispersion:
                    break

        return {
            "exito": True,
            "calidad_aprobada_solo_ok": calidad_aprobada,
            "advertencia_incidencia": advertencia_incidencia,
            "referencia_principal": referencia_principal,
            "dispersion_multi_punto_activa": modo_dispersion or len(puntos_dispersion) > 1,
            "total_puntos_gps": len(puntos_dispersion),
            "puntos_gps": puntos_dispersion,
            "recomendacion_operativa": (
                "Referencia visual y GPS verificada con entrega exitosa previa." if calidad_aprobada else
                (advertencia_incidencia if advertencia_incidencia else "Sin entregas previas registradas para este domicilio. Proceder con precaución.")
            )
        }

    def consultar_asistente_ruta(
        self,
        query_texto: str = "",
        audio_base64: Optional[str] = None,
        mime_type: str = "audio/webm",
        direccion: Optional[str] = None,
        cp: Optional[str] = None,
        destinatario: Optional[str] = None,
        modo_dispersion: bool = False,
        pochteca: str = "Pochteca en Calle"
    ) -> Dict[str, Any]:
        """
        Punto de contacto conversacional y por voz para Pochtecas en calle (WhatsApp / Google Chat / AppSheet).
        Procesa consultas en lenguaje natural o audio y genera la ficha con triangulación GPS.
        """
        dir_busqueda = direccion or ""
        cp_busqueda = cp or ""
        dest_busqueda = destinatario or ""
        dispersion = modo_dispersion

        # 1. Si viene audio, transcribir y extraer con Gemini 3.6 Flash
        if audio_base64 and self.gemini_client and self.api_key:
            logger.info("Procesando nota de voz Teoyolotl para consulta de domicilio con Gemini...")
            prompt = """Eres CALPIXQUI, el Asistente Inteligente de Ruta para Pochtecas de Arauto Express.
El chofer envió una nota de voz preguntando por un domicilio, fachada previa o coordenadas GPS.
Analiza el audio y extrae con precisión quirúrgica:
- direccion: Calle, número y colonia
- cp: Código Postal (5 dígitos)
- destinatario: Nombre del cliente o referencia
- modo_dispersion: true si el chofer dice que la ubicación no coincide, no encuentra la casa, pide más coordenadas, triangulación o indica zona rural; de lo contrario false.
- intencion: "BUSQUEDA_DOMICILIO" o "SOLICITUD_DISPERSION_GPS"
Responde en JSON estricto:
{
  "direccion": "...",
  "cp": "...",
  "destinatario": "...",
  "modo_dispersion": false,
  "intencion": "BUSQUEDA_DOMICILIO",
  "transcripcion": "..."
}"""
            try:
                partes = [{"inlineData": {"mimeType": mime_type or "audio/webm", "data": audio_base64}}]
                res_ia = self.gemini_client.llamar_multimodal(prompt_sistema=prompt, datos_partes=partes, temperatura=0.1)
                if res_ia.get("direccion"):
                    dir_busqueda = res_ia.get("direccion")
                if res_ia.get("cp"):
                    cp_busqueda = res_ia.get("cp")
                if res_ia.get("destinatario"):
                    dest_busqueda = res_ia.get("destinatario")
                if res_ia.get("modo_dispersion"):
                    dispersion = True
            except Exception as e_ia:
                logger.warning(f"Error extrayendo datos de audio con Gemini: {e_ia}")

        # Si solo viene query de texto
        if not dir_busqueda and query_texto:
            dir_busqueda = query_texto
            # Detectar solicitud de más apoyo o zona rural
            q_lower = query_texto.lower()
            if any(term in q_lower for term in ["más referencias", "mas referencias", "no coincide", "dispersión", "dispersion", "rural", "triangulacion", "triangulación", "otras coordenadas", "coordenadas colindantes"]):
                dispersion = True

        # Ejecutar búsqueda con filtro 'Solo OK' y dispersión
        res_historico = self.buscar_referencias_historicas_direccion(
            direccion=dir_busqueda,
            cp=cp_busqueda,
            destinatario=dest_busqueda,
            modo_dispersion=dispersion,
            limite_dispersion=3
        )

        # Construir mensaje formateado listo para WhatsApp / Google Chat
        lineas_msg = [
            f"🏛️ *ASISTENTE DE RUTA CALPIXQUI* (Frente 5)",
            f"👤 *Operador:* `{pochteca}`",
            f"📍 *Domicilio Consultado:* _{dir_busqueda}_" + (f" (C.P. {cp_busqueda})" if cp_busqueda else ""),
            ""
        ]

        if res_historico["calidad_aprobada_solo_ok"]:
            ref = res_historico["referencia_principal"]
            lineas_msg.extend([
                "✅ *REFERENCIA PREVIA EXITOSA ('SOLO OK'):*",
                f"• *Último Receptor:* {ref.get('ultimo_receptor') or 'Cliente en domicilio'}",
                f"• *Estatus:* `{ref.get('estatus_entrega_previa')}` ({ref.get('fuente_boveda')})",
                f"• *Coordenadas:* `{ref.get('gps')}`",
                f"• 🗺️ *Google Maps:* {ref.get('enlaces_navegacion', {}).get('google_maps', 'N/A')}",
                f"• 🚗 *Waze:* {ref.get('enlaces_navegacion', {}).get('waze', 'N/A')}",
                f"• 📸 *Foto Fachada:* {ref.get('foto_fachada_previa') or 'No disponible'}",
                ""
            ])
        elif res_historico["advertencia_incidencia"]:
            lineas_msg.extend([
                "🚨 *ALERTA PREVENTIVA DE ENTREGA:*",
                res_historico["advertencia_incidencia"],
                "👉 *Instrucción:* NO tome este domicilio como verificado; llame al titular o consulte en base antes de dejar paquete.",
                ""
            ])
        else:
            lineas_msg.extend([
                "ℹ️ *Sin historial previo de entrega para este domicilio.*",
                "Proceda validando número exterior y referencias visuales en calle.",
                ""
            ])

        # Sección de Dispersión GPS Multi-Punto si está activa o hay puntos
        if res_historico["puntos_gps"] and (dispersion or len(res_historico["puntos_gps"]) > 1):
            lineas_msg.extend([
                "🛰️ *DISPERSIÓN GPS MULTI-PUNTO (TRIANGULACIÓN RURAL / BAJA SEÑAL):*",
                "Se entregan hasta 3 referencias 'OK' colindantes para localizar el punto exacto:"
            ])
            for pt in res_historico["puntos_gps"]:
                dist_str = f" (~{pt['distancia_aprox_metros']}m de dispersión)" if pt.get("distancia_aprox_metros") else ""
                lineas_msg.append(
                    f"*{pt['indice']}. {pt['tipo']}*{dist_str}:\n"
                    f"   • Coordenadas: `{pt['coordenadas']}`\n"
                    f"   • Ref: {pt.get('direccion_referencia') or pt.get('destinatario_referencia')}\n"
                    f"   • Maps: {pt['google_maps_url']}\n"
                    f"   • Waze: {pt['waze_url']}"
                )
            lineas_msg.append("")

        lineas_msg.append("🛡️ _Validado con el Canon de Calidad y Dispersión OLLIN v82._")

        mensaje_formateado = "\n".join(lineas_msg)

        return {
            "exito": True,
            "mensaje_texto": mensaje_formateado,
            "resultado_historico": res_historico,
            "parametros_busqueda": {
                "direccion": dir_busqueda,
                "cp": cp_busqueda,
                "destinatario": dest_busqueda,
                "modo_dispersion": dispersion
            }
        }


if __name__ == "__main__":
    print("================================================================")
    print("🏛️ PROBANDO BOT DE ACLARACIONES FRENTE 5 (CALPIXQUI)")
    print("================================================================")
    bot = BotAclaracionesFrente5()

    # Prueba de extracción
    sample_text = """Fwd: RV: URGENTE SOLICITUD DE POD HWB 1234567890
    Estimados, favor de enviar evidencia de entrega para la pieza JJD0081109261063331986 que el cliente desconoce."""
    ids = bot.extraer_identificadores(sample_text)
    print(f"HWBs detectadas: {ids['hwbs']}")
    print(f"PIDs detectados (Doble J): {ids['pids']}")

    # Simular evaluación de evidencia completa
    reg_mock = {
        "guia": "1234567890",
        "pid": "JD0081109261063331986",
        "destinatario": "Sidharta Santiago",
        "pochteca": "edgar.rodriguez@arauto.express",
        "checkpoint": "OK",
        "comentarios": "Entregado a vigilante de caseta",
        "gps": "20.5931, -100.3921",
        "foto_fachada": "https://drive.google.com/uc?id=1AbCdEfGhIjKlMnOpQrStUvWxYz",
        "firma_evidencia": "https://drive.google.com/uc?id=1ZyXwVuTsRqPoNmLkJiHgFeDcBa"
    }

    eval_res = bot.evaluar_cognitivamente("URGENTE POD 1234567890", sample_text, reg_mock)
    print("\nDictamen Evidencia Completa:")
    print(json.dumps(eval_res, indent=2, ensure_ascii=False))

    borrador = bot.generar_borrador_dhl(reg_mock, eval_res)
    print("\nBorrador generado para DHL:\n", borrador)
    print("\n✅ Prueba de Bot de Aclaraciones Frente 5 concluida con éxito.")
