import json
import urllib.request
import urllib.parse
import sys

sys.path.insert(0, r"c:\Users\sidha\OneDrive\Careta para Antigravity\.agents")
from test_sheets_api import get_access_token

token = get_access_token()
headers = {"Authorization": f"Bearer {token}"}
boveda_id = "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw"

quoted = urllib.parse.quote("MATRIZ_CP!A1:C".encode("utf-8"))
url = f"https://sheets.googleapis.com/v4/spreadsheets/{boveda_id}/values/{quoted}"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    rows = json.loads(resp.read().decode("utf-8")).get("values", [])

print(f"Total rows: {len(rows)}")
cps = [r[0] for r in rows[1:] if len(r) > 0]
print(f"Total CPs: {len(cps)}")

# Agrupar por prefijo de 2 o 3 dígitos
prefijos = {}
for cp in cps:
    pref = cp[:3] if len(cp) >= 3 else cp
    prefijos[pref] = prefijos.get(pref, 0) + 1

print("\nConteo por prefijo de 3 dígitos:")
for p in sorted(prefijos.keys()):
    print(f"  Prefijo {p}xx: {prefijos[p]} CPs")

# Choferes asignados actualmente
choferes = {}
for r in rows[1:]:
    ch = r[1] if len(r) > 1 else "VACIO"
    choferes[ch] = choferes.get(ch, 0) + 1

print("\nChoferes titulares actuales:")
for ch, count in sorted(choferes.items(), key=lambda x: x[1], reverse=True):
    print(f"  {ch}: {count} CPs")
