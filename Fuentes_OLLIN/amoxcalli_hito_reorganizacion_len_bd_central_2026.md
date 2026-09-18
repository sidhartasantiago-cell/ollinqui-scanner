# 🏛️ AMOXCALLI - MEMORIA TÉCNICA Y OPERATIVA (HITO AUDITORÍA LEN)
**Fecha:** 17 de Septiembre de 2026  
**Responsable:** Agente Antigravity / Prudencia Gravita  
**Autorización:** Tlayacanqui Sidharta Santiago  
**Plaza:** León (LEN) — Operación Arauto Express  
**Libro Afectado:** LEN BD CENTRAL 2023 (1Qu9q7LCBIY5PcWYqKwroIRX9b57NCOwmvbP-cQJ_hGQ)  
**Libro Auxiliar:** Captura Valeria LEN (1k6tihmJKIBnK_w6XRG0q8ivIoka6b2yXj2Z7vE5JWNA)  

---

## 🎯 1. Contexto y Causa Raíz
* **Disrupción Operativa:** La imposición de DHL para operar bajo el estándar 7CA causó una ruptura en el flujo secuencial de captura en León.
* **Estado Previo:**
  * La hoja RUTA Back end LEN (base de facturación y liquidación) tenía registros congelados hasta el **24 de agosto de 2026** (48,023 filas).
  * La hoja Ruta LEN acumuló 1,546 filas desordenadas entre el 26 de agosto y el 17 de septiembre de 2026.
  * La hoja Captura Valeria LEN albergaba 38 guías del 14/09/2026 capturadas fuera de flujo.

---

## ⚖️ 2. Reglas de Negocio y Criterios Inviolables Aplicados
1. **Exclusión Estricta de FD:** Ningún registro con checkpoint FD (Fuera para Entrega / despacho a ruta) se inyecta en RUTA Back end LEN, dado que esta tabla es de liquidación y cierre.
2. **Candado de Fecha del Día en Curso:** Se excluyeron todos los registros del día de hoy (**17/09/2026**). Estos permanecen en Ruta LEN para su revisión al término de la jornada.
3. **Unicidad de Entregas OK (Facturación Blindada):**
   * Solo se permite **un evento OK por guía**.
   * Se identificaron y **descartaron 80 OKs duplicadas** inyectadas en lote el **06/09/2026 20:13:35** por odega.arauto@gmail.com que ya habían sido entregadas legítimamente el 02/09 y 04/09.
4. **Reintentos No-OK Permitidos:** Las guías con múltiples intentos fallidos en días diferentes (NH, BA, CA, CI, RD) se conservaron íntegramente para registrar historial de visita.
5. **Esquema de 22 Columnas Íntegro:** Se preservaron las 22 columnas sin *column shifting*, respetando la KEY en columna Q/R y el teléfono sin pérdida de dígitos.
6. **Resguardo Poka-Yoke:** Se generó una copia estática de seguridad dentro del libro LEN BD CENTRAL 2023 bajo el nombre BACKUP_Ruta_LEN_20260917_203324.

---

## 📊 3. Balance Cuantitativo de la Migración

| Indicador | Antes | Movimiento | Después | Estatus |
|:---|:---:|:---:|:---:|:---:|
| **Filas en RUTA Back end LEN** | 48,023 | **+1,158** | **49,181** | ✅ Inyectadas en orden cronológico |
| **Filas en Ruta LEN** | 1,546 | **-1,238** | **308** | ✅ Solo FDs (275) y datos de hoy 17/09 (33 no-FD + 65 FD) |
| **OKs Duplicadas Descartadas** | — | **80** | **0** | 🛡️ Facturación protegida contra duplicados |
| **Captura Valeria LEN** | 38 | **0** (Ya en backend) | Pendiente clear | ℹ️ Las 38 guías ya viven facturadas en Backend |

### Desglose de los 1,158 Registros Inyectados a Facturación:
* **OK (Entregas legítimas):** 1,077
* **NH (Destinatario ausente):** 49
* **BA (Dirección incorrecta):** 24
* **CA (Cerrado / cancelado):** 6
* **CI (Cita / incidencia):** 1
* **RD (Redireccionado):** 1
* **FD:** 0 (Cero FDs ingresados)
