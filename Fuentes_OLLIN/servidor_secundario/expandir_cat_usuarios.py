import json
import urllib.request
import urllib.parse
import sys

sys.path.insert(0, r"c:\Users\sidha\OneDrive\Careta para Antigravity\.agents")
from test_sheets_api import get_access_token

token = get_access_token()
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

app_ruta_id = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w"
cat_usuarios_sheet_id = 294388755

def ejecutar_expansion_cat_usuarios():
    print("=== EXPANDIENDO CAT_USUARIOS A COLUMNA H (TELEFONO) ===")
    
    # 1. Obtener metadatos actuales de CAT_USUARIOS
    url_meta = f"https://sheets.googleapis.com/v4/spreadsheets/{app_ruta_id}?fields=sheets.properties"
    req_meta = urllib.request.Request(url_meta, headers=headers)
    with urllib.request.urlopen(req_meta) as resp:
        meta = json.loads(resp.read().decode("utf-8"))
    
    col_count = 7
    for s in meta.get("sheets", []):
        if s["properties"]["sheetId"] == cat_usuarios_sheet_id:
            col_count = s["properties"].get("gridProperties", {}).get("columnCount", 7)
            print(f"Columnas actuales en CAT_USUARIOS: {col_count}")
            break
            
    # 2. Si tiene menos de 8 columnas, expandir
    if col_count < 8:
        print(f"Ampliando de {col_count} a 8 columnas...")
        batch_url = f"https://sheets.googleapis.com/v4/spreadsheets/{app_ruta_id}:batchUpdate"
        body = {
            "requests": [
                {
                    "appendDimension": {
                        "sheetId": cat_usuarios_sheet_id,
                        "dimension": "COLUMNS",
                        "length": 8 - col_count
                    }
                }
            ]
        }
        req_batch = urllib.request.Request(batch_url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req_batch) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            print("Expansión exitosa:", res)
    else:
        print("La hoja ya cuenta con 8 o más columnas.")

    # 3. Escribir Cabecera H1 = 'Telefono'
    rng_hdr = urllib.parse.quote("CAT_USUARIOS!H1".encode("utf-8"))
    url_write = f"https://sheets.googleapis.com/v4/spreadsheets/{app_ruta_id}/values/{rng_hdr}?valueInputOption=USER_ENTERED"
    payload = {
        "range": "CAT_USUARIOS!H1",
        "values": [["Telefono"]]
    }
    req_write = urllib.request.Request(url_write, data=json.dumps(payload).encode("utf-8"), headers=headers, method="PUT")
    with urllib.request.urlopen(req_write) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print(f"Cabecera H1 'Telefono' escrita: {res.get('updatedCells')} celda actualizada.")

    # 4. Verificar fila 1 completa
    rng_row1 = urllib.parse.quote("CAT_USUARIOS!A1:H1".encode("utf-8"))
    url_read = f"https://sheets.googleapis.com/v4/spreadsheets/{app_ruta_id}/values/{rng_row1}"
    req_read = urllib.request.Request(url_read, headers=headers)
    with urllib.request.urlopen(req_read) as resp:
        res_read = json.loads(resp.read().decode("utf-8"))
        print("Cabeceras resultantes en CAT_USUARIOS:", res_read.get("values", [[]])[0])

if __name__ == "__main__":
    ejecutar_expansion_cat_usuarios()
