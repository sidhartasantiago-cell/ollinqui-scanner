# 🏛️ AMOXCALLI MEMORIA TÉCNICA: INTEGRACIÓN REMOTA DE PC SECUNDARIA AL DOMINIO ARAUTO.EXPRESS (GCPW v150.0)

**Fecha de Ejecución:** 30 de Septiembre de 2026, 23:35 hrs  
**Operador Responsable:** Antigravity (Pair Programming con Sidharta Santiago)  
**Ámbito:** Infraestructura Tecnológica OLLIN, PC Secundaria (Host: `DESKTOP-8FJMBSG` / `Audiofila_V2`), Google Workspace Corporativo.

---

## 🎯 1. Objetivo y Decisión Arquitectónica
Integrar la estación de trabajo y nodo de automatización 24/7 (PC Secundaria) al dominio oficial corporativo de Google Workspace (`arauto.express`), satisfaciendo de forma incondicional el **Mandato de Tenant Corporativo y Separación de Tres Universos (OLLIN v2026.10)**.

### Beneficios Técnicos y Operativos Obtenidos:
1. **Acceso Nativo a Bóvedas de Google Drive sin Fricción:**  
   Calpixqui deja de operar como un agente externo (`@gmail.com`) expuesto a bloqueos de permisos compartidos o códigos HTTP 403. Al estar matriculada en el dominio, la sincronización de archivos y base de datos con Google Drive para Escritorio opera con privilegios plenos de la organización.
2. **Titularidad Corporativa Inmutable:**  
   Todo artefacto, reporte masivo de cortes, logs y datos logísticos generados por la PC Secundaria nacen bajo la titularidad legal e institucional de `arauto.express`.
3. **Persistencia y Resiliencia de Credenciales:**  
   Evita la caducidad repentina de tokens y bloqueos por pantallas de "Google no ha verificado esta app" en despliegues con Apps Script y Google Cloud Platform.
4. **Gobierno y Seguridad Remota:**  
   Visibilidad del endpoint en la Consola Central de Google Admin (`admin.google.com`), permitiendo monitoreo de inventario y políticas corporativas sin interferir con los daemons locales.

---

## 🛠️ 2. Procedimiento de Despliegue Remoto en Silencio

Para evitar desplazamientos físicos del operador, la instalación se realizó de extremo a extremo a través del túnel cifrado de **Tailscale** conectando al servidor autónomo `server_calpixqui.py` (puerto REST `8088`):

1. **Descarga del Instalador Nativo:**  
   Se descargó el paquete empresarial oficial de 64 bits directo de Google:  
   `https://dl.google.com/credentialprovider/gcpwstandaloneenterprise64.msi` (47,382,528 bytes) en `C:\OLLIN_CALPIXQUI\gcpwstandaloneenterprise64.msi`.
2. **Instalación Desatendida:**  
   Ejecución silenciosa mediante el motor de Windows Installer:  
   `msiexec /i C:\OLLIN_CALPIXQUI\gcpwstandaloneenterprise64.msi /qn /norestart`  
   *Resultado:* Retorno de configuración exitosa (Exit Code `0`, Versión `150.0.7871.100`).
3. **Registro de Proveedor de Seguridad Windows (Credential Provider):**  
   Se vinculó exitosamente el GUID `{0B5BFDF0-4594-47AC-940A-CFC69ABC561C}` con la librería `Gaia1_0.dll`.
4. **Fijación de Directiva de Dominio Exclusivo:**  
   Se inyectó en el Registro de Windows:  
   `HKLM\Software\Google\GCPW\domains_allowed_to_login = "arauto.express"`.

---

## ⚠️ 3. Protocolo Poka-Yoke de Coexistencia Operativa (Alerta para Chats y Agentes)

> [!CAUTION]
> **PROHIBIDO REINICIAR O FORZAR CIERRE DE SESIÓN EN LA PC SECUNDARIA.**  
> La PC Secundaria se encuentra actualmente desbloqueada, ejecutando la sesión activa del usuario `lenovo`. Dentro de esta sesión están corriendo en primer plano los servicios de:
> - Navegador Edge / ECIS DHL (`event-batch`)
> - Servidor Daemon REST Calpixqui (Puerto 8088)
> - WhatsApp Gateway Calpixqui (Puerto 3001)
> - Planificador de Cortes ECIS y vigilancia de Bóvedas.

* **Regla de Transición:** La pantalla de inicio de sesión de Google entrará en función únicamente cuando termine el turno nocturno o cuando el operador decida de forma natural reiniciar o bloquear la máquina. Ningún subagente o script debe forzar `shutdown /r`, `logoff` ni matar la sesión activa.
