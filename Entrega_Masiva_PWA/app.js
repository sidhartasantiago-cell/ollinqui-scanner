/**
 * ====================================================================
 * OLLINQUI PWA NATIVA INDEPENDIENTE v3.1 PROD (OLLIN-PURE-PWA-RELEASE)
 * Logística de Ruta, Rampa (Painani), Entregas y Recolecciones (PU)
 * Arquitectura de Vistas Estáticas (100dvh) | Escáner y Cámara Inmediatos
 * Tarjeta de Guía Madre Multibulto Desglosada | Poka-Yoke 7CA
 * ====================================================================
 */

// 1. Directorio Canónico de Pochtecas (Fallback Offline, RBAC y PIN de Arranque)
const DIRECTORIO_POCHTECAS = {
  "edgar.rodriguez.arauto@gmail.com": { nombre: "Edgar Rodríguez", tiene_7ca: true, rol: "POCHTECA", pin: "6310" },
  "edgar.rodriguez@arauto.express": { nombre: "Edgar Rodríguez", tiene_7ca: true, rol: "POCHTECA", pin: "6310" },
  "xichudaniel@gmail.com": { nombre: "Daniel Juárez", tiene_7ca: false, rol: "TLACHIXQUI", pin: "5625" },
  "irvin.reyes@arauto.express": { nombre: "Irvin Reyes", tiene_7ca: false, rol: "TLACHIXQUI", pin: "1708" },
  "sidharta.santiago@arauto.express": { nombre: "Sidharta Santiago", tiene_7ca: true, rol: "TLAYACANQUI", pin: "5948" },
  "fernando.maestro.1991@gmail.com": { nombre: "Fernando Maestro", tiene_7ca: false, rol: "POCHTECA", pin: "6990" },
  "victor18amadorm@gmail.com": { nombre: "Víctor Amador", tiene_7ca: false, rol: "POCHTECA", pin: "6463" },
  "diegovv21mar@gmail.com": { nombre: "Diego", tiene_7ca: false, rol: "POCHTECA", pin: "2361" },
  "fmsanluispaq@gmail.com": { nombre: "Gregorio", tiene_7ca: false, rol: "POCHTECA", pin: "5455" },
  "fmpaqueteriatvsm@gmail.com": { nombre: "Lyonnet", tiene_7ca: false, rol: "POCHTECA", pin: "8571" },
  "yesigonzg1827@gmail.com": { nombre: "Rosi", tiene_7ca: false, rol: "POCHTECA", pin: "7704" },
  "oscher1016@gmail.com": { nombre: "Oscher", tiene_7ca: false, rol: "POCHTECA", pin: "2030" }
};
const MASTER_PIN = "2026";

// Webhook Activo en Google Apps Script (Receptor_PU Arauto Express Universo 2)
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwCKdmeHHqRwsNAMJTjxaEDiznvYdPggPchlrVhQcd5kbW7LfLn_qub-fCn6w6JmyRw/exec';
// API Serverless Netlify para Control de Concurrencia de Sesiones (Candado Único por Chofer)
const SESSION_API_URL = '/.netlify/functions/session';

// 2. Parámetros de Ruta y Estado de Sesión
let CURRENT_USER = "edgar.rodriguez.arauto@gmail.com";
let userTiene7CA = true;
let userRol = "POCHTECA";
let currentActiveView = "view-inicio";

// Estado en Memoria del Lote Activo de Entrega
let bultosLote = [];
let currentHwb = '';
let currentPidsGuia = [];
let currentCheckpointSeleccionado = 'OK';
let currentMemoriaAmoxcalli = null;
let photoBase64 = '';
let photoPUBase64 = '';
let audioBase64 = '';
let audioChunks = [];
let mediaRecorder = null;
let recordingTimer = null;
let recordingSeconds = 0;
let isRecording = false;

// Instancia de Cámara
let html5QrCode = null;
let isCameraRunning = false;

// Historial en Memoria del Turno (Bitácora)
let historialTurno = [];

// Manifiesto Operativo Global y Local (Poka-Yoke RBAC y Búsqueda 0ms)
let MANIFIESTO_GLOBAL = null;
let MANIFIESTO_CHOFER = [];

// ====================================================================
// 3. MOTOR SENSORIAL (AUDIO SINTÉTICO & HÁPTICO)
// ====================================================================
const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioCtxClass();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playBeep(type = 'ok') {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'ok') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      if (navigator.vibrate) navigator.vibrate(40);
    } else if (type === 'incidencia') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
      if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
      if (navigator.vibrate) navigator.vibrate(180);
    }
  } catch (e) {
    console.warn('Audio feedback fallback:', e);
  }
}

function showToast(text, icon = '⚡') {
  const toast = document.getElementById('toast-msg');
  const tIcon = document.getElementById('toast-icon');
  const tText = document.getElementById('toast-text');
  if (!toast) return;
  if (tIcon) tIcon.textContent = icon;
  if (tText) tText.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ====================================================================
// GESTIÓN DEL MANIFIESTO OPERATIVO Y CANDADOS DE RUTA (POKA-YOKE)
// ====================================================================
async function cargarManifiestoOperativo(forzarRecarga = false) {
  try {
    if (!forzarRecarga) {
      const cached = localStorage.getItem('ollin_manifiesto_global');
      if (cached) {
        MANIFIESTO_GLOBAL = JSON.parse(cached);
        actualizarManifiestoChoferActual();
      }
    }

    const res = await fetch(`manifiesto_activo.json?_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.pids_lookup) {
        MANIFIESTO_GLOBAL = data;
        try {
          localStorage.setItem('ollin_manifiesto_global', JSON.stringify(data));
        } catch(e) {}
        actualizarManifiestoChoferActual();
        console.log('✅ Manifiesto operativo cargado:', data.total_pids, 'piezas activas');
      }
    }
  } catch (err) {
    console.warn('⚠️ No se pudo descargar manifiesto fresco, usando datos locales:', err);
  }
}

function actualizarManifiestoChoferActual() {
  if (!MANIFIESTO_GLOBAL || !CURRENT_USER) return;
  const cleanEmail = CURRENT_USER.trim().toLowerCase();
  const esSupervisor = (userRol === 'TLAYACANQUI' || cleanEmail.includes('sidharta') || cleanEmail.includes('irvin'));

  const choferKey = Object.keys(MANIFIESTO_GLOBAL.choferes || {}).find(k => {
    return k === cleanEmail || cleanEmail.includes(k) || k.includes(cleanEmail.split('@')[0]);
  });

  MANIFIESTO_CHOFER = choferKey ? (MANIFIESTO_GLOBAL.choferes[choferKey] || []) : [];

  const countAsig = MANIFIESTO_CHOFER.length;
  const countBordo = MANIFIESTO_CHOFER.filter(p => p.a_bordo || p.escaneo_validacion === 'A_BORDO').length;

  const lblAsigSub = document.getElementById('kpi-a-bordo-sub');
  if (lblAsigSub) {
    lblAsigSub.textContent = esSupervisor ? `Modo Supervisor (${MANIFIESTO_GLOBAL.total_pids} bultos en sistema)` : `${countAsig} bultos asignados a tu ruta hoy`;
  }

  const badgeBordo = document.getElementById('badge-a-bordo-count');
  if (badgeBordo) {
    badgeBordo.textContent = `${bultosABordo.length || countBordo} Bultos`;
  }

  // 🧭 Actualizar Hoja de Ruta Asistida (IA)
  if (typeof optimizarYGenerarHojaDeRuta === 'function') {
    optimizarYGenerarHojaDeRuta();
  }
}

window.mostrarModalBloqueo = function(datos) {
  playBeep('error');
  if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 250]);

  const modal = document.getElementById('modal-bloqueo-pwa');
  const tit = document.getElementById('modal-bloqueo-titulo');
  const pid = document.getElementById('modal-bloqueo-pid');
  const hwb = document.getElementById('modal-bloqueo-hwb');
  const chofer = document.getElementById('modal-bloqueo-chofer');
  const mot = document.getElementById('modal-bloqueo-motivo');

  if (tit && datos.titulo) tit.textContent = datos.titulo;
  if (pid) pid.textContent = datos.pid || '---';
  if (hwb) hwb.textContent = datos.hwb || 'N/A';
  if (chofer) chofer.textContent = datos.chofer || 'Otro Operador';
  if (mot && datos.motivo) mot.textContent = datos.motivo;

  if (modal) modal.style.display = 'flex';
};

window.cerrarModalBloqueo = function() {
  const modal = document.getElementById('modal-bloqueo-pwa');
  if (modal) modal.style.display = 'none';

  if (currentActiveView === 'view-carga-bordo') {
    const laserBordo = document.getElementById('laser-input-bordo');
    if (laserBordo) setTimeout(() => laserBordo.focus(), 100);
  } else if (currentActiveView === 'view-entrega') {
    const laserCalle = document.getElementById('laser-input');
    if (laserCalle) setTimeout(() => laserCalle.focus(), 100);
  }
};

// ====================================================================
// 4. AUTENTICACIÓN Y ARRANQUE DE TURNO (PIN 4 DÍGITOS)
// ====================================================================
function setAuthenticatedUser(email) {
  CURRENT_USER = email.toLowerCase().trim();
  const perfil = DIRECTORIO_POCHTECAS[CURRENT_USER] || { nombre: CURRENT_USER, tiene_7ca: false, rol: "POCHTECA" };
  userTiene7CA = perfil.tiene_7ca;
  userRol = perfil.rol;

  const userDisplay = document.getElementById('user-display');
  if (userDisplay) userDisplay.textContent = perfil.nombre;

  const stageUser = document.getElementById('stage-user-pill');
  if (stageUser) stageUser.textContent = perfil.nombre.split(' ')[0] + ' (' + perfil.rol + ')';

  const stageUserBordo = document.getElementById('stage-user-bordo');
  if (stageUserBordo) stageUserBordo.textContent = perfil.nombre.split(' ')[0] + ' (' + perfil.rol + ')';

  const roleBadge = document.getElementById('role-display-badge');
  if (roleBadge) roleBadge.textContent = perfil.rol;

  const badge7CA = document.getElementById('badge-7ca-indicator');
  if (badge7CA) badge7CA.style.display = userTiene7CA ? 'inline-flex' : 'none';

  actualizarManifiestoChoferActual();

  const overlay = document.getElementById('login-overlay');
  if (overlay) overlay.style.display = 'none';

  localStorage.setItem('ollin_session_user', CURRENT_USER);
  localStorage.setItem('ollin_session_exp', String(Date.now() + 24 * 60 * 60 * 1000));

  // Iniciar monitoreo continuo de concurrencia (Heartbeat)
  iniciarHeartbeatSesion();
}

function mostrarLoginModal() {
  const overlay = document.getElementById('login-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    const pinInput = document.getElementById('login-pin-input');
    if (pinInput) pinInput.value = '';
  }
}

function initSession() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramUser = urlParams.get('chofer') || urlParams.get('email');
  if (paramUser && DIRECTORIO_POCHTECAS[paramUser.toLowerCase().trim()]) {
    setAuthenticatedUser(paramUser.toLowerCase().trim());
    return;
  }

  const savedUser = localStorage.getItem('ollin_session_user');
  const savedExp = localStorage.getItem('ollin_session_exp');
  if (savedUser && savedExp && Date.now() < parseInt(savedExp, 10)) {
    setAuthenticatedUser(savedUser);
  } else {
    mostrarLoginModal();
  }
}

window.pressKey = function(digit) {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(30);
  const pinInput = document.getElementById('login-pin-input');
  if (pinInput && pinInput.value.length < 4) {
    pinInput.value += digit;
  }
};

window.clearKey = function() {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(40);
  const pinInput = document.getElementById('login-pin-input');
  if (pinInput) pinInput.value = '';
};

// 3. IDENTIFICADOR ÚNICO DE DISPOSITIVO (ANTI-CONCURRENCIA)
function getOrCreateDeviceId() {
  let devId = localStorage.getItem('ollin_device_id');
  if (!devId) {
    devId = 'DEV_' + Math.random().toString(36).substring(2, 9).toUpperCase() + '_' + Date.now().toString(36).toUpperCase();
    localStorage.setItem('ollin_device_id', devId);
  }
  return devId;
}

let pendingConflictUser = '';

async function validarSesionConcurrente(email, override = false) {
  const deviceId = getOrCreateDeviceId();
  try {
    const resp = await fetch(SESSION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'validar_sesion_usuario',
        email: email,
        device_id: deviceId,
        master_override: override
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.status) return data;
    }
  } catch (e) {
    console.warn('Verificación concurrencia en modo contingencia:', e);
  }
  return { status: 'OK', autorizado: true, contingencia: true };
}

window.submitLogin = async function() {
  initAudio();
  const select = document.getElementById('login-user-select');
  const pinInput = document.getElementById('login-pin-input');
  const selectedUser = select ? select.value : '';
  const enteredPin = pinInput ? pinInput.value : '';

  if (!selectedUser) {
    playBeep('error');
    showToast('Selecciona tu usuario de la lista', '⚠️');
    return;
  }
  if (!enteredPin || enteredPin.length !== 4) {
    playBeep('error');
    showToast('Ingresa tu PIN de 4 dígitos', '⚠️');
    return;
  }

  const perfil = DIRECTORIO_POCHTECAS[selectedUser];
  const pinValido = perfil && (perfil.pin === enteredPin || enteredPin === MASTER_PIN);
  if (!pinValido) {
    playBeep('error');
    if (pinInput) pinInput.value = '';
    showToast('PIN incorrecto. Reintenta o contacta a Mesa de Control', '❌');
    return;
  }

  // POKA-YOKE: CANDADO DE SESIÓN ÚNICA DIARIA
  showToast('Validando turno exclusivo...', '⏳');
  const esMaster = enteredPin === MASTER_PIN;
  const sesionResp = await validarSesionConcurrente(selectedUser, esMaster);

  if (sesionResp.status === 'BLOQUEADO') {
    playBeep('error');
    pendingConflictUser = selectedUser;
    const modalConflict = document.getElementById('session-conflict-modal');
    const txtConflict = document.getElementById('conflict-msg-text');
    if (txtConflict && sesionResp.mensaje) {
      txtConflict.textContent = sesionResp.mensaje;
    }
    if (modalConflict) modalConflict.style.display = 'flex';
    return;
  }

  // Autorizado con éxito
  playBeep('ok');
  setAuthenticatedUser(selectedUser);
  showToast(`¡Bienvenido, ${perfil.nombre}!`, '🚀');
};

window.mostrarInputOverridePin = function() {
  initAudio();
  const sec = document.getElementById('override-pin-section');
  const inp = document.getElementById('override-pin-input');
  const btn = document.getElementById('btn-show-override-keypad');
  if (sec) sec.style.display = 'block';
  if (btn) btn.style.display = 'none';
  if (inp) { inp.value = ''; inp.focus(); }
};

window.ejecutarTransferenciaConPin = async function() {
  initAudio();
  const inp = document.getElementById('override-pin-input');
  const pinVal = inp ? inp.value.trim() : '';

  if (pinVal !== MASTER_PIN) {
    playBeep('error');
    showToast('PIN Maestro inválido', '❌');
    if (inp) inp.value = '';
    return;
  }

  showToast('Transfiriendo turno...', '⏳');
  const res = await validarSesionConcurrente(pendingConflictUser, true);
  if (res.status === 'OK' || res.autorizado || res.contingencia) {
    playBeep('ok');
    cerrarModalConflicto();
    setAuthenticatedUser(pendingConflictUser);
    showToast('Turno transferido con éxito a este celular', '🎉');
  } else {
    playBeep('error');
    showToast('No se pudo transferir el turno', '⚠️');
  }
};

window.cerrarModalConflicto = function() {
  const modal = document.getElementById('session-conflict-modal');
  if (modal) modal.style.display = 'none';
  const sec = document.getElementById('override-pin-section');
  if (sec) sec.style.display = 'none';
  const btn = document.getElementById('btn-show-override-keypad');
  if (btn) btn.style.display = 'block';
  const pinInput = document.getElementById('login-pin-input');
  if (pinInput) pinInput.value = '';
};

window.cerrarSesionOperador = async function() {
  initAudio();
  if (confirm('¿Deseas cerrar tu sesión de turno?')) {
    detenerCamara();
    if (window._sessionHeartbeatTimer) clearInterval(window._sessionHeartbeatTimer);

    // Notificar al Endpoint Serverless para liberar el usuario en Google Sheets
    const userToRelease = CURRENT_USER;
    const devId = getOrCreateDeviceId();
    try {
      fetch(SESSION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'cerrar_sesion_usuario',
          email: userToRelease,
          device_id: devId
        })
      });
    } catch(e) {}

    localStorage.removeItem('ollin_session_user');
    localStorage.removeItem('ollin_session_exp');
    mostrarLoginModal();
    showToast('Turno cerrado correctamente', '🔒');
  }
};

// Monitoreo continuo de sesión activa (detecta si otro celular toma el turno)
function iniciarHeartbeatSesion() {
  if (window._sessionHeartbeatTimer) clearInterval(window._sessionHeartbeatTimer);
  window._sessionHeartbeatTimer = setInterval(async () => {
    if (!CURRENT_USER || CURRENT_USER === 'POCHTECA_LOCAL') return;
    try {
      const resp = await fetch(SESSION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'ping_sesion',
          email: CURRENT_USER,
          device_id: getOrCreateDeviceId()
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.status === 'KICKED') {
          clearInterval(window._sessionHeartbeatTimer);
          alert(data.mensaje || '⛔ Tu sesión ha sido transferida a otro celular. Turno cerrado en este equipo.');
          localStorage.removeItem('ollin_session_user');
          localStorage.removeItem('ollin_session_exp');
          mostrarLoginModal();
        }
      }
    } catch (e) {}
  }, 25000);
}

// ====================================================================
// 5. ENRUTADOR DE VISTAS ESTÁTICAS (CERO SCROLL EN view-entrega)
// ====================================================================
window.navegarA = function(vistaId) {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(35);

  const vistas = ['view-inicio', 'view-entrega', 'view-carga-bordo', 'view-recoleccion', 'view-bitacora', 'view-hoja-ruta'];
  vistas.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  const targetView = document.getElementById(vistaId);
  if (targetView) targetView.classList.add('active');
  currentActiveView = vistaId;

  // En la vista de entrega: El láser queda listo y enfocado inmediatamente
  if (vistaId === 'view-entrega') {
    const laserInput = document.getElementById('laser-input');
    if (laserInput) {
      setTimeout(() => laserInput.focus(), 150);
    }
  } else {
    // Si sale de view-entrega, apagar la cámara para cuidar batería
    detenerCamara();
  }

  // En la vista de carga a bordo: Foco láser inmediato y actualizar contadores
  if (vistaId === 'view-carga-bordo') {
    const laserBordo = document.getElementById('laser-input-bordo');
    if (laserBordo) {
      setTimeout(() => laserBordo.focus(), 150);
    }
    actualizarUIBordo();
  } else {
    detenerCamaraBordo();
  }

  // Vista Hoja de Ruta Asistida (IA)
  if (vistaId === 'view-hoja-ruta') {
    if (typeof renderHojaDeRutaAsistida === 'function') {
      renderHojaDeRutaAsistida();
    }
  }

  // Dashboard y Bitácora
  if (vistaId === 'view-inicio') {
    actualizarKPIsDashboard();
    if (typeof optimizarYGenerarHojaDeRuta === 'function') {
      optimizarYGenerarHojaDeRuta();
    }
  }
  if (vistaId === 'view-bitacora') {
    renderBitacora();
  }
};

// ====================================================================
// 6. SANITIZACIÓN: LEY DE LA DOBLE J (JJD -> JD)
// ====================================================================
function sanitizarPID(raw) {
  if (!raw) return '';
  let clean = raw.trim().toUpperCase().replace(/[\r\n\t]/g, '');
  if (clean.startsWith('JJD')) {
    clean = 'JD' + clean.substring(3);
  }
  return clean;
}

// ====================================================================
// 7. CÁMARA NATIVA CONTROLADA POR UN TOQUE (SIN PANTALLA NEGRA)
// ====================================================================
window.toggleCamaraPorToque = async function() {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(40);

  const frameWrap = document.getElementById('camera-frame-wrap');
  const isVisorOpen = frameWrap && frameWrap.style.display !== 'none';

  if (isVisorOpen || isCameraRunning) {
    await detenerCamara();
    showToast('Cámara cerrada', '📷');
  } else {
    await iniciarCamaraNativa();
  }
};

async function iniciarCamaraNativa() {
  const frameWrap = document.getElementById('camera-frame-wrap');
  const btnTrigger = document.getElementById('btn-trigger-cam');
  const txtTrigger = document.getElementById('cam-trigger-text');
  const iconTrigger = document.getElementById('cam-trigger-icon');

  if (frameWrap) frameWrap.style.display = 'flex';
  if (txtTrigger) txtTrigger.textContent = 'Desactivar Cámara';
  if (iconTrigger) iconTrigger.textContent = '⏸️';
  if (btnTrigger) btnTrigger.classList.add('active-cam');

  try {
    if (typeof detenerCamaraBordo === 'function') {
      await detenerCamaraBordo();
    }

    const container = document.getElementById('camera-reader');
    if (!container) return;

    // Detener instancia previa si existiera
    if (html5QrCode) {
      try {
        if (html5QrCode.isScanning) await html5QrCode.stop();
        await html5QrCode.clear();
      } catch (eStop) {}
      html5QrCode = null;
    }

    container.innerHTML = '';
    html5QrCode = new Html5Qrcode("camera-reader");

    const qrConfig = {
      fps: 20,
      qrbox: function(w, h) {
        return {
          width: Math.min(280, Math.floor(w * 0.85)),
          height: Math.min(150, Math.floor(h * 0.8))
        };
      },
      aspectRatio: 1.777778
    };

    // Intento 1: facingMode environment (estándar para cámaras traseras móviles)
    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        qrConfig,
        (decodedText) => { procesarCodigoEscaneado(decodedText); },
        () => {}
      );
    } catch (eEnv) {
      console.warn("Fallo facingMode environment directo, buscando lista de dispositivos:", eEnv);
      if (typeof Html5Qrcode.getCameras === 'function') {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const rear = devices.find(d => /back|rear|trasera|environment/i.test(d.label)) || devices[devices.length - 1];
          await html5QrCode.start(
            rear.id,
            qrConfig,
            (decodedText) => { procesarCodigoEscaneado(decodedText); },
            () => {}
          );
        } else {
          throw new Error("No se encontraron dispositivos de cámara");
        }
      } else {
        throw eEnv;
      }
    }

    // Asegurar render y reproducción móvil
    const videoEl = container.querySelector('video');
    if (videoEl) {
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      videoEl.muted = true;
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'cover';
      videoEl.play().catch(e => console.warn("Video nativa play warning:", e));
    }

    isCameraRunning = true;
    playBeep('ok');
    showToast('Cámara activa y lista para escanear', '📷');

  } catch (err) {
    console.error("Camera start error:", err);
    await detenerCamara();
    showToast('No se pudo acceder a la cámara del celular', '⚠️');
  }
}

async function detenerCamara() {
  const frameWrap = document.getElementById('camera-frame-wrap');
  const btnTrigger = document.getElementById('btn-trigger-cam');
  const txtTrigger = document.getElementById('cam-trigger-text');
  const iconTrigger = document.getElementById('cam-trigger-icon');

  if (html5QrCode) {
    try {
      if (html5QrCode.isScanning) {
        await html5QrCode.stop();
      }
      await html5QrCode.clear();
    } catch (e) {}
    html5QrCode = null;
  }
  isCameraRunning = false;
  if (frameWrap) frameWrap.style.display = 'none';
  if (txtTrigger) txtTrigger.textContent = 'Activar Cámara de Celular';
  if (iconTrigger) iconTrigger.textContent = '📷';
  if (btnTrigger) btnTrigger.classList.remove('active-cam');
}

// ====================================================================
// 7.1 CÁMARA Y CONTROL DE CARGA A BORDO (RAMPA A UNIDAD — MUTAR A_BORDO)
// ====================================================================
let bultosABordo = [];
try {
  const guardadosBordo = localStorage.getItem('ollin_bultos_a_bordo');
  if (guardadosBordo) bultosABordo = JSON.parse(guardadosBordo);
} catch(e) { bultosABordo = []; }

let html5QrCodeBordo = null;
let isCameraRunningBordo = false;

window.toggleCamaraBordoPorToque = async function() {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(40);

  const frameWrap = document.getElementById('camera-frame-wrap-bordo');
  const isVisorOpen = frameWrap && frameWrap.style.display !== 'none';

  if (isVisorOpen || isCameraRunningBordo) {
    await detenerCamaraBordo();
    showToast('Cámara cerrada', '📷');
  } else {
    await iniciarCamaraBordo();
  }
};

async function iniciarCamaraBordo() {
  const frameWrap = document.getElementById('camera-frame-wrap-bordo');
  const btnTrigger = document.getElementById('btn-trigger-cam-bordo');
  const txtTrigger = document.getElementById('cam-bordo-trigger-text');
  const iconTrigger = document.getElementById('cam-bordo-trigger-icon');

  if (frameWrap) frameWrap.style.display = 'flex';
  if (txtTrigger) txtTrigger.textContent = 'Desactivar Cámara';
  if (iconTrigger) iconTrigger.textContent = '⏸️';
  if (btnTrigger) btnTrigger.classList.add('active-cam');

  try {
    // Si la cámara de entrega estaba corriendo, detenerla primero para liberar el hardware del dispositivo
    if (typeof detenerCamara === 'function') {
      await detenerCamara();
    }

    const container = document.getElementById('camera-reader-bordo');
    if (!container) return;

    if (html5QrCodeBordo) {
      try {
        if (html5QrCodeBordo.isScanning) await html5QrCodeBordo.stop();
        await html5QrCodeBordo.clear();
      } catch(eStop) {}
      html5QrCodeBordo = null;
    }

    container.innerHTML = '';
    html5QrCodeBordo = new Html5Qrcode("camera-reader-bordo");

    const qrConfig = {
      fps: 20,
      qrbox: function(w, h) {
        return {
          width: Math.min(280, Math.floor(w * 0.85)),
          height: Math.min(150, Math.floor(h * 0.8))
        };
      },
      aspectRatio: 1.777778
    };

    try {
      await html5QrCodeBordo.start(
        { facingMode: "environment" },
        qrConfig,
        (decodedText) => { procesarCodigoCargaBordo(decodedText); },
        () => {}
      );
    } catch(eEnv) {
      if (typeof Html5Qrcode.getCameras === 'function') {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const rear = devices.find(d => /back|rear|trasera|environment/i.test(d.label)) || devices[devices.length - 1];
          await html5QrCodeBordo.start(
            rear.id,
            qrConfig,
            (decodedText) => { procesarCodigoCargaBordo(decodedText); },
            () => {}
          );
        } else {
          throw new Error("No hay cámaras disponibles");
        }
      } else {
        throw eEnv;
      }
    }

    // Forzar activación, atributos y reproducción en navegadores móviles (Chrome/Android/iOS)
    const videoEl = container.querySelector('video');
    if (videoEl) {
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      videoEl.muted = true;
      videoEl.style.width = '100%';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'cover';
      videoEl.play().catch(e => console.warn("Video bordo play warning:", e));
    }

    isCameraRunningBordo = true;
    playBeep('ok');
    showToast('Cámara activa para carga a bordo', '📦');

  } catch(err) {
    console.error("Camera bordo start error:", err);
    await detenerCamaraBordo();
    showToast('No se pudo acceder a la cámara del celular', '⚠️');
  }
}

async function detenerCamaraBordo() {
  const frameWrap = document.getElementById('camera-frame-wrap-bordo');
  const btnTrigger = document.getElementById('btn-trigger-cam-bordo');
  const txtTrigger = document.getElementById('cam-bordo-trigger-text');
  const iconTrigger = document.getElementById('cam-bordo-trigger-icon');

  if (html5QrCodeBordo) {
    try {
      if (html5QrCodeBordo.isScanning) await html5QrCodeBordo.stop();
      await html5QrCodeBordo.clear();
    } catch(e) {}
    html5QrCodeBordo = null;
  }

  // Liberar cualquier pista activa de hardware restante
  const container = document.getElementById('camera-reader-bordo');
  if (container) {
    const v = container.querySelector('video');
    if (v && v.srcObject) {
      try {
        v.srcObject.getTracks().forEach(t => t.stop());
      } catch(eTrack) {}
      v.srcObject = null;
    }
    container.innerHTML = '';
  }

  isCameraRunningBordo = false;
  if (frameWrap) frameWrap.style.display = 'none';
  if (txtTrigger) txtTrigger.textContent = 'Activar Cámara de Celular';
  if (iconTrigger) iconTrigger.textContent = '📷';
  if (btnTrigger) btnTrigger.classList.remove('active-cam');
}

function procesarCodigoCargaBordo(rawCode) {
  const clean = sanitizarPID(rawCode);
  if (!clean || clean.length < 8) {
    playBeep('error');
    showToast('Código muy corto o inválido', '⚠️');
    return;
  }

  // Prevenir duplicado en la carga
  const yaEsta = bultosABordo.find(b => b.pid === clean);
  if (yaEsta) {
    playBeep('incidencia');
    showToast(`Bulto ya registrado A Bordo (${clean})`, 'ℹ️');
    return;
  }

  const cleanEmail = CURRENT_USER.trim().toLowerCase();
  const esSupervisor = (userRol === 'TLAYACANQUI' || cleanEmail.includes('sidharta') || cleanEmail.includes('irvin'));

  // 🛡️ CANDADO POKA-YOKE: CONTROL DE ASIGNACIÓN POR USUARIO
  let infoBulto = null;
  if (MANIFIESTO_GLOBAL && MANIFIESTO_GLOBAL.pids_lookup) {
    infoBulto = MANIFIESTO_GLOBAL.pids_lookup[clean] || MANIFIESTO_GLOBAL.pids_lookup[rawCode.trim().toUpperCase()];
  }

  if (!esSupervisor && infoBulto) {
    const choferAsignado = String(infoBulto.chofer || '').trim().toLowerCase();
    const coincideChofer = choferAsignado && (
      choferAsignado === cleanEmail ||
      choferAsignado.includes(cleanEmail.split('@')[0]) ||
      cleanEmail.includes(choferAsignado.split('@')[0])
    );

    if (!coincideChofer) {
      const choferNombre = DIRECTORIO_POCHTECAS[choferAsignado] ? DIRECTORIO_POCHTECAS[choferAsignado].nombre : choferAsignado;
      mostrarModalBloqueo({
        titulo: '⛔ ACCESO DENEGADO (GUÍA AJENA)',
        pid: clean,
        hwb: infoBulto.hwb || 'N/A',
        chofer: choferNombre || 'Otro Operador',
        motivo: 'Este bulto NO pertenece a tu ruta asignada. Por seguridad operativa del andén, no puedes subirlo a bordo.'
      });
      return;
    }
  }

  // Si no figura en el manifiesto y el operador es Pochteca
  if (!esSupervisor && MANIFIESTO_CHOFER.length > 0 && !infoBulto) {
    mostrarModalBloqueo({
      titulo: '⚠️ BULTO NO RECONOCIDO',
      pid: clean,
      hwb: 'SIN REGISTRO',
      chofer: 'NO ASIGNADO',
      motivo: 'Este código no figura en la asignación del día. Acude con el Auditor de Rampa antes de subirlo.'
    });
    return;
  }

  const horaLocal = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const nuevoBulto = {
    pid: clean,
    raw: rawCode.trim(),
    estatus: 'A_BORDO',
    hora: horaLocal,
    hwb: infoBulto ? infoBulto.hwb : '',
    destinatario: infoBulto ? infoBulto.destinatario : '',
    direccion: infoBulto ? infoBulto.direccion : ''
  };

  bultosABordo.unshift(nuevoBulto);
  try {
    localStorage.setItem('ollin_bultos_a_bordo', JSON.stringify(bultosABordo));
  } catch(e) {}

  // Actualizar Ficha de Último Bulto Abordado (Instantáneo con Guía Madre)
  const viewPid = document.getElementById('bordo-last-pid');
  if (viewPid) viewPid.textContent = clean;

  const viewHwb = document.getElementById('bordo-last-hwb');
  if (viewHwb) {
    viewHwb.textContent = nuevoBulto.hwb ? `HWB: ${nuevoBulto.hwb} • ${horaLocal}` : `Bulto A Bordo • ${horaLocal}`;
  }

  const viewDest = document.getElementById('bordo-last-dest');
  if (viewDest) {
    const parts = [nuevoBulto.destinatario, nuevoBulto.direccion].filter(Boolean);
    viewDest.textContent = parts.length > 0 ? parts.join(' • ') : 'Destinatario Verificado en Rampa';
  }

  actualizarUIBordo();
  playBeep('ok');
  showToast(`✅ A Bordo: ${clean}`, '📦');

  // Enriquecer datos asíncronamente o fallback
  consultarInfoBordoAsync(clean);
}

async function consultarInfoBordoAsync(cleanPid) {
  try {
    const res = await fetch(`${WEBHOOK_URL}?accion=consultar_memoria_domicilio&pid=${encodeURIComponent(cleanPid)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.encontrada) {
        const item = bultosABordo.find(b => b.pid === cleanPid);
        if (item) {
          item.hwb = data.hwb || '';
          item.destinatario = data.destinatario_habitual || '';
          localStorage.setItem('ollin_bultos_a_bordo', JSON.stringify(bultosABordo));
          
          const viewHwb = document.getElementById('bordo-last-hwb');
          if (viewHwb && item.hwb) viewHwb.textContent = `HWB: ${item.hwb}`;
          
          const viewDest = document.getElementById('bordo-last-dest');
          if (viewDest && item.destinatario) viewDest.textContent = item.destinatario;
          
          actualizarUIBordo();
        }
      }
    }
  } catch(e) {}
}

function actualizarUIBordo() {
  const total = bultosABordo.length;

  const counterNav = document.getElementById('counter-bordo');
  if (counterNav) counterNav.textContent = `${total} A Bordo`;

  const dockCount = document.getElementById('dock-bordo-count');
  if (dockCount) dockCount.textContent = total;

  const badgeHome = document.getElementById('badge-a-bordo-count');
  if (badgeHome) badgeHome.textContent = `${total} Bultos`;

  const lblSesion = document.getElementById('lbl-total-bordo-sesion');
  if (lblSesion) lblSesion.textContent = `${total} bultos`;

  const container = document.getElementById('pids-bordo-chips-container');
  if (!container) return;

  if (total === 0) {
    container.innerHTML = '<span class="chip-empty">⚡ Los bultos a bordo aparecerán aquí</span>';
    return;
  }

  container.innerHTML = bultosABordo.map((item, idx) => `
    <div class="pid-chip chip-onboard" style="display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);border-radius:8px;padding:3px 8px;font-size:0.75rem;margin:2px 4px 2px 0;">
      <span style="color:var(--emerald);font-weight:900;">✓</span>
      <span style="font-weight:700;color:#FFFFFF;">${item.pid}</span>
      <span style="color:var(--text-muted);font-size:0.65rem;">${item.hora ? item.hora.substring(0, 5) : ''}</span>
      <button type="button" onclick="quitarBultoBordo(${idx})" style="background:none;border:none;color:#F87171;font-size:0.7rem;cursor:pointer;padding:0 2px;">✕</button>
    </div>
  `).join('');
}

window.quitarBultoBordo = function(idx) {
  initAudio();
  if (idx >= 0 && idx < bultosABordo.length) {
    const rem = bultosABordo.splice(idx, 1);
    localStorage.setItem('ollin_bultos_a_bordo', JSON.stringify(bultosABordo));
    actualizarUIBordo();
    playBeep('incidencia');
    showToast(`Bulto removido: ${rem[0].pid}`, '🗑️');
  }
};

window.limpiarSesionBordo = function() {
  if (bultosABordo.length === 0) return;
  if (!confirm('¿Deseas reiniciar la lista de bultos a bordo?')) return;
  bultosABordo = [];
  localStorage.removeItem('ollin_bultos_a_bordo');
  const viewPid = document.getElementById('bordo-last-pid');
  if (viewPid) viewPid.textContent = '---';
  const viewHwb = document.getElementById('bordo-last-hwb');
  if (viewHwb) viewHwb.textContent = 'SIN BULTOS BIPIADOS';
  const viewDest = document.getElementById('bordo-last-dest');
  if (viewDest) viewDest.textContent = 'Escanea los paquetes físicos para cargarlos';
  actualizarUIBordo();
  showToast('Lista de carga reiniciada', '🗑️');
};

window.confirmarCargaYSalirARuta = async function() {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(50);

  if (bultosABordo.length === 0) {
    playBeep('error');
    showToast('Escanea al menos un bulto para subir a bordo', '⚠️');
    return;
  }

  showToast('Sincronizando bultos a bordo...', '⏳');

  try {
    const devId = getOrCreateDeviceId();
    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        accion: 'sincronizar_carga_a_bordo',
        chofer: CURRENT_USER,
        device_id: devId,
        pids: bultosABordo
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      console.log('Sincronización a bordo exitosa:', data);
    }
  } catch(e) {
    console.warn('Sincronización a bordo guardada en modo contingencia:', e);
  }

  playBeep('ok');
  showToast(`🎉 ¡${bultosABordo.length} bultos confirmados A_BORDO! Iniciando ruta...`, '🚀');

  setTimeout(() => {
    navegarA('view-entrega');
  }, 600);
};

window.consultarAsignacionRampa = async function() {
  initAudio();
  showToast('Actualizando asignación de ruta...', '🔍');
  await cargarManifiestoOperativo(true);
  const count = MANIFIESTO_CHOFER.length;
  const aBordoCount = bultosABordo.length;
  playBeep('ok');
  showToast(`Asignados: ${count} bultos | A Bordo: ${aBordoCount}`, '📋');
};

// Escucha Láser Permanente - Entrega en Calle
const laserInput = document.getElementById('laser-input');
let laserDebounce = null;

if (laserInput) {
  laserInput.addEventListener('keydown', (e) => {
    initAudio();
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(laserDebounce);
      laserDebounce = setTimeout(() => {
        const val = laserInput.value;
        if (val) {
          procesarCodigoEscaneado(val);
          laserInput.value = '';
          laserInput.focus();
        }
      }, 35);
    }
  });
}

// Escucha Láser Permanente - Carga A Bordo
const laserInputBordo = document.getElementById('laser-input-bordo');
let laserBordoDebounce = null;

if (laserInputBordo) {
  laserInputBordo.addEventListener('keydown', (e) => {
    initAudio();
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(laserBordoDebounce);
      laserBordoDebounce = setTimeout(() => {
        const val = laserInputBordo.value;
        if (val) {
          procesarCodigoCargaBordo(val);
          laserInputBordo.value = '';
          laserInputBordo.focus();
        }
      }, 35);
    }
  });
}

// Mantener Foco de Láser al Tocar Áreas Neutras en view-entrega y view-carga-bordo
document.addEventListener('click', (e) => {
  if (currentActiveView === 'view-entrega') {
    const isInteractive = e.target.closest('button, input, select, textarea, canvas, .bottom-sheet-modal');
    if (!isInteractive && laserInput) {
      laserInput.focus();
    }
  }
  if (currentActiveView === 'view-carga-bordo') {
    const isInteractive = e.target.closest('button, input, select, textarea, canvas, .bottom-sheet-modal');
    if (!isInteractive && laserInputBordo) {
      laserInputBordo.focus();
    }
  }
});

// ====================================================================
// 8. PROCESAMIENTO DE BULTOS, GUÍA MADRE Y MULTIBULTO DESGLOSADO
// ====================================================================
function procesarCodigoEscaneado(rawCode) {
  const clean = sanitizarPID(rawCode);
  if (!clean || clean.length < 8) {
    playBeep('error');
    showToast('Código muy corto o inválido', '⚠️');
    return;
  }

  // Prevenir duplicado en el mismo lote
  const existe = bultosLote.find(b => b.pid === clean);
  if (existe) {
    playBeep('incidencia');
    showToast(`Bulto ya escaneado en lote (${clean})`, 'ℹ️');
    return;
  }

  const cleanEmail = CURRENT_USER.trim().toLowerCase();
  const esSupervisor = (userRol === 'TLAYACANQUI' || cleanEmail.includes('sidharta') || cleanEmail.includes('irvin'));

  // 🛡️ CANDADO POKA-YOKE: CONTROL DE ACCESO EN ENTREGA (CALLE)
  let infoBulto = null;
  if (MANIFIESTO_GLOBAL && MANIFIESTO_GLOBAL.pids_lookup) {
    infoBulto = MANIFIESTO_GLOBAL.pids_lookup[clean] || MANIFIESTO_GLOBAL.pids_lookup[rawCode.trim().toUpperCase()];
  }

  if (!esSupervisor && infoBulto) {
    const choferAsignado = String(infoBulto.chofer || '').trim().toLowerCase();
    const coincideChofer = choferAsignado && (
      choferAsignado === cleanEmail ||
      choferAsignado.includes(cleanEmail.split('@')[0]) ||
      cleanEmail.includes(choferAsignado.split('@')[0])
    );

    if (!coincideChofer) {
      const choferNombre = DIRECTORIO_POCHTECAS[choferAsignado] ? DIRECTORIO_POCHTECAS[choferAsignado].nombre : choferAsignado;
      mostrarModalBloqueo({
        titulo: '⛔ GUÍA NO ASIGNADA A TU PERFIL',
        pid: clean,
        hwb: infoBulto.hwb || 'N/A',
        chofer: choferNombre || 'Otro Operador',
        motivo: 'Este paquete no corresponde a tu ruta asignada. Por seguridad de trazabilidad, no puedes registrar entregas ajenas.'
      });
      return;
    }
  }

  // Si no figura en el manifiesto y el operador es Pochteca
  if (!esSupervisor && MANIFIESTO_CHOFER.length > 0 && !infoBulto) {
    mostrarModalBloqueo({
      titulo: '⚠️ BULTO NO RECONOCIDO EN RUTA',
      pid: clean,
      hwb: 'SIN REGISTRO',
      chofer: 'NO ASIGNADO',
      motivo: 'Este paquete no figura en tu manifiesto de ruta del día.'
    });
    return;
  }

  // 🛡️ CANDADO INVIOLABLE DE RAMPA: OBLIGATORIO HABER MUTADO DE PRE_ASIGNADO A 'A_BORDO'
  const estaABordo = (
    bultosABordo.some(b => b.pid === clean || b.raw === rawCode.trim() || b.raw === clean) ||
    (infoBulto && (infoBulto.a_bordo === true || infoBulto.escaneo_validacion === 'A_BORDO'))
  );

  if (!esSupervisor && !estaABordo) {
    playBeep('error');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    mostrarModalBloqueo({
      titulo: '⛔ CANDADO DE RAMPA: BULTO NO ESTÁ A BORDO',
      pid: clean,
      hwb: (infoBulto && infoBulto.hwb) || 'N/A',
      chofer: CURRENT_USER,
      motivo: 'Este paquete se encuentra en estatus PRE-ASIGNADO / SIN CARGAR. Está estrictamente prohibido entregar paquetes en calle sin haber sido validados físicamente en rampa. Debes subirlo primero en el módulo "Carga a Bordo".'
    });
    return;
  }

  // 🛡️ CANDADO ANTI-ERROR: VALIDAR QUE EL BULTO PERTENEZCA A LA GUÍA/PARADA ACTIVA
  if (currentHwb && infoBulto && infoBulto.hwb && String(infoBulto.hwb).trim() !== String(currentHwb).trim()) {
    playBeep('error');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    mostrarModalBloqueo({
      titulo: '⚠️ DISCREPANCIA: PAQUETE DE OTRA PARADA',
      pid: clean,
      hwb: infoBulto.hwb,
      chofer: CURRENT_USER,
      motivo: `Este paquete pertenece a la Guía Madre ${infoBulto.hwb}, NO a la parada activa actual (${currentHwb}). Verifica el paquete físico que tienes en la mano para evitar una mala entrega.`
    });
    return;
  }

  // 🎯 VISUALIZACIÓN INMEDIATA DE GUÍA MADRE (0ms)
  if (infoBulto) {
    currentHwb = infoBulto.hwb || '';
    
    // Desplegar HWB Madre
    const viewHwb = document.getElementById('view-hwb');
    if (viewHwb && infoBulto.hwb) viewHwb.textContent = `HWB: ${infoBulto.hwb}`;

    // Desplegar Destinatario y Dirección
    const viewDest = document.getElementById('view-dest');
    if (viewDest) {
      const detalles = [infoBulto.destinatario, infoBulto.direccion, infoBulto.tel ? `Tel: ${infoBulto.tel}` : ''].filter(Boolean);
      viewDest.textContent = detalles.length > 0 ? detalles.join(' • ') : 'Destinatario Verificado';
    }

    // Desplegar Bulto X de Y y Multibulto Chips
    const totalPzas = infoBulto.total_piezas || 1;
    let pidsHermanos = [clean];
    if (MANIFIESTO_GLOBAL && MANIFIESTO_GLOBAL.pids_lookup) {
      pidsHermanos = Object.values(MANIFIESTO_GLOBAL.pids_lookup)
        .filter(p => p.hwb === infoBulto.hwb)
        .map(p => p.pid);
    }
    const pidsUnicos = [...new Set(pidsHermanos)];
    currentPidsGuia = pidsUnicos.length > 0 ? pidsUnicos : [clean];

    const badgeRatio = document.getElementById('badge-piece-ratio');
    if (badgeRatio) {
      const escaneadosCount = bultosLote.filter(b => currentPidsGuia.includes(b.pid)).length + 1;
      badgeRatio.textContent = `Bulto ${escaneadosCount} de ${totalPzas}`;
    }

    renderChipsMultibulto(currentPidsGuia);
    renderizarAvatarFisionomia(deducirFisionomiaPaquete(infoBulto));
  } else if (clean.length === 10 && /^\d+$/.test(clean)) {
    // Si es HWB directa de 10 dígitos numéricos
    currentHwb = clean;
    const viewHwb = document.getElementById('view-hwb');
    if (viewHwb) viewHwb.textContent = `HWB: ${clean}`;
  }

  const nuevoBulto = {
    pid: clean,
    raw: rawCode.trim(),
    estatus: currentCheckpointSeleccionado || 'OK',
    hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    hwb: currentHwb || (infoBulto ? infoBulto.hwb : '')
  };

  bultosLote.unshift(nuevoBulto);

  // Actualizar Ficha Visual Inmediata
  const viewPid = document.getElementById('view-pid');
  if (viewPid) viewPid.textContent = `PID: ${clean}`;

  actualizarContadoresUI();
  playBeep('ok');
  showToast(`Escaneado: ${clean}`, '📦');

  // Consulta Asíncrona a Bóveda / BD Ruta para Guía Madre y Multibulto (Enriquecimiento)
  consultarMemoriaDomicilioAsync(clean);
}

function actualizarContadoresUI() {
  const total = bultosLote.length;
  const counterNav = document.getElementById('counter-bultos');
  if (counterNav) counterNav.textContent = `${total} Bulto${total === 1 ? '' : 's'}`;

  const dockCount = document.getElementById('dock-bultos-count');
  if (dockCount) dockCount.textContent = total;

  const btnSubmit = document.getElementById('btn-guardar-lote');
  if (btnSubmit) {
    btnSubmit.innerHTML = `<span>🚀</span> Confirmar (${total})`;
  }
}

// Consulta de Guía Madre, Multibulto y Memoria Previa
async function consultarMemoriaDomicilioAsync(cleanPid) {
  try {
    const url = `${WEBHOOK_URL}?accion=consultar_memoria_domicilio&pid=${encodeURIComponent(cleanPid)}`;
    const resp = await fetch(url, { method: 'GET' });
    if (resp.ok) {
      const data = await resp.json();
      if (data && (data.hwb || data.pids_asociados || data.encontrada)) {
        renderGuiaMadreMultibulto(data, cleanPid);
      }
    }
  } catch (err) {
    console.warn('Consulta memoria en segundo plano silente:', err);
  }
}

function renderGuiaMadreMultibulto(data, currentPid) {
  if (data.hwb) {
    currentHwb = data.hwb;
    const viewHwb = document.getElementById('view-hwb');
    if (viewHwb) viewHwb.textContent = `HWB: ${data.hwb}`;
  }

  // Desglose Multibulto
  const totalPzas = data.total_piezas || 1;
  const pidsList = data.pids_asociados || [currentPid];
  currentPidsGuia = pidsList;

  const badgeRatio = document.getElementById('badge-piece-ratio');
  if (badgeRatio) {
    const pzasEscaneadas = bultosLote.filter(b => pidsList.includes(b.pid)).length;
    badgeRatio.textContent = `Bulto ${pzasEscaneadas || 1} de ${totalPzas}`;
  }

  // Destinatario y Dirección
  const viewDest = document.getElementById('view-dest');
  if (viewDest) {
    const info = [data.destinatario_habitual, data.direccion, data.cp ? `CP ${data.cp}` : ''].filter(Boolean).join(' • ');
    viewDest.textContent = info || 'Destinatario Verificado en Ruta';
  }

  // Alertas Internacional / Aduana
  const wrapAlerts = document.getElementById('package-badges-wrap');
  const pillInter = document.getElementById('pill-inter-package');
  const pillAduana = document.getElementById('pill-aduana-package');
  let hasAlerts = false;

  if (data.inter && data.inter.toLowerCase().includes('inter')) {
    if (pillInter) pillInter.style.display = 'inline-flex';
    hasAlerts = true;
  } else if (pillInter) {
    pillInter.style.display = 'none';
  }

  if (data.monto_aduana && parseFloat(data.monto_aduana) > 0) {
    if (pillAduana) pillAduana.style.display = 'inline-flex';
    const viewAduana = document.getElementById('view-aduana-amount');
    if (viewAduana) viewAduana.textContent = parseFloat(data.monto_aduana).toFixed(2);
    hasAlerts = true;
  } else if (pillAduana) {
    pillAduana.style.display = 'none';
  }

  if (wrapAlerts) wrapAlerts.style.display = hasAlerts ? 'flex' : 'none';

  // Renderizar Chips de PIDs Multibulto
  renderChipsMultibulto(pidsList);

  // 🏛️ Cotejo y Memoria Histórica Amoxcalli
  currentMemoriaAmoxcalli = data;
  if (data.encontrada || data.foto_fachada_previa || data.notas_localizacion || data.amoxcalli_resumen) {
    const cardMem = document.getElementById('card-memoria');
    const txtRcvr = document.getElementById('memoria-receiver-text');
    const txtNotes = document.getElementById('memoria-notes-text');
    const thumb = document.getElementById('memoria-thumb');

    if (cardMem) cardMem.style.display = 'flex';
    if (txtRcvr) {
      const prevCount = data.total_entregas_previas ? ` (${data.total_entregas_previas} previas)` : '';
      txtRcvr.textContent = (data.destinatario_habitual || 'Histórico Amoxcalli') + prevCount;
    }
    if (txtNotes) {
      txtNotes.textContent = data.amoxcalli_resumen || data.notas_localizacion || 'Antecedente verificado en Amoxcalli';
    }
    if (data.foto_fachada_previa && thumb) {
      thumb.src = data.foto_fachada_previa;
      thumb.style.display = 'block';
      thumb.onclick = () => abrirModalImagen(data.foto_fachada_previa);
    }
  }
}

function renderChipsMultibulto(pidsList) {
  const container = document.getElementById('pids-chips-container');
  if (!container) return;

  if (!pidsList || pidsList.length === 0) {
    container.innerHTML = `<span class="chip-empty">Monobulto Único</span>`;
    return;
  }

  container.innerHTML = pidsList.map(pid => {
    const estaEscaneado = bultosLote.some(b => b.pid === pid);
    const badgeClass = estaEscaneado ? 'pid-chip scanned' : 'pid-chip pending';
    const icon = estaEscaneado ? '✓' : '⏳';
    return `<div class="${badgeClass}"><span>${icon}</span> ${pid}</div>`;
  }).join('');
}

// ====================================================================
// 9. REJILLA ERGONÓMICA DE 2 COLUMNAS (CHECKPOINTS OBSIDIAN)
// ====================================================================
window.asignarCheckpointActivo = function(cp, abrirModal = true) {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(40);
  currentCheckpointSeleccionado = cp;

  // Actualizar Botones Obsidian
  const btns = document.querySelectorAll('.btn-cp-obsidian');
  btns.forEach(b => b.classList.remove('active'));

  const activeBtn = document.getElementById(`btn-obsidian-${cp.toLowerCase()}`);
  if (activeBtn) activeBtn.classList.add('active');

  const lbl = document.getElementById('current-checkpoint-label');
  if (lbl) lbl.textContent = `Seleccionado: ${cp}`;

  // Si hay bultos escaneados, aplicar al bulto activo en la cima
  if (bultosLote.length > 0) {
    bultosLote[0].estatus = cp;
    if (cp === 'OK') playBeep('ok');
    else playBeep('incidencia');
    showToast(`Checkpoint ${cp} asignado a ${bultosLote[0].pid}`, '🎯');
  } else {
    showToast(`Siguiente bulto se registrará como ${cp}`, 'ℹ️');
  }

  // 🎯 FLUJO GUIADO POKA-YOKE: Enviar inmediatamente a la vista de Evidencia SÓLO si abrirModal es true
  if (abrirModal) {
    setTimeout(() => {
      abrirBottomSheetEvidencia();
    }, 220);
  }
};

window.toggleExtraCheckpoints = function() {
  initAudio();
  const panel = document.getElementById('extra-checkpoints-panel');
  const btn = document.getElementById('btn-toggle-extra-cp');
  if (!panel) return;
  const isHidden = panel.style.display === 'none' || !panel.style.display;
  panel.style.display = isHidden ? 'grid' : 'none';
  if (btn) btn.innerHTML = isHidden ? '<span>➖</span> Ocultar Otros' : '<span>➕</span> Otros Checkpoints (CM, Rescate, FD, WC)';
};

// ====================================================================
// 10. BOTTOM SHEET MODAL (EVIDENCIA, FIRMA Y FOTO)
// ====================================================================
window.abrirBottomSheetEvidencia = function() {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(30);

  const sheet = document.getElementById('sheet-evidencia');
  const backdrop = document.getElementById('sheet-evidencia-backdrop');
  if (sheet) sheet.style.display = 'block';
  if (backdrop) backdrop.style.display = 'block';

  // Contextualizar encabezado y etiquetas según checkpoint seleccionado
  const sheetTitle = document.querySelector('#sheet-evidencia .sheet-title');
  const wrapReceptor = document.getElementById('wrap-receptor-input');
  const labelTitle = document.getElementById('label-receptor-title');
  const labelNotice = document.getElementById('label-receptor-notice');
  const inputReceptor = document.getElementById('input-receptor-nombre');
  const sigContainer = document.getElementById('sig-container');
  const banner7CA = document.getElementById('banner-7ca-exempt');
  const btnPhotoText = document.getElementById('btn-photo-capture-text');
  const photoNotice = document.getElementById('photo-requirement-notice');
  const audioQuickTitle = document.getElementById('evidencia-audio-quick-title');
  const audioQuickDesc = document.getElementById('evidencia-audio-quick-desc');
  const audioQuickIcon = document.getElementById('evidencia-audio-quick-icon');

  const cp = currentCheckpointSeleccionado || 'OK';

  // Estado del audio dentro de la evidencia
  if (audioBase64) {
    if (audioQuickIcon) audioQuickIcon.textContent = '✅';
    if (audioQuickTitle) audioQuickTitle.textContent = 'Audio-Evidencia Lista';
    if (audioQuickDesc) audioQuickDesc.textContent = 'Nota de voz guardada. Toca para regrabar.';
  } else {
    if (audioQuickIcon) audioQuickIcon.textContent = '🎙️';
    if (audioQuickTitle) audioQuickTitle.textContent = 'Nota de Voz Teoyolotl (Pendiente)';
    if (audioQuickDesc) audioQuickDesc.textContent = 'Toca aquí para grabar la nota de voz';
  }

  // 🎯 MATRIZ DINÁMICA DE EVIDENCIAS POR CHECKPOINT
  if (cp === 'OK') {
    // ENTREGA CONFORME
    if (sheetTitle) sheetTitle.innerHTML = `<span>📋</span> Evidencia de Entrega: OK (Entregado)`;
    if (wrapReceptor) wrapReceptor.style.display = 'block';
    if (labelTitle) labelTitle.textContent = '👤 NOMBRE DE QUIEN RECIBE *';
    if (labelNotice) {
      labelNotice.textContent = 'Requerido para piezas entregadas';
      labelNotice.style.color = 'var(--text-muted)';
    }
    if (inputReceptor) inputReceptor.placeholder = 'Nombre completo de quien recibe...';

    // Firma: evalúa 7CA
    if (userTiene7CA) {
      if (sigContainer) sigContainer.style.display = 'none';
      if (banner7CA) banner7CA.style.display = 'flex';
    } else {
      if (sigContainer) sigContainer.style.display = 'block';
      if (banner7CA) banner7CA.style.display = 'none';
      setTimeout(() => { if (sigPadEntrega) sigPadEntrega.resize(); }, 100);
    }

    if (btnPhotoText) btnPhotoText.textContent = '📸 Capturar Foto Fachada / Paquete Entregado';
    if (photoNotice) {
      photoNotice.textContent = 'Foto recomendada para respaldo';
      photoNotice.style.color = 'var(--text-muted)';
    }

  } else if (cp === 'NH') {
    // NADIE EN DOMICILIO
    if (sheetTitle) sheetTitle.innerHTML = `<span>🏠</span> Incidencia: NH (Nadie en Domicilio)`;
    if (wrapReceptor) wrapReceptor.style.display = 'none';
    if (sigContainer) sigContainer.style.display = 'none';
    if (banner7CA) banner7CA.style.display = 'none';
    if (btnPhotoText) btnPhotoText.textContent = '📸 Foto Fachada con Número Exterior (Comprobante Visita) *';
    if (photoNotice) {
      photoNotice.textContent = '⚠️ Obligatorio: Comprueba que llegaste a la puerta del cliente';
      photoNotice.style.color = '#F59E0B';
    }

  } else if (cp === 'BA') {
    // DIRECCIÓN ERRÓNEA
    if (sheetTitle) sheetTitle.innerHTML = `<span>🗺️</span> Incidencia: BA (Dirección Errónea)`;
    if (wrapReceptor) wrapReceptor.style.display = 'none';
    if (sigContainer) sigContainer.style.display = 'none';
    if (banner7CA) banner7CA.style.display = 'none';
    if (btnPhotoText) btnPhotoText.textContent = '📸 Foto de Esquina / Placa de Calle / Nomenclatura *';
    if (photoNotice) {
      photoNotice.textContent = '⚠️ Obligatorio: Comprueba que buscaste en la zona';
      photoNotice.style.color = '#F59E0B';
    }

  } else if (cp === 'CA') {
    // NEGOCIO CERRADO
    if (sheetTitle) sheetTitle.innerHTML = `<span>🏢</span> Incidencia: CA (Negocio Cerrado)`;
    if (wrapReceptor) wrapReceptor.style.display = 'none';
    if (sigContainer) sigContainer.style.display = 'none';
    if (banner7CA) banner7CA.style.display = 'none';
    if (btnPhotoText) btnPhotoText.textContent = '📸 Foto del Local Cerrado / Cortina / Letrero *';
    if (photoNotice) {
      photoNotice.textContent = '⚠️ Obligatorio: Muestra que el negocio u oficina está fuera de horario';
      photoNotice.style.color = '#F59E0B';
    }

  } else if (cp === 'RD') {
    // RECHAZADO POR CLIENTE
    if (sheetTitle) sheetTitle.innerHTML = `<span>🚫</span> Incidencia: RD (Rechazado por Cliente)`;
    if (wrapReceptor) wrapReceptor.style.display = 'block';
    if (labelTitle) labelTitle.textContent = '👤 PERSONA QUE RECHAZA (OPCIONAL)';
    if (labelNotice) {
      labelNotice.textContent = 'Nombre de quien rechazó el paquete (si lo proporcionó)';
      labelNotice.style.color = '#F59E0B';
    }
    if (inputReceptor) inputReceptor.placeholder = 'Nombre de quien rechazó...';
    if (sigContainer) sigContainer.style.display = 'none';
    if (banner7CA) banner7CA.style.display = 'none';
    if (btnPhotoText) btnPhotoText.textContent = '📸 Foto del Paquete / Daño reportado *';
    if (photoNotice) {
      photoNotice.textContent = '⚠️ Obligatorio: Evidencia visual del motivo de rechazo';
      photoNotice.style.color = '#EF4444';
    }
  } else {
    // OTRO CHECKPOINT
    if (sheetTitle) sheetTitle.innerHTML = `<span>⚠️</span> Incidencia: ${cp}`;
    if (wrapReceptor) wrapReceptor.style.display = 'none';
    if (sigContainer) sigContainer.style.display = 'none';
    if (banner7CA) banner7CA.style.display = 'none';
    if (btnPhotoText) btnPhotoText.textContent = `📸 Foto Comprobante de Incidencia (${cp}) *`;
    if (photoNotice) {
      photoNotice.textContent = 'Comprobante visual obligatorio';
      photoNotice.style.color = '#F59E0B';
    }
  }
};

window.cerrarBottomSheetEvidencia = function() {
  initAudio();
  const sheet = document.getElementById('sheet-evidencia');
  const backdrop = document.getElementById('sheet-evidencia-backdrop');
  if (sheet) sheet.style.display = 'none';
  if (backdrop) backdrop.style.display = 'none';
};

// ====================================================================
// 11. CANVAS DE FIRMA DIGITAL Y CAPTURA FOTOGRÁFICA
// ====================================================================
function setupCanvas(canvasId, clearBtnId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return { hasSignature: () => false, clear: () => {}, toDataURL: () => '', resize: () => {} };
  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let hasSig = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) {
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }
  window.addEventListener('resize', resize);
  setTimeout(resize, 150);

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    initAudio();
    isDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    hasSig = true;
  });

  canvas.addEventListener('touchend', () => isDrawing = false);

  const clearBtn = document.getElementById(clearBtnId);
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      initAudio();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSig = false;
    });
  }

  return {
    hasSignature: () => hasSig,
    clear: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); hasSig = false; },
    toDataURL: (type = 'image/png') => (hasSig ? canvas.toDataURL(type) : ''),
    resize: resize
  };
}

const sigPadEntrega = setupCanvas('sig-canvas', 'btn-clear-canvas');
const sigPadPU = setupCanvas('sig-pu-canvas', 'btn-clear-pu-sig');

// Captura de Foto con Compresión
function setupPhotoCapture(btnId, inputId, previewId, callback) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    initAudio();
    input.click();
  });

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 900;
        let w = img.width;
        let h = img.height;
        if (w > h && w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        else if (h > MAX) { w = Math.round((w * MAX) / h); h = MAX; }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.68);

        if (preview) {
          preview.src = compressedBase64;
          preview.style.display = 'block';
        }
        callback(compressedBase64);
        playBeep('ok');
        showToast('Foto capturada y guardada', '📸');

        // 🎯 FLUJO GUIADO POKA-YOKE: Si se ingresó foto en view-entrega,
        // transitar automáticamente a la captura de Audio-Evidencia
        if (previewId === 'photo-preview-img') {
          setTimeout(() => {
            cerrarBottomSheetEvidencia();
            abrirBottomSheetAudio(false);
          }, 650);
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

setupPhotoCapture('btn-take-photo', 'photo-input', 'photo-preview-img', (b64) => { photoBase64 = b64; });
setupPhotoCapture('btn-take-pu-photo', 'photo-pu-input', 'photo-pu-preview-img', (b64) => { photoPUBase64 = b64; });

// ====================================================================
// 12. TEOYOLOTL MIC (GRABACIÓN DE VOZ DE 13 SEGUNDOS) Y MODAL DE AUDIO
// ====================================================================
let speechRecognizer = null;
let liveTranscriptText = '';
let iaCountdownInterval = null;
let iaCountdownRemaining = 3;
let iaPendingInterpretation = null;

function iniciarReconocimientoVozLive() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  liveTranscriptText = '';
  if (!SpeechRec) {
    console.log('Web Speech API no disponible en este dispositivo, usando grabación directa MediaRecorder.');
    return;
  }
  try {
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch(e) {}
    }
    speechRecognizer = new SpeechRec();
    speechRecognizer.lang = 'es-MX';
    speechRecognizer.continuous = true;
    speechRecognizer.interimResults = true;

    speechRecognizer.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          liveTranscriptText += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const fullText = (liveTranscriptText + ' ' + interim).trim();
      const modalDesc = document.getElementById('audio-sheet-status-desc');
      if (modalDesc && fullText) {
        modalDesc.textContent = `🗣️ "${fullText}"`;
      }
    };

    speechRecognizer.onerror = (e) => {
      console.warn('SpeechRecognition warning:', e.error);
    };

    speechRecognizer.start();
  } catch(eRec) {
    console.warn('No se pudo inicializar SpeechRecognition:', eRec);
  }
}

function detenerReconocimientoVozLive() {
  if (speechRecognizer) {
    try {
      speechRecognizer.stop();
    } catch(e) {}
    speechRecognizer = null;
  }
}

function clasificarIntencionVozPochteca(textoVoz) {
  if (!textoVoz) return null;
  const t = textoVoz.toLowerCase().trim();

  // Patrón 1: Entrega Exitosa (OK) con extracción de Nombre
  const matchOk = t.match(/(?:entregado|entregue|recibi[oó]|se entreg[oó]|conforme|se lo dej[eé]|se lo di)\s+(?:a\s+|con\s+)?([a-z\u00f1\u00e1\u00e9\u00ed\u00f3\u00fa\s]{3,40})/i);
  if (matchOk) {
    let rawNombre = matchOk[1].replace(/(?:en mano|en puerta|todo bien|gracias|paquete|guia|bulto|conforme).*/i, '').trim();
    if (rawNombre.length >= 3) {
      return {
        checkpoint: 'OK',
        nombre: rawNombre.toUpperCase(),
        confianza: 95,
        titulo: 'Checkpoint OK Detectado',
        desc: `Receptor: "${rawNombre.toUpperCase()}"`,
        motivo: 'Entrega conforme a titular o familiar'
      };
    }
  }

  // Patrón 1b: OK genérico
  if (/entregad[ao]|se entreg[oó]|recibid[ao]|todo bien|conforme/i.test(t)) {
    return {
      checkpoint: 'OK',
      nombre: 'ENTREGA_CONFORME',
      confianza: 90,
      titulo: 'Checkpoint OK Detectado',
      desc: 'Entrega Exitosa',
      motivo: 'Entrega conforme'
    };
  }

  // Patrón 2: Domicilio Cerrado / Ausente (NH)
  if (/no hay nadie|nadie en casa|est[aá] cerrado|no abren|no contestan|no respondieron|ausente|toqu[eé] y no abren/i.test(t)) {
    return {
      checkpoint: 'NH',
      nombre: 'NADIE_EN_DOMICILIO',
      confianza: 98,
      titulo: 'Incidencia NH Detectada',
      desc: 'Nadie en Domicilio / Sin respuesta',
      motivo: 'Domicilio cerrado sin respuesta'
    };
  }

  // Patrón 3: Dirección Errónea / No Localizada (BA)
  if (/direcci[oó]n no existe|no encontr[eé]|no existe el n[uú]mero|calle err[oó]nea|no coincide|falta n[uú]mero|no vive aqu[ií]|no corresponde|no encuentro la calle/i.test(t)) {
    return {
      checkpoint: 'BA',
      nombre: 'DIRECCION_ERRONEA_NO_LOCALIZADA',
      confianza: 98,
      titulo: 'Incidencia BA Detectada',
      desc: 'Dirección o número no localizado',
      motivo: 'Dirección no encontrada en campo'
    };
  }

  // Patrón 4: Negocio Cerrado (CA)
  if (/empresa cerrada|negocio cerrado|oficina cerrada|cortina abajo|fuera de horario|cerrado por comida/i.test(t)) {
    return {
      checkpoint: 'CA',
      nombre: 'NEGOCIO_CERRADO',
      confianza: 95,
      titulo: 'Incidencia CA Detectada',
      desc: 'Comercio u oficina fuera de horario',
      motivo: 'Negocio cerrado'
    };
  }

  // Patrón 5: Rechazado (RD)
  if (/rechaz[oó]|no lo quiso|da[ñn]ado|roto|no solicit[oó]|no tiene dinero|no va a pagar/i.test(t)) {
    return {
      checkpoint: 'RD',
      nombre: 'RECHAZO_POR_CLIENTE',
      confianza: 95,
      titulo: 'Incidencia RD Detectada',
      desc: 'Cliente rechazó el paquete',
      motivo: 'Rechazo de entrega'
    };
  }

  return null;
}

window.mostrarTarjetaIACopilot = function(interp) {
  iaPendingInterpretation = interp;
  const card = document.getElementById('ia-copilot-card');
  const tit = document.getElementById('ia-copilot-title');
  const desc = document.getElementById('ia-copilot-desc');
  const countdownSpan = document.getElementById('ia-countdown');

  if (tit) tit.textContent = `🤖 IA: ${interp.titulo}`;
  if (desc) desc.textContent = `${interp.desc} (${interp.confianza}% Confianza)`;
  if (card) card.style.display = 'flex';

  iaCountdownRemaining = 3;
  if (countdownSpan) countdownSpan.textContent = String(iaCountdownRemaining);

  if (iaCountdownInterval) clearInterval(iaCountdownInterval);
  iaCountdownInterval = setInterval(() => {
    iaCountdownRemaining--;
    if (countdownSpan) countdownSpan.textContent = String(iaCountdownRemaining);
    if (iaCountdownRemaining <= 0) {
      clearInterval(iaCountdownInterval);
      iaCountdownInterval = null;
      confirmarInterpretacionIA();
    }
  }, 1000);
};

window.confirmarInterpretacionIA = function() {
  if (iaCountdownInterval) {
    clearInterval(iaCountdownInterval);
    iaCountdownInterval = null;
  }
  const card = document.getElementById('ia-copilot-card');
  if (card) card.style.display = 'none';

  if (!iaPendingInterpretation) return;
  const interp = iaPendingInterpretation;
  iaPendingInterpretation = null;

  // Asignar checkpoint
  asignarCheckpointActivo(interp.checkpoint, false);

  // Asignar nombre si aplica
  const inputRcvr = document.getElementById('input-receptor-nombre');
  if (inputRcvr && interp.nombre && interp.checkpoint === 'OK') {
    inputRcvr.value = interp.nombre;
  }

  playBeep('ok');
  showToast(`IA aplicó: ${interp.checkpoint} • ${interp.desc}`, '🤖');

  // Si requiere foto y no hay foto, abrir modal de evidencia
  if (!photoBase64) {
    setTimeout(() => {
      abrirBottomSheetEvidencia();
    }, 300);
  }
};

window.cancelarInterpretacionIA = function() {
  if (iaCountdownInterval) {
    clearInterval(iaCountdownInterval);
    iaCountdownInterval = null;
  }
  const card = document.getElementById('ia-copilot-card');
  if (card) card.style.display = 'none';
  iaPendingInterpretation = null;
  showToast('Interpretación descartada. Elige manualmente.', 'ℹ️');
};

window.toggleGrabacionTeoyolotlCapsule = async function() {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(40);
  if (isRecording) {
    stopVoiceRecording();
  } else {
    await startVoiceRecording();
  }
};

async function startVoiceRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    recordingSeconds = 0;

    let mimeType = 'audio/webm';
    if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      clearInterval(recordingTimer);
      isRecording = false;
      detenerReconocimientoVozLive();

      const audioBlob = new Blob(audioChunks, { type: mimeType });
      const capsuleTimer = document.getElementById('capsule-timer-text');
      const capsuleSub = document.getElementById('capsule-sub-text');
      const capsuleMic = document.getElementById('capsule-teoyolotl-mic');

      if (capsuleMic) capsuleMic.classList.remove('recording');
      if (capsuleTimer) capsuleTimer.textContent = `(${recordingSeconds}s)`;
      if (capsuleSub) capsuleSub.textContent = '✅ Audio listo (Toca para regrabar)';

      const reader = new FileReader();
      reader.onloadend = () => {
        audioBase64 = reader.result;
        actualizarEstadoAudioModal(false);
        playBeep('ok');
        showToast('Nota de voz guardada', '🎙️');

        // Procesar transcripción con NLU local en <50ms
        setTimeout(() => {
          if (liveTranscriptText && liveTranscriptText.trim().length >= 3) {
            const interp = clasificarIntencionVozPochteca(liveTranscriptText);
            if (interp) {
              mostrarTarjetaIACopilot(interp);
            }
          }
        }, 200);
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorder.start(250);
    isRecording = true;
    iniciarReconocimientoVozLive();

    const capsuleMic = document.getElementById('capsule-teoyolotl-mic');
    const capsuleTimer = document.getElementById('capsule-timer-text');
    const capsuleSub = document.getElementById('capsule-sub-text');

    if (capsuleMic) capsuleMic.classList.add('recording');
    if (capsuleTimer) capsuleTimer.textContent = '(0s / 13s)';
    if (capsuleSub) capsuleSub.textContent = '🔴 Grabando (Auto-corte 13s)';

    actualizarEstadoAudioModal(false);

    recordingTimer = setInterval(() => {
      recordingSeconds++;
      if (capsuleTimer) capsuleTimer.textContent = `(${recordingSeconds}s / 13s)`;
      const modalTimer = document.getElementById('audio-sheet-timer');
      if (modalTimer) modalTimer.textContent = `(${recordingSeconds}s / 13s)`;
      if (recordingSeconds >= 13) {
        stopVoiceRecording();
      }
    }, 1000);

    showToast('Grabando nota de voz...', '🎙️');
  } catch (err) {
    console.warn('Mic access error:', err);
    showToast('No se pudo acceder al micrófono', '⚠️');
  }
}

function stopVoiceRecording() {
  detenerReconocimientoVozLive();
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

// 🎯 FLUJO POKA-YOKE: CONFIRMAR EVIDENCIA Y NAVEGAR A AUDIO
window.aplicarEvidenciaYContinuar = function() {
  initAudio();
  cerrarBottomSheetEvidencia();

  // "y en los casos que no meta imagen e intente 'listo / aplicar evidencia' te envie a la audio/evidencia, informando que aun esta pendiente la audio/evidencia"
  if (!audioBase64) {
    setTimeout(() => {
      abrirBottomSheetAudio(true); // true = con alerta de pendiente
    }, 200);
  } else {
    showToast('Evidencia registrada con éxito', '✅');
  }
};

window.abrirBottomSheetAudio = function(estaPendiente = false) {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(30);

  const sheet = document.getElementById('sheet-audio');
  const backdrop = document.getElementById('sheet-audio-backdrop');
  if (sheet) sheet.style.display = 'block';
  if (backdrop) backdrop.style.display = 'block';

  actualizarEstadoAudioModal(estaPendiente);
};

window.cerrarBottomSheetAudio = function() {
  initAudio();
  const sheet = document.getElementById('sheet-audio');
  const backdrop = document.getElementById('sheet-audio-backdrop');
  if (sheet) sheet.style.display = 'none';
  if (backdrop) backdrop.style.display = 'none';
};

function actualizarEstadoAudioModal(estaPendiente = false) {
  const btnMic = document.getElementById('btn-audio-sheet-mic');
  const timerEl = document.getElementById('audio-sheet-timer');
  const helperEl = document.getElementById('audio-sheet-helper');
  const banner = document.getElementById('audio-sheet-status-banner');
  const iconEl = document.getElementById('audio-sheet-status-icon');
  const titleEl = document.getElementById('audio-sheet-status-title');
  const descEl = document.getElementById('audio-sheet-status-desc');

  if (isRecording) {
    if (btnMic) {
      btnMic.classList.add('mic-recording-pulse');
      btnMic.innerHTML = '⏹️';
      btnMic.style.background = '#EF4444';
      btnMic.style.borderColor = '#F87171';
    }
    if (timerEl) timerEl.textContent = `(${recordingSeconds}s / 13s)`;
    if (helperEl) helperEl.textContent = '🔴 Grabando... Toca el botón para detener';
    if (banner) {
      banner.style.background = 'rgba(239,68,68,0.18)';
      banner.style.borderColor = '#EF4444';
    }
    if (iconEl) iconEl.textContent = '🔴';
    if (titleEl) titleEl.textContent = 'Grabando Audio-Evidencia...';
    if (descEl) descEl.textContent = 'Explica el resultado de la entrega o motivo de incidencia.';
  } else if (audioBase64) {
    if (btnMic) {
      btnMic.classList.remove('mic-recording-pulse');
      btnMic.innerHTML = '✅';
      btnMic.style.background = '#10B981';
      btnMic.style.borderColor = '#34D399';
    }
    if (timerEl) timerEl.textContent = `(${recordingSeconds || 13}s) - Listo`;
    if (helperEl) helperEl.textContent = '✅ Audio listo. Toca el botón para regrabar.';
    if (banner) {
      banner.style.background = 'rgba(16,185,129,0.15)';
      banner.style.borderColor = '#10B981';
    }
    if (iconEl) iconEl.textContent = '✅';
    if (titleEl) titleEl.textContent = 'Audio-Evidencia Lista';
    if (descEl) descEl.textContent = 'Nota de voz guardada. Pulsa Proceder para finalizar.';
  } else {
    if (btnMic) {
      btnMic.classList.remove('mic-recording-pulse');
      btnMic.innerHTML = '🎙️';
      btnMic.style.background = 'linear-gradient(135deg, #2563EB, #1D4ED8)';
      btnMic.style.borderColor = '#60A5FA';
    }
    if (timerEl) timerEl.textContent = '(0s / 13s)';
    if (helperEl) helperEl.textContent = 'Toca el micrófono para comenzar a hablar';
    if (estaPendiente) {
      if (banner) {
        banner.style.background = 'rgba(245,158,11,0.18)';
        banner.style.borderColor = '#F59E0B';
      }
      if (iconEl) iconEl.textContent = '⚠️';
      if (titleEl) titleEl.textContent = 'Audio-Evidencia Pendiente';
      if (descEl) descEl.textContent = 'Aún no has grabado tu nota de voz. Graba una breve explicación antes de confirmar.';
    } else {
      if (banner) {
        banner.style.background = 'rgba(59,130,246,0.15)';
        banner.style.borderColor = '#3B82F6';
      }
      if (iconEl) iconEl.textContent = '🎙️';
      if (titleEl) titleEl.textContent = 'Paso 2: Audio-Evidencia Teoyolotl';
      if (descEl) descEl.textContent = 'Graba una nota de voz explicando el detalle de la entrega o incidencia.';
    }
  }
}

window.toggleAudioModalRecording = async function() {
  await toggleGrabacionTeoyolotlCapsule();
  actualizarEstadoAudioModal(false);
};

window.finalizarAudioEvidencia = function() {
  initAudio();
  if (isRecording) {
    stopVoiceRecording();
  }
  cerrarBottomSheetAudio();

  // Destacar con pulso el botón de confirmar en el dock
  const btnSubmit = document.getElementById('btn-guardar-lote');
  if (btnSubmit) {
    btnSubmit.classList.add('glow-pulse');
    setTimeout(() => btnSubmit.classList.remove('glow-pulse'), 1600);
  }
  showToast('Evidencia completa. Pulsa Confirmar para enviar.', '🚀');
};

// ====================================================================
// 13. PERSISTENCIA OFFLINE EN INDEXEDDB (OllinEntregaMasivaDB)
// ====================================================================
const DB_NAME = 'OllinEntregaMasivaDB';
const DB_VERSION = 2;
const STORE_ENTREGAS = 'lotes_pendientes';
const STORE_PICKUPS = 'recolecciones_pendientes';
let dbInstance = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_ENTREGAS)) {
        db.createObjectStore(STORE_ENTREGAS, { keyPath: 'localId', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_PICKUPS)) {
        db.createObjectStore(STORE_PICKUPS, { keyPath: 'localId', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
      checkPendingRecords();
    };
    req.onerror = (e) => reject(e);
  });
}

async function saveLoteOffline(loteData) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ENTREGAS], 'readwrite');
    const store = tx.objectStore(STORE_ENTREGAS);
    const item = { ...loteData, tipo: 'ENTREGA', createdAt: Date.now() };
    const req = store.add(item);
    req.onsuccess = (e) => {
      loteData.localId = e.target.result;
      checkPendingRecords();
      resolve(e.target.result);
    };
    req.onerror = (e) => reject(e);
  });
}

async function savePickupOffline(puData) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PICKUPS], 'readwrite');
    const store = tx.objectStore(STORE_PICKUPS);
    const item = { ...puData, tipo: 'RECOLECCION', createdAt: Date.now() };
    const req = store.add(item);
    req.onsuccess = (e) => {
      puData.localId = e.target.result;
      checkPendingRecords();
      resolve(e.target.result);
    };
    req.onerror = (e) => reject(e);
  });
}

async function deletePendingRecord(storeName, localId) {
  const db = await openDatabase();
  return new Promise((resolve) => {
    const tx = db.transaction([storeName], 'readwrite');
    tx.objectStore(storeName).delete(localId);
    tx.oncomplete = () => {
      checkPendingRecords();
      resolve();
    };
  });
}

async function checkPendingRecords() {
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORE_ENTREGAS, STORE_PICKUPS], 'readonly');
    const reqE = tx.objectStore(STORE_ENTREGAS).count();
    const reqP = tx.objectStore(STORE_PICKUPS).count();

    tx.oncomplete = () => {
      const total = (reqE.result || 0) + (reqP.result || 0);
      const text = document.getElementById('net-status-text');
      if (text && navigator.onLine) {
        text.textContent = total > 0 ? `● EN LÍNEA (${total} pend. sync)` : '● EN LÍNEA / OFFLINE READY';
      }
    };
  } catch (e) {
    console.warn('Pending records check error:', e);
  }
}

// Sincronización Automática al Reconectar
async function syncOfflineData() {
  if (!navigator.onLine) return;
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORE_ENTREGAS, STORE_PICKUPS], 'readonly');
    const reqE = tx.objectStore(STORE_ENTREGAS).getAll();
    const reqP = tx.objectStore(STORE_PICKUPS).getAll();

    tx.oncomplete = async () => {
      const entregas = reqE.result || [];
      const pickups = reqP.result || [];
      if (entregas.length === 0 && pickups.length === 0) return;

      showToast(`Sincronizando ${entregas.length + pickups.length} registro(s)...`, '⏳');
      let sincronizados = 0;

      for (const lote of entregas) {
        try {
          const resp = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'sincronizar_entrega_masiva_offline',
              lote: lote
            })
          });
          if (resp.ok) {
            await deletePendingRecord(STORE_ENTREGAS, lote.localId);
            sincronizados++;
          }
        } catch (err) {
          console.warn('Error sincronizando entrega:', err);
        }
      }

      for (const pu of pickups) {
        try {
          const resp = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(pu)
          });
          if (resp.ok) {
            await deletePendingRecord(STORE_PICKUPS, pu.localId);
            sincronizados++;
          }
        } catch (err) {
          console.warn('Error sincronizando pickup:', err);
        }
      }

      if (sincronizados > 0) {
        playBeep('ok');
        showToast(`✅ ${sincronizados} registro(s) sincronizado(s)`, '🎉');
        actualizarKPIsDashboard();
      }
    };
  } catch (e) {
    console.warn('Sync offline data error:', e);
  }
}

window.addEventListener('online', () => {
  const badge = document.getElementById('net-badge-top');
  const text = document.getElementById('net-status-text');
  if (badge) badge.classList.remove('offline');
  if (text) text.textContent = '● EN LÍNEA / OFFLINE READY';
  syncOfflineData();
});

window.addEventListener('offline', () => {
  const badge = document.getElementById('net-badge-top');
  const text = document.getElementById('net-status-text');
  if (badge) badge.classList.add('offline');
  if (text) text.textContent = '○ MODO LOCAL / SIN RED';
});

// ====================================================================
// 14. CONFIRMACIÓN Y GUARDADO DE LOTE DE ENTREGA
// ====================================================================
const btnGuardarLote = document.getElementById('btn-guardar-lote');
if (btnGuardarLote) {
  btnGuardarLote.addEventListener('click', async () => {
    await confirmarYGuardarLote();
  });
}

const btnLimpiarLote = document.getElementById('btn-limpiar-lote');
if (btnLimpiarLote) {
  btnLimpiarLote.addEventListener('click', () => {
    initAudio();
    if (bultosLote.length === 0) return;
    if (confirm('¿Deseas reiniciar los bultos escaneados de este lote?')) {
      resetEntregaForm();
      showToast('Lote reiniciado', '🗑️');
    }
  });
}

async function confirmarYGuardarLote() {
  initAudio();
  if (bultosLote.length === 0) {
    playBeep('error');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    showToast('⛔ Candado Anti-Error: Debes escanear físicamente el código de barras (PID) del paquete', '⚠️');
    return;
  }

  // 🛡️ CANDADO DE SEGURIDAD: VERIFICAR QUE NINGÚN BULTO EN EL LOTE ESTÉ SIN ABORDAR
  const cleanEmail = CURRENT_USER.trim().toLowerCase();
  const esSupervisor = (userRol === 'TLAYACANQUI' || cleanEmail.includes('sidharta') || cleanEmail.includes('irvin'));
  if (!esSupervisor) {
    const haySinAbordar = bultosLote.some(b => {
      const info = MANIFIESTO_GLOBAL && MANIFIESTO_GLOBAL.pids_lookup ? (MANIFIESTO_GLOBAL.pids_lookup[b.pid] || MANIFIESTO_GLOBAL.pids_lookup[b.raw]) : null;
      const enBordo = bultosABordo.some(x => x.pid === b.pid || x.raw === b.raw);
      const enManifiesto = info && (info.a_bordo === true || info.escaneo_validacion === 'A_BORDO');
      return !enBordo && !enManifiesto;
    });

    if (haySinAbordar) {
      playBeep('error');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      mostrarModalBloqueo({
        titulo: '⛔ CANDADO DE RAMPA: BULTO NO ESTÁ A BORDO',
        pid: bultosLote[0].pid,
        hwb: currentHwb || 'N/A',
        chofer: CURRENT_USER,
        motivo: 'El lote contiene paquetes que no han sido subidos A_BORDO en rampa. Debes escanearlos primero en el módulo "Carga a Bordo".'
      });
      return;
    }
  }

  const hasAnyOk = bultosLote.some(b => b.estatus === 'OK');
  const inputRcvr = document.getElementById('input-receptor-nombre');
  let nombreRecibe = inputRcvr ? inputRcvr.value.trim() : '';

  // Poka-Yoke: Si hay OK, se requiere nombre de quien recibe
  if (hasAnyOk && !nombreRecibe) {
    playBeep('error');
    showToast('Escribe quién recibe el paquete en Evidencia', '✍️');
    abrirBottomSheetEvidencia();
    if (inputRcvr) inputRcvr.focus();
    return;
  }

  // Poka-Yoke Switch 7CA: Si NO tiene 7CA y hay OK, firma obligatoria
  const firmaData = sigPadEntrega.toDataURL('image/png');
  if (hasAnyOk && !userTiene7CA && !sigPadEntrega.hasSignature()) {
    playBeep('error');
    showToast('Se requiere la firma del cliente', '✍️');
    abrirBottomSheetEvidencia();
    return;
  }

  // 🛡️ POKA-YOKE INCIDENCIAS: Asignación automática de receptor y exigencia de foto comprobante
  if (!hasAnyOk) {
    const cp = currentCheckpointSeleccionado || 'INCIDENCIA';
    if (cp === 'NH') nombreRecibe = 'NADIE_EN_DOMICILIO';
    else if (cp === 'BA') nombreRecibe = 'DIRECCION_ERRONEA_NO_LOCALIZADA';
    else if (cp === 'CA') nombreRecibe = 'NEGOCIO_CERRADO';
    else if (cp === 'RD') nombreRecibe = nombreRecibe || 'RECHAZO_POR_CLIENTE';
    else nombreRecibe = `INCIDENCIA_${cp}`;

    if (!photoBase64) {
      playBeep('error');
      showToast(`⚠️ Toma una foto como comprobante de ${cp}`, '📸');
      abrirBottomSheetEvidencia();
      return;
    }
  }

  // 🎙️ POKA-YOKE INVIOLABLE: NOTA DE VOZ OBLIGATORIA (TODAS LAS ENTREGAS E INCIDENCIAS)
  if (!audioBase64) {
    playBeep('error');
    showToast('⚠️ La NOTA DE VOZ es obligatoria para confirmar', '🎙️');
    abrirBottomSheetEvidencia();
    const capsuleMic = document.getElementById('capsule-teoyolotl-mic');
    if (capsuleMic) {
      capsuleMic.scrollIntoView({ behavior: 'smooth', block: 'center' });
      capsuleMic.classList.add('pulse-mandatory');
      setTimeout(() => capsuleMic.classList.remove('pulse-mandatory'), 3000);
    }
    return;
  }

  // Obtener GPS más preciso disponible en campo
  let gpsStr = '';
  if (DRIVER_GPS && DRIVER_GPS.lat && DRIVER_GPS.lng) {
    gpsStr = `${DRIVER_GPS.lat.toFixed(6)},${DRIVER_GPS.lng.toFixed(6)}`;
  } else if (currentMemoriaAmoxcalli && currentMemoriaAmoxcalli.gps) {
    gpsStr = String(currentMemoriaAmoxcalli.gps).trim();
  } else if (MANIFIESTO_CHOFER && currentHwb) {
    const paradaGuia = MANIFIESTO_CHOFER.find(p => String(p.hwb).trim() === String(currentHwb).trim());
    if (paradaGuia && paradaGuia.lat && paradaGuia.lng && paradaGuia.lat !== 20.5931) {
      gpsStr = `${paradaGuia.lat},${paradaGuia.lng}`;
    }
  }

  // Preparar Carga Útil con Contexto Destinatario y Memoria Amoxcalli
  const lotePayload = {
    idMasivo: 'LOTE_' + Date.now().toString(36).toUpperCase(),
    chofer: CURRENT_USER,
    hwb: currentHwb || '',
    fechaHora: new Date().toISOString(),
    gps: gpsStr,
    nombreRecibe: nombreRecibe || 'ENTREGA_CONFORME',
    destinatarioEsperado: (currentMemoriaAmoxcalli && currentMemoriaAmoxcalli.destinatario_habitual) || '',
    direccionEsperada: (currentMemoriaAmoxcalli && currentMemoriaAmoxcalli.direccion) || '',
    cpEsperado: (currentMemoriaAmoxcalli && currentMemoriaAmoxcalli.cp) || '',
    antecedentesAmoxcalli: currentMemoriaAmoxcalli || null,
    firma: firmaData,
    foto: photoBase64,
    audio: audioBase64,
    piezas: bultosLote.map(b => ({
      pid: b.pid,
      raw: b.raw,
      estatus: b.estatus
    }))
  };

  // 1. Guardar de inmediato en IndexedDB local (< 50ms)
  const localId = await saveLoteOffline(lotePayload);
  lotePayload.localId = localId;

  // 2. Registrar en Bitácora del Turno (en memoria)
  bultosLote.forEach(b => {
    historialTurno.unshift({
      tipo: 'ENTREGA',
      pid: b.pid,
      hwb: currentHwb,
      estatus: b.estatus,
      hora: b.hora
    });
  });

  // 3. 🚀 RESPUESTA INMEDIATA AL OPERADOR (LATENCIA ZERO / POKAYOKE)
  playBeep('ok');
  showToast('🚀 ¡Entrega guardada! Regresando a hoja de ruta...', '⚡');
  cerrarBottomSheetEvidencia();
  cerrarBottomSheetAudio();
  resetEntregaForm(false);
  actualizarKPIsDashboard();

  // 🧭 Regresar inmediatamente a Hoja de Ruta Asistida (La parada completada avanza automáticamente)
  navegarA('view-hoja-ruta');
  if (typeof optimizarYGenerarHojaDeRuta === 'function') {
    optimizarYGenerarHojaDeRuta();
  }
  if (typeof renderHojaDeRutaAsistida === 'function') {
    renderHojaDeRutaAsistida();
  }

  // 4. ⚡ DESPACHO ASÍNCRONO EN SEGUNDO PLANO (SIN BLOQUEAR PANTALLA)
  despacharSincronizacionLoteSegundoPlano(lotePayload);
}

function resetEntregaForm(abrirModal = false) {
  bultosLote = [];
  currentHwb = '';
  currentPidsGuia = [];
  photoBase64 = '';
  audioBase64 = '';
  currentMemoriaAmoxcalli = null;

  // Limpiar inputs de archivo y vista previa de foto
  const photoInput = document.getElementById('photo-input');
  if (photoInput) photoInput.value = '';
  const photoPrev = document.getElementById('photo-preview-img');
  if (photoPrev) {
    photoPrev.src = '';
    photoPrev.style.display = 'none';
  }

  // Limpiar firma digital
  if (sigPadEntrega) sigPadEntrega.clear();

  // Limpiar nombre del receptor
  const inputRcvr = document.getElementById('input-receptor-nombre');
  if (inputRcvr) inputRcvr.value = '';

  // Limpiar textos y badges de guía
  const viewHwb = document.getElementById('view-hwb');
  if (viewHwb) viewHwb.textContent = 'SIN GUÍA ESCANEADA';

  const viewPid = document.getElementById('view-pid');
  if (viewPid) viewPid.textContent = '---';

  const viewDest = document.getElementById('view-dest');
  if (viewDest) viewDest.textContent = 'Escanea un bulto para conciliar';

  const badgeRatio = document.getElementById('badge-piece-ratio');
  if (badgeRatio) badgeRatio.textContent = 'Bulto 0 de 0';

  const chipsCont = document.getElementById('pids-chips-container');
  if (chipsCont) chipsCont.innerHTML = `<span class="chip-empty">⚡ Los PIDs de la guía aparecerán aquí</span>`;

  const wrapAlerts = document.getElementById('package-badges-wrap');
  if (wrapAlerts) wrapAlerts.style.display = 'none';

  const cardMem = document.getElementById('card-memoria');
  if (cardMem) cardMem.style.display = 'none';

  // Limpiar avatar de fisionomía y tarjeta IA copilot
  renderizarAvatarFisionomia(null);
  const cardCopilot = document.getElementById('ia-copilot-card');
  if (cardCopilot) cardCopilot.style.display = 'none';
  if (iaCountdownInterval) {
    clearInterval(iaCountdownInterval);
    iaCountdownInterval = null;
  }
  iaPendingInterpretation = null;

  // Limpiar estado de audio y cápsula Teoyolotl
  if (isRecording) {
    stopVoiceRecording();
  }
  const capsuleTimer = document.getElementById('capsule-timer-text');
  const capsuleSub = document.getElementById('capsule-sub-text');
  const capsuleMic = document.getElementById('capsule-teoyolotl-mic');
  if (capsuleTimer) capsuleTimer.textContent = '(13s)';
  if (capsuleSub) capsuleSub.textContent = 'Nota de voz';
  if (capsuleMic) {
    capsuleMic.classList.remove('recording');
    capsuleMic.classList.remove('pulse-mandatory');
  }

  const modalTimer = document.getElementById('audio-sheet-timer');
  if (modalTimer) modalTimer.textContent = '(0s / 13s)';

  // Cerrar modales si estuvieran abiertos
  cerrarBottomSheetEvidencia();
  cerrarBottomSheetAudio();

  actualizarContadoresUI();
  asignarCheckpointActivo('OK', abrirModal);
}

// ====================================================================
// 15. MÓDULO DE RECOLECCIONES (PICKUPS)
// ====================================================================
let estatusPUSeleccionado = 'PU';
let piezasPUReales = 1;

window.seleccionarEstatusPU = function(est) {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(35);
  estatusPUSeleccionado = est;

  const btnPU = document.getElementById('btn-pu-ok');
  const btnBK = document.getElementById('btn-pu-booking');

  if (est === 'PU') {
    if (btnPU) btnPU.classList.add('active-pu');
    if (btnBK) btnBK.classList.remove('active-booking');
    playBeep('ok');
  } else {
    if (btnBK) btnBK.classList.add('active-booking');
    if (btnPU) btnPU.classList.remove('active-pu');
    playBeep('incidencia');
  }
};

window.ajustarPiezasPU = function(tipo, delta) {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(30);

  if (tipo === 'reales') {
    piezasPUReales = Math.max(0, piezasPUReales + delta);
    const el = document.getElementById('val-pu-reales');
    if (el) el.textContent = piezasPUReales;
  } else {
    const el = document.getElementById('val-pu-estimadas');
    if (el) {
      let val = Math.max(0, (parseInt(el.textContent) || 1) + delta);
      el.textContent = val;
    }
  }
};

window.actualizarGPSPU = function() {
  initAudio();
  const el = document.getElementById('pu-gps-display');
  if ('geolocation' in navigator) {
    if (el) el.textContent = 'Obteniendo GPS...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
        if (el) el.textContent = coords;
        playBeep('ok');
        showToast('GPS actualizado', '📍');
      },
      (err) => {
        if (el) el.textContent = 'GPS no disponible';
        console.warn('Geolocation error:', err);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }
};

window.guardarRecoleccionPU = async function() {
  initAudio();
  const bookingEl = document.getElementById('input-pu-booking');
  const remitenteEl = document.getElementById('input-pu-remitente');
  const dirEl = document.getElementById('input-pu-direccion');
  const cpEl = document.getElementById('input-pu-cp');
  const motivoEl = document.getElementById('input-pu-motivo');
  const gpsEl = document.getElementById('pu-gps-display');
  const estEl = document.getElementById('val-pu-estimadas');

  const booking = bookingEl ? bookingEl.value.trim() : '';
  const remitente = remitenteEl ? remitenteEl.value.trim() : '';
  const direccion = dirEl ? dirEl.value.trim() : '';
  const cp = cpEl ? cpEl.value.trim() : '';
  const motivo = motivoEl ? motivoEl.value.trim() : '';
  const gps = gpsEl ? gpsEl.textContent.trim() : '';
  const pzsEstimadas = estEl ? parseInt(estEl.textContent) || 1 : 1;

  if (!booking) {
    playBeep('error');
    showToast('Ingresa Folio o Booking de PU', '⚠️');
    if (bookingEl) bookingEl.focus();
    return;
  }
  if (!remitente) {
    playBeep('error');
    showToast('Ingresa la empresa remitente', '⚠️');
    if (remitenteEl) remitenteEl.focus();
    return;
  }

  const btnPU = document.getElementById('btn-submit-pu');
  if (btnPU) {
    btnPU.disabled = true;
    btnPU.innerHTML = '<span>⏳</span> Registrando PU...';
  }

  const firmaData = sigPadPU.toDataURL('image/png');
  const puPayload = {
    id_pu: 'PU_' + Date.now().toString(36).toUpperCase(),
    id_booking: booking,
    remitente: remitente,
    direccion: direccion,
    cp: cp,
    chofer: CURRENT_USER,
    estatus: estatusPUSeleccionado,
    piezas_estimadas: pzsEstimadas,
    piezas_reales: piezasPUReales,
    firma: firmaData,
    evidencia: photoPUBase64,
    motivo: motivo,
    gps: gps,
    timestamp: new Date().toISOString()
  };

  // 1. Guardar Offline
  await savePickupOffline(puPayload);

  // 2. Bitácora Local
  historialTurno.unshift({
    tipo: 'PU',
    pid: booking,
    hwb: booking,
    estatus: estatusPUSeleccionado,
    hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  // 3. Sincronizar si Online
  if (navigator.onLine) {
    try {
      const resp = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(puPayload)
      });
      if (resp.ok) {
        await deletePendingRecord(STORE_PICKUPS, puPayload.localId);
        playBeep('ok');
        showToast('✅ ¡Recolección registrada en Bóveda!', '🎉');
      } else {
        showToast('✅ Recolección guardada (Offline)', '💾');
      }
    } catch (e) {
      showToast('✅ Recolección guardada (Offline)', '💾');
    }
  } else {
    playBeep('ok');
    showToast('✅ Recolección guardada (Offline)', '💾');
  }

  // Resetear Formulario PU
  if (bookingEl) bookingEl.value = '';
  if (remitenteEl) remitenteEl.value = '';
  if (dirEl) dirEl.value = '';
  if (cpEl) cpEl.value = '';
  if (motivoEl) motivoEl.value = '';
  piezasPUReales = 1;
  const valReal = document.getElementById('val-pu-reales');
  if (valReal) valReal.textContent = '1';
  photoPUBase64 = '';
  const prevPU = document.getElementById('photo-pu-preview-img');
  if (prevPU) prevPU.style.display = 'none';
  if (sigPadPU) sigPadPU.clear();

  if (btnPU) {
    btnPU.disabled = false;
    btnPU.innerHTML = '<span>📦</span> Registrar Recolección';
  }

  actualizarKPIsDashboard();
  navegarA('view-inicio');
};

// ====================================================================
// 16. KPIS Y MANIFIESTO (BITÁCORA DEL TURNO)
// ====================================================================
function actualizarKPIsDashboard() {
  const entregados = historialTurno.filter(i => i.tipo === 'ENTREGA' && i.estatus === 'OK').length;
  const incidencias = historialTurno.filter(i => i.tipo === 'ENTREGA' && i.estatus !== 'OK').length;
  const pickups = historialTurno.filter(i => i.tipo === 'PU').length;

  const kpiOk = document.getElementById('kpi-entregados');
  const kpiInc = document.getElementById('kpi-incidencias');
  const kpiPu = document.getElementById('kpi-pickups');
  const kpiSub = document.getElementById('kpi-bitacora-sub');

  if (kpiOk) kpiOk.textContent = entregados;
  if (kpiInc) kpiInc.textContent = incidencias;
  if (kpiPu) kpiPu.textContent = pickups;
  if (kpiSub) kpiSub.textContent = `${historialTurno.length} registros`;
}

function renderBitacora() {
  const container = document.getElementById('bitacora-items-wrap');
  const totalLbl = document.getElementById('bitacora-total-label');
  if (!container) return;

  if (totalLbl) totalLbl.textContent = `${historialTurno.length} procesados`;

  if (historialTurno.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:30px;color:var(--text-muted);font-size:0.85rem;">
        ⚡ Aún no has registrado entregas o recolecciones hoy.
      </div>
    `;
    return;
  }

  container.innerHTML = historialTurno.map(item => {
    let badgeClass = 'bitacora-badge';
    if (item.estatus === 'OK') badgeClass += ' ok';
    else if (item.tipo === 'PU') badgeClass += ' pu';
    else badgeClass += ' incidencia';

    return `
      <div class="bitacora-item">
        <div>
          <div class="bitacora-pid">${item.pid}</div>
          <div class="bitacora-time">⏰ ${item.hora} • ${item.tipo}</div>
        </div>
        <div class="${badgeClass}">${item.estatus}</div>
      </div>
    `;
  }).join('');
}

const btnForceSync = document.getElementById('btn-force-sync');
if (btnForceSync) {
  btnForceSync.addEventListener('click', () => {
    initAudio();
    syncOfflineData();
  });
}

// Modal Lightbox de Fotos
function abrirModalImagen(src) {
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');
  if (modal && modalImg) {
    modalImg.src = src;
    modal.style.display = 'flex';
  }
}

const btnCloseModal = document.getElementById('btn-close-modal');
if (btnCloseModal) {
  btnCloseModal.addEventListener('click', () => {
    const modal = document.getElementById('image-modal');
    if (modal) modal.style.display = 'none';
  });
}

// ====================================================================
// 17. ARRANQUE DEL CICLO DE VIDA (PWA NATIVA)
// ====================================================================
window.addEventListener('load', () => {
  openDatabase();
  initSession();
  cargarManifiestoOperativo();
  actualizarGPSPU();
  actualizarKPIsDashboard();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js?v=3.8')
      .then((reg) => {
        console.log('[PWA] Service Worker registrado exitosamente');
        try { reg.update(); } catch(eU) {}
      })
      .catch((err) => console.warn('[PWA] Error registrando SW:', err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
});

window.forzarActualizacionApp = async function() {
  initAudio();
  showToast('Actualizando a v3.8 PROD...', '🔄');
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (let r of regs) await r.unregister();
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (let k of keys) await caches.delete(k);
    }
  } catch(e) {}
  window.location.href = window.location.origin + window.location.pathname + '?v=3.8&t=' + Date.now();
};

// ====================================================================
// ⚡ SINCRONIZACIÓN ASÍNCRONA EN SEGUNDO PLANO (LATENCIA ZERO)
// ====================================================================
async function despacharSincronizacionLoteSegundoPlano(lotePayload) {
  if (!navigator.onLine) {
    console.log('ℹ️ Dispositivo sin red: Lote preservado en IndexedDB para sincronización posterior.');
    return;
  }

  try {
    const netStatus = document.getElementById('net-status-text');
    if (netStatus) netStatus.textContent = '● SINCRONIZANDO LOTE...';

    const resp = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sincronizar_entrega_masiva_offline',
        lote: lotePayload
      })
    });

    if (resp.ok) {
      if (lotePayload.localId) {
        await deletePendingRecord(STORE_ENTREGAS, lotePayload.localId);
      }
      console.log('✅ Lote sincronizado exitosamente en segundo plano.');
      if (netStatus) netStatus.textContent = '● EN LÍNEA / SINCRONIZADO';
    } else {
      console.warn('⚠️ Webhook respondió con error, reintentará en siguiente ciclo.');
    }
  } catch (err) {
    console.warn('⚠️ Error en sincronización de segundo plano (preservado en IndexedDB):', err);
  }
}

// ====================================================================
// 17. 🧭 MOTOR DE ENRUTAMIENTO ASISTIDO POR IA (MERCADO LIBRE STYLE)
// ====================================================================
let HOJA_RUTA_STOPS = [];
let HOJA_RUTA_FILTRO = 'TODAS';
let DRIVER_GPS = null;

// Obtener y monitorear GPS del chofer en tiempo real
if ('geolocation' in navigator) {
  try {
    navigator.geolocation.getCurrentPosition(
      pos => {
        DRIVER_GPS = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        console.log('📍 GPS Pochteca obtenido:', DRIVER_GPS);
      },
      err => console.warn('GPS no disponible:', err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
    navigator.geolocation.watchPosition(
      pos => {
        DRIVER_GPS = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      err => console.warn('GPS watch error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  } catch(e) {}
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

function escapeParam(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ====================================================================
// 24. MOTOR DE INFERENCIA DE FISIONOMÍA Y AVATAR DE PAQUETES (POKA-YOKE VAN)
// ====================================================================
function deducirFisionomiaPaquete(pieza, parada = null) {
  const p = pieza || (parada && parada.piezas && parada.piezas[0]) || {};
  const desc = String(p.descripcion || '').toUpperCase();
  const shipper = String(p.shipper_name || p.remitente || '').toUpperCase();
  const payer = String(p.payer_account || p.payer_acct || p.cuenta_pagador || '').trim();
  const tipoPrioridad = String((parada && parada.tipo_prioridad) || p.tipo_prioridad || '').toUpperCase();

  // Parsear peso (kg)
  let pesoKg = 0;
  if (p.peso_real_rw && !isNaN(parseFloat(p.peso_real_rw))) {
    pesoKg = parseFloat(p.peso_real_rw);
  } else if (p.peso_declarado && !isNaN(parseFloat(p.peso_declarado))) {
    pesoKg = parseFloat(p.peso_declarado);
  } else {
    const matchKg = desc.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilos|kilo)\b/i);
    const matchG = desc.match(/(\d+)\s*(?:g|gr|gramos)\b/i);
    if (matchKg) pesoKg = parseFloat(matchKg[1]);
    else if (matchG) pesoKg = parseFloat(matchG[1]) / 1000;
    else pesoKg = 1.5;
  }

  // Parsear dimensiones (LxWxH en cm)
  let volumenCm3 = 0;
  let ladoMaxCm = 0;
  let espesorCm = 0;
  const dimsStr = String(p.dimensiones_rw || p.dims || '');
  const matchDims = dimsStr.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (matchDims) {
    const l = parseFloat(matchDims[1]);
    const w = parseFloat(matchDims[2]);
    const h = parseFloat(matchDims[3]);
    volumenCm3 = l * w * h;
    ladoMaxCm = Math.max(l, w, h);
    espesorCm = Math.min(l, w, h);
  }

  // 🛡️ REGLA DISCRETA 1: CLIENTE CENTRO DE DISTRIBUCIÓN / BANCARIO (Payer 988151455 o código numérico largo)
  // Contiene tarjetas o documentación confidencial. NUNCA mencionar "tarjeta" ni "banco".
  const esNumericoLargo = /^\d{16,}$/.test(desc.replace(/\s+/g, ''));
  if (payer === '988151455' || desc.includes('CENTRO DE DISTRIBUCION') || esNumericoLargo || tipoPrioridad === 'BANCARIO') {
    return {
      arquetipo: 'SOBRE_PLANO',
      icono: '✉️',
      etiqueta: 'Sobre Plano / Documentación',
      detalle: `Documento ligero (${pesoKg < 0.5 ? '< 0.5 kg' : pesoKg.toFixed(1) + ' kg'})`,
      categoriaSegura: '📄 Documento Oficial',
      color: '#38BDF8',
      colorBg: 'rgba(56, 189, 248, 0.14)',
      ubicacionSugerida: 'Guantera / Visera / Asiento delantero'
    };
  }

  // 🛡️ REGLA DISCRETA 2: CLIENTE NATURA (Payer 988142574 o tipo NATURA)
  // Cajas reconocibles de cosméticos / consultoras.
  if (payer === '988142574' || desc.includes('NATURA') || shipper.includes('NATURA') || tipoPrioridad === 'NATURA') {
    return {
      arquetipo: 'CAJA_NATURA',
      icono: '🌿',
      etiqueta: 'Empaque Natura (Cosméticos)',
      detalle: `Caja identificable (~${pesoKg.toFixed(1)} kg)`,
      categoriaSegura: '🌿 Belleza / Cuidado Personal',
      color: '#10B981',
      colorBg: 'rgba(16, 185, 129, 0.14)',
      ubicacionSugerida: 'Repisa media / Lote cosméticos'
    };
  }

  // 1. BULTO PESADO / VOLUMINOSO (> 10 kg o lado > 55 cm o vol > 50,000 cm³)
  if (pesoKg >= 10 || ladoMaxCm >= 55 || volumenCm3 >= 50000) {
    return {
      arquetipo: 'BULTO_PESADO',
      icono: '🧊',
      etiqueta: 'Bulto Pesado / Voluminoso',
      detalle: `Caja grande (~${pesoKg.toFixed(1)} kg)`,
      categoriaSegura: desc.includes('HERRAMIENTA') || desc.includes('MOTOR') ? '🔧 Herramienta' : '📦 Carga Pesada',
      color: '#EF4444',
      colorBg: 'rgba(239, 68, 68, 0.15)',
      ubicacionSugerida: 'Piso van / Fondo de la unidad'
    };
  }

  // 2. SOBRE PLANO (< 0.4 kg y espesor < 3 cm o tipo documento)
  if (pesoKg < 0.4 || (espesorCm > 0 && espesorCm <= 3 && pesoKg < 0.8) || /DOCUMENT|SOBRE|PAPER|CARTA|INVOICE|CONTRATO/i.test(desc)) {
    return {
      arquetipo: 'SOBRE_PLANO',
      icono: '✉️',
      etiqueta: 'Sobre Plano / Documento',
      detalle: `Sobre ligero (${pesoKg.toFixed(1)} kg)`,
      categoriaSegura: '📄 Papelería / Documento',
      color: '#38BDF8',
      colorBg: 'rgba(56, 189, 248, 0.14)',
      ubicacionSugerida: 'Guantera / Visera / Canastilla frontal'
    };
  }

  // 3. BOLSA COURIER FLEXIBLE (Textil / Ropa / E-commerce flexible < 2.5 kg)
  if ((pesoKg < 2.5 && /PLAYERA|PANTALON|CAMISA|ROPA|VESTIDO|TEXTIL|BLUSA|SHORT|SUDADERA|ZARA|SHEIN|BERSHKA|STRADIVARIUS|PULL/i.test(desc + ' ' + shipper)) ||
      (volumenCm3 > 0 && volumenCm3 < 10000 && pesoKg < 1.8 && espesorCm < 7)) {
    return {
      arquetipo: 'BOLSA_FLEXIBLE',
      icono: '🛍️',
      etiqueta: 'Bolsa Plástica / Courier',
      detalle: `Bolsa flexible (~${pesoKg.toFixed(1)} kg)`,
      categoriaSegura: '👕 Textil / Indumentaria',
      color: '#A855F7',
      colorBg: 'rgba(168, 85, 247, 0.14)',
      ubicacionSugerida: 'Canastilla lateral / Costal superior'
    };
  }

  // 4. CAJA CHICA (Calzado / Accesorios pequeños 0.5 a 3.5 kg)
  if (pesoKg <= 3.5 || /ZAPATO|BOTA|BOTIN|TENIS|SNEAKER|SANDALIA|CALZADO/i.test(desc)) {
    const esCalzado = /ZAPATO|BOTA|BOTIN|TENIS|CALZADO/i.test(desc);
    return {
      arquetipo: 'CAJA_CHICA',
      icono: '📦',
      etiqueta: esCalzado ? 'Caja Chica (Calzado)' : 'Caja Chica (E-Commerce)',
      detalle: `Caja pequeña (~${pesoKg.toFixed(1)} kg)`,
      categoriaSegura: esCalzado ? '👟 Calzado' : '🛍️ E-Commerce',
      color: '#F59E0B',
      colorBg: 'rgba(245, 158, 11, 0.14)',
      ubicacionSugerida: 'Repisa media / Repisas superiores'
    };
  }

  // 5. CAJA MEDIANA (Default para paquetes 3.5 a 10 kg)
  return {
    arquetipo: 'CAJA_MEDIANA',
    icono: '📦',
    etiqueta: 'Caja Mediana Regular',
    detalle: `Caja estándar (~${pesoKg.toFixed(1)} kg)`,
    categoriaSegura: '📦 Mercancía General',
    color: '#FB923C',
    colorBg: 'rgba(251, 146, 60, 0.14)',
    ubicacionSugerida: 'Pasillo intermedio / Repisa inferior'
  };
}

function renderizarAvatarFisionomia(avatar) {
  const wrap = document.getElementById('view-avatar-fisionomia-wrap');
  if (!wrap) return;
  if (!avatar) {
    wrap.style.display = 'none';
    return;
  }
  wrap.innerHTML = `
    <div style="background:${avatar.colorBg};border:1.5px solid ${avatar.color};border-radius:10px;padding:6px 10px;display:flex;align-items:center;gap:8px;">
      <span style="font-size:1.3rem;">${avatar.icono}</span>
      <div style="flex:1;">
        <div style="font-size:0.78rem;font-weight:900;color:#FFFFFF;">BUSCAR: <span style="color:${avatar.color};">${avatar.etiqueta}</span></div>
        <div style="font-size:0.7rem;color:#E2E8F0;">${avatar.detalle} • 📍 ${avatar.ubicacionSugerida}</div>
      </div>
    </div>
  `;
  wrap.style.display = 'block';
}

function optimizarYGenerarHojaDeRuta() {
  if (!MANIFIESTO_CHOFER || MANIFIESTO_CHOFER.length === 0) {
    HOJA_RUTA_STOPS = [];
    return;
  }

  // 1. Agrupar piezas por Guía Madre (HWB) para consolidar paradas
  const paradasMap = {};
  MANIFIESTO_CHOFER.forEach(p => {
    const hwb = String(p.hwb || '').trim();
    if (!hwb) return;
    if (!paradasMap[hwb]) {
      paradasMap[hwb] = {
        hwb: hwb,
        destinatario: p.destinatario || 'CLIENTE DESTINO',
        direccion: p.direccion || 'Sin dirección registrada',
        tel: p.tel || '',
        edd: p.edd || '',
        lat: parseFloat(p.lat) || 20.5931,
        lng: parseFloat(p.lng) || -100.3928,
        geo_fuente: p.geo_fuente || 'CP_CENTROID',
        geo_confianza: p.geo_confianza || 'MEDIA_ZONA',
        foto_fachada: p.foto_fachada_amoxcalli || '',
        tipo_prioridad: p.tipo_prioridad || 'RESIDENCIAL',
        prioridad_num: p.prioridad_num || 4,
        prioridad_badge: p.prioridad_badge || '📦 RESIDENCIAL',
        prioridad_color: p.prioridad_color || '#6B7280',
        prioridad_icono: p.prioridad_icono || '🏠',
        horario_corte: p.horario_corte || '18:00',
        motivo_prioridad: p.motivo_prioridad || '',
        fisionomia: null,
        piezas: []
      };
    }
    paradasMap[hwb].piezas.push(p);
    paradasMap[hwb].fisionomia = deducirFisionomiaPaquete(p, paradasMap[hwb]);

    // Si alguna pieza tiene prioridad mayor (número menor), elevar la parada
    if (p.prioridad_num && p.prioridad_num < paradasMap[hwb].prioridad_num) {
      paradasMap[hwb].prioridad_num = p.prioridad_num;
      paradasMap[hwb].tipo_prioridad = p.tipo_prioridad;
      paradasMap[hwb].prioridad_badge = p.prioridad_badge;
      paradasMap[hwb].prioridad_color = p.prioridad_color;
      paradasMap[hwb].prioridad_icono = p.prioridad_icono;
      paradasMap[hwb].horario_corte = p.horario_corte;
    }
  });

  const todasParadas = Object.values(paradasMap);

  // 2. Evaluar estado de entrega (Completada vs Pendiente)
  todasParadas.forEach(parada => {
    const piezasTotal = parada.piezas.length;
    const piezasCompletas = parada.piezas.filter(pz => {
      const enHistorial = (typeof historialTurno !== 'undefined' && Array.isArray(historialTurno)) &&
        historialTurno.some(e => e.pid === pz.pid || e.pid === pz.pid_raw);
      const enChoferOk = (pz.estatus_pid === 'OK' || pz.estatus_pid === 'PD' || ['CA', 'RD', 'CM', 'DF'].includes(pz.estatus_pid));
      return enHistorial || enChoferOk;
    }).length;

    parada.completada = (piezasCompletas >= piezasTotal && piezasTotal > 0);
    parada.piezas_completas = piezasCompletas;
  });

  // 3. Ordenamiento inteligente: TSP Geográfico Puro (Nearest Neighbor)
  // Se optimiza la ruta por cercanía geográfica continua para evitar regresar por los mismos caminos.
  const pendientes = todasParadas.filter(p => !p.completada);
  const completadas = todasParadas.filter(p => p.completada);

  let puntoActual = DRIVER_GPS || { lat: 20.5931, lng: -100.3928 };
  const pendientesOrdenadas = [];
  let cluster = [...pendientes];

  while (cluster.length > 0) {
    let mejorIdx = 0;
    let distMin = Infinity;
    for (let i = 0; i < cluster.length; i++) {
      const d = calcularDistanciaKm(puntoActual.lat, puntoActual.lng, cluster[i].lat, cluster[i].lng);
      if (d < distMin) {
        distMin = d;
        mejorIdx = i;
      }
    }
    const elegida = cluster.splice(mejorIdx, 1)[0];
    elegida.distancia_km = distMin;
    pendientesOrdenadas.push(elegida);
    puntoActual = { lat: elegida.lat, lng: elegida.lng };
  }

  let stopNumber = 1;
  pendientesOrdenadas.forEach(p => {
    p.numero_parada = stopNumber++;
  });
  completadas.forEach(p => {
    p.numero_parada = stopNumber++;
  });

  HOJA_RUTA_STOPS = [...pendientesOrdenadas, ...completadas];

  // Actualizar badges en Dashboard
  const badgeParadas = document.getElementById('badge-ruta-paradas');
  if (badgeParadas) {
    const pendP = pendientesOrdenadas.length;
    badgeParadas.textContent = `${pendP} Paradas`;
  }
}

function renderHojaDeRutaAsistida() {
  optimizarYGenerarHojaDeRuta();

  const total = HOJA_RUTA_STOPS.length;
  const completadas = HOJA_RUTA_STOPS.filter(p => p.completada).length;
  const pendientes = total - completadas;
  const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;

  // Actualizar KPIs de avance
  const lblPorcentaje = document.getElementById('lbl-porcentaje-ruta');
  if (lblPorcentaje) lblPorcentaje.textContent = `${pct}% (${completadas}/${total})`;
  const barProgreso = document.getElementById('bar-progreso-ruta');
  if (barProgreso) barProgreso.style.width = `${pct}%`;
  const counterAvance = document.getElementById('counter-ruta-avance');
  if (counterAvance) counterAvance.textContent = `${pendientes} Pendientes`;

  // Actualizar resumen de tipos de carga (Internacionales, Corporativo, etc.)
  const countInter = HOJA_RUTA_STOPS.filter(p => p.tipo_prioridad === 'INTERNACIONAL').length;
  const countCorp = HOJA_RUTA_STOPS.filter(p => p.tipo_prioridad === 'CORPORATIVO').length;
  const countNatura = HOJA_RUTA_STOPS.filter(p => p.tipo_prioridad === 'NATURA').length;
  const countRes = HOJA_RUTA_STOPS.filter(p => p.tipo_prioridad === 'RESIDENCIAL').length;
  const countBanc = HOJA_RUTA_STOPS.filter(p => p.tipo_prioridad === 'BANCARIO').length;

  const pillInter = document.getElementById('kpi-pill-inter');
  if (pillInter) pillInter.textContent = `⚡ ${countInter} Inter`;
  const pillCorp = document.getElementById('kpi-pill-corp');
  if (pillCorp) pillCorp.textContent = `🏢 ${countCorp} Corp`;
  const pillNatura = document.getElementById('kpi-pill-natura');
  if (pillNatura) pillNatura.textContent = `🌿 ${countNatura} Natura`;
  const pillRes = document.getElementById('kpi-pill-residencial');
  if (pillRes) pillRes.textContent = `🏠 ${countRes} Res`;
  const pillBanc = document.getElementById('kpi-pill-bancario');
  if (pillBanc) pillBanc.textContent = `💳 ${countBanc} Banc`;

  // Aplicar filtro si no es TODAS
  let listaMostrar = HOJA_RUTA_STOPS;
  if (HOJA_RUTA_FILTRO !== 'TODAS') {
    listaMostrar = HOJA_RUTA_STOPS.filter(p => p.tipo_prioridad === HOJA_RUTA_FILTRO);
  }

  const pendientesFiltradas = listaMostrar.filter(p => !p.completada);
  const completadasFiltradas = listaMostrar.filter(p => p.completada);

  const containerNext = document.getElementById('next-stop-container');
  const containerTimeline = document.getElementById('timeline-paradas-wrap');
  const lblRestantes = document.getElementById('lbl-total-restantes');

  if (lblRestantes) {
    lblRestantes.textContent = `${pendientesFiltradas.length > 1 ? pendientesFiltradas.length - 1 : 0} paradas después`;
  }

  if (!containerNext || !containerTimeline) return;

  // CASO A: Hay al menos una parada pendiente -> Destacar la #1
  if (pendientesFiltradas.length > 0) {
    const next = pendientesFiltradas[0];
    const totalPzs = next.piezas ? next.piezas.length : 1;

    let badgeGeoHtml = '';
    if (next.geo_fuente === 'AMOXCALLI_HISTORICO') {
      badgeGeoHtml = `<span style="background:rgba(16,185,129,0.2);color:#34D399;border:1px solid #10B981;font-size:0.65rem;padding:2px 8px;border-radius:12px;font-weight:800;">📍 GPS AMOXCALLI</span>`;
    } else if (next.geo_fuente === 'CALPIXQUI_WHATSAPP') {
      badgeGeoHtml = `<span style="background:rgba(59,130,246,0.25);color:#93C5FD;border:1px solid #3B82F6;font-size:0.65rem;padding:2px 8px;border-radius:12px;font-weight:800;">📲 PIN WHATSAPP</span>`;
    } else {
      badgeGeoHtml = `<span style="background:rgba(107,114,128,0.2);color:#D1D5DB;border:1px solid #6B7280;font-size:0.65rem;padding:2px 8px;border-radius:12px;font-weight:800;">🗺️ GPS C.P.</span>`;
    }

    let fotoFachadaHtml = '';
    if (next.foto_fachada) {
      fotoFachadaHtml = `
        <div style="margin-top:8px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:8px;display:flex;align-items:center;gap:10px;">
          <img src="${next.foto_fachada}" style="width:50px;height:50px;border-radius:8px;object-fit:cover;border:1px solid rgba(255,255,255,0.2);cursor:pointer;" onclick="abrirModalImagen('${next.foto_fachada}')" alt="Fachada">
          <div style="font-size:0.75rem;">
            <div style="color:var(--emerald);font-weight:800;">🏠 Fachada validada en Amoxcalli</div>
            <div style="color:var(--text-muted);font-size:0.7rem;">Toca la foto para ampliarla</div>
          </div>
        </div>`;
    }

    let corteHtml = '';
    if (next.horario_corte === '14:00') {
      corteHtml = `<div style="background:rgba(245,158,11,0.15);border:1px solid #F59E0B;color:#FDE047;border-radius:8px;padding:4px 8px;font-size:0.75rem;font-weight:800;display:inline-flex;align-items:center;gap:4px;margin-top:6px;">⏰ HORARIO DE CORTE: 14:00 HRS</div>`;
    }

    containerNext.innerHTML = `
      <div class="next-stop-hero-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div class="next-stop-number-badge">
            <span>#${next.numero_parada}</span> SIGUIENTE PARADA
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">
            <span style="background:${next.prioridad_color}22;color:${next.prioridad_color};border:1px solid ${next.prioridad_color};font-size:0.68rem;padding:2px 8px;border-radius:12px;font-weight:900;">${next.prioridad_badge}</span>
            ${badgeGeoHtml}
          </div>
        </div>

        <div style="font-size:1.15rem;font-weight:900;color:#FFFFFF;margin-bottom:4px;letter-spacing:0.3px;">
          ${escapeHtml(next.destinatario)}
        </div>

        <div style="display:flex;align-items:center;gap:8px;font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">
          <span style="color:#60A5FA;font-weight:800;">HWB: ${next.hwb}</span>
          <span>•</span>
          <span style="color:var(--gold-primary);font-weight:700;">${totalPzs} bulto${totalPzs > 1 ? 's' : ''}</span>
          ${next.distancia_km ? `<span>•</span> <span>~${next.distancia_km.toFixed(1)} km</span>` : ''}
        </div>

        <!-- BADGE FISIONOMÍA Y BÚSQUEDA RÁPIDA EN VAN -->
        ${(() => {
          const av = next.fisionomia || deducirFisionomiaPaquete(next.piezas && next.piezas[0], next);
          return `
            <div class="van-avatar-badge" style="background:${av.colorBg};border:1.5px solid ${av.color};border-radius:10px;padding:8px 12px;margin:8px 0;display:flex;align-items:center;gap:10px;">
              <span style="font-size:1.6rem;">${av.icono}</span>
              <div style="flex:1;">
                <div style="font-weight:900;font-size:0.84rem;letter-spacing:0.3px;color:#FFFFFF;">BUSCAR EN UNIDAD: <span style="color:${av.color};">${av.etiqueta}</span></div>
                <div style="font-size:0.73rem;color:#E2E8F0;margin-top:2px;">
                  <span>${av.detalle}</span> • <span>${av.categoriaSegura}</span> • <span style="color:${av.color};font-weight:700;">📍 ${av.ubicacionSugerida}</span>
                </div>
              </div>
            </div>
          `;
        })()}

        <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:10px;font-size:0.82rem;line-height:1.4;margin-bottom:8px;color:#E2E8F0;border:1px solid rgba(255,255,255,0.06);">
          📍 <strong>Dirección:</strong> ${escapeHtml(next.direccion)}
          ${corteHtml}
        </div>

        ${fotoFachadaHtml}

        <!-- BOTÓN DE NAVEGACIÓN 1-TOQUE GOOGLE MAPS -->
        <div style="margin-top:12px;">
          <button type="button" class="btn-nav-action-maps" style="width:100%;font-size:1rem;padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 4px 14px rgba(37,99,235,0.4);" onclick="abrirGoogleMaps(${next.lat}, ${next.lng}, '${escapeParam(next.direccion)}')">
            <span style="font-size:1.3rem;">🗺️</span> Iniciar Navegación en Google Maps
          </button>
        </div>

        <div style="display:flex;gap:8px;margin-top:8px;">
          ${next.tel && next.tel.length >= 10 ? `
            <button type="button" class="btn-secondary" style="flex:1;padding:8px;font-size:0.8rem;" onclick="llamarDestinatario('${next.tel}')">
              📞 Llamar
            </button>
            <button type="button" class="btn-secondary" style="flex:1;padding:8px;font-size:0.8rem;border-color:#10B981;color:#34D399;" onclick="abrirChatCliente('${next.tel}', '${next.hwb}', '${escapeParam(next.destinatario)}')">
              💬 WhatsApp
            </button>
          ` : `
            <div style="font-size:0.75rem;color:var(--text-muted);font-style:italic;padding:4px 0;">⚠️ Sin teléfono de contacto directo</div>
          `}
        </div>

        <button type="button" class="btn-nav-action-entregar" onclick="irAEntregarParada('${next.hwb}')">
          <span>📦</span> Entregar / Escanear Piezas de esta Parada
        </button>
      </div>
    `;
  } else {
    containerNext.innerHTML = `
      <div class="next-stop-hero-card" style="border-color:var(--emerald);text-align:center;padding:24px 14px;">
        <div style="font-size:3rem;margin-bottom:8px;">🎉</div>
        <div style="font-size:1.2rem;font-weight:900;color:var(--emerald);margin-bottom:4px;">¡TODAS LAS PARADAS COMPLETADAS!</div>
        <div style="font-size:0.82rem;color:var(--text-muted);">Has completado el 100% de tus entregas asistidas del turno. ¡Gran labor, Pochteca! 🚚✨</div>
      </div>
    `;
  }

  // CASO B: Renderizar paradas restantes en Timeline (de la 2 en adelante)
  const paradasRestantes = pendientesFiltradas.slice(1);
  if (paradasRestantes.length === 0 && completadasFiltradas.length === 0) {
    containerTimeline.innerHTML = `
      <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.8rem;">
        ⚡ No hay más paradas pendientes con el filtro actual.
      </div>
    `;
    return;
  }

  let htmlTimeline = '';
  paradasRestantes.forEach(p => {
    const pzs = p.piezas ? p.piezas.length : 1;
    htmlTimeline += `
      <div class="timeline-stop-card">
        <div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:6px 10px;font-weight:900;font-size:0.85rem;color:#60A5FA;text-align:center;min-width:38px;">
          #${p.numero_parada}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="font-size:0.75rem;font-weight:800;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${escapeHtml(p.destinatario)}
            </span>
            <span style="background:${p.prioridad_color}22;color:${p.prioridad_color};font-size:0.6rem;padding:1px 5px;border-radius:8px;font-weight:800;flex:none;">
              ${p.prioridad_icono}
            </span>
          </div>
          <div style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(p.direccion)}
          </div>
          <div style="font-size:0.68rem;color:#60A5FA;font-weight:700;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span>HWB: ${p.hwb} • ${pzs} pz${pzs > 1 ? 's' : ''} ${p.distancia_km ? `• ~${p.distancia_km.toFixed(1)} km` : ''}</span>
            ${(() => {
              const av = p.fisionomia || deducirFisionomiaPaquete(p.piezas && p.piezas[0], p);
              return `<span style="background:${av.colorBg};border:1px solid ${av.color};color:${av.color};font-size:0.62rem;padding:1px 5px;border-radius:6px;font-weight:800;">${av.icono} ${av.etiqueta.split(' ')[0]}</span>`;
            })()}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex:none;">
          <button type="button" onclick="abrirGoogleMaps(${p.lat}, ${p.lng}, '${escapeParam(p.direccion)}')" style="background:#2563EB;border:none;border-radius:8px;padding:6px 10px;font-size:0.75rem;font-weight:900;color:#FFFFFF;cursor:pointer;display:flex;align-items:center;gap:4px;">
            🗺️ Maps
          </button>
          <button type="button" onclick="irAEntregarParada('${p.hwb}')" style="background:var(--emerald);border:none;border-radius:8px;padding:6px 10px;font-size:0.75rem;font-weight:800;color:#FFFFFF;cursor:pointer;display:flex;align-items:center;gap:4px;">
            📦 Ir
          </button>
        </div>
      </div>
    `;
  });

  completadasFiltradas.forEach(p => {
    htmlTimeline += `
      <div class="timeline-stop-card completed">
        <div style="background:rgba(16,185,129,0.2);border-radius:10px;padding:6px 10px;font-weight:900;font-size:0.85rem;color:var(--emerald);text-align:center;min-width:38px;">
          ✓
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.75rem;font-weight:800;color:var(--text-muted);text-decoration:line-through;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(p.destinatario)}
          </div>
          <div style="font-size:0.68rem;color:var(--emerald);font-weight:700;">
            HWB: ${p.hwb} • COMPLETADA
          </div>
        </div>
      </div>
    `;
  });

  containerTimeline.innerHTML = htmlTimeline;
}

window.abrirWaze = function(lat, lng, dir) {
  // Waze removido; redirigir automáticamente a Google Maps
  abrirGoogleMaps(lat, lng, dir);
};

window.abrirGoogleMaps = function(lat, lng, dir) {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(30);
  let url = '';
  if (lat && lng && lat !== 20.5931) {
    url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  } else {
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dir + ', Querétaro')}`;
  }
  window.open(url, '_blank') || (window.location.href = url);
};

window.llamarDestinatario = function(tel) {
  initAudio();
  const digits = String(tel || '').replace(/\D/g, '');
  if (digits) window.location.href = `tel:${digits}`;
  else showToast('Número de teléfono no disponible', '📞');
};

window.abrirChatCliente = function(tel, hwb, destinatario) {
  initAudio();
  const digits = String(tel || '').replace(/\D/g, '');
  if (!digits) {
    showToast('Número de teléfono no disponible', '💬');
    return;
  }
  const nombre = destinatario ? destinatario.split(' ')[0] : 'Cliente';
  const msg = `Hola ${nombre}, te saluda Arauto Express / DHL. Estoy en camino a tu domicilio con tu paquete (Guía: ${hwb}). 🚚`;
  const url = `https://wa.me/52${digits.slice(-10)}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank') || (window.location.href = url);
};

window.irAEntregarParada = function(hwb) {
  initAudio();
  if (navigator.vibrate) navigator.vibrate(35);

  // 🛡️ POKA-YOKE: RESET ABSOLUTO DE EVIDENCIAS PREVIAS (FOTO, AUDIO, FIRMA)
  resetEntregaForm(false);

  navegarA('view-entrega');

  if (MANIFIESTO_CHOFER) {
    const piezasDeGuia = MANIFIESTO_CHOFER.filter(p => String(p.hwb).trim() === String(hwb).trim());
    if (piezasDeGuia.length > 0) {
      const primera = piezasDeGuia[0];
      currentHwb = primera.hwb;
      const pidsList = piezasDeGuia.map(p => p.pid_raw || p.pid);
      currentPidsGuia = pidsList;

      // Renderizar datos contextuales de Guía Madre
      const viewHwb = document.getElementById('view-hwb');
      if (viewHwb) viewHwb.textContent = `HWB: ${primera.hwb}`;

      const viewDest = document.getElementById('view-dest');
      if (viewDest) {
        const info = [primera.destinatario, primera.direccion, primera.cp ? `CP ${primera.cp}` : ''].filter(Boolean).join(' • ');
        viewDest.textContent = info || 'Destinatario Verificado en Ruta';
      }

      const badgeRatio = document.getElementById('badge-piece-ratio');
      if (badgeRatio) {
        badgeRatio.textContent = `0 de ${piezasDeGuia.length} bultos escaneados`;
      }

      // Alertas Internacional / Aduana
      const wrapAlerts = document.getElementById('package-badges-wrap');
      const pillInter = document.getElementById('pill-inter-package');
      let hasAlerts = false;
      if (primera.inter && String(primera.inter).toLowerCase().includes('inter')) {
        if (pillInter) pillInter.style.display = 'inline-flex';
        hasAlerts = true;
      } else if (pillInter) {
        pillInter.style.display = 'none';
      }
      if (wrapAlerts) wrapAlerts.style.display = hasAlerts ? 'flex' : 'none';

      // Renderizar chips como pendientes (⏳)
      renderChipsMultibulto(pidsList);
      renderizarAvatarFisionomia(deducirFisionomiaPaquete(primera));

      // Limpiar lote previo de otra guía si existía
      if (bultosLote.some(b => b.hwb && String(b.hwb).trim() !== String(primera.hwb).trim())) {
        bultosLote = [];
        renderTablaLote();
        actualizarContadoresUI();
      }

      // Enfocar input para lectura física
      const inputLaser = document.getElementById('laser-input');
      if (inputLaser) {
        inputLaser.value = '';
        inputLaser.focus();
      }

      showToast(`Parada #${primera.hwb}: Escanea físicamente el código de barras (PID)`, '🔍');
    }
  }
};

window.filtrarHojaDeRuta = function(filtro) {
  initAudio();
  HOJA_RUTA_FILTRO = filtro;
  document.querySelectorAll('.btn-filtro-ruta').forEach(btn => btn.classList.remove('active'));
  const activo = document.getElementById(`filtro-btn-${filtro}`);
  if (activo) activo.classList.add('active');
  renderHojaDeRutaAsistida();
};

