import json
import urllib.request
import urllib.parse
import sys
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(Path(BASE_DIR).parent.parent / ".agents"))
from test_sheets_api import get_access_token

app_ruta_id = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w"
directorio_file = BASE_DIR / "data" / "directorio_pochtecas.json"

# Webhooks canónicos del Ecosistema OLLIN
WEBHOOK_GENERAL_RAMPA = "https://chat.googleapis.com/v1/spaces/AAQA-NmGVf0/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ml4k0Mmpx8c3vGco583llDQGEGJf3OY7LUMKlJjJIsY"
WEBHOOK_SIERRA_GORDA = "https://chat.googleapis.com/v1/spaces/AAQATOX9ZdI/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Was4vqP6iZorQmeccB_7GTxSYQgBUDmgoqVDfkyxgtc"
WEBHOOK_EDGAR = "https://chat.googleapis.com/v1/spaces/AAQAZOkix4k/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=6h6p2bqUKIDZQ1gblgNf3e5aQIxaUu4i6UJ1i1l8ank"
WEBHOOK_FERNANDO = "https://chat.googleapis.com/v1/spaces/AAQA8DkJmF4/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=AsNq3AL7lBmx5UdZAT_xpKa12Aeaie7qtWLksDYwRk4"

# Matriz Maestra de Operadores (Saneada y Unificada)
USUARIOS_CONFIG = [
    {
        "correo": "diegovv21mar@gmail.com",
        "nombre": "Diego",
        "rol": "Pochteca",
        "grupo": "Daniel",
        "webhook_chat": WEBHOOK_SIERRA_GORDA,
        "buscador_escaner": "",
        "tiene_7ca": "FALSE",
        "telefono": "5661562361",
        "zona_asignada": "Sierra Gorda",
        "supervisor": "xichudaniel@gmail.com"
    },
    {
        "correo": "edgar.rodriguez.arauto@gmail.com",
        "nombre": "Edgar",
        "rol": "POCHTECA",
        "grupo": "Independiente",
        "webhook_chat": WEBHOOK_EDGAR,
        "buscador_escaner": "",
        "tiene_7ca": "TRUE",
        "telefono": "4423816310",
        "zona_asignada": "QRO Metropolitano",
        "supervisor": "irvin.reyes@arauto.express"
    },
    {
        "correo": "fernando.maestro.1991@gmail.com",
        "nombre": "Fernando",
        "rol": "Pochteca",
        "grupo": "Independiente",
        "webhook_chat": WEBHOOK_FERNANDO,
        "buscador_escaner": "",
        "tiene_7ca": "FALSE",
        "telefono": "7295676990",
        "zona_asignada": "QRO Metropolitano",
        "supervisor": "irvin.reyes@arauto.express"
    },
    {
        "correo": "irvin.reyes@arauto.express",
        "nombre": "Irvin",
        "rol": "Tlachixqui",
        "grupo": "Todos",
        "webhook_chat": WEBHOOK_GENERAL_RAMPA, # CANAL GENERAL DE RAMPA / MESA DE CONTROL
        "buscador_escaner": "",
        "tiene_7ca": "FALSE",
        "telefono": "5541891708",
        "zona_asignada": "QRO Metropolitano",
        "supervisor": "irvin.reyes@arauto.express"
    },
    {
        "correo": "sidharta.santiago@arauto.express",
        "nombre": "Sidharta",
        "rol": "Tlayacanqui",
        "grupo": "Todos",
        "webhook_chat": WEBHOOK_GENERAL_RAMPA,
        "buscador_escaner": "JJD014600012819722962",
        "tiene_7ca": "FALSE",
        "telefono": "4491805948",
        "zona_asignada": "QRO Metropolitano",
        "supervisor": "sidharta.santiago@arauto.express"
    },
    {
        "correo": "victor18amadorm@gmail.com",
        "nombre": "Víctor",
        "rol": "Pochteca",
        "grupo": "Daniel",
        "webhook_chat": WEBHOOK_SIERRA_GORDA, # Espejo jerárquico Daniel Juárez
        "buscador_escaner": "",
        "tiene_7ca": "FALSE",
        "telefono": "4681566463",
        "zona_asignada": "Sierra Gorda",
        "supervisor": "xichudaniel@gmail.com"
    },
    {
        "correo": "xichudaniel@gmail.com",
        "nombre": "Daniel",
        "rol": "Tlachixqui",
        "grupo": "Daniel",
        "webhook_chat": WEBHOOK_SIERRA_GORDA, # Titular Canal Jerárquico Sierra Gorda
        "buscador_escaner": "JJD014600012801902464",
        "tiene_7ca": "FALSE",
        "telefono": "4191155625",
        "zona_asignada": "Sierra Gorda",
        "supervisor": "xichudaniel@gmail.com"
    },
    {
        "correo": "fmsanluispaq@gmail.com",
        "nombre": "Gregorio",
        "rol": "Pochteca",
        "grupo": "Daniel",
        "webhook_chat": WEBHOOK_SIERRA_GORDA, # Espejo jerárquico Daniel Juárez
        "buscador_escaner": "",
        "tiene_7ca": "FALSE",
        "telefono": "4192705455",
        "zona_asignada": "Sierra Gorda",
        "supervisor": "xichudaniel@gmail.com"
    },
    {
        "correo": "fmpaqueteriatvsm@gmail.com",
        "nombre": "Lyonnet",
        "rol": "Pochteca",
        "grupo": "Daniel",
        "webhook_chat": WEBHOOK_SIERRA_GORDA, # Espejo jerárquico Daniel Juárez
        "buscador_escaner": "",
        "tiene_7ca": "FALSE",
        "telefono": "8607718571",
        "zona_asignada": "Sierra Gorda",
        "supervisor": "xichudaniel@gmail.com"
    },
    {
        "correo": "yesigonzg1827@gmail.com",
        "nombre": "Rosi",
        "rol": "Pochteca",
        "grupo": "Daniel",
        "webhook_chat": WEBHOOK_SIERRA_GORDA, # Espejo jerárquico Daniel Juárez
        "buscador_escaner": "",
        "tiene_7ca": "FALSE",
        "telefono": "4191297704",
        "zona_asignada": "Sierra Gorda",
        "supervisor": "xichudaniel@gmail.com"
    }
]

def sincronizar_todo():
    print("=" * 75)
    print("🏛️ CARGA MASIVA DE TELÉFONOS Y RECONFIGURACIÓN JERÁRQUICA DE WEBHOOKS")
    print("=" * 75)

    token = get_access_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1. Leer CAT_USUARIOS actual
    print("\n[1/4] 📖 Leyendo CAT_USUARIOS en Sheets...")
    quoted = urllib.parse.quote("CAT_USUARIOS!A1:H15".encode("utf-8"))
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{app_ruta_id}/values/{quoted}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        rows = json.loads(resp.read().decode("utf-8")).get("values", [])

    print(f"      Filas actuales: {len(rows)}")

    # Construir filas actualizadas A1:H11
    header = ["Correo", "Nombre", "Rol", "Grupo", "Webhook_Chat", "Buscador_Escaner", "Tiene_7CA", "Telefono"]
    new_rows = [header]

    for u in USUARIOS_CONFIG:
        new_rows.append([
            u["correo"],
            u["nombre"],
            u["rol"],
            u["grupo"],
            u["webhook_chat"],
            u["buscador_escaner"],
            u["tiene_7ca"],
            u["telefono"]
        ])

    # 2. Inyección atómica a CAT_USUARIOS!A1:H11
    print(f"\n[2/4] ✍️ Inyectando filas saneadas en CAT_USUARIOS!A1:H{len(new_rows)}...")
    rng_write = urllib.parse.quote(f"CAT_USUARIOS!A1:H{len(new_rows)}".encode("utf-8"))
    url_write = f"https://sheets.googleapis.com/v4/spreadsheets/{app_ruta_id}/values/{rng_write}?valueInputOption=USER_ENTERED"
    payload = {
        "range": f"CAT_USUARIOS!A1:H{len(new_rows)}",
        "values": new_rows
    }
    req_write = urllib.request.Request(url_write, data=json.dumps(payload).encode("utf-8"), headers=headers, method="PUT")
    with urllib.request.urlopen(req_write) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print(f"      ✅ Celdas actualizadas en Sheets: {res.get('updatedCells')}")

    # 3. Actualizar directorio local de Calpixqui
    print("\n[3/4] 💾 Actualizando directorio local Calpixqui (directorio_pochtecas.json)...")
    directorio_local = {}
    ahora = datetime.now().isoformat()

    for u in USUARIOS_CONFIG:
        directorio_local[u["correo"]] = {
            "correo": u["correo"],
            "nombre": u["nombre"],
            "telefono": u["telefono"],
            "rol": u["rol"],
            "zona_asignada": u["zona_asignada"],
            "supervisor": u["supervisor"],
            "grupo": u["grupo"],
            "webhook_chat": u["webhook_chat"],
            "tiene_7ca": u["tiene_7ca"] == "TRUE",
            "estatus": "Activo",
            "fecha_creacion": ahora,
            "fecha_actualizacion": ahora
        }

    with open(directorio_file, "w", encoding="utf-8") as f:
        json.dump(directorio_local, f, ensure_ascii=False, indent=2)
    print(f"      ✅ Directorio local sincronizado: {len(directorio_local)} usuarios activos con teléfonos y webhooks.")

    # 4. Verificación inmediata de lectura
    print("\n[4/4] 🔍 Verificación inmediata de CAT_USUARIOS...")
    url_verif = f"https://sheets.googleapis.com/v4/spreadsheets/{app_ruta_id}/values/{rng_write}"
    req_verif = urllib.request.Request(url_verif, headers=headers)
    with urllib.request.urlopen(req_verif) as resp:
        v_rows = json.loads(resp.read().decode("utf-8")).get("values", [])
        for idx, vr in enumerate(v_rows):
            print(f"      Fila {idx+1}: {vr[0]} | Tel: {vr[7] if len(vr) > 7 else 'N/A'} | Webhook: {vr[4][:40] if len(vr) > 4 and vr[4] else 'VACÍO'}...")

    print("\n🏆 ACTUALIZACIÓN MASIVA COMPLETADA CON ÉXITO")

if __name__ == "__main__":
    sincronizar_todo()
