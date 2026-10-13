# 🏛️ AMOXCALLI — MEMORIA TÉCNICA CANÓNICA
## SISTEMA DE RECLUTAMIENTO Y EVALUACIÓN POCHTECAS v2.0 PROD (HYBRID)
### Expediente Digital en Drive, Evaluación Territorial Abierta, Poka-Yoke de Evidencias y Frontend Netlify Anti-Bug `/u/1/`

**Fecha:** 12 de Octubre de 2026  
**Universo:** 🏛️ Universo 2 — Corporativo / Operaciones Logísticas (`@arauto.express`)  
**Titular Legal:** `sidharta.santiago@arauto.express`  
**Script ID:** `1jD4E8u2TFhifdi1SBEoaCp2fMXvc3A0-00vUBOeDTEjYVA7myvathFu0`  
**Deployment ID:** `AKfycbwcqW3I9jAJUaHfl_n3DNAhnBtW1ZGbatYSTbp8OSORaBdcIoOdWmQgnlaGAttU-yUH4Q` (Versión 3 - v2.0 PROD Hybrid)  
**URL Frontend Principal (Netlify — Cero Bug Multi-Cuenta):**  
`https://reclutamiento-pochtecas-ae.netlify.app`  
**URL Webhook / Apps Script (/exec):**  
`https://script.google.com/macros/s/AKfycbwcqW3I9jAJUaHfl_n3DNAhnBtW1ZGbatYSTbp8OSORaBdcIoOdWmQgnlaGAttU-yUH4Q/exec`  
**Bóvedas Sincronizadas:**  
- Primaria: `1Qu9q7LCBIY5PcWYqKwroIRX9b57NCOwmvbP-cQJ_hGQ` (Pestaña `RECLUTAMIENTO_POCHTECAS`)  
- Espejo Dedicado: `1atR5hEHEbT8Ke-vzSPFYtce100IahIjpZVc1FO-Ayco` (`ARAUTO_RECLUTAMIENTO_POCHTECAS_2026`)  

---

### 1. Cambios Arquitectónicos en v2.0 PROD

#### A. Interfaz Móvil (`Index.html`) en 4 Secciones
1. **Sección 1 (Expediente Digital y Datos Personales):**
   - Captura de `Nombre`, `Teléfono/WhatsApp` (10 dígitos), `Correo Electrónico`.
   - Carga directa de archivos para **INE / Identificación Oficial** y **Comprobante de Domicilio** (`image/*,.pdf`) con compresión inteligente en cliente (HTML5 Canvas max 1400px JPEG 0.80) para garantizar envíos veloces en zonas de baja cobertura celular.
2. **Sección 2 (Unidad de Trabajo y Equipamiento):**
   - Selección de `Tipo de Vehículo` (`Pickup`, `Van`, `Camioneta de Carga`, `Tornado`, `Sedán / Compacto`), `Marca y Modelo`, y `Año de la Unidad`.
   - **Política de Puertas Abiertas en Unidad:** Se eliminó toda restricción excluyente o advertencia por antigüedad menor a 5 años; **todos los años de unidad son permitidos**.
   - Carga opcional de `Fotografía de la Unidad` y checkboxes opcionales de `Equipo de Seguridad` (`Botas de casquillo`, `Chaleco reflejante`, `Cargador continuo`).
3. **Sección 3 (Dominio Territorial):**
   - Campos abiertos (`textarea`) sin listas cerradas para `Comunidades / Zonas de Preferencia`, `Conocimiento de Carreteras Principales` y `Orientación y GPS en Zonas con Baja Señal Celular`.
4. **Sección 4 (Proceso de Entrega y Manejo de Incidencias):**
   - Evaluación abierta de `Experiencia en Paquetería / Última Milla`, `Procedimiento ante Cliente Ausente` (Llamar, tomar foto de fachada y registrar código/nota de voz) y `Experiencia en Captura de Evidencias Digitales`.

#### B. Esquema de 19 Columnas en `RECLUTAMIENTO_POCHTECAS` (`Code.js`)
`Timestamp` | `Nombre` | `Telefono` | `Correo` | `INE_Url` | `Comprobante_Domicilio_Url` | `Tipo_Vehiculo` | `Marca_Modelo` | `Año_Unidad` | `Foto_Vehiculo_Url` | `Equipo_Seguridad` | `Comunidades_Preferencia` | `Conocimiento_Carreteras` | `Orientacion_Navegacion` | `Experiencia_Milla` | `Proc_Cliente_Ausente` | `Evidencias_Manejo` | `Estatus_Filtro` | `Comentarios_IA`

#### C. Reglas del Motor Poka-Yoke v2.0
- **`APTO`:** Candidatos que suben expediente completo (`INE` + `Comprobante`), responden adecuadamente el procedimiento de cliente ausente/evidencias y cuentan con experiencia previa en reparto.
- **`EVALUACIÓN`:** Perfiles sin experiencia previa que requieren **capacitación relámpago en el uso de la PWA Ollinqui**, o expedientes pendientes de algún documento.

#### D. Causa Raíz y Solución al Bug Multi-Cuenta de Google (`/macros/u/1/s/.../exec`)
- **Diagnóstico:** Cuando un navegador de escritorio (Chrome o Edge) tiene abiertas simultáneamente dos o más cuentas de Google (`/u/0` y `/u/1`), el servicio `HtmlService` (`doGet`) de Google Apps Script redirige automáticamente a `/macros/u/1/s/.../exec` y arroja el error nativo de Google Drive *"No se pudo abrir el archivo en este momento"*.
- **Solución Definitiva (Arquitectura Híbrida Netlify + Webhook GAS):**
  - El frontend se aloja estáticamente en Netlify (`https://reclutamiento-pochtecas-ae.netlify.app`, ID `8311bc42-ef93-46a8-abae-1bde0a7ef0a7`) y transmite el expediente comprimido mediante `fetch()` (`POST text/plain;charset=utf-8`) al endpoint `doPost(e)` de Google Apps Script en `@arauto.express`.
  - Esto elimina al 100% el conflicto de sesiones múltiples en cualquier navegador, manteniendo el almacenamiento de archivos e inyección de filas íntegramente dentro del Google Drive y Google Sheets corporativos de `@arauto.express`.


#### E. Parche v2.0.1: Solución al Error Android `[object ProgressEvent]` (Scoped Storage)
- **Causa Raíz:** En teléfonos Android (Chrome Mobile), cuando el candidato selecciona sus archivos (`INE`, `Comprobante`, `Foto Vehículo`) en las Secciones 1 y 2 y luego tarda varios minutos redactando las respuestas abiertas de las Secciones 3 y 4 (o cambia temporalmente de app a WhatsApp/Galería), el sistema operativo Android revoca el permiso temporal de lectura del archivo (`Scoped Storage` / `NotReadableError`), provocando que `FileReader` lance `[object ProgressEvent]` al presionar "Enviar".
- **Solución Aplicada (`preprocesarEnCambio` + `CACHE_ARCHIVOS`):**
  1. **Captura en Caliente (`onchange`):** Cada foto o PDF se lee, comprime mediante `URL.createObjectURL` + HTML5 Canvas (máx 1200px, JPEG 0.72) y se guarda en memoria RAM (`CACHE_ARCHIVOS`) en el **milisegundo exacto** en que el candidato lo selecciona, mostrando una insignia verde `✅ Archivo listo (...)`.
  2. **Lectura Secuencial con Triple Fallback:** `URL.createObjectURL` -> `file.arrayBuffer()` -> `FileReader` clásico, evitando picos de memoria por `Promise.all`.
  3. **Tolerancia Total a Fallos (Poka-Yoke):** Si un archivo en la nube del teléfono está bloqueado, nunca detiene ni aborta el envío de la solicitud; guarda el registro completo del candidato en la Bóveda para no perder ningún prospecto.


#### F. Auditoría Cruzada v2.0.2 PROD (Proxy Netlify + Sheet-First Persistence)
- **Transporte Proxy (`/.netlify/functions/registro-pochteca`):** El frontend en Netlify ahora envía las solicitudes a su propia función serverless en el mismo origen (`/.netlify/functions/registro-pochteca`), la cual reenvía el POST a Google Apps Script siguiendo redirecciones 302 del lado del servidor. Esto elimina cualquier bloqueo de CORS o de redirección en navegadores móviles Android/iOS.
- **Persistencia Sheet-First (19 Columnas Garantizadas):** `registrarAspirantePochteca` guarda primero la fila de 19 columnas en la hoja principal (`1Qu9q7LCBIY5PcWYqKwroIRX9b57NCOwmvbP-cQJ_hGQ`) antes de procesar adjuntos en Drive, estilos o notificaciones.
- **Adjuntos No Bloqueantes:** INE y Comprobante ya no bloquean el botón de envío si el teléfono del candidato falla al leer un archivo o supera los límites de tamaño (PDF > 5 MiB o conjunto > 3 MiB); el registro se guarda siempre y marca automáticamente qué documento pedir por WhatsApp.
