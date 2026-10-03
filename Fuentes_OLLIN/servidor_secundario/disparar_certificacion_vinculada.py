import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

destinatarios = [
    {"nombre": "Tlayacanqui Sidharta Santiago", "telefono": "+52 449 180 5948", "to": "524491805948@c.us"},
    {"nombre": "Irvin Reyes - Supervisor de Rampa", "telefono": "+52 55 4189 1708", "to": "525541891708@c.us"}
]

msg = (
    "🏛️ *CALPIXQUI ARAUTO EXPRESS — VINCULACIÓN CERTIFICADA 24/7*\n\n"
    "• Estado: 🟢 ONLINE / Autonomía Total (Headless)\n"
    "• Línea Emisora: +52 1 446 521 5701\n"
    "• Dispositivo: Calpixqui Arauto Express\n"
    "• IP Servidor: 192.168.100.11:3001\n"
    "• Mensaje: Conexión completada exitosamente desde la PC Secundaria. "
    "Calpixqui despacha alertas de rampa y reclamos DHL de forma 100% desasistida.\n\n"
    "🛡️ _Ecosistema OLLIN — Querétaro._"
)

url = "http://localhost:3001/send-message"
for d in destinatarios:
    payload = json.dumps({"to": d["to"], "message": msg}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"✅ Enviado exitosamente a {d['nombre']} ({d['telefono']}): {data.get('estatus')} (MsgID: {data.get('message_id')})")
    except Exception as e:
        print(f"❌ Error enviando a {d['nombre']}: {e}")
