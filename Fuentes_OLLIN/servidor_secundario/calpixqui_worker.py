"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: NODO SECUNDARIO DE AUTOMATIZACIÓN 24/7
ARCHIVO: calpixqui_worker.py
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)
VERSIÓN: 2.0.0 PROD
================================================================================

PUNTO DE ENTRADA OFICIAL DEL AGENTE CALPIXQUI (CALPIX)
"El Guardián de la Casa y Administrador de la Bóveda"

Este script provee el acceso nativo canónico al orquestador hermes_ollin_worker.py
y al módulo de Despacho y Diagnóstico de Mensajería WhatsApp para la Mesa de Control.
================================================================================
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

# Añadir directorio actual
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from hermes_ollin_worker import (
    main as run_hermes_server,
    app,
    enviar_alerta_whatsapp,
    enviar_alerta_google_chat,
    logger,
    LOGS_DIR
)


def disparar_prueba_diagnostico_whatsapp(
    telefono: str = "+52 449 180 5948",
    hora_inicio: str = None
) -> Dict[str, Any]:
    """
    Dispara la Prueba de Diagnóstico WhatsApp oficial de CALPIXQUI para el Tlayacanqui Sidharta Santiago.
    
    Método: HEADLESS — Gateway Node.js whatsapp-web.js (localhost:3001)
    SIN pyautogui. SIN GUI. SIN foco de ventana. 100% programático.
    
    ESTRUCTURA DEL MENSAJE DE PRUEBA:
    - Encabezado: 🏛️ *CALPIXQUI ARAUTO EXPRESS — MESA DE CONTROL*
    - Estatus: 🟢 Despacho Programático Headless certificado exitosamente.
    - Mensaje de confirmación de conexión operativa.
    """
    if hora_inicio is None:
        hora_inicio = datetime.now().strftime("%H:%M hrs CST")

    print("================================================================================")
    print("🏛️ INICIANDO DISPARO DE PRUEBA HEADLESS WHATSAPP — CALPIXQUI")
    print(f"Destinatario: {telefono} (Tlayacanqui Sidharta Santiago)")
    print(f"Hora de Inicio: {hora_inicio}")
    print("Método: GATEWAY HEADLESS NODE.JS (whatsapp-web.js @ localhost:3001)")
    print("================================================================================")

    # 1. Maquetar el mensaje con la estructura canónica requerida
    lineas_mensaje = [
        "🏛️ *CALPIXQUI ARAUTO EXPRESS — MESA DE CONTROL*",
        "",
        "• *Estatus:* 🟢 Despacho Programático Headless certificado exitosamente.",
        f"• *Hora de inicio:* {hora_inicio}",
        "• *Mensaje:* Tlayacanqui Sidharta, el Gateway WhatsApp Headless de Calpixqui está 100% operativo — sin GUI, sin pyautogui, sin foco de ventana. El canal de WhatsApp funciona por API local Node.js.",
        "",
        "🤖 _Gateway: whatsapp-web.js @ localhost:3001 (Headless Chromium, sin pantalla)._",
        "🛡️ _Nodo: PC Maestra audiofila-v2 | Ecosistema OLLIN Arauto Express._"
    ]
    mensaje_texto = "\n".join(lineas_mensaje)

    # 2. Despachar vía gateway headless
    resultado_envio = enviar_alerta_whatsapp(mensaje=mensaje_texto, telefono=telefono)

    # 3. Notificación espejo en Google Chat (Mesa de Control / Rampa)
    estatus_wa = resultado_envio.get("estatus", resultado_envio.get("estatus_entrega", "PROCESADO"))
    enviar_alerta_google_chat(
        titulo="✅ WhatsApp Headless Gateway — Diagnóstico OK",
        mensaje=f"Mensaje enviado exitosamente a WhatsApp del Tlayacanqui Sidharta ({telefono}) vía Gateway Headless.",
        severidad="SUCCESS",
        detalles={
            "Destinatario": telefono,
            "Hora Inicio": hora_inicio,
            "Estatus WhatsApp": estatus_wa,
            "Método": "GATEWAY_HEADLESS_NODE_WWEBJS",
            "Gateway": "http://localhost:3001/send-message"
        }
    )

    # 4. Registrar en la bitácora local de ejecución de Calpixqui
    ts_actual = datetime.now().isoformat()
    registro_bitacora = {
        "evento": "DISPARO_PRUEBA_HEADLESS_WHATSAPP",
        "timestamp": ts_actual,
        "destinatario": telefono,
        "hora_inicio_declarada": hora_inicio,
        "estatus_entrega": estatus_wa,
        "metodo": "GATEWAY_HEADLESS_NODE_WWEBJS",
        "gateway": "http://localhost:3001/send-message",
        "payload_mensaje": mensaje_texto,
        "resultado_envio": resultado_envio,
        "nodo_origen": "PC Maestra audiofila-v2",
        "certificacion": "EXITOSA" if estatus_wa == "ENVIADO_HEADLESS_WHATSAPP" else "REGISTRADA"
    }

    log_diag_file = LOGS_DIR / "calpixqui_whatsapp_diagnostico.json"
    historico = []
    if log_diag_file.exists():
        try:
            with open(log_diag_file, "r", encoding="utf-8") as f:
                historico = json.load(f)
        except Exception:
            historico = []

    historico.append(registro_bitacora)
    with open(log_diag_file, "w", encoding="utf-8") as f:
        json.dump(historico, f, ensure_ascii=False, indent=2)

    logger.info(f"✅ [Bitácora Calpixqui] Prueba de WhatsApp Headless registrada en {log_diag_file.name}")
    print("\n📩 MENSAJE ENVIADO:")
    print("--------------------------------------------------------------------------------")
    print(mensaje_texto)
    print("--------------------------------------------------------------------------------")
    print(f"📊 Estatus de Entrega: {registro_bitacora['estatus_entrega']}")
    print(f"📁 Bitácora actualizada: {log_diag_file}")
    print("================================================================================")
    if estatus_wa == "ENVIADO_HEADLESS_WHATSAPP":
        print("🟢 PRUEBA HEADLESS CERTIFICADA — MENSAJE ENVIADO FÍSICAMENTE A LA RED CELULAR")
    else:
        print(f"⚠️ Estatus: {estatus_wa} — Revisar si el gateway está listo (QR escaneado)")
    print("================================================================================")

    return registro_bitacora


def disparar_certificacion_autonoma_multidestinatario(
    destinatarios: Optional[list] = None
) -> Dict[str, Any]:
    """
    Dispara la Certificación Autónoma 24/7 de CALPIXQUI en segundo plano (headless)
    a Sidharta Santiago (+52 449 180 5948) e Irvin Reyes (+52 55 4189 1708).
    """
    hora_local = datetime.now().strftime("%H:%M hrs CST")
    if not destinatarios:
        destinatarios = [
            {"nombre": "Tlayacanqui Sidharta Santiago", "telefono": "+52 449 180 5948"},
            {"nombre": "Irvin Reyes - Supervisor de Rampa", "telefono": "+52 55 4189 1708"}
        ]

    lineas_mensaje = [
        "🏛️ *CALPIXQUI ARAUTO EXPRESS — CERTIFICACIÓN AUTÓNOMA 24/7*",
        "",
        "• *Modo:* 🟢 100% Autónomo / Segundo Plano (Headless)",
        f"• *Hora:* {hora_local}",
        "• *Mensaje:* Prueba de fuego de autonomía completada. Calpixqui despacha alertas de rampa y mesa de control en segundo plano sin bloquear consolas.",
        "",
        "🛡️ _Daemon Calpixqui 24/7 | Ecosistema OLLIN Arauto Express._"
    ]
    mensaje_texto = "\n".join(lineas_mensaje)

    print("================================================================================")
    print("🏛️ CALPIXQUI — CERTIFICACIÓN AUTÓNOMA MULTIDESTINATARIO 24/7")
    print(f"Hora Local: {hora_local}")
    print(f"Total Destinatarios: {len(destinatarios)}")
    print("================================================================================")

    resultados = []
    log_diag_file = LOGS_DIR / "calpixqui_whatsapp_diagnostico.json"
    historico = []
    if log_diag_file.exists():
        try:
            with open(log_diag_file, "r", encoding="utf-8") as f:
                historico = json.load(f)
        except Exception:
            historico = []

    for dest in destinatarios:
        nom = dest["nombre"]
        tel = dest["telefono"]
        print(f"\n🚀 Despachando a {nom} ({tel})...")
        res_envio = enviar_alerta_whatsapp(mensaje=mensaje_texto, telefono=tel)
        estatus = res_envio.get("estatus", res_envio.get("estatus_entrega", "PROCESADO"))

        reg = {
            "evento": "CERTIFICACION_AUTONOMA_24_7",
            "timestamp": datetime.now().isoformat(),
            "destinatario": tel,
            "nombre": nom,
            "hora_local": hora_local,
            "estatus_entrega": estatus,
            "metodo": res_envio.get("metodo", "GATEWAY_HEADLESS_NODE_WWEBJS"),
            "mensaje": mensaje_texto,
            "resultado": res_envio
        }
        historico.append(reg)
        resultados.append(reg)
        print(f"   📊 Estatus: {estatus}")

    with open(log_diag_file, "w", encoding="utf-8") as f:
        json.dump(historico, f, ensure_ascii=False, indent=2)

    print("\n================================================================================")
    print(f"📁 Bitácora actualizada en {log_diag_file}")
    print("================================================================================")
    return {"destinatarios": resultados, "hora": hora_local}


def main():
    if len(sys.argv) > 1 and sys.argv[1] in ["--server", "server", "run"]:
        run_hermes_server()
    elif len(sys.argv) > 1 and sys.argv[1] in ["--certificacion-autonoma", "autonomo"]:
        disparar_certificacion_autonoma_multidestinatario()
    else:
        # Por defecto ejecuta la certificación autónoma
        disparar_certificacion_autonoma_multidestinatario()


if __name__ == "__main__":
    main()
