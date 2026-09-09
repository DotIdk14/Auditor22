@echo off
REM ============================================================
REM  Auditor Demo - arranque local (doble clic en este archivo)
REM  Busca el primer puerto libre entre 3002-3005 (no toca
REM  otros servers), levanta el servidor y abre el navegador.
REM ============================================================
cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo No se encontro npm. Instala Node.js LTS desde https://nodejs.org/ y reintenta.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias (solo la primera vez)...
  npm.cmd install
)

set PORT=
for %%P in (3002 3003 3004 3005) do (
  netstat -an | findstr "LISTENING" | findstr ":%%P " >nul
  if errorlevel 1 ( set PORT=%%P & goto listo )
)
echo Todos los puertos 3002-3005 estan ocupados. Cierra otro servidor e intenta de nuevo.
pause
exit /b 1

:listo
echo.
echo  Servidor demo en:  http://localhost:%PORT%/
echo  Acceso directo, sin login.
echo.
echo  NO cierres la ventana negra del servidor mientras lo uses.
echo.
start "Auditor Demo puerto %PORT% - NO CERRAR ESTA VENTANA" npm.cmd run dev
timeout /t 12 /nobreak >nul
start http://localhost:%PORT%/
