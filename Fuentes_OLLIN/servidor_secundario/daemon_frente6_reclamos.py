"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: FRENTE 6 — DEMONIO DE BARRIDO CONTINUO Y MONITOREO DE RECLAMOS GMAIL
ARCHIVO: daemon_frente6_reclamos.py
VERSIÓN: 3.0.0 PROD (Zero-Dependency Daemon)
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)
================================================================================

PROPÓSITO (DAEMON 24/7 AUTÓNOMO):
1. Ejecutar barrido continuo cada 5 minutos (300s) sobre Gmail ('03_RECLAMOS_DHL').
2. Al detectar nuevos correos, dispara automáticamente el ciclo atómico completo:
   - Ingesta Cognitiva con Gemini 3.6 Flash.
   - Búsqueda en Bóveda BD_APP_RUTA_2025 (Pochteca asignado).
   - Inyección en MONITOR_INCIDENCIAS_AE (25 columnas).
   - Despacho de alerta por Calpixqui WhatsApp Gateway (localhost:3001) a:
     * Pochteca asignado en ruta
     * Supervisor de Rampa (Irvin Reyes)
     * Tlayacanqui (Sidharta Santiago)
   - Reubicación a '03_RECLAMOS_DHL/PROCESADOS' y remoción de INBOX.
3. Registro de auditoría persistente en 'logs/frente6_daemon.log'.
================================================================================
"""

import os
import sys
import time
import json
import logging
import urllib.request
from datetime import datetime
from pathlib import Path

# Configurar salida UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)
DAEMON_LOG = LOGS_DIR / "frente6_daemon.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Frente6Daemon] %(message)s",
    handlers=[
        logging.FileHandler(str(DAEMON_LOG), encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("Frente6Daemon")

# Importar funciones atómicas del Frente 6
sys.path.insert(0, str(BASE_DIR))
from escudo_reclamos_dhl import (
    procesar_ciclo_atomico_frente6,
    obtener_google_token,
    GAS_WEBAPP_URL,
    GATEWAY_URL
)

INTERVALO_SEGUNDOS = 300  # 5 minutos

def verificar_correos_pendientes_gmail() -> bool:
    """Consulta directamente la API nativa de Gmail para verificar correos pendientes."""
    token = obtener_google_token()
    if token:
        try:
            query = "label:03_RECLAMOS_DHL -label:03_RECLAMOS_DHL/PROCESADOS"
            url = f"https://gmail.googleapis.com/gmail/v1/users/me/threads?q={urllib.parse.quote(query)}"
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                threads = data.get("threads", [])
                return len(threads) > 0
        except Exception as ex:
            logger.warning(f"Error consultando Gmail API nativa: {ex}")
            return False
    return False

def verificar_estado_gateway() -> dict:
    """Verifica si el Gateway de WhatsApp en el puerto 3001 está ONLINE."""
    try:
        url_health = "http://localhost:3001/status"
        req = urllib.request.Request(url_health, headers={"User-Agent": "CalpixquiFrente6Daemon/3.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"ready": False, "status": f"OFFLINE ({e})"}

def iniciar_demonio():
    logger.info("=" * 70)
    logger.info("🏛️ INICIANDO DEMONIO CONTINUO DEL FRENTE 6 (RECLAMOS DHL)")
    logger.info(f"Frecuencia de escaneo: Cada {INTERVALO_SEGUNDOS // 60} minutos ({INTERVALO_SEGUNDOS}s)")
    logger.info(f"Log de auditoría: {DAEMON_LOG}")
    logger.info("Despacho operativo activo: Pochteca en Ruta + Supervisor de Zona + Supervisor Rampa (Irvin) | Sidharta monitorea vía Google Chat")
    logger.info("=" * 70)

    ciclos = 0
    while True:
        ciclos += 1
        ts_ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"--- [Ciclo #{ciclos} | {ts_ahora} CST] Iniciando escaneo ---")

        # 1. Comprobar salud del Gateway WhatsApp
        gw_status = verificar_estado_gateway()
        gw_ready = gw_status.get("ready", False)
        gw_info = f"ONLINE ({gw_status.get('numero_vinculado')})" if gw_ready else f"PENDIENTE ({gw_status.get('status')})"
        logger.info(f"📡 Estado Calpixqui Gateway (3001): {gw_info}")

        # 2. Consultar si hay reclamos pendientes
        hay_pendientes = verificar_correos_pendientes_gmail()
        if hay_pendientes:
            logger.info("🚨 ¡Nuevos correos detectados en '03_RECLAMOS_DHL'! Detonando ciclo atómico tripartita...")
            try:
                procesar_ciclo_atomico_frente6()
                logger.info("✅ Ciclo atómico del Frente 6 ejecutado con éxito.")
            except Exception as e_proc:
                logger.error(f"❌ Error durante el procesamiento del ciclo atómico: {e_proc}", exc_info=True)
        else:
            logger.info("📭 Bandeja limpia: No hay nuevos correos pendientes en '03_RECLAMOS_DHL'.")

        logger.info(f"⏳ Dormitando {INTERVALO_SEGUNDOS} segundos hasta el próximo barrido...")
        try:
            time.sleep(INTERVALO_SEGUNDOS)
        except KeyboardInterrupt:
            logger.info("🛑 Demonio detenido manualmente por el operador.")
            break

if __name__ == "__main__":
    iniciar_demonio()
