"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: ENRUTADOR DE VISIÓN MULTIMODAL Y RECONOCIMIENTO DE GUÍAS WHATSAPP
ARCHIVO: calpixqui_vision_router.py
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)
VERSIÓN: 1.0.0 PROD (Plaza Querétaro & Sierra Gorda)
================================================================================

RESPONSABILIDADES:
1. Ingesta y validación de imágenes de WhatsApp (etiquetas físicas DHL / capturas).
2. Deduplicación e Idempotencia en memoria con hash SHA-256 (ventana de 15 min).
3. Extracción estructurada vía Gemini 3.6 Flash Multimodal (<2s de latencia).
4. Sanador Heurístico en RAM cruzando contra 'manifiesto_activo.json'.
5. Aplicación inviolable de la 'Ley de la Doble J' (JJD -> AppSheet, JD -> Bóveda).
6. Identificación del Pochteca emisor y detección de traspasos entre operadores.
================================================================================
"""

import os
import sys
import time
import json
import hashlib
import re
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger("CalpixquiVisionRouter")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")

# Ruta canónica hacia manifiesto_activo.json
RUTA_MANIFIESTO = (BASE_DIR.parent.parent / "Entrega_Masiva_PWA" / "manifiesto_activo.json").resolve()


# ==============================================================================
# 1. UTILIDADES Y LEY DE LA DOBLE J
# ==============================================================================

def sanitizar_pid_para_boveda(pid_raw: str) -> str:
    """
    Ley de la Doble J y Validación Defensiva de PIDs:
    - En calle / AppSheet: 'JJD...' (3 letras).
    - En BD / Bóveda / Facturación: 'JD...' (2 letras).
    - Si es numérico puro de longitud >= 10 dígitos, antepone 'JD'.
    - Rechaza PIDs vacíos o cadenas no válidas.
    """
    if not pid_raw:
        return ""
    pid_clean = str(pid_raw).strip().upper()
    if pid_clean.startswith("JJD"):
        cand = "JD" + pid_clean[3:]
        return cand if len(cand) >= 8 else ""
    if pid_clean.startswith("JD"):
        return pid_clean if len(pid_clean) >= 8 else ""
    if pid_clean.isdigit() and len(pid_clean) >= 8:
        return "JD" + pid_clean
    return ""


def formatear_pid_para_appsheet(pid_boveda: str) -> str:
    """
    Transforma 'JD...' de Bóveda a 'JJD...' para AppSheet.
    Si es numérico puro de longitud >= 10, antepone 'JJD' para blindar contra notación científica.
    """
    if not pid_boveda:
        return ""
    pid_clean = str(pid_boveda).strip().upper()
    if pid_clean.startswith("JJD"):
        return pid_clean
    if pid_clean.startswith("JD"):
        return "JJD" + pid_clean[2:]
    if pid_clean.isdigit() and len(pid_clean) >= 8:
        return "JJD" + pid_clean
    return pid_clean


def normalizar_telefono_10d(telefono: str) -> str:
    """Normaliza cualquier formato celular mexicano a exactamente 10 dígitos."""
    if not telefono:
        return ""
    digits = re.sub(r"\D", "", str(telefono))
    if digits.startswith("521") and len(digits) == 13:
        digits = digits[3:]
    elif digits.startswith("52") and len(digits) == 12:
        digits = digits[2:]
    elif len(digits) > 10:
        digits = digits[-10:]
    return digits


# ==============================================================================
# 2. CACHÉ DE IDEMPOTENCIA Y DEDUPLICACIÓN (BEST PRACTICE GITHUB >500 STARS)
# ==============================================================================

class CacheIdempotencia:
    """
    Evita procesamiento redundante o duplicado si el usuario reenvía la misma foto
    o si WhatsApp Web reintenta el evento. Ventana de expiración: 15 minutos.
    Soporta hashing diferenciado para imágenes y mensajes de solo texto.
    """
    def __init__(self, ttl_segundos: int = 900):
        self.ttl = ttl_segundos
        self.cache: Dict[str, Dict[str, Any]] = {}

    def _calcular_hash(self, image_base64: str, sender: str, caption: str = "") -> str:
        if image_base64:
            data_to_hash = f"{sender}_IMG_{len(image_base64)}_{image_base64[:100]}_{image_base64[-100:]}"
        else:
            data_to_hash = f"{sender}_TXT_{caption.strip()}"
        return hashlib.sha256(data_to_hash.encode("utf-8")).hexdigest()

    def obtener_si_existe(self, image_base64: str, sender: str, caption: str = "") -> Optional[Dict[str, Any]]:
        self.purgar_expirados()
        k = self._calcular_hash(image_base64, sender, caption)
        item = self.cache.get(k)
        if item:
            logger.info(f"⚡ Idempotencia activada: Solicitud duplicada detectada (Hash: {k[:8]}).")
            return item["resultado"]
        return None

    def registrar(self, image_base64: str, sender: str, resultado: Dict[str, Any], caption: str = ""):
        k = self._calcular_hash(image_base64, sender, caption)
        self.cache[k] = {
            "timestamp": time.time(),
            "resultado": resultado
        }

    def purgar_expirados(self):
        ahora = time.time()
        expirados = [k for k, v in self.cache.items() if ahora - v["timestamp"] > self.ttl]
        for k in expirados:
            del self.cache[k]



cache_idempotencia = CacheIdempotencia()


# ==============================================================================
# 3. SANADOR HEURÍSTICO EN RAM (CRUCE CONTRA MANIFIESTO ACTIVO)
# ==============================================================================

class SanadorHeuristicoManifiesto:
    """
    Carga en RAM el manifiesto activo y cura caracteres dudosos del OCR
    cruzando contra las guías y PIDs reales que llegaron en el andén.
    """
    def __init__(self):
        self.manifiesto_mtime = 0
        self.guias_lookup: Dict[str, Dict[str, Any]] = {}
        self.pids_lookup: Dict[str, Dict[str, Any]] = {}
        self._recargar_si_cambio()

    def _recargar_si_cambio(self):
        if not RUTA_MANIFIESTO.exists():
            return
        try:
            mtime = RUTA_MANIFIESTO.stat().st_mtime
            if mtime != self.manifiesto_mtime:
                with open(RUTA_MANIFIESTO, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                self.guias_lookup.clear()
                self.pids_lookup.clear()

                # Ingestar choferes del manifiesto
                choferes = data.get("choferes", {})
                for chofer_email, items in choferes.items():
                    for it in items:
                        hwb = str(it.get("hwb", "")).strip()
                        pid_boveda = sanitizar_pid_para_boveda(it.get("pid", ""))
                        pid_appsheet = formatear_pid_para_appsheet(it.get("pid_raw") or pid_boveda)

                        record = {
                            "hwb": hwb,
                            "pid_boveda": pid_boveda,
                            "pid_appsheet": pid_appsheet,
                            "chofer_actual": it.get("chofer", chofer_email),
                            "destinatario": it.get("destinatario", ""),
                            "direccion": it.get("direccion", ""),
                            "tel": it.get("tel", ""),
                            "edd": it.get("edd", ""),
                            "cp": self._extraer_cp_direccion(it.get("direccion", ""))
                        }

                        if hwb:
                            self.guias_lookup[hwb] = record
                        if pid_boveda:
                            self.pids_lookup[pid_boveda] = record

                self.manifiesto_mtime = mtime
                logger.info(f"Sanador Heurístico: Manifiesto cargado ({len(self.guias_lookup)} HWBs, {len(self.pids_lookup)} PIDs en RAM).")
        except Exception as ex:
            logger.error(f"Error cargando manifiesto en Sanador Heurístico: {ex}")

    def _extraer_cp_direccion(self, direccion: str) -> str:
        m = re.search(r"C\.?P\.?\s*(\d{5})", direccion, re.IGNORECASE)
        if m:
            return m.group(1)
        m2 = re.search(r"\b(\d{5})\b", direccion)
        return m2.group(1) if m2 else ""

    def buscar_y_sanar(self, hwb_candidato: str, pid_candidato: str) -> Optional[Dict[str, Any]]:
        """
        Busca primero por coincidencia exacta de HWB o PID.
        Si hay un dígito dudoso, evalúa coincidencias exactas en subcadenas o similitud.
        """
        self._recargar_si_cambio()

        hwb_clean = re.sub(r"\D", "", str(hwb_candidato or ""))
        pid_clean = sanitizar_pid_para_boveda(pid_candidato)

        # 1. Match Exacto por Guía HWB (10 dígitos)
        if hwb_clean and hwb_clean in self.guias_lookup:
            logger.info(f"✅ Sanador Heurístico: Coincidencia EXACTA por Guía HWB {hwb_clean}")
            return self.guias_lookup[hwb_clean]

        # 2. Match Exacto por PID (formato Bóveda)
        if pid_clean and pid_clean in self.pids_lookup:
            logger.info(f"✅ Sanador Heurístico: Coincidencia EXACTA por PID {pid_clean}")
            return self.pids_lookup[pid_clean]

        # 3. Match de rescate: HWB contenido en algún PID o viceversa
        if hwb_clean and len(hwb_clean) >= 9:
            for hwb_real, rec in self.guias_lookup.items():
                if hwb_clean in hwb_real or hwb_real in hwb_clean:
                    logger.info(f"✅ Sanador Heurístico: Rescate por subcadena HWB {hwb_clean} -> {hwb_real}")
                    return rec

        if pid_clean and len(pid_clean) >= 15:
            for pid_real, rec in self.pids_lookup.items():
                if pid_clean in pid_real or pid_real in pid_clean:
                    logger.info(f"✅ Sanador Heurístico: Rescate por subcadena PID {pid_clean} -> {pid_real}")
                    return rec

        return None


sanador_manifiesto = SanadorHeuristicoManifiesto()


# ==============================================================================
# 4. ORQUESTADOR DE VISIÓN MULTIMODAL CON GEMINI
# ==============================================================================

PROMPT_SISTEMA_OCR = """Eres el clasificador de visión logística de alta velocidad para Arauto Express (DHL Última Milla).
Tu misión es extraer con 100% de precisión los datos de entrega de la imagen (etiqueta de envío DHL Express física o captura de pantalla de sistema).

REGLAS ESTRICTAS DE EXTRACCIÓN:
1. 'hwb': Número de Guía AWB de DHL de exactamente 10 dígitos numéricos (ejemplo: '1133871690', '9165943113'). Si ves más de 10 dígitos, busca la sección 'WAYBILL' o 'AWB'.
2. 'pid': Código de barras o identificador de pieza (PIECE ID) de 20 caracteres aproximadamente, que suele iniciar con 'JJD...', 'JD...', o '014600...', '008110...'.
3. 'destinatario': Nombre de la persona o empresa que recibe el paquete.
4. 'direccion': Dirección física, colonia, municipio y código postal si están visibles.
5. 'cp': Código postal de 5 dígitos visible en la etiqueta.
6. 'tipo_documento': 'ETIQUETA_FISICA_DHL', 'CAPTURA_APPSHEET', 'CAPTURA_ECIS', o 'DESCONOCIDO'.
7. 'confianza': Valor flotante entre 0.0 y 1.0 indicando la claridad y legibilidad de la imagen.

RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO CON ESTA ESTRUCTURA:
{
  "hwb": "10 dígitos numéricos o null",
  "pid": "PID alfanumérico o null",
  "destinatario": "Nombre o null",
  "direccion": "Dirección completa o null",
  "cp": "5 dígitos o null",
  "tipo_documento": "ETIQUETA_FISICA_DHL",
  "confianza": 0.98,
  "observaciones": "Etiqueta térmica nítida"
}
"""

class CalpixquiVisionRouter:
    """
    Enrutador principal de Visión Multimodal.
    Recibe la imagen desde Node.js, ejecuta Gemini, sana con el manifiesto
    y empaqueta la decisión operativa para el asignador dual.
    """
    def __init__(self, gemini_client=None, pochtecas_manager=None, matriz_cp_manager=None):
        self.gemini_client = gemini_client
        self.pochtecas_mgr = pochtecas_manager
        self.matriz_cp_mgr = matriz_cp_manager

    def procesar_imagen_whatsapp(
        self,
        image_base64: str,
        mimetype: str,
        sender_phone: str,
        chat_id: str,
        is_group: bool,
        caption: str = ""
    ) -> Dict[str, Any]:
        """
        Proceso integral de visión:
        1. Comprueba idempotencia.
        2. Identifica al Pochteca emisor.
        3. Extrae datos con Gemini Multimodal.
        4. Sana y completa con Manifiesto en RAM.
        5. Aplica la Ley de la Doble J.
        6. Determina si es traspaso entre operadores.
        """
        tel_norm = normalizar_telefono_10d(sender_phone)

        # 1. Chequeo de Idempotencia
        duplicado = cache_idempotencia.obtener_si_existe(image_base64, tel_norm, caption)
        if duplicado:
            duplicado_res = dict(duplicado)
            duplicado_res["es_duplicado_reciente"] = True
            return duplicado_res

        # 2. Identificar Pochteca en Directorio Central
        info_pochteca = self._obtener_info_pochteca(tel_norm)

        # 3. Llamada Multimodal a Gemini (o extracción directa de caption si viene texto)
        datos_ocr = {}
        if image_base64:
            datos_ocr = self._extraer_con_gemini(image_base64, mimetype, caption)

        hwb_extraido = datos_ocr.get("hwb") or ""
        pid_extraido = datos_ocr.get("pid") or ""

        # Fallback resiliente: Si no hubo OCR o falló, buscar 10 dígitos o PID directamente en el caption/texto
        if not hwb_extraido and caption:
            match_hwb = re.search(r"\b(\d{10})\b", caption)
            if match_hwb:
                hwb_extraido = match_hwb.group(1)
            match_pid = re.search(r"\b(J?JD\w{15,22}|\d{15,22})\b", caption, re.I)
            if match_pid:
                pid_extraido = match_pid.group(1).upper()

        # 4. Sanador Heurístico contra Manifiesto Activo
        coincidencia_manifiesto = sanador_manifiesto.buscar_y_sanar(hwb_extraido, pid_extraido)

        if coincidencia_manifiesto:
            hwb_final = coincidencia_manifiesto["hwb"]
            pid_boveda = coincidencia_manifiesto["pid_boveda"]
            pid_appsheet = coincidencia_manifiesto["pid_appsheet"]
            destinatario_final = coincidencia_manifiesto["destinatario"] or datos_ocr.get("destinatario", "")
            direccion_final = coincidencia_manifiesto["direccion"] or datos_ocr.get("direccion", "")
            cp_final = coincidencia_manifiesto["cp"] or datos_ocr.get("cp", "")
            chofer_anterior = coincidencia_manifiesto.get("chofer_actual", "")
            origen_datos = "MANIFIESTO_CONCILIADO"
        else:
            hwb_final = re.sub(r"\D", "", str(hwb_extraido))
            pid_boveda = sanitizar_pid_para_boveda(pid_extraido)
            pid_appsheet = formatear_pid_para_appsheet(pid_boveda)
            destinatario_final = datos_ocr.get("destinatario", "")
            direccion_final = datos_ocr.get("direccion", "")
            cp_final = datos_ocr.get("cp", "")
            chofer_anterior = ""
            origen_datos = "OCR_GEMINI_DIRECTO"

        # Validar si se obtuvo una guía o PID utilizable
        if not hwb_final and not pid_boveda:
            resultado_error = {
                "exito": False,
                "motivo": "NO_SE_DETECTO_GUIA_O_PID",
                "mensaje_usuario": "⚠️ No pudimos detectar un número de Guía (10 dígitos) o PID legible en la imagen. Por favor toma una foto más clara o escribe el número de guía.",
                "remitente_telefono": tel_norm,
                "info_pochteca": info_pochteca,
                "is_group": is_group,
                "chat_id": chat_id
            }
            return resultado_error

        # 5. Detección de Traspaso / Reasignación Ágil
        nuevo_chofer_email = info_pochteca.get("correo", "")
        es_traspaso = False
        if chofer_anterior and nuevo_chofer_email and chofer_anterior.lower() != nuevo_chofer_email.lower():
            es_traspaso = True

        # 6. Resolución de Zona / Matriz CP si tenemos CP
        datos_zona = {}
        if self.matriz_cp_mgr and cp_final:
            datos_zona = self.matriz_cp_mgr.resolver_asignacion(cp=cp_final)

        resultado = {
            "exito": True,
            "hwb": hwb_final,
            "pid_boveda": pid_boveda,
            "pid_appsheet": pid_appsheet,
            "destinatario": destinatario_final,
            "direccion": direccion_final,
            "cp": cp_final,
            "origen_datos": origen_datos,
            "confianza_ia": datos_ocr.get("confianza", 0.9),
            "es_traspaso": es_traspaso,
            "chofer_anterior": chofer_anterior,
            "nuevo_chofer_email": nuevo_chofer_email,
            "nuevo_chofer_nombre": info_pochteca.get("nombre", "Operador"),
            "info_pochteca": info_pochteca,
            "datos_zona": datos_zona,
            "is_group": is_group,
            "chat_id": chat_id,
            "timestamp": datetime.now().isoformat()
        }

        # Guardar en caché de idempotencia
        cache_idempotencia.registrar(image_base64, tel_norm, resultado, caption)
        return resultado

    def _obtener_info_pochteca(self, telefono_10d: str) -> Dict[str, Any]:
        """Consulta el directorio local de Pochtecas por teléfono."""
        if not self.pochtecas_mgr:
            return {"correo": "", "nombre": "Pochteca", "zona_asignada": "QRO", "supervisor": ""}

        directorio = getattr(self.pochtecas_mgr, "directorio", {})
        for correo, d in directorio.items():
            tel = normalizar_telefono_10d(d.get("telefono", ""))
            if tel and (tel == telefono_10d or tel.endswith(telefono_10d) or telefono_10d.endswith(tel)):
                return d

        return {
            "correo": f"pochteca.{telefono_10d}@arauto.express",
            "nombre": f"Operador ({telefono_10d[-4:]})",
            "zona_asignada": "QRO Metropolitano",
            "supervisor": "irvinreyes.dhl@gmail.com"
        }

    def _extraer_con_gemini(self, image_base64: str, mimetype: str, caption: str) -> Dict[str, Any]:
        """Invoca Gemini 3.6 Flash Multimodal con fallback tolerante."""
        if not self.gemini_client:
            logger.warning("Gemini Client no provisto en CalpixquiVisionRouter. Retornando mock vacío.")
            return {}

        prompt_usuario = "Extrae los datos de esta guía logística."
        if caption:
            prompt_usuario += f" Mensaje del chofer: '{caption}'"

        datos_partes = [
            {"text": prompt_usuario},
            {
                "inline_data": {
                    "mime_type": mimetype or "image/jpeg",
                    "data": image_base64
                }
            }
        ]

        try:
            resp = self.gemini_client.llamar_multimodal(
                prompt_sistema=PROMPT_SISTEMA_OCR,
                datos_partes=datos_partes,
                temperatura=0.1
            )
            if isinstance(resp, dict) and "estatus" not in resp:
                return resp
            return resp.get("datos", {}) if isinstance(resp, dict) else {}
        except Exception as ex:
            logger.error(f"Fallo en llamada multimodal a Gemini: {ex}")
            return {}
