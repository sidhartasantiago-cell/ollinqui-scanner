import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(Path(BASE_DIR).parent.parent / ".agents"))
from test_sheets_api import get_access_token

def limpiar_todos_los_test():
    token = get_access_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    app_ruta_id = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w"
    quoted = urllib.parse.quote("CAT_USUARIOS!A1:H".encode("utf-8"))
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{app_ruta_id}/values/{quoted}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        rows = json.loads(resp.read().decode("utf-8")).get("values", [])

    for idx, r in enumerate(rows):
        if r and len(r) > 0:
            email = r[0].strip().lower()
            if "test@" in email or "test." in email:
                fila_num = idx + 1
                print(f"Limpiando fila {fila_num} ({email}) en CAT_USUARIOS...")
                clear_rng = urllib.parse.quote(f"CAT_USUARIOS!A{fila_num}:H{fila_num}".encode("utf-8"))
                url_clear = f"https://sheets.googleapis.com/v4/spreadsheets/{app_ruta_id}/values/{clear_rng}:clear"
                req_clear = urllib.request.Request(url_clear, data=b"{}", headers=headers, method="POST")
                with urllib.request.urlopen(req_clear) as r_clr:
                    print("Fila limpiada:", json.loads(r_clr.read().decode("utf-8")))

    # En local también
    directorio_file = BASE_DIR / "data" / "directorio_pochtecas.json"
    if directorio_file.exists():
        with open(directorio_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        keys_to_del = [k for k in data.keys() if "test@" in k or "test." in k]
        for k in keys_to_del:
            del data[k]
        with open(directorio_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Claves temporales eliminadas de JSON local: {keys_to_del}")

if __name__ == "__main__":
    limpiar_todos_los_test()
