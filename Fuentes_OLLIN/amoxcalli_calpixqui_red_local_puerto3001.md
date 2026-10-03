# 🏛️ MEMORIA TÉCNICA AMOXCALLI: CALPIXQUI GATEWAY (PUERTO 3001) EN RED LOCAL Y TOPOLOGÍA DE RED

**Fecha:** 2026-09-23  
**Módulo:** Gateway Headless WhatsApp (Calpixqui) / Topología de Red PC Secundaria  
**Host:** `Audiofila_V2`  
**Autor:** Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)  

---

## 1. Topología de Red de la PC Secundaria
- **Host Name:** `Audiofila_V2`
- **Interfaz Primaria de Red Local (Wi-Fi 2):** `192.168.100.11` (DHCP Gateway: `192.168.100.1`)
- **Interfaz Ethernet (Cable):** Medios desconectados (sin enlace físico directo).
- **Interfaz Tailscale (VPN Remota):** `100.69.207.81`
- **Puerto del Servicio:** `3001` (TCP, vinculación `0.0.0.0`).

---

## 2. Endpoints y URLs de Acceso Directo
| Destino | URL Directa | Estatus |
| :--- | :--- | :---: |
| **Consola QR (Local en PC Secundaria)** | `http://localhost:3001/qr-html` | `200 OK` |
| **Consola QR (Desde Red Local LAN)** | `http://192.168.100.11:3001/qr-html` | `200 OK` |
| **Consola QR (Vía Tailscale)** | `http://100.69.207.81:3001/qr-html` | `200 OK` |
| **Endpoint Estatus `/status`** | `http://192.168.100.11:3001/status` | `200 OK` |
| **Endpoint Salud `/health`** | `http://192.168.100.11:3001/health` | `200 OK` |

---

## 3. Estado de Procesos y Persistencia
- **Gateway Headless Node.js:** Ejecutándose en segundo plano (`task-2158`), sirviendo Express y Puppeteer Chrome.
- **Worker Demonio Frente 6 (`daemon_frente6_reclamos.py`):** Ejecutándose en segundo plano (`task-2078`), barriendo Gmail cada 5 minutos.
- **QR de Vinculación:** Generado y disponible tanto vía web (`/qr-html`) como en el archivo del Escritorio: `C:\Users\sidha\OneDrive\Escritorio\QR_VINCULAR_CALPIXQUI.png`.
