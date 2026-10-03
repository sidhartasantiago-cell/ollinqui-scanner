"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: API DE MONITOREO Y REASIGNACIÓN SIERRA GORDA (DANIEL JUÁREZ)
ARCHIVO: sierra_api.py (v82.0 PROD - Conexión Exclusiva a BD Central 2023)
================================================================================
"""

import os
import sys
import re
import json
import logging
import urllib.request
import urllib.parse
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR.parent.parent / ".agents"))

try:
    from test_sheets_api import get_access_token
except ImportError:
    def get_access_token():
        return ""

logger = logging.getLogger("SierraAPI")

ID_BOVEDA_BATCH_MAESTRO = os.getenv("SPREADSHEET_ID_BOVEDA_BATCH_MAESTRO", "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw")
ID_BD_CENTRAL_2023 = os.getenv("SPREADSHEET_ID_BD_CENTRAL_2023", "1osolxYzL12I05J2CUy5PBAGpPD2Z3XeU37RzUlFPPO8")
WEBHOOK_CHAT_SIERRA = "https://chat.googleapis.com/v1/spaces/AAQAEoaLlMQ/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=C3nlfauF5BX4ywmc4xnQWDbr8B5qdJINL-SUbhHw3PI"

POCHTECAS_SIERRA_BASE = {
    "fmsanluispaq@gmail.com": "Gregorio Adonai",
    "fmpaqueteriatvsm@gmail.com": "Lyonnet",
    "yesigonzg1827@gmail.com": "Maria Rosi",
    "xichudaniel@gmail.com": "Daniel Juárez",
    "victor18amadorm@gmail.com": "Víctor Amador",
    "diegovv21mar@gmail.com": "Diego Rivera",
    "jesusivargonzalez@gmail.com": "Jesús Ivar",
    "oscher1016@gmail.com": "Oscher"
}


def get_headers_api() -> Dict[str, str]:
    token = get_access_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


def notificar_chat_sierra(texto: str):
    """Envía notificación en tiempo real al canal de supervisión de Sierra Gorda."""
    try:
        data = json.dumps({"text": texto}).encode("utf-8")
        req = urllib.request.Request(WEBHOOK_CHAT_SIERRA, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            pass
    except Exception as ex:
        logger.warning(f"Error despachando webhook de Sierra Gorda: {ex}")


def obtener_datos_sierra(usuario_email: str = "xichudaniel@gmail.com", role: str = "daniel") -> Dict[str, Any]:
    """
    Obtiene métricas, guías y catálogos de Sierra Gorda conectado exclusivamente a BD Central 2023 (hoja Ruta).
    """
    headers = get_headers_api()
    user_clean = usuario_email.strip().lower()
    role_clean = role.strip().lower()

    # 1. Catálogo COURIER en BD Central 2023
    couriers_map = {}
    try:
        url_c = f"https://sheets.googleapis.com/v4/spreadsheets/{ID_BD_CENTRAL_2023}/values/" + urllib.parse.quote("COURIER!A1:E30")
        req_c = urllib.request.Request(url_c, headers=headers)
        with urllib.request.urlopen(req_c) as resp:
            c_raw = json.loads(resp.read().decode("utf-8")).get("values", [])
            for row in c_raw[1:]:
                em = str(row[3] if len(row) > 3 else "").strip().lower()
                nom = str(row[1] if len(row) > 1 else "").strip()
                tel = str(row[4] if len(row) > 4 else "").strip()
                if em:
                    couriers_map[em] = {"nombre": nom or em, "telefono": tel}
    except Exception as ex:
        logger.warning(f"Advertencia al consultar COURIER: {ex}")

    pochtecas_map = dict(POCHTECAS_SIERRA_BASE)
    for em, data in couriers_map.items():
        if em in pochtecas_map and data["nombre"]:
            pochtecas_map[em] = data["nombre"]

    es_super = (role_clean in ["todos", "irvin", "tlayacanqui"] or
                user_clean in ["sidharta.santiago@arauto.express", "irvin.reyes@arauto.express"])

    # 2. MATRIZ_CP (9 columnas) en BOVEDA_BATCH_MAESTRO
    cp_info_map = {}
    municipios_set = {}
    try:
        url_m = f"https://sheets.googleapis.com/v4/spreadsheets/{ID_BOVEDA_BATCH_MAESTRO}/values/" + urllib.parse.quote("MATRIZ_CP!A1:I600")
        req_m = urllib.request.Request(url_m, headers=headers)
        with urllib.request.urlopen(req_m) as resp:
            matriz_raw = json.loads(resp.read().decode("utf-8")).get("values", [])

        for idx, row in enumerate(matriz_raw[1:], start=2):
            cp = str(row[0] if len(row) > 0 else "").strip()
            mun = str(row[1] if len(row) > 1 else "").strip()
            zona = str(row[2] if len(row) > 2 else "").strip()
            titular = str(row[3] if len(row) > 3 else "").strip().lower()
            sup = str(row[5] if len(row) > 5 else "").strip().lower()
            tipo_s = str(row[6] if len(row) > 6 else "").strip()
            override = str(row[7] if len(row) > 7 else "").strip().lower()
            exp_override = str(row[8] if len(row) > 8 else "").strip()

            if cp:
                es_sierra = ("daniel" in sup or mun in [
                    "Xichú", "Victoria", "Atarjea", "Doctor Mora", "Santa Catarina",
                    "San Luis de la Paz", "San Luis de la Paz / Sierra Gto",
                    "Peñamiller", "San Joaquín", "Pinal de Amoles", "Arroyo Seco",
                    "Jalpan de Serra", "Landa de Matamoros"
                ])

                cp_info_map[cp] = {
                    "cp": cp,
                    "municipio": mun,
                    "zona": zona,
                    "titular": titular,
                    "supervisor": sup,
                    "tipo_servicio": tipo_s,
                    "override_activo": override,
                    "fecha_expiracion": exp_override,
                    "es_sierra": es_sierra,
                    "row_index": idx
                }

                if es_sierra:
                    if mun not in municipios_set:
                        municipios_set[mun] = {"nombre": mun, "cps": [], "count_guias": 0}
                    municipios_set[mun]["cps"].append(cp)
    except Exception as ex:
        logger.warning(f"Advertencia al consultar MATRIZ_CP: {ex}")

    # 3. RUTA (BD Central 2023) - Fuente Exclusiva
    url_r = f"https://sheets.googleapis.com/v4/spreadsheets/{ID_BD_CENTRAL_2023}/values/" + urllib.parse.quote("Ruta!A1:U")
    req_r = urllib.request.Request(url_r, headers=headers)
    with urllib.request.urlopen(req_r) as resp:
        ruta_raw = json.loads(resp.read().decode("utf-8")).get("values", [])

    if len(ruta_raw) <= 1:
        return {
            "exito": True,
            "kpis": {"total": 0, "ok": 0, "pendientes": 0, "internacionales": 0},
            "guias": [],
            "pochtecas": [],
            "municipios": [],
            "codigosPostales": []
        }

    headers_r = [str(h).strip().lower().replace("_", " ") for h in ruta_raw[0]]
    col_guia = headers_r.index("guia") if "guia" in headers_r else 0
    col_pid = headers_r.index("pid") if "pid" in headers_r else 1
    col_cp = headers_r.index("c.p.") if "c.p." in headers_r else 2
    col_piezas = headers_r.index("piezas") if "piezas" in headers_r else 3
    col_name = headers_r.index("receiver name") if "receiver name" in headers_r else 7
    col_chk = headers_r.index("checkpoint") if "checkpoint" in headers_r else 9
    col_correo = headers_r.index("id correo") if "id correo" in headers_r else 14
    col_edd = headers_r.index("edd") if "edd" in headers_r else 15
    col_servicio = headers_r.index("tipo de servicio") if "tipo de servicio" in headers_r else 18
    col_inter = headers_r.index("inter") if "inter" in headers_r else 19

    guias_list = []
    kpis = {"total": 0, "ok": 0, "pendientes": 0, "internacionales": 0}

    pochtecas_stats = {em: {"email": em, "nombre": nom, "total": 0, "ok": 0, "pendientes": 0, "incidencias": 0}
                       for em, nom in pochtecas_map.items()}

    for idx, row in enumerate(ruta_raw[1:], start=2):
        chofer = str(row[col_correo] if len(row) > col_correo else "").strip().lower()
        es_del_grupo = chofer in pochtecas_map

        if not es_del_grupo and not es_super:
            continue
        if (role_clean == "daniel" or role_clean == "sierra") and not es_del_grupo:
            continue

        hwb = str(row[col_guia] if len(row) > col_guia else "").strip()
        pid_val = str(row[col_pid] if len(row) > col_pid else "").strip()
        cp = str(row[col_cp] if len(row) > col_cp else "").strip()
        piezas = int(row[col_piezas]) if len(row) > col_piezas and str(row[col_piezas]).isdigit() else 1
        dest = str(row[col_name] if len(row) > col_name else "").strip()
        chk = str(row[col_chk] if len(row) > col_chk else "").strip().upper() or "PRE_ASIGNADO"
        edd = str(row[col_edd] if len(row) > col_edd else "").strip()
        servicio = str(row[col_servicio] if len(row) > col_servicio else "").strip()
        inter = str(row[col_inter] if len(row) > col_inter else "").strip().upper()

        addr_parts = [str(row[i]).strip() for i in [4, 5, 6] if len(row) > i and str(row[i]).strip()]
        addr = ", ".join(addr_parts)

        cp_info = cp_info_map.get(cp, {})
        mun = cp_info.get("municipio", servicio.replace("Sierra Gorda - ", "") if "Sierra Gorda" in servicio else "Sierra Gorda")

        es_inter = (inter in ["INTER", "SI", "1", "TRUE"] or "INTER" in servicio.upper() or "[INTER]" in pid_val.upper())

        if chk in ["OK", "ENTREGADO", "FD"]:
            estatus_norm = "OK"
            kpis["ok"] += 1
        elif chk in ["NH", "BA", "INCIDENCIA", "RECHAZADO"]:
            estatus_norm = "INCIDENCIA"
            kpis["pendientes"] += 1
        else:
            estatus_norm = "PENDIENTE"
            kpis["pendientes"] += 1

        kpis["total"] += 1
        if es_inter:
            kpis["internacionales"] += 1

        nombre_chofer = pochtecas_map.get(chofer, couriers_map.get(chofer, {}).get("nombre", chofer))

        if chofer not in pochtecas_stats:
            pochtecas_stats[chofer] = {"email": chofer, "nombre": nombre_chofer, "total": 0, "ok": 0, "pendientes": 0, "incidencias": 0}

        pochtecas_stats[chofer]["total"] += 1
        if estatus_norm == "OK":
            pochtecas_stats[chofer]["ok"] += 1
        elif estatus_norm == "INCIDENCIA":
            pochtecas_stats[chofer]["incidencias"] += 1
        else:
            pochtecas_stats[chofer]["pendientes"] += 1

        if mun in municipios_set:
            municipios_set[mun]["count_guias"] += 1

        guias_list.append({
            "guia": hwb,
            "pid": pid_val,
            "destinatario": dest,
            "direccion": addr,
            "cp": cp or "S/CP",
            "municipio": mun,
            "chofer": chofer,
            "choferNombre": nombre_chofer,
            "edd": edd,
            "estatus": estatus_norm,
            "esInternacional": es_inter,
            "piezas": piezas,
            "rowNumber": idx
        })

    municipios_lista = sorted([
        {"nombre": k, "countGuias": v["count_guias"], "totalCPs": len(v["cps"]), "cps": v["cps"]}
        for k, v in municipios_set.items()
    ], key=lambda x: x["nombre"])

    pochtecas_lista = sorted(list(pochtecas_stats.values()), key=lambda x: x["nombre"])

    cps_sierra_lista = sorted([
        {
            "cp": c["cp"],
            "municipio": c["municipio"],
            "titular": c["titular"],
            "override": c["override_activo"],
            "expiracion": c["fecha_expiracion"]
        }
        for c in cp_info_map.values() if c["es_sierra"]
    ], key=lambda x: x["cp"])

    return {
        "exito": True,
        "kpis": kpis,
        "guias": guias_list,
        "pochtecas": pochtecas_lista,
        "municipios": municipios_lista,
        "codigosPostales": cps_sierra_lista,
        "usuario": {
            "email": user_clean,
            "esSuper": es_super,
            "grupo": "Todos" if es_super else "Daniel"
        },
        "timestamp": datetime.now().isoformat()
    }


def reasignar_chofer_a_chofer(origen_email: str, destino_email: str, usuario_email: str = "xichudaniel@gmail.com", role: str = "daniel") -> Dict[str, Any]:
    """Transfiere en caliente guías de un chofer a otro en la hoja Ruta de BD Central 2023."""
    headers = get_headers_api()
    orig = origen_email.strip().lower()
    dest = destino_email.strip().lower()
    user_clean = usuario_email.strip().lower()
    role_clean = role.strip().lower()

    if not dest:
        raise ValueError("Debes seleccionar un Pochteca Destino.")
    if orig == dest:
        raise ValueError("El Pochteca Origen y Destino no pueden ser el mismo.")

    es_super = (role_clean in ["todos", "irvin", "tlayacanqui"] or
                user_clean in ["sidharta.santiago@arauto.express", "irvin.reyes@arauto.express"])

    if not es_super and dest not in POCHTECAS_SIERRA_BASE:
        raise PermissionError(f"El destino {dest} no pertenece al Grupo Daniel.")

    # Leer Ruta de BD Central 2023
    url_r = f"https://sheets.googleapis.com/v4/spreadsheets/{ID_BD_CENTRAL_2023}/values/" + urllib.parse.quote("Ruta!A1:U")
    req_r = urllib.request.Request(url_r, headers=headers)
    with urllib.request.urlopen(req_r) as resp:
        ruta_raw = json.loads(resp.read().decode("utf-8")).get("values", [])

    if len(ruta_raw) <= 1:
        return {"exito": True, "totalReasignadas": 0, "mensaje": "Hoja vacía"}

    col_correo = 14
    col_chk = 9

    es_sin_asignar = (orig in ["sin_asignar", "sin_asignar@arauto.express", ""])
    updates = []
    count_reasignadas = 0

    for idx, row in enumerate(ruta_raw[1:], start=2):
        chofer_act = str(row[col_correo] if len(row) > col_correo else "").strip().lower()
        chk_act = str(row[col_chk] if len(row) > col_chk else "").strip().upper()

        if chk_act in ["OK", "ENTREGADO", "FD"]:
            continue

        match = (chofer_act in ["", "sin_asignar", "sin_asignar@arauto.express"]) if es_sin_asignar else (chofer_act == orig)
        if match:
            updates.append({
                "range": f"Ruta!O{idx}",
                "values": [[dest]]
            })
            count_reasignadas += 1

    if updates:
        batch_body = {
            "valueInputOption": "USER_ENTERED",
            "data": updates
        }
        url_batch = f"https://sheets.googleapis.com/v4/spreadsheets/{ID_BD_CENTRAL_2023}/values:batchUpdate"
        data_bytes = json.dumps(batch_body).encode("utf-8")
        req_up = urllib.request.Request(url_batch, data=data_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req_up) as resp:
            pass

        alert_text = (
            f"🔄 *[REASIGNACIÓN EN LOTE - SIERRA GORDA]*\n"
            f"👤 Supervisor: {user_clean}\n"
            f"📦 Guías transferidas en BD Central: *{count_reasignadas}*\n"
            f"📤 Origen: {'Sin Asignar' if es_sin_asignar else orig}\n"
            f"📥 Destino: *{dest}*\n"
            f"⏰ {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
        )
        notificar_chat_sierra(alert_text)

    return {
        "exito": True,
        "totalReasignadas": count_reasignadas,
        "mensaje": f"Se transfirieron exitosamente {count_reasignadas} guías a {dest} en BD Central."
    }


def reasignar_por_ubicacion(tipo: str, valor: str, destino_email: str, fecha_expiracion: str = "", usuario_email: str = "xichudaniel@gmail.com", role: str = "daniel") -> Dict[str, Any]:
    """Reasigna en BD Central por Código Postal o Municipio."""
    headers = get_headers_api()
    dest = destino_email.strip().lower()
    t = tipo.strip().lower()
    val = valor.strip()
    user_clean = usuario_email.strip().lower()

    if not dest:
        raise ValueError("Debes seleccionar un Pochteca Destino.")
    if not val:
        raise ValueError("Debes indicar un Municipio o Código Postal válido.")

    # 1. Leer CPs afectados si es municipio
    cps_afectados = set()
    if t == "cp":
        cps_afectados.add(val)
    else:
        url_m = f"https://sheets.googleapis.com/v4/spreadsheets/{ID_BOVEDA_BATCH_MAESTRO}/values/" + urllib.parse.quote("MATRIZ_CP!A2:B600")
        req_m = urllib.request.Request(url_m, headers=headers)
        with urllib.request.urlopen(req_m) as resp:
            m_raw = json.loads(resp.read().decode("utf-8")).get("values", [])
            for row in m_raw:
                cp_m = str(row[0] if len(row) > 0 else "").strip()
                mun_m = str(row[1] if len(row) > 1 else "").strip()
                if mun_m.lower() == val.lower():
                    cps_afectados.add(cp_m)

    # 2. Actualizar Ruta en BD Central 2023
    url_r = f"https://sheets.googleapis.com/v4/spreadsheets/{ID_BD_CENTRAL_2023}/values/" + urllib.parse.quote("Ruta!A1:U")
    req_r = urllib.request.Request(url_r, headers=headers)
    with urllib.request.urlopen(req_r) as resp:
        ruta_raw = json.loads(resp.read().decode("utf-8")).get("values", [])

    updates = []
    count_reasignadas = 0

    col_cp = 2
    col_correo = 14
    col_chk = 9
    col_servicio = 18

    for idx, row in enumerate(ruta_raw[1:], start=2):
        cp_act = str(row[col_cp] if len(row) > col_cp else "").strip()
        chk_act = str(row[col_chk] if len(row) > col_chk else "").strip().upper()
        serv_act = str(row[col_servicio] if len(row) > col_servicio else "").strip().lower()

        if chk_act in ["OK", "ENTREGADO", "FD"]:
            continue

        match = (cp_act in cps_afectados) or (t == "municipio" and val.lower() in serv_act)
        if match:
            updates.append({
                "range": f"Ruta!O{idx}",
                "values": [[dest]]
            })
            count_reasignadas += 1

    if updates:
        batch_body = {
            "valueInputOption": "USER_ENTERED",
            "data": updates
        }
        url_batch = f"https://sheets.googleapis.com/v4/spreadsheets/{ID_BD_CENTRAL_2023}/values:batchUpdate"
        data_bytes = json.dumps(batch_body).encode("utf-8")
        req_up = urllib.request.Request(url_batch, data=data_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req_up) as resp:
            pass

        alert_text = (
            f"🗺️ *[REASIGNACIÓN POR UBICACIÓN - SIERRA GORDA]*\n"
            f"👤 Supervisor: {user_clean}\n"
            f"📍 {tipo.upper()}: *{val}*\n"
            f"📦 Guías reasignadas en BD Central: *{count_reasignadas}*\n"
            f"📥 Pochteca Asignado: *{dest}*\n"
            f"⏰ {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}"
        )
        notificar_chat_sierra(alert_text)

    return {
        "exito": True,
        "totalGuiasReasignadas": count_reasignadas,
        "totalCPsActualizados": len(cps_afectados),
        "mensaje": f"Se reasignaron {count_reasignadas} guías a {dest} en BD Central."
    }
