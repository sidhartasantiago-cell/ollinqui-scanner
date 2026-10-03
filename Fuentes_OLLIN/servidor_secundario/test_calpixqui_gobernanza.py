import sys
import json
from pathlib import Path
from datetime import date, timedelta

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from calpixqui_gobernanza import (
    pochtecas_global,
    matriz_cp_global,
    despacho_dual_global
)

def test_suite():
    print("=" * 75)
    print("🏛️ SUITE DE PRUEBAS: GOBERNANZA CALPIXQUI Y MATRIZ_CP MULTICAPA")
    print("=" * 75)

    # Asegurar que Oscher esté en el directorio como activo para pruebas
    if "oscher1016@gmail.com" not in pochtecas_global.directorio:
        pochtecas_global.directorio["oscher1016@gmail.com"] = {
            "correo": "oscher1016@gmail.com",
            "nombre": "Oscher",
            "telefono": "4191002030",
            "rol": "Pochteca",
            "zona_asignada": "Sierra Gorda",
            "supervisor": "xichudaniel@gmail.com",
            "grupo": "Daniel",
            "webhook_chat": "https://chat.googleapis.com/v1/spaces/AAQATOX9ZdI/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Was4vqP6iZorQmeccB_7GTxSYQgBUDmgoqVDfkyxgtc",
            "tiene_7ca": False,
            "estatus": "Activo",
            "fecha_creacion": "2026-09-22T00:00:00",
            "fecha_actualizacion": "2026-09-22T00:00:00"
        }
        pochtecas_global.guardar_local()

    # --------------------------------------------------------------------------
    # 1. PRUEBA DE DIRECTORIO DE POCHTECAS Y PERSISTENCIA DUAL
    # --------------------------------------------------------------------------
    print("\n[1/5] 👥 Probando Directorio de Pochtecas...")
    total_inicios = len(pochtecas_global.listar_pochtecas())
    print(f"      Pochtecas sembrados actualmente: {total_inicios}")

    email_test = "test.pochteca.calpixqui@arauto.express"
    tel_test_1 = "+52 442 111 2233"
    tel_test_2 = "+52 442 999 8877"

    # a) Agregar
    print("      -> Agregando Pochteca de prueba...")
    res_add = pochtecas_global.agregar_pochteca(
        correo=email_test,
        nombre="Pochteca Test Calpixqui",
        telefono=tel_test_1,
        rol="POCHTECA",
        zona_asignada="Sierra Gorda",
        supervisor="xichudaniel@gmail.com"
    )
    assert res_add["status"] == "success"
    print(f"      ✅ Pochteca agregado: {email_test} (Sync Sheets: {res_add['sync_sheets']})")

    # b) Actualizar
    print("      -> Actualizando teléfono de Pochteca...")
    res_up = pochtecas_global.actualizar_pochteca(
        correo=email_test,
        telefono=tel_test_2,
        zona_asignada="Sierra Gorda - Microzona 3"
    )
    assert res_up["status"] == "success"
    poch_leido = pochtecas_global.obtener_pochteca(email_test)
    assert poch_leido["telefono"] == tel_test_2
    print(f"      ✅ Teléfono actualizado correctamente a {poch_leido['telefono']}")

    # c) Baja (Soft Delete)
    print("      -> Ejecutando Baja (Soft Delete)...")
    res_baja = pochtecas_global.baja_pochteca(email_test)
    assert res_baja["status"] == "success"
    poch_baja = pochtecas_global.obtener_pochteca(email_test)
    assert poch_baja["estatus"] == "Inactivo"
    print(f"      ✅ Soft-delete confirmado: Estatus = '{poch_baja['estatus']}', Historial preservado.")

    # --------------------------------------------------------------------------
    # 2. PRUEBA DE MATRIZ_CP MULTICAPA (9 COLUMNAS)
    # --------------------------------------------------------------------------
    print("\n[2/5] 🗺️ Probando MATRIZ_CP en RAM...")
    print(f"      Total CPs en RAM: {len(matriz_cp_global.matriz_cp)}")
    assert len(matriz_cp_global.matriz_cp) >= 540

    # Consulta base Xichú (37930)
    asig_xichu = matriz_cp_global.resolver_asignacion(cp="37930")
    print(f"      Xichú (37930) -> Municipio: {asig_xichu['municipio']}, Titular: {asig_xichu['chofer_titular']}, Supervisor: {asig_xichu['supervisor']}")
    assert asig_xichu["municipio"] == "Xichú"
    assert asig_xichu["supervisor"] == "xichudaniel@gmail.com"
    assert asig_xichu["despacho_dual_requerido"] == True

    # Consulta base QRO Centro (76000)
    asig_qro = matriz_cp_global.resolver_asignacion(cp="76000")
    print(f"      QRO Centro (76000) -> Municipio: {asig_qro['municipio']}, Titular: {asig_qro['chofer_titular']}, Supervisor: {asig_qro['supervisor']}")
    assert asig_qro["municipio"] == "Querétaro"
    assert asig_qro["despacho_dual_requerido"] == False

    # --------------------------------------------------------------------------
    # 3. PRUEBA DE ASIGNACIÓN DINÁMICA Y AUTORRECUPERACIÓN
    # --------------------------------------------------------------------------
    print("\n[3/5] ⚡ Probando Asignación Dinámica y Autorrecuperación...")
    mañana = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
    ayer = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")

    # Simulación 1: Override Activo Vigente
    matriz_cp_global.matriz_cp["37930"]["Override_Activo"] = "oscher1016@gmail.com"
    matriz_cp_global.matriz_cp["37930"]["Fecha_Expiracion_Override"] = mañana

    asig_vigente = matriz_cp_global.resolver_asignacion(cp="37930")
    print(f"      Vigente (hasta {mañana}): Asignado = {asig_vigente['chofer_asignado']} (Es Override: {asig_vigente['es_override']})")
    assert asig_vigente["chofer_asignado"] == "oscher1016@gmail.com"
    assert asig_vigente["es_override"] == True
    print("      ✅ Override activo asignado correctamente.")

    # Simulación 2: Override Expirado (Autorrecuperación)
    matriz_cp_global.matriz_cp["37930"]["Fecha_Expiracion_Override"] = ayer
    asig_expirado = matriz_cp_global.resolver_asignacion(cp="37930")
    print(f"      Expirado (venció {ayer}): Asignado = {asig_expirado['chofer_asignado']} (Es Override: {asig_expirado['es_override']}, Estado: {asig_expirado['estado_override']})")
    assert asig_expirado["chofer_asignado"] == asig_expirado["chofer_titular"]
    assert asig_expirado["es_override"] == False
    assert asig_expirado["estado_override"] == "EXPIRADO_AUTORRECUPERADO"
    print("      ✅ Autorrecuperación automática hacia Chofer_Titular confirmada al 100%.")

    # Limpiar override de prueba
    matriz_cp_global.matriz_cp["37930"]["Override_Activo"] = ""
    matriz_cp_global.matriz_cp["37930"]["Fecha_Expiracion_Override"] = ""

    # --------------------------------------------------------------------------
    # 4. PRUEBA DE REASIGNACIÓN MASIVA POR MUNICIPIO Y PARSER DE COMANDOS
    # --------------------------------------------------------------------------
    print("\n[4/5] 📦 Probando Reasignación Masiva por Municipio...")
    comando_test = "Reasigna todo el Municipio de Xichú a Oscher hasta el 23/09"
    res_cmd = matriz_cp_global.interpretar_comando_reasignacion(comando_test)
    print(f"      Resultado comando '{comando_test}':")
    print(f"      -> Total CPs actualizados: {res_cmd.get('total_cps_actualizados')}")
    print(f"      -> Nuevo chofer asignado: {res_cmd.get('nuevo_chofer')}")
    print(f"      -> Fecha expiración: {res_cmd.get('fecha_expiracion')}")
    assert res_cmd["status"] == "success"
    assert res_cmd["total_cps_actualizados"] == 9
    assert res_cmd["nuevo_chofer"] == "oscher1016@gmail.com"

    # Verificar que el CP 37930 ahora tiene el override persistido
    asig_xichu_post = matriz_cp_global.resolver_asignacion(cp="37930")
    print(f"      Verificación post-comando CP 37930: Asignado = {asig_xichu_post['chofer_asignado']} (Override: {asig_xichu_post['es_override']})")
    assert asig_xichu_post["chofer_asignado"] == "oscher1016@gmail.com"

    # --------------------------------------------------------------------------
    # 5. PRUEBA DE DESPACHO DUAL (SIERRA GORDA / DANIEL JUÁREZ)
    # --------------------------------------------------------------------------
    print("\n[5/5] 🚨 Probando Regla de Despacho Dual...")
    despacho = despacho_dual_global.despachar_alerta_guia(
        guia="1234567890",
        pid="JD014600012345678901",
        cp="37930",
        municipio="Xichú"
    )
    print(f"      Total alertas emitidas: {len(despacho['alertas_emitidas'])}")
    for a in despacho["alertas_emitidas"]:
        print(f"      -> Canal: {a['canal']} | Destinatario: {a['destinatario']} ({a['rol']}) | Envío: {a.get('status_envio')}")

    assert len(despacho["alertas_emitidas"]) == 2
    destinatarios = [a["destinatario"] for a in despacho["alertas_emitidas"]]
    assert "oscher1016@gmail.com" in destinatarios
    assert "xichudaniel@gmail.com" in destinatarios
    print("      ✅ Despacho Dual verificado: Chofer operativo + Daniel Juárez notificados en paralelo.")

    # Poka-Yoke: Limpiar pochteca de prueba
    if email_test in pochtecas_global.directorio:
        del pochtecas_global.directorio[email_test]
        pochtecas_global.guardar_local()

    print("\n" + "=" * 75)
    print("🏆 RESULTADO: TODAS LAS PRUEBAS UNITARIAS Y DE INTEGRACIÓN PASARON EXITOSAMENTE")
    print("=" * 75)

if __name__ == "__main__":
    test_suite()
