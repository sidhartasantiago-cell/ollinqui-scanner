"""
Script de disparo de prueba para la Certificación 24/7 Completa de CALPIXQUI.
Envía el mensaje oficial a Sidharta Santiago e Irvin Reyes vía Gateway Headless (localhost:3001).
Utiliza exclusivamente la librería estándar (urllib.request) para máxima portabilidad y cero dependencias.
"""
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# Configurar codificación UTF-8 para consola Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

GATEWAY_URL = "http://localhost:3001/send-message"
LOG_FILE = Path(__file__).resolve().parent / "logs" / "calpixqui_whatsapp_diagnostico.json"

hora_local = datetime.now().strftime("%H:%M hrs CST")

destinatarios = [
    {"nombre": "Tlayacanqui Sidharta Santiago", "telefono": "+52 449 180 5948", "to": "524491805948@c.us"},
    {"nombre": "Irvin Reyes - Supervisor de Rampa", "telefono": "+52 55 4189 1708", "to": "525541891708@c.us"}
]

mensaje_texto = (
    "🏛️ *CALPIXQUI ARAUTO EXPRESS — CERTIFICACIÓN 24/7 COMPLETA*\n\n"
    "• Línea Vinculada: +52 1 446 521 5701\n"
    "• Estatus: 🟢 Daemon Headless Activo en PC Secundaria (Puerto 3001)\n"
    f"• Hora: {hora_local}\n"
    "• Mensaje: \"Certificación histórica lograda. Calpixqui despacha alertas de rampa y mesa de control en segundo plano a la red celular de forma 100% autónoma y permanente.\"\n\n"
    "🛡️ _Ecosistema OLLIN Arauto Express._"
)

print("=" * 80)
print("🏛️ CALPIXQUI — CERTIFICACIÓN 24/7 COMPLETA (WHATSAPP HEADLESS)")
print(f"Hora: {hora_local}")
print("=" * 80)

historico = []
if LOG_FILE.exists():
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            historico = json.load(f)
    except Exception:
        historico = []

todos_exitosos = True

for d in destinatarios:
    nom = d["nombre"]
    to_id = d["to"]
    tel = d["telefono"]
    print(f"\n🚀 Despachando a {nom} ({tel})...")
    payload = json.dumps({"to": to_id, "message": mensaje_texto}).encode("utf-8")
    req = urllib.request.Request(
        GATEWAY_URL,
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            status_code = resp.getcode()
            resp_body = resp.read().decode("utf-8")
            print(f"   HTTP {status_code} | Respuesta: {resp_body}")
            try:
                res_json = json.loads(resp_body)
            except Exception:
                res_json = {"raw": resp_body}

            exito = status_code == 200 and res_json.get("ok", False)
            if not exito:
                todos_exitosos = False

            reg = {
                "evento": "CERTIFICACION_24_7_COMPLETA",
                "timestamp": datetime.now().isoformat(),
                "destinatario": tel,
                "to_id": to_id,
                "nombre": nom,
                "hora_local": hora_local,
                "linea_vinculada": "+52 1 446 521 5701",
                "estatus_entrega": "ENVIADO_HEADLESS_WHATSAPP" if exito else f"HTTP_{status_code}",
                "metodo": "GATEWAY_HEADLESS_NODE_WWEBJS",
                "gateway": GATEWAY_URL,
                "mensaje": mensaje_texto,
                "respuesta_servidor": res_json
            }
            historico.append(reg)
    except urllib.error.HTTPError as he:
        todos_exitosos = False
        err_body = he.read().decode("utf-8") if he.fp else str(he)
        print(f"   ❌ HTTP Error {he.code}: {err_body}")
        historico.append({
            "evento": "CERTIFICACION_24_7_COMPLETA",
            "timestamp": datetime.now().isoformat(),
            "destinatario": tel,
            "to_id": to_id,
            "nombre": nom,
            "error": f"HTTP_{he.code}",
            "respuesta_servidor": err_body,
            "estatus_entrega": f"ERROR_HTTP_{he.code}"
        })
    except Exception as e:
        todos_exitosos = False
        print(f"   ❌ Excepción: {e}")
        historico.append({
            "evento": "CERTIFICACION_24_7_COMPLETA",
            "timestamp": datetime.now().isoformat(),
            "destinatario": tel,
            "nombre": nom,
            "error": str(e),
            "estatus_entrega": "ERROR_CONEXION"
        })

with open(LOG_FILE, "w", encoding="utf-8") as f:
    json.dump(historico, f, ensure_ascii=False, indent=2)

print("\n" + "=" * 80)
print(f"📁 Bitácora actualizada en {LOG_FILE}")
print(f"Resultado global: {'🟢 ÉXITO TOTAL' if todos_exitosos else '⚠️ REVISAR ERRORES'}")
print("=" * 80)

if not todos_exitosos:
    exit(1)
