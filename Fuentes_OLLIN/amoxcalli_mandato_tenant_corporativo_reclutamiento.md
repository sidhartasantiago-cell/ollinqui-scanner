# 🏛️ AMOXCALLI — MEMORIA TÉCNICA CANÓNICA
## REGLA SUPREMA: MANDATO EXCLUSIVO DE TENANT CORPORATIVO @ARAUTO.EXPRESS
### Caso de Estudio: Invalidez de Proyectos Personales (@gmail.com) y Migración a Google Workspace Institucional

**Fecha:** 24 de Septiembre de 2026  
**Módulo:** Gobernanza de Infraestructura / Google Workspace Tenant  
**Cuenta de Despliegue Obligatoria:** `psic.liliana.lopez@arauto.express` / `sidharta.santiago@arauto.express`  
**Autor:** Antigravity (Google DeepMind) & Sidharta Santiago (Tlayacanqui)

---

### 1. Causa Raíz de Seguridad: La Advertencia "Google hasn't verified this app"
Cuando un proyecto de Google Apps Script se crea bajo una cuenta personal `@gmail.com` y es consumido o desplegado dentro de un entorno empresarial de Google Workspace, Google activa protecciones estrictas contra phishing y aplicaciones no verificadas de terceros:
1. **Pantalla de Bloqueo:** *"The app is requesting access to sensitive info in your Google Account. Until the developer (sidharta.santiago@gmail.com) verifies this app with Google, you shouldn't use it."*
2. **Error 403 Forbidden:** Las políticas de compartición externa de la organización bloquean el acceso anónimo o restringen la ejecución cruzada de identidades personales.
3. **Pérdida de Gobernanza:** Los datos recolectados quedan dispersos fuera del perímetro de cumplimiento y respaldo corporativo de Arauto Express.

---

### 2. Principio Rector: Tenant Exclusivo @arauto.express
Queda **ESTRICTAMENTE PROHIBIDO** crear o alojar activos de código, hojas de cálculo o Web Apps en cuentas `@gmail.com`.
Todo activo tecnológico debe ser creado y alojado **nativamente dentro del tenant institucional `@arauto.express`**:
- **Apps Script:** Creado bajo el usuario corporativo correspondiente (ej. Reclutamiento bajo `psic.liliana.lopez@arauto.express`).
- **Bóveda de Datos:** Hojas de cálculo alojadas en las Unidades Compartidas o Mi Unidad del usuario corporativo.
- **Naturaleza de Confianza:** Al crearse dentro del tenant, Google Workspace lo cataloga como **Aplicación Interna del Dominio**, suprimiendo de raíz cualquier advertencia de app no verificada y garantizando la fluidez operativa.

---

### 3. Protocolo de Migración para Reclutamiento Pochtecas v1.0
1. **Creación Nativa:** La Psic. Liliana López (o administrador corporativo) abre [script.new](https://script.new) desde su perfil institucional.
2. **Inyección de Código Atómico:** Se pegan `Code.gs`, `Index.html` y el manifiesto `appsscript.json`.
3. **Auto-Provisión de Bóveda:** `Code.gs` incluye el método `getOrCreateSpreadsheet_()`, el cual crea automáticamente una hoja de cálculo en Drive llamada `ARAUTO_RECLUTAMIENTO_POCHTECAS_2026` si no se vincula una previa.
4. **Despliegue Web App:** 
   - Ejecutar como: **Yo (`psic.liliana.lopez@arauto.express`)**
   - Quién tiene acceso: **Cualquier usuario (Anyone)** para permitir la inscripción de aspirantes externos.
