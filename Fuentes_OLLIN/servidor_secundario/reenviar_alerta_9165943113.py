"""
Reenvío oficial de la alerta 9165943113 a tres bandas:
1. Edgar Rodríguez (Pochteca en ruta)
2. Irvin Reyes (Supervisor de Rampa)
3. Tlayacanqui Sidharta Santiago (Mesa de Control)
"""
import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

hwb = "9165943113"
pochteca = "Edgar Rodríguez"
incidencia = "Dirección no localizada / Aclaración urgente de entrega"
accion = "Re-visitar domicilio antes de las 18:00 hrs y capturar evidencia completa (Foto Fachada + INE)."

mensaje_alerta = (
    "🧪 *[INGESTA REAL GMAIL & CLASIFICACIÓN EN VIVO — FRENTE 6]*\n"
    "🏛️ *CALPIXQUI — ALERTA DE RESCATE DE RECLAMO DHL*\n\n"
    f"• Guía HWB: {hwb}\n"
    f"• Pochteca Asignado en Ruta: {pochteca}\n"
    f"• Incidencia DHL: {incidencia}\n"
    f"• Acción requerida: {accion}\n\n"
    "🛡️ _Ecosistema OLLIN Arauto Express._"
)

destinatarios = [
    {
        "rol": "Pochteca en Ruta",
        "nombre": "Edgar Rodríguez",
        "telefono": "+52 442 381 6310",
        "to": "524423816310@c.us"
    },
    {
        "rol": "Supervisor de Rampa",
        "nombre": "Irvin Reyes",
        "telefono": "+52 55 4189 1708",
        "to": "525541891708@c.us"
    },
    {
        "rol": "Tlayacanqui",
        "nombre": "Sidharta Santiago",
        "telefono": "+52 449 180 5948",
        "to": "524491805948@c.us"
    }
]

url = "http://localhost:3001/send-message"
print(f"🚀 Reenviando Alerta HWB {hwb} a 3 bandas...")

for d in destinatarios:
    nom = d["nombre"]
    rol = d["rol"]
    tel = d["telefono"]
    to_id = d["to"]
    payload = json.dumps({"to": to_id, "message": mensaje_alerta}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"✅ [{rol}] {nom} ({tel}): {data.get('estatus')} (MsgID: {data.get('message_id')})")
    except Exception as ex:
        print(f"❌ Error enviando a {nom} ({tel}): {ex}")
