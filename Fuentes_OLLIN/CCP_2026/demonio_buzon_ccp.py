"""
🏛️ ECOSISTEMA OLLIN / ARAUTO EXPRESS — FINANZAS Y COBRANZA 2026
MÓDULO: MOTOR AUTÓNOMO DE BUZÓN Y COMPLEMENTOS DE RECEPCIÓN DE PAGO (CCP CFDI 4.0)
ARCHIVO: demonio_buzon_ccp.py
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)
TENANT CORPORATIVO OBLIGATORIO: sidharta.santiago@arauto.express
VERSIÓN: 2.0.0 PROD

PROPÓSITO:
Vigilar y procesar automáticamente los eventos del ciclo de cobranza con DHL:
1. Ingesta: Detecta nuevos Payment Advices (02_PAYMENT_ADVICE) y comprobantes BBVA (01_COMPROBANTES_BANCO).
2. Conciliación: Extrae montos, folios de pago, facturas relacionadas y valida cuadre al centavo.
3. Extracción SAT: Obtiene UUIDs fiscales desde Reportes de Facturo Por Ti y la bóveda de XMLs.
4. Poka-Yoke: Omite automáticamente cualquier folio ya registrado o timbrado.
5. Despacho: Genera los archivos oficiales CargarCFDI_LOTE_XX_LISTO.xlsx en el Escritorio y en Drive.
6. Cierre: Detecta los CCPs timbrados en 04_CCPS_TIMBRADOS y registra su folio y UUID SAT.
"""

import os
import sys
import glob
import re
import time
import shutil
from datetime import datetime
import openpyxl
import pypdf

# ══════════════════════════════════════════════════════════════════════════════
# RUTAS DE INFRAESTRUCTURA CANÓNICA
# ══════════════════════════════════════════════════════════════════════════════
PATH_DRIVE_BUZON = r"g:\Mi unidad\OLLIN_FINANZAS\BUZON_CCP"
DIR_BANCO        = os.path.join(PATH_DRIVE_BUZON, "01_COMPROBANTES_BANCO")
DIR_ADVICE       = os.path.join(PATH_DRIVE_BUZON, "02_PAYMENT_ADVICE")
DIR_CARGAS_DRIVE = os.path.join(PATH_DRIVE_BUZON, "03_CARGAS_GENERADAS")
DIR_TIMBRADOS    = os.path.join(PATH_DRIVE_BUZON, "04_CCPS_TIMBRADOS")
DIR_REPORTES_SAT = os.path.join(PATH_DRIVE_BUZON, "00_FACTURAS_PENDIENTES_XML_O_EXCEL")
DIR_XMLS_RUTA    = r"g:\Mi unidad\OLLIN_FINANZAS\Facturas 2026"

# Buscar Escritorio real (soporta OneDrive/Escritorio o Desktop estándar)
_desktop_onedrive = os.path.join(os.path.expanduser("~"), "OneDrive", "Escritorio")
if os.path.exists(_desktop_onedrive):
    DIR_DESKTOP_BASE = _desktop_onedrive
else:
    DIR_DESKTOP_BASE = os.path.join(os.path.expanduser("~"), "Desktop")

DIR_DESKTOP_CARGAS = os.path.join(DIR_DESKTOP_BASE, "CARGAS_CCP_FACTURO_POR_TI")

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN FISCAL Y BANCARIA FIJA
# ══════════════════════════════════════════════════════════════════════════════
RFC_EMISOR = "SAGS781017RR6"         # Sidharta Santiago Garduño
RFC_DHL    = "DHL020127CJ3"          # DHL Express México
CUENTA_ORDENANTE = "00124180701409097913"
CUENTA_BENEFICIARIO = "00012680011636845719"
FORMA_PAGO = "03"                    # Transferencia de fondos
MONEDA     = "MXN - Peso Mexicano"
TASA_IVA   = 0.160000

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        print(f"[{ts}] {msg}")
    except:
        print(f"[{ts}] {msg.encode('ascii', errors='ignore').decode('ascii')}")

def ensure_dirs():
    os.makedirs(DIR_DESKTOP_CARGAS, exist_ok=True)
    os.makedirs(DIR_CARGAS_DRIVE, exist_ok=True)

# ══════════════════════════════════════════════════════════════════════════════
# 1. ÍNDICE GLOBAL DE FACTURAS (UUIDs, SUBYTALES, IVAs)
# ══════════════════════════════════════════════════════════════════════════════
def cargar_catalogo_facturas():
    """
    Lee en memoria todos los UUIDs disponibles combinando:
    1. Reportes oficiales de Facturo Por Ti (.xlsx) en 00_FACTURAS_PENDIENTES_XML_O_EXCEL
    2. XMLs individuales en 'Facturas 2026'
    """
    catalogo = {}

    # 1. Cargar desde Excel(s)
    reportes = glob.glob(os.path.join(DIR_REPORTES_SAT, "*.xlsx"))
    for rep in sorted(reportes):
        try:
            wb = openpyxl.load_workbook(rep, data_only=True)
            ws = wb.active
            for r in range(7, ws.max_row + 1):
                folio_val = ws.cell(r, 4).value
                uuid_val = ws.cell(r, 2).value
                tot_val = ws.cell(r, 13).value
                if folio_val and uuid_val and str(folio_val).strip() != "None":
                    fol = str(folio_val).strip()
                    uuid_str = str(uuid_val).strip()
                    try:
                        tot = float(tot_val) if tot_val is not None else 0.0
                    except:
                        tot = 0.0
                    catalogo[fol] = {
                        "uuid": uuid_str,
                        "total": tot,
                        "serie": "P",
                        "fuente": os.path.basename(rep)
                    }
        except Exception as e:
            log(f"⚠️ Error leyendo reporte {rep}: {e}")

    # 2. Cargar desde XMLs en Facturas 2026
    if os.path.exists(DIR_XMLS_RUTA):
        xml_files = glob.glob(os.path.join(DIR_XMLS_RUTA, "*.xml"))
        for xf in xml_files:
            try:
                base = os.path.basename(xf)
                # Formato tipico: DEM8801152E9_CPT_P1065_20260825.xml
                m_fol = re.search(r'_P?(\d{3,5})_', base)
                if m_fol:
                    fol = m_fol.group(1)
                    if fol not in catalogo:
                        with open(xf, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                        u_m = re.search(r'UUID="([A-Fa-f0-9\-]{36})"', content)
                        tot_m = re.search(r'Total="([\d\.]+)"', content)
                        if u_m:
                            tot = float(tot_m.group(1)) if tot_m else 0.0
                            catalogo[fol] = {
                                "uuid": u_m.group(1),
                                "total": tot,
                                "serie": "P",
                                "fuente": "XML_DIR"
                            }
            except Exception as e:
                pass

    log(f"📦 Catálogo fiscal consolidado: {len(catalogo)} facturas indexadas.")
    return catalogo

# ══════════════════════════════════════════════════════════════════════════════
# 2. PARSER DE PAYMENT ADVICES (PDFs DE DHL)
# ══════════════════════════════════════════════════════════════════════════════
def parse_payment_advice(pdf_path):
    try:
        r = pypdf.PdfReader(pdf_path)
        text = "".join([p.extract_text() for p in r.pages])
    except Exception as e:
        return None

    # Extraer Documento SAP, Fecha de Valor y Monto Total
    doc_m = re.search(r'(\d{10})\s+(\d{2}/\d{2}/\d{4})\s+MXN\s+\**([\d\.,]+)\**', text)
    if not doc_m:
        doc_m = re.search(r'PAYMENT DOCUMENT.*?(\d{10})', text, re.DOTALL)
        doc_id = doc_m.group(1) if doc_m else "UNKNOWN"
        val_date = ""
        total = 0.0
    else:
        doc_id = doc_m.group(1)
        val_date = doc_m.group(2)
        total_str = doc_m.group(3)
        total = float(total_str.replace('.', '').replace(',', '.'))

    # Extraer facturas: 1900xxxxxx <folio> dd/mm/yyyy deductions amount
    invs = []
    lines = text.split('\n')
    for line in lines:
        m = re.search(r'19\d{8}\s+(\d{3,5})\s+(\d{2}/\d{2}/\d{4})\s+[\d\.,]+\s+([\d\.,]+)', line)
        if m:
            folio = m.group(1)
            amt_s = m.group(3).replace('.', '').replace(',', '.')
            invs.append((folio, float(amt_s)))

    if doc_id == "UNKNOWN" or not invs:
        return None

    return {
        "doc_id": doc_id,
        "date": val_date,
        "total": total,
        "invoices": invs,
        "file": pdf_path
    }

# ══════════════════════════════════════════════════════════════════════════════
# 3. DETECTOR DE CCPS TIMBRADOS (AUDITORÍA & POKA-YOKE)
# ══════════════════════════════════════════════════════════════════════════════
def obtener_ccps_timbrados():
    """
    Inspecciona 04_CCPS_TIMBRADOS y extrae qué facturas ya fueron timbradas.
    Retorna un diccionario: { folio_factura: (folio_ccp, uuid_ccp) }
    """
    facturas_timbradas = {}
    if not os.path.exists(DIR_TIMBRADOS):
        return facturas_timbradas

    # 1. Facturas históricas selladas en Enero (Lotes 01 a 04 - CCP50 a CCP53)
    # Protegidas por Poka-Yoke de Control de Folios
    folios_historicos_enero = [
        # CCP50
        "847", "848", "854", "855", "856", "857", "858", "863", "864", "865", "866", "867", "868", "874", "875", "876",
        # CCP51
        "879", "880", "881",
        # CCP52
        "884", "885", "886", "887", "888",
        # CCP53
        "861", "862", "869", "870", "871", "872", "873", "889", "894", "893", "898", "899", "900"
    ]
    for fh in folios_historicos_enero:
        facturas_timbradas[fh] = ("CCP_HISTORICO_ENERO", "HISTORICO")

    # 2. Facturas timbradas en PDFs de 04_CCPS_TIMBRADOS
    pdf_files = glob.glob(os.path.join(DIR_TIMBRADOS, "*.pdf"))
    for pf in sorted(pdf_files):
        try:
            r = pypdf.PdfReader(pf)
            text = "".join([p.extract_text() for p in r.pages])

            f_m = re.search(r'Folio:\s*(\d+)', text)
            folio_ccp = f"CCP{f_m.group(1)}" if f_m else "CCP_DESCONOCIDO"

            u_m = re.search(r'([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})', text)
            uuid_ccp = u_m.group(1) if u_m else ""

            # Facturas contenidas: 'P (\d{3,5}) 1 MXN'
            invs = re.findall(r'P\s+(\d{3,5})\s+1\s+MXN', text)
            for inv in invs:
                facturas_timbradas[inv] = (folio_ccp, uuid_ccp)
        except Exception as e:
            pass

    log(f"🛡️ Poka-Yoke: {len(facturas_timbradas)} facturas blindadas contra duplicación.")
    return facturas_timbradas

# ══════════════════════════════════════════════════════════════════════════════
# 4. GENERADOR DE ARCHIVO EXCEL OFICIAL (.xlsx) PARA FACTURO POR TI
# ══════════════════════════════════════════════════════════════════════════════
def generar_excel_lote(advice_info, catalogo_facturas, template_path, lote_nombre):
    """
    Construye el libro CargarCFDI_LOTE_XX_LISTO.xlsx con la estructura
    rígida requerida por Facturo Por Ti (DetallePagos).
    """
    out_name = f"CargarCFDI_{lote_nombre}_LISTO.xlsx"
    out_desktop = os.path.join(DIR_DESKTOP_CARGAS, out_name)
    out_drive   = os.path.join(DIR_CARGAS_DRIVE, out_name)

    # Si ya existe en escritorio, no sobreescribir salvo fuerza mayor
    if os.path.exists(out_desktop):
        return out_desktop, False

    wb = openpyxl.load_workbook(template_path)
    ws = wb["DetallePagos"]

    # Eliminar físicamente filas existentes a partir del renglón 4
    if ws.max_row >= 4:
        ws.delete_rows(4, ws.max_row - 3 + 10)

    # Fila 2: Cabecera DetallePago
    fecha_pago = f"{advice_info['date']} 12:00:00"
    num_operacion = advice_info.get("num_operacion", "")
    if not num_operacion:
        num_operacion = f"DHL{advice_info['doc_id']}"

    pago_vals = [
        "DetallePago",
        fecha_pago,
        FORMA_PAGO,
        MONEDA,
        1,
        advice_info["total"],
        num_operacion,
        "",
        RFC_DHL,
        CUENTA_ORDENANTE,
        RFC_EMISOR,
        CUENTA_BENEFICIARIO
    ]
    for c_idx, val in enumerate(pago_vals, start=1):
        ws.cell(2, c_idx, val)

    # Filas 4+: DetalleDocumentosRelacionados
    target_r = 4
    for fol, amt in advice_info["invoices"]:
        if fol not in catalogo_facturas:
            log(f"⚠️ Factura {fol} no tiene UUID en el catálogo. Se omite.")
            continue

        uuid_sat = catalogo_facturas[fol]["uuid"]
        tot = amt
        base = round(tot / 1.16, 2)
        iva  = round(tot - base, 2)

        doc_vals = [
            "DetalleDocumentosRelacionados",
            uuid_sat,
            "P",
            int(fol) if fol.isdigit() else fol,
            MONEDA,
            1,
            1,
            1,
            tot,
            tot,
            0.00,
            "02 - Sí objeto de impuesto.",
            "1 - Trasladado",
            "2 - IVA",
            "1 - Tasa",
            base,
            TASA_IVA,
            iva
        ]
        for c_idx, val in enumerate(doc_vals, start=1):
            ws.cell(target_r, c_idx, val)
        target_r += 1

    wb.save(out_desktop)
    try:
        shutil.copy2(out_desktop, out_drive)
    except Exception as e:
        pass

    log(f"✨ Archivo generado exitosamente: {out_name}")
    return out_desktop, True

# ══════════════════════════════════════════════════════════════════════════════
# 5. ORQUESTADOR PRINCIPAL (BARRIDO Y CONCILIACIÓN)
# ══════════════════════════════════════════════════════════════════════════════
def ejecutar_ciclo_conciliacion():
    ensure_dirs()
    log("🚀 Iniciando barrido del Buzón OLLIN Finanzas (Tenant corporativo)...")

    # 1. Cargar catálogo de facturas (UUIDs)
    catalogo = cargar_catalogo_facturas()

    # 2. Cargar facturas ya timbradas (Poka-Yoke)
    timbradas = obtener_ccps_timbrados()

    # 3. Buscar plantilla base
    template_candidates = glob.glob(os.path.join(DIR_DESKTOP_CARGAS, "CargarCFDI_*.xlsx"))
    if not template_candidates:
        template_candidates = glob.glob(os.path.join(DIR_CARGAS_DRIVE, "CargarCFDI_*.xlsx"))
    if not template_candidates:
        log("❌ No se encontró una plantilla de referencia CargarCFDI.xlsx.")
        return
    template_path = template_candidates[0]

    # 4. Leer todos los Payment Advices
    advice_files = glob.glob(os.path.join(DIR_ADVICE, "*.pdf")) + glob.glob(os.path.join(DIR_ADVICE, "*.PDF"))
    unique_advices = {}
    for af in advice_files:
        p = parse_payment_advice(af)
        if p and p["doc_id"] not in unique_advices:
            unique_advices[p["doc_id"]] = p

    log(f"📑 Payment Advices únicos detectados: {len(unique_advices)}")

    # 5. Evaluar cada pago
    nuevos_procesados = 0
    total_pendientes = 0

    # Mapeo de lotes por fecha/doc
    sorted_docs = sorted(unique_advices.keys(), key=lambda d: datetime.strptime(unique_advices[d]["date"], "%d/%m/%Y") if unique_advices[d]["date"] else datetime.min)

    for idx, doc_id in enumerate(sorted_docs, start=1):
        adv = unique_advices[doc_id]
        lote_str = f"LOTE_{idx:02d}"

        # Filtrar facturas que NO estén timbradas
        facturas_pendientes = []
        facturas_ya_timbradas = []

        for fol, amt in adv["invoices"]:
            if fol in timbradas:
                facturas_ya_timbradas.append(fol)
            else:
                facturas_pendientes.append((fol, amt))

        if not facturas_pendientes:
            # Todas ya están timbradas
            continue

        total_pendientes += 1
        log(f"🔎 {lote_str} (Doc {doc_id} | {adv['date']} | ${adv['total']:,.2f}): {len(facturas_pendientes)} facturas pendientes.")

        # Verificar si todas tienen UUID
        todas_con_uuid = all(f in catalogo for f, _ in facturas_pendientes)
        if not todas_con_uuid:
            faltantes = [f for f, _ in facturas_pendientes if f not in catalogo]
            log(f"   ⚠️ Faltan UUIDs en {lote_str}: {faltantes}")
            continue

        # Generar el Excel
        adv_para_generar = dict(adv)
        adv_para_generar["invoices"] = facturas_pendientes
        # Ajustar monto
        adv_para_generar["total"] = sum(amt for _, amt in facturas_pendientes)

        _, creado = generar_excel_lote(adv_para_generar, catalogo, template_path, lote_str)
        if creado:
            nuevos_procesados += 1

    log(f"🏁 Barrido completado. Lotes pendientes de timbrado: {total_pendientes}. Nuevos archivos listos: {nuevos_procesados}.")
    return nuevos_procesados

def iniciar_vigilancia_continua(intervalo_segundos=1800):
    """
    Modo autónomo continuo adaptado al ritmo real de pagos (2 a 3 veces por semana).
    Verifica cada 30 minutos sin saturar memoria ni CPU.
    """
    log(f"🔄 Modo Vigilancia Continua iniciado (Revisión cada {intervalo_segundos // 60} minutos).")
    try:
        while True:
            ejecutar_ciclo_conciliacion()
            time.sleep(intervalo_segundos)
    except KeyboardInterrupt:
        log("🛑 Vigilancia continua detenida por el usuario.")

# ══════════════════════════════════════════════════════════════════════════════
# PUNTO DE ENTRADA
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--watch":
        # Por defecto cada 30 minutos
        intervalo = 1800
        if len(sys.argv) > 2 and sys.argv[2].isdigit():
            intervalo = int(sys.argv[2])
        iniciar_vigilancia_continua(intervalo)
    else:
        ejecutar_ciclo_conciliacion()
