import json
import urllib.request
import urllib.parse
import sys

sys.path.insert(0, r"c:\Users\sidha\OneDrive\Careta para Antigravity\.agents")
from test_sheets_api import get_access_token

boveda_id = "1wIz5YlSbpOLtDY9UNShZ9LHdcez_Vyxlu1wYxBZKTkw"

def inferir_municipio_y_zona(cp: str):
    try:
        cp_num = int(cp)
    except ValueError:
        return "Desconocido", "Zona Indefinida", "irvin.reyes@arauto.express"

    # Sierra Gorda Noreste Guanajuato (Supervisor Daniel Juárez)
    if 37900 <= cp_num <= 37919:
        return "San Luis de la Paz", "Sierra Gorda - Microzona 1 (San Luis)", "xichudaniel@gmail.com"
    elif 37920 <= cp_num <= 37929:
        return "Victoria", "Sierra Gorda - Microzona 2 (Victoria)", "xichudaniel@gmail.com"
    elif 37930 <= cp_num <= 37939:
        return "Xichú", "Sierra Gorda - Microzona 3 (Xichú)", "xichudaniel@gmail.com"
    elif 37940 <= cp_num <= 37949:
        return "Atarjea", "Sierra Gorda - Microzona 4 (Atarjea)", "xichudaniel@gmail.com"
    elif 37980 <= cp_num <= 37989:
        return "Doctor Mora", "Sierra Gorda - Microzona 5 (Doctor Mora)", "xichudaniel@gmail.com"
    elif 37990 <= cp_num <= 37999:
        return "Santa Catarina", "Sierra Gorda - Microzona 6 (Santa Catarina)", "xichudaniel@gmail.com"
    elif 37900 <= cp_num <= 37999:
        return "San Luis de la Paz / Sierra Gto", "Sierra Gorda Noreste Guanajuato", "xichudaniel@gmail.com"

    # Sierra Gorda Querétaro (Supervisor Daniel Juárez)
    elif 76280 <= cp_num <= 76289:
        return "Peñamiller", "Sierra Gorda QRO - Peñamiller", "xichudaniel@gmail.com"
    elif 76290 <= cp_num <= 76299:
        return "San Joaquín", "Sierra Gorda QRO - San Joaquín", "xichudaniel@gmail.com"
    elif 76300 <= cp_num <= 76319:
        return "Pinal de Amoles", "Sierra Gorda QRO - Pinal", "xichudaniel@gmail.com"
    elif 76320 <= cp_num <= 76339:
        return "Arroyo Seco", "Sierra Gorda QRO - Arroyo Seco", "xichudaniel@gmail.com"
    elif 76340 <= cp_num <= 76379:
        return "Jalpan de Serra", "Sierra Gorda QRO - Jalpan", "xichudaniel@gmail.com"
    elif 76380 <= cp_num <= 76399:
        return "Landa de Matamoros", "Sierra Gorda QRO - Landa", "xichudaniel@gmail.com"

    # Área Metropolitana y Valles Centrales (Supervisor Irvin Reyes)
    elif 76000 <= cp_num <= 76099:
        return "Querétaro", "ZONA 1 - Centro Histórico / Cimatario", "irvin.reyes@arauto.express"
    elif 76100 <= cp_num <= 76139:
        return "Querétaro", "ZONA 2 - Poniente / Carrillo / Satélite", "irvin.reyes@arauto.express"
    elif (76140 <= cp_num <= 76149) or (76220 <= cp_num <= 76239):
        return "Juriquilla", "ZONA 3 - QRO Norte / Juriquilla / Santa Rosa", "irvin.reyes@arauto.express"
    elif 76150 <= cp_num <= 76199:
        return "Querétaro", "ZONA 2 - Poniente / Tlacote", "irvin.reyes@arauto.express"
    elif 76240 <= cp_num <= 76269:
        return "El Marqués", "ZONA 4 - Oriente / El Marqués / Zibatá", "irvin.reyes@arauto.express"
    elif 76270 <= cp_num <= 76279:
        return "Colón", "Semidesierto - Colón / AIQ", "irvin.reyes@arauto.express"
    elif 76400 <= cp_num <= 76449:
        return "Huimilpan", "Sur QRO - Huimilpan", "irvin.reyes@arauto.express"
    elif 76450 <= cp_num <= 76499:
        return "Tolimán", "Semidesierto - Tolimán", "irvin.reyes@arauto.express"
    elif 76500 <= cp_num <= 76599:
        return "Cadereyta de Montes", "Semidesierto - Cadereyta", "irvin.reyes@arauto.express"
    elif 76600 <= cp_num <= 76699:
        return "Ezequiel Montes", "Semidesierto - Ezequiel Montes", "irvin.reyes@arauto.express"
    elif 76700 <= cp_num <= 76749:
        return "Pedro Escobedo", "Sur QRO - Pedro Escobedo", "irvin.reyes@arauto.express"
    elif 76750 <= cp_num <= 76799:
        return "Tequisquiapan", "Sur QRO - Tequisquiapan", "irvin.reyes@arauto.express"
    elif 76800 <= cp_num <= 76899:
        return "San Juan del Río", "ZONA 6 - San Juan del Río", "irvin.reyes@arauto.express"
    elif 76900 <= cp_num <= 76999:
        return "Corregidora", "ZONA 5 - Corregidora / El Pueblito", "irvin.reyes@arauto.express"
    else:
        return "Querétaro", "ZONA General QRO", "irvin.reyes@arauto.express"

def dry_run_migration():
    token = get_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    quoted = urllib.parse.quote("MATRIZ_CP!A1:C".encode("utf-8"))
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{boveda_id}/values/{quoted}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        rows = json.loads(resp.read().decode("utf-8")).get("values", [])

    print(f"Total rows retrieved: {len(rows)}")
    header = [
        "Codigo_Postal",
        "Municipio",
        "Zona_Operativa",
        "Chofer_Titular",
        "Chofer_Suplente",
        "Supervisor_Zona",
        "Tipo_Servicio",
        "Override_Activo",
        "Fecha_Expiracion_Override"
    ]

    new_rows = [header]
    municipios_count = {}
    supervisores_count = {}

    for r in rows[1:]:
        cp = r[0].strip() if len(r) > 0 else ""
        titular = r[1].strip() if len(r) > 1 else ""
        servicio = r[2].strip() if len(r) > 2 else ""

        if not cp:
            continue

        municipio, zona, supervisor = inferir_municipio_y_zona(cp)
        suplente = "oscher1016@gmail.com" if supervisor == "xichudaniel@gmail.com" else ""
        override = ""
        fecha_exp_override = ""

        municipios_count[municipio] = municipios_count.get(municipio, 0) + 1
        supervisores_count[supervisor] = supervisores_count.get(supervisor, 0) + 1

        new_rows.append([
            cp,
            municipio,
            zona,
            titular,
            suplente,
            supervisor,
            servicio,
            override,
            fecha_exp_override
        ])

    print(f"\nMigración preparada: {len(new_rows)} filas en total (1 cabecera + {len(new_rows)-1} registros).")
    print("\nDesglose por Municipio:")
    for mun, count in sorted(municipios_count.items(), key=lambda x: x[1], reverse=True):
        print(f"  {mun}: {count} CPs")

    print("\nDesglose por Supervisor:")
    for sup, count in sorted(supervisores_count.items(), key=lambda x: x[1], reverse=True):
        print(f"  {sup}: {count} CPs")

    print("\nMuestras de filas resultantes:")
    for i in [1, 2, 50, 100, 200, 300, 400, len(new_rows)-1]:
        if i < len(new_rows):
            print(f"  Fila {i+1}: {new_rows[i]}")

if __name__ == "__main__":
    dry_run_migration()
