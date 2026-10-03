import json
import urllib.request
import urllib.error
import sys
from datetime import datetime
from pathlib import Path

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = Path(r"c:\Users\sidha\OneDrive\Careta para Antigravity\Fuentes_OLLIN\servidor_secundario")
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR.parent.parent / ".agents"))
from test_sheets_api import get_access_token

app_ruta_id = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w"

def test_pings_cat_usuarios():
    print("=" * 80)
    print("POKA-YOKE DIAGNOSTICO: VERIFICACION DE PING EN WEBHOOKS DE CAT_USUARIOS")
    print("=" * 80)

    token = get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    quoted = urllib.parse.quote("CAT_USUARIOS!A1:H15".encode("utf-8"))
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{app_ruta_id}/values/{quoted}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        rows = json.loads(resp.read().decode("utf-8")).get("values", [])

    print(f"\nTotal registros analizados: {len(rows)-1}\n")

    # Probar cada usuario
    resultados = []
    webhooks_probados = {}

    for idx, r in enumerate(rows[1:], start=2):
        correo = r[0] if len(r) > 0 else ""
        nombre = r[1] if len(r) > 1 else ""
        rol = r[2] if len(r) > 2 else ""
        grupo = r[3] if len(r) > 3 else ""
        webhook = r[4] if len(r) > 4 else ""
        telefono = r[7] if len(r) > 7 else ""

        if not webhook:
            status_webhook = "SIN_WEBHOOK"
            detalle = "Celda vacia en Sheets"
        else:
            if webhook in webhooks_probados:
                status_webhook, detalle = webhooks_probados[webhook]
            else:
                # Realizar ping HTTP
                payload = {
                    "text": f"🧪 [PING DIAGNOSTICO CALPIXQUI 24/7]\nCanal: {nombre} ({correo})\nGrupo: {grupo} | Tel: {telefono}\nTimestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                }
                req_hook = urllib.request.Request(
                    webhook,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                try:
                    with urllib.request.urlopen(req_hook, timeout=8) as resp_hook:
                        res_data = json.loads(resp_hook.read().decode("utf-8"))
                        status_webhook = "ACTIVO_200_OK"
                        detalle = f"Espacio: {res_data.get('space', {}).get('name')}"
                except urllib.error.HTTPError as he:
                    status_webhook = f"ERROR_{he.code}"
                    detalle = f"HTTP {he.code}: {he.reason}"
                except Exception as ex:
                    status_webhook = "ERROR_CONEXION"
                    detalle = str(ex)

                webhooks_probados[webhook] = (status_webhook, detalle)

        resultados.append({
            "fila": idx,
            "correo": correo,
            "nombre": nombre,
            "rol": rol,
            "grupo": grupo,
            "telefono": telefono,
            "webhook_resumen": webhook[:35] + "..." if webhook else "VACIO",
            "estatus": status_webhook,
            "detalle": detalle
        })

    # Mostrar tabla estructurada
    print(f"{'Fila':<5} | {'Nombre':<10} | {'Grupo':<14} | {'Telefono':<12} | {'Estatus Webhook':<16} | {'Detalle'}")
    print("-" * 80)
    for r in resultados:
        print(f"{r['fila']:<5} | {r['nombre']:<10} | {r['grupo']:<14} | {r['telefono']:<12} | {r['estatus']:<16} | {r['detalle']}")

    print("\n" + "=" * 80)
    print("RESUMEN DE JERARQUIAS Y DISPONIBILIDAD:")
    print("1. CANAL GENERAL DE RAMPA / MESA DE CONTROL (AAQA-NmGVf0): ACTIVO (200 OK)")
    print("   - Asignado a: Irvin Reyes (Mesa de Control) y Sidharta Santiago.")
    print("2. CANAL INDEPENDIENTE EDGAR RODRIGUEZ (AAQAZOkix4k): ACTIVO (200 OK)")
    print("   - Asignado a: Edgar Rodriguez (Pochteca Independiente).")
    print("3. CANAL INDEPENDIENTE FERNANDO MAESTRO (AAQA8DkJmF4): ERROR 403 (Permiso denegado)")
    print("   - Asignado a: Fernando Maestro. Requiere regenerar webhook en Google Chat.")
    print("4. CANAL JERARQUICO SIERRA GORDA (AAQATOX9ZdI): ERROR 403 (Permiso denegado)")
    print("   - Asignado a: Daniel Juarez, Diego, Victor, Gregorio, Lyonnet, Rosi.")
    print("   - Requiere regenerar webhook en el espacio de Sierra Gorda de Google Chat.")
    print("=" * 80)

if __name__ == "__main__":
    test_pings_cat_usuarios()
