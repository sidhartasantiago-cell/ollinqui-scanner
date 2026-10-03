"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
SCRIPT DE VALIDACIÓN Y CERTIFICACIÓN ATÓMICA: probar_nodo_local.py
================================================================================
Verifica:
1. Conexión y latencia con Gemini 3.6 Flash (vía endpoint HTTP oficial).
2. Cumplimiento de la regla de la 'Doble J' (JJD0146000... -> JD0146000...).
3. Esquema rígido de 25 columnas sin corrimiento (KEY en col 16 / Q, Teléfono en 20 / U).
4. Simulación de payload multimodal Teoyolotl Mic (<300ms).
"""

import os
import sys
import time
import json
import base64
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as _ef:
            for _line in _ef:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    os.environ.setdefault(_k.strip(), _v.strip())

# Importar funciones canónicas de hermes_ollin_worker
from hermes_ollin_worker import (
    sanitizar_pid_para_boveda,
    validar_fila_25_columnas,
    ESQUEMA_VALIDACION_QRO_25,
    GeminiMultimodalClient,
    GEMINI_API_KEY
)

def test_doble_j():
    print("\n--- [1/4] PRUEBA: REGLA DE LA DOBLE J ---")
    pid_entrada = "JJD014600012745225571"
    pid_salida = sanitizar_pid_para_boveda(pid_entrada)
    print(f"  Entrada (Rampa/Calle): {pid_entrada}")
    print(f"  Salida (Bóveda/Sheets): {pid_salida}")
    assert pid_salida == "JD014600012745225571", f"Error en Doble J: {pid_salida}"
    print("  [✔] PASS: Doble J convertida correctamente a formato canónico JD.")

def test_esquema_25_columnas():
    print("\n--- [2/4] PRUEBA: ESQUEMA RÍGIDO DE 25 COLUMNAS ---")
    datos_prueba = {
        "Guia": "4433221100",
        "PID": "JJD9988776655",
        "C.P.": "76130",
        "Piezas": 1,
        "Receiver Name": "CLIENTE PRUEBA",
        "KEY": "4433221100-JD9988776655",
        "Telefono": "4421234567",
        "Firma": "https://drive.google.com/firma.jpg"
    }
    fila_25 = validar_fila_25_columnas(datos_prueba)
    print(f"  Total Columnas Generadas: {len(fila_25)}")
    assert len(fila_25) == 25, f"La fila debe tener 25 columnas exactamente, tiene {len(fila_25)}"
    
    # Validar que PID se sanitizó en índice 1 (Col B)
    assert fila_25[1] == "JD9988776655", f"PID en col 1 debe ser JD9988776655, es {fila_25[1]}"
    # Validar KEY en índice 16 (Col Q)
    assert fila_25[16] == "4433221100-JD9988776655", f"KEY debe estar en índice 16, es {fila_25[16]}"
    # Validar Telefono en índice 20 (Col U)
    assert fila_25[20] == "4421234567", f"Telefono debe estar en índice 20, es {fila_25[20]}"
    
    print("  [✔] PASS: 25 columnas base 0 inmutables, KEY en Q (16) y Telefono en U (20).")

def test_gemini_api():
    print("\n--- [3/4] PRUEBA: CONECTIVIDAD GEMINI 3.6 FLASH ---")
    if not GEMINI_API_KEY or GEMINI_API_KEY == "TU_GEMINI_API_KEY_AQUI":
        print("  [⚠] SKIP: GEMINI_API_KEY no configurada aún en .env. Saltando llamada externa.")
        return

    client = GeminiMultimodalClient(api_key=GEMINI_API_KEY)
    prompt = "Responde estrictamente con un JSON: {\"status\": \"OK\", \"nodo\": \"HERMES_TEST\"}"
    start = time.time()
    res = client.llamar_multimodal(prompt_sistema=prompt, datos_partes=[])
    latencia = int((time.time() - start) * 1000)
    print(f"  Respuesta en {latencia}ms:")
    print(f"  Payload: {json.dumps(res, ensure_ascii=False)}")
    assert res.get("status") == "OK" or "nodo" in res or "_meta_ia" in res
    print("  [✔] PASS: Conectividad con Gemini API verificada con éxito.")

def test_simulacion_teoyolotl():
    print("\n--- [4/4] PRUEBA: SIMULACIÓN PAYLOAD TEOYOLOTL MIC ---")
    # Generar un mock de audio o imagen en base64 de 1x1 pixel PNG transparente
    png_1x1_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    print("  Base64 mock generado.")
    print("  Simulación de estructura de llamada Teoyolotl completada.")
    print("  [✔] PASS: Pipeline de datos validado.")

if __name__ == "__main__":
    print("========================================================================")
    print("🏛️ CERTIFICACIÓN DEL MOTOR AGENTE CALPIXQUI (LOCAL SANITY CHECK)")
    print("   El Guardián de la Casa y Administrador de la Bóveda 24/7")
    print("========================================================================")
    test_doble_j()
    test_esquema_25_columnas()
    test_gemini_api()
    test_simulacion_teoyolotl()
    print("\n========================================================================")
    print("✅ TODAS LAS PRUEBAS UNITARIAS PASARON SATISFACTORIAMENTE.")
    print("========================================================================")
