# -*- coding: utf-8 -*-
"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS QUERÉTARO (UNIVERSO 2 CORPORATIVO)
MÓDULO: MOTOR DE RESCATE HISTÓRICO Y ENRIQUECIMIENTO AMOXCALLI
ARCHIVO: Fuentes_OLLIN/servidor_secundario/amoxcalli_geo_rescate.py
VERSIÓN: 1.0.0 PROD
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago (Tlayacanqui)
================================================================================
Propósito:
1. Rescata y cruza datos históricos de Amoxcalli (coordenadas GPS, fotos de fachada, teléfonos).
2. Clasifica y prioriza la carga con las reglas de negocio autorizadas:
   - ⚡🌎 INTERNACIONAL (WPX, Express Worldwide, Origen Extranjero) -> Prioridad 1 (Máxima)
   - 🏢 CORPORATIVO (Parques Industriales, Oficinas, Corte 14:00 / 18:00) -> Prioridad 2
   - 💳 BANCARIO (Tarjetas, Plásticos, Sobres sin teléfono) -> Prioridad 3
   - 🌿 NATURA (Cosméticos, Pedidos múltiples) -> Prioridad 4
   - 📦 RESIDENCIAL / ESTÁNDAR -> Prioridad 5
3. Enriquece el manifiesto activo (manifiesto_activo.json) para uso 0ms y 100% offline en PWA Ollinqui.
================================================================================
"""

import os
import sys
import json
import re
import unicodedata
import urllib.request
import urllib.parse
from datetime import datetime

# Configuración de salida UTF-8 para Windows consola
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Rutas del entorno
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
AGENTS_DIR = os.path.join(PROJECT_ROOT, ".agents")
CACHE_DIR = os.path.join(CURRENT_DIR, "data")
MANIFEST_PATH = os.path.join(PROJECT_ROOT, "Entrega_Masiva_PWA", "manifiesto_activo.json")
HISTORICO_CACHE_FILE = os.path.join(CACHE_DIR, "amoxcalli_historico_cache.json")

if AGENTS_DIR not in sys.path:
    sys.path.append(AGENTS_DIR)

# IDs de Google Sheets canónicos
ID_BD_APP_RUTA_2025 = "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w"
ID_BOVEDA_BATCH_MAESTRO = "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw"
ID_VALIDACION_QRO_2025 = "1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M"

# Coordenadas centroidales por Código Postal de la región (Querétaro / Guanajuato / Sierra Gorda)
CP_CENTROIDS = {
    # Querétaro Centro y Zona Metropolitana
    "76000": (20.5931, -100.3928),
    "76010": (20.5855, -100.3889),
    "76020": (20.5980, -100.4100),
    "76030": (20.6120, -100.4050),
    "76040": (20.5750, -100.3850),
    "76050": (20.5690, -100.4020),
    "76060": (20.5890, -100.4250),
    "76070": (20.6050, -100.4350),
    "76080": (20.6250, -100.4200),
    "76090": (20.6400, -100.4100),
    "76100": (20.6200, -100.4400),
    "76110": (20.6350, -100.4500),
    "76116": (20.6500, -100.4600),
    "76120": (20.6150, -100.4700),
    "76130": (20.6300, -100.4850),
    "76140": (20.6650, -100.4450),
    "76150": (20.6800, -100.4300),
    "76160": (20.6550, -100.4150),
    "76170": (20.6100, -100.3700),
    "76180": (20.6300, -100.3600),
    # Santa Rosa Jáuregui y Microzonas Norte QRO
    "76210": (20.7410, -100.4460),
    "76211": (20.7450, -100.4400),
    "76212": (20.7500, -100.4500),
    "76213": (20.7550, -100.4600),
    "76215": (20.7600, -100.4300),
    "76216": (20.7650, -100.4350),
    "76218": (20.7700, -100.4200),
    "76219": (20.7750, -100.4150), # La Monja / Montenegro
    "76220": (20.7100, -100.4200), # Buenavista / San José el Alto
    "76221": (20.7150, -100.4150),
    "76223": (20.7200, -100.4050), # Corea / Jofrito
    "76224": (20.7250, -100.4000),
    "76225": (20.7300, -100.3950),
    "76226": (20.7350, -100.3900),
    "76227": (20.7400, -100.3850),
    "76228": (20.7450, -100.3800),
    "76229": (20.7500, -100.3750),
    "76230": (20.6900, -100.4350), # Juriquilla
    "76233": (20.6950, -100.4400),
    # El Marqués / Parques Industriales
    "76240": (20.5620, -100.2850),
    "76246": (20.5820, -100.2700),
    "76249": (20.5510, -100.2990),
    "76260": (20.5950, -100.2500), # El Lobo / El Marqués
    "76261": (20.6100, -100.2400),
    "76262": (20.6200, -100.2300),
    "76263": (20.6300, -100.2200), # Santa María Begoña
    "76264": (20.6400, -100.2100),
    "76265": (20.6500, -100.2000), # Chichimequillas
    "76268": (20.6600, -100.1900),
    # Colón / Tolimán / Peñamiller
    "76250": (20.7850, -100.0480), # Colón
    "76251": (20.7900, -100.0400),
    "76253": (20.8000, -100.0300),
    "76254": (20.8100, -100.0200),
    "76255": (20.8200, -100.0100), # Atongo
    "76256": (20.8300, -100.0000),
    "76257": (20.8400, -99.9900),
    "76258": (20.8500, -99.9800),
    "76259": (20.8600, -99.9700),
    # Cadereyta y Ezequiel Montes
    "76550": (20.6970, -99.8160),
    "76555": (20.7100, -99.8000),
    "76575": (20.6650, -99.8970),
    # Corregidora
    "76900": (20.5400, -100.4400),
    "76905": (20.5350, -100.4550),
    "76910": (20.5200, -100.4650),
    # San Juan del Río
    "76800": (20.3889, -99.9961),
    "76802": (20.3950, -99.9800),
    "76803": (20.3750, -100.0100),
    # Guanajuato / Sierra Gorda - San Luis de la Paz
    "37900": (21.2986, -100.5164),
    "37901": (21.3020, -100.5100),
    "37903": (21.2850, -100.5250),
    "37904": (21.3150, -100.5050),
    "37905": (21.2750, -100.5300),
    "37906": (21.3200, -100.4900),
    "37910": (21.3100, -100.5400),
    "37913": (21.2900, -100.5000),
    "37914": (21.2700, -100.4900),
    "37915": (21.2600, -100.4800),
    "37916": (21.2700, -100.4700),
    "37917": (21.2800, -100.4500),
    # Victoria, Xichú, Atarjea
    "37920": (21.2167, -100.1167),
    "37926": (21.2200, -100.1200),
    "37927": (21.2250, -100.1100),
    "37928": (21.2300, -100.1000),
    "37930": (21.3333, -100.1667),
    "37934": (21.3400, -100.1700),
    "37935": (21.3450, -100.1600),
    "37940": (21.4333, -100.0833),
    "37945": (21.4400, -100.0900),
    "37946": (21.4450, -100.0800),
    "37947": (21.4500, -100.0750),
    # Doctor Mora
    "37950": (21.1410, -100.3200),
    "37955": (21.1450, -100.3250),
    "37956": (21.1500, -100.3150),
    "37957": (21.1550, -100.3100),
    # Tierra Blanca
    "37960": (21.2000, -100.2500),
    "37964": (21.2050, -100.2550),
    "37965": (21.2100, -100.2450),
    "37966": (21.2150, -100.2400),
    "37967": (21.2200, -100.2350),
    "37970": (21.1000, -100.1500),
    "37973": (21.1050, -100.1550),
    "37975": (21.1100, -100.1450),
    "37977": (21.1150, -100.1400),
    # San José Iturbide
    "37980": (21.0000, -100.3833),
    "37981": (21.0050, -100.3800),
    "37983": (21.0100, -100.3900),
    "37986": (21.0200, -100.3750),
    "37987": (21.0250, -100.3700),
    "37988": (21.0300, -100.3650),
    "37990": (20.9500, -100.4000),
    "37991": (20.9550, -100.4050),
    "37993": (20.9600, -100.3950),
    "37995": (20.9650, -100.3900),
    "37996": (20.9700, -100.3850),
    "37997": (20.9750, -100.3800),
    "37998": (20.9800, -100.3750),
    # Sierra Gorda Querétaro
    "76340": (21.2167, -99.4667),  # Jalpan de Serra
    "76360": (21.1333, -99.6167),  # Pinal de Amoles
    "76380": (21.0500, -99.8167),  # Peñamiller
    "76400": (21.4833, -99.6833),  # Arroyo Seco
    "76420": (20.9833, -99.7167)   # Cadereyta
}

# Prefijos de 4 y 3 dígitos para asignación de zona precisa
CP_PREFIX_CLUSTERS = {
    "7621": (20.75, -100.45), # Santa Rosa Jáuregui
    "7622": (20.71, -100.41), # Buenavista / Jofrito
    "7623": (20.69, -100.44), # Juriquilla
    "7624": (20.57, -100.28), # El Marqués Parque Ind
    "7625": (20.81, -100.03), # Colón
    "7626": (20.62, -100.22), # El Marqués Rural
    "7655": (20.70, -99.81),  # Cadereyta
    "7657": (20.66, -99.90),  # Ezequiel Montes
    "3790": (21.30, -100.52), # San Luis de la Paz
    "3791": (21.28, -100.48), # San Luis rural
    "3792": (21.22, -100.12), # Victoria
    "3793": (21.33, -100.17), # Xichú
    "3794": (21.43, -100.08), # Atarjea
    "3795": (21.14, -100.32), # Doctor Mora
    "3796": (21.20, -100.25), # Tierra Blanca Nte
    "3797": (21.10, -100.15), # Tierra Blanca Sur
    "3798": (21.00, -100.38), # San José Iturbide
    "3799": (20.96, -100.39), # San José Iturbide Sur
    "762": (20.65, -100.35),  # Querétaro Periurbano
    "760": (20.59, -100.39),  # Querétaro Centro
    "761": (20.63, -100.43),  # Querétaro Poniente
    "768": (20.39, -99.99),   # San Juan del Río
    "769": (20.53, -100.45),  # Corregidora
    "379": (21.20, -100.40)   # Sierra Gorda GTO
}

# Coordenada por defecto (Hub Querétaro / Andén Rampa)
HUB_QRO_COORDS = (20.5931, -100.3928)

def normalizar_texto(txt):
    if not txt:
        return ""
    txt = unicodedata.normalize('NFKD', str(txt)).encode('ASCII', 'ignore').decode('utf-8')
    txt = re.sub(r'[^a-zA-Z0-9\s]', ' ', txt).upper()
    return " ".join(txt.split())

def obtener_token():
    try:
        from oauth_auth import refresh_access_token
        return refresh_access_token()
    except Exception as e:
        print(f"⚠️ No se pudo obtener token OAuth de Google: {e}")
        return None

def fetch_sheet_rows(token, spreadsheet_id, range_name):
    encoded_range = urllib.parse.quote(range_name)
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{encoded_range}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("values", [])
    except Exception as e:
        print(f"⚠️ Error leyendo rango {range_name} en {spreadsheet_id}: {e}")
        return []

def construir_o_cargar_cache_historica(forzar=False):
    os.makedirs(CACHE_DIR, exist_ok=True)
    if not forzar and os.path.exists(HISTORICO_CACHE_FILE):
        try:
            with open(HISTORICO_CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
                if cache.get("timestamp") and len(cache.get("hwbs", {})) > 0:
                    print(f"📦 Usando caché histórica local de Amoxcalli ({len(cache.get('hwbs', {}))} guías indexadas)")
                    return cache
        except Exception as e:
            print(f"⚠️ Error leyendo caché local: {e}")

    token = obtener_token()
    cache = {
        "timestamp": datetime.now().isoformat(),
        "hwbs": {},
        "raw_shipments": {},
        "por_destinatario_cp": {},
        "por_calle_cp": {}
    }

    if not token:
        print("⚠️ Operando en modo sin conexión a Google Sheets. Se utilizará caché existente o geocodificación C.P.")
        return cache

    print("🔍 Descargando memoria histórica de Amoxcalli desde Google Sheets...")

    # 1. RAW_SHIPMENT en Bóveda Batch Maestro (Prod, Orig Ctry, Shipper Name)
    try:
        raw_rows = fetch_sheet_rows(token, ID_BOVEDA_BATCH_MAESTRO, "RAW_SHIPMENT!A1:Z1000")
        if len(raw_rows) > 1:
            headers = [h.strip() for h in raw_rows[0]]
            hwb_idx = headers.index("HWB No") if "HWB No" in headers else 0
            orig_idx = headers.index("Orig Ctry") if "Orig Ctry" in headers else 1
            prod_idx = headers.index("Prod") if "Prod" in headers else 7
            shipper_idx = headers.index("Shipper Name") if "Shipper Name" in headers else 16
            desc_idx = headers.index("Description") if "Description" in headers else 11

            for r in raw_rows[1:]:
                if len(r) > hwb_idx and r[hwb_idx]:
                    hwb_val = str(r[hwb_idx]).strip()
                    cache["raw_shipments"][hwb_val] = {
                        "orig_ctry": r[orig_idx].strip() if len(r) > orig_idx else "MX",
                        "prod": r[prod_idx].strip() if len(r) > prod_idx else "",
                        "shipper_name": r[shipper_idx].strip() if len(r) > shipper_idx else "",
                        "description": r[desc_idx].strip() if len(r) > desc_idx else ""
                    }
        print(f"  + Indexados {len(cache['raw_shipments'])} registros de RAW_SHIPMENT")
    except Exception as e:
        print(f"  ⚠️ Error procesando RAW_SHIPMENT: {e}")

    # 2. GUIAS_ASIGNADAS en BD_APP_RUTA_2025 (Check_In_GPS, Foto_Fachada_Paquete, Tel_Query)
    try:
        guias_rows = fetch_sheet_rows(token, ID_BD_APP_RUTA_2025, "GUIAS_ASIGNADAS!A1:N3000")
        if len(guias_rows) > 1:
            headers = [h.strip() for h in guias_rows[0]]
            hwb_idx = headers.index("HWB_Guia") if "HWB_Guia" in headers else 0
            dest_idx = headers.index("Destinatario") if "Destinatario" in headers else 1
            dir_idx = headers.index("Direccion_Entrega") if "Direccion_Entrega" in headers else 2
            tel_idx = headers.index("Tel_Query") if "Tel_Query" in headers else 6
            gps_idx = headers.index("Check_In_GPS") if "Check_In_GPS" in headers else 8
            foto_idx = headers.index("Foto_Fachada_Paquete") if "Foto_Fachada_Paquete" in headers else 12

            count_gps = 0
            for r in guias_rows[1:]:
                if len(r) > hwb_idx and r[hwb_idx]:
                    hwb_val = str(r[hwb_idx]).strip()
                    gps_val = str(r[gps_idx]).strip() if len(r) > gps_idx else ""
                    foto_val = str(r[foto_idx]).strip() if len(r) > foto_idx else ""
                    tel_val = str(r[tel_idx]).strip() if len(r) > tel_idx else ""
                    dest_val = str(r[dest_idx]).strip() if len(r) > dest_idx else ""
                    dir_val = str(r[dir_idx]).strip() if len(r) > dir_idx else ""

                    # Extraer CP
                    cp_match = re.search(r'\b(76\d{3}|37\d{3})\b', dir_val)
                    cp_val = cp_match.group(1) if cp_match else ""

                    # Parsear coordenadas si existen
                    coords = None
                    if gps_val and "," in gps_val:
                        parts = gps_val.split(",")
                        try:
                            lat = float(parts[0].strip())
                            lng = float(parts[1].strip())
                            if 19.0 <= lat <= 23.0 and -102.0 <= lng <= -98.0:
                                coords = (lat, lng)
                                count_gps += 1
                        except ValueError:
                            pass

                    item = {
                        "hwb": hwb_val,
                        "destinatario": dest_val,
                        "direccion": dir_val,
                        "cp": cp_val,
                        "tel": tel_val,
                        "coords": coords,
                        "foto": foto_val
                    }

                    cache["hwbs"][hwb_val] = item

                    # Indexar por (destinatario_norm, cp)
                    dest_norm = normalizar_texto(dest_val)
                    if dest_norm and cp_val and coords:
                        key_dest = f"{dest_norm}_{cp_val}"
                        cache["por_destinatario_cp"][key_dest] = {
                            "coords": coords,
                            "foto": foto_val,
                            "tel": tel_val,
                            "destinatario": dest_val
                        }
            print(f"  + Indexadas {len(cache['hwbs'])} guías en GUIAS_ASIGNADAS ({count_gps} con coordenadas GPS válidas)")
    except Exception as e:
        print(f"  ⚠️ Error procesando GUIAS_ASIGNADAS: {e}")

    # Guardar en archivo
    try:
        with open(HISTORICO_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
        print(f"✅ Caché histórica de Amoxcalli guardada en {HISTORICO_CACHE_FILE}")
    except Exception as e:
        print(f"⚠️ Error guardando caché: {e}")

    return cache

def clasificar_prioridad(item, raw_info=None):
    """
    Jerarquía de Prioridades Arauto Express (Actualizada v3.5):
    1. INTERNACIONAL (WPX, Express Worldwide, Origen Extranjero) -> MÁXIMA PRIORIDAD
    2. CORPORATIVO (Oficinas, Parques Industriales, Horario de Corte 14:00)
    3. NATURA (Cosméticos, Pedidos Múltiples de Consultoras)
    4. RESIDENCIAL (Entrega Domiciliaria Estándar)
    5. BANCARIO / CRÍTICO (Tarjetas, Plásticos, Sobres -> ÚLTIMA PRIORIDAD, 50% éxito, sin sobrepago)
    """
    dest_norm = normalizar_texto(item.get("destinatario", ""))
    dir_norm = normalizar_texto(item.get("direccion", ""))
    desc_norm = normalizar_texto(item.get("descripcion", ""))
    tel = str(item.get("tel", "")).strip()

    # --- 1. EVALUAR INTERNACIONAL ---
    if raw_info:
        orig = raw_info.get("orig_ctry", "MX").upper()
        prod = raw_info.get("prod", "").upper()
        if orig != "MX" or prod in ("P", "D", "WPX", "DOX", "ECX", "T"):
            return {
                "tipo": "INTERNACIONAL",
                "prioridad_num": 1,
                "badge": "⚡ INTERNACIONAL (PRIORIDAD MÁXIMA)",
                "color": "#3B82F6",
                "icono": "🌎",
                "horario_corte": "18:00",
                "motivo": f"Servicio DHL Express Internacional ({prod or 'WPX'} de {orig})"
            }

    if any(k in desc_norm for k in ("WPX", "WORLDWIDE", "INTERNACIONAL", "INTERNATIONAL", "IMPORTACION")):
        return {
            "tipo": "INTERNACIONAL",
            "prioridad_num": 1,
            "badge": "⚡ INTERNACIONAL (PRIORIDAD MÁXIMA)",
            "color": "#3B82F6",
            "icono": "🌎",
            "horario_corte": "18:00",
            "motivo": "Contenido o descripción con servicio Internacional"
        }

    # --- 2. EVALUAR CORPORATIVO / OFICINA ---
    palabras_corporativas = [
        "PARQUE INDUSTRIAL", "PARQ IND", "S A DE C V", "SA DE CV", "S DE R L", "S DE RL",
        "EDIFICIO", "PISO", "OFICINA", "SUCURSAL", "DESPACHO", "CORPORATIVO", "CEDIS",
        "PLANTA", "BODEGA", "LOCAL COMERCIAL", "CONSULTORIO", "HOSPITAL", "CLINICA",
        "ESCUELA", "UNIVERSIDAD", "HOTEL", "AGENCIA", "CONCESIONARIA", "TALLER"
    ]
    if any(k in dir_norm or k in dest_norm for k in palabras_corporativas):
        return {
            "tipo": "CORPORATIVO",
            "prioridad_num": 2,
            "badge": "🏢 HORARIO CORTE OFICINA (2:00 PM)",
            "color": "#F59E0B",
            "icono": "🏢",
            "horario_corte": "14:00",
            "motivo": "Dirección en Parque Industrial, Empresa o Local con horario hábil"
        }

    # --- 3. EVALUAR NATURA ---
    palabras_natura = ["NATURA", "COSMETICO", "REVISTA", "CONSULTORA", "PEDIDO NATURA"]
    es_natura_txt = any(k in desc_norm or k in dest_norm for k in palabras_natura)
    if raw_info:
        shipper = normalizar_texto(raw_info.get("shipper_name", ""))
        if "NATURA" in shipper:
            es_natura_txt = True

    if es_natura_txt:
        return {
            "tipo": "NATURA",
            "prioridad_num": 3,
            "badge": "🌿 CLIENTE NATURA (COSMÉTICOS)",
            "color": "#10B981",
            "icono": "🌿",
            "horario_corte": "18:00",
            "motivo": "Paquetería de cliente estratégico Natura (cajas/pedidos múltiples)"
        }

    # --- 4. EVALUAR BANCARIO / CRÍTICO (ÚLTIMA PRIORIDAD) ---
    palabras_bancarias = [
        "BANCO", "CITIBANAMEX", "BANAMEX", "BBVA", "SANTANDER", "BANORTE", "AMEX",
        "AMERICAN EXPRESS", "HSBC", "SCOTIABANK", "INBURSA", "PLASTICO", "TARJETA",
        "SOBRE", "TDC", "CREDITO", "DEBITO", "FINANCIERA"
    ]
    es_bancario_txt = any(k in desc_norm or k in dest_norm for k in palabras_bancarias)
    if raw_info:
        shipper = normalizar_texto(raw_info.get("shipper_name", ""))
        if any(k in shipper for k in palabras_bancarias):
            es_bancario_txt = True

    # Teléfono inválido o ausente también cataloga como colocación bancaria de baja probabilidad
    tel_invalido = (not tel or len(tel) < 10 or tel in ("5555555555", "0000000000", "1234567890", "N/A", "."))

    if es_bancario_txt or (tel_invalido and "N/A" in dest_norm):
        return {
            "tipo": "BANCARIO",
            "prioridad_num": 5,
            "badge": "💳 BANCARIO (ÚLTIMA PRIORIDAD)",
            "color": "#EF4444",
            "icono": "💳",
            "horario_corte": "18:00",
            "motivo": "Colocación de tarjeta bancaria / baja tasa de localización (50%)"
        }

    # --- 5. RESIDENCIAL / ESTÁNDAR ---
    return {
        "tipo": "RESIDENCIAL",
        "prioridad_num": 4,
        "badge": "📦 ENTREGA RESIDENCIAL",
        "color": "#6B7280",
        "icono": "🏠",
        "horario_corte": "18:00",
        "motivo": "Entrega domiciliaria ordinaria"
    }

def resolver_geolocalizacion(item, cache_historica):
    """
    Resuelve coordenadas GPS con jerarquía de precisión:
    1. Amoxcalli Histórico (Cruce por HWB previa o Nombre + C.P.)
    2. Centroid de C.P. regional conocido
    3. Hub Central Querétaro (Fallback seguro)
    """
    hwb = str(item.get("hwb", "")).strip()
    dest_norm = normalizar_texto(item.get("destinatario", ""))
    dir_val = item.get("direccion", "")
    
    # Extraer C.P.
    cp_match = re.search(r'\b(76\d{3}|37\d{3})\b', dir_val)
    cp_val = cp_match.group(1) if cp_match else ""

    # Intento 1: HWB previa en Amoxcalli
    if hwb in cache_historica.get("hwbs", {}):
        prev = cache_historica["hwbs"][hwb]
        if prev.get("coords"):
            return {
                "lat": prev["coords"][0],
                "lng": prev["coords"][1],
                "fuente": "AMOXCALLI_HISTORICO",
                "confianza": "ALTA_EXACTA",
                "foto_fachada": prev.get("foto", ""),
                "tel_recuperado": prev.get("tel", "")
            }

    # Intento 2: Nombre + C.P.
    if dest_norm and cp_val:
        key_dest = f"{dest_norm}_{cp_val}"
        if key_dest in cache_historica.get("por_destinatario_cp", {}):
            prev = cache_historica["por_destinatario_cp"][key_dest]
            return {
                "lat": prev["coords"][0],
                "lng": prev["coords"][1],
                "fuente": "AMOXCALLI_HISTORICO",
                "confianza": "ALTA_DESTINATARIO",
                "foto_fachada": prev.get("foto", ""),
                "tel_recuperado": prev.get("tel", "")
            }

    # Intento 3: Centroid por C.P.
    if cp_val in CP_CENTROIDS:
        lat, lng = CP_CENTROIDS[cp_val]
        hash_offset = (abs(hash(dir_val)) % 100) * 0.0001
        return {
            "lat": round(lat + hash_offset, 6),
            "lng": round(lng + hash_offset, 6),
            "fuente": "CP_CENTROID",
            "confianza": "MEDIA_ZONA",
            "foto_fachada": "",
            "tel_recuperado": ""
        }

    # Intento 3b: Prefijo de cluster por C.P. (4 o 3 dígitos)
    prefix_4 = cp_val[:4] if len(cp_val) >= 4 else ""
    prefix_3 = cp_val[:3] if len(cp_val) >= 3 else ""
    if prefix_4 in CP_PREFIX_CLUSTERS:
        lat, lng = CP_PREFIX_CLUSTERS[prefix_4]
        hash_offset = (abs(hash(dir_val)) % 100) * 0.0001
        return {
            "lat": round(lat + hash_offset, 6),
            "lng": round(lng + hash_offset, 6),
            "fuente": "CP_CLUSTER_REGIONAL",
            "confianza": "MEDIA_CLUSTER",
            "foto_fachada": "",
            "tel_recuperado": ""
        }
    if prefix_3 in CP_PREFIX_CLUSTERS:
        lat, lng = CP_PREFIX_CLUSTERS[prefix_3]
        hash_offset = (abs(hash(dir_val)) % 100) * 0.0001
        return {
            "lat": round(lat + hash_offset, 6),
            "lng": round(lng + hash_offset, 6),
            "fuente": "CP_CLUSTER_REGIONAL",
            "confianza": "MEDIA_CLUSTER",
            "foto_fachada": "",
            "tel_recuperado": ""
        }

    # Intento 4: Fallback Hub QRO
    return {
        "lat": HUB_QRO_COORDS[0],
        "lng": HUB_QRO_COORDS[1],
        "fuente": "HUB_DEFAULT",
        "confianza": "BAJA_DEFAULT",
        "foto_fachada": "",
        "tel_recuperado": ""
    }

def ejecutar_enriquecimiento_manifiesto():
    print("=" * 70)
    print("🚀 INICIANDO MOTOR DE RESCATE HISTÓRICO Y ENRIQUECIMIENTO AMOXCALLI")
    print("=" * 70)

    if not os.path.exists(MANIFEST_PATH):
        print(f"❌ Error: Manifiesto no encontrado en {MANIFEST_PATH}")
        return False

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    cache = construir_o_cargar_cache_historica(forzar=False)

    stats = {
        "total_procesados": 0,
        "internacionales": 0,
        "corporativos": 0,
        "bancarios": 0,
        "natura": 0,
        "residenciales": 0,
        "geo_amoxcalli": 0,
        "geo_cp": 0,
        "geo_fallback": 0,
        "fotos_rescatadas": 0
    }

    # Procesar listas de choferes
    choferes = manifest.get("choferes", {})
    pids_lookup = manifest.get("pids_lookup", {})

    for chofer_email, pids_list in choferes.items():
        for item in pids_list:
            stats["total_procesados"] += 1
            hwb = str(item.get("hwb", "")).strip()
            raw_info = cache.get("raw_shipments", {}).get(hwb)

            # 1. Clasificar Prioridad
            prio = clasificar_prioridad(item, raw_info)
            item["tipo_prioridad"] = prio["tipo"]
            item["prioridad_num"] = prio["prioridad_num"]
            item["prioridad_badge"] = prio["badge"]
            item["prioridad_color"] = prio["color"]
            item["prioridad_icono"] = prio["icono"]
            item["horario_corte"] = prio["horario_corte"]
            item["motivo_prioridad"] = prio["motivo"]

            if prio["tipo"] == "INTERNACIONAL":
                stats["internacionales"] += 1
            elif prio["tipo"] == "CORPORATIVO":
                stats["corporativos"] += 1
            elif prio["tipo"] == "BANCARIO":
                stats["bancarios"] += 1
            elif prio["tipo"] == "NATURA":
                stats["natura"] += 1
            else:
                stats["residenciales"] += 1

            # 2. Resolver Geolocalización
            geo = resolver_geolocalizacion(item, cache)
            item["lat"] = geo["lat"]
            item["lng"] = geo["lng"]
            item["geo_fuente"] = geo["fuente"]
            item["geo_confianza"] = geo["confianza"]
            item["foto_fachada_amoxcalli"] = geo.get("foto_fachada", "")

            if geo.get("foto_fachada"):
                stats["fotos_rescatadas"] += 1

            if geo.get("tel_recuperado") and (not item.get("tel") or item.get("tel") in ("5555555555", "0000000000")):
                item["tel"] = geo["tel_recuperado"]
                item["tel_origen"] = "AMOXCALLI_RECUPERADO"

            if geo["fuente"] == "AMOXCALLI_HISTORICO":
                stats["geo_amoxcalli"] += 1
            elif geo["fuente"] == "CP_CENTROID":
                stats["geo_cp"] += 1
            else:
                stats["geo_fallback"] += 1

            # Sincronizar hacia pids_lookup
            pid_clean = item.get("pid")
            pid_raw = item.get("pid_raw")
            if pid_clean and pid_clean in pids_lookup:
                pids_lookup[pid_clean].update(item)
            if pid_raw and pid_raw in pids_lookup:
                pids_lookup[pid_raw].update(item)

    manifest["enriquecimiento_amoxcalli"] = {
        "timestamp": datetime.now().isoformat(),
        "stats": stats
    }
    manifest["version"] = "3.5_IA_RUTAS"

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 70)
    print("📊 RESULTADOS DEL ENRIQUECIMIENTO AMOXCALLI (Jerarquía v3.5):")
    print(f"  • Total bultos procesados:     {stats['total_procesados']}")
    print(f"  • ⚡🌎 INTERNACIONAL (Prio 1):  {stats['internacionales']}")
    print(f"  • 🏢 CORPORATIVO (Prio 2):     {stats['corporativos']}")
    print(f"  • 🌿 NATURA (Prio 3):          {stats['natura']}")
    print(f"  • 📦 RESIDENCIAL (Prio 4):     {stats['residenciales']}")
    print(f"  • 💳 BANCARIO (Prio 5):        {stats['bancarios']}")
    print("----------------------------------------------------------------------")
    print(f"  • 📍 Coordenadas Amoxcalli:    {stats['geo_amoxcalli']}")
    print(f"  • 🗺️ Coordenadas C.P.:         {stats['geo_cp']}")
    print(f"  • 🌐 Coordenadas Fallback:     {stats['geo_fallback']}")
    print(f"  • 📸 Fotos fachada rescatadas: {stats['fotos_rescatadas']}")
    print("=" * 70)
    print(f"✅ Manifiesto enriquecido guardado exitosamente en:\n   {MANIFEST_PATH}")
    return True

if __name__ == "__main__":
    ejecutar_enriquecimiento_manifiesto()
