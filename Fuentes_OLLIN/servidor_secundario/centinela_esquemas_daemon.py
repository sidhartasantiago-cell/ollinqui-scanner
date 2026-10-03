"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: CENTINELA DE ESQUEMAS PREVENTIVO (POKA-YOKE)
ARCHIVO: centinela_esquemas_daemon.py
VERSIÓN: 1.0.0 PROD (CANON OLLIN-QUAD 24/7)
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)
================================================================================

PROPÓSITO:
1. Auditar preventivamente la integridad dimensional de las tablas de Google Sheets
   críticas para AppSheet y Apps Script (CAT_USUARIOS, GUIAS_ASIGNADAS, PIEZAS_PID,
   COLA_TEOYOLOTL_AUDIOS_QRO, CAT_CHECKPOINTS y VALIDACIÓN_QRO_2025).
2. Detectar y prevenir Column Shifting, columnas faltantes o desplazamientos
   antes de que impacten la operación de ruta de los Pochtecas en campo.
3. Se puede ejecutar en modo continuo (daemon cada 1 hora) o en modo one-shot (--once).
================================================================================
"""

import os
import sys
import time
import json
import logging
import argparse
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
LOGS_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOGS_DIR / "centinela_esquemas.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("CentinelaEsquemas")

WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyOcK5lm-_baXG021-GvPh_FRo4V9iMdokFyByn8M3A0xmqaBoutIuaYGEUS3aoOTHyBQ/exec"

def ejecutar_auditoria_esquemas():
    """Ejecuta la auditoría invocando el endpoint productivo de Apps Script"""
    logger.info("🛡️ Iniciando escaneo preventivo de esquemas de datos...")
    payload = {"action": "ejecutar_centinela_esquemas"}
    req = urllib.request.Request(
        WEBHOOK_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            
        status = data.get("status", "UNKNOWN")
        tablas = data.get("totalTablasAuditadas", 0)
        criticas = data.get("alertasCriticas", 0)
        advertencias = data.get("advertencias", 0)
        
        if status == "HEALTHY":
            logger.info(f"✅ DICTAMEN: SALUDABLE ({status}). {tablas} tablas auditadas sin anomalías.")
        elif status == "WARNING":
            logger.warning(f"⚠️ DICTAMEN: ADVERTENCIA ({status}). {advertencias} advertencias detectadas.")
        else:
            logger.error(f"🚨 DICTAMEN: CORRUPCIÓN / ERROR ({status}). {criticas} alertas críticas!")
            
        for detalle in data.get("detalles", []):
            st = detalle.get("status")
            hoja = detalle.get("hoja")
            reales = detalle.get("reales")
            esp = detalle.get("esperadas")
            disc = detalle.get("discrepancias", [])
            disc_str = f" | Discrepancias: {disc}" if disc else ""
            if st == "HEALTHY":
                logger.info(f"   [OK] {hoja:25} : {reales}/{esp} cols")
            else:
                logger.warning(f"   [{st}] {hoja:25} : {reales}/{esp} cols{disc_str}")
                
        return data
        
    except Exception as e:
        logger.error(f"❌ Error al contactar el Centinela Webhook: {e}")
        return {"status": "ERROR", "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Centinela de Esquemas OLLIN-QUAD")
    parser.add_argument("--once", action="store_true", help="Ejecutar una sola vez y salir")
    parser.add_argument("--interval", type=int, default=3600, help="Intervalo en segundos entre chequeos (default: 3600s)")
    args = parser.parse_args()

    logger.info("=== CENTINELA DE ESQUEMAS OLLIN INICIADO ===")
    
    if args.once:
        res = ejecutar_auditoria_esquemas()
        sys.exit(0 if res.get("status") in ["HEALTHY", "WARNING"] else 1)
        
    while True:
        try:
            ejecutar_auditoria_esquemas()
        except Exception as e:
            logger.error(f"Excepción no controlada en ciclo: {e}")
        logger.info(f"Esperando {args.interval} segundos para el próximo escaneo...")
        time.sleep(args.interval)

if __name__ == "__main__":
    main()
