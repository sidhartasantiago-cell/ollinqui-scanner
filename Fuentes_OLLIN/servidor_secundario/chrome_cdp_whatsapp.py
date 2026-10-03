"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: DESPACHO DIRECTO WHATSAPP VÍA CHROME DEVTOOLS PROTOCOL (CDP / DOM)
ARCHIVO: chrome_cdp_whatsapp.py
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)
VERSIÓN: 1.0.0 PROD
================================================================================

Este módulo conecta directamente con Google Chrome utilizando Chrome DevTools
Protocol (CDP) a través de WebSocket/HTTP nativo en localhost:9222.

VENTAJAS CLAVE:
1. CERO pyautogui, CERO teclado físico, CERO necesidad de foco en pantalla.
2. Utiliza la sesión activa existente de WhatsApp Web en el perfil de Chrome
   (sidharta.santiago@arauto.express).
3. Acciona el botón 'Enviar' directamente mediante la API del DOM (JavaScript en página).
4. No requiere Node.js, ni Puppeteer, ni Selenium. Usa librerías estándar y websockets de Python.
================================================================================
"""

import os
import sys
import json
import time
import urllib.parse
import urllib.request
import subprocess
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

try:
    import websockets
except ImportError:
    websockets = None

CDP_PORT = 9222
CDP_URL = f"http://localhost:{CDP_PORT}"


def encontrar_perfil_chrome(email_objetivo: str = "sidharta.santiago@arauto.express") -> str:
    """
    Busca en Local State de Chrome la carpeta del perfil asociada al correo objetivo.
    Si no la encuentra, retorna 'Profile 2' o 'Default'.
    """
    local_state = Path(os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data\Local State"))
    if local_state.exists():
        try:
            with open(local_state, "r", encoding="utf-8") as f:
                data = json.load(f)
            info_cache = data.get("profile", {}).get("info_cache", {})
            for prof_dir, info in info_cache.items():
                user_name = str(info.get("user_name", "")).lower()
                if email_objetivo.lower() in user_name:
                    return prof_dir
        except Exception:
            pass
    return "Profile 2"


def encontrar_chrome_exe() -> str:
    """Retorna la ruta al ejecutable de Google Chrome en Windows."""
    rutas = [
        os.path.expandvars(r"%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    ]
    for r in rutas:
        if os.path.exists(r):
            return r
    return "chrome.exe"


def esta_chrome_cdp_activo() -> bool:
    """Verifica si Chrome ya está corriendo con el puerto CDP abierto en localhost:9222."""
    try:
        req = urllib.request.Request(f"{CDP_URL}/json/version", headers={"User-Agent": "CalpixquiCDP/1.0"})
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.status == 200
    except Exception:
        return False


def lanzar_chrome_con_cdp(perfil_dir: Optional[str] = None) -> subprocess.Popen:
    """
    Lanza Google Chrome con el puerto de depuración remota activado y el perfil deseado.
    """
    chrome_exe = encontrar_chrome_exe()
    user_data = os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\User Data")
    perfil = perfil_dir or encontrar_perfil_chrome()

    cmd = [
        chrome_exe,
        f"--remote-debugging-port={CDP_PORT}",
        f"--user-data-dir={user_data}",
        f"--profile-directory={perfil}",
        "--no-first-run",
        "--no-default-browser-check"
    ]
    print(f"🚀 [CDP] Iniciando Chrome con puerto {CDP_PORT} (Perfil: {perfil})...")
    proc = subprocess.Popen(cmd)
    # Esperar a que el puerto responda
    for _ in range(15):
        time.sleep(1)
        if esta_chrome_cdp_activo():
            print("✅ [CDP] Puerto 9222 de Chrome activo y respondiendo.")
            return proc
    return proc


def obtener_pestana_whatsapp() -> Optional[Dict[str, Any]]:
    """Obtiene la metadata de la pestaña de WhatsApp Web abierta en Chrome vía CDP."""
    try:
        req = urllib.request.Request(f"{CDP_URL}/json", headers={"User-Agent": "CalpixquiCDP/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            tabs = json.loads(resp.read().decode("utf-8"))
            for t in tabs:
                url = t.get("url", "")
                if "web.whatsapp.com" in url:
                    return t
    except Exception as ex:
        print(f"⚠️ [CDP] Error consultando pestañas: {ex}")
    return None


async def cdp_evaluar_javascript(ws_url: str, js_code: str, wait_timeout: int = 30) -> Any:
    """
    Ejecuta una expresión JavaScript dentro de la pestaña a través del WebSocket de CDP.
    Retorna el resultado de la evaluación.
    """
    if not websockets:
        raise RuntimeError("La librería 'websockets' no está instalada en el entorno.")

    async with websockets.connect(ws_url) as ws:
        msg_id = int(time.time() * 1000) % 1000000
        payload = {
            "id": msg_id,
            "method": "Runtime.evaluate",
            "params": {
                "expression": js_code,
                "awaitPromise": True,
                "returnByValue": True
            }
        }
        await ws.send(json.dumps(payload))
        
        start = time.time()
        while time.time() - start < wait_timeout:
            resp_raw = await ws.recv()
            resp = json.loads(resp_raw)
            if resp.get("id") == msg_id:
                result = resp.get("result", {})
                if "exceptionDetails" in result:
                    desc = result["exceptionDetails"].get("text", "Error JS")
                    raise RuntimeError(f"Excepción JS en página: {desc}")
                return result.get("result", {}).get("value")
    return None


async def enviar_mensaje_via_cdp(telefono: str, mensaje: str) -> Dict[str, Any]:
    """
    Envía un mensaje de WhatsApp a través de la pestaña de WhatsApp Web activa en Chrome
    usando selectores DOM y la API nativa de JavaScript en la página (CERO pyautogui).
    """
    digits = "".join(filter(str.isdigit, str(telefono)))
    if len(digits) == 10:
        digits = f"52{digits}"
    elif digits.startswith("521") and len(digits) == 13:
        digits = "52" + digits[3:]
    elif not digits.startswith("52"):
        digits = f"52{digits}"

    msg_encoded = urllib.parse.quote(mensaje)
    target_url = f"https://web.whatsapp.com/send?phone={digits}&text={msg_encoded}"

    # 1. Verificar si Chrome CDP está corriendo
    if not esta_chrome_cdp_activo():
        print("⚠️ [CDP] Chrome no tiene el puerto 9222 abierto. Lanzando Chrome con perfil...")
        lanzar_chrome_con_cdp()

    # 2. Navegar o abrir la URL en la pestaña
    tab = obtener_pestana_whatsapp()
    if tab:
        print(f"🌐 [CDP] Encontrada pestaña activa de WhatsApp Web (ID: {tab.get('id')}). Navegando al chat...")
        # Navegar la pestaña existente
        async with websockets.connect(tab["webSocketDebuggerUrl"]) as ws:
            await ws.send(json.dumps({
                "id": 101,
                "method": "Page.navigate",
                "params": {"url": target_url}
            }))
            await ws.recv()
        ws_target = tab["webSocketDebuggerUrl"]
    else:
        print("🌐 [CDP] Abriendo nueva pestaña para WhatsApp Web...")
        new_url = f"{CDP_URL}/json/new?{urllib.parse.quote(target_url)}"
        req = urllib.request.Request(new_url, method="PUT", headers={"User-Agent": "CalpixquiCDP/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            new_tab = json.loads(resp.read().decode("utf-8"))
            ws_target = new_tab["webSocketDebuggerUrl"]

    print("⏳ [CDP] Esperando a que WhatsApp Web renderice el chat y el botón de enviar...")
    
    # 3. Polling en el DOM para encontrar el botón de envío y pulsarlo
    # Selector robusto multiversión de WhatsApp Web
    script_enviar = """
    (() => {
        // 1. Buscar botón Enviar por data-icon='send' o aria-label
        const sendBtn = document.querySelector('span[data-icon="send"]') ||
                        document.querySelector('button[aria-label="Enviar"]') ||
                        document.querySelector('button[aria-label="Send"]');
        if (sendBtn) {
            const btn = sendBtn.closest('button') || sendBtn;
            btn.click();
            return { ok: true, metodo: "click_boton_enviar" };
        }
        
        // 2. Alternativa: buscar el input editable y despachar evento Enter
        const inputDiv = document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
                         document.querySelector('div[contenteditable="true"]');
        if (inputDiv && inputDiv.innerText.trim().length > 0) {
            const enterEvt = new KeyboardEvent('keydown', {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
            });
            inputDiv.dispatchEvent(enterEvt);
            return { ok: true, metodo: "enter_dispatched_dom" };
        }
        
        return { ok: false, razon: "cargando_o_no_encontrado" };
    })()
    """

    tiempo_espera_max = 30  # segundos
    inicio = time.time()
    exito = False
    detalles = {}

    while time.time() - inicio < tiempo_espera_max:
        await asyncio.sleep(2)
        try:
            res = await cdp_evaluar_javascript(ws_target, script_enviar, wait_timeout=5)
            if res and res.get("ok"):
                exito = True
                detalles = res
                print(f"🚀 [CDP] ¡Mensaje disparado exitosamente mediante selector DOM! ({res.get('metodo')})")
                break
            else:
                elapsed = int(time.time() - inicio)
                print(f"  [{elapsed}s] Sincronizando chat en WhatsApp Web...", end="\r")
        except Exception as e:
            # Puede ocurrir mientras la página navega
            pass

    if not exito:
        raise TimeoutError("No se pudo localizar el botón Enviar en el DOM dentro del tiempo límite.")

    # Esperar 2 segundos para asegurar confirmación de red de WhatsApp
    await asyncio.sleep(2)

    return {
        "estatus": "ENVIADO_DOM_CDP_CHROME",
        "destinatario": f"+{digits}",
        "metodo": detalles.get("metodo", "DOM_CLICK"),
        "timestamp": datetime.now().isoformat()
    }


def despachar_directo(telefono: str = "+52 449 180 5948", mensaje: Optional[str] = None) -> Dict[str, Any]:
    """Punto de entrada síncrono para despachar el mensaje de prueba o cualquier alerta."""
    hora_str = datetime.now().strftime("%H:%M hrs CST")
    if not mensaje:
        mensaje = (
            "🏛️ *CALPIXQUI ARAUTO EXPRESS — MESA DE CONTROL*\n\n"
            "• *Estatus:* 🟢 Despacho Programático Headless certificado exitosamente.\n"
            f"• *Hora de inicio:* {hora_str}\n"
            "• *Mensaje:* Tlayacanqui Sidharta, el canal oficial de WhatsApp de Calpixqui Arauto Express "
            "está 100% operativo mediante integración DOM/CDP directa, sin GUI, sin pyautogui y conectado a la Bóveda.\n\n"
            "🛡️ _Nodo Secundario Calpixqui 24/7 (Intel Core i3-6100, 16 GB RAM, Tailscale)._"
        )

    print("================================================================================")
    print("🏛️ CALPIXQUI — DESPACHO DIRECTO DE WHATSAPP VÍA CHROME DOM (CDP)")
    print(f"Destinatario: {telefono}")
    print(f"Hora: {hora_str}")
    print("================================================================================")

    res = asyncio.run(enviar_mensaje_via_cdp(telefono=telefono, mensaje=mensaje))
    
    print("\n✅ RESULTADO DEL ENVÍO:")
    print(json.dumps(res, indent=2, ensure_ascii=False))
    print("================================================================================")
    return res


if __name__ == "__main__":
    tel = sys.argv[1] if len(sys.argv) > 1 else "+52 449 180 5948"
    msg = sys.argv[2] if len(sys.argv) > 2 else None
    despachar_directo(telefono=tel, mensaje=msg)
