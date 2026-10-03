# 🏛️ AMOXCALLI: HITO DE AUTENTICACIÓN NATIVA OAUTH / MCP CLIENT EN ANTIGRAVITY 2.0

**Fecha de Registro:** 18 de Septiembre de 2026  
**Autor:** Agente Prudencia Gravita & Tlayacanqui Sidharta Santiago  
**Ecosistema:** OLLIN / Arauto Express (Plaza Querétaro)  
**Clasificación:** Seguridad, Infraestructura y Conectividad Nativa por API  

---

## 🧭 1. Resumen Ejecutivo y Propósito
Se completó con éxito la transición de la interacción por interfaz gráfica de usuario (Puppeteer / DevTools Browser GUI) a la **Conectividad Nativa Directa vía Google Sheets API v4 y Protocolo MCP (Model Context Protocol)** en Antigravity 2.0.

A partir de este hito, las operaciones de auditoría, lectura, validación de esquemas y corrección de datos en la Bóveda se ejecutan de manera 100% autónoma, atómica y headless sin requerir el despliegue de ventanas de navegador ni simulación de clicks en la interfaz web de Google Sheets.

---

## 🛡️ 2. Arquitectura de Seguridad y Credenciales Corporativas

1. **Gobernanza Google Workspace Admin:**
   * **Dominio:** `@arauto.express`
   * **Estado de la Aplicación en Admin Console:** `Confiable (Trusted)`
   * **Client ID:** `658565429526-***.apps.googleusercontent.com`
   * **Client Secret:** `GOCSPX-***`
   * **Proyecto GCP Asociado:** `658565429526`

2. **Estructura de Configuración MCP (`.agents/mcp_config.json`):**
   * Configurado con el proveedor nativo `authProviderType: "google_credentials"`.
   * Almacenamiento seguro y persistente de tokens en `.agents/google_token.json` con capacidad de autorefresco asíncrono mediante `refresh_token`.

3. **Servidor MCP Stdio (`.agents/prudencia_sheets_mcp.js`):**
   * Implementa el protocolo JSON-RPC 2.0 estándar sobre Stdio.
   * Expone herramientas nativas para Antigravity:
     * `prudencia_read_sheet`: Lectura de celdas/rangos A1 en libros de cálculo.
     * `prudencia_write_sheet`: Escritura y actualización atómica vía Sheets API v4.

---

## 🧪 3. Evidencia de la Prueba Atómica Directa por API

La prueba fue ejecutada sin interfaz web por el script `.agents/test_sheets_api.py`, arrojando los siguientes resultados validados:

```text
===========================================================================
🛡️ PRUDENCIA GRAVITA: PRUEBA DIRECTA POR API SHEETS v4 (ZERO BROWSER GUI)
===========================================================================

[1/4] 📖 Lectura de metadatos sobre BD_APP_RUTA_2025...
      ✅ Título de BD: BD_APP_RUTA_2025
      ✅ Pestañas (7): GUIAS_ASIGNADAS, PIEZAS_PID, ENTREGA_MASIVA, PIEZAS_ESCANEADAS_MASIVAS, RECOLECCIONES_ASIGNADAS, CAT_CHECKPOINTS, CAT_USUARIOS

[2/4] 📐 Auditoría de Esquema Rígido sobre VALIDACIÓN_QRO_2025...
      ✅ Columnas detectadas: 25 de 25 físicas.
      ✅ Columna Q (Índice 16): 'KEY' (Candado KEY)
      ✅ Columna U (Índice 20): 'Telefono' (Candado Telefono)
      🛡️ Integridad de Bóveda: 100% Blindada (Cero Column Shifting).

[3/4] ✍️ Escritura atómica directa por API en CAT_CHECKPOINTS!A17:F17...
      ✅ Escritura exitosa: 6 celdas actualizadas en CAT_CHECKPOINTS!A17:F17

[4/4] 🔍 Verificación inmediata de valor y limpieza Poka-Yoke...
      ✅ Valor confirmado en Bóveda: PRUDENCIA_OAUTH_TEST | Verificacion exitosa API v4 sin GUI
      ✅ Limpieza de prueba completada: Rango CAT_CHECKPOINTS!A17:F17 restaurado.

===========================================================================
🏆 RESULTADO: PRUEBA ATÓMICA 100% EXITOSA SIN NINGUNA INTERFAZ GRÁFICA
===========================================================================
```

---

## 📜 4. Reglas Operativas Consolidadas

1. **Zero Browser GUI para Sheets:** Queda terminantemente erradicada la manipulación de hojas de cálculo de Google mediante clics simulados en navegador web. Toda operación debe canalizarse vía API v4 o MCP Server.
2. **Candado de Esquema Rígido de 25 Columnas:** En `VALIDACIÓN_QRO_2025` (`1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M`), el índice 16 (Col Q) corresponde inmutablemente a `KEY` y el índice 20 (Col U) a `Telefono`.
3. **Poka-Yoke en Escrituras de Prueba:** Toda escritura de verificación o diagnóstico debe limpiar sus celdas temporales inmediatamente para no alterar catálogos productivos ni métricas operativas de Pochtecas.


### 🔒 Adenda de Gobernanza (18/SEP/2026 01:10): Baja y Desincorporación de Cuenta Satélite
- **Cuenta dada de baja:** ntigravedad.prudencia@arauto.express.
- **Motivo y Resolución:** Con la entrada en vigor de la autenticación nativa vía OAuth / MCP Client, las operaciones de backend y auditoría operan directamente sobre el perfil de administración rector (sidharta.santiago@arauto.express).
- **Poka-Yoke ejecutado:** Se removió la cuenta de la lista de usuarios compartidos en AppSheet (Ollinqui y RutaAE), liberando el asiento de licencia mensual sin afectar la disponibilidad de la Bóveda ni los endpoints de Apps Script.
