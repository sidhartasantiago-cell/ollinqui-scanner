# -*- coding: utf-8 -*-
"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS QUERÉTARO (UNIVERSO 2 CORPORATIVO)
MÓDULO: DETONADOR MATUTINO DE GEOLOCALIZACIÓN PREDICTIVA CALPIXQUI (WHATSAPP)
ARCHIVO: Fuentes_OLLIN/servidor_secundario/calpixqui_solicitud_geo.py
VERSIÓN: 1.0.0 PROD
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago (Tlayacanqui)
================================================================================
Propósito:
- Ejecución automática matutina (8:30 AM - Opción A aprobada por Sidharta).
- Filtra guías del día sin coordenadas validadas previas (ej. Bancarios, direcciones sin número exterior).
- Despacha mensaje formal e interactivo vía Gateway Headless (localhost:3001).
- Solicita al cliente el Pin de ubicación en tiempo real antes de que el Pochteca llegue.
================================================================================
"""

import os
import sys
import json
import time
import re
import urllib.request
import urllib.error
import argparse
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

GATEWAY_URL = "http://localhost:3001/send-message"
GATEWAY_HEALTH = "http://localhost:3001/health"
MANIFEST_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Entrega_Masiva_PWA", "manifiesto_activo.json"))
LOG_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "logs", f"calpixqui_solicitudes_{datetime.now().strftime('%Y%m%d')}.log"))

def verificar_gateway_online():
    try:
        req = urllib.request.Request(GATEWAY_HEALTH)
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get("ready", False) and data.get("status") == "ONLINE"
    except Exception:
        return False

def normalizar_celular(tel_raw):
    if not tel_raw:
        return ""
    digits = re.sub(r'\D', '', str(tel_raw))
    if len(digits) == 10:
        return digits
    if len(digits) == 12 and digits.startswith('52'):
        return digits[2:]
    if len(digits) == 13 and digits.startswith('521'):
        return digits[3:]
    return ""

def enviar_solicitud_ubicacion(destinatario, hwb, telefono, dry_run=False):
    celular = normalizar_celular(telefono)
    if not celular:
        return {"ok": False, "motivo": "Teléfono inválido o menor a 10 dígitos"}

    # Nombre corto
    primer_nombre = destinatario.strip().split()[0].capitalize() if destinatario and destinatario != "." else "Estimado cliente"

    mensaje = (
        f"Hola {primer_nombre}, te saluda Arauto Express, mensajería aliada de DHL en Querétaro. 🚚\n\n"
        f"Tenemos en ruta la entrega de tu paquete confidencial con guía *{hwb}* para el día de hoy.\n\n"
        f"📍 *Para asegurar que nuestro Pochteca llegue directo a tu puerta*, por favor compártenos tu ubicación actual en este chat "
        f"(toca el botón de adjuntar 📎 o + y selecciona *Ubicación*).\n\n"
        f"¡Muchas gracias por tu apoyo!\n"
        f"_Arauto Express para DHL Express México_"
    )

    if dry_run:
        print(f"  [DRY-RUN] Simulación envío a {celular} (Guía {hwb}): {mensaje[:60]}...")
        return {"ok": True, "dry_run": True}

    payload = {
        "to": f"521{celular}@c.us",
        "message": mensaje
    }

    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(GATEWAY_URL, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            res_json = json.loads(resp.read().decode('utf-8'))
            return {"ok": True, "res": res_json}
    except Exception as e:
        return {"ok": False, "motivo": str(e)}

def ejecutar_campana_matutina(dry_run=False, solo_bancarios=False, limite=50):
    print("=" * 70)
    print("🏛️ CALPIXQUI — CAMPAÑA MATUTINA DE GEOLOCALIZACIÓN INTERACTIVA (WHATSAPP)")
    print(f"🕒 Hora de ejecución: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"⚙️ Modo: {'DRY-RUN (Simulación)' if dry_run else 'ENVÍO EN VIVO A WHATSAPP'}")
    print("=" * 70)

    if not dry_run and not verificar_gateway_online():
        print("❌ Error: El Gateway Headless de WhatsApp (localhost:3001) NO está en línea o no está vinculado.")
        print("   Por favor verifica ACTIVAR_CALPIXQUI.bat o revisa http://localhost:3001/health")
        return False

    if not os.path.exists(MANIFEST_PATH):
        print(f"❌ Error: Manifiesto no encontrado en {MANIFEST_PATH}")
        return False

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # Identificar guías únicas que necesitan geolocalización
    guias_procesadas = {}
    choferes = manifest.get("choferes", {})

    for chofer, bultos in choferes.items():
        for b in bultos:
            hwb = str(b.get("hwb", "")).strip()
            if not hwb or hwb in guias_procesadas:
                continue

            geo_fuente = b.get("geo_fuente", "")
            es_bancario = (b.get("tipo_prioridad") == "BANCARIO")
            tel = normalizar_celular(b.get("tel", ""))

            # Condiciones para solicitar ubicación:
            # 1. Tiene celular válido
            # 2. No tiene GPS Amoxcalli confirmado ni pin previo de WhatsApp
            # 3. Si solo_bancarios está activo, debe ser bancario
            if tel and geo_fuente not in ("AMOXCALLI_HISTORICO", "CALPIXQUI_WHATSAPP"):
                if solo_bancarios and not es_bancario:
                    continue
                guias_procesadas[hwb] = {
                    "hwb": hwb,
                    "destinatario": b.get("destinatario", ""),
                    "tel": tel,
                    "tipo_prioridad": b.get("tipo_prioridad", "ESTANDAR"),
                    "chofer": chofer
                }

    candidatos = list(guias_procesadas.values())[:limite]
    print(f"📋 Total de guías candidatas para solicitud de ubicación: {len(candidatos)}")

    exitosos = 0
    fallidos = 0

    for idx, c in enumerate(candidatos, start=1):
        print(f"[{idx}/{len(candidatos)}] Guía {c['hwb']} | {c['tipo_prioridad']} | Dest: {c['destinatario'][:25]} | Tel: {c['tel']}")
        res = enviar_solicitud_ubicacion(c["destinatario"], c["hwb"], c["tel"], dry_run=dry_run)
        if res.get("ok"):
            exitosos += 1
            print("   ✅ Solicitud despachada exitosamente.")
        else:
            fallidos += 1
            print(f"   ⚠️ Fallo: {res.get('motivo')}")

        if not dry_run and idx < len(candidatos):
            # Pausa de 3.5 segundos entre mensajes para proteger la línea contra ban de WhatsApp
            time.sleep(3.5)

    print("\n" + "=" * 70)
    print("📊 RESUMEN DE CAMPAÑA CALPIXQUI:")
    print(f"  • Mensajes enviados exitosamente: {exitosos}")
    print(f"  • Fallos de envío:                {fallidos}")
    print("=" * 70)
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Calpixqui - Solicitud de Geolocalización WhatsApp")
    parser.add_argument("--dry-run", action="store_true", help="Simula los envíos sin contactar a WhatsApp")
    parser.add_argument("--solo-bancarios", action="store_true", help="Limita los envíos solo a paquetería bancaria")
    parser.add_argument("--limite", type=int, default=30, help="Límite máximo de envíos por lote")
    args = parser.parse_args()

    ejecutar_campana_matutina(dry_run=args.dry_run, solo_bancarios=args.solo_bancarios, limite=args.limite)
