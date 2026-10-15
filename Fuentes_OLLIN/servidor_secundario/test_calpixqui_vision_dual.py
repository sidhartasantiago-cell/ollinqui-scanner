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
import tempfile
import shutil
import gc
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Aislamiento hermético de pruebas: Directorio temporal fuera de la BD real de usuario
TEST_TEMP_DIR = tempfile.mkdtemp(prefix="calpixqui_test_")
os.environ["CALPIXQUI_DATA_DIR"] = TEST_TEMP_DIR
os.environ["CALPIXQUI_AUTO_START_FLUSHER"] = "0"

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
    get_db_connection,
    DB_PATH
)

class MockGeminiClient:
    """Mock de Gemini que simula respuesta JSON estructurada de OCR."""
    def llamar_multimodal(self, prompt_sistema=None, datos_partes=None, temperatura=0.1, *args, **kwargs):
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
    print(f"📁 Directorio de pruebas aislado: {TEST_TEMP_DIR}")
    print("=" * 75)

    try:
        # ── PRUEBA 1: LEY DE LA DOBLE J Y NORMALIZACIÓN ──────────────────────────
        print("\n[1/6] 🏷️ Probando Ley de la Doble J y Normalización Telefónica...")
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
        print("\n[2/6] ⚡ Probando Candado de Idempotencia y Deduplicación...")
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
        print("\n[3/6] 🧠 Probando Sanador Heurístico contra Manifiesto Activo...")
        sanador = SanadorHeuristicoManifiesto()
        match_hwb = sanador.buscar_y_sanar("1133871690", "")
        assert match_hwb is not None, "El sanador debió encontrar la guía 1133871690 en el manifiesto"
        assert match_hwb["pid_boveda"].startswith("JD"), f"PID Bóveda erróneo: {match_hwb['pid_boveda']}"
        assert match_hwb["pid_appsheet"].startswith("JJD"), f"PID AppSheet erróneo: {match_hwb['pid_appsheet']}"
        print(f"      ✅ Sanador Heurístico OK: HWB={match_hwb['hwb']} | Dest={match_hwb['destinatario'][:20]}... | CP={match_hwb['cp']}")

        # ── PRUEBA 4: ENRUTADOR DE VISIÓN COMPLETO (ORQUESTADOR) ─────────────────
        print("\n[4/6] 📸 Probando Enrutador de Visión con Gemini Mock & Directorio...")
        router = CalpixquiVisionRouter(
            gemini_client=MockGeminiClient(),
            pochtecas_manager=MockPochtecasManager(),
            matriz_cp_manager=None
        )
        
        # A) Simular solicitud desde Grupo de WhatsApp de Edgar (Metrópoli -> Debe ser BLOQUEADO)
        resultado_bloqueo = router.procesar_imagen_whatsapp(
            image_base64="fake_img_bytes_1",
            mimetype="image/jpeg",
            sender_phone="4423816310", # Tel de Edgar
            chat_id="120363024859@g.us", # Grupo
            is_group=True,
            caption="Asignamela porfa"
        )
        assert resultado_bloqueo["exito"] is False, "Edgar debe ser bloqueado para Sierra Gorda"
        assert resultado_bloqueo["motivo"] == "BLOQUEO_TERRITORIAL_SIERRA_GORDA", "Motivo debe ser bloqueo territorial"
        print("      ✅ Bloqueo Territorial Poka-Yoke verificado: Edgar (Metrópoli) no puede autoasignarse Sierra Gorda.")

        # B) Simular solicitud desde Grupo de Daniel Juárez (Titular Sierra Gorda -> Debe ser PERMITIDO)
        resultado_grupo = router.procesar_imagen_whatsapp(
            image_base64="fake_img_bytes_daniel",
            mimetype="image/jpeg",
            sender_phone="4191155625", # Tel de Daniel Juárez
            chat_id="120363024859@g.us", # Grupo
            is_group=True,
            caption="Asignamela porfa"
        )
        assert resultado_grupo["exito"] is True, "Daniel Juárez debe tener asignación exitosa"
        assert resultado_grupo["hwb"] == "1133871690", f"HWB extraído incorrecto: {resultado_grupo['hwb']}"
        assert resultado_grupo["nuevo_chofer_email"] == "xichudaniel@gmail.com", "Chofer no coincide"
        assert resultado_grupo["is_group"] is True, "Debe ser marcado como grupo"
        print(f"      ✅ Orquestador Visión OK: Guía {resultado_grupo['hwb']} asignada a {resultado_grupo['nuevo_chofer_nombre']}")

        # ── PRUEBA 5: OUTBOX PATTERN SQLITE (WAL) & FALLA CERRADA PID ────────────
        print("\n[5/6] 💾 Probando Inserción Atómica en Outbox Local (SQLite WAL)...")
        inicializar_outbox_db()
        resultado_grupo["message_id"] = "msg_outbox_test_100"
        id_registro = encolar_asignacion_outbox(resultado_grupo)
        assert id_registro > 0, "El ID de inserción debe ser > 0"
        
        with get_db_connection() as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("SELECT * FROM outbox_asignaciones WHERE id = ?", (id_registro,))
            row = cur.fetchone()
            assert row is not None, "El registro no fue persistido en SQLite"
            assert row["hwb"] == "1133871690", "HWB no coincide en base de datos"
            assert row["estatus"] == "PENDIENTE", "El estatus inicial debe ser PENDIENTE"
            assert row["pid_appsheet"].startswith("JJD"), "PID AppSheet debe tener JJD"
            assert row["pid_boveda"].startswith("JD"), "PID Bóveda debe tener JD"

        # Falla cerrada: PID vacío o inválido no debe ser encolado
        item_invalido = dict(resultado_grupo)
        item_invalido["pid_boveda"] = ""
        id_invalido = encolar_asignacion_outbox(item_invalido)
        assert id_invalido == -1, "encolar_asignacion_outbox debe retornar -1 para PIDs vacíos (Falla Cerrada)"

        # Deduplicación por UNIQUE index en outbox_asignaciones (Anti-carreras concurrentes)
        id_dup = encolar_asignacion_outbox(resultado_grupo)
        assert id_dup == id_registro, f"encolar_asignacion_outbox debe retornar el ID existente ({id_registro}) para message_id repetido"
        print(f"      ✅ Outbox WAL OK: Registro #{id_registro} persistido. Falla cerrada y deduplicación atómica UNIQUE verificadas.")

        # ── PRUEBA 6: INBOX MULTIMODAL PREVIO A HTTP 202 CON DEDUPLICACIÓN ───────
        print("\n[6/6] 🛡️ Probando Persistencia en Inbox Multimodal Previo a HTTP 202...")
        from calpixqui_dual_writer import guardar_multimodal_inbox, actualizar_estado_inbox
        test_payload = {
            "message_id": f"test_msg_{int(time.time()*1000)}",
            "chat_id": "120363024859@g.us",
            "sender": "4423816310",
            "caption": "1861995144 asignar",
            "image_base64": ""
        }
        ok_inbox, msg_guardado, es_dup = guardar_multimodal_inbox(test_payload)
        assert ok_inbox is True, "Debe persistir en SQLite Inbox antes de HTTP 202"
        assert es_dup is False, "Primera recepción no debe ser duplicada"
        
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT estatus FROM outbox_multimodal_inbox WHERE message_id = ?", (test_payload["message_id"],))
            est = cur.fetchone()
            assert est is not None and est[0] == "PENDIENTE", "El inbox debe tener el mensaje PENDIENTE"

        # Probar deduplicación ante ráfagas
        ok_inbox2, msg_guardado2, es_dup2 = guardar_multimodal_inbox(test_payload)
        assert ok_inbox2 is True and es_dup2 is True, "Recepción repetida debe marcarse como duplicada"

        # Probar actualización de estado
        actualizar_estado_inbox(test_payload["message_id"], "COMPLETADO")
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT estatus FROM outbox_multimodal_inbox WHERE message_id = ?", (test_payload["message_id"],))
            est_up = cur.fetchone()
            assert est_up is not None and est_up[0] == "COMPLETADO", "Estado debe actualizarse a COMPLETADO"

        # Probar Reclamación Concurrente Atómica con BEGIN IMMEDIATE y worker_id (Carrera entre 2 Workers)
        from hermes_ollin_worker import recuperar_inbox_pendientes
        from calpixqui_dual_writer import LeaseHeartbeat
        test_payload_recup = {
            "message_id": f"test_recup_{int(time.time()*1000)}",
            "chat_id": "120363024859@g.us",
            "sender": "4423816310",
            "caption": "recuperar",
            "image_base64": ""
        }
        guardar_multimodal_inbox(test_payload_recup)
        
        # Simular contención concurrente entre Worker A y Worker B:
        # Worker A debe ganar la reclamación atómica; Worker B debe obtener 0 filas (cero duplicación)
        filas_w1 = recuperar_inbox_pendientes(worker_id="test_worker_atomic_A", despachar=False)
        assert len(filas_w1) >= 1, "Worker A debe reclamar la tarea pendiente"
        
        filas_w2 = recuperar_inbox_pendientes(worker_id="test_worker_atomic_B", despachar=False)
        assert len(filas_w2) == 0, "Worker B no debe reclamar tareas ya tomadas por Worker A (Cero duplicación concurrente)"
        
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT estatus, worker_id FROM outbox_multimodal_inbox WHERE message_id = ?", (test_payload_recup["message_id"],))
            row_recup = cur.fetchone()
            assert row_recup is not None and row_recup[1] == "test_worker_atomic_A", "El mensaje debe pertenecer exclusivamente a test_worker_atomic_A"
            assert row_recup[0] == "EN_PROCESO", "El estatus debe estar EN_PROCESO"

        # Probar Renovación Dinámica de Lease (LeaseHeartbeat)
        id_hb = encolar_asignacion_outbox({
            "hwb": "1133871699",
            "pid_boveda": "JD014600012830809999",
            "pid_appsheet": "JJD014600012830809999",
            "nuevo_chofer_email": "xichudaniel@gmail.com",
            "nuevo_chofer_nombre": "Daniel Juárez",
            "message_id": f"test_hb_{int(time.time()*1000)}"
        })
        with get_db_connection() as conn:
            conn.execute("UPDATE outbox_asignaciones SET estatus = 'EN_PROCESO', actualizado_en = '2026-01-01T00:00:00' WHERE id = ?", (id_hb,))
            conn.commit()

        hb = LeaseHeartbeat("outbox_asignaciones", [id_hb], interval_sec=0.1)
        hb.start()
        time.sleep(0.35)
        hb.stop()

        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT actualizado_en FROM outbox_asignaciones WHERE id = ?", (id_hb,))
            nuevo_ts = cur.fetchone()[0]
            assert nuevo_ts > "2026-01-01T00:00:00", f"LeaseHeartbeat debió renovar actualizado_en ({nuevo_ts})"

        print(f"      ✅ SQLite Inbox Pre-202 OK: Mensaje {msg_guardado} guardado duraderamente y deduplicado.")
        print("      ✅ Contención 2 Workers OK: Worker A ganó reclamo atómico, Worker B obtuvo 0 filas.")
        print(f"      ✅ Heartbeat de Lease OK: Timestamp renovado automáticamente a {nuevo_ts}.")

        print("\n" + "=" * 75)
        print("🏆 RESULTADO: TODAS LAS PRUEBAS PASARON EXITOSAMENTE (6/6 OK)")
        print("=" * 75)
    finally:
        # Detener demonio flusher si existe para liberar locks de archivo en Windows
        try:
            from calpixqui_dual_writer import _flusher_daemon_instance
            if _flusher_daemon_instance:
                _flusher_daemon_instance.stop()
        except Exception:
            pass

        # Forzar recolección de basura para cerrar descriptores de SQLite
        gc.collect()
        time.sleep(0.15)
        shutil.rmtree(TEST_TEMP_DIR, ignore_errors=True)
        assert not os.path.exists(TEST_TEMP_DIR), f"El directorio temporal {TEST_TEMP_DIR} no debe existir tras limpieza"
        print(f"🧹 Directorio de pruebas aislado {TEST_TEMP_DIR} eliminado correctamente (0 threads activos).")

if __name__ == "__main__":
    run_tests()

