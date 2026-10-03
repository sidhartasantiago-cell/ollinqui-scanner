# 🏛️ Amoxcalli — Hito: Gateway Headless WhatsApp CALPIXQUI

**Fecha:** 22-23 Septiembre 2026  
**Ecosistema:** OLLIN / Arauto Express  
**Agente:** Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)

---

## 🧠 Causa Raíz del Fallo Anterior

`pyautogui.press("enter")` requiere foco de ventana activa del navegador.
Sin pantalla activa (servidor headless, tarea en background), el mensaje **nunca se enviaba físicamente**.

Diagnóstico confirmado: el primer intento arrojó `ENVIADO_SESION_LOCAL_WHATSAPP_WEB` en bitácora pero el mensaje NO llegó al celular del Tlayacanqui.

---

## ✅ Solución Implementada: Gateway Headless Node.js

### Arquitectura
```
[calpixqui_worker.py]
        ↓
[hermes_ollin_worker.py → despachar_via_gateway_headless()]
        ↓ HTTP POST localhost:3001/send-message
[whatsapp_gateway/gateway.js (Node.js + whatsapp-web.js)]
        ↓ Puppeteer headless Chrome
[Servidores WhatsApp → Red celular → Teléfono Sidharta]
```

### Stack técnico
- **Node.js:** v24.20.0
- **whatsapp-web.js:** v1.34.7 (patched)
- **puppeteer:** v24.38.0 + Chrome bundled `C:\Users\sidha\.cache\puppeteer\`
- **Puerto:** `localhost:3001`
- **Session dir:** `C:\Users\sidha\.calpixqui_session\` (fuera de OneDrive para evitar EBUSY SQLite)

### Archivos creados/modificados

| Archivo | Descripción |
|---------|-------------|
| `Fuentes_OLLIN/servidor_secundario/whatsapp_gateway/gateway.js` | Gateway headless Node.js con Express REST API |
| `Fuentes_OLLIN/servidor_secundario/whatsapp_gateway/package.json` | Dependencias npm |
| `Fuentes_OLLIN/servidor_secundario/whatsapp_gateway/INICIAR_GATEWAY.bat` | Launcher Windows |
| `hermes_ollin_worker.py` (MODIFICADO) | pyautogui ELIMINADO → `despachar_via_gateway_headless()` + `_normalizar_numero_whatsapp()` |
| `calpixqui_worker.py` (MODIFICADO) | Actualizado para gateway headless |
| `.env` (MODIFICADO) | `WEBHOOK_WHATSAPP_ALERTAS=http://localhost:3001/send-message` |

### Patches en Client.js (whatsapp-web.js/src/Client.js)
1. `framenavigated` handler: wrap `page.evaluate()` en `try/catch` (context destroyed durante nav)
2. `initialize()`: wrap `inject()` en `try/catch` (context destroyed en primera carga)
3. `SESSION_DIR`: movido a `C:\Users\sidha\.calpixqui_session\` (fuera de OneDrive)

---

## 📋 Reglas Operativas Aprendidas

1. **Session SQLite + OneDrive = EBUSY**: Los archivos `.db` de Chromium en OneDrive se bloquean durante la sincronización. Siempre persistir sesiones fuera de OneDrive.
2. **pyautogui = frágil**: Requiere foco de ventana. No usar para automatización en background.
3. **whatsapp-web.js v1.34.7 + Puppeteer v24**: Compatible pero requiere patch de `try/catch` en `Client.js` para evitar crash por "Execution context was destroyed" durante la navegación inicial de WhatsApp Web.
4. **Primera vinculación**: El gateway requiere escaneo de QR una sola vez. La sesión persiste en `LocalAuth` y se restaura automáticamente en reinicios.

---

## 🔑 Cómo Iniciar el Gateway

```powershell
# Paso 1: Iniciar gateway (primera vez → mostrar QR)
cd "C:\Users\sidha\OneDrive\Careta para Antigravity\Fuentes_OLLIN\servidor_secundario\whatsapp_gateway"
node gateway.js

# Paso 2 (primera vez): Escanear QR en WhatsApp → Dispositivos vinculados

# Paso 3: Disparar mensaje de prueba
cd ..\
.venv\Scripts\python.exe calpixqui_worker.py
```

---

## 📊 Variables de Entorno Clave

```env
WEBHOOK_WHATSAPP_ALERTAS=http://localhost:3001/send-message
```

---

## ⏳ Estado al Momento de Sincronización

- ✅ Gateway Node.js operativo en localhost:3001
- ✅ QR generado y disponible (rotación cada ~45s)
- ⏳ Pendiente: Escaneo del QR por Sidharta
- ⏳ Pendiente: Disparo físico del mensaje de prueba y confirmación en red celular
