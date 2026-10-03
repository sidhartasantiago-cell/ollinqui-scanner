# 📜 AMOXCALLI — MEMORIA TÉCNICA CANÓNICA
## OLLINQUI v86.0 PROD: PERSISTENCIA ASÍNCRONA, NOTA DE VOZ OBLIGATORIA Y MINI-AUDITORÍA MULTIMODAL AMOXCALLI

**Fecha:** 29 de Septiembre de 2026  
**Ecosistema:** OLLIN v2026.10 / Arauto Express  
**Entorno:** Ruta en Calle Pochtecas (`entrega.arauto.express`) & Bóveda Central  
**Autoridad:** Tlayacanqui Sidharta Santiago  
**ID de Componente:** `OLLINQUI_ENTREGA_V86_OPTIMIZACION_IA`  

---

### 1. ANTECEDENTES Y CAUSA RAÍZ
1. **Latencia en Confirmación de Entrega:** En la PWA de ruta (`entrega.arauto.express`), al momento de confirmar un lote o entrega, la interfaz esperaba de forma síncrona el `fetch` al webhook con la carga de fotos y audio (de 2 a 5 MB en Base64). En campo con cobertura 3G/4G inestable, esto bloqueaba la pantalla del Pochteca entre 5 y 15 segundos en la puerta del cliente.
2. **Evidencia Incompleta:** Existían confirmaciones sin nota de voz que impedían un dictamen certero ante aclaraciones o discrepancias con DHL.
3. **Desconexión con la Memoria Histórica y Falta de Auditoría del Destinatario:** No se contrastaba de manera automática el nombre de quien recibe reportado por el chofer contra el destinatario oficial y las entregas previas asentadas en Amoxcalli.

---

### 2. ARQUITECTURA TÉCNICA Y SOLUCIONES IMPLEMENTADAS

#### A. Persistencia Asíncrona en Segundo Plano (Latencia Zero / Optimistic UI)
- **Persistencia Local Inmediata (<50ms):** El lote se asienta de inmediato en IndexedDB (`STORE_ENTREGAS`).
- **Respuesta Instantánea al Pochteca:** Inmediatamente se reproduce el tono de confirmación (`playBeep('ok')`), se cierra el bottom sheet de evidencia, se limpia el formulario y se despliega el aviso: `🚀 ¡Entrega guardada! Sincronizando en segundo plano...`. El operador queda 100% libre para escanear el siguiente paquete sin esperar conexión.
- **Despacho Desacoplado:** Una función en segundo plano (`despacharSincronizacionLoteSegundoPlano`) envía la data al Webhook. Al recibir confirmación `200 OK`, purga el registro de IndexedDB y actualiza el indicador de red a `● EN LÍNEA / SINCRONIZADO`. Si no hay red, la data se preserva y se reintenta de forma transparente.

#### B. Obligatoriedad Inviolable de la Nota de Voz (Teoyolotl Mic)
- **Regla Poka-Yoke Suprema:** Es requisito indispensable capturar la nota de audio antes de confirmar **cualquier evento de entrega** (tanto `OK` como cualquier incidencia `NH`, `BA`, `RD`, `CA`).
- Si falta el audio, el sistema detiene la confirmación, emite alerta sonora de error, reabre el bottom sheet y activa una animación visual de advertencia (`pulse-mandatory`) sobre la cápsula de micrófono.

#### C. Cotejo con Histórico de Entregas Previas (Amoxcalli)
- El endpoint `consultar_memoria_domicilio` en `Receptor_PU.js` fue enriquecido para buscar tanto por dirección como por **nombre de destinatario** en `VALIDACIÓN_QRO_2025` y `BD_APP_RUTA_2025`.
- Devuelve:
  * Número de entregas previas exitosas.
  * Receptores habituales históricos.
  * Notas y referencias de entrega acumuladas.
  * Foto de fachada previa.
- Esta memoria se proyecta al Pochteca en pantalla (`card-memoria`) antes de tocar el timbre y se adjunta a la carga útil para la auditoría de IA.

#### D. Mini-Auditoría Multimodal con Inteligencia Artificial (Gemini 3.6 Flash)
- El webhook `Receptor_PU.js` recibe el paquete completo: Foto + Audio + Destinatario Oficial Esperado + Nombre Reportado + Antecedentes Amoxcalli.
- El modelo `gemini-3.6-flash` (con jerarquía de contingencia) evalúa:
  1. **Cotejo de Destinatario:** Clasifica como `TITULAR_CONFIRMADO`, `FAMILIAR_O_AUTORIZADO`, `TERCERO_O_CASETA`, `DISCREPANCIA_RECEPTOR` o `INCIDENCIA_CONFIRMADA`.
  2. **Transcripción Verbatim:** Transcribe con precisión el testimonio oral del Pochteca.
  3. **Certificación Visual:** Valida número exterior, fachada y paquete en domicilio.
  4. **Score de Confianza (0 a 100):** Grado de certeza pericial de la entrega.
- Los resultados se asientan en columnas dedicadas:
  * `Transcripcion_Voz`
  * `Dictamen_IA`
  * `Checkpoint_Propuesto_IA`
  * `Auditoria_Destinatario_IA`
  * Y en `VALIDACIÓN_QRO_2025` Columna K (comentarios enriquecidos periciales).

---

### 3. DESPLIEGUES Y VALIDACIONES
- **Frontend Pochteca:** Desplegado en Netlify (`https://entrega.arauto.express/`) bajo Service Worker `ollin-pure-pwa-v3-15`.
- **Backend Receptor:** Desplegado vía Clasp en `Receptor_PU.js` (Script ID `1OPEYOE5qQPz-Jn5998dtGvMXexLyrPBuTNQVlDmZdHybg7Jh78OkSMjB`).
