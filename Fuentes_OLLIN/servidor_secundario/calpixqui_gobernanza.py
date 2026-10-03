"""
================================================================================
🏛️ ECOSISTEMA OLLIN — ARAUTO EXPRESS
MÓDULO: GOBERNANZA CENTRAL DE POCHTECAS Y MATRIZ_CP ENRIQUECIDA MULTICAPA
ARCHIVO: calpixqui_gobernanza.py
AUTOR: Antigravity (Google DeepMind) & Sidharta Santiago Garduño (Tlayacanqui)
VERSIÓN: 1.0.0 PROD (Plaza Querétaro & Sierra Gorda)
================================================================================

RESPONSABILIDADES:
1. Directorio Central de Pochtecas con control de ciclo de vida (soft-delete).
2. Persistencia dual: Base local JSON atómica + Sincronización a CAT_USUARIOS
   (Columna H 'Telefono' por Google Sheets API v4 sin Regenerate en AppSheet).
3. Matriz_CP Enriquecida Multicapa (9 columnas) en memoria RAM y Bóveda.
4. Asignación Dinámica de Guías con Autorrecuperación al vencer Overrides.
5. Reasignación Masiva por Municipio (estructurada y por comandos de texto).
6. Regla de Despacho Dual (Pochteca en Calle + Daniel Juárez en Sierra Gorda).
================================================================================
"""

import os
import sys
import json
import re
import unicodedata
import logging
import urllib.request
import urllib.parse
from datetime import datetime, date
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

# Configuración de rutas y entorno
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DIRECTORIO_FILE = DATA_DIR / "directorio_pochtecas.json"

# IDs de Google Sheets canónicos
SPREADSHEET_ID_BD_APP_RUTA_2025 = os.getenv("SPREADSHEET_ID_BD_APP_RUTA_2025", "1Rj7Ce6jWIFTXTamfcgO2h-uhFKBuNhSB8m_tBY_g__w")
SPREADSHEET_ID_BOVEDA_BATCH_MAESTRO = os.getenv("SPREADSHEET_ID_BOVEDA_BATCH_MAESTRO", "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw")
SHEET_ID_CAT_USUARIOS = 294388755

# Token de autenticación nativa
sys.path.insert(0, str(Path(BASE_DIR).parent.parent / ".agents"))
try:
    from test_sheets_api import get_access_token
except ImportError:
    def get_access_token():
        return ""

logger = logging.getLogger("CalpixquiGobernanza")


def normalizar_texto(texto: str) -> str:
    """Normaliza quitando acentos, mayúsculas y espacios sobrantes para búsquedas."""
    if not texto:
        return ""
    s = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in s if not unicodedata.combining(c)).strip().lower()


# ==============================================================================
# 1. DIRECTORIO CENTRAL DE POCHTECAS (PERSISTENCIA DUAL)
# ==============================================================================
class PochtecasManager:
    """
    Gestiona el ciclo de vida de Pochtecas y operadores con persistencia dual:
    - Base local JSON (`data/directorio_pochtecas.json`).
    - Sincronización atómica a `CAT_USUARIOS` (Columna H 'Telefono') vía Sheets API.
    """
    def __init__(self):
        self.directorio: Dict[str, Dict[str, Any]] = {}
        self._cargar_o_sembrar()

    def _headers_api(self) -> Dict[str, str]:
        token = get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def _cargar_o_sembrar(self):
        """Carga el directorio local o lo siembra desde CAT_USUARIOS si es nuevo."""
        if DIRECTORIO_FILE.exists():
            try:
                with open(DIRECTORIO_FILE, "r", encoding="utf-8") as f:
                    self.directorio = json.load(f)
                logger.info(f"Directorio local de Pochtecas cargado: {len(self.directorio)} operadores.")
                return
            except Exception as e:
                logger.error(f"Error leyendo directorio local: {e}. Sembrando desde Sheets...")

        # Sembrar desde CAT_USUARIOS
        self.sincronizar_desde_cat_usuarios()

    def guardar_local(self):
        """Persiste el diccionario en el archivo JSON local de forma atómica."""
        temp_file = DIRECTORIO_FILE.with_suffix(".tmp")
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(self.directorio, f, ensure_ascii=False, indent=2)
        temp_file.replace(DIRECTORIO_FILE)

    def sincronizar_desde_cat_usuarios(self):
        """Lee CAT_USUARIOS de BD_APP_RUTA_2025 para sembrar o refrescar la base local."""
        try:
            quoted = urllib.parse.quote("CAT_USUARIOS!A1:H".encode("utf-8"))
            url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_BD_APP_RUTA_2025}/values/{quoted}"
            req = urllib.request.Request(url, headers=self._headers_api())
            with urllib.request.urlopen(req) as resp:
                rows = json.loads(resp.read().decode("utf-8")).get("values", [])

            if not rows:
                return

            header = [str(c).strip().lower() for c in rows[0]]
            # Columnas canónicas
            # 0: Correo, 1: Nombre, 2: Rol, 3: Grupo, 4: Webhook_Chat, 5: Buscador_Escaner, 6: Tiene_7CA, 7: Telefono
            for r in rows[1:]:
                if not r or not r[0]:
                    continue
                correo = r[0].strip().lower()
                nombre = r[1].strip() if len(r) > 1 else ""
                rol = r[2].strip() if len(r) > 2 else "Pochteca"
                grupo = r[3].strip() if len(r) > 3 else "General"
                webhook_chat = r[4].strip() if len(r) > 4 else ""
                tiene_7ca = r[6].strip().upper() == "TRUE" if len(r) > 6 else False
                telefono = r[7].strip() if len(r) > 7 else ""

                supervisor = "xichudaniel@gmail.com" if grupo.lower() == "daniel" else "irvin.reyes@arauto.express"
                zona = "Sierra Gorda" if grupo.lower() == "daniel" else "QRO Metropolitano"

                if correo not in self.directorio:
                    self.directorio[correo] = {
                        "correo": correo,
                        "nombre": nombre,
                        "telefono": telefono,
                        "rol": rol,
                        "zona_asignada": zona,
                        "supervisor": supervisor,
                        "grupo": grupo,
                        "webhook_chat": webhook_chat,
                        "tiene_7ca": tiene_7ca,
                        "estatus": "Activo",
                        "fecha_creacion": datetime.now().isoformat(),
                        "fecha_actualizacion": datetime.now().isoformat()
                    }
                else:
                    # Actualizar datos si cambiaron
                    self.directorio[correo]["nombre"] = nombre or self.directorio[correo].get("nombre")
                    if telefono:
                        self.directorio[correo]["telefono"] = telefono

            self.guardar_local()
            logger.info(f"Sincronización inicial desde CAT_USUARIOS completada ({len(self.directorio)} usuarios).")
        except Exception as ex:
            logger.error(f"Error sincronizando desde CAT_USUARIOS: {ex}")

    def sincronizar_a_cat_usuarios(self, correo: str) -> bool:
        """
        Sincroniza un pochteca específico hacia CAT_USUARIOS en Sheets.
        Actualiza o anexa la fila, escribiendo el Teléfono en la Columna H (índice 7).
        """
        correo_clean = correo.strip().lower()
        poch = self.directorio.get(correo_clean)
        if not poch:
            return False

        try:
            quoted = urllib.parse.quote("CAT_USUARIOS!A1:H".encode("utf-8"))
            url_get = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_BD_APP_RUTA_2025}/values/{quoted}"
            req_get = urllib.request.Request(url_get, headers=self._headers_api())
            with urllib.request.urlopen(req_get) as resp:
                rows = json.loads(resp.read().decode("utf-8")).get("values", [])

            fila_encontrada = -1
            for idx, r in enumerate(rows):
                if r and len(r) > 0 and r[0].strip().lower() == correo_clean:
                    fila_encontrada = idx + 1
                    break

            if fila_encontrada != -1:
                # Actualizar fila existente
                # Solo modificamos Nombre (B), Rol (C), Grupo (D) y Telefono (H)
                row_data = rows[fila_encontrada - 1]
                # Asegurar longitud 8
                while len(row_data) < 8:
                    row_data.append("")

                row_data[1] = poch.get("nombre", row_data[1])
                row_data[2] = poch.get("rol", row_data[2])
                row_data[3] = poch.get("grupo", poch.get("supervisor", row_data[3]))
                row_data[7] = poch.get("telefono", "")

                rng_update = urllib.parse.quote(f"CAT_USUARIOS!A{fila_encontrada}:H{fila_encontrada}".encode("utf-8"))
                url_update = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_BD_APP_RUTA_2025}/values/{rng_update}?valueInputOption=USER_ENTERED"
                payload = {
                    "range": f"CAT_USUARIOS!A{fila_encontrada}:H{fila_encontrada}",
                    "values": [row_data]
                }
                req_up = urllib.request.Request(url_update, data=json.dumps(payload).encode("utf-8"), headers=self._headers_api(), method="PUT")
                with urllib.request.urlopen(req_up) as resp:
                    pass
                logger.info(f"Fila {fila_encontrada} en CAT_USUARIOS actualizada para {correo_clean}.")
            else:
                # Anexar nueva fila
                nueva_fila = [
                    correo_clean,
                    poch.get("nombre", ""),
                    poch.get("rol", "Pochteca"),
                    poch.get("grupo", "General"),
                    poch.get("webhook_chat", ""),
                    "", # Buscador_Escaner
                    "FALSE", # Tiene_7CA
                    poch.get("telefono", "") # Col H: Telefono
                ]
                url_append = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_BD_APP_RUTA_2025}/values/CAT_USUARIOS!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"
                payload = {
                    "range": "CAT_USUARIOS!A:H",
                    "values": [nueva_fila]
                }
                req_app = urllib.request.Request(url_append, data=json.dumps(payload).encode("utf-8"), headers=self._headers_api(), method="POST")
                with urllib.request.urlopen(req_app) as resp:
                    pass
                logger.info(f"Nueva fila anexada en CAT_USUARIOS para {correo_clean}.")

            return True
        except Exception as ex:
            logger.error(f"Error sincronizando {correo_clean} a CAT_USUARIOS: {ex}")
            return False

    def agregar_pochteca(
        self,
        correo: str,
        nombre: str,
        telefono: str,
        rol: str = "Pochteca",
        zona_asignada: str = "QRO",
        supervisor: str = "xichudaniel@gmail.com"
    ) -> Dict[str, Any]:
        """Registra un nuevo Pochteca en base local y sincroniza a Sheets CAT_USUARIOS."""
        correo_clean = correo.strip().lower()
        if not correo_clean or "@" not in correo_clean:
            raise ValueError(f"Correo inválido: '{correo}'")

        ahora = datetime.now().isoformat()
        nuevo = {
            "correo": correo_clean,
            "nombre": nombre.strip(),
            "telefono": telefono.strip(),
            "rol": rol.strip(),
            "zona_asignada": zona_asignada.strip(),
            "supervisor": supervisor.strip().lower(),
            "grupo": "Daniel" if "daniel" in supervisor.lower() else "General",
            "webhook_chat": "",
            "tiene_7ca": False,
            "estatus": "Activo",
            "fecha_creacion": ahora,
            "fecha_actualizacion": ahora
        }

        self.directorio[correo_clean] = nuevo
        self.guardar_local()
        # Sincronización dual a Sheets
        sync_ok = self.sincronizar_a_cat_usuarios(correo_clean)

        return {
            "status": "success",
            "accion": "AGREGAR_POCHTECA",
            "pochteca": nuevo,
            "sync_sheets": sync_ok
        }

    def actualizar_pochteca(
        self,
        correo: str,
        telefono: Optional[str] = None,
        zona_asignada: Optional[str] = None,
        supervisor: Optional[str] = None,
        nombre: Optional[str] = None,
        rol: Optional[str] = None
    ) -> Dict[str, Any]:
        """Modifica teléfono, zona o supervisor de un Pochteca existente."""
        correo_clean = correo.strip().lower()
        if correo_clean not in self.directorio:
            raise KeyError(f"Pochteca '{correo}' no encontrado en el directorio.")

        poch = self.directorio[correo_clean]
        if telefono is not None:
            poch["telefono"] = telefono.strip()
        if zona_asignada is not None:
            poch["zona_asignada"] = zona_asignada.strip()
        if supervisor is not None:
            poch["supervisor"] = supervisor.strip().lower()
            if "daniel" in poch["supervisor"]:
                poch["grupo"] = "Daniel"
        if nombre is not None:
            poch["nombre"] = nombre.strip()
        if rol is not None:
            poch["rol"] = rol.strip()

        poch["fecha_actualizacion"] = datetime.now().isoformat()
        self.guardar_local()
        sync_ok = self.sincronizar_a_cat_usuarios(correo_clean)

        return {
            "status": "success",
            "accion": "ACTUALIZAR_POCHTECA",
            "pochteca": poch,
            "sync_sheets": sync_ok
        }

    def baja_pochteca(self, correo: str) -> Dict[str, Any]:
        """
        Realiza un 'Soft Delete':
        - Cambia Estatus a 'Inactivo'.
        - Suspende alertas directas.
        - NO borra el historial de entregas pasadas ni elimina la fila en base.
        """
        correo_clean = correo.strip().lower()
        if correo_clean not in self.directorio:
            raise KeyError(f"Pochteca '{correo}' no encontrado en el directorio.")

        poch = self.directorio[correo_clean]
        poch["estatus"] = "Inactivo"
        poch["fecha_baja"] = datetime.now().isoformat()
        poch["fecha_actualizacion"] = datetime.now().isoformat()
        self.guardar_local()

        logger.info(f"Soft delete aplicado para Pochteca: {correo_clean} (Estatus=Inactivo)")

        return {
            "status": "success",
            "accion": "BAJA_POCHTECA",
            "mensaje": f"Pochteca {correo_clean} marcado como Inactivo (Soft Delete). Alertas suspendidas.",
            "pochteca": poch
        }

    def obtener_pochteca(self, correo: str) -> Optional[Dict[str, Any]]:
        return self.directorio.get(correo.strip().lower())

    def listar_pochtecas(self, solo_activos: bool = False) -> List[Dict[str, Any]]:
        if solo_activos:
            return [p for p in self.directorio.values() if p.get("estatus") == "Activo"]
        return list(self.directorio.values())


# ==============================================================================
# 2. NUEVA MATRIZ_CP ENRIQUECIDA MULTICAPA Y ASIGNACIÓN DINÁMICA
# ==============================================================================
class MatrizCPManager:
    """
    Gestiona la Matriz de Códigos Postales enriquecida (9 columnas):
    - Col A: Codigo_Postal (Key)
    - Col B: Municipio
    - Col C: Zona_Operativa
    - Col D: Chofer_Titular
    - Col E: Chofer_Suplente
    - Col F: Supervisor_Zona
    - Col G: Tipo_Servicio
    - Col H: Override_Activo
    - Col I: Fecha_Expiracion_Override
    """
    def __init__(self):
        self.matriz_cp: Dict[str, Dict[str, Any]] = {}
        self.cargar_matriz()

    def _headers_api(self) -> Dict[str, str]:
        token = get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def cargar_matriz(self):
        """Carga la matriz completa en memoria RAM desde BOVEDA_BATCH_MAESTRO."""
        try:
            quoted = urllib.parse.quote("MATRIZ_CP!A1:I".encode("utf-8"))
            url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_BOVEDA_BATCH_MAESTRO}/values/{quoted}"
            req = urllib.request.Request(url, headers=self._headers_api())
            with urllib.request.urlopen(req) as resp:
                rows = json.loads(resp.read().decode("utf-8")).get("values", [])

            if not rows or len(rows) < 2:
                logger.warning("MATRIZ_CP leída vacía de Bóveda.")
                return

            self.matriz_cp.clear()
            for idx, r in enumerate(rows[1:], start=2):
                cp = r[0].strip() if len(r) > 0 and r[0] else ""
                if not cp:
                    continue
                self.matriz_cp[cp] = {
                    "_fila_sheet": idx,
                    "Codigo_Postal": cp,
                    "Municipio": r[1].strip() if len(r) > 1 else "",
                    "Zona_Operativa": r[2].strip() if len(r) > 2 else "",
                    "Chofer_Titular": r[3].strip() if len(r) > 3 else "",
                    "Chofer_Suplente": r[4].strip() if len(r) > 4 else "",
                    "Supervisor_Zona": r[5].strip() if len(r) > 5 else "",
                    "Tipo_Servicio": r[6].strip() if len(r) > 6 else "Local",
                    "Override_Activo": r[7].strip() if len(r) > 7 else "",
                    "Fecha_Expiracion_Override": r[8].strip() if len(r) > 8 else ""
                }

            logger.info(f"MATRIZ_CP cargada en RAM: {len(self.matriz_cp)} códigos postales mapeados.")
        except Exception as ex:
            logger.error(f"Error cargando MATRIZ_CP desde Bóveda: {ex}")

    def resolver_asignacion(
        self,
        cp: str,
        municipio: Optional[str] = None,
        fecha_evaluacion: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        LÓGICA DE ASIGNACIÓN DINÁMICA Y AUTORRECUPERACIÓN:
        1. Busca el CP en la Matriz (o por coincidencia de Municipio).
        2. Si 'Override_Activo' contiene correo Y 'Fecha_Expiracion_Override' >= Hoy:
           -> Asigna la guía al Pochteca de Override.
        3. Al expirar la fecha:
           -> Autorrecupera y dirige en automático al 'Chofer_Titular'.
        """
        cp_limpio = str(cp).strip() if cp else ""
        fecha_hoy = fecha_evaluacion or date.today().strftime("%Y-%m-%d")

        registro = self.matriz_cp.get(cp_limpio)

        # Si no encontró por CP y se proporcionó municipio, buscar primer CP de ese municipio
        if not registro and municipio:
            mun_norm = normalizar_texto(municipio)
            for item in self.matriz_cp.values():
                if normalizar_texto(item.get("Municipio", "")) == mun_norm:
                    registro = item
                    break

        if not registro:
            return {
                "cp": cp_limpio,
                "encontrado": False,
                "chofer_asignado": "sin_asignar@arauto.express",
                "es_override": False,
                "supervisor": "irvin.reyes@arauto.express",
                "tipo_servicio": "Foraneo",
                "motivo": "CP no catalogado en MATRIZ_CP"
            }

        titular = registro.get("Chofer_Titular", "").strip()
        override = registro.get("Override_Activo", "").strip()
        fecha_exp = registro.get("Fecha_Expiracion_Override", "").strip()
        supervisor = registro.get("Supervisor_Zona", "").strip() or "irvin.reyes@arauto.express"
        tipo_servicio = registro.get("Tipo_Servicio", "Local")
        municipio_reg = registro.get("Municipio", "")
        zona_reg = registro.get("Zona_Operativa", "")

        chofer_final = titular
        es_override = False
        estado_override = "INACTIVO"

        if override:
            # Validar fecha de expiración
            if fecha_exp:
                try:
                    # Formato esperado: YYYY-MM-DD
                    if fecha_exp >= fecha_hoy:
                        chofer_final = override
                        es_override = True
                        estado_override = "VIGENTE"
                    else:
                        # Expirado: Autorrecuperación automática
                        chofer_final = titular
                        es_override = False
                        estado_override = "EXPIRADO_AUTORRECUPERADO"
                except Exception:
                    # En caso de fecha ilegible, fallback a titular
                    chofer_final = titular
                    estado_override = "ERROR_FECHA_FALLBACK_TITULAR"
            else:
                # Si hay correo override sin fecha de expiración fijada, asumimos activo
                chofer_final = override
                es_override = True
                estado_override = "VIGENTE_PERMANENTE"

        # Evaluar Despacho Dual (Sierra Gorda / Daniel Juárez)
        es_sierra_gorda = (
            cp_limpio.startswith("379") or
            cp_limpio.startswith("763") or
            cp_limpio in ["76280", "76290"] or
            "daniel" in supervisor.lower()
        )

        return {
            "cp": cp_limpio,
            "municipio": municipio_reg,
            "zona_operativa": zona_reg,
            "encontrado": True,
            "chofer_asignado": chofer_final,
            "chofer_titular": titular,
            "chofer_suplente": registro.get("Chofer_Suplente", ""),
            "supervisor": supervisor,
            "tipo_servicio": tipo_servicio,
            "es_override": es_override,
            "override_activo": override if es_override else "",
            "estado_override": estado_override,
            "fecha_expiracion_override": fecha_exp,
            "despacho_dual_requerido": es_sierra_gorda,
            "destinatarios_alerta": [chofer_final] + ([supervisor] if es_sierra_gorda and supervisor != chofer_final else [])
        }

    def reasignar_municipio_masivo(
        self,
        municipio: str,
        nuevo_chofer: str,
        fecha_expiracion: str
    ) -> Dict[str, Any]:
        """
        REASIGNACIÓN MASIVA POR MUNICIPIO:
        Actualiza en lote las columnas H (Override_Activo) e I (Fecha_Expiracion_Override)
        de todos los CPs pertenecientes a un Municipio específico.
        """
        mun_norm = normalizar_texto(municipio)
        chofer_clean = nuevo_chofer.strip().lower()
        fecha_exp_clean = fecha_expiracion.strip()

        # Encontrar filas coincidentes en RAM
        filas_afectadas = []
        cps_afectados = []

        for cp, datos in self.matriz_cp.items():
            if normalizar_texto(datos.get("Municipio", "")) == mun_norm:
                filas_afectadas.append(datos["_fila_sheet"])
                cps_afectados.append(cp)
                # Actualizar RAM
                datos["Override_Activo"] = chofer_clean
                datos["Fecha_Expiracion_Override"] = fecha_exp_clean

        if not filas_afectadas:
            return {
                "status": "error",
                "mensaje": f"No se encontraron CPs asociados al municipio '{municipio}'."
            }

        # Actualizar en Google Sheets vía batchUpdate de Values
        try:
            data_updates = []
            for fila_idx in filas_afectadas:
                data_updates.append({
                    "range": f"MATRIZ_CP!H{fila_idx}:I{fila_idx}",
                    "values": [[chofer_clean, fecha_exp_clean]]
                })

            body = {
                "valueInputOption": "USER_ENTERED",
                "data": data_updates
            }
            url_batch = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID_BOVEDA_BATCH_MAESTRO}/values:batchUpdate"
            req = urllib.request.Request(url_batch, data=json.dumps(body).encode("utf-8"), headers=self._headers_api(), method="POST")
            with urllib.request.urlopen(req) as resp:
                pass

            logger.info(f"Reasignación masiva exitosa para '{municipio}': {len(cps_afectados)} CPs asignados a {chofer_clean} hasta {fecha_exp_clean}.")
            return {
                "status": "success",
                "municipio": municipio,
                "nuevo_chofer": chofer_clean,
                "fecha_expiracion": fecha_exp_clean,
                "total_cps_actualizados": len(cps_afectados),
                "cps": cps_afectados
            }
        except Exception as ex:
            logger.error(f"Error persistiendo reasignación masiva a Sheets: {ex}")
            return {
                "status": "partial_success",
                "mensaje": f"Actualizado en RAM pero falló persistencia a Sheets: {ex}",
                "total_cps_actualizados": len(cps_afectados)
            }

    def interpretar_comando_reasignacion(self, comando_texto: str) -> Dict[str, Any]:
        """
        Parser de comandos en lenguaje natural:
        Ejemplos:
        - "Reasigna todo el Municipio de Xichú a Oscher hasta el 23/09"
        - "Reasigna San Luis de la Paz a edgar.rodriguez.arauto@gmail.com vigencia 2026-09-30"
        """
        texto = comando_texto.strip()
        logger.info(f"Interpretando comando de reasignación: '{texto}'")

        # Mapeo de alias comunes a correos
        alias_choferes = {
            "oscher": "oscher1016@gmail.com",
            "edgar": "edgar.rodriguez.arauto@gmail.com",
            "daniel": "xichudaniel@gmail.com",
            "victor": "victor18amadorm@gmail.com",
            "víctor": "victor18amadorm@gmail.com",
            "fernando": "fernando.maestro.1991@gmail.com",
            "diego": "diegovv21mar@gmail.com",
            "gregorio": "fmsanluispaq@gmail.com",
            "sidharta": "sidharta.santiago@arauto.express",
            "irvin": "irvin.reyes@arauto.express"
        }

        # Extraer municipio: buscar entre los municipios conocidos
        municipios_conocidos = set(datos.get("Municipio", "") for datos in self.matriz_cp.values() if datos.get("Municipio"))
        municipio_detectado = None

        # Ordenar por longitud descendente para evitar subcoincidencias
        for mun in sorted(municipios_conocidos, key=lambda x: len(x), reverse=True):
            if normalizar_texto(mun) in normalizar_texto(texto):
                municipio_detectado = mun
                break

        if not municipio_detectado:
            # Búsqueda regex de fallback
            m_mun = re.search(r'municipio\s+(?:de\s+)?([a-záéíóúñ\s]+?)(?:\s+a\s+|\s+para\s+)', texto, re.IGNORECASE)
            if m_mun:
                municipio_detectado = m_mun.group(1).strip()

        if not municipio_detectado:
            return {"status": "error", "mensaje": "No se pudo identificar el Municipio en el comando."}

        # Extraer chofer (correo o alias)
        chofer_detectado = None
        m_email = re.search(r'([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', texto)
        if m_email:
            chofer_detectado = m_email.group(1).lower()
        else:
            for alias, email in alias_choferes.items():
                if re.search(r'\b' + re.escape(alias) + r'\b', texto, re.IGNORECASE):
                    chofer_detectado = email
                    break

        if not chofer_detectado:
            return {"status": "error", "mensaje": "No se pudo identificar el Chofer (correo o alias) en el comando."}

        # Extraer fecha límite
        # Formatos: 2026-09-23, 23/09/2026, 23/09, o palabras
        año_actual = date.today().year
        fecha_expiracion = None

        m_f1 = re.search(r'(\d{4})-(\d{1,2})-(\d{1,2})', texto)
        if m_f1:
            fecha_expiracion = f"{m_f1.group(1)}-{int(m_f1.group(2)):02d}-{int(m_f1.group(3)):02d}"

        if not fecha_expiracion:
            m_f2 = re.search(r'(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?', texto)
            if m_f2:
                d = int(m_f2.group(1))
                m = int(m_f2.group(2))
                y = int(m_f2.group(3)) if m_f2.group(3) else año_actual
                if y < 100:
                    y += 2000
                fecha_expiracion = f"{y:04d}-{m:02d}-{d:02d}"

        if not fecha_expiracion:
            # Fallback a 7 días en el futuro
            from datetime import timedelta
            fecha_expiracion = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")

        # Ejecutar reasignación masiva
        return self.reasignar_municipio_masivo(
            municipio=municipio_detectado,
            nuevo_chofer=chofer_detectado,
            fecha_expiracion=fecha_expiracion
        )


# ==============================================================================
# 3. GESTOR DE DESPACHO DUAL (POCHTECA + SUPERVISOR DANIEL JUÁREZ)
# ==============================================================================
class DespachoDualManager:
    """
    Aplica la Regla de Despacho Dual:
    Si la guía es de la Zona 9 / Sierra Gorda o tiene supervisor asignado,
    despacha la alerta tanto al Pochteca activo como a Daniel Juárez.
    """
    def __init__(self, pochtecas_mgr: PochtecasManager, matriz_mgr: MatrizCPManager):
        self.pochtecas_mgr = pochtecas_mgr
        self.matriz_mgr = matriz_mgr

    def despachar_alerta_guia(
        self,
        guia: str,
        pid: str,
        cp: str,
        municipio: Optional[str] = None,
        evento: str = "ASIGNACION_RUTA",
        detalles: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Calcula la ruta de despacho de notificaciones y emite las alertas correspondientes.
        """
        asig = self.matriz_mgr.resolver_asignacion(cp=cp, municipio=municipio)
        chofer_asignado = asig.get("chofer_asignado", "")
        supervisor = asig.get("supervisor", "")
        despacho_dual = asig.get("despacho_dual_requerido", False)

        poch = self.pochtecas_mgr.obtener_pochteca(chofer_asignado)
        sup = self.pochtecas_mgr.obtener_pochteca(supervisor)

        alertas_emitidas = []

        # 1. Alerta al Pochteca que realmente operará la ruta
        if poch and poch.get("estatus") == "Activo":
            tel_poch = poch.get("telefono", "")
            webhook_poch = poch.get("webhook_chat", "")
            msg_poch = f"Guía {guia} (PID {pid}) asignada para entrega en {asig.get('municipio')} (CP {cp})."
            envio_poch = self.enviar_alerta_chat_resiliente(webhook_poch, msg_poch, chofer_asignado)
            alertas_emitidas.append({
                "destinatario": chofer_asignado,
                "rol": "Pochteca en Operación",
                "telefono": tel_poch,
                "canal": "WhatsApp" if tel_poch else "Google Chat",
                "webhook_usado": envio_poch.get("webhook_usado"),
                "status_envio": envio_poch.get("status"),
                "mensaje": msg_poch
            })
        else:
            logger.warning(f"Pochteca {chofer_asignado} está Inactivo o no registrado. Alerta directa suspendida.")

        # 2. Alerta dual al Supervisor (Daniel Juárez en Sierra Gorda)
        if despacho_dual and supervisor:
            tel_sup = sup.get("telefono", "") if sup else ""
            webhook_sup = sup.get("webhook_chat", "") if sup else ""
            msg_sup = f"[DUAL ALERT - SIERRA GORDA] Guía {guia} (PID {pid}) despachada a operador '{chofer_asignado}' para {asig.get('municipio')}."
            envio_sup = self.enviar_alerta_chat_resiliente(webhook_sup, msg_sup, supervisor)
            alertas_emitidas.append({
                "destinatario": supervisor,
                "rol": "Supervisor de Zona",
                "telefono": tel_sup,
                "canal": "WhatsApp / Google Chat",
                "webhook_usado": envio_sup.get("webhook_usado"),
                "status_envio": envio_sup.get("status"),
                "mensaje": msg_sup
            })

        return {
            "status": "success",
            "guia": guia,
            "pid": pid,
            "cp": cp,
            "municipio": asig.get("municipio"),
            "asignacion": asig,
            "alertas_emitidas": alertas_emitidas
        }

    def enviar_alerta_chat_resiliente(self, webhook_url: str, texto: str, destinatario: str) -> Dict[str, Any]:
        """
        Envío Poka-Yoke de alertas:
        Si el webhook específico falla (ej. 403 Forbidden o inaccesible),
        desvía automáticamente al CANAL GENERAL DE RAMPA/MESA DE CONTROL (AAQA-NmGVf0)
        garantizando que ninguna alerta de ruta o incidencia se pierda.
        """
        webhook_general = "https://chat.googleapis.com/v1/spaces/AAQA-NmGVf0/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ml4k0Mmpx8c3vGco583llDQGEGJf3OY7LUMKlJjJIsY"
        target_url = webhook_url.strip() if webhook_url else webhook_general

        body = json.dumps({"text": texto}).encode("utf-8")
        headers = {"Content-Type": "application/json"}

        # Intento 1: Webhook asignado
        try:
            req = urllib.request.Request(target_url, data=body, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=8) as resp:
                if resp.status in (200, 204):
                    return {"status": "ENVIADO_OK", "webhook_usado": target_url}
        except Exception as e:
            logger.warning(f"Fallo enviando alerta a {destinatario} vía {target_url}: {e}. Activando fallback a Canal General...")

        # Intento 2: Fallback resiliente a Canal General
        if target_url != webhook_general:
            try:
                texto_fallback = f"⚠️ [FALLBACK MESA CONTROL - Webhook Inaccesible para {destinatario}]\n{texto}"
                body_fb = json.dumps({"text": texto_fallback}).encode("utf-8")
                req_fb = urllib.request.Request(webhook_general, data=body_fb, headers=headers, method="POST")
                with urllib.request.urlopen(req_fb, timeout=8) as resp_fb:
                    if resp_fb.status in (200, 204):
                        return {"status": "FALLBACK_CANAL_GENERAL_OK", "webhook_usado": webhook_general}
            except Exception as fb_err:
                logger.error(f"Fallo crítico en webhook fallback de Google Chat: {fb_err}")

        return {"status": "ERROR_ENVIO", "webhook_usado": target_url}


# Instancias globales singleton para Calpixqui
pochtecas_global = PochtecasManager()
matriz_cp_global = MatrizCPManager()
despacho_dual_global = DespachoDualManager(pochtecas_global, matriz_cp_global)
