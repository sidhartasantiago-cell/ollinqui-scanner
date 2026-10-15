@echo off
chcp 65001 >nul
title 🏛️ SALA DE GUERRA TRIADA OLLIN v1.0
cd /d "%~dp0"
echo ============================================================================
echo 🏛️ ARRANCANDO SALA DE GUERRA TRIADA OLLIN (PUERTO 8095)...
echo ============================================================================
start "" "http://127.0.0.1:8095"
python servidor_war_room_triada.py
pause
