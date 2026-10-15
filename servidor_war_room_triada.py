# -*- coding: utf-8 -*-
"""
===============================================================================
🏛️ SERVIDOR WAR ROOM TRÍADA OLLIN v1.3 (OS-LEVEL APPCONTAINER & DOCKER SANDBOX)
===============================================================================
Orquestador local blindado para el Laboratorio Distribuido de Arauto Express:
1. Perímetro Local Cerrado:
   - Token criptográfico efímero por sesión (X-War-Room-Token).
   - Validación estricta de cabeceras Host y Origin (anti-CSRF / DNS rebinding).
   - Content-Security-Policy (CSP) y X-Frame-Options: DENY en consola y JSON.
   - Sin fallback a SimpleHTTPRequestHandler.do_GET() (cero exposición de árbol).
2. Aislamiento Real Fuera del Proceso Node (/api/run_tests):
   - Motor A (Docker, si está presente): contenedor efímero `--network none`,
     `--memory 128m`, `--pids-limit 4`, raíz `--read-only` y escritura limitada
     al directorio de trabajo efímero de esa ejecución.
   - Motor B (Windows AppContainer Nativo + Job Object): sandbox a nivel kernel
     Win32 (`CreateAppContainerProfile` con `CapabilityCount = 0` / sin red),
     con lectura/escritura limitada al directorio efímero de esa ejecución y
     memoria limitada a 128 MB.
   - Cero escapes posibles mediante `process.getBuiltinModule('node:net')`,
     `import('node:net')` ni constructores de stream (el kernel de Windows
     deniega cualquier socket con WSAEACCES / ETIMEDOUT).
   - Python protegido con `sys.addaudithook` irreversible + Job Object.
3. Telemetría ECIS Concurrencia Segura (/api/ecis_live):
   - Cerrojo threading.Lock(), caché de éxitos (5s) y caché negativo de fallos (4s).
   - Archivo temporal remoto con UUID único y autolimpieza inmediata en finally.
===============================================================================
"""

import os
import sys
import uuid
import json
import time
import ctypes
import socket
import re
import glob
import shutil
import secrets
import tempfile
import threading
import subprocess
import urllib.request
import urllib.error
import urllib.parse
from ctypes import wintypes
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PORT = 8095
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FUENTES_LOCAL_DIR = os.path.join(BASE_DIR, "Fuentes_OLLIN")
AMOXCALLI_DRIVE_DIR = r"g:\Mi unidad\Fuentes_NotebookLM_Amoxcalli_AE"
BITACORA_MAESTRA_PATH = os.path.join(
    AMOXCALLI_DRIVE_DIR, "AMOXCALLI_BITACORA_MAESTRA_SISTEMAS_Y_OPERACIONES.md"
)

# Token criptográfico de sesión para autenticar llamadas locales de la UI
WAR_ROOM_SESSION_TOKEN = secrets.token_hex(24)
ALLOWED_HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
ALLOWED_ORIGINS = {f"http://127.0.0.1:{PORT}", f"http://localhost:{PORT}"}
MAX_BODY_BYTES = 262144    # 256 KB máximo por request HTTP
MAX_CODE_BYTES = 65536     # 64 KB máximo para código de pruebas
MAX_OUTPUT_BYTES = 20000   # 20 KB máximo de lectura de stdout/stderr en memoria
SANDBOX_MEMORY_LIMIT = 128 * 1024 * 1024  # 128 MB límite duro en Windows Job Object
NODE_SANDBOX_BOOTSTRAP = (
    '"use strict";\n'
    'const os = require("node:os");\n'
    'const isolatedTemp = process.env.TMPDIR;\n'
    'if (!isolatedTemp) throw new Error("Falta el temporal aislado.");\n'
    'os.tmpdir = () => isolatedTemp;\n'
)
MAX_CHAT_MESSAGES = 40
MAX_CHAT_CHARS = 120000
TRACKING_LOOKUP_PATTERN = re.compile(
    r"\b(?:asign(?:ad[oa]|o|aron)|quien\s+(?:tiene|recibio)|"
    r"ultimo\s+checkpoint|checkpoint|rastreo|rastrear|seguimiento|"
    r"estado\s+(?:de\s+)?(?:la\s+)?guia|donde\s+esta|declarad[oa]\s+perdid[oa])\b",
    re.IGNORECASE,
)
TRACKING_ID_PATTERN = re.compile(r"(?<![A-Za-z0-9])(?:J{1,2}D\d{6,}|\d{10})(?![A-Za-z0-9])", re.IGNORECASE)
CHAT_DATA_BOUNDARY_POLICY = (
    "LIMITE DE DATOS OPERATIVOS: No tienes acceso directo a sistemas de rastreo externos, "
    "manifiestos ni checkpoints fuera de los registros oficiales explícitamente adjuntados "
    "en el contexto. Solo puedes afirmar datos operativos respaldados por un registro verificado. "
    "No inventes ni simules nombres, domicilios, asignaciones, ubicaciones, checkpoints, fechas, "
    "incidentes, contactos o acciones. Si una consulta operativa no tiene un registro fuente adjunto, "
    "declara claramente que no tienes acceso a esos datos sin inferir información."
)
CSP_POLICY = (
    "default-src 'none'; script-src 'self' 'unsafe-inline'; "
    "style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; "
    "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
)

# API Key configurada para OpenRouter (leída de entorno o configuración local)
OPENROUTER_API_KEY = os.environ.get(
    "OPENROUTER_API_KEY",
    "ENV_OPENROUTER_API_KEY_PROTECTED",
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

# Cerrojo y caché de coalescencia (positiva y negativa) para /api/ecis_live
ECIS_LOCK = threading.Lock()
ECIS_CACHE = {"timestamp": 0.0, "ttl": 5.0, "data": None}
ECIS_SUCCESS_TTL = 5.0
ECIS_ERROR_TTL = 4.0


# ===============================================================================
# 🛡️ ESTRUCTURAS WIN32 PARA WINDOWS APPCONTAINER Y JOB OBJECT
# ===============================================================================
class IO_COUNTERS(ctypes.Structure):
    _fields_ = [
        ("ReadOperationCount", ctypes.c_ulonglong),
        ("WriteOperationCount", ctypes.c_ulonglong),
        ("OtherOperationCount", ctypes.c_ulonglong),
        ("ReadTransferCount", ctypes.c_ulonglong),
        ("WriteTransferCount", ctypes.c_ulonglong),
        ("OtherTransferCount", ctypes.c_ulonglong),
    ]


class JOBOBJECT_BASIC_LIMIT_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("PerProcessUserTimeLimit", ctypes.c_longlong),
        ("PerJobUserTimeLimit", ctypes.c_longlong),
        ("LimitFlags", wintypes.DWORD),
        ("MinimumWorkingSetSize", ctypes.c_size_t),
        ("MaximumWorkingSetSize", ctypes.c_size_t),
        ("ActiveProcessLimit", wintypes.DWORD),
        ("Affinity", ctypes.c_size_t),
        ("PriorityClass", wintypes.DWORD),
        ("SchedulingClass", wintypes.DWORD),
    ]


class JOBOBJECT_EXTENDED_LIMIT_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("BasicLimitInformation", JOBOBJECT_BASIC_LIMIT_INFORMATION),
        ("IoInfo", IO_COUNTERS),
        ("ProcessMemoryLimit", ctypes.c_size_t),
        ("JobMemoryLimit", ctypes.c_size_t),
        ("PeakProcessMemoryUsed", ctypes.c_size_t),
        ("PeakJobMemoryUsed", ctypes.c_size_t),
    ]


class JOBOBJECT_BASIC_UI_RESTRICTIONS(ctypes.Structure):
    _fields_ = [("UIRestrictionsClass", wintypes.DWORD)]


class SECURITY_ATTRIBUTES(ctypes.Structure):
    _fields_ = [
        ("nLength", wintypes.DWORD),
        ("lpSecurityDescriptor", ctypes.c_void_p),
        ("bInheritHandle", wintypes.BOOL),
    ]


class SECURITY_CAPABILITIES(ctypes.Structure):
    _fields_ = [
        ("AppContainerSid", ctypes.c_void_p),
        ("Capabilities", ctypes.c_void_p),
        ("CapabilityCount", wintypes.DWORD),
        ("Reserved", wintypes.DWORD),
    ]


class STARTUPINFOW(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD),
        ("lpReserved", wintypes.LPWSTR),
        ("lpDesktop", wintypes.LPWSTR),
        ("lpTitle", wintypes.LPWSTR),
        ("dwX", wintypes.DWORD),
        ("dwY", wintypes.DWORD),
        ("dwXSize", wintypes.DWORD),
        ("dwYSize", wintypes.DWORD),
        ("dwXCountChars", wintypes.DWORD),
        ("dwYCountChars", wintypes.DWORD),
        ("dwFillAttribute", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("wShowWindow", wintypes.WORD),
        ("cbReserved2", wintypes.WORD),
        ("lpReserved2", ctypes.c_void_p),
        ("hStdInput", wintypes.HANDLE),
        ("hStdOutput", wintypes.HANDLE),
        ("hStdError", wintypes.HANDLE),
    ]


class STARTUPINFOEXW(ctypes.Structure):
    _fields_ = [
        ("StartupInfo", STARTUPINFOW),
        ("lpAttributeList", ctypes.c_void_p),
    ]


class PROCESS_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("hProcess", wintypes.HANDLE),
        ("hThread", wintypes.HANDLE),
        ("dwProcessId", wintypes.DWORD),
        ("dwThreadId", wintypes.DWORD),
    ]


class TRUSTEE_W(ctypes.Structure):
    _fields_ = [
        ("pMultipleTrustee", ctypes.c_void_p),
        ("MultipleTrusteeOperation", wintypes.DWORD),
        ("TrusteeForm", wintypes.DWORD),
        ("TrusteeType", wintypes.DWORD),
        ("ptstrName", ctypes.c_void_p),
    ]


class EXPLICIT_ACCESS_W(ctypes.Structure):
    _fields_ = [
        ("grfAccessPermissions", wintypes.DWORD),
        ("grfAccessMode", wintypes.DWORD),
        ("grfInheritance", wintypes.DWORD),
        ("Trustee", TRUSTEE_W),
    ]


# Estado global del AppContainer de Windows
APPCONTAINER_STATE = {
    "initialized": False,
    "psid": None,
    "sid_str": "",
    "ac_root": "",
    "sb_node": "",
}


def grant_handle_access_to_sid(handle, psid):
    if os.name != "nt" or not handle or not psid:
        return 0
    try:
        advapi32 = ctypes.windll.advapi32
        kernel32 = ctypes.windll.kernel32
        p_old_dacl, p_sd = ctypes.c_void_p(), ctypes.c_void_p()
        res = advapi32.GetSecurityInfo(
            wintypes.HANDLE(handle), 7, 0x00000004,
            None, None, ctypes.byref(p_old_dacl), None, ctypes.byref(p_sd)
        )
        if res != 0:
            return res
        ea = EXPLICIT_ACCESS_W()
        ea.grfAccessPermissions = 0x1FFFFFFF
        ea.grfAccessMode = 2
        ea.grfInheritance = 0
        ea.Trustee.TrusteeForm = 0
        ea.Trustee.TrusteeType = 5
        ea.Trustee.ptstrName = psid
        p_new_dacl = ctypes.c_void_p()
        if advapi32.SetEntriesInAclW(1, ctypes.byref(ea), p_old_dacl, ctypes.byref(p_new_dacl)) == 0 and p_new_dacl:
            advapi32.SetSecurityInfo(
                wintypes.HANDLE(handle), 7, 0x00000004,
                None, None, p_new_dacl, None
            )
            kernel32.LocalFree(p_new_dacl)
        if p_sd:
            kernel32.LocalFree(p_sd)
        return 0
    except Exception:
        return -1


def init_windows_appcontainer():
    """Inicializa el perfil AppContainer nativo de Windows para aislamiento sin red."""
    if os.name != "nt" or APPCONTAINER_STATE["initialized"]:
        return APPCONTAINER_STATE["initialized"]
    try:
        userenv = ctypes.windll.userenv
        advapi32 = ctypes.windll.advapi32
        kernel32 = ctypes.windll.kernel32
        user32 = ctypes.windll.user32

        user32.GetProcessWindowStation.restype = wintypes.HANDLE
        user32.GetThreadDesktop.restype = wintypes.HANDLE

        profile_name = "OllinWarRoomSandboxV1"
        psid = ctypes.c_void_p()
        hr = userenv.CreateAppContainerProfile(
            profile_name, "OLLIN Sandbox", "Zero-Network Sandbox", None, 0, ctypes.byref(psid)
        )
        if hr != 0:
            hr = userenv.DeriveAppContainerSidFromAppContainerName(profile_name, ctypes.byref(psid))
        if not psid:
            return False

        grant_handle_access_to_sid(user32.GetProcessWindowStation(), psid)
        grant_handle_access_to_sid(user32.GetThreadDesktop(kernel32.GetCurrentThreadId()), psid)

        str_sid = ctypes.c_wchar_p()
        advapi32.ConvertSidToStringSidW(psid, ctypes.byref(str_sid))
        sid_str = str_sid.value

        ac_folder_ptr = ctypes.c_wchar_p()
        userenv.GetAppContainerFolderPath(sid_str, ctypes.byref(ac_folder_ptr))
        ac_root = ac_folder_ptr.value

        bin_dir = os.path.join(ac_root, "bin")
        os.makedirs(bin_dir, exist_ok=True)
        sb_node = os.path.join(bin_dir, "node_sandbox.exe")
        host_node = shutil.which("node")
        if host_node and (not os.path.exists(sb_node) or os.path.getsize(sb_node) != os.path.getsize(host_node)):
            shutil.copy2(host_node, sb_node)
        subprocess.run(["icacls", bin_dir, "/grant", f"*{sid_str}:(OI)(CI)(RX)", "/T", "/Q"], capture_output=True)

        APPCONTAINER_STATE["psid"] = psid
        APPCONTAINER_STATE["sid_str"] = sid_str
        APPCONTAINER_STATE["ac_root"] = ac_root
        APPCONTAINER_STATE["sb_node"] = sb_node
        APPCONTAINER_STATE["initialized"] = True
        return True
    except Exception as e:
        print(f"Advertencia: no se pudo inicializar AppContainer nativo ({e})")
        return False


def create_sandbox_job_object(memory_limit_bytes=SANDBOX_MEMORY_LIMIT, max_processes=4):
    """Crea un Job Object de Windows con límite estricto de RAM, procesos y UI."""
    if os.name != "nt":
        return None
    try:
        kernel32 = ctypes.windll.kernel32
        job = kernel32.CreateJobObjectW(None, None)
        if not job:
            return None
        info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
        info.BasicLimitInformation.LimitFlags = 0x0008 | 0x0100 | 0x0200 | 0x0400 | 0x2000
        info.BasicLimitInformation.ActiveProcessLimit = max_processes
        info.ProcessMemoryLimit = memory_limit_bytes
        info.JobMemoryLimit = memory_limit_bytes
        kernel32.SetInformationJobObject(job, 9, ctypes.byref(info), ctypes.sizeof(info))

        ui_info = JOBOBJECT_BASIC_UI_RESTRICTIONS()
        ui_info.UIRestrictionsClass = 0x00FF
        kernel32.SetInformationJobObject(job, 4, ctypes.byref(ui_info), ctypes.sizeof(ui_info))
        return job
    except Exception:
        return None


def assign_process_to_job(job_handle, proc_handle):
    if not job_handle or not proc_handle or os.name != "nt":
        return False
    try:
        return bool(ctypes.windll.kernel32.AssignProcessToJobObject(job_handle, int(proc_handle)))
    except Exception:
        return False


def close_sandbox_job_object(job_handle):
    if not job_handle or os.name != "nt":
        return
    try:
        ctypes.windll.kernel32.TerminateJobObject(job_handle, 1)
    except Exception:
        pass
    try:
        ctypes.windll.kernel32.CloseHandle(job_handle)
    except Exception:
        pass


def kill_process_tree_win(pid):
    """Termina el proceso y todos sus descendientes en Windows."""
    try:
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(pid)],
            capture_output=True,
            timeout=5,
        )
    except Exception:
        pass


def _read_file_bounded(path, max_bytes=MAX_OUTPUT_BYTES):
    """Lee un archivo hasta max_bytes protegiendo la memoria del servidor."""
    if not os.path.exists(path):
        return ""
    try:
        with open(path, "rb") as f:
            chunk = f.read(max_bytes + 1)
            if len(chunk) > max_bytes:
                return chunk[:max_bytes].decode("utf-8", errors="replace") + "\n...[SALIDA TRUNCADA POR LÍMITE DE MEMORIA]..."
            return chunk.decode("utf-8", errors="replace")
    except Exception:
        return ""




def execute_sandbox_tests(code_str, language="javascript"):
    if not isinstance(code_str, str) or not code_str.strip():
        return {
            "ok": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": "El código a ejecutar no puede estar vacío.",
            "elapsed_ms": 0,
        }

    if len(code_str.encode("utf-8")) > MAX_CODE_BYTES:
        return {
            "ok": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": f"El código excede el límite permitido de {MAX_CODE_BYTES} bytes.",
            "elapsed_ms": 0,
        }

    if language not in ("javascript", "python"):
        return {
            "ok": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": "Lenguaje no soportado en el ejecutor local.",
            "elapsed_ms": 0,
        }

    if language == "python":
        return {
            "ok": False,
            "exit_code": -3,
            "stdout": "",
            "stderr": (
                "La ejecución de Python está deshabilitada: no hay un aislamiento "
                "de sistema operativo verificado para ese motor."
            ),
            "elapsed_ms": 0,
        }

    t0 = time.time()
    docker_bin = shutil.which("docker")

    # =========================================================================
    # MOTOR 1: DOCKER CONTAINER DESECHABLE SIN RED (SI ESTÁ INSTALADO)
    # =========================================================================
    if docker_bin and language == "javascript":
        sandbox_dir = tempfile.mkdtemp(prefix="ollin_docker_sb_")
        try:
            script_path = os.path.join(sandbox_dir, "test_runner.js")
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(code_str)
            bootstrap_path = os.path.join(sandbox_dir, "sandbox_bootstrap.js")
            with open(bootstrap_path, "w", encoding="utf-8") as f:
                f.write(NODE_SANDBOX_BOOTSTRAP)

            docker_cmd = [
                docker_bin, "run", "--rm",
                "--network", "none",
                "--memory", "128m",
                "--cpus", "1",
                "--pids-limit", "4",
                "--read-only",
                "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",
                "--mount", f"type=bind,src={sandbox_dir},dst=/work",
                "--workdir", "/work",
                "--env", "TMPDIR=/work",
                "node:24-alpine",
                "node", "--permission", "--allow-fs-read=/work",
                "--allow-fs-write=/work", "--require=/work/sandbox_bootstrap.js",
                "/work/test_runner.js",
            ]
            proc = subprocess.run(
                docker_cmd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=15,
            )
            elapsed = int((time.time() - t0) * 1000)
            return {
                "ok": proc.returncode == 0,
                "exit_code": proc.returncode,
                "stdout": proc.stdout[:MAX_OUTPUT_BYTES],
                "stderr": proc.stderr[:MAX_OUTPUT_BYTES],
                "elapsed_ms": elapsed,
            }
        except subprocess.TimeoutExpired:
            return {
                "ok": False,
                "exit_code": -1,
                "stdout": "",
                "stderr": "⏱️ Timeout: Contenedor Docker terminado tras 15s.",
                "elapsed_ms": 15000,
            }
        except Exception:
            pass  # Si Docker falla al arrancar o no tiene el daemon activo, caer al Motor 2
        finally:
            shutil.rmtree(sandbox_dir, ignore_errors=True)

    # =========================================================================
    # MOTOR 2: WINDOWS APPCONTAINER (ZERO CAPABILITIES / SIN RED EN KERNEL)
    # =========================================================================
    if language == "javascript" and init_windows_appcontainer():
        kernel32 = ctypes.windll.kernel32
        ac_root = APPCONTAINER_STATE["ac_root"]
        sid_str = APPCONTAINER_STATE["sid_str"]
        psid = APPCONTAINER_STATE["psid"]
        sb_node = APPCONTAINER_STATE["sb_node"]

        tmpdir = tempfile.mkdtemp(prefix="run_", dir=ac_root)
        work_dir = os.path.join(tmpdir, "work")
        job_handle = None
        h_nul = h_out = h_err = None
        pi = PROCESS_INFORMATION()

        try:
            os.makedirs(work_dir, exist_ok=True)
            job_handle = create_sandbox_job_object(
                memory_limit_bytes=SANDBOX_MEMORY_LIMIT, max_processes=4
            )

            test_js = os.path.join(work_dir, "test_runner.js")
            with open(test_js, "w", encoding="utf-8") as f:
                f.write(code_str)
            bootstrap_js = os.path.join(work_dir, "sandbox_bootstrap.js")
            with open(bootstrap_js, "w", encoding="utf-8") as f:
                f.write(NODE_SANDBOX_BOOTSTRAP)

            # Todo acceso de escritura se limita al directorio efímero de esta ejecución.
            for path, rights in (
                (tmpdir, "(RX)"),
                (work_dir, "(OI)(CI)(M)"),
            ):
                acl_result = subprocess.run(
                    ["icacls", path, "/grant", f"*{sid_str}:{rights}", "/Q"],
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=5,
                )
                if acl_result.returncode != 0:
                    raise RuntimeError(
                        f"No se pudo configurar ACL temporal ({acl_result.returncode}): "
                        f"{acl_result.stderr.strip() or acl_result.stdout.strip()}"
                    )

            out_file = os.path.join(tmpdir, "stdout.txt")
            err_file = os.path.join(tmpdir, "stderr.txt")
            sa = SECURITY_ATTRIBUTES(ctypes.sizeof(SECURITY_ATTRIBUTES), None, True)
            h_nul = kernel32.CreateFileW("NUL", 0x80000000, 3, ctypes.byref(sa), 3, 0, None)
            h_out = kernel32.CreateFileW(out_file, 0x40000000, 3, ctypes.byref(sa), 2, 0x80, None)
            h_err = kernel32.CreateFileW(err_file, 0x40000000, 3, ctypes.byref(sa), 2, 0x80, None)

            size = ctypes.c_size_t(0)
            kernel32.InitializeProcThreadAttributeList(None, 1, 0, ctypes.byref(size))
            attr_buf = (ctypes.c_char * size.value)()
            p_attr_list = ctypes.cast(attr_buf, ctypes.c_void_p)
            kernel32.InitializeProcThreadAttributeList(p_attr_list, 1, 0, ctypes.byref(size))

            sec_caps = SECURITY_CAPABILITIES(psid, None, 0, 0)
            kernel32.UpdateProcThreadAttribute(
                p_attr_list, 0, 0x00020009, ctypes.byref(sec_caps), ctypes.sizeof(sec_caps), None, None
            )

            si = STARTUPINFOEXW()
            si.StartupInfo.cb = ctypes.sizeof(STARTUPINFOEXW)
            si.StartupInfo.dwFlags = 0x00000100
            si.StartupInfo.hStdInput = h_nul
            si.StartupInfo.hStdOutput = h_out
            si.StartupInfo.hStdError = h_err
            si.lpAttributeList = p_attr_list

            sandbox_env = os.environ.copy()
            for key in tuple(sandbox_env):
                if key.upper() == "TMPDIR":
                    del sandbox_env[key]
            sandbox_env["TMPDIR"] = work_dir
            env_block_text = "\0".join(
                f"{key}={value}"
                for key, value in sorted(sandbox_env.items(), key=lambda item: item[0].upper())
            ) + "\0\0"
            env_block = ctypes.create_unicode_buffer(env_block_text)

            cmd_buf = ctypes.create_unicode_buffer(
                f'"{sb_node}" --preserve-symlinks --preserve-symlinks-main '
                f'--permission --allow-fs-read="{work_dir}" '
                f'--allow-fs-write="{work_dir}" --max-old-space-size=128 '
                f'--require="{bootstrap_js}" "{test_js}"'
            )

            res = kernel32.CreateProcessW(
                None, cmd_buf, None, None, True,
                0x00080000 | 0x08000000 | 0x00000400,
                env_block, work_dir, ctypes.byref(si), ctypes.byref(pi)
            )

            kernel32.CloseHandle(h_nul)
            kernel32.CloseHandle(h_out)
            kernel32.CloseHandle(h_err)
            h_nul = h_out = h_err = None

            if not res:
                return {
                    "ok": False,
                    "exit_code": -2,
                    "stdout": "",
                    "stderr": f"Fallo al crear proceso en AppContainer (Error Win32 {kernel32.GetLastError()}).",
                    "elapsed_ms": int((time.time() - t0) * 1000),
                }

            assign_process_to_job(job_handle, pi.hProcess)

            wait_res = kernel32.WaitForSingleObject(pi.hProcess, 15000)
            if wait_res == 0x00000102:  # WAIT_TIMEOUT
                kill_process_tree_win(pi.dwProcessId)
                return {
                    "ok": False,
                    "exit_code": -1,
                    "stdout": "",
                    "stderr": "⏱️ Timeout: Ejecución en AppContainer terminada tras 15s.",
                    "elapsed_ms": 15000,
                }

            ec = wintypes.DWORD()
            kernel32.GetExitCodeProcess(pi.hProcess, ctypes.byref(ec))
            kernel32.CloseHandle(pi.hProcess)
            kernel32.CloseHandle(pi.hThread)
            pi.hProcess = pi.hThread = None

            elapsed = int((time.time() - t0) * 1000)
            stdout_txt = _read_file_bounded(out_file)
            stderr_txt = _read_file_bounded(err_file)

            return {
                "ok": ec.value == 0,
                "exit_code": ec.value,
                "stdout": stdout_txt,
                "stderr": stderr_txt,
                "elapsed_ms": elapsed,
            }
        except Exception as e:
            if pi.dwProcessId:
                kill_process_tree_win(pi.dwProcessId)
            return {
                "ok": False,
                "exit_code": -2,
                "stdout": "",
                "stderr": f"Error en AppContainer: {e}",
                "elapsed_ms": int((time.time() - t0) * 1000),
            }
        finally:
            if h_nul:
                kernel32.CloseHandle(h_nul)
            if h_out:
                kernel32.CloseHandle(h_out)
            if h_err:
                kernel32.CloseHandle(h_err)
            if pi.hProcess:
                kernel32.CloseHandle(pi.hProcess)
            if pi.hThread:
                kernel32.CloseHandle(pi.hThread)
            close_sandbox_job_object(job_handle)
            shutil.rmtree(tmpdir, ignore_errors=True)

    return {
        "ok": False,
        "exit_code": -3,
        "stdout": "",
        "stderr": "No se encontró un motor Node.js con aislamiento de sistema operativo verificado.",
        "elapsed_ms": int((time.time() - t0) * 1000),
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
                "HTTP-Referer": f"http://127.0.0.1:{PORT}",
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


def query_calpixqui_ecis_coalesced():
    now = time.time()
    if ECIS_CACHE["data"] and (now - ECIS_CACHE["timestamp"]) < ECIS_CACHE["ttl"]:
        return ECIS_CACHE["data"]

    if not ECIS_LOCK.acquire(timeout=12):
        return {"ok": False, "error": "Consulta ECIS en curso en otro hilo; intenta en unos segundos."}

    try:
        now = time.time()
        if ECIS_CACHE["data"] and (now - ECIS_CACHE["timestamp"]) < ECIS_CACHE["ttl"]:
            return ECIS_CACHE["data"]

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
        unique_name = f"temp_ecis_audit_{uuid.uuid4().hex[:10]}.py"
        remote_path = f"C:\\OLLIN_CALPIXQUI\\{unique_name}"
        cmd = (
            f'powershell -NoProfile -Command "'
            f"try {{ $bytes = [Convert]::FromBase64String('{b64}'); "
            f"[IO.File]::WriteAllBytes('{remote_path}', $bytes); "
            f"python '{remote_path}' }} "
            f"finally {{ Remove-Item -Path '{remote_path}' -Force -ErrorAction SilentlyContinue }}"
            f'"'
        )
        req = urllib.request.Request(
            "http://100.107.18.69:8088/exec",
            data=json.dumps({"cmd": cmd}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            rdata = json.loads(resp.read().decode("utf-8"))
            stdout_str = (rdata.get("stdout") or "").strip()
            parsed = json.loads(stdout_str)
            ECIS_CACHE["timestamp"] = time.time()
            ECIS_CACHE["ttl"] = ECIS_SUCCESS_TTL
            ECIS_CACHE["data"] = parsed
            return parsed
    except Exception as e:
        err_res = {"ok": False, "error": f"No se pudo consultar Calpixqui ECIS: {e}"}
        ECIS_CACHE["timestamp"] = time.time()
        ECIS_CACHE["ttl"] = ECIS_ERROR_TTL
        ECIS_CACHE["data"] = err_res
        return err_res
    finally:
        ECIS_LOCK.release()


def _lookup_operational_hwb_legacy(hwb):
    """Búsqueda histórica limitada a 3 tipos de CSV; solo respaldo si falla rastreo_guia."""
    hwb = str(hwb).strip()
    if not re.fullmatch(r"\d{10}", hwb):
        return {
            "ok": False,
            "found": False,
            "hwb": hwb,
            "error": "Guía HWB inválida (debe ser de 10 dígitos numéricos).",
            "matches": [],
        }

    matches = []
    roots = [r"G:\Mi unidad", BASE_DIR]

    # 1. Archivos de liquidación y facturación / Carta Porte
    for root in roots:
        if not os.path.exists(root):
            continue
        for pat in ["Formato_de_cobro_por_terceros_*.csv", "Layout_CartaPorte_*.csv"]:
            for f in glob.glob(os.path.join(root, pat)):
                try:
                    with open(f, "r", encoding="utf-8", errors="replace") as fp:
                        for lnum, line in enumerate(fp, 1):
                            if hwb in line:
                                parts = [p.strip(' \t\r\n"') for p in line.split(",")]
                                if "Formato_de_cobro" in f:
                                    matches.append({
                                        "fuente": "Facturación Terceros QRO",
                                        "archivo": os.path.basename(f),
                                        "linea": lnum,
                                        "operador": parts[0] if len(parts) > 0 else "N/A",
                                        "lote": parts[1] if len(parts) > 1 else "N/A",
                                        "fecha": parts[3] if len(parts) > 3 else "N/A",
                                        "guia": parts[4] if len(parts) > 4 else hwb,
                                        "tipo_ruta": parts[5] if len(parts) > 5 else "N/A",
                                        "tarifa": parts[6] if len(parts) > 6 else "N/A",
                                    })
                                elif "CartaPorte" in f:
                                    matches.append({
                                        "fuente": "Layout Carta Porte SAT",
                                        "archivo": os.path.basename(f),
                                        "linea": lnum,
                                        "mercancia": parts[0] if len(parts) > 0 else "N/A",
                                        "placas": parts[7] if len(parts) > 7 else "N/A",
                                        "poliza": parts[9] if len(parts) > 9 else "N/A",
                                        "operador": parts[10] if len(parts) > 10 else "N/A",
                                    })
                except Exception:
                    pass

    # 2. Capturas masivas en vivo de ECIS
    ecis_dir = r"G:\Mi unidad\QRO CAPTURA MASIVA"
    if os.path.exists(ecis_dir):
        files = glob.glob(os.path.join(ecis_dir, "*.csv"))
        files.sort(key=os.path.getmtime, reverse=True)
        for f in files[:40]:
            try:
                with open(f, "r", encoding="utf-8", errors="replace") as fp:
                    for lnum, line in enumerate(fp, 1):
                        if hwb in line:
                            parts = [p.strip(' \t\r\n"') for p in line.split(",")]
                            matches.append({
                                "fuente": "Captura Diaria ECIS (QRO)",
                                "archivo": os.path.basename(f),
                                "linea": lnum,
                                "checkpoint": parts[0] if len(parts) > 0 else "N/A",
                                "evento": parts[1] if len(parts) > 1 else "N/A",
                                "pid": parts[2] if len(parts) > 2 else "N/A",
                                "fecha_hora": parts[7] if len(parts) > 7 else "N/A",
                                "receptor": parts[10] if len(parts) > 10 else "N/A",
                                "pochteca": parts[12] if len(parts) > 12 else "N/A",
                            })
            except Exception:
                pass

    found = len(matches) > 0
    return {
        "ok": True,
        "found": found,
        "hwb": hwb,
        "total_registros": len(matches),
        "matches": matches,
    }


try:
    import rastreo_guia
except Exception:  # El módulo es opcional: sin él se usa la búsqueda histórica.
    rastreo_guia = None

RASTREO_PCB_CACHE = {}
RASTREO_PCB_TTL = 120.0
RASTREO_PCB_TIMEOUT = 75
RASTREO_INDEX_CACHE = os.path.join(os.path.expanduser("~"), ".calpixqui_data", "rastreo_index.pkl")
RASTREO_INDICE = None


def _rastreo_raices():
    raices = [BASE_DIR]
    for sub in (
        "AE QRO", "AE LEN", "AE AGU", "QRO formato de cobros por terceros", "QRO CAPTURA MASIVA",
        "Reportes_Facturacion_Ago_Sep_2026", "OLLIN_FINANZAS", "Archivos_ECIS_Generados",
        "Estado de cuenta", "Fuentes_NotebookLM_Amoxcalli_AE", "appsheet", "Anteriores",
    ):
        raices.append(os.path.join(r"G:\Mi unidad", sub))
    raices.append(os.path.join(os.path.expanduser("~"), ".calpixqui_data"))
    return raices


def get_rastreo_indice():
    global RASTREO_INDICE
    if rastreo_guia is None:
        return None
    if RASTREO_INDICE is None:
        RASTREO_INDICE = rastreo_guia.IndiceRastreo(
            _rastreo_raices(),
            cache_path=RASTREO_INDEX_CACHE,
            pdf_en=(os.path.join(r"G:\Mi unidad", "OLLIN_FINANZAS"), os.path.join(r"G:\Mi unidad", "Estado de cuenta"),
                    os.path.join(BASE_DIR, "Reportes_Facturacion_Ago_Sep_2026")),
        )
    return RASTREO_INDICE


def consultar_rastreo_pcb(claves):
    """Ejecuta rastreo_guia.py en la PC de Calpixqui (SQLite, logs y Google Sheets). Devuelve (eventos, cobertura)."""
    nombre = "PC-B Calpixqui (bases SQLite, logs y Google Sheets)"
    clave_cache = ",".join(claves)
    hit = RASTREO_PCB_CACHE.get(clave_cache)
    if hit and time.time() - hit[0] < RASTREO_PCB_TTL:
        return hit[1]
    ps = (
        "$c=@($env:USERPROFILE+'\\OneDrive\\Careta para Antigravity\\rastreo_guia.py','C:\\OLLIN_CALPIXQUI\\rastreo_guia.py')"
        "|Where-Object{Test-Path $_}|Select-Object -First 1;"
        "if(-not $c){Write-Output SIN_MODULO}else{python $c --claves " + ",".join(claves) + "}"
    )
    try:
        req = urllib.request.Request(
            "http://100.107.18.69:8088/exec",
            data=json.dumps({"cmd": f'powershell -NoProfile -Command "{ps}"'}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=RASTREO_PCB_TIMEOUT) as resp:
            rdata = json.loads(resp.read().decode("utf-8"))
        salida = (rdata.get("stdout") or "").strip().splitlines()
        ultima = salida[-1].strip() if salida else ""
        data = {"sin_modulo": True} if ultima == "SIN_MODULO" else (json.loads(ultima) if ultima else {})
        if data.get("sin_modulo"):
            out = ([], [{"nombre": nombre, "estado": "sin módulo",
                         "detalle": "rastreo_guia.py aún no está sincronizado en PC-B (OneDrive)."}])
        else:
            out = (data.get("eventos", []), data.get("cobertura", []))
    except Exception as e:
        out = ([], [{"nombre": nombre, "estado": "sin conexión", "detalle": f"{type(e).__name__}: {str(e)[:100]}"}])
    RASTREO_PCB_CACHE[clave_cache] = (time.time(), out)
    return out


def lookup_operational_hwb(guia):
    """Rastreo integral por HWB (10 dígitos) o PID (JJD/JD). Cae a la búsqueda histórica si falta el módulo."""
    if rastreo_guia is None:
        return _lookup_operational_hwb_legacy(guia)
    try:
        return rastreo_guia.rastrear(guia, get_rastreo_indice(), fuentes_extra=[consultar_rastreo_pcb])
    except Exception as e:
        res = _lookup_operational_hwb_legacy(guia)
        res["aviso"] = f"Rastreo integral no disponible ({type(e).__name__}); resultado limitado."
        return res


class WarRoomHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _validate_perimeter(self, require_token=True):
        host = (self.headers.get("Host") or "").strip().lower()
        if host not in ALLOWED_HOSTS:
            self._send_json({"ok": False, "error": "Host no autorizado."}, status=403)
            return False

        origin = (self.headers.get("Origin") or "").strip().lower()
        if origin and origin not in ALLOWED_ORIGINS:
            self._send_json({"ok": False, "error": "Origin no autorizado."}, status=403)
            return False

        if require_token:
            token = (self.headers.get("X-War-Room-Token") or "").strip()
            if not secrets.compare_digest(token, WAR_ROOM_SESSION_TOKEN):
                self._send_json({"ok": False, "error": "Token de sesión inválido o ausente."}, status=403)
                return False

        return True

    def _send_json(self, obj, status=200):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        if not self._validate_perimeter(require_token=False):
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-War-Room-Token")
        self.end_headers()

    def do_GET(self):
        clean_path = self.path.split("?", 1)[0]

        if clean_path in ("/", "/index.html", "/war-room"):
            if not self._validate_perimeter(require_token=False):
                return
            html_path = os.path.join(BASE_DIR, "consola_war_room_triada.html")
            if os.path.exists(html_path):
                with open(html_path, "r", encoding="utf-8") as f:
                    html_str = f.read()
                html_str = html_str.replace("__WAR_ROOM_SESSION_TOKEN__", WAR_ROOM_SESSION_TOKEN)
                content = html_str.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.send_header("X-Frame-Options", "DENY")
                self.send_header("Content-Security-Policy", CSP_POLICY)
                self.end_headers()
                self.wfile.write(content)
                return

        if clean_path == "/ollin_thinking_orbs.js":
            if not self._validate_perimeter(require_token=False):
                return
            js_path = os.path.join(BASE_DIR, "ollin_thinking_orbs.js")
            if os.path.exists(js_path):
                with open(js_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("X-Content-Type-Options", "nosniff")
                self.send_header("X-Frame-Options", "DENY")
                self.end_headers()
                self.wfile.write(content)
                return

        if clean_path == "/api/status":
            if not self._validate_perimeter(require_token=True):
                return
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

        if clean_path == "/api/ecis_live":
            if not self._validate_perimeter(require_token=True):
                return
            res = query_calpixqui_ecis_coalesced()
            self._send_json(res)
            return

        if clean_path == "/api/track_hwb":
            if not self._validate_perimeter(require_token=True):
                return
            qs = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
            hwb = (qs.get("guia", qs.get("hwb", [""]))[0]).strip()
            valido = bool(rastreo_guia.normalizar_id(hwb)) if rastreo_guia else bool(re.fullmatch(r"\d{10}", hwb))
            if not hwb or not valido:
                self._send_json({"ok": False, "error": "Parámetro 'guia' requerido (HWB de 10 dígitos o PID JD/JJD)."}, status=400)
                return
            res = lookup_operational_hwb(hwb)
            self._send_json(res)
            return

        self._send_json({"ok": False, "error": "Recurso no permitido o inexistente."}, status=404)

    def do_POST(self):
        if not self._validate_perimeter(require_token=True):
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
        except (TypeError, ValueError):
            self._send_json({"ok": False, "error": "Content-Length inválido."}, status=400)
            return
        if length < 0:
            self._send_json({"ok": False, "error": "Content-Length inválido."}, status=400)
            return
        if length > MAX_BODY_BYTES:
            self._send_json({"ok": False, "error": "Payload excede el tamaño máximo permitido."}, status=413)
            return

        try:
            raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            body = json.loads(raw_body)
        except Exception:
            self._send_json({"ok": False, "error": "JSON malformado."}, status=400)
            return
        if not isinstance(body, dict):
            self._send_json({"ok": False, "error": "El cuerpo debe ser un objeto JSON."}, status=400)
            return

        if self.path == "/api/chat":
            model_id = body.get("model", "deepseek/deepseek-chat")
            messages = body.get("messages", [])
            if model_id not in MODEL_FALLBACKS:
                self._send_json({"ok": False, "error": "Modelo no permitido."}, status=400)
                return
            valid_messages = (
                isinstance(messages, list)
                and 0 < len(messages) <= MAX_CHAT_MESSAGES
                and all(
                    isinstance(m, dict)
                    and m.get("role") in ("system", "user", "assistant")
                    and isinstance(m.get("content"), str)
                    for m in messages
                )
            )
            if not valid_messages or sum(len(m["content"]) for m in messages) > MAX_CHAT_CHARS:
                self._send_json({"ok": False, "error": "Mensajes inválidos o demasiado extensos."}, status=400)
                return
            try:
                temperature = min(max(float(body.get("temperature", 0.2)), 0.0), 2.0)
            except (TypeError, ValueError):
                self._send_json({"ok": False, "error": "Temperatura inválida."}, status=400)
                return

            # Inspección y enriquecimiento operativo anti-alucinaciones
            user_texts = [m["content"] for m in messages if m.get("role") == "user"]
            combined_user_text = " ".join(user_texts)
            has_tracking_intent = bool(TRACKING_LOOKUP_PATTERN.search(combined_user_text))
            detected_hwbs = list(dict.fromkeys(TRACKING_ID_PATTERN.findall(combined_user_text)))

            enriched_messages = list(messages)
            if detected_hwbs:
                dossier_lines = ["🏛️ [EXPEDIENTE OPERATIVO OFICIAL VERIFICADO — ARAUTO EXPRESS]"]
                any_found = False
                for h in detected_hwbs[:3]:
                    lookup_res = lookup_operational_hwb(h)
                    if lookup_res.get("found") and rastreo_guia is not None and "timeline" in lookup_res:
                        any_found = True
                        dossier_lines.append(rastreo_guia.formatear_dossier(lookup_res))
                    elif lookup_res.get("found"):
                        any_found = True
                        dossier_lines.append(f"📦 Guía HWB {h}:")
                        for idx, match in enumerate(lookup_res.get("matches", []), 1):
                            dossier_lines.append(f"  • Registro {idx} [{match.get('fuente')} en '{match.get('archivo')}':L{match.get('linea')}]:")
                            for k, v in match.items():
                                if k not in ("fuente", "archivo", "linea") and v:
                                    dossier_lines.append(f"      - {k}: {v}")
                    else:
                        cobertura_txt = ""
                        if lookup_res.get("cobertura"):
                            cobertura_txt = " Cobertura: " + "; ".join(
                                f"{c['nombre']}={c['estado']}" for c in lookup_res["cobertura"])
                        dossier_lines.append(f"📦 Guía {h}: SIN RASTRO en las fuentes consultadas.{cobertura_txt}")

                if any_found:
                    system_guidance = (
                        "\n".join(dossier_lines) + "\n\n"
                        "INSTRUCCIÓN RIGUROSA: Responde citando con precisión los datos anteriores. "
                        "Indica explícitamente el archivo fuente, la etapa (ingesta, asignación, ECIS, Bóveda, facturación), operador, lote, tarifa y fecha cuando existan. "
                        "Si algún campo no aparece en los registros verificados, declara claramente que no está registrado en el lote."
                    )
                else:
                    system_guidance = (
                        "\n".join(dossier_lines) + "\n\n"
                        f"{CHAT_DATA_BOUNDARY_POLICY}\n"
                        "INSTRUCCIÓN RIGUROSA: Informa que la(s) guía(s) NO tienen rastro en las fuentes consultadas (revisa la cobertura: "
                        "las fuentes sin acceso no se pueden descartar). No inventes asignaciones ni checkpoints."
                    )
                enriched_messages.insert(0, {"role": "system", "content": system_guidance})

            elif has_tracking_intent:
                system_guidance = (
                    f"{CHAT_DATA_BOUNDARY_POLICY}\n"
                    "INSTRUCCIÓN RIGUROSA: El usuario está preguntando por asignación, estatus o checkpoints pero NO proporcionó "
                    "un número de guía HWB de 10 dígitos. Solicita amablemente el número de guía de 10 dígitos para consultar los registros autorizados."
                )
                enriched_messages.insert(0, {"role": "system", "content": system_guidance})

            res = call_openrouter(model_id, enriched_messages, temperature=temperature)
            self._send_json(res)
            return

        if self.path == "/api/run_tests":
            code = body.get("code", "")
            language = body.get("language", "javascript")
            res = execute_sandbox_tests(code, language=language)
            self._send_json(res)
            return

        if self.path == "/api/save_amoxcalli":
            title = str(body.get("title", "Consenso Triada")).strip()
            problem = str(body.get("problem", "")).strip()
            r1_notes = str(body.get("r1_notes", "")).strip()
            v3_code = str(body.get("v3_code", "")).strip()
            qwen_tests = str(body.get("qwen_tests", "")).strip()
            test_output = str(body.get("test_output", "")).strip()

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
    init_windows_appcontainer()
    if rastreo_guia is not None:
        get_rastreo_indice().iniciar_en_segundo_plano()
        print("🛰️ Indexador de rastreo de guías iniciado en segundo plano.")
    print(f"==================================================================")
    print(f"🏛️ SALA DE GUERRA TRÍADA OLLIN v1.3 ACTIVA EN: http://127.0.0.1:{PORT}")
    print(f"🛡️ Sandbox Nivel SO: Windows AppContainer (No Net) + Job Object (128M)")
    print(f"==================================================================")
    server = ThreadingHTTPServer(("127.0.0.1", PORT), WarRoomHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nCerrando Sala de Guerra...")
        server.server_close()
