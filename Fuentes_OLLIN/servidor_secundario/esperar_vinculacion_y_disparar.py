"""
Script de espera reactiva y disparo automático de Certificación CALPIXQUI.
Monitorea http://localhost:3001/health cada 2 segundos hasta 60s.
En cuanto 'ready: true', dispara la certificación a Sidharta e Irvin Reyes.
Utiliza únicamente la librería estándar de Python (urllib).
"""
import sys
import time
import json
import urllib.request
import urllib.error
import subprocess
from pathlib import Path

# Configurar salida UTF-8 para evitar errores con emojis en Windows cp1252
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

HEALTH_URL = "http://localhost:3001/health"
SCRIPT_DISPARO = Path(__file__).resolve().parent / "disparar_certificacion_final.py"

print("🔍 Iniciando escucha activa de vinculación en CALPIXQUI (timeout 60s)...")

for i in range(30):
    try:
        req = urllib.request.Request(HEALTH_URL)
        with urllib.request.urlopen(req, timeout=3) as r:
            if r.getcode() == 200:
                data = json.loads(r.read().decode("utf-8"))
                is_ready = data.get("ready", False)
                print(f"[{i+1}/30] Estatus: {data.get('status')} | Ready: {is_ready} | Vinculado: {data.get('numero_vinculado')}")
                if is_ready:
                    print("\n🎉 ¡VINCULACIÓN CONFIRMADA EN TIEMPO REAL!")
                    print(f"Número: {data.get('numero_vinculado')} | Pushname: {data.get('pushname')}")
                    print("🚀 Ejecutando disparo de certificación oficial inmediatamente...")
                    res = subprocess.run([sys.executable, str(SCRIPT_DISPARO)], capture_output=True, text=True, encoding="utf-8")
                    print(res.stdout)
                    if res.stderr:
                        print("STDERR:", res.stderr)
                    sys.exit(res.returncode)
    except Exception as e:
        print(f"[{i+1}/30] Esperando conexión ({e})...")
    time.sleep(2)

print("\n⏳ Tiempo de espera agotado (60s). El dispositivo aún no ha sido vinculado.")
sys.exit(1)
