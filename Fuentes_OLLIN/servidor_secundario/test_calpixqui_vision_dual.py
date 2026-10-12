"""
================================================================================
🏛️ SUITE DE PRUEBAS AUTOMATIZADAS: VISIÓN MULTIMODAL Y ASIGNACIÓN DUAL CALPIXQUI
ARCHIVO: test_calpixqui_vision_dual.py
AUTOR: Antigravity (Google DeepMind)
================================================================================
"""

import os
import sys
import time
import json
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from calpixqui_vision_router import (
    sanitizar_pid_para_boveda,
    formatear_pid_para_appsheet,
    normalizar_telefono_10d,
    CacheIdempotencia,
    SanadorHeuristicoManifiesto,
    CalpixquiVisionRouter
)
from calpixqui_dual_writer import (
    encolar_asignacion_outbox,
    inicializar_outbox_db,
    DB_PATH
)

class MockGeminiClient:
    """Mock de Gemini que simula respuesta JSON estructurada de OCR."""
    def llamar_multimodal(self, prompt_sistema, datos_partes, temperatura=0.1):
        return {
            "hwb": "1133871690",
            "pid": "JJD014600012830808497",
            "destinatario": "LUIS GERARDO BAEZA SANCHEZ",
            "direccion": "Calle Josefa O. de Dominguez 7 (C.P. 37917)",
            "cp": "37917",
            "tipo_documento": "ETIQUETA_FISICA_DHL",
            "confianza": 0.99
        }

class MockPochtecasManager:
    def __init__(self):
        self.directorio = {
            "edgar.rodriguez.arauto@gmail.com": {
                "correo": "edgar.rodriguez.arauto@gmail.com",
                "nombre": "Edgar Rodríguez",
                "telefono": "4423816310",
                "zona_asignada": "QRO Metropolitano",
                "supervisor": "irvinreyes.dhl@gmail.com"
            },
            "xichudaniel@gmail.com": {
                "correo": "xichudaniel@gmail.com",
                "nombre": "Daniel Juárez",
                "telefono": "4191155625",
                "zona_asignada": "Sierra Gorda",
                "supervisor": "sidhartasantiago.arauto@gmail.com"
            }
        }

def run_tests():
    print("=" * 75)
    print("🏛️ INICIANDO SUITE DE PRUEBAS: CALPIXQUI VISIÓN MULTIMODAL & ASIGNACIÓN DUAL")
    print("=" * 75)

    # ── PRUEBA 1: LEY DE LA DOBLE J Y NORMALIZACIÓN ──────────────────────────
    print("\n[1/5] 🏷️ Probando Ley de la Doble J y Normalización Telefónica...")
    pid_calle = "JJD014600012830808497"
    pid_boveda = sanitizar_pid_para_boveda(pid_calle)
    assert pid_boveda == "JD014600012830808497", f"Error en sanitizar_pid_para_boveda: {pid_boveda}"
    
    pid_regreso = formatear_pid_para_appsheet(pid_boveda)
    assert pid_regreso == "JJD014600012830808497", f"Error en formatear_pid_para_appsheet: {pid_regreso}"
    
    tel_con_521 = "+52 1 442 381 6310"
    tel_norm = normalizar_telefono_10d(tel_con_521)
    assert tel_norm == "4423816310", f"Error normalizando teléfono: {tel_norm}"
    print(f"      ✅ Doble J Verificada: {pid_calle} -> {pid_boveda} -> {pid_regreso}")
    print(f"      ✅ Teléfono 10D: '{tel_con_521}' -> '{tel_norm}'")

    # ── PRUEBA 2: CACHÉ DE IDEMPOTENCIA ──────────────────────────────────────
    print("\n[2/5] ⚡ Probando Candado de Idempotencia y Deduplicación...")
    cache = CacheIdempotencia(ttl_segundos=60)
    img_dummy = "base64_sample_image_data_test_12345"
    sender = "4423816310"
    
    assert cache.obtener_si_existe(img_dummy, sender) is None, "Cache no debe tener elementos al inicio"
    res_mock = {"exito": True, "hwb": "1133871690"}
    cache.registrar(img_dummy, sender, res_mock)
    
    recuperado = cache.obtener_si_existe(img_dummy, sender)
    assert recuperado is not None and recuperado["hwb"] == "1133871690", "Fallo al recuperar de cache"
    print("      ✅ Deduplicación efectiva: Segunda solicitud detectada en memoria RAM.")

    # ── PRUEBA 3: SANADOR HEURÍSTICO EN RAM ──────────────────────────────────
    print("\n[3/5] 🧠 Probando Sanador Heurístico contra Manifiesto Activo...")
    sanador = SanadorHeuristicoManifiesto()
    # Buscar guía real presente en manifiesto_activo.json (1133871690)
    match_hwb = sanador.buscar_y_sanar("1133871690", "")
    assert match_hwb is not None, "El sanador debió encontrar la guía 1133871690 en el manifiesto"
    assert match_hwb["pid_boveda"].startswith("JD"), f"PID Bóveda erróneo: {match_hwb['pid_boveda']}"
    assert match_hwb["pid_appsheet"].startswith("JJD"), f"PID AppSheet erróneo: {match_hwb['pid_appsheet']}"
    print(f"      ✅ Sanador Heurístico OK: HWB={match_hwb['hwb']} | Dest={match_hwb['destinatario'][:20]}... | CP={match_hwb['cp']}")

    # ── PRUEBA 4: ENRUTADOR DE VISIÓN COMPLETO (ORQUESTADOR) ─────────────────
    print("\n[4/5] 📸 Probando Enrutador de Visión con Gemini Mock & Directorio...")
    router = CalpixquiVisionRouter(
        gemini_client=MockGeminiClient(),
        pochtecas_manager=MockPochtecasManager(),
        matriz_cp_manager=None
    )
    
    # Simular solicitud desde Grupo de WhatsApp de Edgar
    resultado_grupo = router.procesar_imagen_whatsapp(
        image_base64="fake_img_bytes_1",
        mimetype="image/jpeg",
        sender_phone="4423816310", # Tel de Edgar
        chat_id="120363024859@g.us", # Grupo
        is_group=True,
        caption="Asignamela porfa"
    )
    
    assert resultado_grupo["exito"] is True, "El enrutador debe ser exitoso"
    assert resultado_grupo["hwb"] == "1133871690", f"HWB extraído incorrecto: {resultado_grupo['hwb']}"
    assert resultado_grupo["nuevo_chofer_email"] == "edgar.rodriguez.arauto@gmail.com", "Chofer no coincide"
    assert resultado_grupo["is_group"] is True, "Debe ser marcado como grupo"
    print(f"      ✅ Orquestador Visión OK: Guía {resultado_grupo['hwb']} asignada a {resultado_grupo['nuevo_chofer_nombre']}")

    # ── PRUEBA 5: OUTBOX PATTERN SQLITE (WAL) ────────────────────────────────
    print("\n[5/5] 💾 Probando Inserción Atómica en Outbox Local (SQLite WAL)...")
    inicializar_outbox_db()
    id_registro = encolar_asignacion_outbox(resultado_grupo)
    assert id_registro > 0, "El ID de inserción debe ser > 0"
    
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM outbox_asignaciones WHERE id = ?", (id_registro,))
        row = cur.fetchone()
        assert row is not None, "El registro no fue persistido en SQLite"
        assert row["hwb"] == "1133871690", "HWB no coincide en base de datos"
        assert row["estatus"] == "PENDIENTE", "El estatus inicial debe ser PENDIENTE"
        assert row["pid_appsheet"].startswith("JJD"), "PID AppSheet debe tener JJD"
        assert row["pid_boveda"].startswith("JD"), "PID Bóveda debe tener JD"
    print(f"      ✅ Outbox WAL OK: Registro #{id_registro} persistido con Doble J íntegra.")

    # ── PRUEBA 6: INBOX MULTIMODAL PREVIO A HTTP 202 (CERO PÉRDIDA) ──────────
    print("\n[6/6] 🛡️ Probando Persistencia en Inbox Multimodal Previo a HTTP 202...")
    from calpixqui_dual_writer import guardar_multimodal_inbox
    test_payload = {
        "message_id": f"test_msg_{int(time.time()*1000)}",
        "chat_id": "120363024859@g.us",
        "sender": "4423816310",
        "caption": "1861995144 asignar",
        "image_base64": ""
    }
    ok_inbox, msg_guardado = guardar_multimodal_inbox(test_payload)
    assert ok_inbox is True, "Debe persistir en SQLite Inbox antes de HTTP 202"
    
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT estatus FROM outbox_multimodal_inbox WHERE message_id = ?", (test_payload["message_id"],))
        est = cur.fetchone()
        assert est is not None and est[0] == "PENDIENTE", "El inbox debe tener el mensaje PENDIENTE"
    print(f"      ✅ SQLite Inbox Pre-202 OK: Mensaje {msg_guardado} guardado duraderamente.")

    print("\n" + "=" * 75)
    print("🏆 RESULTADO: TODAS LAS PRUEBAS PASARON EXITOSAMENTE (6/6 OK)")
    print("=" * 75)

if __name__ == "__main__":
    run_tests()

