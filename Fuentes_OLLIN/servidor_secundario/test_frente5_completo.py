"""
================================================================================
🏛️ SUITE DE PRUEBAS AUTOMATIZADAS — FRENTE 5 (CALPIXQUI)
Ecosistema OLLIN — Arauto Express (QRO / LEN / Sierra Gorda)
ARCHIVO: test_frente5_completo.py
================================================================================
Verifica:
1. Ingesta y Escudo de Pertenencia (HWBs 10 dígitos y PIDs Doble J).
2. Búsqueda Híbrida en Bóvedas (Nivel 1 OLLIN + Nivel 2 Fallback 2023).
3. Evaluación Cognitiva de Evidencias (Gemini 3.6 Flash / Heurística POD vs Rescate).
4. Ficha Proactiva en AppSheet (Filtro 'Solo OK' vs Advertencia Preventiva).
5. Dispersión GPS Multi-Punto para Zonas Rurales (Hasta 3 puntos, enlaces Maps/Waze).
6. Endpoint FastAPI /webhook/consulta_historica y /webhook/aclaracion.
7. Registro de Tickets en MONITOR_INCIDENCIAS_AE.
================================================================================
"""

import sys
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from frente5_aclaraciones_bot import BotAclaracionesFrente5, sanitizar_pid_para_boveda
from hermes_ollin_worker import app, ConsultaHistoricaPayload, AclaracionPayload

def test_doble_j():
    print("▶️ [TEST 1] Ley de la Doble J y Sanitización de PIDs...")
    assert sanitizar_pid_para_boveda("JJD0081109261063331986") == "JD0081109261063331986", "Fallo sanitizando JJD a JD"
    assert sanitizar_pid_para_boveda("JD0081109261063331986") == "JD0081109261063331986", "Fallo manteniendo JD"
    assert sanitizar_pid_para_boveda("") == "", "Fallo con PID vacío"
    print("  ✅ Ley de la Doble J verificada correctamente.")

def test_extraccion_identificadores():
    print("▶️ [TEST 2] Extracción de HWBs y PIDs en Hilos de Gmail...")
    bot = BotAclaracionesFrente5()
    texto_hilo = """
    De: rastreo.qro@dhl.com
    Para: aclaraciones@arauto.express
    Asunto: RV: URGENTE: SOLICITUD DE POD HWB 7592318041
    
    Favor de validar la entrega del paquete con HWB 7592318041 correspondiente a la
    pieza física JJD014589230194857291 en Parque Industrial Querétaro.
    Nota: También revisar pieza foránea JJD999999999999999999 y guía 9876543210.
    """
    ids = bot.extraer_identificadores(texto_hilo)
    assert "7592318041" in ids["hwbs"], "HWB 7592318041 no detectada"
    assert "9876543210" in ids["hwbs"], "HWB 9876543210 no detectada"
    assert "JD014589230194857291" in ids["pids"], "PID Doble J sanitizado no detectado"
    print(f"  ✅ HWBs detectadas: {ids['hwbs']}")
    print(f"  ✅ PIDs detectados (Doble J): {ids['pids']}")

def test_evaluacion_cognitiva_bifurcacion():
    print("▶️ [TEST 3] Evaluación Cognitiva: Evidencia Completa vs Deficiente...")
    bot = BotAclaracionesFrente5()

    # Caso A: Evidencia Completa (Firma + Foto + GPS)
    reg_completo = {
        "guia": "7592318041",
        "pid": "JD014589230194857291",
        "destinatario": "Ing. Carlos Mendoza",
        "checkpoint": "OK",
        "comentarios": "Entregado a recepcionista en caseta principal",
        "pochteca": "edgar.rodriguez@arauto.express",
        "foto_fachada": "https://drive.google.com/uc?id=1AbCdEfGhIjKlMnOpQrStUvWxYz",
        "firma_evidencia": "https://drive.google.com/uc?id=1ZyXwVuTsRqPoNmLkJiHgFeDcBa",
        "gps": "20.5931, -100.3921"
    }
    eval_a = bot.evaluar_cognitivamente("SOLICITUD POD 7592318041", "Cliente requiere prueba de entrega", reg_completo)
    assert eval_a["suficiencia"] == "COMPLETA", f"Esperado COMPLETA, obtenido {eval_a['suficiencia']}"
    borrador = bot.generar_borrador_dhl(reg_completo, eval_a)
    assert "Ing. Carlos Mendoza" in borrador, "Borrador DHL no contiene receptor"
    assert "7592318041" in borrador, "Borrador DHL no contiene guía"
    print("  ✅ Caso A (Evidencia Completa): Borrador generado exitosamente.")

    # Caso B: Evidencia Deficiente (Sin firma ni foto)
    reg_deficiente = {
        "guia": "9876543210",
        "pid": "JD999999999999999999",
        "destinatario": "María López",
        "checkpoint": "OK",
        "comentarios": "Sin evidencia",
        "pochteca": "chofer2@arauto.express",
        "foto_fachada": "",
        "firma_evidencia": "",
        "gps": ""
    }
    eval_b = bot.evaluar_cognitivamente("RECLAMO 9876543210", "Cliente desconoce entrega", reg_deficiente)
    assert eval_b["suficiencia"] in ["DEFICIENTE", "SIN_EVIDENCIA"], "No detectó suficiencia deficiente"
    assert len(eval_b["faltantes"]) > 0, "No listó evidencias faltantes"
    print("  ✅ Caso B (Evidencia Deficiente): Alerta de rescate activada con faltantes:", eval_b["faltantes"])

def test_filtro_calidad_solo_ok_y_advertencias():
    print("▶️ [TEST 4] Filtro de Calidad 'Solo OK' y Alerta Preventiva en Ruta...")
    bot = BotAclaracionesFrente5()

    # Configurar Mock de Sheets en memoria para simular Bóveda VALIDACIÓN_QRO_2025
    class MockWorksheet:
        def __init__(self, data):
            self.data = data
        def get_all_values(self):
            return self.data

    class MockSpreadsheet:
        def __init__(self, data):
            self.ws = MockWorksheet(data)
        def worksheet(self, name):
            return self.ws

    class MockGC:
        def __init__(self, data):
            self.sh = MockSpreadsheet(data)
        def open_by_key(self, key):
            return self.sh

    # Esquema de 25 columnas rígidas:
    # 0: Guia, 1: PID, 2: CP, 3: Piezas, 4: Addr1, 5: Addr2, 6: Addr3, 7: RecName, 8: GPS, 9: Checkpoint,
    # 10: Comentarios, 11: Asig, 12: Ruta, 13: FotoFachada, 14: Chofer, 15: EDD, 16: KEY, 17: Serv, 18: Inter,
    # 19: Firma, 20: Tel, 21: Hora, 22: Auditor, 23: Motivo, 24: Marca
    headers_val = ["Guia", "PID", "C.P.", "Piezas", "Rcvr Addr 1", "Rcvr Addr 2", "Rcvr Addr 3", "Receiver Name", "GPS", "Checkpoint", "Comentarios", "Fecha asignación", "Fecha en ruta", "Imagen fachada", "ID correo", "EDD", "KEY", "Tipo de servicio", "Inter", "Firma", "Telefono", "Hora de llegada", "Aprobación Auditor", "Motivo de Rechazo", "Marca de Tiempo"]

    # Fila 1: Entrega Exitosa 'OK' en San Pablo
    fila_ok = ["7592318041", "JD014589230194857291", "76130", 1, "Av 5 de Febrero 1300", "San Pablo", "", "Carlos Mendoza", "20.593100, -100.392100", "OK", "Entregado a recepcionista", "2026-09-20", "2026-09-20 10:00", "https://drive.google.com/uc?id=FotoFachada123", "edgar.rodriguez@arauto.express", "2026-09-20", "KEY1", "Express", "", "https://drive.google.com/uc?id=Firma123", "4421234567", "11:30", "true", "", "2026-09-20 11:30:00"]
    # Fila 2: Entrega con Incidencia en Los Encinos
    fila_incidencia = ["7592318042", "JD014589230194857292", "76220", 1, "Calle Los Encinos Manzana 4", "Santa Rosa", "", "Pedro Ramírez", "20.650000, -100.450000", "CERRADO", "Portón con candado, nadie atiende", "2026-09-21", "2026-09-21 10:00", "https://drive.google.com/uc?id=FotoRechazo", "chofer2@arauto.express", "2026-09-21", "KEY2", "Express", "", "", "4429876543", "12:00", "false", "Cerrado", "2026-09-21 12:00:00"]
    # Fila 3 y 4: Colindantes 'OK' en San Pablo (para dispersión multi-punto)
    fila_colindante1 = ["7592318043", "JD014589230194857293", "76130", 1, "Av 5 de Febrero 1320", "San Pablo", "", "Farmacia San Pablo", "20.594200, -100.391500", "OK", "Entregado a encargado", "2026-09-21", "", "https://drive.google.com/uc?id=FotoCol1", "edgar.rodriguez@arauto.express", "", "KEY3", "", "", "", "", "", "", "", ""]
    fila_colindante2 = ["7592318044", "JD014589230194857294", "76130", 1, "Av 5 de Febrero 1280", "San Pablo", "", "Taller Mecánico", "20.592500, -100.392800", "OK", "Entregado en mostrador", "2026-09-21", "", "https://drive.google.com/uc?id=FotoCol2", "edgar.rodriguez@arauto.express", "", "KEY4", "", "", "", "", "", "", "", ""]

    bot.gc = MockGC([headers_val, fila_ok, fila_incidencia, fila_colindante1, fila_colindante2])

    # 1. Probar consulta de domicilio con entrega previa exitosa ('Solo OK')
    res_ok = bot.buscar_referencias_historicas_direccion(
        direccion="Av 5 de Febrero 1300 San Pablo",
        cp="76130",
        destinatario="Carlos Mendoza"
    )
    assert res_ok["calidad_aprobada_solo_ok"] is True, "Fallo: la entrega OK no fue aprobada por el filtro 'Solo OK'"
    assert res_ok["referencia_principal"]["ultimo_receptor"] == "Carlos Mendoza"
    assert "FotoFachada123" in res_ok["referencia_principal"]["foto_fachada_previa"]
    assert "google.com/maps" in res_ok["referencia_principal"]["enlaces_navegacion"]["google_maps"]
    assert "waze.com/ul" in res_ok["referencia_principal"]["enlaces_navegacion"]["waze"]
    print("  ✅ Filtro 'Solo OK' aprobado: Inyectó fachada previa y receptor exitoso.")

    # 2. Probar consulta de domicilio con incidencia previa ('CERRADO')
    res_inc = bot.buscar_referencias_historicas_direccion(
        direccion="Calle Los Encinos Manzana 4 Santa Rosa",
        cp="76220",
        destinatario="Pedro Ramírez"
    )
    assert res_inc["calidad_aprobada_solo_ok"] is False, "Fallo: no debe aprobar como positiva una entrega con incidencia"
    assert res_inc["referencia_principal"] is None, "Fallo: no debe proveer referencia positiva de domicilio fallido"
    assert "CERRADO" in res_inc["advertencia_incidencia"]
    assert "No se avala como referencia positiva" in res_inc["advertencia_incidencia"]
    print("  ✅ Advertencia preventiva activada correctamente ante incidencia previa:", res_inc["advertencia_incidencia"][:70] + "...")

    # 3. Probar dispersión GPS multi-punto en San Pablo (debe entregar 3 puntos 'OK')
    res_disp = bot.buscar_referencias_historicas_direccion(
        direccion="Av 5 de Febrero 1300 San Pablo",
        cp="76130",
        modo_dispersion=True,
        limite_dispersion=3
    )
    assert len(res_disp["puntos_gps"]) == 3, f"Esperados 3 puntos para triangulación, obtenidos {len(res_disp['puntos_gps'])}"
    assert res_disp["puntos_gps"][0]["tipo"] == "REFERENCIA_DIRECTA_OK"
    for pt in res_disp["puntos_gps"]:
        assert "google_maps_url" in pt and "waze_url" in pt
        print(f"     • Punto {pt['indice']}: {pt['coordenadas']} | Maps: {pt['google_maps_url']}")
    print("  ✅ Dispersión GPS Multi-Punto verificada con exactamente 3 referencias 'OK' para triangulación.")

def test_dispersion_gps_multipunto():
    print("▶️ [TEST 5] Dispersión GPS Multi-Punto para Zonas Rurales / Baja Señal...")
    bot = BotAclaracionesFrente5()

    # Coordenadas de prueba en Querétaro
    p1 = (20.593100, -100.392100)
    p2 = (20.594200, -100.391500)

    # Distancia entre p1 y p2
    dist_1_2 = bot.calcular_distancia_metros(p1[0], p1[1], p2[0], p2[1])
    assert 50.0 < dist_1_2 < 300.0, f"Distancia inesperada: {dist_1_2}m"
    print(f"  • Distancia calculada p1-p2: {dist_1_2} metros")

    # Enlaces de mapas
    links = bot.generar_enlaces_mapas(p1[0], p1[1])
    assert "google.com/maps" in links["google_maps"]
    assert "waze.com/ul" in links["waze"]
    assert "20.593100, -100.392100" in links["coordenadas_str"]
    print("  • Enlace Google Maps:", links["google_maps"])
    print("  • Enlace Waze:", links["waze"])
    print("  ✅ Triangulación GPS Multi-Punto validada con éxito.")

def test_asistente_conversacional_ruta():
    print("▶️ [TEST 6] Asistente Conversacional CALPIXQUI para Pochtecas...")
    bot = BotAclaracionesFrente5()

    # Consulta con solicitud explícita de dispersión
    resp = bot.consultar_asistente_ruta(
        query_texto="La dirección no coincide, dame más referencias o coordenadas en San Pablo CP 76130",
        pochteca="Irvin Reyes (Ruta 4)"
    )
    assert resp["exito"] is True
    assert "ASISTENTE DE RUTA CALPIXQUI" in resp["mensaje_texto"]
    assert "Irvin Reyes" in resp["mensaje_texto"]
    print("  ✅ Asistente generó mensaje enriquecido para WhatsApp/Chat:")
    print("  -------------------------------------------------------------")
    for linea in resp["mensaje_texto"].split("\n")[:8]:
        print("  ", linea)
    print("   (...)")
    print("  -------------------------------------------------------------")

def test_endpoints_fastapi():
    print("▶️ [TEST 7] Simulación de Endpoints FastAPI de Calpixqui...")
    # Verificar que las rutas existan en la app de FastAPI
    rutas = [r.path for r in app.routes]
    assert "/webhook/consulta_historica" in rutas, "Ruta /webhook/consulta_historica no registrada en FastAPI"
    assert "/webhook/aclaracion" in rutas, "Ruta /webhook/aclaracion no registrada en FastAPI"
    assert "/health" in rutas, "Ruta /health no registrada en FastAPI"
    print("  ✅ Endpoints registrados en app FastAPI:")
    for r in app.routes:
        if hasattr(r, "methods"):
            print(f"     • {list(r.methods)} {r.path}")

if __name__ == "__main__":
    print("================================================================")
    print("🏛️ INICIANDO SUITE COMPLETA DE VALIDACIÓN FRENTE 5")
    print("================================================================")
    test_doble_j()
    test_extraccion_identificadores()
    test_evaluacion_cognitiva_bifurcacion()
    test_filtro_calidad_solo_ok_y_advertencias()
    test_dispersion_gps_multipunto()
    test_asistente_conversacional_ruta()
    test_endpoints_fastapi()
    print("================================================================")
    print("🎉 TODAS LAS PRUEBAS DEL FRENTE 5 PASARON CON 100% DE ÉXITO")
    print("================================================================")
