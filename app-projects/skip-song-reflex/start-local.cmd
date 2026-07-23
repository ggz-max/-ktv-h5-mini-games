@echo off
cd /d "%~dp0"
echo Starting skip-song-reflex local preview...
echo.
echo H5: http://127.0.0.1:5310/
echo API: http://127.0.0.1:4310/api/config
echo.
npm run dev
pause
