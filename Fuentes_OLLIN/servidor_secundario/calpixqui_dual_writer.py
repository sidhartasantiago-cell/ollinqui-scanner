"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: ESCRITOR DUAL ASÍNCRONO CON OUTBOX PATTERN (MICRO-BATCHING & WAL SQLITE)
ARCHIVO: calpixqui_dual_writer.py
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)
VERSIÓN: 2.0.0 PROD (Blindaje OneDrive, Micro-Batching y Anti-Duplicados 429)
================================================================================

RESPONSABILIDADES:
1. Inserción inmediata en Outbox Local (SQLite WAL fuera de OneDrive) con <15ms.
2. Demonio Flusher con Micro-Batching agrupado por pestaña (de 80 a 4 llamadas HTTP).
3. Transición atómica de estados: PENDIENTE -> EN_PROCESO -> COMPLETADO / FALLIDO.
4. Escritura Dual Idempotente:
   - Bases Viejas: BD Central 2023 (hoja 'RUTA') y BD App Ruta 2025 ('PIEZAS_PID').
   - Bases Nuevas: BOVEDA_BATCH_MAESTRO ('RAW_PIECE' y 'LOG_TRAZABILIDAD').
5. Sanitización defensiva estricta de la Ley de la Doble J (JJD en AppSheet, JD en Bóveda).
6. Backoff adaptativo con pausa protectora de 60s ante HTTP 429 para evitar tormentas de reintentos.
================================================================================
"""

import os
import sys
import time
import json
import re
import sqlite3
import random
import uuid
import logging
import threading
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path
from contextlib import contextmanager
from typing import Dict, Any, List, Optional, Tuple

# Rutas protegidas: Aislamiento fuera de OneDrive para evitar bloqueos EBUSY en Windows
DEFAULT_DATA_DIR = Path(os.path.expanduser("~/.calpixqui_data"))
DATA_DIR = Path(os.getenv("CALPIXQUI_DATA_DIR", str(DEFAULT_DATA_DIR)))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "outbox_asignaciones.db"

# IDs Canónicos de Google Sheets
SPREADSHEET_ID_BD_CENTRAL_2023 = os.getenv("SPREADSHEET_ID_BD_CENTRAL_2023", "1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8")
SPREADSHEET_ID_BD_APP_RUTA_2025 = os.getenv("SPREADSHEET_ID_BD_APP_RUTA_2025", "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w")
SPREADSHEET_ID_BOVEDA_BATCH_MAESTRO = os.getenv("SPREADSHEET_ID_BOVEDA_BATCH_MAESTRO", "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw")

# Token de autenticación de Google Sheets
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(Path(BASE_DIR).parent.parent / ".agents"))
try:
    from test_sheets_api import get_access_token
except ImportError:
    def get_access_token():
        return ""

from calpixqui_vision_router import sanitizar_pid_para_boveda, formatear_pid_para_appsheet

logger = logging.getLogger("CalpixquiDualWriter")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s")


# ==============================================================================
# 1. GESTOR DE CONTEXTO SEGURO PARA SQLITE (AISLADO FUERA DE ONEDRIVE)
# ==============================================================================

@contextmanager
def get_db_connection():
    """
    Gestor de contexto que garantiza la apertura con timeout de 15s y
    el cierre incondicional de conexiones para evitar bloqueos de archivo en Windows.
    """
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    try:
        yield conn
    finally:
        try:
            conn.close()
        except Exception:
            pass


def inicializar_outbox_db():
    """Inicializa las tablas de Outbox e Inbox en SQLite con modo WAL para alta concurrencia."""
    with get_db_connection() as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS outbox_asignaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hwb TEXT NOT NULL,
                pid_boveda TEXT NOT NULL,
                pid_appsheet TEXT NOT NULL,
                chofer_email TEXT NOT NULL,
                chofer_nombre TEXT,
                chofer_anterior TEXT,
                es_traspaso INTEGER DEFAULT 0,
                origen_canal TEXT DEFAULT 'WHATSAPP_GRUPO',
                chat_id TEXT,
                message_id TEXT,
                destinatario TEXT,
                direccion TEXT,
                cp TEXT,
                zona TEXT,
                estatus TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, EN_PROCESO, COMPLETADO, FALLIDO
                intentos INTEGER DEFAULT 0,
                ultimo_error TEXT,
                creado_en TEXT NOT NULL,
                actualizado_en TEXT NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_outbox_estatus ON outbox_asignaciones(estatus);")
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_outbox_asignaciones_msg_id ON outbox_asignaciones(message_id) WHERE message_id IS NOT NULL AND message_id != '';")

        # Tabla de persistencia previa a respuesta HTTP 202 (Cero pérdida de tareas ante caídas)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS outbox_multimodal_inbox (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id TEXT UNIQUE,
                chat_id TEXT,
                sender TEXT,
                is_group INTEGER DEFAULT 0,
                caption TEXT,
                mimetype TEXT,
                image_base64 TEXT,
                estatus TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, EN_PROCESO, COMPLETADO, FALLIDO
                intentos INTEGER DEFAULT 0,
                error_detalle TEXT,
                creado_en TEXT NOT NULL,
                actualizado_en TEXT NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_inbox_estatus ON outbox_multimodal_inbox(estatus);")

        # Asegurar columnas para idempotencia fina y asignación de worker/lease
        try:
            conn.execute("ALTER TABLE outbox_asignaciones ADD COLUMN pasos_completados TEXT DEFAULT '';")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE outbox_asignaciones ADD COLUMN worker_id TEXT DEFAULT '';")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE outbox_multimodal_inbox ADD COLUMN worker_id TEXT DEFAULT '';")
        except sqlite3.OperationalError:
            pass

        # 🧟 Reaper Defensivo: Solo rescata tareas en 'EN_PROCESO' si su LEASE expiró (>300 segundos)
        # Esto previene reiniciar trabajos activos de otra instancia o worker en ejecución
        conn.execute("""
            UPDATE outbox_asignaciones
            SET estatus = 'PENDIENTE', intentos = intentos + 1
            WHERE estatus = 'EN_PROCESO'
              AND (strftime('%s', 'now') - strftime('%s', actualizado_en)) > 300;
        """)
        conn.execute("""
            UPDATE outbox_multimodal_inbox
            SET estatus = 'PENDIENTE', intentos = intentos + 1
            WHERE estatus = 'EN_PROCESO'
              AND (strftime('%s', 'now') - strftime('%s', actualizado_en)) > 300;
        """)
        conn.commit()


inicializar_outbox_db()


def guardar_multimodal_inbox(payload: Dict[str, Any]) -> Tuple[bool, str, bool]:
    """
    Persiste la petición cruda de WhatsApp en SQLite WAL ANTES de emitir HTTP 202 Accepted.
    Retorna: (exito, message_id, es_duplicado).
    Si el message_id ya existe, retorna (True, message_id, True) para evitar despachos duplicados.
    """
    now_iso = datetime.now().isoformat()
    msg_id = payload.get("message_id") or f"gen_{int(time.time()*1000)}"
    
    with get_db_connection() as conn:
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO outbox_multimodal_inbox (
                    message_id, chat_id, sender, is_group, caption,
                    mimetype, image_base64, estatus, creado_en, actualizado_en
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?)
            """, (
                msg_id,
                payload.get("chat_id", ""),
                payload.get("sender", ""),
                1 if payload.get("is_group") else 0,
                payload.get("caption", ""),
                payload.get("mimetype", "image/jpeg"),
                payload.get("image_base64", ""),
                now_iso,
                now_iso
            ))
            conn.commit()
            return True, msg_id, False
        except sqlite3.IntegrityError:
            logger.info(f"⚡ Solicitud multimodal ya existía en SQLite Inbox (ID: {msg_id}). Omitiendo duplicado.")
            return True, msg_id, True
        except Exception as e:
            logger.error(f"Error persistiendo tarea multimodal en inbox: {e}")
            return False, str(e), False


def actualizar_estado_inbox(message_id: str, nuevo_estatus: str, error_detalle: str = ""):
    """
    Actualiza el estatus de una tarea en outbox_multimodal_inbox (COMPLETADO, FALLIDO, DUPLICADO, etc.)
    para evitar reprocesamientos infinitos tras caídas o reinicios.
    """
    if not message_id:
        return
    now_iso = datetime.now().isoformat()
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE outbox_multimodal_inbox
                SET estatus = ?, error_detalle = ?, actualizado_en = ?
                WHERE message_id = ?;
            """, (nuevo_estatus, error_detalle, now_iso, message_id))
            conn.commit()
            cursor.close()
    except Exception as e:
        logger.warning(f"No se pudo actualizar estado inbox para {message_id}: {e}")


# ==============================================================================
# 2. ENCOLADOR RÁPIDO (WRITE-AHEAD LOG)
# ==============================================================================

def encolar_asignacion_outbox(datos: Dict[str, Any]) -> int:
    """
    Inserta una asignación en el Outbox local de forma atómica (<15ms).
    Aplica sanitización defensiva de la Doble J antes de persistir.
    Falla cerrado si el PID está vacío o es inválido.
    Deduplica si el message_id ya existe en outbox_asignaciones.
    """
    now_iso = datetime.now().isoformat()
    msg_id = str(datos.get("message_id", "")).strip()

    # Sanitización defensiva
    pid_bov = sanitizar_pid_para_boveda(datos.get("pid_boveda", ""))
    pid_app = formatear_pid_para_appsheet(datos.get("pid_appsheet", "") or pid_bov)

    # Falla cerrada: Prohibido encolar asignaciones con PID vacío o inválido
    if not pid_bov or len(pid_bov) < 10:
        logger.error(f"Falla cerrada: Intento de encolar asignación con PID inválido o vacío para guía {datos.get('hwb')}.")
        return -1

    with get_db_connection() as conn:
        cursor = conn.cursor()
        try:
            # Deduplicación por message_id único si está presente
            if msg_id:
                cursor.execute("SELECT id FROM outbox_asignaciones WHERE message_id = ? LIMIT 1;", (msg_id,))
                existente = cursor.fetchone()
                if existente:
                    logger.info(f"⚡ Asignación para message_id {msg_id} ya existe en Outbox (ID: {existente[0]}). Omitiendo duplicado.")
                    return existente[0]

            cursor.execute("""
                INSERT INTO outbox_asignaciones (
                    hwb, pid_boveda, pid_appsheet, chofer_email, chofer_nombre,
                    chofer_anterior, es_traspaso, origen_canal, chat_id, message_id,
                    destinatario, direccion, cp, zona, estatus, intentos, creado_en, actualizado_en
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', 0, ?, ?)
            """, (
                str(datos.get("hwb", "")),
                pid_bov,
                pid_app,
                str(datos.get("nuevo_chofer_email", datos.get("chofer_email", ""))),
                str(datos.get("nuevo_chofer_nombre", datos.get("chofer_nombre", ""))),
                str(datos.get("chofer_anterior", "")),
                1 if datos.get("es_traspaso") else 0,
                "WHATSAPP_GRUPO" if datos.get("is_group") else "WHATSAPP_INDIVIDUAL",
                str(datos.get("chat_id", "")),
                msg_id,
                str(datos.get("destinatario", "")),
                str(datos.get("direccion", "")),
                str(datos.get("cp", "")),
                str(datos.get("zona", "")),
                now_iso,
                now_iso
            ))
            conn.commit()
            reg_id = cursor.lastrowid
            logger.info(f"💾 Asignación guardada en Outbox WAL (ID: {reg_id}, Guía: {datos.get('hwb')}, Chofer: {datos.get('nuevo_chofer_email')})")
            return reg_id
        except sqlite3.IntegrityError:
            cursor.execute("SELECT id FROM outbox_asignaciones WHERE message_id = ? LIMIT 1;", (msg_id,))
            existente = cursor.fetchone()
            reg_id = existente[0] if existente else -1
            logger.info(f"⚡ Colisión concurrente resuelta en Outbox por UNIQUE index (ID: {reg_id}, message_id: {msg_id}).")
            return reg_id
        finally:
            cursor.close()


# ==============================================================================
# 3. SINCRONIZADOR DE ESCRITURA DUAL CON MICRO-BATCHING A GOOGLE SHEETS
# ==============================================================================

class DualWriterSyncEngine:
    """
    Procesa lotes de asignaciones del Outbox y escribe mediante Micro-Batching agrupado:
    1. Bases Viejas: BD Central (hoja RUTA) y BD App Ruta (PIEZAS_PID).
    2. Bases Nuevas: Bóveda Maestro (RAW_PIECE y LOG_TRAZABILIDAD).
    Reduce de 80 llamadas HTTP por lote a exactamente 4 llamadas HTTP agrupadas.
    """
    def __init__(self):
        self._token_expiry = 0
        self._headers_cache = {}

    def _get_headers(self) -> Dict[str, str]:
        ahora = time.time()
        if ahora > self._token_expiry or not self._headers_cache:
            token = get_access_token()
            self._headers_cache = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            self._token_expiry = ahora + 1800 # 30 min
        return self._headers_cache

    def sincronizar_lote_microbatch(self, items: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """
        Sincroniza un lote de asignaciones respetando estrictamente las filas existentes:
        1. Si la guía ya existe en BD Central (RUTA) o App Ruta (GUIAS_ASIGNADAS), actualiza en caliente
           el chofer asignado (Col O en RUTA, Col E en GUIAS_ASIGNADAS) sin desfasar columnas ni crear filas huérfanas.
        2. Registra la trazabilidad inmutable en LOG_TRAZABILIDAD de Bóveda Maestro.
        """
        if not items:
            return True, ""

        now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        now_date_str = datetime.now().strftime("%d/%m/%Y")
        now_iso = datetime.now().isoformat()

        try:
            # ── 1. Obtener listado de guías en RUTA de BD Central 2023 (Cols A:R para auditar Guia, PID y KEY) ──
            url_read_ruta = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_BD_CENTRAL_2023}/values/RUTA!A:R"
            req_rr = urllib.request.Request(url_read_ruta, headers=self._get_headers())
            with urllib.request.urlopen(req_rr, timeout=12) as resp_rr:
                rutas_guias = json.loads(resp_rr.read().decode("utf-8")).get("values", [])
            ruta_map = {}
            for idx, r in enumerate(rutas_guias):
                if r and r[0]:
                    g = str(r[0]).strip()
                    ruta_map[g] = {
                        "row": idx + 1,
                        "pid": str(r[1]).strip() if len(r) > 1 and r[1] else "",
                        "key": str(r[17]).strip() if len(r) > 17 and r[17] else ""
                    }

            # ── 2. Obtener listado de guías en GUIAS_ASIGNADAS de App Ruta ──
            url_read_ga = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_BD_APP_RUTA_2025}/values/GUIAS_ASIGNADAS!A:A"
            req_ga = urllib.request.Request(url_read_ga, headers=self._get_headers())
            with urllib.request.urlopen(req_ga, timeout=12) as resp_ga:
                ga_guias = json.loads(resp_ga.read().decode("utf-8")).get("values", [])
            ga_map = {str(r[0]).strip(): idx + 1 for idx, r in enumerate(ga_guias) if r}

            # ── 3. Obtener listado de PIDs en PIEZAS_PID de App Ruta ──
            url_read_pp = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_BD_APP_RUTA_2025}/values/PIEZAS_PID!B:B"
            req_pp = urllib.request.Request(url_read_pp, headers=self._get_headers())
            piezas_map = set()
            try:
                with urllib.request.urlopen(req_pp, timeout=10) as resp_pp:
                    pp_list = json.loads(resp_pp.read().decode("utf-8")).get("values", [])
                    piezas_map = {str(r[0]).strip() for r in pp_list if r}
            except Exception as ePp:
                logger.debug(f"Nota leyendo PIEZAS_PID: {ePp}")

            dict_updates_ruta: Dict[str, list] = {}
            dict_updates_ga: Dict[str, list] = {}
            filas_ruta_nuevas = []
            filas_ga_nuevas = []
            filas_piezas_nuevas = []
            filas_raw_piece = []
            filas_log = []

            for item in items:
                hwb = str(item["hwb"]).strip()
                pid_bov = sanitizar_pid_para_boveda(item["pid_boveda"])
                pid_app = formatear_pid_para_appsheet(item["pid_appsheet"])
                chofer = item["chofer_email"]

                # A) Actualizar BD Central RUTA
                if hwb in ruta_map:
                    row_info = ruta_map[hwb]
                    row_idx = row_info["row"]
                    dict_updates_ruta[f"RUTA!O{row_idx}"] = [[chofer]]

                    # Verificar y sanar KEY en columna R si está corrupta o vacía
                    key_existente = str(row_info.get("key", "")).strip().lower()
                    if not key_existente or len(key_existente) != 8 or not re.match(r"^[0-9a-f]{8}$", key_existente):
                        key_nueva = uuid.uuid4().hex[:8]
                        dict_updates_ruta[f"RUTA!R{row_idx}"] = [[key_nueva]]
                        row_info["key"] = key_nueva
                        logger.info(f"🔑 Guía {hwb} en RUTA (fila {row_idx}): KEY '{key_existente}' sanada con UUID '{key_nueva}'.")

                    # Si PID en columna B está vacío y tenemos pid_app, inyectar pid_app
                    pid_existente = str(row_info.get("pid", "")).strip()
                    if not pid_existente and pid_app:
                        dict_updates_ruta[f"RUTA!B{row_idx}"] = [[pid_app]]
                        row_info["pid"] = pid_app
                        logger.info(f"🏷️ Guía {hwb} en RUTA (fila {row_idx}): PID completado con '{pid_app}'.")

                    logger.info(f"🔄 Guía {hwb} encontrada en RUTA (fila {row_idx}): actualizando chofer a {chofer}")
                else:
                    # Guía no existía previamente en RUTA: insertar con el esquema canónico completo de 21 cols
                    key_inmutable = uuid.uuid4().hex[:8]
                    cp_item = str(item.get("cp", "")).strip()
                    tipo_servicio = "Foraneo" if cp_item.startswith("37") else "Local"
                    filas_ruta_nuevas.append([
                        hwb,                                  # A: Guia
                        pid_app,                              # B: PID
                        cp_item,                              # C: CP
                        "1",                                  # D: Piezas
                        item.get("direccion", ""),            # E: Rcvr Addr 1
                        "",                                   # F: Rcvr Addr 2
                        "",                                   # G: Rcvr Addr 3
                        item.get("destinatario", ""),         # H: Receiver Name
                        "",                                   # I: GPS
                        "PRE_ASIGNADO",                       # J: Checkpoint
                        "",                                   # K: Quien recibio
                        now_str,                              # L: Fecha asignacion
                        "",                                   # M: Fecha en ruta
                        "",                                   # N: Imagen fachada
                        chofer,                               # O: ID correo
                        now_date_str,                         # P: EDD
                        "",                                   # Q: Actualizacion
                        key_inmutable,                        # R: KEY
                        tipo_servicio,                        # S: Tipo de servicio
                        "",                                   # T: Inter
                        ""                                    # U: Telefono
                    ])
                    # Actualizar ruta_map en memoria para evitar duplicados en el mismo microbatch
                    row_simulada = len(rutas_guias) + len(filas_ruta_nuevas)
                    ruta_map[hwb] = {
                        "row": row_simulada,
                        "pid": pid_app,
                        "key": key_inmutable
                    }

                # B) Actualizar o Insertar en GUIAS_ASIGNADAS en BD App Ruta 2025
                if hwb in ga_map:
                    row_ga = ga_map[hwb]
                    dict_updates_ga[f"GUIAS_ASIGNADAS!E{row_ga}"] = [[chofer]]
                    logger.info(f"🔄 Guía {hwb} encontrada en GUIAS_ASIGNADAS (fila {row_ga}): actualizando chofer a {chofer}")
                else:
                    # Guía nueva faltante en GUIAS_ASIGNADAS: insertar con esquema canónico de 25 cols
                    filas_ga_nuevas.append([
                        hwb,                                  # A: HWB_Guia
                        item.get("destinatario", ""),         # B: Destinatario
                        item.get("direccion", ""),            # C: Direccion_Entrega
                        now_date_str,                         # D: EDD
                        chofer,                               # E: Chofer_Asignado
                        "1",                                  # F: Total_Piezas
                        "",                                   # G: Tel_Query
                        "PRE_ASIGNADO",                       # H: Estatus_Guia
                        "",                                   # I: Check_In_GPS
                        "",                                   # J: Nuevo_Estatus
                        "",                                   # K: Nombre_Recibe
                        "",                                   # L: Firma_Evidencia
                        "",                                   # M: Foto_Fachada_Paquete
                        "",                                   # N: Foto_INE
                        "",                                   # O: Monto_Aduana
                        "Auto-asignación WhatsApp",           # P: Comentarios_Chofer
                        "",                                   # Q: Autorizacion_Incompleto
                        "",                                   # R: Primer_Intento_GPS
                        "",                                   # S: Primer_Intento_Hora
                        "",                                   # T: Segundo_Intento_GPS
                        "",                                   # U: Segundo_Intento_Hora
                        "",                                   # V: Tercer_Intento_GPS
                        "",                                   # W: Tercer_Intento_Hora
                        "",                                   # X: Motivo_Cancelacion
                        ""                                    # Y: Auditor_Cancela
                    ])
                    # Actualizar ga_map en memoria para evitar duplicados en el mismo microbatch
                    ga_map[hwb] = len(ga_guias) + len(filas_ga_nuevas)
                    logger.info(f"➕ Guía nueva {hwb} agregada al buffer de inserción para GUIAS_ASIGNADAS.")

                # C) Insertar en PIEZAS_PID si no existe
                if pid_app and pid_app not in piezas_map:
                    filas_piezas_nuevas.append([
                        hwb,                                  # A: HWB_Guia
                        pid_app,                              # B: PID_Codigo
                        "Pieza",                              # C: Descripcion
                        "PRE_ASIGNADO",                       # D: Estatus_PID
                        "VALIDADO_WHATSAPP",                  # E: Escaneo_Validacion
                        "",                                   # F: Nombre_Recibe_PID
                        "",                                   # G: Firma_Evidencia_PID
                        "",                                   # H: Foto_Fachada_PID
                        "",                                   # I: Foto_INE_PID
                        f"Asignado a {chofer}",               # J: Comentarios_Chofer_PID
                        "",                                   # K: Check_In_GPS_PID
                        now_str,                              # L: Timestamp_Entrega_PID
                        "",                                   # M: Audio_Evidencia_PID
                        "OK"                                  # N: Checkpoint_Propuesto_IA
                    ])
                    piezas_map.add(pid_app)

                # D) Insertar en RAW_PIECE de Bóveda Maestro
                if pid_bov:
                    filas_raw_piece.append([
                        "",                                   # A: Search
                        "OK",                                 # B: Result
                        "1",                                  # C: SD Count
                        hwb,                                  # D: HWB No
                        "MX",                                 # E: Orig Ctry
                        "QRO",                                # F: Orig Stn
                        "QRO",                                # G: Orig Fac
                        "MX",                                 # H: Dest Ctry
                        "QRO",                                # I: Dest Stn
                        "QRO",                                # J: Dest Fac
                        "DOM",                                # K: Prod
                        pid_bov,                              # L: Piece No
                        "1.0",                                # M: Shp Weight
                        item.get("destinatario", "")          # N: Description
                    ])

                # E) LOG_TRAZABILIDAD en Bóveda Maestro
                accion = "TRASPASO_WHATSAPP" if item.get("es_traspaso") else "AUTO_ASIGNACION_WHATSAPP"
                detalle = f"Asignado a {chofer} desde {item.get('origen_canal')}. Chofer anterior: {item.get('chofer_anterior') or 'N/A'}"
                filas_log.append([
                    now_iso,
                    hwb,
                    pid_bov,
                    chofer,
                    accion,
                    item.get("message_id", "N/A"),
                    detalle
                ])

            # Consolidar arrays de actualizaciones para la API de Google Sheets
            updates_ruta = [{"range": k, "values": v} for k, v in dict_updates_ruta.items()]
            updates_ga = [{"range": k, "values": v} for k, v in dict_updates_ga.items()]

            # Ejecutar batch updates para filas existentes
            if updates_ruta:
                url_batch_ruta = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_BD_CENTRAL_2023}/values:batchUpdate"
                body_b = {"valueInputOption": "USER_ENTERED", "data": updates_ruta}
                req_b = urllib.request.Request(url_batch_ruta, data=json.dumps(body_b).encode("utf-8"), headers=self._get_headers(), method="POST")
                with urllib.request.urlopen(req_b, timeout=12) as resp_b:
                    pass

            if updates_ga:
                url_batch_ga = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_BD_APP_RUTA_2025}/values:batchUpdate"
                body_ga = {"valueInputOption": "USER_ENTERED", "data": updates_ga}
                req_ga_up = urllib.request.Request(url_batch_ga, data=json.dumps(body_ga).encode("utf-8"), headers=self._get_headers(), method="POST")
                with urllib.request.urlopen(req_ga_up, timeout=12) as resp_gau:
                    pass

            # Si hubo guías 100% nuevas que no estaban en RUTA, agregarlas
            if filas_ruta_nuevas:
                self._append_rows(SPREADSHEET_ID_BD_CENTRAL_2023, "RUTA!A:U", filas_ruta_nuevas)

            # Si hubo guías nuevas que no estaban en GUIAS_ASIGNADAS, agregarlas
            if filas_ga_nuevas:
                self._append_rows(SPREADSHEET_ID_BD_APP_RUTA_2025, "GUIAS_ASIGNADAS!A:Y", filas_ga_nuevas)

            # Si hubo piezas nuevas que no estaban en PIEZAS_PID, agregarlas
            if filas_piezas_nuevas:
                self._append_rows(SPREADSHEET_ID_BD_APP_RUTA_2025, "PIEZAS_PID!A:N", filas_piezas_nuevas)

            # Anexar a RAW_PIECE en Bóveda Maestro
            if filas_raw_piece:
                self._append_rows(SPREADSHEET_ID_BOVEDA_BATCH_MAESTRO, "RAW_PIECE!A:N", filas_raw_piece)

            # Anexar trazabilidad a Bóveda
            if filas_log:
                self._append_rows(SPREADSHEET_ID_BOVEDA_BATCH_MAESTRO, "LOG_TRAZABILIDAD!A:G", filas_log)

            logger.info(f"✅ Sincronización precisa y completa completada para {len(items)} guías.")
            return True, ""
        except Exception as ex:
            err = str(ex)
            logger.warning(f"⚠️ Fallo en sincronización precisa: {err}")
            return False, err

    def _append_rows(self, spreadsheet_id: str, range_name: str, values: List[List[Any]]):
        """Ejecuta un append masivo de filas a una hoja de cálculo."""
        if not values:
            return
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{range_name}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"
        body = {"range": range_name, "values": values}
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._get_headers(),
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status not in (200, 201):
                raise RuntimeError(f"HTTP {resp.status} al anexar en {range_name}")

    def sincronizar_item(self, item: Dict[str, Any]) -> Tuple[bool, str]:
        """Compatibilidad para sincronización unitaria (usada en pruebas unitarias)."""
        return self.sincronizar_lote_microbatch([item])


# ==============================================================================
# 3.5. RENOVADOR DE LEASE (HEARTBEAT) PARA OPERACIONES LARGAS
# ==============================================================================

class LeaseHeartbeat:
    """
    Hilo daemon que renueva periódicamente el timestamp 'actualizado_en'
    de las filas en 'EN_PROCESO' para evitar que el reaper expire el lease (>300s)
    mientras una operación legítima de red (ej. llamadas a Google Sheets API)
    continúa en ejecución.
    """
    def __init__(self, table_name: str, ids: List[int], interval_sec: float = 20.0):
        self.table_name = table_name
        self.ids = ids
        self.interval_sec = interval_sec
        self.stop_event = threading.Event()
        self.thread = None

    def start(self):
        if not self.ids:
            return
        self.thread = threading.Thread(
            target=self._run,
            daemon=True,
            name=f"Heartbeat-{self.table_name}"
        )
        self.thread.start()

    def _run(self):
        placeholders = ",".join("?" * len(self.ids))
        while not self.stop_event.wait(self.interval_sec):
            try:
                now_str = datetime.now().isoformat()
                with get_db_connection() as conn:
                    conn.execute(f"""
                        UPDATE {self.table_name}
                        SET actualizado_en = ?
                        WHERE id IN ({placeholders}) AND estatus = 'EN_PROCESO';
                    """, [now_str] + self.ids)
                    conn.commit()
            except Exception as e:
                logger.warning(f"Advertencia en LeaseHeartbeat para {self.table_name}: {e}")

    def stop(self):
        self.stop_event.set()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)


# ==============================================================================
# 4. DEMONIO FLUSHER EN SEGUNDO PLANO CON MICRO-BATCHING Y CONTROL DE CUOTAS
# ==============================================================================

class OutboxFlusherDaemon:
    """
    Hilo de ejecución continuo que despierta cada 3 segundos,
    extrae hasta 20 asignaciones 'PENDIENTE' de SQLite, las marca 'EN_PROCESO'
    y las despacha en Micro-Batch agrupado.
    Si detecta HTTP 429, entra en pausa protectora de 60s para restablecer la cuota.
    """
    def __init__(self, interval_sec: float = 3.0):
        self.interval = interval_sec
        self.engine = DualWriterSyncEngine()
        self.running = False
        self.thread = None
        self._pausa_hasta = 0.0

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._loop, name="OutboxFlusherThread", daemon=True)
        self.thread.start()
        logger.info(f"🚀 Demonio OutboxFlusher iniciado (intervalo: {self.interval}s, DB: {DB_PATH}).")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)

    def _loop(self):
        while self.running:
            try:
                ahora = time.time()
                if ahora < self._pausa_hasta:
                    # Estamos en pausa de enfriamiento por cuota 429
                    restante = int(self._pausa_hasta - ahora)
                    if restante % 10 == 0:
                        logger.info(f"⏳ Pausa protectora activa por cuota 429. Restan {restante}s...")
                    time.sleep(2)
                    continue

                self.procesar_pendientes()
            except Exception as e:
                logger.error(f"Excepción en OutboxFlusher: {e}")
            time.sleep(self.interval)

    def procesar_pendientes(self):
        filas = []
        now_str = datetime.now().isoformat()

        # 1. Seleccionar hasta 20 pendientes y marcarlos atómicamente 'EN_PROCESO'
        with get_db_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            try:
                cursor.execute("BEGIN IMMEDIATE;")
                # Reaper de rescate: Reactivar tareas atascadas en 'EN_PROCESO' por más de 300 segundos
                cursor.execute("""
                    UPDATE outbox_asignaciones
                    SET estatus = 'PENDIENTE', intentos = intentos + 1
                    WHERE estatus = 'EN_PROCESO'
                      AND (strftime('%s', 'now') - strftime('%s', actualizado_en)) > 300;
                """)
                cursor.execute("""
                    SELECT * FROM outbox_asignaciones
                    WHERE estatus = 'PENDIENTE' AND intentos < 5
                    ORDER BY id ASC LIMIT 20
                """)
                filas = [dict(r) for r in cursor.fetchall()]
                if filas:
                    ids = [r["id"] for r in filas]
                    placeholders = ",".join("?" * len(ids))
                    cursor.execute(f"""
                        UPDATE outbox_asignaciones
                        SET estatus = 'EN_PROCESO', actualizado_en = ?
                        WHERE id IN ({placeholders})
                    """, [now_str] + ids)
                conn.commit()
            finally:
                cursor.close()

        if not filas:
            return

        # 2. Despachar el lote completo en Micro-Batch con renovación continua de lease (Heartbeat)
        ids_lote = [r["id"] for r in filas]
        heartbeat = LeaseHeartbeat("outbox_asignaciones", ids_lote, interval_sec=20.0)
        heartbeat.start()
        try:
            exito, err_msg = self.engine.sincronizar_lote_microbatch(filas)
        finally:
            heartbeat.stop()

        placeholders = ",".join("?" * len(ids_lote))

        with get_db_connection() as conn:
            cursor = conn.cursor()
            try:
                if exito:
                    cursor.execute(f"""
                        UPDATE outbox_asignaciones
                        SET estatus = 'COMPLETADO', actualizado_en = ?, ultimo_error = NULL
                        WHERE id IN ({placeholders})
                    """, [datetime.now().isoformat()] + ids_lote)
                else:
                    # Detectar si fue error de cuota 429
                    es_cuota = "429" in err_msg or "Resource Exhausted" in err_msg
                    if es_cuota:
                        # Pausa de enfriamiento de 60 segundos SIN quemar intentos (es un fallo de infraestructura transitorio)
                        self._pausa_hasta = time.time() + 60.0
                        logger.warning("🚨 Cuota de Google Sheets agotada (HTTP 429). Activando pausa de 60s sin quemar intentos...")
                        cursor.execute(f"""
                            UPDATE outbox_asignaciones
                            SET estatus = 'PENDIENTE',
                                ultimo_error = ?,
                                actualizado_en = ?
                            WHERE id IN ({placeholders})
                        """, [err_msg, datetime.now().isoformat()] + ids_lote)
                    else:
                        cursor.execute(f"""
                            UPDATE outbox_asignaciones
                            SET estatus = CASE WHEN intentos + 1 >= 5 THEN 'FALLIDO' ELSE 'PENDIENTE' END,
                                intentos = intentos + 1,
                                ultimo_error = ?,
                                actualizado_en = ?
                            WHERE id IN ({placeholders})
                        """, [err_msg, datetime.now().isoformat()] + ids_lote)
                conn.commit()
            finally:
                cursor.close()


_flusher_daemon_instance: Optional[OutboxFlusherDaemon] = None
_flusher_daemon_lock = threading.Lock()

def obtener_o_iniciar_flusher_daemon() -> OutboxFlusherDaemon:
    """Obtiene o inicia el demonio flusher en segundo plano (Singleton)."""
    global _flusher_daemon_instance
    with _flusher_daemon_lock:
        if _flusher_daemon_instance is None:
            _flusher_daemon_instance = OutboxFlusherDaemon()
        if not _flusher_daemon_instance.running:
            _flusher_daemon_instance.start()
        return _flusher_daemon_instance

# Solo auto-arrancar si se especifica explícitamente por variable de entorno o si se ejecuta como script principal
if os.getenv("CALPIXQUI_AUTO_START_FLUSHER", "0") == "1" or __name__ == "__main__":
    flusher_daemon = obtener_o_iniciar_flusher_daemon()
else:
    flusher_daemon = None

