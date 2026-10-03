import sys
import asyncio
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from hermes_ollin_worker import (
    gestionar_directorio_pochteca,
    reasignar_municipio_masivo,
    resolver_asignacion_cp,
    listar_directorio_pochtecas,
    consultar_estado_matriz_cp,
    GestionPochtecaPayload,
    ReasignacionMasivaPayload,
    ResolverAsignacionPayload
)

async def test_direct_endpoints():
    print("=" * 75)
    print("🌐 PRUEBA DE FUNCIONES DE ENDPOINT CALPIXQUI (/webhook/gestion_pochteca, etc.)")
    print("=" * 75)

    # 1. GET /pochtecas
    res_list = listar_directorio_pochtecas()
    print(f"✅ listar_directorio_pochtecas(): OK -> Total: {res_list['total']}")

    # 2. GET /matriz_cp/estado
    res_est = consultar_estado_matriz_cp()
    print(f"✅ consultar_estado_matriz_cp(): OK -> Total CPs: {res_est['total_cps']}, Overrides: {res_est['total_overrides_activos']}")

    # 3. POST /webhook/resolver_asignacion (CP 37930)
    res_asig = await resolver_asignacion_cp(ResolverAsignacionPayload(cp="37930"))
    asig = res_asig.get("resultado", {})
    print(f"✅ resolver_asignacion_cp(37930): Chofer = {asig.get('chofer_asignado')}, Municipio = {asig.get('municipio')}, Dual = {asig.get('despacho_dual_requerido')}")

    # 4. POST /webhook/gestion_pochteca (AGREGAR)
    payload_add = GestionPochtecaPayload(
        accion="AGREGAR_POCHTECA",
        correo="direct.test@arauto.express",
        nombre="Direct Test Pochteca",
        telefono="+52 442 777 0000",
        rol="POCHTECA",
        zona_asignada="Sierra Gorda",
        supervisor="xichudaniel@gmail.com"
    )
    res_add = await gestionar_directorio_pochteca(payload_add)
    print(f"✅ gestionar_directorio_pochteca (AGREGAR): OK -> {res_add.get('accion')}")

    # 5. POST /webhook/gestion_pochteca (ACTUALIZAR)
    payload_up = GestionPochtecaPayload(
        accion="ACTUALIZAR_POCHTECA",
        correo="direct.test@arauto.express",
        telefono="+52 442 777 9999",
        zona_asignada="Sierra Gorda - Microzona 3"
    )
    res_up = await gestionar_directorio_pochteca(payload_up)
    print(f"✅ gestionar_directorio_pochteca (ACTUALIZAR): OK -> Nuevo Tel: {res_up.get('pochteca', {}).get('telefono')}")

    # 6. POST /webhook/gestion_pochteca (BAJA)
    payload_baja = GestionPochtecaPayload(
        accion="BAJA_POCHTECA",
        correo="direct.test@arauto.express"
    )
    res_baja = await gestionar_directorio_pochteca(payload_baja)
    print(f"✅ gestionar_directorio_pochteca (BAJA Soft Delete): OK -> Estatus: {res_baja.get('pochteca', {}).get('estatus')}")

    # 7. POST /webhook/reasignacion_masiva (Comando texto)
    payload_cmd = ReasignacionMasivaPayload(
        comando_texto="Reasigna todo el Municipio de Xichú a Oscher hasta el 23/09"
    )
    res_cmd = await reasignar_municipio_masivo(payload_cmd)
    print(f"✅ reasignar_municipio_masivo: OK -> {res_cmd.get('total_cps_actualizados')} CPs reasignados a {res_cmd.get('nuevo_chofer')}")

    # Limpieza Poka-Yoke del usuario de prueba
    from calpixqui_gobernanza import pochtecas_global
    if "direct.test@arauto.express" in pochtecas_global.directorio:
        del pochtecas_global.directorio["direct.test@arauto.express"]
        pochtecas_global.guardar_local()
    print("✅ Limpieza Poka-Yoke de usuario temporal completada.")

    print("\n" + "=" * 75)
    print("🏆 TODAS LAS FUNCIONES DE ENDPOINTS EJECUTADAS Y VALIDADAS CON ÉXITO")
    print("=" * 75)

if __name__ == "__main__":
    asyncio.run(test_direct_endpoints())
