"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: GRAPHIFY OLLIN — MOTOR DE MAPEO COGNITIVO Y GRAFO DE CONOCIMIENTO
ARCHIVO: Fuentes_OLLIN/graphify_ollin.py
VERSIÓN: 2.0.0 PROD (ARQUITECTURA OLLIN-QUAD & CANON "APUNTAR AL SOL PARA DARLE AL ÁGUILA")
================================================================================

CANON SUPREMO DE GOBERNANZA E INGENIERÍA (INVIOLABLE):
"Apuntar al sol para darle al águila. Antes de realizar cualquier modificación en los
scripts de ingesta o en la estructura de código de CUALQUIER módulo del Ecosistema OLLIN,
es indispensable efectuar un análisis de impacto utilizando MirrorFish y Graphify.
MirrorFish permite evaluar cuál es la mejor ruta de cada proceso y comprender la arquitectura
completa, mientras que Graphify actúa como un mapa integral para visualizar cómo una modificación
afecta a otros componentes, previniendo así desconexiones, pérdida de etiquetas (01_QUERY_QRO,
02_REPORTE_QRO, 03_RECLAMOS_DHL) o corrupción por desplazamientos de columna."
================================================================================
"""

import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

# Configurar salida UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
FUENTES_DIR = ROOT_DIR / "Fuentes_OLLIN"
SECUNDARIO_DIR = FUENTES_DIR / "servidor_secundario"
OUTPUT_GRAPH_FILE = ROOT_DIR / "knowledge_graph.json"

# Esquema canónico inmutable de 25 columnas
ESQUEMA_25_COLUMNAS = [
    {"index": 0, "col": "A", "name": "Guia", "type": "Texto"},
    {"index": 1, "col": "B", "name": "PID", "type": "Texto", "rule": "Ley Doble J (sanitizarPIDParaBoveda)"},
    {"index": 2, "col": "C", "name": "C.P.", "type": "Texto/Número"},
    {"index": 3, "col": "D", "name": "Piezas", "type": "Número"},
    {"index": 4, "col": "E", "name": "Rcvr Addr 1", "type": "Texto"},
    {"index": 5, "col": "F", "name": "Rcvr Addr 2", "type": "Texto"},
    {"index": 6, "col": "G", "name": "Rcvr Addr 3", "type": "Texto"},
    {"index": 7, "col": "H", "name": "Receiver Name", "type": "Texto"},
    {"index": 8, "col": "I", "name": "GPS", "type": "Texto"},
    {"index": 9, "col": "J", "name": "Checkpoint", "type": "Texto"},
    {"index": 10, "col": "K", "name": "Comentarios", "type": "Texto"},
    {"index": 11, "col": "L", "name": "Fecha asignación", "type": "Fecha"},
    {"index": 12, "col": "M", "name": "Fecha en ruta", "type": "Fecha/Hora"},
    {"index": 13, "col": "N", "name": "Imagen fachada", "type": "URL Imagen"},
    {"index": 14, "col": "O", "name": "ID correo", "type": "Texto"},
    {"index": 15, "col": "P", "name": "EDD", "type": "Fecha"},
    {"index": 16, "col": "Q", "name": "KEY", "type": "Texto", "lock": "INMUTABLE_IDX_16"},
    {"index": 17, "col": "R", "name": "Tipo de servicio", "type": "Texto"},
    {"index": 18, "col": "S", "name": "Inter", "type": "Texto"},
    {"index": 19, "col": "T", "name": "Firma", "type": "URL Imagen"},
    {"index": 20, "col": "U", "name": "Telefono", "type": "Texto", "lock": "INMUTABLE_IDX_20"},
    {"index": 21, "col": "V", "name": "Hora de llegada", "type": "Fecha/Hora"},
    {"index": 22, "col": "W", "name": "Aprobación Auditor", "type": "Checkbox"},
    {"index": 23, "col": "X", "name": "Motivo de Rechazo", "type": "Texto"},
    {"index": 24, "col": "Y", "name": "Marca de Tiempo", "type": "Fecha/Hora"}
]

def scan_files() -> List[Dict[str, Any]]:
    """Escanea los archivos clave del repositorio."""
    discovered = []
    exts = {".gs", ".py", ".js", ".json", ".html", ".md"}
    
    for base_path in [ROOT_DIR, FUENTES_DIR, SECUNDARIO_DIR]:
        if not base_path.exists():
            continue
        for p in base_path.iterdir():
            if p.is_file() and p.suffix.lower() in exts:
                try:
                    size = p.stat().st_size
                    discovered.append({
                        "filename": p.name,
                        "path": str(p.relative_to(ROOT_DIR)).replace("\\", "/"),
                        "ext": p.suffix.lower(),
                        "size_bytes": size
                    })
                except Exception:
                    pass
    return discovered

def build_knowledge_graph() -> Dict[str, Any]:
    """Construye el grafo semántico completo del Ecosistema OLLIN-QUAD."""
    print("🏛️ Iniciando construcción del Grafo de Conocimiento OLLIN-QUAD...")
    
    nodes: Dict[str, Dict[str, Any]] = {}
    edges: List[Dict[str, Any]] = []

    def add_node(node_id: str, label: str, node_type: str, layer: str, desc: str, **kwargs):
        nodes[node_id] = {
            "id": node_id,
            "label": label,
            "type": node_type,
            "layer": layer,
            "description": desc,
            **kwargs
        }

    def add_edge(source: str, target: str, relation: str, desc: str, weight: int = 1):
        edges.append({
            "source": source,
            "target": target,
            "relation": relation,
            "description": desc,
            "weight": weight
        })

    # --------------------------------------------------------------------------
    # 1. CANON SUPREMO DE GOBERNANZA E INGENIERÍA
    # --------------------------------------------------------------------------
    add_node(
        "CANON_SUPREMO_GOBERNANZA",
        "Canon Supremo: Apuntar al sol para darle al águila",
        "MetaRule",
        "Governance",
        "Inviolable: Análisis de impacto con Graphify y MirrorFish previo a cualquier cambio en código o flujos de ingesta.",
        motto="Apuntar al sol para darle al águila",
        critical=True
    )

    # --------------------------------------------------------------------------
    # 2. NODOS: NÚCLEO DE REGLAS DE NEGOCIO Y GOBERNANZA (RULE_LAYER)
    # --------------------------------------------------------------------------
    add_node(
        "RULE_LEY_DOBLE_J",
        "Ley de la Doble J (Sanitización PID)",
        "BusinessRule",
        "Governance",
        "En calle/rampa (AppSheet) se usa formato JJD (3 letras). En BD/Facturación/Bóveda se transforma a JD (2 letras).",
        pattern=r"^JJD(.*)$ -> JD\1",
        critical=True
    )
    add_node(
        "RULE_25_COLUMNAS_RIGIDO",
        "Esquema Rígido de 25 Columnas",
        "SchemaRule",
        "Governance",
        "Esquema base 0 inmutable para VALIDACIÓN_QRO_2025. Prohíbe Column Shifting. KEY fija en idx 16, Telefono en idx 20.",
        columns_count=25,
        extinct_columns=["Actualización"],
        critical=True
    )
    add_node(
        "RULE_ZERO_DATA_RETENTION",
        "Política Zero Data Retention (ZDR)",
        "ComplianceRule",
        "Security",
        "Prohibido almacenar logs con PII o datos de guías DHL en servidores de terceros externos sin cifrado y control de retención cero.",
        critical=True
    )
    add_node(
        "RULE_TOPE_30_UMAS",
        "Tope de Responsabilidad 30 UMAs",
        "LegalRule",
        "Legal",
        "Tope legal de responsabilidad contractual ante reclamos o aclaraciones de paquetería DHL.",
        uma_cap=30,
        critical=True
    )

    # --------------------------------------------------------------------------
    # 3. NODOS: CANALES DE ENTRADA GMAIL (INGESTION_LAYER)
    # --------------------------------------------------------------------------
    add_node(
        "GMAIL_LABEL_01_QUERY_QRO",
        "Etiqueta Gmail: 01_QUERY_QRO",
        "IngestionChannel",
        "Ingestion",
        "Correos de telemetría interna DHL con AWB, Shipper, Receiver, eventos AR (QRO-QRO), pesajes RW y teléfonos.",
        gmail_filter="label:01_QUERY_QRO",
        target_processor="MOD_LECTORIA_PICKUPS.procesarQueriesQRO"
    )
    add_node(
        "GMAIL_LABEL_02_REPORTE_QRO",
        "Etiqueta Gmail: 02_REPORTE_QRO",
        "IngestionChannel",
        "Ingestion",
        "Batches diarios DOM/WPX EDD con archivos Excel de asignación de ruta para Querétaro.",
        gmail_filter="label:02_REPORTE_QRO",
        target_processor="MOD_LECTORIA_PICKUPS.procesarBatchQRO"
    )
    add_node(
        "GMAIL_LABEL_03_RECLAMOS_DHL",
        "Etiqueta Gmail: 03_RECLAMOS_DHL",
        "IngestionChannel",
        "Ingestion",
        "Reclamos y aclaraciones directas de clientes y operaciones DHL procesadas por Frente 6.",
        gmail_filter="label:03_RECLAMOS_DHL",
        target_processor="MOD_FRENTE6_ESCUDO_GMAIL"
    )

    # --------------------------------------------------------------------------
    # 4. NODOS: FUENTES DE DATOS, TABLAS Y BÓVEDAS (DATA_LAYER)
    # --------------------------------------------------------------------------
    add_node(
        "DATA_VALIDACION_QRO_2025",
        "Hoja Activa VALIDACIÓN_QRO_2025",
        "SpreadsheetTable",
        "Storage",
        "Hoja operativa de Querétaro estructurada con 25 columnas base 0 (KEY en Col Q, Telefono en Col U).",
        spreadsheet_id="1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M",
        schema_ref="RULE_25_COLUMNAS_RIGIDO"
    )
    add_node(
        "TAB_HISTORICO_QUERIES",
        "Pestaña HISTORICO_QUERIES",
        "StorageArchive",
        "Storage",
        "Pestaña histórica en VALIDACIÓN_QRO_2025 para telemetría completa de Queries sin saturar vista activa de Pochtecas.",
        spreadsheet_id="1tkfIyZIO2UxzSHFNRPFssRKOpkOscn7qNbkYA7SXr0M",
        parent_sheet="DATA_VALIDACION_QRO_2025"
    )
    add_node(
        "DATA_BD_APP_RUTA_2025",
        "Bóveda Central BD_APP_RUTA_2025",
        "MasterDatabase",
        "Storage",
        "Bóveda central de histórico de rutas, GUIAS_ASIGNADAS y PIEZAS_PID.",
        spreadsheet_id="1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w"
    )
    add_node(
        "DATA_BOVEDA_BATCH_MAESTRO",
        "Bóveda BOVEDA_BATCH_MAESTRO",
        "MasterDatabase",
        "Storage",
        "Bóveda transaccional para ingesta masiva de batches de facturación y liquidación (RAW_SHIPMENT / RAW_PIECE).",
        spreadsheet_id="1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw"
    )
    add_node(
        "TAB_RAW_SHIPMENT_PIECE",
        "Pestañas RAW_SHIPMENT / RAW_PIECE",
        "StorageArchive",
        "Storage",
        "Pestañas de Bóveda Batch Maestro para almacenar eventos crudos de trazabilidad DHL (AR -> FD).",
        spreadsheet_id="1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw",
        parent_sheet="DATA_BOVEDA_BATCH_MAESTRO"
    )
    add_node(
        "DATA_MONITOR_INCIDENCIAS_AE",
        "MONITOR_INCIDENCIAS_AE",
        "IncidentLog",
        "Storage",
        "Registro maestro de incidencias, aclaraciones y reclamos detectados por Frente 6.",
        spreadsheet_id="15XPRq79p0Z_jcKoxc_Sc_FKOQNHj8V2EYwn8Q1Mbqc0"
    )
    add_node(
        "SCHEMA_CAT_USUARIOS_8_COLS",
        "Esquema Canónico CAT_USUARIOS (8 Columnas)",
        "SchemaDefinition",
        "Governance",
        "Esquema expandido de CAT_USUARIOS: Correo (A), Nombre (B), Rol (C), Grupo (D), Webhook_Chat (E), Buscador_Escaner (F), Tiene_7CA (G), Telefono (H).",
        columns_count=8,
        column_h="Telefono",
        critical=True
    )
    add_node(
        "MOD_CENTINELA_ESQUEMAS",
        "Centinela de Esquemas OLLIN-QUAD (Daemon & Webhook GAS)",
        "MonitoringDaemon",
        "Governance",
        "Auditor preventivo de integridad dimensional de esquemas en Sheets. Previene Column Shifting y valida 8 columnas en CAT_USUARIOS y 25 en VALIDACIÓN_QRO_2025.",
        file_path="Fuentes_OLLIN/servidor_secundario/centinela_esquemas_daemon.py",
        webhook_action="ejecutar_centinela_esquemas"
    )
    add_node(
        "TAB_ENTREGA_MASIVA",
        "Tabla ENTREGA_MASIVA",
        "TransactionHeader",
        "Storage",
        "Tabla cabecera de lotes de entrega masiva (13 columnas). Aloja ID_Masivo, Chofer, Firma condicional y Nombre_Recibe condicional.",
        table_name="ENTREGA_MASIVA",
        parent_sheet="DATA_BD_APP_RUTA_2025"
    )
    add_node(
        "TAB_PIEZAS_ESCANEADAS_MASIVAS",
        "Tabla PIEZAS_ESCANEADAS_MASIVAS",
        "TransactionDetail",
        "Storage",
        "Tabla detalle de bultos escaneados en lote masivo. Registra PID_Codigo y Estatus_PID dinámico (OK, BA, NH, CA).",
        table_name="PIEZAS_ESCANEADAS_MASIVAS",
        parent_sheet="DATA_BD_APP_RUTA_2025"
    )
    add_node(
        "TAB_PIEZAS_PID",
        "Tabla PIEZAS_PID",
        "MasterPieceTable",
        "Storage",
        "Tabla maestra de bultos (14 columnas). Conserva Escaneo_Validacion (A_BORDO/BYPASS) y recibe Estatus_PID real.",
        table_name="PIEZAS_PID",
        parent_sheet="DATA_BD_APP_RUTA_2025"
    )
    add_node(
        "TAB_GUIAS_ASIGNADAS",
        "Tabla GUIAS_ASIGNADAS",
        "MasterGuideTable",
        "Storage",
        "Tabla maestra de guías madre (25 columnas). Calcula Nuevo_Estatus dinámico agregando los estados de sus PIDs.",
        table_name="GUIAS_ASIGNADAS",
        parent_sheet="DATA_BD_APP_RUTA_2025"
    )
    add_node(
        "TAB_CAT_CHECKPOINTS",
        "Catálogo CAT_CHECKPOINTS",
        "ReferenceCatalog",
        "Storage",
        "Catálogo oficial de códigos y checkpoints de excepción DHL (BA, NH, CA, OK).",
        table_name="CAT_CHECKPOINTS",
        parent_sheet="DATA_BD_APP_RUTA_2025"
    )
    add_node(
        "ACTION_MARCAR_PIEZA_ENTREGADA_MASIVA",
        "Acción: Marcar Pieza Entregada Masiva",
        "AppSheetAction",
        "Application",
        "Acción en cascada sobre PIEZAS_PID: Asigna Estatus_PID = LOOKUP([_THISROW].[PID_Codigo], 'PIEZAS_ESCANEADAS_MASIVAS', 'PID_Codigo', 'Estatus_PID') y respeta Escaneo_Validacion sin sobreescritura.",
        action_type="Data: set the values of some columns in this row",
        preserves_rampa=True,
        dynamic_lookup=True
    )
    add_node(
        "ACTION_DISPARAR_CALCULO_GUIA_MADRE",
        "Acción: Disparar_Calculo_Guia_Madre",
        "AppSheetAction",
        "Application",
        "Acción que fuerza el recálculo atómico de la Guía Madre en base a los bultos reales, evitando estatus OK fantasma.",
        action_type="Data: execute an action on a set of rows",
        cascade=True
    )

    # --------------------------------------------------------------------------
    # 5. NODOS: MÓDULOS DE SOFTWARE, DAEMONS Y FLUJOS DE RAMPA (APPLICATION_LAYER)
    # --------------------------------------------------------------------------
    add_node(
        "MOD_LECTORIA_PICKUPS",
        "LectorIA_Pickups (procesarQueriesQRO)",
        "ClientScript",
        "Frontend/Field",
        "Módulo Apps Script que procesa 01_QUERY_QRO (teléfonos y telemetría) y 02_REPORTE_QRO (batch).",
        file_path="LectorIA_Pickups.js",
        target_function="procesarQueriesQRO"
    )
    add_node(
        "FLOW_RAMPA_IRVIN",
        "Flujo Operativo de Rampa (Irvin Reyes)",
        "FieldOperation",
        "Rampa/Warehouse",
        "Proceso de escaneo físico en andén (PIEZAS_PID, A_BORDO, SIN_CARGAR). Blindado contra Column Shifting.",
        custody_rule="ESTATUS_A_BORDO_INMUTABLE"
    )
    add_node(
        "MOD_APPSCRIPT_CODE_GS",
        "Backend Apps Script (Code.gs)",
        "ServerlessBackend",
        "Cloud/Google",
        "Controlador central de Google Apps Script para triggers de hojas, webhooks y conciliación.",
        file_path="Code.gs"
    )
    add_node(
        "MOD_FRENTE6_ESCUDO_GMAIL",
        "Escudo Reclamos DHL Frente 6 (daemon_frente6_reclamos.py)",
        "AutonomousDaemon",
        "PC_Secundaria",
        "Demonio 24/7 y servicio FastAPI (puerto 8088) que escanea Gmail '03_RECLAMOS_DHL', cruza con Bóveda e inyecta en MONITOR_INCIDENCIAS_AE.",
        file_path="Fuentes_OLLIN/servidor_secundario/daemon_frente6_reclamos.py",
        port=8088
    )
    add_node(
        "MOD_CALPIXQUI_WHATSAPP_GATEWAY",
        "Calpixqui WhatsApp Gateway (gateway.js)",
        "HeadlessGateway",
        "PC_Secundaria",
        "Gateway Node.js headless en puerto 3001 conectado a WhatsApp Web sin GUI para despacho de alertas a Mesa de Control.",
        file_path="Fuentes_OLLIN/servidor_secundario/whatsapp_gateway/gateway.js",
        port=3001
    )
    add_node(
        "MOD_MIRRORFISH_ENGINE",
        "Motor de Simulación Mirrorfish",
        "SimulationEngine",
        "Simulation",
        "Simulador What-If multi-agente (500 agentes) para probar rutas de concurrencia y ventanas críticas.",
        file_path="mirrorfish_engine/simulador_whatif_ollin.py"
    )

    # --------------------------------------------------------------------------
    # 6. ARISTAS: RELACIONES CRÍTICAS Y BLINDAJES
    # --------------------------------------------------------------------------
    # Canon Supremo
    add_edge("CANON_SUPREMO_GOBERNANZA", "MOD_MIRRORFISH_ENGINE", "MANDATES", "Exige análisis predictivo previo a cualquier commit")
    add_edge("CANON_SUPREMO_GOBERNANZA", "MOD_LECTORIA_PICKUPS", "GOVERNS", "Protege procesarQueriesQRO() contra regresiones")

    # Ingesta 01_QUERY_QRO
    add_edge("GMAIL_LABEL_01_QUERY_QRO", "MOD_LECTORIA_PICKUPS", "READ_BY", "procesarQueriesQRO() procesa los hilos de 01_QUERY_QRO")
    add_edge("MOD_LECTORIA_PICKUPS", "DATA_BD_APP_RUTA_2025", "ENRICHES", "Inyecta teléfono sanitizado en GUIAS_ASIGNADAS eliminando 'HIDDEN'")
    add_edge("MOD_LECTORIA_PICKUPS", "TAB_HISTORICO_QUERIES", "ARCHIVES", "Resguarda telemetría completa (AR, Shipper, Receiver, RW) en VALIDACIÓN_QRO_2025")
    add_edge("MOD_LECTORIA_PICKUPS", "TAB_RAW_SHIPMENT_PIECE", "REPLICATES", "Resguarda copia de telemetría en BOVEDA_BATCH_MAESTRO")

    # Blindaje contra Column Shifting
    add_edge("DATA_VALIDACION_QRO_2025", "RULE_25_COLUMNAS_RIGIDO", "DEFINED_BY", "Estructura estricta con KEY en idx 16 y Telefono en idx 20")
    add_edge("TAB_HISTORICO_QUERIES", "DATA_VALIDACION_QRO_2025", "ISOLATED_FROM_ACTIVE", "Pestaña separada: NO altera las 25 columnas de la hoja activa")
    add_edge("FLOW_RAMPA_IRVIN", "DATA_VALIDACION_QRO_2025", "OPERATES_ON", "Irvin escanea sobre PIEZAS_PID y VALIDACION_QRO_2025 sin riesgo de shifting")

    # Doble J
    add_edge("MOD_LECTORIA_PICKUPS", "RULE_LEY_DOBLE_J", "ENFORCES", "Sanitiza códigos de bulto leídos en rampa de JJD a JD")
    add_edge("DATA_BD_APP_RUTA_2025", "RULE_LEY_DOBLE_J", "CONFORMS_TO", "Almacena exclusivamente PIDs en formato JD")

    # ZDR y 30 UMAs
    add_edge("MOD_LECTORIA_PICKUPS", "RULE_ZERO_DATA_RETENTION", "COMPLIES_WITH", "Procesa en RAM sin persistir en terceros externos")
    add_edge("MOD_FRENTE6_ESCUDO_GMAIL", "RULE_TOPE_30_UMAS", "ENFORCES", "Limita responsabilidad a 30 UMAs")
    add_edge("GMAIL_LABEL_03_RECLAMOS_DHL", "MOD_FRENTE6_ESCUDO_GMAIL", "READ_BY", "Escanea 03_RECLAMOS_DHL")
    add_edge("MOD_FRENTE6_ESCUDO_GMAIL", "MOD_CALPIXQUI_WHATSAPP_GATEWAY", "TRIGGERS_ALERT", "Notifica a Mesa de Control vía WhatsApp")

    # Concurrencia 02_REPORTE_QRO
    add_edge("GMAIL_LABEL_02_REPORTE_QRO", "MOD_LECTORIA_PICKUPS", "READ_BY", "procesarBatchQRO() procesa batches de ruta")

    # Gobernanza de Esquemas y Blindaje CAT_USUARIOS (8 Columnas)
    add_edge("DATA_BD_APP_RUTA_2025", "SCHEMA_CAT_USUARIOS_8_COLS", "DEFINED_BY", "CAT_USUARIOS implementa el esquema de 8 columnas con Telefono en Col H")
    add_edge("MOD_LECTORIA_PICKUPS", "SCHEMA_CAT_USUARIOS_8_COLS", "CONSUMES_SAFE", "Consume A:C (Correo, Nombre, Rol); no afectado por Telefono en Col H")
    add_edge("MOD_FRENTE6_ESCUDO_GMAIL", "SCHEMA_CAT_USUARIOS_8_COLS", "CONSUMES_SAFE", "Consume A:B (Correo, Nombre); no afectado por Telefono en Col H")
    add_edge("MOD_CENTINELA_ESQUEMAS", "SCHEMA_CAT_USUARIOS_8_COLS", "AUDITS", "Verifica 8 columnas exactas y presencia de Telefono en Col H")
    add_edge("MOD_CENTINELA_ESQUEMAS", "RULE_25_COLUMNAS_RIGIDO", "AUDITS", "Verifica 25 columnas inmutables y candados de KEY (16) y Telefono (20)")
    add_edge("MOD_CENTINELA_ESQUEMAS", "DATA_VALIDACION_QRO_2025", "PROTECTS", "Monitorea continuamente contra Column Shifting en Validación")

    # Flujo Poka-Yoke de Entrega Masiva e Incidencias (BA/NH/CA)
    add_edge("TAB_ENTREGA_MASIVA", "TAB_PIEZAS_ESCANEADAS_MASIVAS", "HAS_MANY", "Lote masivo agrupa múltiples bultos escaneados")
    add_edge("ACTION_MARCAR_PIEZA_ENTREGADA_MASIVA", "TAB_PIEZAS_ESCANEADAS_MASIVAS", "READS_ESTATUS", "Lee Estatus_PID dinámico mediante LOOKUP en lugar de fijar 'OK' estático")
    add_edge("ACTION_MARCAR_PIEZA_ENTREGADA_MASIVA", "TAB_PIEZAS_PID", "MUTATES_SAFE", "Actualiza Estatus_PID respetando Escaneo_Validacion sin sobreescritura")
    add_edge("ACTION_DISPARAR_CALCULO_GUIA_MADRE", "TAB_PIEZAS_PID", "AGGREGATES", "Calcula estatus real de Guía Madre basado en PIDs (previene OK fantasma)")
    add_edge("ACTION_DISPARAR_CALCULO_GUIA_MADRE", "TAB_GUIAS_ASIGNADAS", "UPDATES_ESTATUS", "Asigna Nuevo_Estatus dinámico en Guía Madre")
    add_edge("TAB_PIEZAS_ESCANEADAS_MASIVAS", "TAB_CAT_CHECKPOINTS", "VALIDATED_BY", "Estatus_PID validado contra catálogo oficial (OK, BA, NH, CA)")

    files_scanned = scan_files()

    graph = {
        "metadata": {
            "title": "KNOWLEDGE GRAPH DEL ECOSISTEMA OLLIN-QUAD",
            "canon_supremo": "Apuntar al sol para darle al águila",
            "version": "2.0.0-PROD",
            "generated_at": datetime.now().isoformat(),
            "nodes_count": len(nodes),
            "edges_count": len(edges),
            "scanned_files_count": len(files_scanned),
            "architecture": "OLLIN-QUAD (Graphify + OpenCode + Calpixqui Daemon 24/7 + Mirrorfish)"
        },
        "critical_invariants": {
            "canon_supremo": "Apuntar al sol para darle al águila (Análisis MirrorFish + Graphify previo a cambios)",
            "nodo_query": "MOD_LECTORIA_PICKUPS (procesarQueriesQRO) consume GMAIL_LABEL_01_QUERY_QRO",
            "aislamiento_telemetria": "Telemetría expandida reside únicamente en TAB_HISTORICO_QUERIES y TAB_RAW_SHIPMENT_PIECE",
            "blindaje_rampa": "FLOW_RAMPA_IRVIN y hoja activa VALIDACIÓN_QRO_2025 preservan 25 columnas inmutables (0 column shifting)",
            "ley_doble_j": "JJD (calle/AppSheet) -> JD (Bóveda/Facturación/Sheets)",
            "esquema_columnas": "25 columnas base 0 inmutables. Extinta: Actualización. KEY en idx 16. Telefono en idx 20.",
            "tope_legal": "30 UMAs de responsabilidad máxima por guía",
            "politica_privacidad": "Zero Data Retention (ZDR) activa en todos los daemons"
        },
        "nodes": list(nodes.values()),
        "edges": edges,
        "scanned_files": files_scanned,
        "schema_25_columnas": ESQUEMA_25_COLUMNAS
    }

    return graph

def main():
    graph = build_knowledge_graph()
    with open(OUTPUT_GRAPH_FILE, "w", encoding="utf-8") as f:
        json.dump(graph, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Grafo de Conocimiento exportado exitosamente a: {OUTPUT_GRAPH_FILE}")
    print(f"📊 Nodos registrados: {graph['metadata']['nodes_count']}")
    print(f"🔗 Aristas críticas conectadas: {graph['metadata']['edges_count']}")
    print(f"📂 Archivos escaneados: {graph['metadata']['scanned_files_count']}")

if __name__ == "__main__":
    main()
