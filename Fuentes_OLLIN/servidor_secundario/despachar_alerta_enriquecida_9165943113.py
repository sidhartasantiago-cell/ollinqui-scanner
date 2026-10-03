"""
Disparo de Alerta Enriquecida con Contexto Completo para la Guía 9165943113
Destinatarios:
1. Pochteca en Ruta: Edgar Rodríguez (+52 442 381 6310)
2. Supervisor de Rampa: Irvin Reyes (+52 55 4189 1708)
3. Tlayacanqui: Sidharta Santiago (+52 449 180 5948)
"""
import urllib.request
import urllib.parse
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Contexto maestro extraído de BD Central 2023 (Hoja Ruta) + Correo DHL
hwb = "9165943113"
pid = "JD014600012814217230"
pochteca = "Edgar Rodríguez"
direccion = "PRIV JOSE MARIA #56 es esq con hernan cortes"
colonia_mun = "QT, QUERETARO"
cp = "76210"
destinatario_cliente = "PARTICULAR"
tel_cliente = "442 875 9005"
fecha_asignacion = "19/09/2026 10:01 hrs"
estatus_previo = "PRE_ASIGNADO"
cliente_dhl = "HERBALIFE"
detalles_bulto = "Caja café corrugada con logos Herbalife, cinta gorila café (Peso aprox: 5 kg)"
incidencia_dhl = "KAD 3RA REQ — Pérdida Total (DHL solicita confirmación urgente de estatus o bulto)"
accion_urgente = "1) Verificar de inmediato si tienes el bulto en camioneta o rampa.\n2) Si ya se visitó el domicilio, acudir a recabar FOTO FACHADA + FIRMA/INE de quien recibe."

# Link de Google Maps directo con la dirección
query_maps = urllib.parse.quote(f"{direccion} {cp} Querétaro")
url_maps = f"https://www.google.com/maps/search/?api=1&query={query_maps}"

mensaje_alerta = (
    "🧪 *[ALERTA DE RESCATE DHL — FRENTE 6]*\n"
    "🏛️ *CALPIXQUI — LOCALIZACIÓN DE GUÍA EN RUTA*\n\n"
    f"Hola *{pochteca}*, requerimos tu apoyo urgente para ubicar o rescatar este envío:\n\n"
    "📦 *DATOS DEL ENVÍO:*\n"
    f"• Guía HWB: *{hwb}*\n"
    f"• PID Bulto: *{pid}* (1 pza)\n"
    f"• Cliente: *{cliente_dhl}*\n"
    f"• Físico: {detalles_bulto}\n\n"
    "📍 *DOMICILIO DE ENTREGA:*\n"
    f"• Dirección: *{direccion}*\n"
    f"• Colonia/Mun: *{colonia_mun}* (C.P. {cp})\n"
    f"• Destinatario: *{destinatario_cliente}*\n"
    f"• Tel. Cliente: *{tel_cliente}*\n"
    f"🗺️ *Ver en Google Maps:* {url_maps}\n\n"
    "🕒 *HISTORIAL EN SISTEMA:*\n"
    f"• Fecha asignación: *{fecha_asignacion}*\n"
    f"• Estatus en ruta: *{estatus_previo}*\n"
    "• Evidencia previa: *Sin foto fachada registrada*\n\n"
    f"⚠️ *RECLAMO REPORTADO POR DHL:*\n"
    f"• *{incidencia_dhl}*\n\n"
    "🎯 *ACCIÓN URGENTE REQUERIDA:*\n"
    f"• {accion_urgente}\n\n"
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

url_gateway = "http://localhost:3001/send-message"
print("=" * 80)
print("🚀 ENVIANDO ALERTA ENRIQUECIDA CON CONTEXTO COMPLETO (HWB 9165943113)...")
print("=" * 80)
print(mensaje_alerta)
print("=" * 80)

for d in destinatarios:
    nom = d["nombre"]
    rol = d["rol"]
    tel = d["telefono"]
    to_id = d["to"]
    payload = json.dumps({"to": to_id, "message": mensaje_alerta}).encode("utf-8")
    req = urllib.request.Request(url_gateway, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"✅ [{rol}] {nom} ({tel}): {data.get('estatus')} (MsgID: {data.get('message_id')})")
    except Exception as ex:
        print(f"❌ Error enviando a {nom} ({tel}): {ex}")
