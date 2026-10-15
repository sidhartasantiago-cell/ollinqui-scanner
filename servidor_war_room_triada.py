# -*- coding: utf-8 -*-
"""
===============================================================================
🏛️ SERVIDOR WAR ROOM TRÍADA OLLIN v1.0 (MULTI-FRENTE & SANDBOX LOCAL)
===============================================================================
Orquestador local para el Laboratorio Distribuido de Ingeniería de Arauto Express:
- Conecta con OpenRouter (DeepSeek R1, DeepSeek V3, Qwen 2.5 Coder 32B) con
  Auto-Fallback inteligente anti-404/502.
- Conecta con Nodos Mesh OLLIN (Tlacuilo Ollama, Calpixqui/Hermes, Chikahua).
- Ejecuta código y suites de pruebas unitarias localmente en Node.js y Python.
- Sincroniza dictámenes certificados en 1 clic hacia Fuentes_OLLIN y Amoxcalli Drive.
===============================================================================
"""

import os
import sys
import json
import time
import socket
import tempfile
import subprocess
import urllib.request
import urllib.error
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PORT = 8095
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FUENTES_LOCAL_DIR = os.path.join(BASE_DIR, "Fuentes_OLLIN")
AMOXCALLI_DRIVE_DIR = r"g:\Mi unidad\Fuentes_NotebookLM_Amoxcalli_AE"
BITACORA_MAESTRA_PATH = os.path.join(
    AMOXCALLI_DRIVE_DIR, "AMOXCALLI_BITACORA_MAESTRA_SISTEMAS_Y_OPERACIONES.md"
)

# API Key configurada por el Tlayacanqui para OpenRouter
OPENROUTER_API_KEY = os.environ.get(
    "OPENROUTER_API_KEY",
    "OPENROUTER_API_KEY_ENV",
)

# Directorio de Nodos Mesh Tailscale
MESH_NODES = {
    "tlacuilo": {"name": "Tlacuilo (PC-C Ollama)", "host": "100.88.199.126", "port": 8089},
    "calpixqui": {"name": "Calpixqui / Hermes (PC-B)", "host": "100.107.18.69", "port": 8088},
    "chikahua": {"name": "Chikahua ARM (Doogee V30)", "host": "100.116.189.87", "port": 8087},
}

# Cadena de Fallback inteligente para garantizar cero atorones 404/502
MODEL_FALLBACKS = {
    "qwen/qwen-2.5-coder-32b-instruct": [
        "qwen/qwen-2.5-coder-32b-instruct",
        "qwen/qwen3-coder",
        "deepseek/deepseek-chat",
    ],
    "deepseek/deepseek-r1": [
        "deepseek/deepseek-r1",
        "deepseek/deepseek-chat",
    ],
    "deepseek/deepseek-chat": [
        "deepseek/deepseek-chat",
        "qwen/qwen-2.5-coder-32b-instruct",
    ],
}


def check_tcp_port(host, port, timeout=1.2):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


def call_openrouter(model_id, messages, temperature=0.2, max_tokens=4096):
    candidates = MODEL_FALLBACKS.get(model_id, [model_id, "deepseek/deepseek-chat"])
    last_err = None

    for candidate in candidates:
        payload = {
            "model": candidate,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://127.0.0.1:8095",
                "X-Title": "OLLIN War Room Triada",
            },
        )
        try:
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=90) as resp:
                raw = resp.read().decode("utf-8")
                data = json.loads(raw)
                elapsed = int((time.time() - t0) * 1000)

                if "error" in data:
                    last_err = data["error"].get("message", str(data["error"]))
                    continue

                choice = (data.get("choices") or [{}])[0]
                msg = choice.get("message") or {}
                content = msg.get("content") or ""
                reasoning = msg.get("reasoning") or ""
                usage = data.get("usage") or {}

                return {
                    "ok": True,
                    "model_used": data.get("model", candidate),
                    "provider": data.get("provider", "OpenRouter"),
                    "fallback_applied": candidate != model_id,
                    "content": content,
                    "reasoning": reasoning,
                    "usage": usage,
                    "elapsed_ms": elapsed,
                }
        except urllib.error.HTTPError as e:
            err_body = ""
            try:
                err_body = e.read().decode("utf-8")
            except Exception:
                pass
            last_err = f"HTTP {e.code}: {err_body[:300]}"
            continue
        except Exception as e:
            last_err = str(e)
            continue

    return {"ok": False, "error": last_err or "Fallo desconocido al invocar modelo"}


def execute_sandbox_tests(code_str, language="javascript"):
    t0 = time.time()
    suffix = ".js" if language == "javascript" else ".py"
    cmd_bin = "node" if language == "javascript" else sys.executable

    fd, temp_path = tempfile.mkstemp(suffix=suffix, prefix="ollin_triada_test_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(code_str)

        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"

        proc = subprocess.run(
            [cmd_bin, temp_path],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=20,
            cwd=BASE_DIR,
            env=env,
        )
        elapsed = int((time.time() - t0) * 1000)
        return {
            "ok": proc.returncode == 0,
            "exit_code": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "elapsed_ms": elapsed,
        }
    except subprocess.TimeoutExpired:
        return {
            "ok": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": "⏱️ Timeout: La ejecución superó el límite de seguridad de 20 segundos.",
            "elapsed_ms": 20000,
        }
    except Exception as e:
        return {
            "ok": False,
            "exit_code": -2,
            "stdout": "",
            "stderr": f"Error al ejecutar sandbox: {e}",
            "elapsed_ms": int((time.time() - t0) * 1000),
        }
    finally:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass


class WarRoomHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_json(self, obj, status=200):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path in ("/", "/index.html", "/war-room"):
            html_path = os.path.join(BASE_DIR, "consola_war_room_triada.html")
            if os.path.exists(html_path):
                with open(html_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        if self.path.startswith("/ollin_thinking_orbs.js"):
            js_path = os.path.join(BASE_DIR, "ollin_thinking_orbs.js")
            if os.path.exists(js_path):
                with open(js_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        if self.path == "/api/status":
            nodes_state = {}
            for k, info in MESH_NODES.items():
                nodes_state[k] = {
                    "name": info["name"],
                    "ip": f"{info['host']}:{info['port']}",
                    "online": check_tcp_port(info["host"], info["port"]),
                }

            or_info = {"online": False, "usage": 0, "is_free_tier": False}
            try:
                req = urllib.request.Request(
                    "https://openrouter.ai/api/v1/auth/key",
                    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
                )
                with urllib.request.urlopen(req, timeout=4) as resp:
                    kdata = json.loads(resp.read().decode("utf-8")).get("data", {})
                    or_info = {
                        "online": True,
                        "usage": round(float(kdata.get("usage", 0) or 0), 4),
                        "is_free_tier": kdata.get("is_free_tier", False),
                    }
            except Exception:
                pass

            self._send_json({
                "ok": True,
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "openrouter": or_info,
                "nodes": nodes_state,
            })
            return

        if self.path == "/api/ecis_live":
            try:
                import base64
                remote_py = r'''
import os, glob, json
from datetime import datetime

hoy_str = datetime.now().strftime("%d%m%Y")
csv_files = glob.glob(f"G:/Mi unidad/QRO CAPTURA MASIVA/{hoy_str}*.csv")
csv_files.sort()
archivos_hoy = []
total_eventos_hoy = 0
for f in csv_files:
    with open(f, "r", encoding="utf-8", errors="replace") as fp:
        lines = [l.strip() for l in fp.readlines() if l.strip()]
    ev = max(0, len(lines) - 1)
    total_eventos_hoy += ev
    mtime = datetime.fromtimestamp(os.path.getmtime(f)).strftime("%H:%M:%S")
    archivos_hoy.append({"hora": mtime, "archivo": os.path.basename(f), "eventos": ev})

log_tail = ""
log_path = r"C:\OLLIN_CALPIXQUI\planificador_ecis.log"
if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8", errors="replace") as lf:
        log_tail = lf.read()[-2500:]

hist_count = 0
ultimos_pids = []
hist_path = r"C:\OLLIN_CALPIXQUI\ecis_subidos_historico.json"
if os.path.exists(hist_path):
    with open(hist_path, "r", encoding="utf-8", errors="replace") as hf:
        hdata = json.load(hf)
        hist_count = len(hdata)
        ultimos_pids = hdata[-15:]

print(json.dumps({
    "ok": True,
    "fecha": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "total_archivos_hoy": len(archivos_hoy),
    "total_eventos_hoy": total_eventos_hoy,
    "historico_acumulado": hist_count,
    "archivos_hoy": archivos_hoy,
    "ultimos_pids": ultimos_pids,
    "log_tail": log_tail
}, ensure_ascii=False))
'''
                b64 = base64.b64encode(remote_py.encode("utf-8")).decode("ascii")
                cmd = f'powershell -NoProfile -Command "$bytes = [Convert]::FromBase64String(\'{b64}\'); [IO.File]::WriteAllBytes(\'C:\\OLLIN_CALPIXQUI\\temp_ecis_audit.py\', $bytes); python C:\\OLLIN_CALPIXQUI\\temp_ecis_audit.py"'
                req = urllib.request.Request(
                    "http://100.107.18.69:8088/exec",
                    data=json.dumps({"cmd": cmd}).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    rdata = json.loads(resp.read().decode("utf-8"))
                    stdout_str = (rdata.get("stdout") or "").strip()
                    parsed = json.loads(stdout_str)
                    self._send_json(parsed)
                    return
            except Exception as e:
                self._send_json({"ok": False, "error": f"No se pudo consultar Calpixqui ECIS: {e}"})
                return

        return super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        try:
            body = json.loads(raw_body)
        except Exception:
            body = {}

        if self.path == "/api/chat":
            model_id = body.get("model", "deepseek/deepseek-chat")
            messages = body.get("messages", [])
            temperature = float(body.get("temperature", 0.2))
            res = call_openrouter(model_id, messages, temperature=temperature)
            self._send_json(res)
            return

        if self.path == "/api/run_tests":
            code = body.get("code", "")
            language = body.get("language", "javascript")
            res = execute_sandbox_tests(code, language=language)
            self._send_json(res)
            return

        if self.path == "/api/save_amoxcalli":
            title = body.get("title", "Consenso Triada").strip()
            problem = body.get("problem", "").strip()
            r1_notes = body.get("r1_notes", "").strip()
            v3_code = body.get("v3_code", "").strip()
            qwen_tests = body.get("qwen_tests", "").strip()
            test_output = body.get("test_output", "").strip()

            now_str = datetime.now().strftime("%Y-%m-%d")
            ts_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            slug = "".join(c if c.isalnum() else "_" for c in title.lower()).strip("_")[:40] or "consenso"
            filename = f"amoxcalli_war_room_{slug}_{now_str}.md"

            md_content = f"""# 🏛️ AMOXCALLI: DICTAMEN DE SALA DE GUERRA TRÍADA — {title.upper()}
## Ecosistema OLLIN | Certificación Multi-Agente (DeepSeek R1 + V3 + Qwen + Sandbox Local)
**Fecha:** {ts_str}  
**Autoridad:** Tlayacanqui Sidharta Santiago  

---

### 1. PLANTEAMIENTO DEL FRENTE
```text
{problem}
```

---

### 2. AUDITORÍA PERICIAL DE CASOS BORDE (DEEPSEEK R1)
{r1_notes}

---

### 3. CÓDIGO DE PRODUCCIÓN BLINDADO (DEEPSEEK V3)
```javascript
{v3_code}
```

---

### 4. BATERÍA DE PRUEBAS UNITARIAS (QWEN 2.5 CODER)
```javascript
{qwen_tests}
```

---

### 5. RESULTADO DE EJECUCIÓN EN SANDBOX LOCAL
```text
{test_output}
```
"""
            os.makedirs(FUENTES_LOCAL_DIR, exist_ok=True)
            local_file = os.path.join(FUENTES_LOCAL_DIR, filename)
            with open(local_file, "w", encoding="utf-8") as f:
                f.write(md_content)

            drive_saved = False
            drive_file = os.path.join(AMOXCALLI_DRIVE_DIR, filename)
            try:
                if os.path.exists(AMOXCALLI_DRIVE_DIR):
                    with open(drive_file, "w", encoding="utf-8") as f:
                        f.write(md_content)
                    if os.path.exists(BITACORA_MAESTRA_PATH):
                        entry = (
                            f"\n\n---\n\n## 🏛️ [{ts_str}] HITO SALA DE GUERRA TRÍADA: {title.upper()}\n"
                            f"- **Archivo Canónico:** `{filename}`\n"
                            f"- **Certificación Sandbox Local:**\n```text\n{test_output[:400]}\n```\n"
                        )
                        with open(BITACORA_MAESTRA_PATH, "a", encoding="utf-8") as bf:
                            bf.write(entry)
                    drive_saved = True
            except Exception as e:
                drive_file = f"Error espejo Drive: {e}"

            self._send_json({
                "ok": True,
                "filename": filename,
                "local_path": local_file,
                "drive_saved": drive_saved,
                "drive_path": drive_file,
            })
            return

        self._send_json({"ok": False, "error": "Ruta no encontrada"}, status=404)


if __name__ == "__main__":
    print(f"==================================================================")
    print(f"🏛️ SALA DE GUERRA TRÍADA OLLIN v1.0 ACTIVA EN: http://127.0.0.1:{PORT}")
    print(f"==================================================================")
    server = ThreadingHTTPServer(("127.0.0.1", PORT), WarRoomHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nCerrando Sala de Guerra...")
        server.server_close()
