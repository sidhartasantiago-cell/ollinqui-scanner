# 🏛️ AMOXCALLI MEMORIA TÉCNICA: CANDADOS POKA-YOKE DE RAMPA, SESIÓN ÚNICA Y TSP GEOGRÁFICO PURO (OLLINQUI PWA v3.5 PROD)

**Código de Registro:** `AMOX-2026-OLLINQUI-V35-POKAYOKE`  
**Tenant y Ecosistema:** Universo 2 (Arauto Express - `sidharta.santiago@arauto.express`)  
**Fecha de Despliegue:** 2026-09-30  
**Ambiente:** Producción PWA (`https://entrega.arauto.express`)  
**Responsables Técnicos:** Tlayacanqui Sidharta Santiago, Agente Prudencia (Antigravity).

---

## 1. RESUMEN EJECUTIVO Y ANTECEDENTES
Tras las pruebas de campo intensivas en la rampa y ruta de Querétaro, el Tlayacanqui Sidharta Santiago identificó 5 vulnerabilidades y puntos de fricción que comprometían la trazabilidad física, la seguridad y la ergonomía del Pochteca:
1. **Fallo en Enlaces Waze:** Deep links a Waze arrojaban errores de resolución en terminales Android/iOS sin cobertura celular asistida.
2. **Entrega de Bultos no Abordados (Salto de Rampa):** Posibilidad de entregar paquetes que estaban en estatus `PRE_ASIGNADO` sin haber sido escaneados físicamente en rampa (`Carga a Bordo`).
3. **Malas Entregas por Auto-Inyección de Guía:** La acción "Ir" en la Hoja de Ruta pre-cargaba y auto-escaneaba el PID tras 250ms, evitando la lectura física con escáner/cámara.
4. **Concurrencia no Controlada:** Mismo usuario Pochteca abierto simultáneamente en 2 teléfonos diferentes, generando colisiones en bitácora.
5. **Ruta con Retrocesos por Agrupación Rígida de Prioridades:** La agrupación matemática `[1, 2, 3, 4, 5]` provocaba que el chofer atravesara la ciudad varias veces en lugar de seguir un flujo espacial continuo.

---

## 2. ARQUITECTURA DE LAS SOLUCIONES IMPLEMENTADAS

### A. Navegación Exclusiva con Google Maps 1-Tap
- Se erradicó Waze de la interfaz operativa (Hero Card y Timeline).
- Google Maps quedó como el estándar único, con deep links universales tanto por coordenadas GPS (`destination=lat,lng`) como por dirección geocodificada de contingencia (`destination=dir, Querétaro`).

### B. Candado Poka-Yoke de Rampa (`PRE_ASIGNADO` ➔ `A_BORDO`)
- Se implementó una compuerta infranqueable en `procesarCodigoEscaneado()` y `confirmarYGuardarLote()`:
  - Si un paquete no está presente en la memoria local `bultosABordo` ni en el manifiesto con bandera `a_bordo: true`, el sistema bloquea la acción con un modal rojo de advertencia:
    `⛔ CANDADO DE RAMPA: BULTO NO ESTÁ A BORDO`.
  - Motivo: "Está estrictamente prohibido entregar paquetes en calle sin haber sido validados físicamente en rampa. Debes subirlo primero en el módulo Carga a Bordo".

### C. Candado de Escaneo Físico Obligatorio (Anti-Malas Entregas)
- Se eliminó el `setTimeout` que auto-inyectaba el PID al tocar la parada.
- Ahora, `irAEntregarParada(hwb)` despliega los datos contextuales de la Guía Madre, destinatario, dirección y chips de piezas como pendientes (`⏳`).
- El botón `🚀 Confirmar Lote` se mantiene bloqueado (`bultosLote.length === 0`) hasta que el operador escanee físicamente con láser o cámara el código de barras del bulto.
- Se agregó candado de discrepancia: si el operador escanea un bulto que pertenece a otra Guía Madre distinta a la parada activa, el escáner lo rechaza.

### D. Candado Anti-Concurrencia de Sesiones (Serverless Netlify + Sheets)
- **Endpoint Serverless:** `/.netlify/functions/session` conectado con la hoja `CONTROL_SESIONES` en la hoja maestra `OLLIN_OPERACIONES_2026` (`1njJIZBtYVqwtyNS-1SkeTMxDh7y6RctH2yoL0vXltbk`).
- **Ciclo de Vida:**
  - Login en Teléfono A: Registra token único de dispositivo y marca sesión activa.
  - Login en Teléfono B: Es bloqueado inmediatamente indicando "Usuario con sesión activa en otro dispositivo".
  - Desbloqueo Supervisor: Con Master PIN (`2026`), el Teléfono B puede tomar posesión de la sesión.
  - Heartbeat Activo: Cada 25 segundos, el cliente valida su sesión. Si el Teléfono A fue desplazado, recibe `status: 'KICKED'`, se le cierra la sesión y se le devuelve a la pantalla de PIN.

### E. Optimización de Hoja de Ruta Asistida (TSP Geográfico Puro)
- Se sustituyó el agrupamiento rígido por prioridades por un algoritmo **Nearest Neighbor TSP Geográfico Puro**, minimizando kilómetros totales y eliminando retrocesos.
- La inteligencia de prioridades se preservó a nivel analítico y visual:
  - Barra de resumen de carga con badges en tiempo real: `⚡ X Inter`, `🏢 Y Corp`, `🌿 Z Natura`, `🏠 W Res`, `💳 K Banc`.
  - Badges cromáticos individuales en cada parada del timeline para que el Pochteca identifique entregas críticas sin alterar la continuidad geográfica.

---

## 3. CERTIFICACIÓN EN PRODUCCIÓN
- Despliegue Netlify verificado con commit en producción `https://entrega.arauto.express`.
- Pruebas E2E de navegador automatizadas:
  - Waze eliminado al 100%.
  - Google Maps 1-Tap validado.
  - Chips multibulto inician en estado `⏳` y requieren lectura física.
  - Candado de Rampa auditado y verificado en tiempo de ejecución.
