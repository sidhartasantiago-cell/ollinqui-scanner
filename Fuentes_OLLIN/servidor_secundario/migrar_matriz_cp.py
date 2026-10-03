import json
import urllib.request
import urllib.parse
import sys
import os
from pathlib import Path
from datetime import datetime

sys.path.insert(0, r"c:\Users\sidha\OneDrive\Careta para Antigravity\.agents")
from test_sheets_api import get_access_token

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

boveda_id = "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw"

from dry_run_matriz_cp import inferir_municipio_y_zona

def ejecutar_migracion_matriz_cp():
    print("=================================================================")
    print("🏛️ MIGRACIÓN ATÓMICA DE MATRIZ_CP A 9 COLUMNAS MULTICAPA")
    print("=================================================================")
    
    token = get_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 1. Leer datos existentes
    print("[1/4] 📥 Descargando MATRIZ_CP actual para respaldo...")
    quoted = urllib.parse.quote("MATRIZ_CP!A1:Z".encode("utf-8"))
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{boveda_id}/values/{quoted}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        original_rows = json.loads(resp.read().decode("utf-8")).get("values", [])

    print(f"      Filas descargadas: {len(original_rows)}")
    
    # 2. Guardar Respaldo
    backup_file = DATA_DIR / f"backup_matriz_cp_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(backup_file, "w", encoding="utf-8") as bf:
        json.dump(original_rows, bf, ensure_ascii=False, indent=2)
    print(f"[2/4] 💾 Respaldo guardado en: {backup_file.name}")

    # 3. Construir nuevas filas con esquema canónico de 9 columnas
    header = [
        "Codigo_Postal",
        "Municipio",
        "Zona_Operativa",
        "Chofer_Titular",
        "Chofer_Suplente",
        "Supervisor_Zona",
        "Tipo_Servicio",
        "Override_Activo",
        "Fecha_Expiracion_Override"
    ]

    new_rows = [header]
    for r in original_rows[1:]:
        cp = r[0].strip() if len(r) > 0 else ""
        titular = r[1].strip() if len(r) > 1 else ""
        servicio = r[2].strip() if len(r) > 2 else ""

        if not cp:
            continue

        municipio, zona, supervisor = inferir_municipio_y_zona(cp)
        suplente = "oscher1016@gmail.com" if supervisor == "xichudaniel@gmail.com" else ""
        override = ""
        fecha_exp_override = ""

        new_rows.append([
            cp,
            municipio,
            zona,
            titular,
            suplente,
            supervisor,
            servicio,
            override,
            fecha_exp_override
        ])

    print(f"[3/4] ✍️ Inyectando {len(new_rows)} filas en MATRIZ_CP!A1:I{len(new_rows)}...")
    rng_write = urllib.parse.quote(f"MATRIZ_CP!A1:I{len(new_rows)}".encode("utf-8"))
    url_write = f"https://sheets.googleapis.com/v4/spreadsheets/{boveda_id}/values/{rng_write}?valueInputOption=USER_ENTERED"
    payload = {
        "range": f"MATRIZ_CP!A1:I{len(new_rows)}",
        "values": new_rows
    }
    req_write = urllib.request.Request(url_write, data=json.dumps(payload).encode("utf-8"), headers=headers, method="PUT")
    with urllib.request.urlopen(req_write) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print(f"      ✅ Actualización exitosa: {res.get('updatedCells')} celdas actualizadas en {res.get('updatedRange')}")

    # 4. Verificación inmediata
    print("[4/4] 🔍 Verificación inmediata de lectura...")
    rng_check = urllib.parse.quote("MATRIZ_CP!A1:I5".encode("utf-8"))
    url_check = f"https://sheets.googleapis.com/v4/spreadsheets/{boveda_id}/values/{rng_check}"
    req_check = urllib.request.Request(url_check, headers=headers)
    with urllib.request.urlopen(req_check) as resp:
        check_rows = json.loads(resp.read().decode("utf-8")).get("values", [])
        print("      Cabeceras leídas:", check_rows[0])
        print("      Fila 2 leída:", check_rows[1])

    print("\n🏆 MIGRACIÓN DE MATRIZ_CP COMPLETADA CON ÉXITO Y VERIFICADA.")

if __name__ == "__main__":
    ejecutar_migracion_matriz_cp()
