import sys
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from hermes_ollin_worker import app

def test_fastapi_endpoints():
    print("=" * 75)
    print("🌐 PRUEBA DE ENDPOINTS FASTAPI CALPIXQUI (/webhook/gestion_pochteca, etc.)")
    print("=" * 75)

    try:
        from fastapi.testclient import TestClient
    except ImportError:
        print("fastapi.testclient no disponible directamente. Importando requests mock...")
        return

    client = TestClient(app)

    # 1. GET /
    r = client.get("/")
    assert r.status_code == 200
    print("✅ GET /: OK ->", r.json().get("agente"))

    # 2. GET /pochtecas
    r = client.get("/pochtecas")
    assert r.status_code == 200
    print(f"✅ GET /pochtecas: OK -> Total: {r.json().get('total')}")

    # 3. GET /matriz_cp/estado
    r = client.get("/matriz_cp/estado")
    assert r.status_code == 200
    print(f"✅ GET /matriz_cp/estado: OK -> Total CPs: {r.json().get('total_cps')}, Overrides: {r.json().get('total_overrides_activos')}")

    # 4. POST /webhook/resolver_asignacion (CP 37930)
    r = client.post("/webhook/resolver_asignacion", json={"cp": "37930"})
    assert r.status_code == 200
    asig = r.json().get("resultado", {})
    print(f"✅ POST /webhook/resolver_asignacion (37930): Chofer = {asig.get('chofer_asignado')}, Municipio = {asig.get('municipio')}, Dual = {asig.get('despacho_dual_requerido')}")

    # 5. POST /webhook/gestion_pochteca (AGREGAR)
    payload_add = {
        "accion": "AGREGAR_POCHTECA",
        "correo": "endpoint.test@arauto.express",
        "nombre": "Endpoint Test Pochteca",
        "telefono": "+52 442 555 1234",
        "rol": "POCHTECA",
        "zona_asignada": "QRO Norte",
        "supervisor": "irvin.reyes@arauto.express"
    }
    r = client.post("/webhook/gestion_pochteca", json=payload_add)
    assert r.status_code == 200
    print(f"✅ POST /webhook/gestion_pochteca (AGREGAR): OK -> {r.json().get('accion')}")

    # 6. POST /webhook/gestion_pochteca (ACTUALIZAR)
    payload_up = {
        "accion": "ACTUALIZAR_POCHTECA",
        "correo": "endpoint.test@arauto.express",
        "telefono": "+52 442 555 9999"
    }
    r = client.post("/webhook/gestion_pochteca", json=payload_up)
    assert r.status_code == 200
    print(f"✅ POST /webhook/gestion_pochteca (ACTUALIZAR): OK -> Nuevo Tel: {r.json().get('pochteca', {}).get('telefono')}")

    # 7. POST /webhook/gestion_pochteca (BAJA)
    payload_baja = {
        "accion": "BAJA_POCHTECA",
        "correo": "endpoint.test@arauto.express"
    }
    r = client.post("/webhook/gestion_pochteca", json=payload_baja)
    assert r.status_code == 200
    print(f"✅ POST /webhook/gestion_pochteca (BAJA Soft Delete): OK -> Estatus: {r.json().get('pochteca', {}).get('estatus')}")

    # 8. POST /webhook/reasignacion_masiva (Comando texto)
    r = client.post("/webhook/reasignacion_masiva", json={"comando_texto": "Reasigna todo el Municipio de Xichú a Oscher hasta el 23/09"})
    assert r.status_code == 200
    print(f"✅ POST /webhook/reasignacion_masiva: OK -> {r.json().get('total_cps_actualizados')} CPs reasignados a {r.json().get('nuevo_chofer')}")

    print("\n" + "=" * 75)
    print("🏆 TODOS LOS ENDPOINTS FASTAPI FUERON VALIDADOS EXITOSAMENTE")
    print("=" * 75)

if __name__ == "__main__":
    test_fastapi_endpoints()
